import { describe, it, expect, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => ({ mockDb: { current: null as never } }));

vi.mock('$lib/server/db', () => ({
	get db() {
		return mockDb.current;
	}
}));

import * as page from '../+page.server';
import { createExerciseActionHarness } from './action-harness';

const h = createExerciseActionHarness(mockDb, 'newex_user');

describe('create exercise action with kind', () => {
	const kindCases: Array<[string, Record<string, string>, string]> = [
		['kind=cardio', { name: 'Running', short_name: 'RUN', kind: 'cardio' }, 'cardio'],
		['kind=strength', { name: 'Bench Press', kind: 'strength' }, 'strength'],
		['kind missing', { name: 'Squat' }, 'strength'],
		['kind empty', { name: 'Deadlift', kind: '' }, 'strength']
	];

	it.each(kindCases)(
		'stores the expected kind and redirects for %s',
		async (_label, fields, expectedKind) => {
			const caught = await h.redirectOf(page.actions.default(h.mockEvent(fields)));

			expect(caught).toHaveProperty('status', 303);
			expect(caught).toHaveProperty('location', '/exercises');
			expect(h.countExercises()).toBe(1);
			expect(h.latestExercise()?.kind).toBe(expectedKind);
		}
	);

	it('fails with the invalid-value error and inserts nothing for an unknown kind', async () => {
		const result = await page.actions.default(h.mockEvent({ name: 'Mystery', kind: 'bogus' }));

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', 'Invalid value');
		expect(h.countExercises()).toBe(0);
	});
});
