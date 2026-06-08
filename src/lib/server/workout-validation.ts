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
	if (!name || name.length > 100) {
		return 'Exercise name is required (max 100 characters)';
	}
	return null;
}
