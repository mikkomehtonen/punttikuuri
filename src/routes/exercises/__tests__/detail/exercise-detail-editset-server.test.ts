import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, asc } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { registerUser } from '$lib/server/auth';
import { exerciseType, workoutSession, setEntry } from '$lib/server/db/schema';

const { mockDb } = vi.hoisted(() => ({ mockDb: { current: null as never } }));

vi.mock('$lib/server/db', () => ({
	get db() {
		return mockDb.current;
	}
}));

import * as page from '../../[id]/+page.server';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;

let userId: number;
let otherUserId: number;
let exerciseId: number;

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

function pastDate(daysAgo: number): string {
	return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function mockEvent(overrides: Record<string, unknown> = {}) {
	return {
		locals: {
			user: { id: userId, username: 'editset_user', locale: 'en', theme: 'system' },
			locale: 'en',
			theme: 'system'
		},
		params: { id: String(exerciseId) },
		request: {
			formData: async () => new FormData()
		},
		...overrides
	} as never;
}

function formEvent(workoutDate: string, setNumber: string, weightKg: string, repetitions: string) {
	return {
		request: {
			formData: async () => {
				const fd = new FormData();
				fd.set('workout_date', workoutDate);
				fd.set('set_number', setNumber);
				fd.set('weight_kg', weightKg);
				fd.set('repetitions', repetitions);
				return fd;
			}
		}
	} as never;
}

function createSession(date: string, userId_: number, exerciseId_: number): number {
	const session = db
		.insert(workoutSession)
		.values({
			user_id: userId_,
			exercise_type_id: exerciseId_,
			workout_date: date,
			created_at: new Date().toISOString()
		})
		.returning({ id: workoutSession.id })
		.get();
	return session.id;
}

function createSet(
	sessionId: number,
	setNumber: number,
	weightKg: number,
	repetitions: number,
	createdAt: string
): void {
	db.insert(setEntry)
		.values({
			workout_session_id: sessionId,
			set_number: setNumber,
			weight_kg: weightKg,
			repetitions,
			created_at: createdAt
		})
		.run();
}

function setsForSession(
	sessionId: number
): Array<{ set_number: number; weight_kg: number; repetitions: number }> {
	return db
		.select({
			set_number: setEntry.set_number,
			weight_kg: setEntry.weight_kg,
			repetitions: setEntry.repetitions
		})
		.from(setEntry)
		.where(eq(setEntry.workout_session_id, sessionId))
		.orderBy(asc(setEntry.set_number))
		.all();
}

function allSetEntries(): Array<{ set_number: number; weight_kg: number; repetitions: number }> {
	return db
		.select({
			set_number: setEntry.set_number,
			weight_kg: setEntry.weight_kg,
			repetitions: setEntry.repetitions
		})
		.from(setEntry)
		.orderBy(asc(setEntry.set_number))
		.all();
}

beforeAll(() => {
	sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: './drizzle' });
	mockDb.current = db as never;
});

afterAll(() => {
	sqlite.close();
});

beforeEach(() => {
	sqlite.exec('DELETE FROM set_entry');
	sqlite.exec('DELETE FROM workout_session');
	sqlite.exec('DELETE FROM exercise_type');
	sqlite.exec('DELETE FROM session');
	sqlite.exec('DELETE FROM user');

	const user = registerUser({ username: 'editset_user', password: 'password123' }, db);
	if (!user.ok) throw new Error('Failed to create user');
	userId = user.user.id;

	const other = registerUser({ username: 'editset_other', password: 'password123' }, db);
	if (!other.ok) throw new Error('Failed to create other user');
	otherUserId = other.user.id;

	const ex = db
		.insert(exerciseType)
		.values({ user_id: userId, name: 'Bench Press', created_at: new Date().toISOString() })
		.returning()
		.get();
	exerciseId = ex.id;
});

describe('editSet action', () => {
	it('is exported under the editSet name', () => {
		expect(page.actions.editSet).toBeDefined();
		expect(typeof page.actions.editSet).toBe('function');
	});

	it('updates weight and reps, keeps the set number, and redirects with the query date', async () => {
		const date = today();
		const sessionId = createSession(date, userId, exerciseId);
		createSet(sessionId, 1, 60, 10, '2026-01-01T08:00:00.000Z');
		createSet(sessionId, 2, 80, 8, '2026-01-01T08:01:00.000Z');

		let caught: unknown = null;
		try {
			await page.actions.editSet(mockEvent(formEvent(date, '2', '90', '12')));
		} catch (err) {
			caught = err;
		}

		expect(caught).toHaveProperty('status', 303);
		expect(caught).toHaveProperty('location', `/exercises/${exerciseId}?date=${date}`);

		const remaining = setsForSession(sessionId);
		expect(remaining).toHaveLength(2);
		expect(remaining.map((s) => s.set_number)).toEqual([1, 2]);
		expect(remaining.map((s) => s.weight_kg)).toEqual([60, 90]);
		expect(remaining.map((s) => s.repetitions)).toEqual([10, 12]);
	});

	it('fails with the weight validation message for invalid weight and changes nothing', async () => {
		const date = today();
		const sessionId = createSession(date, userId, exerciseId);
		createSet(sessionId, 1, 60, 10, '2026-01-01T08:00:00.000Z');

		for (const invalid of ['abc', '0', '-5', '', '1.2.3']) {
			const before = allSetEntries();
			const result = await page.actions.editSet(mockEvent(formEvent(date, '1', invalid, '10')));
			expect(result).toHaveProperty('status', 400);
			expect(result).toHaveProperty('data.error', 'Weight must be a positive number');
			expect(allSetEntries()).toEqual(before);
		}

		expect(setsForSession(sessionId)).toHaveLength(1);
	});

	it('fails with the reps validation message for invalid reps and changes nothing', async () => {
		const date = today();
		const sessionId = createSession(date, userId, exerciseId);
		createSet(sessionId, 1, 60, 10, '2026-01-01T08:00:00.000Z');

		for (const invalid of ['abc', '0', '-1', '1.5', '']) {
			const before = allSetEntries();
			const result = await page.actions.editSet(mockEvent(formEvent(date, '1', '80', invalid)));
			expect(result).toHaveProperty('status', 400);
			expect(result).toHaveProperty('data.error', 'Reps must be a positive whole number');
			expect(allSetEntries()).toEqual(before);
		}

		expect(setsForSession(sessionId)).toHaveLength(1);
	});

	it('fails with "Invalid set number" for non-numeric, zero, negative, fractional, and empty values', async () => {
		const date = today();
		const sessionId = createSession(date, userId, exerciseId);
		createSet(sessionId, 1, 60, 10, '2026-01-01T08:00:00.000Z');

		for (const invalid of ['abc', '0', '-1', '1.5', '']) {
			const before = allSetEntries();
			const result = await page.actions.editSet(mockEvent(formEvent(date, invalid, '80', '10')));
			expect(result).toHaveProperty('status', 400);
			expect(result).toHaveProperty('data.error', 'Invalid set number');
			expect(allSetEntries()).toEqual(before);
		}

		expect(setsForSession(sessionId)).toHaveLength(1);
	});

	it('fails with "Invalid set number" when the set number does not exist in the session', async () => {
		const date = today();
		const sessionId = createSession(date, userId, exerciseId);
		createSet(sessionId, 1, 60, 10, '2026-01-01T08:00:00.000Z');

		const result = await page.actions.editSet(mockEvent(formEvent(date, '5', '80', '10')));

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', 'Invalid set number');
		expect(setsForSession(sessionId)).toHaveLength(1);
	});

	it('fails with "No sets for this date" when no session exists for the date', async () => {
		const otherDate = pastDate(30);
		const otherSessionId = createSession(otherDate, userId, exerciseId);
		createSet(otherSessionId, 1, 60, 10, '2026-01-01T08:00:00.000Z');

		const result = await page.actions.editSet(mockEvent(formEvent(today(), '1', '80', '10')));

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', 'No sets for this date');

		expect(setsForSession(otherSessionId)).toHaveLength(1);
	});

	it('fails with the date validation error for a future workout_date and changes nothing', async () => {
		const date = today();
		const sessionId = createSession(date, userId, exerciseId);
		createSet(sessionId, 1, 60, 10, '2026-01-01T08:00:00.000Z');

		const result = await page.actions.editSet(mockEvent(formEvent('2099-01-01', '1', '80', '10')));

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', "Date must be a valid past or today's date");
		expect(setsForSession(sessionId)).toHaveLength(1);
	});

	it('fails with the date validation error for an invalid calendar date', async () => {
		const result = await page.actions.editSet(mockEvent(formEvent('2025-02-30', '1', '80', '10')));

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', "Date must be a valid past or today's date");
		expect(allSetEntries()).toHaveLength(0);
	});

	it('redirects to /login when unauthenticated', async () => {
		let caught: unknown = null;
		try {
			await page.actions.editSet(
				mockEvent({ locals: { user: null, locale: 'en', theme: 'system' } })
			);
		} catch (err) {
			caught = err;
		}

		expect(caught).toHaveProperty('status', 303);
		expect(caught).toHaveProperty('location', '/login');
	});

	it('fails with Exercise not found for an exercise belonging to another user', async () => {
		const otherEx = db
			.insert(exerciseType)
			.values({
				user_id: otherUserId,
				name: 'Other Press',
				created_at: new Date().toISOString()
			})
			.returning()
			.get();

		const result = await page.actions.editSet(
			mockEvent({
				params: { id: String(otherEx.id) },
				request: {
					formData: async () => {
						const fd = new FormData();
						fd.set('workout_date', today());
						fd.set('set_number', '1');
						fd.set('weight_kg', '80');
						fd.set('repetitions', '10');
						return fd;
					}
				}
			})
		);

		expect(result).toHaveProperty('status', 404);
		expect(result).toHaveProperty('data.error', 'Exercise not found');
	});

	it('does not touch sets of other dates when editing from one date', async () => {
		const date = today();
		const otherDate = pastDate(30);
		const sessionId = createSession(date, userId, exerciseId);
		const pastSessionId = createSession(otherDate, userId, exerciseId);
		createSet(sessionId, 1, 60, 10, '2026-01-01T08:00:00.000Z');
		createSet(sessionId, 2, 80, 8, '2026-01-01T08:01:00.000Z');
		createSet(pastSessionId, 1, 50, 12, '2026-01-01T07:00:00.000Z');

		let caught: unknown = null;
		try {
			await page.actions.editSet(mockEvent(formEvent(date, '1', '70', '15')));
		} catch (err) {
			caught = err;
		}

		expect(caught).toHaveProperty('status', 303);
		expect(setsForSession(sessionId).map((s) => s.weight_kg)).toEqual([70, 80]);
		expect(setsForSession(sessionId).map((s) => s.repetitions)).toEqual([15, 8]);
		expect(setsForSession(pastSessionId).map((s) => s.weight_kg)).toEqual([50]);
		expect(setsForSession(pastSessionId).map((s) => s.repetitions)).toEqual([12]);
	});
});
