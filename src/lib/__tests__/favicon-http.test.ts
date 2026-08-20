import { spawn } from 'child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let server: ReturnType<typeof spawn>;
const HOST = '127.0.0.1';
const PORT = 4173;
const URL = `http://${HOST}:${PORT}/favicon.svg`;

describe('favicon HTTP accessibility', () => {
	beforeAll(async () => {
		// Bind explicitly to 127.0.0.1: vite may otherwise listen on IPv6
		// ::1 only, which `localhost` does not always resolve to.
		// detached: true makes the child a process group leader so afterAll
		// can kill the whole tree (npm -> sh -> vite), not just npm.
		server = spawn('npm', ['run', 'preview', '--', '--host', HOST, '--port', `${PORT}`], {
			stdio: 'ignore',
			detached: true
		});
		// wait for server to start (poll instead of fixed sleep)
		await new Promise<void>((resolve, reject) => {
			const startedAt = Date.now();
			const timer = setInterval(async () => {
				try {
					const res = await fetch(URL);
					if (res.status === 200) {
						clearInterval(timer);
						resolve();
					}
				} catch {
					// server not ready yet
				}
				if (Date.now() - startedAt > 30000) {
					clearInterval(timer);
					reject(new Error(`preview server did not start within 30s on ${HOST}:${PORT}`));
				}
			}, 250);
		});
	});

	afterAll(() => {
		if (server?.pid) {
			try {
				process.kill(-server.pid, 'SIGTERM');
			} catch {
				// process already exited
			}
		}
	});

	it('GET /favicon.svg returns HTTP 200 and correct headers and body', async () => {
		const res = await fetch(URL);
		expect(res.status).toBe(200);
		const ct = res.headers.get('content-type') ?? '';
		expect(ct).toContain('image/svg+xml');
		const text = await res.text();
		expect(text).toContain('<svg');
		expect(text).toContain('fill="#d97706"');
		expect(text).toContain('fill="#b45309"');
	});
});
