export type SetSummary = { set_number: number; weight_kg: number; repetitions: number };
export type LastSet = { weight_kg: number; repetitions: number } | null;

export const MS_PER_DAY = 86400000;

/**
 * Whole days between a session date and the reference date, using the
 * `today` value provided by load (not the client clock) to stay stable
 * across SSR and hydration. Both dates are `YYYY-MM-DD` (UTC midnight).
 */
export function daysAgoFrom(sessionDate: string, today: string): number {
	const todayMs = new Date(today).getTime();
	const sessionMs = new Date(sessionDate).getTime();
	return Math.floor((todayMs - sessionMs) / MS_PER_DAY);
}

/** A session is old when it is strictly more than 7 days before `today`. */
export function isOldSession(sessionDate: string, today: string): boolean {
	return daysAgoFrom(sessionDate, today) > 7;
}

export function deriveLastSet(
	todaySets: SetSummary[],
	previousSessions: Array<{ workout_date: string; sets: SetSummary[] }>
): LastSet {
	if (todaySets.length > 0) {
		const last = todaySets[todaySets.length - 1];
		return { weight_kg: last.weight_kg, repetitions: last.repetitions };
	}

	if (previousSessions.length > 0 && previousSessions[0].sets.length > 0) {
		const sets = previousSessions[0].sets;
		const last = sets[sets.length - 1];
		return { weight_kg: last.weight_kg, repetitions: last.repetitions };
	}

	return null;
}
