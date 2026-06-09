import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../schema';
import { eq, asc, sql, and } from 'drizzle-orm';
import { registerUser } from '../../auth';
import { exerciseType, workoutSession, setEntry } from '../schema';
import { createTestDb, destroyTestDb, cleanAllTables } from './test-utils';
import { logSet } from '../../workout-service';

const TEST_DB_PATH = 'data/test-exercise.db';
let db: BetterSQLite3Database<typeof schema>;
let sqlite: Database.Database;

let userIdA: number;
let userIdB: number;

beforeAll(() => {
	const testDb = createTestDb(TEST_DB_PATH);
	sqlite = testDb.sqlite;
	db = testDb.db;
});

afterAll(() => {
	destroyTestDb(sqlite, TEST_DB_PATH);
});

describe('Exercise Type Management', () => {
	beforeEach(() => {
		cleanAllTables(sqlite);
		// Re-create users for isolation tests
		const userA = registerUser({ username: 'exercise_user_a', password: 'password123' }, db);
		if (!userA.ok) throw new Error('Failed to create user A');
		userIdA = userA.user.id;

		const userB = registerUser({ username: 'exercise_user_b', password: 'password123' }, db);
		if (!userB.ok) throw new Error('Failed to create user B');
		userIdB = userB.user.id;
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

	it('should allow empty string with NOT NULL constraint (SQLite behavior)', () => {
		// SQLite NOT NULL only rejects NULL, not empty strings.
		// Application-level validation (validateExerciseName) blocks empty names.
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
		const tempUser = registerUser({ username: 'temp_exercise_user', password: 'password123' }, db);
		if (!tempUser.ok) throw new Error('Failed to create temp user');

		db.insert(exerciseType)
			.values({
				user_id: tempUser.user.id,
				name: 'Temp Exercise',
				created_at: new Date().toISOString()
			})
			.run();

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
		cleanAllTables(sqlite);
		// Re-create users
		const userA = registerUser({ username: 'exercise_user_a', password: 'password123' }, db);
		if (!userA.ok) throw new Error('Failed to create user A');
		userIdA = userA.user.id;

		const userB = registerUser({ username: 'exercise_user_b', password: 'password123' }, db);
		if (!userB.ok) throw new Error('Failed to create user B');
		userIdB = userB.user.id;

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

		db.insert(setEntry)
			.values({
				workout_session_id: wsA.id,
				set_number: 1,
				weight_kg: 100,
				repetitions: 5,
				created_at: nowISO
			})
			.run();

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

		db.delete(workoutSession).where(eq(workoutSession.id, ws.id)).run();

		const sets = db.select().from(setEntry).where(eq(setEntry.workout_session_id, ws.id)).all();
		expect(sets).toHaveLength(0);
	});

	it('logSet should auto-create session and insert set with sequential numbering', () => {
		const today = new Date().toISOString().slice(0, 10);

		logSet(db, userIdA, exerciseId, 100, 5);
		logSet(db, userIdA, exerciseId, 102.5, 3);

		const sessions = db
			.select()
			.from(workoutSession)
			.where(
				and(eq(workoutSession.user_id, userIdA), eq(workoutSession.exercise_type_id, exerciseId))
			)
			.all();
		expect(sessions).toHaveLength(1);
		expect(sessions[0].workout_date).toBe(today);

		const sets = db
			.select()
			.from(setEntry)
			.where(eq(setEntry.workout_session_id, sessions[0].id))
			.orderBy(asc(setEntry.set_number))
			.all();
		expect(sets).toHaveLength(2);
		expect(sets[0].set_number).toBe(1);
		expect(sets[0].weight_kg).toBe(100);
		expect(sets[0].repetitions).toBe(5);
		expect(sets[1].set_number).toBe(2);
		expect(sets[1].weight_kg).toBe(102.5);
		expect(sets[1].repetitions).toBe(3);
	});
});

describe('User Preferences', () => {
	beforeEach(() => {
		cleanAllTables(sqlite);
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

		const refetched = db
			.select()
			.from(schema.user)
			.where(eq(schema.user.id, regResult.user.id))
			.get()!;
		expect(refetched.locale).toBe('fi');
		expect(refetched.theme).toBe('dark');
	});
});
