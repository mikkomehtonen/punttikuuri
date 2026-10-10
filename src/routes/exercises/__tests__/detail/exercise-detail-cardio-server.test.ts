import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, and } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { registerUser } from '$lib/server/auth';
import { exerciseType, workoutSession, setEntry, cardioEntry } from '$lib/server/db/schema';
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
let cardioExerciseId: number;
let strengthExerciseId: number;

const DURATION_ERROR = 'Duration must be whole numbers totaling between 1 second and 24 hours';
const DISTANCE_ERROR = 'Distance must be a positive number (max 1000 km)';
const DESCRIPTION_ERROR = 'Description must be at most 500 characters';
const DATE_ERROR = "Date must be a valid past or today's date";
const KIND_ERROR = 'This exercise type does not match the form used';
const NOT_FOUND_ERROR = 'Exercise not found';
const INVALID_ENTRY_ERROR = 'Invalid cardio entry';

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

function insertExercise(user: number, name: string, kind: 'strength' | 'cardio'): number {
	const ex = db
		.insert(exerciseType)
		.values({
			user_id: user,
			name,
			kind,
			created_at: new Date().toISOString()
		})
		.returning()
		.get();
	return ex.id;
}

function seedSession(user: number, exId: number, date: string, comment: string | null) {
	return db
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
}

function seedCardioEntry(
	sessionId: number,
	durationSeconds: number,
	distanceM: number | null,
	description: string | null,
	createdAt: string
): number {
	return db
		.insert(cardioEntry)
		.values({
			workout_session_id: sessionId,
			duration_seconds: durationSeconds,
			distance_m: distanceM,
			description,
			created_at: createdAt
		})
		.returning()
		.get().id;
}

function cardioFormData(fields: Record<string, string>): Request {
	return {
		formData: async () => {
			const fd = new FormData();
			for (const [key, value] of Object.entries(fields)) {
				fd.set(key, value);
			}
			return fd;
		}
	} as never;
}

function mockEvent(overrides: Record<string, unknown> = {}) {
	return {
		locals: {
			user: { id: userId, username: 'cardio_user', locale: 'en', theme: 'system' },
			locale: 'en',
			theme: 'system'
		},
		params: { id: String(cardioExerciseId) },
		url: new URL('http://localhost/exercises/1'),
		request: cardioFormData({
			hours: '1',
			minutes: '5',
			seconds: '30',
			distance_km: '5.05',
			description: 'Morning run'
		}),
		...overrides
	} as never;
}

function countCardioEntries(): number {
	return db.select({ id: cardioEntry.id }).from(cardioEntry).all().length;
}

function countSetEntries(): number {
	return db.select({ id: setEntry.id }).from(setEntry).all().length;
}

function countSessions(): number {
	return db.select({ id: workoutSession.id }).from(workoutSession).all().length;
}

function sessionFor(exId: number, date: string) {
	return db
		.select()
		.from(workoutSession)
		.where(and(eq(workoutSession.exercise_type_id, exId), eq(workoutSession.workout_date, date)))
		.get();
}

async function redirectOf(action: unknown): Promise<unknown> {
	let caught: unknown = null;
	try {
		await action;
	} catch (err) {
		caught = err;
	}
	return caught;
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

	const user = registerUser({ username: 'cardio_user', password: 'password123' }, db);
	if (!user.ok) throw new Error('Failed to create user');
	userId = user.user.id;

	const other = registerUser({ username: 'cardio_other', password: 'password123' }, db);
	if (!other.ok) throw new Error('Failed to create other user');
	otherUserId = other.user.id;

	cardioExerciseId = insertExercise(userId, 'Running', 'cardio');
	strengthExerciseId = insertExercise(userId, 'Bench Press', 'strength');
});

describe('logCardio action', () => {
	it('inserts a cardio entry and redirects on valid duration and distance', async () => {
		const caught = await redirectOf(page.actions.logCardio(mockEvent()));

		expect(caught).toHaveProperty('status', 303);
		expect(caught).toHaveProperty('location', `/exercises/${cardioExerciseId}?date=${today()}`);

		const session = sessionFor(cardioExerciseId, today());
		expect(session).toBeDefined();

		const entries = db
			.select()
			.from(cardioEntry)
			.where(eq(cardioEntry.workout_session_id, session!.id))
			.all();
		expect(entries).toHaveLength(1);
		expect(entries[0].duration_seconds).toBe(3930);
		expect(entries[0].distance_m).toBe(5050);
		expect(entries[0].description).toBe('Morning run');
	});

	it('sums 0h/25m/30s to 1530 seconds', async () => {
		const caught = await redirectOf(
			page.actions.logCardio(
				mockEvent({ request: cardioFormData({ hours: '0', minutes: '25', seconds: '30' }) })
			)
		);

		expect(caught).toHaveProperty('status', 303);

		const entry = db.select().from(cardioEntry).all()[0];
		expect(entry.duration_seconds).toBe(1530);
	});

	it('creates only one session when two entries are logged on the same date', async () => {
		const first = await redirectOf(
			page.actions.logCardio(mockEvent({ request: cardioFormData({ minutes: '30' }) }))
		);
		const second = await redirectOf(
			page.actions.logCardio(mockEvent({ request: cardioFormData({ minutes: '45' }) }))
		);

		expect(first).toHaveProperty('status', 303);
		expect(second).toHaveProperty('status', 303);

		const session = sessionFor(cardioExerciseId, today());
		expect(session).toBeDefined();
		expect(countSessions()).toBe(1);

		const entries = db
			.select()
			.from(cardioEntry)
			.where(eq(cardioEntry.workout_session_id, session!.id))
			.all();
		expect(entries).toHaveLength(2);
		expect(entries.map((e) => e.duration_seconds)).toEqual([1800, 2700]);
	});

	it('stores null distance when the distance field is empty', async () => {
		const caught = await redirectOf(
			page.actions.logCardio(
				mockEvent({ request: cardioFormData({ hours: '', minutes: '30', seconds: '' }) })
			)
		);

		expect(caught).toHaveProperty('status', 303);

		const entry = db.select().from(cardioEntry).all()[0];
		expect(entry.duration_seconds).toBe(1800);
		expect(entry.distance_m).toBeNull();
		expect(entry.description).toBeNull();
	});

	it('converts fractional km to whole meters (42.195 km -> 42195 m)', async () => {
		const caught = await redirectOf(
			page.actions.logCardio(
				mockEvent({ request: cardioFormData({ minutes: '30', distance_km: '42.195' }) })
			)
		);

		expect(caught).toHaveProperty('status', 303);

		const entry = db.select().from(cardioEntry).all()[0];
		expect(entry.distance_m).toBe(42195);
	});

	it('accepts leading-dot decimals (.5 km -> 500 m)', async () => {
		const caught = await redirectOf(
			page.actions.logCardio(
				mockEvent({ request: cardioFormData({ minutes: '30', distance_km: '.5' }) })
			)
		);

		expect(caught).toHaveProperty('status', 303);

		const entry = db.select().from(cardioEntry).all()[0];
		expect(entry.distance_m).toBe(500);
	});

	const failureCases: Array<[string, Record<string, string>, string]> = [
		['all duration fields empty', { distance_km: '5' }, DURATION_ERROR],
		['all duration fields zero', { hours: '0', minutes: '0', seconds: '0' }, DURATION_ERROR],
		['duration over 24 hours', { hours: '25', minutes: '', seconds: '' }, DURATION_ERROR],
		['fractional duration hours', { hours: '1.5', minutes: '', seconds: '' }, DURATION_ERROR],
		['negative duration minutes', { hours: '', minutes: '-5', seconds: '' }, DURATION_ERROR],
		['non-numeric duration', { hours: 'abc', minutes: '', seconds: '' }, DURATION_ERROR],
		['negative distance', { minutes: '30', distance_km: '-5' }, DISTANCE_ERROR],
		['zero distance', { minutes: '30', distance_km: '0' }, DISTANCE_ERROR],
		['non-numeric distance', { minutes: '30', distance_km: 'abc' }, DISTANCE_ERROR],
		['hex distance', { minutes: '30', distance_km: '0x10' }, DISTANCE_ERROR],
		['exponent distance', { minutes: '30', distance_km: '1e2' }, DISTANCE_ERROR],
		['whitespace-padded distance', { minutes: '30', distance_km: ' 5 ' }, DISTANCE_ERROR],
		['distance over 1000 km', { minutes: '30', distance_km: '1001' }, DISTANCE_ERROR],
		['distance rounding to zero meters', { minutes: '30', distance_km: '0.0004' }, DISTANCE_ERROR],
		[
			'501-character description',
			{ minutes: '30', description: 'a'.repeat(501) },
			DESCRIPTION_ERROR
		],
		['future workout_date', { minutes: '30', workout_date: '2099-01-01' }, DATE_ERROR]
	];

	it.each(failureCases)(
		'fails with 400 for %s and inserts no entry or session',
		async (_label, fields, error) => {
			const result = await page.actions.logCardio(mockEvent({ request: cardioFormData(fields) }));

			expect(result).toHaveProperty('status', 400);
			expect(result).toHaveProperty('data.error', error);
			expect(countCardioEntries()).toBe(0);
			expect(countSessions()).toBe(0);
		}
	);

	it('fails with kindMismatch for a strength exercise and inserts nothing', async () => {
		const result = await page.actions.logCardio(
			mockEvent({ params: { id: String(strengthExerciseId) } })
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', KIND_ERROR);
		expect(countCardioEntries()).toBe(0);
		expect(countSessions()).toBe(0);
	});

	it('inserts a cardio entry for a valid past workout_date and redirects with the date', async () => {
		const caught = await redirectOf(
			page.actions.logCardio(
				mockEvent({ request: cardioFormData({ minutes: '45', workout_date: '2025-08-19' }) })
			)
		);

		expect(caught).toHaveProperty('status', 303);
		expect(caught).toHaveProperty('location', `/exercises/${cardioExerciseId}?date=2025-08-19`);

		expect(sessionFor(cardioExerciseId, '2025-08-19')).toBeDefined();
		expect(countCardioEntries()).toBe(1);
	});

	it('redirects to /login when unauthenticated', async () => {
		const caught = await redirectOf(
			page.actions.logCardio(mockEvent({ locals: { user: null, locale: 'en', theme: 'system' } }))
		);

		expect(caught).toHaveProperty('status', 303);
		expect(caught).toHaveProperty('location', '/login');
	});

	it('fails with Exercise not found for an exercise belonging to another user', async () => {
		const otherEx = insertExercise(otherUserId, 'Other Run', 'cardio');
		const result = await page.actions.logCardio(mockEvent({ params: { id: String(otherEx) } }));
		expect(result).toHaveProperty('status', 404);
		expect(result).toHaveProperty('data.error', NOT_FOUND_ERROR);
	});
});

describe('logSet action kind guard', () => {
	it('fails with kindMismatch for a cardio exercise and inserts no set or session', async () => {
		const result = await page.actions.logSet(
			mockEvent({ request: cardioFormData({ weight_kg: '80', repetitions: '10' }) })
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', KIND_ERROR);
		expect(countSetEntries()).toBe(0);
		expect(countSessions()).toBe(0);
	});
});

describe('editCardio and deleteCardio kind guards', () => {
	it('editCardio fails with kindMismatch for a strength exercise', async () => {
		const result = await page.actions.editCardio(
			mockEvent({ params: { id: String(strengthExerciseId) } })
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', KIND_ERROR);
	});

	it('deleteCardio fails with kindMismatch for a strength exercise', async () => {
		const result = await page.actions.deleteCardio(
			mockEvent({ params: { id: String(strengthExerciseId) } })
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', KIND_ERROR);
	});
});

describe('editCardio action', () => {
	it('updates duration, distance and description and redirects', async () => {
		const session = seedSession(userId, cardioExerciseId, today(), null);
		const entryId = seedCardioEntry(session.id, 1800, 5000, 'Old', new Date().toISOString());

		const caught = await redirectOf(
			page.actions.editCardio(
				mockEvent({
					request: cardioFormData({
						workout_date: today(),
						cardio_entry_id: String(entryId),
						hours: '2',
						minutes: '10',
						seconds: '15',
						distance_km: '10.5',
						description: 'Updated run'
					})
				})
			)
		);

		expect(caught).toHaveProperty('status', 303);
		expect(caught).toHaveProperty('location', `/exercises/${cardioExerciseId}?date=${today()}`);

		const entry = db.select().from(cardioEntry).where(eq(cardioEntry.id, entryId)).get();
		expect(entry?.duration_seconds).toBe(7815);
		expect(entry?.distance_m).toBe(10500);
		expect(entry?.description).toBe('Updated run');
	});

	it('clears distance and description when both fields are empty', async () => {
		const session = seedSession(userId, cardioExerciseId, today(), null);
		const entryId = seedCardioEntry(session.id, 1800, 5000, 'Old', new Date().toISOString());

		const caught = await redirectOf(
			page.actions.editCardio(
				mockEvent({
					request: cardioFormData({
						workout_date: today(),
						cardio_entry_id: String(entryId),
						minutes: '30'
					})
				})
			)
		);

		expect(caught).toHaveProperty('status', 303);

		const entry = db.select().from(cardioEntry).where(eq(cardioEntry.id, entryId)).get();
		expect(entry?.distance_m).toBeNull();
		expect(entry?.description).toBeNull();
	});

	it('edits an entry on a past workout_date and redirects with the date', async () => {
		const session = seedSession(userId, cardioExerciseId, '2025-08-19', null);
		const entryId = seedCardioEntry(session.id, 1800, 5000, 'Old', '2025-08-19T08:00:00.000Z');

		const caught = await redirectOf(
			page.actions.editCardio(
				mockEvent({
					request: cardioFormData({
						workout_date: '2025-08-19',
						cardio_entry_id: String(entryId),
						minutes: '45'
					})
				})
			)
		);

		expect(caught).toHaveProperty('status', 303);
		expect(caught).toHaveProperty('location', `/exercises/${cardioExerciseId}?date=2025-08-19`);

		const entry = db.select().from(cardioEntry).where(eq(cardioEntry.id, entryId)).get();
		expect(entry?.duration_seconds).toBe(2700);
	});

	it('fails with invalidCardioEntry for a non-numeric entry id and leaves the entry unchanged', async () => {
		const session = seedSession(userId, cardioExerciseId, today(), null);
		const entryId = seedCardioEntry(session.id, 1800, 5000, 'Old', new Date().toISOString());

		const result = await page.actions.editCardio(
			mockEvent({
				request: cardioFormData({
					workout_date: today(),
					cardio_entry_id: 'abc',
					minutes: '30'
				})
			})
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', INVALID_ENTRY_ERROR);

		const entry = db.select().from(cardioEntry).where(eq(cardioEntry.id, entryId)).get();
		expect(entry?.description).toBe('Old');
	});

	it('fails with invalidCardioEntry for a nonexistent entry id', async () => {
		seedSession(userId, cardioExerciseId, today(), null);

		const result = await page.actions.editCardio(
			mockEvent({
				request: cardioFormData({
					workout_date: today(),
					cardio_entry_id: '99999',
					minutes: '30'
				})
			})
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', INVALID_ENTRY_ERROR);
	});

	it('fails with invalidCardioEntry for an entry belonging to another user', async () => {
		const otherEx = insertExercise(otherUserId, 'Other Run', 'cardio');
		const otherSession = seedSession(otherUserId, otherEx, today(), null);
		const otherEntryId = seedCardioEntry(
			otherSession.id,
			1800,
			5000,
			'Other',
			new Date().toISOString()
		);

		const result = await page.actions.editCardio(
			mockEvent({
				request: cardioFormData({
					workout_date: today(),
					cardio_entry_id: String(otherEntryId),
					minutes: '30'
				})
			})
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', INVALID_ENTRY_ERROR);

		const entry = db.select().from(cardioEntry).where(eq(cardioEntry.id, otherEntryId)).get();
		expect(entry?.description).toBe('Other');
	});

	it('fails with Exercise not found when editing through another user exercise', async () => {
		const otherEx = insertExercise(otherUserId, 'Other Run', 'cardio');
		const otherSession = seedSession(otherUserId, otherEx, today(), null);
		const otherEntryId = seedCardioEntry(
			otherSession.id,
			1800,
			5000,
			'Other',
			new Date().toISOString()
		);

		const result = await page.actions.editCardio(
			mockEvent({
				params: { id: String(otherEx) },
				request: cardioFormData({
					workout_date: today(),
					cardio_entry_id: String(otherEntryId),
					minutes: '30'
				})
			})
		);

		expect(result).toHaveProperty('status', 404);
		expect(result).toHaveProperty('data.error', NOT_FOUND_ERROR);

		const entry = db.select().from(cardioEntry).where(eq(cardioEntry.id, otherEntryId)).get();
		expect(entry?.description).toBe('Other');
	});

	it('fails with durationError for a zero duration and leaves the entry unchanged', async () => {
		const session = seedSession(userId, cardioExerciseId, today(), null);
		const entryId = seedCardioEntry(session.id, 1800, 5000, 'Old', new Date().toISOString());

		const result = await page.actions.editCardio(
			mockEvent({
				request: cardioFormData({
					workout_date: today(),
					cardio_entry_id: String(entryId),
					hours: '',
					minutes: '',
					seconds: ''
				})
			})
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', DURATION_ERROR);

		const entry = db.select().from(cardioEntry).where(eq(cardioEntry.id, entryId)).get();
		expect(entry?.duration_seconds).toBe(1800);
	});
});

describe('deleteCardio action', () => {
	it('deletes the cardio entry and redirects', async () => {
		const session = seedSession(userId, cardioExerciseId, today(), null);
		const entryId = seedCardioEntry(session.id, 1800, 5000, 'Run', new Date().toISOString());

		const caught = await redirectOf(
			page.actions.deleteCardio(
				mockEvent({
					request: cardioFormData({
						workout_date: today(),
						cardio_entry_id: String(entryId)
					})
				})
			)
		);

		expect(caught).toHaveProperty('status', 303);
		expect(caught).toHaveProperty('location', `/exercises/${cardioExerciseId}?date=${today()}`);
		expect(countCardioEntries()).toBe(0);
	});

	it('leaves sibling entries untouched when deleting one entry', async () => {
		const session = seedSession(userId, cardioExerciseId, today(), null);
		const firstId = seedCardioEntry(session.id, 1800, 5000, 'First', '2025-01-01T00:00:00.000Z');
		seedCardioEntry(session.id, 2700, null, 'Second', '2025-01-02T00:00:00.000Z');

		const caught = await redirectOf(
			page.actions.deleteCardio(
				mockEvent({
					request: cardioFormData({
						workout_date: today(),
						cardio_entry_id: String(firstId)
					})
				})
			)
		);

		expect(caught).toHaveProperty('status', 303);

		const remaining = db
			.select()
			.from(cardioEntry)
			.where(eq(cardioEntry.workout_session_id, session.id))
			.all();
		expect(remaining).toHaveLength(1);
		expect(remaining[0].description).toBe('Second');
	});

	it('deletes an entry on a past workout_date and redirects with the date', async () => {
		const session = seedSession(userId, cardioExerciseId, '2025-08-19', null);
		const entryId = seedCardioEntry(session.id, 1800, 5000, 'Old', '2025-08-19T08:00:00.000Z');

		const caught = await redirectOf(
			page.actions.deleteCardio(
				mockEvent({
					request: cardioFormData({
						workout_date: '2025-08-19',
						cardio_entry_id: String(entryId)
					})
				})
			)
		);

		expect(caught).toHaveProperty('status', 303);
		expect(caught).toHaveProperty('location', `/exercises/${cardioExerciseId}?date=2025-08-19`);
		expect(countCardioEntries()).toBe(0);
	});

	it('fails with invalidCardioEntry for an entry belonging to another user and deletes nothing', async () => {
		const otherEx = insertExercise(otherUserId, 'Other Run', 'cardio');
		const otherSession = seedSession(otherUserId, otherEx, today(), null);
		const otherEntryId = seedCardioEntry(
			otherSession.id,
			1800,
			5000,
			'Other',
			new Date().toISOString()
		);

		const result = await page.actions.deleteCardio(
			mockEvent({
				request: cardioFormData({
					workout_date: today(),
					cardio_entry_id: String(otherEntryId)
				})
			})
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', INVALID_ENTRY_ERROR);
		expect(countCardioEntries()).toBe(1);
	});

	it('fails with Exercise not found when deleting through another user exercise', async () => {
		const otherEx = insertExercise(otherUserId, 'Other Run', 'cardio');
		const otherSession = seedSession(otherUserId, otherEx, today(), null);
		const otherEntryId = seedCardioEntry(
			otherSession.id,
			1800,
			5000,
			'Other',
			new Date().toISOString()
		);

		const result = await page.actions.deleteCardio(
			mockEvent({
				params: { id: String(otherEx) },
				request: cardioFormData({
					workout_date: today(),
					cardio_entry_id: String(otherEntryId)
				})
			})
		);

		expect(result).toHaveProperty('status', 404);
		expect(result).toHaveProperty('data.error', NOT_FOUND_ERROR);
		expect(countCardioEntries()).toBe(1);
	});
});

describe('saveComment action cardio gate', () => {
	it('fails with noEntriesForComment when the cardio session has zero entries', async () => {
		seedSession(userId, cardioExerciseId, today(), null);

		const result = await page.actions.saveComment(
			mockEvent({ request: cardioFormData({ comment: 'Felt easy' }) })
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty(
			'data.error',
			'Log at least one cardio entry before adding a comment'
		);
	});

	it('fails with noEntriesForComment when there is no session at all', async () => {
		const result = await page.actions.saveComment(
			mockEvent({ request: cardioFormData({ comment: 'Felt easy' }) })
		);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty(
			'data.error',
			'Log at least one cardio entry before adding a comment'
		);
	});

	it('saves the comment when the cardio session has at least one entry', async () => {
		const session = seedSession(userId, cardioExerciseId, today(), null);
		seedCardioEntry(session.id, 1800, 5000, null, new Date().toISOString());

		const caught = await redirectOf(
			page.actions.saveComment(mockEvent({ request: cardioFormData({ comment: 'Felt easy' }) }))
		);

		expect(caught).toHaveProperty('status', 303);

		const updated = db.select().from(workoutSession).where(eq(workoutSession.id, session.id)).get();
		expect(updated?.comment).toBe('Felt easy');
	});
});

describe('load function cardio data', () => {
	it('returns selectedDateCardioEntries ordered by created_at for a cardio exercise', async () => {
		const session = seedSession(userId, cardioExerciseId, today(), null);
		seedCardioEntry(session.id, 1800, 5000, 'First', '2025-01-01T00:00:00.000Z');
		seedCardioEntry(session.id, 3600, null, 'Second', '2025-01-02T00:00:00.000Z');

		const result = await page.load(mockEvent());
		const r = result as {
			exercise: { kind: string };
			selectedDateCardioEntries: Array<{ id: number; duration_seconds: number }>;
			selectedDateSets: Array<unknown>;
		};

		expect(r.exercise.kind).toBe('cardio');
		expect(r.selectedDateSets).toHaveLength(0);
		expect(r.selectedDateCardioEntries).toHaveLength(2);
		expect(r.selectedDateCardioEntries[0].duration_seconds).toBe(1800);
		expect(r.selectedDateCardioEntries[1].duration_seconds).toBe(3600);
	});

	it('populates previousSessions entries for a cardio exercise and excludes the selected date', async () => {
		const past = seedSession(userId, cardioExerciseId, '2025-06-01', 'Past run');
		seedCardioEntry(past.id, 2700, 10000, null, '2025-06-01T00:00:00.000Z');

		const result = await page.load(mockEvent());
		const r = result as {
			previousSessions: Array<{
				workout_date: string;
				comment: string | null;
				sets?: Array<unknown>;
				entries: Array<{ duration_seconds: number; distance_m: number | null }>;
			}>;
		};

		expect(r.previousSessions).toHaveLength(1);
		expect(r.previousSessions[0].workout_date).toBe('2025-06-01');
		expect(r.previousSessions[0].sets).toBeUndefined();
		expect(r.previousSessions[0].entries).toHaveLength(1);
		expect(r.previousSessions[0].entries[0].duration_seconds).toBe(2700);
		expect(r.previousSessions[0].entries[0].distance_m).toBe(10000);
	});

	it('returns empty selectedDateCardioEntries for a strength exercise', async () => {
		const result = await page.load(mockEvent({ params: { id: String(strengthExerciseId) } }));
		const r = result as {
			exercise: { kind: string };
			selectedDateCardioEntries: Array<unknown>;
		};

		expect(r.exercise.kind).toBe('strength');
		expect(r.selectedDateCardioEntries).toHaveLength(0);
	});

	it('returns the exercise icon, or null when unset', async () => {
		const unset = await page.load(mockEvent());
		expect((unset as { exercise: { icon: string | null } }).exercise.icon).toBeNull();

		db.update(exerciseType)
			.set({ icon: 'bike' })
			.where(eq(exerciseType.id, cardioExerciseId))
			.run();

		const set = await page.load(mockEvent());
		expect((set as { exercise: { icon: string | null } }).exercise.icon).toBe('bike');
	});
});
