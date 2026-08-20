import { t, type Locale } from '$lib/i18n';

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

export function validateWeight(weightStr: string): string | null {
	const weightKg = Number(weightStr);
	if (!weightStr || isNaN(weightKg) || !isFinite(weightKg) || weightKg <= 0) {
		return 'Weight must be a positive number';
	}
	return null;
}

export function validateReps(repsStr: string): string | null {
	const repsNum = Number(repsStr);
	if (!repsStr || isNaN(repsNum) || !Number.isInteger(repsNum) || repsNum <= 0) {
		return 'Reps must be a positive whole number';
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
