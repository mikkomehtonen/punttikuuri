export type SetSummary = { set_number: number; weight_kg: number; repetitions: number };
export type LastSet = { weight_kg: number; repetitions: number } | null;

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
