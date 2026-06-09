import { redirect, fail } from '@sveltejs/kit';
import { eq, desc, asc, and, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { exerciseType, workoutSession, setEntry } from '$lib/server/db/schema';
import { validateWeight, validateReps } from '$lib/server/workout-validation';

export const load: PageServerLoad = async ({ params, locals }) => {
	const exerciseId = parseInt(params.id, 10);
	if (isNaN(exerciseId) || exerciseId <= 0) {
		throw redirect(302, '/exercises');
	}

	const exercise = db
		.select()
		.from(exerciseType)
		.where(and(eq(exerciseType.id, exerciseId), eq(exerciseType.user_id, locals.user!.id)))
		.get();

	if (!exercise) {
		throw redirect(302, '/exercises');
	}

	const today = new Date().toISOString().slice(0, 10);

	const todaySession = db
		.select()
		.from(workoutSession)
		.where(
			and(
				eq(workoutSession.exercise_type_id, exercise.id),
				eq(workoutSession.workout_date, today),
				eq(workoutSession.user_id, locals.user.id)
			)
		)
		.get();

	let todaySets: Array<{ set_number: number; weight_kg: number; repetitions: number }> = [];

	if (todaySession) {
		todaySets = db
			.select({
				set_number: setEntry.set_number,
				weight_kg: setEntry.weight_kg,
				repetitions: setEntry.repetitions
			})
			.from(setEntry)
			.where(eq(setEntry.workout_session_id, todaySession.id))
			.orderBy(asc(setEntry.set_number))
			.all();
	}

	const previousSessionsData = db
		.select({
			sessionId: workoutSession.id,
			workout_date: workoutSession.workout_date,
			set_number: setEntry.set_number,
			weight_kg: setEntry.weight_kg,
			repetitions: setEntry.repetitions
		})
		.from(workoutSession)
		.leftJoin(setEntry, eq(setEntry.workout_session_id, workoutSession.id))
		.where(
			and(
				eq(workoutSession.exercise_type_id, exercise.id),
				eq(workoutSession.user_id, locals.user.id),
				sql`${workoutSession.workout_date} != ${today}`
			)
		)
		.orderBy(desc(workoutSession.workout_date), asc(setEntry.set_number))
		.all();

	const sessionMap = new Map<
		number,
		{
			workout_date: string;
			sets: Array<{ set_number: number; weight_kg: number; repetitions: number }>;
		}
	>();
	for (const row of previousSessionsData) {
		const sessionId = row.sessionId;
		if (!sessionMap.has(sessionId)) {
			sessionMap.set(sessionId, {
				workout_date: row.workout_date,
				sets: []
			});
		}
		if (row.set_number !== null) {
			sessionMap.get(sessionId)!.sets.push({
				set_number: row.set_number,
				weight_kg: row.weight_kg!,
				repetitions: row.repetitions!
			});
		}
	}

	const previousSessions = Array.from(sessionMap.values());

	return {
		exercise: {
			id: exercise.id,
			name: exercise.name,
			short_name: exercise.short_name
		},
		todaySets,
		previousSessions
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const exerciseId = parseInt(params.id, 10);
		if (isNaN(exerciseId) || exerciseId <= 0) {
			return fail(400, { error: 'Invalid exercise ID' });
		}

		// Verify the exercise exists and belongs to the current user
		const exercise = db
			.select({ id: exerciseType.id })
			.from(exerciseType)
			.where(and(eq(exerciseType.id, exerciseId), eq(exerciseType.user_id, locals.user.id)))
			.get();

		if (!exercise) {
			return fail(404, { error: 'Exercise not found' });
		}

		const formData = await request.formData();
		const weightKgStr = String(formData.get('weight_kg') ?? '');
		const repetitionsStr = String(formData.get('repetitions') ?? '');

		const weightError = validateWeight(weightKgStr);
		if (weightError) {
			return fail(400, { error: weightError });
		}

		const repsError = validateReps(repetitionsStr);
		if (repsError) {
			return fail(400, { error: repsError });
		}

		const weightKg = Number(weightKgStr);
		const repetitions = Number(repetitionsStr);

		const userId = locals.user.id;
		const now = new Date();
		const today = now.toISOString().slice(0, 10);
		const nowISO = now.toISOString();

		// Use a transaction to atomically find-or-create session and insert set
		db.transaction((tx) => {
			// Find existing workout session for today
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

			// Create if not found (with retry in case of concurrent insert)
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
					// UNIQUE constraint violation — another request created it first;
					// re-fetch the session created by the concurrent request
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

			// Get next set number atomically within the transaction
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

		throw redirect(303, `/exercises/${exerciseId}`);
	}
};
