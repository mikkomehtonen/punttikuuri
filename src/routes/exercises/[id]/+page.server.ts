import { redirect, fail } from '@sveltejs/kit';
import { eq, desc, asc, and, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { exerciseType, workoutSession, setEntry } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const exercise = db
		.select()
		.from(exerciseType)
		.where(and(eq(exerciseType.id, Number(params.id)), eq(exerciseType.user_id, locals.user.id)))
		.get();

	if (!exercise) {
		throw redirect(303, '/exercises');
	}

	const today = new Date().toISOString().slice(0, 10);

	// Get today's workout session
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

	// Get previous workout sessions (not today)
	const previousSessionsData = db
		.select({
			id: workoutSession.id,
			workout_date: workoutSession.workout_date
		})
		.from(workoutSession)
		.where(
			and(
				eq(workoutSession.exercise_type_id, exercise.id),
				eq(workoutSession.user_id, locals.user.id),
				sql`${workoutSession.workout_date} != ${today}`
			)
		)
		.orderBy(desc(workoutSession.workout_date))
		.all();

	const previousSessions = previousSessionsData.map((s) => {
		const sets = db
			.select({
				set_number: setEntry.set_number,
				weight_kg: setEntry.weight_kg,
				repetitions: setEntry.repetitions
			})
			.from(setEntry)
			.where(eq(setEntry.workout_session_id, s.id))
			.orderBy(asc(setEntry.set_number))
			.all();

		return {
			workout_date: s.workout_date,
			sets: sets.map((set) => ({
				set_number: set.set_number,
				weight_kg: set.weight_kg,
				repetitions: set.repetitions
			}))
		};
	});

	return {
		locale: locals.locale,
		theme: locals.theme,
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

		const formData = await request.formData();
		const weightKgStr = (formData.get('weight_kg') as string) ?? '';
		const repetitionsStr = (formData.get('repetitions') as string) ?? '';
		const exerciseId = Number(params.id);

		const weightKg = parseFloat(weightKgStr);
		const repetitions = parseInt(repetitionsStr, 10);

		if (!weightKgStr || isNaN(weightKg) || weightKg <= 0) {
			return fail(400, { error: 'Weight must be a positive number' });
		}

		if (!repetitionsStr || isNaN(repetitions) || repetitions <= 0 || !Number.isInteger(repetitions)) {
			return fail(400, { error: 'Reps must be a positive whole number' });
		}

		const today = new Date().toISOString().slice(0, 10);
		const nowISO = new Date().toISOString();

		// Find or create workout session for today
		let ws = db
			.select()
			.from(workoutSession)
			.where(
				and(
					eq(workoutSession.exercise_type_id, exerciseId),
					eq(workoutSession.workout_date, today),
					eq(workoutSession.user_id, locals.user.id)
				)
			)
			.get();

		if (!ws) {
			ws = db
				.insert(workoutSession)
				.values({
					user_id: locals.user.id,
					exercise_type_id: exerciseId,
					workout_date: today,
					created_at: nowISO
				})
				.returning()
				.get();
		}

		// Get next set number
		const maxSet = db
			.select({ max: sql<number>`COALESCE(MAX(${setEntry.set_number}), 0)` })
			.from(setEntry)
			.where(eq(setEntry.workout_session_id, ws.id))
			.get();

		const nextSetNumber = (maxSet?.max ?? 0) + 1;

		db.insert(setEntry)
			.values({
				workout_session_id: ws.id,
				set_number: nextSetNumber,
				weight_kg: weightKg,
				repetitions,
				created_at: nowISO
			})
			.run();

		throw redirect(303, `/exercises/${exerciseId}`);
	}
};
