import { spawn } from 'child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let server: ReturnType<typeof spawn>;
const PORT = 4173;
const URL = `http://localhost:${PORT}/favicon.svg`;

describe('favicon HTTP accessibility', () => {
	beforeAll(async () => {
		server = spawn('npm', ['run', 'preview', '--', '--port', `${PORT}`], {
			stdio: 'ignore'
		});
		// wait for server to start
		await new Promise((resolve) => setTimeout(resolve, 3000));
	});

	afterAll(() => {
		if (server) server.kill();
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
