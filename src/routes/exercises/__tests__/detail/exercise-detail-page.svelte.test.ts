import { describe, it, expect, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import ExerciseDetailPage from '../../[id]/+page.svelte';

function makeData(overrides: Record<string, unknown> = {}) {
	return {
		exercise: { id: 1, name: 'Bench Press', short_name: null },
		today: '2026-08-20',
		selectedDate: '2026-08-20',
		isToday: true,
		selectedDateSets: [] as Array<{ set_number: number; weight_kg: number; repetitions: number }>,
		selectedDateComment: null as string | null,
		previousSessions: [] as Array<{
			workout_date: string;
			comment: string | null;
			sets: Array<{ set_number: number; weight_kg: number; repetitions: number }>;
		}>,
		lastSet: null as { weight_kg: number; repetitions: number } | null,
		locale: 'en' as const,
		theme: 'system' as const,
		user: { id: 1, username: 'test', locale: 'en' as const, theme: 'system' as const },
		logoLinkUrl: '',
		isAdmin: false,
		...overrides
	};
}

type PageDataInput = ReturnType<typeof makeData>;

function setup(data: PageDataInput) {
	const result = render(ExerciseDetailPage, { props: { data, form: null } });
	return {
		rerender: (nextData: PageDataInput) => result.rerender({ data: nextData, form: null }),
		unmount: result.unmount,
		weightInput: () =>
			result.container.querySelector('input[name="weight_kg"]') as HTMLInputElement,
		repsInput: () =>
			result.container.querySelector('input[name="repetitions"]') as HTMLInputElement,
		commentTextarea: () =>
			result.container.querySelector('textarea[name="comment"]') as HTMLTextAreaElement
	};
}

describe('Exercise Detail Page client-side date navigation', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('re-syncs weight and reps from the selected date when data changes', async () => {
		const view = setup(
			makeData({
				selectedDate: '2026-08-20',
				selectedDateSets: [{ set_number: 1, weight_kg: 80, repetitions: 10 }],
				lastSet: { weight_kg: 80, repetitions: 10 }
			})
		);

		expect(view.weightInput().value).toBe('80');
		expect(view.repsInput().value).toBe('10');

		// Simulates a client-side goto() to a previous date: the component
		// instance is reused and data is updated in place.
		await view.rerender(
			makeData({
				selectedDate: '2026-08-19',
				isToday: false,
				selectedDateSets: [{ set_number: 1, weight_kg: 90, repetitions: 8 }],
				lastSet: { weight_kg: 90, repetitions: 8 }
			})
		);

		expect(view.weightInput().value).toBe('90');
		expect(view.repsInput().value).toBe('8');
	});

	it('re-syncs the comment field when data changes', async () => {
		const view = setup(
			makeData({
				selectedDate: '2026-08-20',
				selectedDateSets: [{ set_number: 1, weight_kg: 80, repetitions: 10 }],
				selectedDateComment: 'felt strong today',
				lastSet: { weight_kg: 80, repetitions: 10 }
			})
		);

		expect(view.commentTextarea().value).toBe('felt strong today');

		await view.rerender(
			makeData({
				selectedDate: '2026-08-19',
				isToday: false,
				selectedDateSets: [{ set_number: 1, weight_kg: 90, repetitions: 8 }],
				selectedDateComment: 'backfilled from yesterday',
				lastSet: { weight_kg: 90, repetitions: 8 }
			})
		);

		expect(view.commentTextarea().value).toBe('backfilled from yesterday');
	});

	it('clears the form fields when the selected date has no previous set or comment', async () => {
		const view = setup(
			makeData({
				selectedDate: '2026-08-20',
				selectedDateSets: [{ set_number: 1, weight_kg: 80, repetitions: 10 }],
				selectedDateComment: 'old comment',
				lastSet: { weight_kg: 80, repetitions: 10 }
			})
		);

		expect(view.weightInput().value).toBe('80');
		expect(view.commentTextarea().value).toBe('old comment');

		await view.rerender(
			makeData({
				selectedDate: '2026-08-19',
				isToday: false,
				selectedDateSets: [{ set_number: 1, weight_kg: 70, repetitions: 12 }],
				selectedDateComment: null,
				lastSet: null
			})
		);

		expect(view.weightInput().value).toBe('');
		expect(view.repsInput().value).toBe('');
		expect(view.commentTextarea().value).toBe('');
	});
});
