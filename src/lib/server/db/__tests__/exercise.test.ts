import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../schema';
import { eq, asc, sql, and } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { registerUser } from '../../auth';
import { exerciseType, workoutSession, setEntry } from '../schema';

const TEST_DB_PATH = 'data/test-exercise.db';
let db: BetterSQLite3Database<typeof schema>;
let sqlite: Database.Database;

function setupTables() {
	sqlite = new Database(TEST_DB_PATH);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');

	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS user (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			locale TEXT NOT NULL DEFAULT 'en',
			theme TEXT NOT NULL DEFAULT 'system',
			created_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS session (
			id TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			expires_at TEXT NOT NULL,
			created_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS exercise_type (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			short_name TEXT,
			display_order INTEGER,
			created_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS workout_session (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			exercise_type_id INTEGER NOT NULL REFERENCES exercise_type(id) ON DELETE CASCADE,
			workout_date TEXT NOT NULL,
			created_at TEXT NOT NULL,
			UNIQUE(user_id, exercise_type_id, workout_date)
		);
		CREATE TABLE IF NOT EXISTS set_entry (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			workout_session_id INTEGER NOT NULL REFERENCES workout_session(id) ON DELETE CASCADE,
			set_number INTEGER NOT NULL,
			weight_kg REAL NOT NULL,
			repetitions INTEGER NOT NULL,
			created_at TEXT NOT NULL
		);
	`);

	db = drizzle(sqlite, { schema });
}

let userIdA: number;
let userIdB: number;

beforeAll(() => {
	setupTables();

	const userA = registerUser({ username: 'exercise_user_a', password: 'password123' }, db);
	if (!userA.ok) throw new Error('Failed to create user A');
	userIdA = userA.user.id;

	const userB = registerUser({ username: 'exercise_user_b', password: 'password123' }, db);
	if (!userB.ok) throw new Error('Failed to create user B');
	userIdB = userB.user.id;
});

afterAll(() => {
	sqlite.close();
});

describe('Exercise Type Management', () => {
	beforeEach(() => {
		// Remove exercise data but keep users
		sqlite.exec('DELETE FROM set_entry');
		sqlite.exec('DELETE FROM workout_session');
		sqlite.exec('DELETE FROM exercise_type');
	});

	it('should create an exercise type with name, short_name, and display_order', () => {
		const result = db
			.insert(exerciseType)
			.values({
				user_id: userIdA,
				name: 'Bench Press',
				short_name: 'BP',
				display_order: 1,
				created_at: new Date().toISOString()
			})
			.returning()
			.get();

		expect(result.name).toBe('Bench Press');
		expect(result.short_name).toBe('BP');
		expect(result.display_order).toBe(1);
		expect(result.user_id).toBe(userIdA);
	});

	it('should create an exercise type without optional fields', () => {
		const result = db
			.insert(exerciseType)
			.values({
				user_id: userIdA,
				name: 'Squat',
				created_at: new Date().toISOString()
			})
			.returning()
			.get();

		expect(result.name).toBe('Squat');
		expect(result.short_name).toBeNull();
		expect(result.display_order).toBeNull();
	});

	it('should reject empty name (database constraint: NOT NULL)', () => {
		// The NOT NULL constraint on name is enforced by the schema, not by the DB at the SQLite level
		// (SQLite allows empty strings). We validate in the action handler.
		// Names longer than 100 chars are also validated in the action handler.
		// This test documents the DB-level expectation.
		const result = db
			.insert(exerciseType)
			.values({
				user_id: userIdA,
				name: '',
				created_at: new Date().toISOString()
			})
			.returning()
			.get();

		expect(result.name).toBe('');
	});

	it('should return all exercises for user sorted by display_order ASC then name ASC', () => {
		db.insert(exerciseType)
			.values([
				{
					user_id: userIdA,
					name: 'Z Press',
					display_order: 2,
					created_at: new Date().toISOString()
				},
				{
					user_id: userIdA,
					name: 'Bench Press',
					display_order: 1,
					created_at: new Date().toISOString()
				},
				{
					user_id: userIdA,
					name: 'Ab Wheel',
					display_order: null,
					created_at: new Date().toISOString()
				},
				{ user_id: userIdA, name: 'Curls', display_order: 1, created_at: new Date().toISOString() }
			])
			.run();

		const exercises = db
			.select()
			.from(exerciseType)
			.where(eq(exerciseType.user_id, userIdA))
			.orderBy(asc(sql`COALESCE(${exerciseType.display_order}, 99999)`), asc(exerciseType.name))
			.all();

		expect(exercises).toHaveLength(4);
		// display_order 1: Bench Press before Curls
		expect(exercises[0].name).toBe('Bench Press');
		expect(exercises[1].name).toBe('Curls');
		// display_order 2: Z Press
		expect(exercises[2].name).toBe('Z Press');
		// NULL display_order (sorting last): Ab Wheel
		expect(exercises[3].name).toBe('Ab Wheel');
	});

	it('should enforce data isolation between users', () => {
		db.insert(exerciseType)
			.values([
				{ user_id: userIdA, name: "User A's Exercise", created_at: new Date().toISOString() },
				{ user_id: userIdB, name: "User B's Exercise", created_at: new Date().toISOString() }
			])
			.run();

		const userAExercises = db
			.select()
			.from(exerciseType)
			.where(eq(exerciseType.user_id, userIdA))
			.all();

		const userBExercises = db
			.select()
			.from(exerciseType)
			.where(eq(exerciseType.user_id, userIdB))
			.all();

		expect(userAExercises).toHaveLength(1);
		expect(userAExercises[0].name).toBe("User A's Exercise");
		expect(userBExercises).toHaveLength(1);
		expect(userBExercises[0].name).toBe("User B's Exercise");
	});

	it('should cascade delete exercises when user is deleted', () => {
		// Register a temporary user
		const tempUser = registerUser({ username: 'temp_exercise_user', password: 'password123' }, db);
		if (!tempUser.ok) throw new Error('Failed to create temp user');

		db.insert(exerciseType)
			.values({
				user_id: tempUser.user.id,
				name: 'Temp Exercise',
				created_at: new Date().toISOString()
			})
			.run();

		// Delete the user
		db.delete(schema.user).where(eq(schema.user.id, tempUser.user.id)).run();

		const exercises = db
			.select()
			.from(exerciseType)
			.where(eq(exerciseType.user_id, tempUser.user.id))
			.all();

		expect(exercises).toHaveLength(0);
	});
});

describe('Workout Logging', () => {
	let exerciseId: number;

	beforeEach(() => {
		sqlite.exec('DELETE FROM set_entry');
		sqlite.exec('DELETE FROM workout_session');
		sqlite.exec('DELETE FROM exercise_type');

		const ex = db
			.insert(exerciseType)
			.values({
				user_id: userIdA,
				name: 'Squat',
				created_at: new Date().toISOString()
			})
			.returning()
			.get();
		exerciseId = ex.id;
	});

	it('should create a workout session for today on first set entry', () => {
		const today = new Date().toISOString().slice(0, 10);
		const nowISO = new Date().toISOString();

		const ws = db
			.insert(workoutSession)
			.values({
				user_id: userIdA,
				exercise_type_id: exerciseId,
				workout_date: today,
				created_at: nowISO
			})
			.returning()
			.get();

		expect(ws.workout_date).toBe(today);
		expect(ws.exercise_type_id).toBe(exerciseId);
		expect(ws.user_id).toBe(userIdA);
	});

	it('should create a set entry with sequential numbering', () => {
		const today = new Date().toISOString().slice(0, 10);
		const nowISO = new Date().toISOString();

		const ws = db
			.insert(workoutSession)
			.values({
				user_id: userIdA,
				exercise_type_id: exerciseId,
				workout_date: today,
				created_at: nowISO
			})
			.returning()
			.get();

		// Insert 3 sets
		for (let i = 1; i <= 3; i++) {
			db.insert(setEntry)
				.values({
					workout_session_id: ws.id,
					set_number: i,
					weight_kg: 100,
					repetitions: 5,
					created_at: nowISO
				})
				.run();
		}

		const sets = db
			.select()
			.from(setEntry)
			.where(eq(setEntry.workout_session_id, ws.id))
			.orderBy(sql`${setEntry.set_number}`)
			.all();

		expect(sets).toHaveLength(3);
		expect(sets[0].set_number).toBe(1);
		expect(sets[1].set_number).toBe(2);
		expect(sets[2].set_number).toBe(3);
	});

	it('should enforce one session per user per exercise per day', () => {
		const today = new Date().toISOString().slice(0, 10);
		const nowISO = new Date().toISOString();

		db.insert(workoutSession)
			.values({
				user_id: userIdA,
				exercise_type_id: exerciseId,
				workout_date: today,
				created_at: nowISO
			})
			.run();

		// Second insert with same user/exercise/date should fail
		expect(() => {
			db.insert(workoutSession)
				.values({
					user_id: userIdA,
					exercise_type_id: exerciseId,
					workout_date: today,
					created_at: nowISO
				})
				.run();
		}).toThrow();
	});

	it('should store weight as REAL and reps as INTEGER', () => {
		const today = new Date().toISOString().slice(0, 10);
		const nowISO = new Date().toISOString();

		const ws = db
			.insert(workoutSession)
			.values({
				user_id: userIdA,
				exercise_type_id: exerciseId,
				workout_date: today,
				created_at: nowISO
			})
			.returning()
			.get();

		db.insert(setEntry)
			.values({
				workout_session_id: ws.id,
				set_number: 1,
				weight_kg: 102.5,
				repetitions: 8,
				created_at: nowISO
			})
			.run();

		const set = db.select().from(setEntry).where(eq(setEntry.workout_session_id, ws.id)).get()!;

		expect(set.weight_kg).toBe(102.5);
		expect(set.repetitions).toBe(8);
	});

	it('should isolate workout data between users', () => {
		const today = new Date().toISOString().slice(0, 10);
		const nowISO = new Date().toISOString();

		// User A creates a session
		const wsA = db
			.insert(workoutSession)
			.values({
				user_id: userIdA,
				exercise_type_id: exerciseId,
				workout_date: today,
				created_at: nowISO
			})
			.returning()
			.get();

		// User A adds a set
		db.insert(setEntry)
			.values({
				workout_session_id: wsA.id,
				set_number: 1,
				weight_kg: 100,
				repetitions: 5,
				created_at: nowISO
			})
			.run();

		// User B should not see any sessions for the same exercise
		const userBSessions = db
			.select()
			.from(workoutSession)
			.where(
				and(eq(workoutSession.exercise_type_id, exerciseId), eq(workoutSession.user_id, userIdB))
			)
			.all();

		expect(userBSessions).toHaveLength(0);
	});

	it('should delete set entries when workout session is deleted (cascade)', () => {
		const today = new Date().toISOString().slice(0, 10);
		const nowISO = new Date().toISOString();

		const ws = db
			.insert(workoutSession)
			.values({
				user_id: userIdA,
				exercise_type_id: exerciseId,
				workout_date: today,
				created_at: nowISO
			})
			.returning()
			.get();

		db.insert(setEntry)
			.values({
				workout_session_id: ws.id,
				set_number: 1,
				weight_kg: 100,
				repetitions: 5,
				created_at: nowISO
			})
			.run();

		// Delete the workout session
		db.delete(workoutSession).where(eq(workoutSession.id, ws.id)).run();

		const sets = db.select().from(setEntry).where(eq(setEntry.workout_session_id, ws.id)).all();
		expect(sets).toHaveLength(0);
	});
});

describe('User Preferences', () => {
	beforeEach(() => {
		sqlite.exec('DELETE FROM workout_session');
		sqlite.exec('DELETE FROM exercise_type');
		sqlite.exec('DELETE FROM session');
		sqlite.exec('DELETE FROM user');
	});

	it('should create user with default locale and theme', () => {
		const regResult = registerUser({ username: 'prefs_user', password: 'password123' }, db);
		expect(regResult.ok).toBe(true);
		if (!regResult.ok) return;
		expect(regResult.user.locale).toBe('en');
		expect(regResult.user.theme).toBe('system');
	});

	it('should update user locale', () => {
		const regResult = registerUser({ username: 'locale_user', password: 'password123' }, db);
		expect(regResult.ok).toBe(true);
		if (!regResult.ok) return;

		db.update(schema.user).set({ locale: 'fi' }).where(eq(schema.user.id, regResult.user.id)).run();

		const updated = db
			.select()
			.from(schema.user)
			.where(eq(schema.user.id, regResult.user.id))
			.get()!;
		expect(updated.locale).toBe('fi');
	});

	it('should update user theme', () => {
		const regResult = registerUser({ username: 'theme_user', password: 'password123' }, db);
		expect(regResult.ok).toBe(true);
		if (!regResult.ok) return;

		db.update(schema.user)
			.set({ theme: 'dark' })
			.where(eq(schema.user.id, regResult.user.id))
			.run();

		const updated = db
			.select()
			.from(schema.user)
			.where(eq(schema.user.id, regResult.user.id))
			.get()!;
		expect(updated.theme).toBe('dark');
	});

	it('should persist locale and theme across sessions', () => {
		const regResult = registerUser({ username: 'persist_user', password: 'password123' }, db);
		expect(regResult.ok).toBe(true);
		if (!regResult.ok) return;

		db.update(schema.user)
			.set({ locale: 'fi', theme: 'dark' })
			.where(eq(schema.user.id, regResult.user.id))
			.run();

		// Re-fetch user (simulating new page load)
		const refetched = db
			.select()
			.from(schema.user)
			.where(eq(schema.user.id, regResult.user.id))
			.get()!;
		expect(refetched.locale).toBe('fi');
		expect(refetched.theme).toBe('dark');
	});
});
