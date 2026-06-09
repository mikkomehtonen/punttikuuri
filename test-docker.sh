#!/bin/sh
set -e

echo "=== Docker Deployment Tests ==="

# Use test-specific compose file to avoid touching production data
export COMPOSE_FILE=docker-compose.test.yml

# Cleanup function
cleanup() {
    echo "Cleaning up..."
    docker compose down 2>/dev/null || true
}
trap cleanup EXIT

# Clean test directory for test isolation
echo "Cleaning test data directory..."
rm -rf /tmp/punttikuuri-test
mkdir -p /tmp/punttikuuri-test

# Test 1: Build succeeds
echo "Test 1: Building image..."
docker compose build --quiet
echo "✓ Build succeeded"

# Test 1b: Image contains required files
echo "Test 1b: Verifying image contents..."
# Check required files/directories exist
for item in build/index.js node_modules package.json migrate.js drizzle/meta/_journal.json; do
    if docker run --rm punttikuuri-app:latest test -e "/app/$item"; then
        echo "  ✓ $item exists"
    else
        echo "  ✗ $item missing"
        exit 1
    fi
done

# Test 1c: Image excludes dev files
echo "Test 1c: Verifying dev files excluded..."
for file in src vite.config.ts tsconfig.json; do
    if docker run --rm punttikuuri-app:latest test -e "/app/$file"; then
        echo "  ✗ $file should not exist in production image"
        exit 1
    else
        echo "  ✓ $file correctly excluded"
    fi
done
echo "✓ Image contents verified"

# Test 2: Container starts and serves
echo "Test 2: Starting container..."
docker compose up -d
sleep 5

# Check logs for successful startup
if docker compose logs | grep -q "Listening on http://0.0.0.0:3000"; then
    echo "✓ Container started successfully"
else
    echo "✗ Container failed to start"
    docker compose logs
    exit 1
fi

# Check HTTP response
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ HTTP 200 response"
else
    echo "✗ HTTP $HTTP_CODE (expected 200)"
    exit 1
fi

# Test 3: Health check
echo "Test 3: Checking health status..."
sleep 10
HEALTH=$(docker inspect --format='{{.State.Health.Status}}' punttikuuri-app-1)
if [ "$HEALTH" = "healthy" ]; then
    echo "✓ Health check passed"
else
    echo "✗ Health status: $HEALTH (expected healthy)"
    exit 1
fi

# Test 4: Non-root user
echo "Test 4: Checking user..."
USER=$(docker exec punttikuuri-app-1 whoami)
if [ "$USER" = "node" ]; then
    echo "✓ Running as non-root user (node)"
else
    echo "✗ Running as $USER (expected node)"
    exit 1
fi

# Test 5: Database exists
echo "Test 5: Checking database..."
if docker exec punttikuuri-app-1 test -f /app/data/punttikuuri.db; then
    echo "✓ Database file exists"
else
    echo "✗ Database file not found"
    exit 1
fi

# Test 6: Persistence across restart
echo "Test 6: Testing persistence..."
docker compose down
docker compose up -d
sleep 5
if docker exec punttikuuri-app-1 test -f /app/data/punttikuuri.db; then
    echo "✓ Database persists across restart"
else
    echo "✗ Database not found after restart"
    exit 1
fi

# Test 7: Migration idempotency
echo "Test 7: Testing migration idempotency..."
if docker compose logs | grep -q "Listening on http://0.0.0.0:3000"; then
    echo "✓ Migrations are idempotent (app started successfully on restart)"
else
    echo "✗ App failed to start after restart"
    exit 1
fi

echo ""
echo "=== All Docker deployment tests passed ==="
