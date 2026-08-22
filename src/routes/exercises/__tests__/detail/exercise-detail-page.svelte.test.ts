import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
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

// `today` is fixed to '2026-08-20' in makeData, so:
//   '2026-08-12' -> 8 days ago  -> old (collapsed by default)
//   '2026-08-13' -> 7 days ago  -> recent (expanded by default, boundary)
//   '2026-08-15' -> 5 days ago  -> recent (expanded by default)
describe('Collapsible history for sessions older than 7 days', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	function historySession(overrides: Record<string, unknown> = {}) {
		return { workout_date: '2026-08-12', comment: null, sets: [], ...overrides };
	}

	it('renders an old session date heading as a collapsed, keyboard-accessible button and hides sets and comment', () => {
		setup(
			makeData({
				previousSessions: [
					historySession({
						comment: 'felt heavy',
						sets: [{ set_number: 1, weight_kg: 130, repetitions: 5 }]
					})
				]
			})
		);

		const button = screen.getByRole('button', { name: '2026-08-12' });
		expect(button.tagName).toBe('BUTTON');
		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByText('130 kg × 5')).not.toBeInTheDocument();
		expect(screen.queryByText('felt heavy')).not.toBeInTheDocument();
	});

	it('expands an old session when its date heading is clicked, showing sets and comment and setting aria-expanded true', async () => {
		setup(
			makeData({
				previousSessions: [
					historySession({
						comment: 'felt heavy',
						sets: [{ set_number: 1, weight_kg: 130, repetitions: 5 }]
					})
				]
			})
		);

		const button = screen.getByRole('button', { name: '2026-08-12' });
		await fireEvent.click(button);

		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByText('130 kg × 5')).toBeInTheDocument();
		expect(screen.getByText('felt heavy')).toBeInTheDocument();
	});

	it('renders a recent session (<=7 days) expanded by default with sets and comment', () => {
		setup(
			makeData({
				previousSessions: [
					historySession({
						workout_date: '2026-08-15',
						comment: 'felt strong',
						sets: [{ set_number: 1, weight_kg: 100, repetitions: 8 }]
					})
				]
			})
		);

		const button = screen.getByRole('button', { name: '2026-08-15' });
		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByText('100 kg × 8')).toBeInTheDocument();
		expect(screen.getByText('felt strong')).toBeInTheDocument();
	});

	it('keeps a session exactly 7 days old expanded by default', () => {
		setup(
			makeData({
				previousSessions: [
					historySession({
						workout_date: '2026-08-13',
						sets: [{ set_number: 1, weight_kg: 90, repetitions: 10 }]
					})
				]
			})
		);

		const button = screen.getByRole('button', { name: '2026-08-13' });
		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByText('90 kg × 10')).toBeInTheDocument();
	});

	it('does not render the history section when there are no previous sessions', () => {
		setup(makeData());
		expect(screen.queryByText('Previous Workouts')).not.toBeInTheDocument();
	});

	it('renders a date heading but no sets list for a session with no sets', () => {
		setup(
			makeData({
				previousSessions: [
					historySession({ workout_date: '2026-08-15', comment: 'no sets logged' })
				]
			})
		);

		const button = screen.getByRole('button', { name: '2026-08-15' });
		expect(button).toHaveAttribute('aria-expanded', 'true');
		// The (present) comment is shown, but there is no sets list.
		expect(screen.getByText('no sets logged')).toBeInTheDocument();
		expect(screen.queryByText(/Set \d+/)).not.toBeInTheDocument();
		expect(screen.queryByText(/kg ×/)).not.toBeInTheDocument();
	});

	it('toggles expansion on each click of the date heading', async () => {
		setup(
			makeData({
				previousSessions: [
					historySession({ sets: [{ set_number: 1, weight_kg: 130, repetitions: 5 }] })
				]
			})
		);

		const button = screen.getByRole('button', { name: '2026-08-12' });
		expect(button).toHaveAttribute('aria-expanded', 'false');

		await fireEvent.click(button);
		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByText('130 kg × 5')).toBeInTheDocument();

		await fireEvent.click(button);
		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByText('130 kg × 5')).not.toBeInTheDocument();
	});
});
