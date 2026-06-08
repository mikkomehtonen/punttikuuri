/**
 * Validates a weight string for workout set entry.
 * Accepts positive numbers (including decimals). Returns an error message or null.
 */
export function validateWeight(weightStr: string): string | null {
	const weightKg = Number(weightStr);
	if (!weightStr || isNaN(weightKg) || weightKg <= 0) {
		return 'Weight must be a positive number';
	}
	return null;
}

/**
 * Validates a repetitions string for workout set entry.
 * Accepts positive integers only. Returns an error message or null.
 */
export function validateReps(repsStr: string): string | null {
	const repsNum = Number(repsStr);
	if (!repsStr || isNaN(repsNum) || repsNum <= 0 || !Number.isInteger(repsNum)) {
		return 'Reps must be a positive whole number';
	}
	return null;
}
