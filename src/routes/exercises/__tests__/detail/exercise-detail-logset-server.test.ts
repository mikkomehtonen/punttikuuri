import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, and, sql } from 'drizzle-orm';
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

function mockEvent(overrides: Record<string, unknown> = {}) {
	return {
		locals: {
			user: { id: userId, username: 'logset_user', locale: 'en', theme: 'system' },
			locale: 'en',
			theme: 'system'
		},
		params: { id: String(exerciseId) },
		request: {
			formData: async () => {
				const fd = new FormData();
				fd.set('weight_kg', '80');
				fd.set('repetitions', '10');
				return fd;
			}
		},
		...overrides
	} as never;
}

function countSetEntries(): number {
	const row = db
		.select({ count: sql<number>`COUNT(*)` })
		.from(setEntry)
		.get();
	return row?.count ?? 0;
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

	const user = registerUser({ username: 'logset_user', password: 'password123' }, db);
	if (!user.ok) throw new Error('Failed to create user');
	userId = user.user.id;

	const other = registerUser({ username: 'logset_other', password: 'password123' }, db);
	if (!other.ok) throw new Error('Failed to create other user');
	otherUserId = other.user.id;

	const ex = db
		.insert(exerciseType)
		.values({ user_id: userId, name: 'Bench Press', created_at: new Date().toISOString() })
		.returning()
		.get();
	exerciseId = ex.id;
});

describe('logSet action', () => {
	it('is exported under the logSet name and default is not exported', () => {
		expect(page.actions.logSet).toBeDefined();
		expect(typeof page.actions.logSet).toBe('function');
		expect(page.actions.default).toBeUndefined();
	});

	it('inserts a set entry and redirects on valid weight and reps', async () => {
		let caught: unknown = null;
		try {
			await page.actions.logSet(mockEvent());
		} catch (err) {
			caught = err;
		}

		expect(caught).toHaveProperty('status', 303);
		expect(caught).toHaveProperty('location', `/exercises/${exerciseId}`);

		const session = db
			.select()
			.from(workoutSession)
			.where(
				and(
					eq(workoutSession.exercise_type_id, exerciseId),
					eq(workoutSession.workout_date, today())
				)
			)
			.get();
		expect(session).toBeDefined();

		const sets = db
			.select()
			.from(setEntry)
			.where(eq(setEntry.workout_session_id, session!.id))
			.all();
		expect(sets).toHaveLength(1);
		expect(sets[0].set_number).toBe(1);
		expect(sets[0].weight_kg).toBe(80);
		expect(sets[0].repetitions).toBe(10);
	});

	it('fails with a validation error and inserts no set for an invalid weight', async () => {
		const result = await page.actions.logSet(
			mockEvent({
				request: {
					formData: async () => {
						const fd = new FormData();
						fd.set('weight_kg', '0');
						fd.set('repetitions', '10');
						return fd;
					}
				}
			})
		);

		expect(result).toHaveProperty('status', 400);
		expect(result?.data.error).toBeTruthy();
		expect(typeof result?.data.error).toBe('string');
		expect((result?.data.error as string).length).toBeGreaterThan(0);
		expect(countSetEntries()).toBe(0);
	});

	it('redirects to /login when unauthenticated', async () => {
		let caught: unknown = null;
		try {
			await page.actions.logSet(
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
			.values({ user_id: otherUserId, name: 'Other Press', created_at: new Date().toISOString() })
			.returning()
			.get();

		const result = await page.actions.logSet(mockEvent({ params: { id: String(otherEx.id) } }));
		expect(result).toHaveProperty('status', 404);
		expect(result).toHaveProperty('data.error', 'Exercise not found');
	});

	it('inserts a set for a valid past workout_date and redirects', async () => {
		const pastDate = '2025-08-19';
		let caught: unknown = null;
		try {
			await page.actions.logSet(
				mockEvent({
					request: {
						formData: async () => {
							const fd = new FormData();
							fd.set('weight_kg', '80');
							fd.set('repetitions', '10');
							fd.set('workout_date', pastDate);
							return fd;
						}
					}
				})
			);
		} catch (err) {
			caught = err;
		}

		expect(caught).toHaveProperty('status', 303);
		expect(caught).toHaveProperty('location', `/exercises/${exerciseId}`);

		const session = db
			.select()
			.from(workoutSession)
			.where(
				and(
					eq(workoutSession.exercise_type_id, exerciseId),
					eq(workoutSession.workout_date, pastDate)
				)
			)
			.get();
		expect(session).toBeDefined();

		const sets = db
			.select()
			.from(setEntry)
			.where(eq(setEntry.workout_session_id, session!.id))
			.all();
		expect(sets).toHaveLength(1);
		expect(sets[0].set_number).toBe(1);
		expect(sets[0].weight_kg).toBe(80);
		expect(sets[0].repetitions).toBe(10);
	});

	it('fails with a date error for a future workout_date and inserts nothing', async () => {
		const result = await page.actions.logSet(
			mockEvent({
				request: {
					formData: async () => {
						const fd = new FormData();
						fd.set('weight_kg', '80');
						fd.set('repetitions', '10');
						fd.set('workout_date', '2099-01-01');
						return fd;
					}
				}
			})
		);

		expect(result).toHaveProperty('status', 400);
		expect(result?.data.error).toBe("Date must be a valid past or today's date");
		expect(countSetEntries()).toBe(0);
		expect(db.select().from(workoutSession).all()).toHaveLength(0);
	});

	it('fails with a date error for an invalid calendar date', async () => {
		const result = await page.actions.logSet(
			mockEvent({
				request: {
					formData: async () => {
						const fd = new FormData();
						fd.set('weight_kg', '80');
						fd.set('repetitions', '10');
						fd.set('workout_date', '2025-02-30');
						return fd;
					}
				}
			})
		);

		expect(result).toHaveProperty('status', 400);
		expect(result?.data.error).toBe("Date must be a valid past or today's date");
		expect(countSetEntries()).toBe(0);
	});

	it('validates weight before date so an invalid weight with a past date reports the weight error', async () => {
		const result = await page.actions.logSet(
			mockEvent({
				request: {
					formData: async () => {
						const fd = new FormData();
						fd.set('weight_kg', '0');
						fd.set('repetitions', '10');
						fd.set('workout_date', '2025-08-19');
						return fd;
					}
				}
			})
		);

		expect(result).toHaveProperty('status', 400);
		expect(result?.data.error).toBe('Weight must be a positive number');
		expect(countSetEntries()).toBe(0);
	});
});
