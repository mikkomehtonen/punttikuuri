# Stage 1: Build
FROM node:22-bookworm-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src/ ./src/
COPY static/ ./static/
COPY drizzle/ ./drizzle/
COPY svelte.config.js vite.config.ts tsconfig.json drizzle.config.ts ./
COPY .npmrc .prettierrc .prettierignore eslint.config.js ./

RUN npm run build
RUN npm prune --omit=dev

# Stage 2: Production
FROM node:22-bookworm-slim AS production

WORKDIR /app

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./package.json
COPY migrate.js ./migrate.js

RUN mkdir -p /app/data && chown node:node /app/data

ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3000').then(r=>{if(!r.ok)throw 1})"

USER node

CMD ["sh", "-c", "node migrate.js && exec node build/index.js"]
