import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, and } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { registerUser } from '$lib/server/auth';
import { exerciseType, workoutSession, setEntry } from '$lib/server/db/schema';
import { cleanAllTables } from '$lib/server/db/__tests__/test-utils';

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

function seedSession(
	user: number,
	exId: number,
	date: string,
	comment: string | null,
	sets: number
) {
	const ws = db
		.insert(workoutSession)
		.values({
			user_id: user,
			exercise_type_id: exId,
			workout_date: date,
			comment,
			created_at: new Date().toISOString()
		})
		.returning()
		.get();

	for (let i = 1; i <= sets; i++) {
		db.insert(setEntry)
			.values({
				workout_session_id: ws.id,
				set_number: i,
				weight_kg: 100,
				repetitions: 5,
				created_at: new Date().toISOString()
			})
			.run();
	}

	return ws;
}

function mockEvent(overrides: Record<string, unknown> = {}) {
	return {
		locals: {
			user: { id: userId, username: 'comment_user', locale: 'en', theme: 'system' },
			locale: 'en',
			theme: 'system'
		},
		params: { id: String(exerciseId) },
		url: new URL('http://localhost/exercises/1'),
		request: {
			formData: async () => {
				const fd = new FormData();
				fd.set('comment', 'Felt easy');
				return fd;
			}
		},
		...overrides
	} as never;
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
	cleanAllTables(sqlite);

	const user = registerUser({ username: 'comment_user', password: 'password123' }, db);
	if (!user.ok) throw new Error('Failed to create user');
	userId = user.user.id;

	const other = registerUser({ username: 'comment_other', password: 'password123' }, db);
	if (!other.ok) throw new Error('Failed to create other user');
	otherUserId = other.user.id;

	const ex = db
		.insert(exerciseType)
		.values({ user_id: userId, name: 'Bench Press', created_at: new Date().toISOString() })
		.returning()
		.get();
	exerciseId = ex.id;
});

describe('saveComment action', () => {
	it('updates the comment and redirects when today session has sets', async () => {
		seedSession(userId, exerciseId, today(), null, 1);

		let caught: unknown = null;
		try {
			await page.actions.saveComment(mockEvent());
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
		expect(session?.comment).toBe('Felt easy');
	});

	it('fails with noSetsForComment when no today session exists', async () => {
		const result = await page.actions.saveComment(mockEvent());
		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', 'Log at least one set before adding a comment');
	});

	it('fails with noSetsForComment when today session has zero sets', async () => {
		seedSession(userId, exerciseId, today(), null, 0);

		const result = await page.actions.saveComment(mockEvent());
		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', 'Log at least one set before adding a comment');
	});

	it('fails with commentError for a 501-character comment and leaves existing comment unchanged', async () => {
		seedSession(userId, exerciseId, today(), 'Original', 1);

		const result = await page.actions.saveComment(
			mockEvent({
				request: {
					formData: async () => {
						const fd = new FormData();
						fd.set('comment', 'a'.repeat(501));
						return fd;
					}
				}
			})
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', 'Comment must be at most 500 characters');

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
		expect(session?.comment).toBe('Original');
	});

	it('stores an empty string when an empty comment is submitted', async () => {
		seedSession(userId, exerciseId, today(), 'Old comment', 1);

		let caught: unknown = null;
		try {
			await page.actions.saveComment(
				mockEvent({
					request: {
						formData: async () => {
							const fd = new FormData();
							fd.set('comment', '');
							return fd;
						}
					}
				})
			);
		} catch (err) {
			caught = err;
		}

		expect(caught).toHaveProperty('status', 303);

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
		expect(session?.comment).toBe('');
	});

	it('redirects to /login when unauthenticated', async () => {
		let caught: unknown = null;
		try {
			await page.actions.saveComment(
				mockEvent({ locals: { user: null, locale: 'en', theme: 'system' } })
			);
		} catch (err) {
			caught = err;
		}

		expect(caught).toHaveProperty('status', 303);
		expect(caught).toHaveProperty('location', '/login');
	});

	it('fails with Invalid exercise ID for a non-numeric id', async () => {
		const result = await page.actions.saveComment(mockEvent({ params: { id: 'abc' } }));
		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', 'Invalid exercise ID');
	});

	it('fails with Exercise not found for an exercise belonging to another user', async () => {
		const otherEx = db
			.insert(exerciseType)
			.values({ user_id: otherUserId, name: 'Other Press', created_at: new Date().toISOString() })
			.returning()
			.get();

		const result = await page.actions.saveComment(
			mockEvent({ params: { id: String(otherEx.id) } })
		);
		expect(result).toHaveProperty('status', 404);
		expect(result).toHaveProperty('data.error', 'Exercise not found');
	});

	it('updates the comment for a past-date session when workout_date is provided', async () => {
		seedSession(userId, exerciseId, '2025-08-19', null, 1);

		let caught: unknown = null;
		try {
			await page.actions.saveComment(
				mockEvent({
					request: {
						formData: async () => {
							const fd = new FormData();
							fd.set('comment', 'Past comment');
							fd.set('workout_date', '2025-08-19');
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
					eq(workoutSession.workout_date, '2025-08-19')
				)
			)
			.get();
		expect(session?.comment).toBe('Past comment');
	});

	it('fails with noSetsForComment when no session exists for the selected past date', async () => {
		const result = await page.actions.saveComment(
			mockEvent({
				request: {
					formData: async () => {
						const fd = new FormData();
						fd.set('comment', 'Past comment');
						fd.set('workout_date', '2025-08-19');
						return fd;
					}
				}
			})
		);
		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', 'Log at least one set before adding a comment');
	});

	it('fails with a date error for a future workout_date', async () => {
		const result = await page.actions.saveComment(
			mockEvent({
				request: {
					formData: async () => {
						const fd = new FormData();
						fd.set('comment', 'Future comment');
						fd.set('workout_date', '2099-01-01');
						return fd;
					}
				}
			})
		);
		expect(result).toHaveProperty('status', 400);
		expect(result?.data.error).toBe("Date must be a valid past or today's date");
	});
});

describe('load function comments', () => {
	it('returns selectedDateComment when today session has a comment', async () => {
		seedSession(userId, exerciseId, today(), 'Great session', 1);

		const result = await page.load(mockEvent());
		expect((result as { selectedDateComment: string | null }).selectedDateComment).toBe(
			'Great session'
		);
	});

	it('returns selectedDateComment null when today session has null comment', async () => {
		seedSession(userId, exerciseId, today(), null, 1);

		const result = await page.load(mockEvent());
		expect((result as { selectedDateComment: string | null }).selectedDateComment).toBeNull();
	});

	it('returns selectedDateComment null when no today session exists', async () => {
		const result = await page.load(mockEvent());
		expect((result as { selectedDateComment: string | null }).selectedDateComment).toBeNull();
	});

	it('returns selectedDate and isToday for a valid past ?date= parameter', async () => {
		seedSession(userId, exerciseId, '2025-08-19', 'Past comment', 1);

		const result = await page.load(
			mockEvent({ url: new URL('http://localhost/exercises/1?date=2025-08-19') })
		);
		const r = result as {
			selectedDate: string;
			isToday: boolean;
			selectedDateSets: Array<{ set_number: number }>;
			selectedDateComment: string | null;
		};
		expect(r.selectedDate).toBe('2025-08-19');
		expect(r.isToday).toBe(false);
		expect(r.selectedDateSets).toHaveLength(1);
		expect(r.selectedDateComment).toBe('Past comment');
	});

	it('excludes the selected date from previousSessions but keeps other dates', async () => {
		seedSession(userId, exerciseId, '2025-08-19', 'Selected', 1);
		seedSession(userId, exerciseId, '2025-06-01', 'Other', 1);

		const result = await page.load(
			mockEvent({ url: new URL('http://localhost/exercises/1?date=2025-08-19') })
		);
		const r = result as { previousSessions: Array<{ workout_date: string }> };
		const dates = r.previousSessions.map((s) => s.workout_date);
		expect(dates).not.toContain('2025-08-19');
		expect(dates).toContain('2025-06-01');
	});

	it('falls back to today for an invalid ?date= parameter', async () => {
		const result = await page.load(
			mockEvent({ url: new URL('http://localhost/exercises/1?date=not-a-date') })
		);
		const r = result as { selectedDate: string; isToday: boolean };
		expect(r.selectedDate).toBe(today());
		expect(r.isToday).toBe(true);
	});

	it('falls back to today for a future ?date= parameter', async () => {
		const result = await page.load(
			mockEvent({ url: new URL('http://localhost/exercises/1?date=2099-01-01') })
		);
		const r = result as { selectedDate: string; isToday: boolean };
		expect(r.selectedDate).toBe(today());
		expect(r.isToday).toBe(true);
	});

	it('returns empty selectedDateSets and null comment when no session exists for the selected date', async () => {
		seedSession(userId, exerciseId, '2025-06-01', 'Other', 1);

		const result = await page.load(
			mockEvent({ url: new URL('http://localhost/exercises/1?date=2025-08-19') })
		);
		const r = result as {
			selectedDate: string;
			selectedDateSets: Array<unknown>;
			selectedDateComment: string | null;
		};
		expect(r.selectedDate).toBe('2025-08-19');
		expect(r.selectedDateSets).toHaveLength(0);
		expect(r.selectedDateComment).toBeNull();
	});

	it('includes comment on a previous session entry', async () => {
		seedSession(userId, exerciseId, '2025-06-01', 'Felt heavy', 1);

		const result = await page.load(mockEvent());
		const previousSessions = (
			result as {
				previousSessions: Array<{ comment: string | null }>;
			}
		).previousSessions;
		expect(previousSessions).toHaveLength(1);
		expect(previousSessions[0].comment).toBe('Felt heavy');
	});

	it('includes null comment on a previous session entry', async () => {
		seedSession(userId, exerciseId, '2025-06-01', null, 1);

		const result = await page.load(mockEvent());
		const previousSessions = (
			result as {
				previousSessions: Array<{ comment: string | null }>;
			}
		).previousSessions;
		expect(previousSessions).toHaveLength(1);
		expect(previousSessions[0].comment).toBeNull();
	});
});
