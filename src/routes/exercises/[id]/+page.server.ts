import { redirect, fail, type ActionFailure } from '@sveltejs/kit';
import { eq, desc, asc, and, sql, count } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { exerciseType, workoutSession, setEntry } from '$lib/server/db/schema';
import {
	validateWeight,
	validateReps,
	validateComment,
	validateWorkoutDate
} from '$lib/server/workout-validation';
import { logSet } from '$lib/server/workout-service';
import { t } from '$lib/i18n';
import { deriveLastSet } from './utils';

export const load: PageServerLoad = async ({ params, locals, url }) => {
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
	const dateParam = url.searchParams.get('date');
	const selectedDate =
		dateParam !== null && validateWorkoutDate(dateParam, locals.locale) === null
			? dateParam
			: today;
	const isToday = selectedDate === today;

	const selectedDateSession = db
		.select()
		.from(workoutSession)
		.where(
			and(
				eq(workoutSession.exercise_type_id, exercise.id),
				eq(workoutSession.workout_date, selectedDate),
				eq(workoutSession.user_id, locals.user!.id)
			)
		)
		.get();

	let selectedDateSets: Array<{ set_number: number; weight_kg: number; repetitions: number }> = [];

	if (selectedDateSession) {
		selectedDateSets = db
			.select({
				set_number: setEntry.set_number,
				weight_kg: setEntry.weight_kg,
				repetitions: setEntry.repetitions
			})
			.from(setEntry)
			.where(eq(setEntry.workout_session_id, selectedDateSession.id))
			.orderBy(asc(setEntry.set_number))
			.all();
	}

	const previousSessionsData = db
		.select({
			sessionId: workoutSession.id,
			workout_date: workoutSession.workout_date,
			comment: workoutSession.comment,
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
				sql`${workoutSession.workout_date} != ${selectedDate}`
			)
		)
		.orderBy(desc(workoutSession.workout_date), asc(setEntry.set_number))
		.all();

	const sessionMap = new Map<
		number,
		{
			workout_date: string;
			comment: string | null;
			sets: Array<{ set_number: number; weight_kg: number; repetitions: number }>;
		}
	>();
	for (const row of previousSessionsData) {
		const sessionId = row.sessionId;
		if (!sessionMap.has(sessionId)) {
			sessionMap.set(sessionId, {
				workout_date: row.workout_date,
				comment: row.comment,
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

	const lastSet = deriveLastSet(selectedDateSets, previousSessions);

	return {
		exercise: {
			id: exercise.id,
			name: exercise.name,
			short_name: exercise.short_name
		},
		today,
		selectedDate,
		isToday,
		selectedDateSets,
		selectedDateComment: selectedDateSession?.comment ?? null,
		previousSessions,
		lastSet
	};
};

type OwnedExerciseResult =
	| { exerciseId: number; userId: number }
	| { failure: ActionFailure<{ error: string }> };

function getOwnedExerciseId(
	locals: { user: { id: number } | null },
	params: { id: string }
): OwnedExerciseResult {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const exerciseId = parseInt(params.id, 10);
	if (isNaN(exerciseId) || exerciseId <= 0) {
		return { failure: fail(400, { error: 'Invalid exercise ID' }) };
	}

	// Verify the exercise exists and belongs to the current user
	const exercise = db
		.select({ id: exerciseType.id })
		.from(exerciseType)
		.where(and(eq(exerciseType.id, exerciseId), eq(exerciseType.user_id, locals.user.id)))
		.get();

	if (!exercise) {
		return { failure: fail(404, { error: 'Exercise not found' }) };
	}

	return { exerciseId, userId: locals.user.id };
}

export const actions: Actions = {
	logSet: async ({ request, params, locals }) => {
		const owned = getOwnedExerciseId(locals, params);
		if ('failure' in owned) {
			return owned.failure;
		}
		const { exerciseId, userId } = owned;

		const formData = await request.formData();
		const weightKgStr = String(formData.get('weight_kg') ?? '');
		const repetitionsStr = String(formData.get('repetitions') ?? '');
		const workoutDateStr = String(formData.get('workout_date') ?? '');

		const weightError = validateWeight(weightKgStr);
		if (weightError) {
			return fail(400, { error: weightError });
		}

		const repsError = validateReps(repetitionsStr);
		if (repsError) {
			return fail(400, { error: repsError });
		}

		const workoutDate =
			workoutDateStr === '' ? new Date().toISOString().slice(0, 10) : workoutDateStr;
		const dateError = validateWorkoutDate(workoutDate, locals.locale);
		if (dateError) {
			return fail(400, { error: dateError });
		}

		const weightKg = Number(weightKgStr);
		const repetitions = Number(repetitionsStr);

		logSet(db, userId, exerciseId, workoutDate, weightKg, repetitions);

		throw redirect(303, `/exercises/${exerciseId}`);
	},

	saveComment: async ({ request, params, locals }) => {
		const owned = getOwnedExerciseId(locals, params);
		if ('failure' in owned) {
			return owned.failure;
		}
		const { exerciseId, userId } = owned;

		const formData = await request.formData();
		const workoutDateStr = String(formData.get('workout_date') ?? '');
		const workoutDate =
			workoutDateStr === '' ? new Date().toISOString().slice(0, 10) : workoutDateStr;

		const dateError = validateWorkoutDate(workoutDate, locals.locale);
		if (dateError) {
			return fail(400, { error: dateError });
		}

		const session = db
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

		if (!session) {
			return fail(400, { error: t('workout.noSetsForComment', locals.locale) });
		}

		const setCount = db
			.select({ count: count() })
			.from(setEntry)
			.where(eq(setEntry.workout_session_id, session.id))
			.get();

		if (!setCount || setCount.count === 0) {
			return fail(400, { error: t('workout.noSetsForComment', locals.locale) });
		}

		const comment = String(formData.get('comment') ?? '');

		const commentError = validateComment(comment);
		if (commentError) {
			return fail(400, { error: commentError });
		}

		db.update(workoutSession)
			.set({ comment: comment.trim() })
			.where(eq(workoutSession.id, session.id))
			.run();

		throw redirect(303, `/exercises/${exerciseId}`);
	}
};
