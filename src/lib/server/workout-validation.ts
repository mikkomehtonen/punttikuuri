import { t, type Locale } from '$lib/i18n';
import { KIND_VALUES, type ExerciseKind } from '$lib/server/db/schema';

export function validateWorkoutDate(dateStr: string, locale: Locale = 'en'): string | null {
	const error = t('workout.dateError', locale);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		return error;
	}
	const [year, month, day] = dateStr.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return error;
	}
	const today = new Date().toISOString().slice(0, 10);
	if (dateStr > today) {
		return error;
	}
	return null;
}

// Plain decimal input only: rejects hex (`0x10`), exponent (`1e2`), and
// whitespace-padded forms that `Number()` would silently accept. Leading-dot
// forms like `.5` are accepted.
const DECIMAL_RE = /^(\d+(\.\d+)?|\.\d+)$/;

const WEIGHT_ERROR = 'Weight must be a positive number';

export function validateWeight(weightStr: string): string | null {
	if (!DECIMAL_RE.test(weightStr)) {
		return WEIGHT_ERROR;
	}
	const weightKg = Number(weightStr);
	if (!isFinite(weightKg) || weightKg <= 0) {
		return WEIGHT_ERROR;
	}
	return null;
}

const REPS_RE = /^\d+$/;

const REPS_ERROR = 'Reps must be a positive whole number';

export function validateReps(repsStr: string): string | null {
	if (!REPS_RE.test(repsStr)) {
		return REPS_ERROR;
	}
	const repsNum = Number(repsStr);
	if (!Number.isInteger(repsNum) || repsNum <= 0) {
		return REPS_ERROR;
	}
	return null;
}

export function validateExerciseName(name: string): string | null {
	const trimmed = name.trim();
	if (!trimmed || trimmed.length > 100) {
		return 'Exercise name is required (max 100 characters)';
	}
	return null;
}

export function validateShortName(shortName: string | null): string | null {
	if (shortName !== null) {
		const trimmed = shortName.trim();
		if (trimmed.length > 30) {
			return 'Short name must be at most 30 characters';
		}
	}
	return null;
}

export function validateComment(comment: string): string | null {
	const trimmed = comment.trim();
	if (trimmed.length > 500) {
		return 'Comment must be at most 500 characters';
	}
	return null;
}

type KindResult = { error: string; kind: null } | { error: null; kind: ExerciseKind };

export function validateExerciseKind(kind: string, locale: Locale = 'en'): KindResult {
	if (kind === '') {
		return { error: null, kind: 'strength' };
	}
	if ((KIND_VALUES as readonly string[]).includes(kind)) {
		return { error: null, kind: kind as ExerciseKind };
	}
	return { error: t('errors.invalid', locale), kind: null };
}

const MAX_DURATION_SECONDS = 86400;

type DurationResult = { error: string; totalSeconds: null } | { error: null; totalSeconds: number };

export function validateDuration(
	hoursStr: string,
	minutesStr: string,
	secondsStr: string,
	locale: Locale = 'en'
): DurationResult {
	const error = t('workout.durationError', locale);
	const factors = [3600, 60, 1];
	const fields = [hoursStr, minutesStr, secondsStr];
	let total = 0;

	for (let i = 0; i < fields.length; i++) {
		const field = fields[i];
		if (field === '') continue;
		if (!/^\d+$/.test(field)) {
			return { error, totalSeconds: null };
		}
		total += Number(field) * factors[i];
	}

	if (total <= 0 || total > MAX_DURATION_SECONDS) {
		return { error, totalSeconds: null };
	}
	return { error: null, totalSeconds: total };
}

const MAX_DISTANCE_KM = 1000;

type DistanceResult =
	| { error: string; distanceM: null }
	| { error: null; distanceM: number | null };

export function validateDistanceM(distanceStr: string, locale: Locale = 'en'): DistanceResult {
	const error = t('workout.distanceError', locale);
	if (distanceStr === '') {
		return { error: null, distanceM: null };
	}
	if (!DECIMAL_RE.test(distanceStr)) {
		return { error, distanceM: null };
	}
	const km = Number(distanceStr);
	if (!isFinite(km) || km <= 0 || km > MAX_DISTANCE_KM) {
		return { error, distanceM: null };
	}
	const meters = Math.round(km * 1000);
	if (meters < 1) {
		return { error, distanceM: null };
	}
	return { error: null, distanceM: meters };
}

type DescriptionResult =
	| { error: string; description: null }
	| { error: null; description: string | null };

export function validateCardioDescription(
	description: string,
	locale: Locale = 'en'
): DescriptionResult {
	const trimmed = description.trim();
	if (trimmed.length > 500) {
		return { error: t('workout.descriptionError', locale), description: null };
	}
	return { error: null, description: trimmed === '' ? null : trimmed };
}
