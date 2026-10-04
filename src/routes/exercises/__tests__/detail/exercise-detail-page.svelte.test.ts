import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ExerciseDetailPage from '../../[id]/+page.svelte';
import { makeData, historySession, type PageDataInput } from './fixtures';

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

	it('renders an old session date heading as a collapsed, keyboard-accessible button and hides sets and comment', () => {
		setup(
			makeData({
				previousSessions: [
					historySession({
						workout_date: '2026-08-18',
						sets: [{ set_number: 1, weight_kg: 150, repetitions: 3 }]
					}),
					historySession({
						workout_date: '2026-08-12',
						comment: 'felt heavy',
						sets: [{ set_number: 1, weight_kg: 130, repetitions: 5 }]
					})
				]
			})
		);

		const button = screen.getByRole('button', { name: '2026-08-12' });
		expect(button.tagName).toBe('BUTTON');
		// Older, non-latest session stays collapsed by default.
		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByText('130 kg × 5')).not.toBeInTheDocument();
		expect(screen.queryByText('felt heavy')).not.toBeInTheDocument();
	});

	it('expands an old session when its date heading is clicked, showing sets and comment and setting aria-expanded true', async () => {
		setup(
			makeData({
				previousSessions: [
					historySession({
						workout_date: '2026-08-18',
						sets: [{ set_number: 1, weight_kg: 150, repetitions: 3 }]
					}),
					historySession({
						workout_date: '2026-08-12',
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
					historySession({
						workout_date: '2026-08-18',
						sets: [{ set_number: 1, weight_kg: 150, repetitions: 3 }]
					}),
					historySession({
						workout_date: '2026-08-12',
						sets: [{ set_number: 1, weight_kg: 130, repetitions: 5 }]
					})
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

describe('Expand the latest history session by default (even when old)', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('expands an old (>7 day) latest session by default and renders its comment and set', () => {
		setup(
			makeData({
				previousSessions: [
					historySession({
						workout_date: '2026-08-10',
						comment: 'heavy day',
						sets: [{ set_number: 1, weight_kg: 140, repetitions: 4 }]
					})
				]
			})
		);

		const button = screen.getByRole('button', { name: '2026-08-10' });
		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByText('heavy day')).toBeInTheDocument();
		expect(screen.getByText('140 kg × 4')).toBeInTheDocument();
	});

	it('expands the newest-of-two old sessions but keeps the older one collapsed', () => {
		setup(
			makeData({
				previousSessions: [
					historySession({
						workout_date: '2026-08-10',
						sets: [{ set_number: 1, weight_kg: 140, repetitions: 4 }]
					}),
					historySession({
						workout_date: '2026-07-31',
						sets: [{ set_number: 1, weight_kg: 120, repetitions: 6 }]
					})
				]
			})
		);

		const latest = screen.getByRole('button', { name: '2026-08-10' });
		const older = screen.getByRole('button', { name: '2026-07-31' });

		expect(latest).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByText('140 kg × 4')).toBeInTheDocument();

		expect(older).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByText('120 kg × 6')).not.toBeInTheDocument();
	});

	it('stays user-collapsible: toggling the latest old session hides its set, toggling again reveals it', async () => {
		setup(
			makeData({
				previousSessions: [
					historySession({
						workout_date: '2026-08-10',
						sets: [{ set_number: 1, weight_kg: 140, repetitions: 4 }]
					})
				]
			})
		);

		const button = screen.getByRole('button', { name: '2026-08-10' });
		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByText('140 kg × 4')).toBeInTheDocument();

		await fireEvent.click(button);
		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByText('140 kg × 4')).not.toBeInTheDocument();

		await fireEvent.click(button);
		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByText('140 kg × 4')).toBeInTheDocument();
	});

	it('keeps the newest recent session expanded while collapsing an older one', () => {
		setup(
			makeData({
				previousSessions: [
					historySession({
						workout_date: '2026-08-15',
						sets: [{ set_number: 1, weight_kg: 110, repetitions: 5 }]
					}),
					historySession({
						workout_date: '2026-07-31',
						sets: [{ set_number: 1, weight_kg: 120, repetitions: 6 }]
					})
				]
			})
		);

		const latest = screen.getByRole('button', { name: '2026-08-15' });
		const older = screen.getByRole('button', { name: '2026-07-31' });

		expect(latest).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByText('110 kg × 5')).toBeInTheDocument();

		expect(older).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByText('120 kg × 6')).not.toBeInTheDocument();
	});
});
