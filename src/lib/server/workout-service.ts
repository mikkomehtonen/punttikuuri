import { eq, and, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { workoutSession, setEntry } from './db/schema';
import * as schema from './db/schema';

export function logSet(
	db: BetterSQLite3Database<typeof schema>,
	userId: number,
	exerciseId: number,
	weightKg: number,
	repetitions: number
): void {
	const today = new Date().toISOString().slice(0, 10);
	const nowISO = new Date().toISOString();

	db.transaction((tx) => {
		let ws = tx
			.select()
			.from(workoutSession)
			.where(
				and(
					eq(workoutSession.exercise_type_id, exerciseId),
					eq(workoutSession.workout_date, today),
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
						workout_date: today,
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
							eq(workoutSession.workout_date, today),
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
