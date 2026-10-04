import { eq, and, asc, sql, type ExtractTablesWithRelations } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { workoutSession, setEntry, cardioEntry } from './db/schema';
import * as schema from './db/schema';

type WorkoutDb = BetterSQLite3Database<typeof schema>;
type WorkoutTx = SQLiteTransaction<
	'sync',
	unknown,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;

function getOrCreateWorkoutSession(
	tx: WorkoutTx,
	userId: number,
	exerciseId: number,
	workoutDate: string,
	nowISO: string
): typeof workoutSession.$inferSelect {
	let ws = tx
		.select()
		.from(workoutSession)
		.where(
			and(
				eq(workoutSession.exercise_type_id, exerciseId),
				eq(workoutSession.workout_date, workoutDate),
				eq(workoutSession.user_id, userId)
			)
		)
		.get();

	if (!ws) {
		try {
			ws = tx
				.insert(workoutSession)
				.values({
					user_id: userId,
					exercise_type_id: exerciseId,
					workout_date: workoutDate,
					created_at: nowISO
				})
				.returning()
				.get();
		} catch (err) {
			if (
				!err ||
				typeof err !== 'object' ||
				!('code' in err) ||
				(err as { code: string }).code !== 'SQLITE_CONSTRAINT_UNIQUE'
			) {
				throw err;
			}
			const existing = tx
				.select()
				.from(workoutSession)
				.where(
					and(
						eq(workoutSession.exercise_type_id, exerciseId),
						eq(workoutSession.workout_date, workoutDate),
						eq(workoutSession.user_id, userId)
					)
				)
				.get();
			if (!existing) {
				throw new Error('Failed to create or find workout session', { cause: err });
			}
			ws = existing;
		}
	}

	return ws;
}

export function logSet(
	db: WorkoutDb,
	userId: number,
	exerciseId: number,
	workoutDate: string,
	weightKg: number,
	repetitions: number
): void {
	const nowISO = new Date().toISOString();

	db.transaction((tx) => {
		const ws = getOrCreateWorkoutSession(tx, userId, exerciseId, workoutDate, nowISO);

		const maxSet = tx
			.select({ max: sql<number>`COALESCE(MAX(${setEntry.set_number}), 0)` })
			.from(setEntry)
			.where(eq(setEntry.workout_session_id, ws.id))
			.get();

		const nextSetNumber = (maxSet?.max ?? 0) + 1;

		tx.insert(setEntry)
			.values({
				workout_session_id: ws.id,
				set_number: nextSetNumber,
				weight_kg: weightKg,
				repetitions,
				created_at: nowISO
			})
			.run();
	});
}

export function logCardio(
	db: WorkoutDb,
	userId: number,
	exerciseId: number,
	workoutDate: string,
	durationSeconds: number,
	distanceM: number | null,
	description: string | null
): void {
	const nowISO = new Date().toISOString();

	db.transaction((tx) => {
		const ws = getOrCreateWorkoutSession(tx, userId, exerciseId, workoutDate, nowISO);

		tx.insert(cardioEntry)
			.values({
				workout_session_id: ws.id,
				duration_seconds: durationSeconds,
				distance_m: distanceM,
				description,
				created_at: nowISO
			})
			.run();
	});
}

export function deleteSetEntry(db: WorkoutDb, sessionId: number, setNumber: number): void {
	db.transaction((tx) => {
		tx.delete(setEntry)
			.where(and(eq(setEntry.workout_session_id, sessionId), eq(setEntry.set_number, setNumber)))
			.run();

		const remaining = tx
			.select()
			.from(setEntry)
			.where(eq(setEntry.workout_session_id, sessionId))
			.orderBy(asc(setEntry.created_at), asc(setEntry.id))
			.all();

		remaining.forEach((row, index) => {
			const nextNumber = index + 1;
			if (row.set_number !== nextNumber) {
				tx.update(setEntry).set({ set_number: nextNumber }).where(eq(setEntry.id, row.id)).run();
			}
		});
	});
}
