import { redirect, fail, type ActionFailure } from '@sveltejs/kit';
import { eq, desc, asc, and, sql, count } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	exerciseType,
	workoutSession,
	setEntry,
	cardioEntry,
	type ExerciseKind
} from '$lib/server/db/schema';
import {
	validateWeight,
	validateReps,
	validateComment,
	validateWorkoutDate,
	validateDuration,
	validateDistanceM,
	validateCardioDescription
} from '$lib/server/workout-validation';
import { logSet, logCardio, deleteSetEntry } from '$lib/server/workout-service';
import { t, type Locale } from '$lib/i18n';
import {
	deriveLastSet,
	type PreviousSession,
	type SetSummary,
	type CardioEntrySummary
} from './utils';

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

	const isCardio = exercise.kind === 'cardio';

	const today = new Date().toISOString().slice(0, 10);
	const dateParam = url.searchParams.get('date');
	const selectedDate =
		dateParam !== null && validateWorkoutDate(dateParam, locals.locale) === null
			? dateParam
			: today;
	const isToday = selectedDate === today;

	const selectedDateSession = findSession(locals.user!.id, exercise.id, selectedDate);

	let selectedDateSets: SetSummary[] = [];
	let selectedDateCardioEntries: CardioEntrySummary[] = [];

	if (selectedDateSession) {
		if (isCardio) {
			selectedDateCardioEntries = db
				.select({
					id: cardioEntry.id,
					duration_seconds: cardioEntry.duration_seconds,
					distance_m: cardioEntry.distance_m,
					description: cardioEntry.description
				})
				.from(cardioEntry)
				.where(eq(cardioEntry.workout_session_id, selectedDateSession.id))
				.orderBy(asc(cardioEntry.created_at), asc(cardioEntry.id))
				.all();
		} else {
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
	}

	// History: join each entry table separately. Left-joining both `set_entry`
	// and `cardio_entry` in one query would produce a cartesian product.
	const previousSessions = isCardio
		? loadCardioHistory(locals.user!.id, exercise.id, selectedDate)
		: loadStrengthHistory(locals.user!.id, exercise.id, selectedDate);

	const lastSet = deriveLastSet(selectedDateSets, previousSessions);

	return {
		exercise: {
			id: exercise.id,
			name: exercise.name,
			short_name: exercise.short_name,
			kind: exercise.kind
		},
		today,
		selectedDate,
		isToday,
		selectedDateSets,
		selectedDateCardioEntries,
		selectedDateComment: selectedDateSession?.comment ?? null,
		previousSessions,
		lastSet
	};
};

type SessionRow = { sessionId: number; workout_date: string; comment: string | null };

/** Groups flat LEFT JOIN rows into one `PreviousSession` per session id. */
function groupRowsBySession<R extends SessionRow, S extends PreviousSession>(
	rows: R[],
	makeSession: (row: R) => S,
	pushEntry: (session: S, row: R) => void
): PreviousSession[] {
	const sessionMap = new Map<number, S>();
	for (const row of rows) {
		let session = sessionMap.get(row.sessionId);
		if (!session) {
			session = makeSession(row);
			sessionMap.set(row.sessionId, session);
		}
		pushEntry(session, row);
	}
	return Array.from(sessionMap.values());
}

function loadStrengthHistory(userId: number, exerciseId: number, selectedDate: string) {
	const rows = db
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
				eq(workoutSession.exercise_type_id, exerciseId),
				eq(workoutSession.user_id, userId),
				sql`${workoutSession.workout_date} != ${selectedDate}`
			)
		)
		.orderBy(desc(workoutSession.workout_date), asc(setEntry.set_number))
		.all();

	return groupRowsBySession(
		rows,
		(row): { workout_date: string; comment: string | null; sets: SetSummary[] } => ({
			workout_date: row.workout_date,
			comment: row.comment,
			sets: []
		}),
		(session, row) => {
			if (row.set_number === null || row.weight_kg === null || row.repetitions === null) {
				return;
			}
			session.sets.push({
				set_number: row.set_number,
				weight_kg: row.weight_kg,
				repetitions: row.repetitions
			});
		}
	);
}

function loadCardioHistory(userId: number, exerciseId: number, selectedDate: string) {
	const rows = db
		.select({
			sessionId: workoutSession.id,
			workout_date: workoutSession.workout_date,
			comment: workoutSession.comment,
			entry_id: cardioEntry.id,
			duration_seconds: cardioEntry.duration_seconds,
			distance_m: cardioEntry.distance_m,
			description: cardioEntry.description
		})
		.from(workoutSession)
		.leftJoin(cardioEntry, eq(cardioEntry.workout_session_id, workoutSession.id))
		.where(
			and(
				eq(workoutSession.exercise_type_id, exerciseId),
				eq(workoutSession.user_id, userId),
				sql`${workoutSession.workout_date} != ${selectedDate}`
			)
		)
		.orderBy(desc(workoutSession.workout_date), asc(cardioEntry.created_at), asc(cardioEntry.id))
		.all();

	return groupRowsBySession(
		rows,
		(row): { workout_date: string; comment: string | null; entries: CardioEntrySummary[] } => ({
			workout_date: row.workout_date,
			comment: row.comment,
			entries: []
		}),
		(session, row) => {
			if (row.entry_id === null || row.duration_seconds === null) return;
			session.entries.push({
				id: row.entry_id,
				duration_seconds: row.duration_seconds,
				distance_m: row.distance_m,
				description: row.description
			});
		}
	);
}

type OwnedExerciseResult =
	| { exerciseId: number; userId: number; kind: ExerciseKind }
	| { failure: ActionFailure<{ error: string }> };

function getOwnedExerciseId(
	locals: { user: { id: number } | null; locale: Locale },
	params: { id: string },
	expectedKind: ExerciseKind | null
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
		.select({ id: exerciseType.id, kind: exerciseType.kind })
		.from(exerciseType)
		.where(and(eq(exerciseType.id, exerciseId), eq(exerciseType.user_id, locals.user.id)))
		.get();

	if (!exercise) {
		return { failure: fail(404, { error: 'Exercise not found' }) };
	}

	if (expectedKind !== null && exercise.kind !== expectedKind) {
		return { failure: fail(400, { error: t('workout.kindMismatch', locals.locale) }) };
	}

	return { exerciseId, userId: locals.user.id, kind: exercise.kind };
}

function findSession(userId: number, exerciseId: number, workoutDate: string) {
	return db
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
}

function resolveWorkoutDate(workoutDateStr: string): string {
	return workoutDateStr === '' ? new Date().toISOString().slice(0, 10) : workoutDateStr;
}

function parseCardioEntryId(value: string): number | null {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) {
		return null;
	}
	return id;
}

function findCardioEntry(sessionId: number, entryId: number) {
	return db
		.select({ id: cardioEntry.id })
		.from(cardioEntry)
		.where(and(eq(cardioEntry.workout_session_id, sessionId), eq(cardioEntry.id, entryId)))
		.get();
}

export const actions: Actions = {
	logSet: async ({ request, params, locals }) => {
		const owned = getOwnedExerciseId(locals, params, 'strength');
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

		const workoutDate = resolveWorkoutDate(workoutDateStr);
		const dateError = validateWorkoutDate(workoutDate, locals.locale);
		if (dateError) {
			return fail(400, { error: dateError });
		}

		const weightKg = Number(weightKgStr);
		const repetitions = Number(repetitionsStr);

		logSet(db, userId, exerciseId, workoutDate, weightKg, repetitions);

		throw redirect(303, `/exercises/${exerciseId}`);
	},

	logCardio: async ({ request, params, locals }) => {
		const owned = getOwnedExerciseId(locals, params, 'cardio');
		if ('failure' in owned) {
			return owned.failure;
		}
		const { exerciseId, userId } = owned;

		const formData = await request.formData();
		const hoursStr = String(formData.get('hours') ?? '');
		const minutesStr = String(formData.get('minutes') ?? '');
		const secondsStr = String(formData.get('seconds') ?? '');
		const distanceStr = String(formData.get('distance_km') ?? '');
		const descriptionStr = String(formData.get('description') ?? '');
		const workoutDateStr = String(formData.get('workout_date') ?? '');

		const workoutDate = resolveWorkoutDate(workoutDateStr);
		const dateError = validateWorkoutDate(workoutDate, locals.locale);
		if (dateError) {
			return fail(400, { error: dateError });
		}

		const duration = validateDuration(hoursStr, minutesStr, secondsStr, locals.locale);
		if (duration.error !== null) {
			return fail(400, { error: duration.error });
		}

		const distance = validateDistanceM(distanceStr, locals.locale);
		if (distance.error !== null) {
			return fail(400, { error: distance.error });
		}

		const description = validateCardioDescription(descriptionStr, locals.locale);
		if (description.error !== null) {
			return fail(400, { error: description.error });
		}

		logCardio(
			db,
			userId,
			exerciseId,
			workoutDate,
			duration.totalSeconds,
			distance.distanceM,
			description.description
		);

		throw redirect(303, `/exercises/${exerciseId}?date=${workoutDate}`);
	},

	saveComment: async ({ request, params, locals }) => {
		const owned = getOwnedExerciseId(locals, params, null);
		if ('failure' in owned) {
			return owned.failure;
		}
		const { exerciseId, userId } = owned;

		const formData = await request.formData();
		const workoutDateStr = String(formData.get('workout_date') ?? '');
		const workoutDate = resolveWorkoutDate(workoutDateStr);

		const dateError = validateWorkoutDate(workoutDate, locals.locale);
		if (dateError) {
			return fail(400, { error: dateError });
		}

		const session = findSession(userId, exerciseId, workoutDate);

		if (!session) {
			return fail(400, {
				error:
					owned.kind === 'cardio'
						? t('workout.noEntriesForComment', locals.locale)
						: t('workout.noSetsForComment', locals.locale)
			});
		}

		if (owned.kind === 'cardio') {
			const entryCount = db
				.select({ count: count() })
				.from(cardioEntry)
				.where(eq(cardioEntry.workout_session_id, session.id))
				.get();

			if (!entryCount || entryCount.count === 0) {
				return fail(400, { error: t('workout.noEntriesForComment', locals.locale) });
			}
		} else {
			const setCount = db
				.select({ count: count() })
				.from(setEntry)
				.where(eq(setEntry.workout_session_id, session.id))
				.get();

			if (!setCount || setCount.count === 0) {
				return fail(400, { error: t('workout.noSetsForComment', locals.locale) });
			}
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
	},

	deleteSet: async ({ request, params, locals }) => {
		const owned = getOwnedExerciseId(locals, params, 'strength');
		if ('failure' in owned) {
			return owned.failure;
		}
		const { exerciseId, userId } = owned;

		const formData = await request.formData();
		const workoutDateStr = String(formData.get('workout_date') ?? '');
		const setNumberStr = String(formData.get('set_number') ?? '');

		const workoutDate = resolveWorkoutDate(workoutDateStr);
		const dateError = validateWorkoutDate(workoutDate, locals.locale);
		if (dateError) {
			return fail(400, { error: dateError });
		}

		const setNumber = Number(setNumberStr);
		if (!Number.isInteger(setNumber) || setNumber <= 0) {
			return fail(400, { error: t('workout.invalidSetNumber', locals.locale) });
		}

		const session = findSession(userId, exerciseId, workoutDate);

		if (!session) {
			return fail(400, { error: t('workout.noSetsForDate', locals.locale) });
		}

		const entry = db
			.select({ id: setEntry.id })
			.from(setEntry)
			.where(and(eq(setEntry.workout_session_id, session.id), eq(setEntry.set_number, setNumber)))
			.get();

		if (!entry) {
			return fail(400, { error: t('workout.invalidSetNumber', locals.locale) });
		}

		deleteSetEntry(db, session.id, setNumber);

		throw redirect(303, `/exercises/${exerciseId}?date=${workoutDate}`);
	},

	editSet: async ({ request, params, locals }) => {
		const owned = getOwnedExerciseId(locals, params, 'strength');
		if ('failure' in owned) {
			return owned.failure;
		}
		const { exerciseId, userId } = owned;

		const formData = await request.formData();
		const workoutDateStr = String(formData.get('workout_date') ?? '');
		const setNumberStr = String(formData.get('set_number') ?? '');
		const weightKgStr = String(formData.get('weight_kg') ?? '');
		const repetitionsStr = String(formData.get('repetitions') ?? '');

		const workoutDate = resolveWorkoutDate(workoutDateStr);
		const dateError = validateWorkoutDate(workoutDate, locals.locale);
		if (dateError) {
			return fail(400, { error: dateError });
		}

		const session = findSession(userId, exerciseId, workoutDate);

		if (!session) {
			return fail(400, { error: t('workout.noSetsForDate', locals.locale) });
		}

		const setNumber = Number(setNumberStr);
		if (!Number.isInteger(setNumber) || setNumber <= 0) {
			return fail(400, { error: t('workout.invalidSetNumber', locals.locale) });
		}

		const weightError = validateWeight(weightKgStr);
		if (weightError) {
			return fail(400, { error: weightError });
		}

		const repsError = validateReps(repetitionsStr);
		if (repsError) {
			return fail(400, { error: repsError });
		}

		const entry = db
			.select({ id: setEntry.id })
			.from(setEntry)
			.where(and(eq(setEntry.workout_session_id, session.id), eq(setEntry.set_number, setNumber)))
			.get();

		if (!entry) {
			return fail(400, { error: t('workout.invalidSetNumber', locals.locale) });
		}

		db.update(setEntry)
			.set({ weight_kg: Number(weightKgStr), repetitions: Number(repetitionsStr) })
			.where(eq(setEntry.id, entry.id))
			.run();

		throw redirect(303, `/exercises/${exerciseId}?date=${workoutDate}`);
	},

	editCardio: async ({ request, params, locals }) => {
		const owned = getOwnedExerciseId(locals, params, 'cardio');
		if ('failure' in owned) {
			return owned.failure;
		}
		const { exerciseId, userId } = owned;

		const formData = await request.formData();
		const workoutDateStr = String(formData.get('workout_date') ?? '');
		const entryIdStr = String(formData.get('cardio_entry_id') ?? '');
		const hoursStr = String(formData.get('hours') ?? '');
		const minutesStr = String(formData.get('minutes') ?? '');
		const secondsStr = String(formData.get('seconds') ?? '');
		const distanceStr = String(formData.get('distance_km') ?? '');
		const descriptionStr = String(formData.get('description') ?? '');

		const workoutDate = resolveWorkoutDate(workoutDateStr);
		const dateError = validateWorkoutDate(workoutDate, locals.locale);
		if (dateError) {
			return fail(400, { error: dateError });
		}

		const entryId = parseCardioEntryId(entryIdStr);
		if (entryId === null) {
			return fail(400, { error: t('workout.invalidCardioEntry', locals.locale) });
		}

		const session = findSession(userId, exerciseId, workoutDate);
		if (!session) {
			return fail(400, { error: t('workout.invalidCardioEntry', locals.locale) });
		}

		const entry = findCardioEntry(session.id, entryId);
		if (!entry) {
			return fail(400, { error: t('workout.invalidCardioEntry', locals.locale) });
		}

		const duration = validateDuration(hoursStr, minutesStr, secondsStr, locals.locale);
		if (duration.error !== null) {
			return fail(400, { error: duration.error });
		}

		const distance = validateDistanceM(distanceStr, locals.locale);
		if (distance.error !== null) {
			return fail(400, { error: distance.error });
		}

		const description = validateCardioDescription(descriptionStr, locals.locale);
		if (description.error !== null) {
			return fail(400, { error: description.error });
		}

		db.update(cardioEntry)
			.set({
				duration_seconds: duration.totalSeconds,
				distance_m: distance.distanceM,
				description: description.description
			})
			.where(eq(cardioEntry.id, entry.id))
			.run();

		throw redirect(303, `/exercises/${exerciseId}?date=${workoutDate}`);
	},

	deleteCardio: async ({ request, params, locals }) => {
		const owned = getOwnedExerciseId(locals, params, 'cardio');
		if ('failure' in owned) {
			return owned.failure;
		}
		const { exerciseId, userId } = owned;

		const formData = await request.formData();
		const workoutDateStr = String(formData.get('workout_date') ?? '');
		const entryIdStr = String(formData.get('cardio_entry_id') ?? '');

		const workoutDate = resolveWorkoutDate(workoutDateStr);
		const dateError = validateWorkoutDate(workoutDate, locals.locale);
		if (dateError) {
			return fail(400, { error: dateError });
		}

		const entryId = parseCardioEntryId(entryIdStr);
		if (entryId === null) {
			return fail(400, { error: t('workout.invalidCardioEntry', locals.locale) });
		}

		const session = findSession(userId, exerciseId, workoutDate);
		if (!session) {
			return fail(400, { error: t('workout.invalidCardioEntry', locals.locale) });
		}

		const entry = findCardioEntry(session.id, entryId);
		if (!entry) {
			return fail(400, { error: t('workout.invalidCardioEntry', locals.locale) });
		}

		db.delete(cardioEntry).where(eq(cardioEntry.id, entry.id)).run();

		throw redirect(303, `/exercises/${exerciseId}?date=${workoutDate}`);
	}
};
