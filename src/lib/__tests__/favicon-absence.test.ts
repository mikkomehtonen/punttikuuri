import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

describe('old favicon asset', () => {
	it('should not exist in src/lib/assets', () => {
		const exists = fs.existsSync(path.resolve('src/lib/assets/favicon.svg'));
		expect(exists).toBe(false);
	});
});
