import type { SetSummary, CardioEntrySummary, PreviousSession } from '../../[id]/utils';

export type HistorySession = PreviousSession;

export function makeData(overrides: Record<string, unknown> = {}) {
	return {
		exercise: { id: 1, name: 'Bench Press', short_name: null, kind: 'strength' as const },
		today: '2026-08-20',
		selectedDate: '2026-08-20',
		isToday: true,
		selectedDateSets: [] as SetSummary[],
		selectedDateCardioEntries: [] as CardioEntrySummary[],
		selectedDateComment: null as string | null,
		previousSessions: [] as HistorySession[],
		lastSet: null as { weight_kg: number; repetitions: number } | null,
		locale: 'en' as const,
		theme: 'system' as const,
		user: { id: 1, username: 'test', locale: 'en' as const, theme: 'system' as const },
		logoLinkUrl: '',
		isAdmin: false,
		...overrides
	};
}

export function makeCardioData(overrides: Record<string, unknown> = {}) {
	return makeData({
		exercise: { id: 1, name: 'Running', short_name: null, kind: 'cardio' as const },
		...overrides
	});
}

export type PageDataInput = ReturnType<typeof makeData>;

export function historySession(overrides: Partial<HistorySession> = {}): HistorySession {
	return { workout_date: '2026-08-12', comment: null, ...overrides };
}
