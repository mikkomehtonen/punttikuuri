export type SetSummary = { set_number: number; weight_kg: number; repetitions: number };
export type LastSet = { weight_kg: number; repetitions: number } | null;
export type CardioEntrySummary = {
	id: number;
	duration_seconds: number;
	distance_m: number | null;
	description: string | null;
};

/**
 * A previous workout session in the history list. Strength sessions carry
 * `sets`; cardio sessions carry `entries` — the other array is omitted.
 */
export type PreviousSession = {
	workout_date: string;
	comment: string | null;
	sets?: SetSummary[];
	entries?: CardioEntrySummary[];
};

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
	previousSessions: Array<{ workout_date: string; sets?: SetSummary[] }>
): LastSet {
	if (todaySets.length > 0) {
		const last = todaySets[todaySets.length - 1];
		return { weight_kg: last.weight_kg, repetitions: last.repetitions };
	}

	const latestSets = previousSessions[0]?.sets ?? [];
	if (latestSets.length > 0) {
		const last = latestSets[latestSets.length - 1];
		return { weight_kg: last.weight_kg, repetitions: last.repetitions };
	}

	return null;
}

function pad2(value: number): string {
	return String(value).padStart(2, '0');
}

/** Formats a duration as `h:mm:ss` (e.g. 3930 → `1:05:30`, 45 → `0:00:45`). */
export function formatDuration(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
}

/** Formats whole meters as km using JS shortest round-trip rendering (42195 → `42.195 km`). */
export function formatDistanceKm(distanceM: number): string {
	return `${distanceM / 1000} km`;
}
