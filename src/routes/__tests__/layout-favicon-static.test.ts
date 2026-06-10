import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

describe('layout favicon static link', () => {
	it('contains static favicon href in layout file', () => {
		const layoutPath = path.resolve('src/routes/+layout.svelte');
		const content = fs.readFileSync(layoutPath, 'utf-8');
		expect(content).toContain('<link rel="icon" href="/favicon.svg" />');
	});
});
