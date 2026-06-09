import { redirect, fail } from '@sveltejs/kit';
import { eq, desc, asc, and, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { exerciseType, workoutSession, setEntry } from '$lib/server/db/schema';
import { validateWeight, validateReps } from '$lib/server/workout-validation';
import { logSet } from '$lib/server/workout-service';

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
				eq(workoutSession.user_id, locals.user!.id)
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
				eq(workoutSession.user_id, locals.user!.id),
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

		logSet(db, locals.user.id, exerciseId, weightKg, repetitions);

		throw redirect(303, `/exercises/${exerciseId}`);
	}
};
