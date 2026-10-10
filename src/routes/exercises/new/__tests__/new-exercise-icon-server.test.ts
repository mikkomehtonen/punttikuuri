import { describe, it, expect, vi } from 'vitest';
import { t } from '$lib/i18n';

const { mockDb } = vi.hoisted(() => ({ mockDb: { current: null as never } }));

vi.mock('$lib/server/db', () => ({
	get db() {
		return mockDb.current;
	}
}));

import * as page from '../+page.server';
import { createExerciseActionHarness } from './action-harness';

const h = createExerciseActionHarness(mockDb, 'icon_user');

describe('create exercise action icon handling', () => {
	it('stores the selected icon and redirects for a valid icon', async () => {
		const caught = await h.redirectOf(
			page.actions.default(h.mockEvent({ name: 'Cycling', kind: 'strength', icon: 'bike' }))
		);

		expect(caught).toHaveProperty('status', 303);
		expect(caught).toHaveProperty('location', '/exercises');
		expect(h.countExercises()).toBe(1);
		expect(h.latestExercise()?.icon).toBe('bike');
	});

	it('stores NULL when the default tile (empty value) is submitted', async () => {
		const caught = await h.redirectOf(
			page.actions.default(h.mockEvent({ name: 'Bench Press', kind: 'strength', icon: '' }))
		);

		expect(caught).toHaveProperty('status', 303);
		expect(h.countExercises()).toBe(1);
		expect(h.latestExercise()?.icon).toBeNull();
	});

	it('stores NULL when the icon field is omitted entirely', async () => {
		const caught = await h.redirectOf(page.actions.default(h.mockEvent({ name: 'Squat' })));

		expect(caught).toHaveProperty('status', 303);
		expect(h.countExercises()).toBe(1);
		expect(h.latestExercise()?.icon).toBeNull();
	});

	it('fails with the iconInvalid translation and inserts nothing for an unknown icon', async () => {
		const result = await page.actions.default(
			h.mockEvent({ name: 'Mystery', kind: 'strength', icon: 'not-an-icon' })
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', t('exercises.iconInvalid', 'en'));
		expect(result).toHaveProperty('data.icon', '');
		expect(h.countExercises()).toBe(0);
	});

	it('fails with the iconInvalid translation and inserts nothing for a markup payload', async () => {
		const result = await page.actions.default(
			h.mockEvent({ name: 'Mystery', kind: 'strength', icon: '<script>alert(1)</script>' })
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', t('exercises.iconInvalid', 'en'));
		expect(result).toHaveProperty('data.icon', '');
		expect(h.countExercises()).toBe(0);
	});

	it('echoes the selected icon on an unrelated field failure so the picker round-trips', async () => {
		const result = await page.actions.default(
			h.mockEvent({ name: '', kind: 'strength', icon: 'bike' })
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.icon', 'bike');
		expect(h.countExercises()).toBe(0);
	});
});
