import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import ExerciseDetailPage from '../../[id]/+page.svelte';
import { makeCardioData, type PageDataInput } from './fixtures';

function setup(data: PageDataInput) {
	const result = render(ExerciseDetailPage, { props: { data, form: null } });
	return {
		container: result.container,
		unmount: result.unmount
	};
}

const entries = [
	{ id: 10, duration_seconds: 3930, distance_m: 5050, description: 'Morning run' },
	{ id: 11, duration_seconds: 1800, distance_m: null, description: null }
];

describe('Cardio detail page log form', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('renders the cardio log form for a cardio exercise', () => {
		const view = setup(makeCardioData());

		expect(view.container.querySelector('form[action="?/logCardio"]')).not.toBeNull();
		expect(view.container.querySelector('input[name="hours"]')).not.toBeNull();
		expect(view.container.querySelector('input[name="minutes"]')).not.toBeNull();
		expect(view.container.querySelector('input[name="seconds"]')).not.toBeNull();
		expect(view.container.querySelector('input[name="distance_km"]')).not.toBeNull();
		expect(view.container.querySelector('textarea[name="description"]')).not.toBeNull();
		expect(
			view.container.querySelector('input[name="workout_date"][value="2026-08-20"]')
		).not.toBeNull();
		expect(screen.getByRole('button', { name: 'Log Cardio' })).toBeInTheDocument();
	});

	it('does not render strength set inputs for a cardio exercise', () => {
		const view = setup(makeCardioData());

		expect(view.container.querySelector('input[name="weight_kg"]')).toBeNull();
		expect(view.container.querySelector('input[name="repetitions"]')).toBeNull();
		expect(view.container.querySelector('form[action="?/logSet"]')).toBeNull();
	});

	it('renders the strength set form and no cardio inputs for a strength exercise', () => {
		const view = setup(
			makeCardioData({
				exercise: {
					id: 2,
					name: 'Bench Press',
					short_name: null,
					kind: 'strength' as const,
					icon: null
				}
			})
		);

		expect(view.container.querySelector('form[action="?/logSet"]')).not.toBeNull();
		expect(view.container.querySelector('input[name="weight_kg"]')).not.toBeNull();
		expect(view.container.querySelector('form[action="?/logCardio"]')).toBeNull();
		expect(view.container.querySelector('input[name="hours"]')).toBeNull();
	});

	it('clears the cardio log fields when data changes (post-submit reset)', async () => {
		const view = render(ExerciseDetailPage, { props: { data: makeCardioData(), form: null } });
		const hours = view.container.querySelector('input[name="hours"]') as HTMLInputElement;
		const distance = view.container.querySelector('input[name="distance_km"]') as HTMLInputElement;

		await fireEvent.input(hours, { target: { value: '1' } });
		await fireEvent.input(distance, { target: { value: '5.5' } });
		expect(hours.value).toBe('1');
		expect(distance.value).toBe('5.5');

		// Simulates the load re-run after a successful logCardio: the submitted
		// values must not linger, or a second click would log a duplicate entry.
		view.rerender({ data: makeCardioData({ selectedDateCardioEntries: entries }), form: null });
		await tick();

		expect(hours.value).toBe('');
		expect(distance.value).toBe('');
		view.unmount();
	});

	it('keeps the cardio log fields when a failed action re-renders the page', async () => {
		const view = render(ExerciseDetailPage, { props: { data: makeCardioData(), form: null } });
		const hours = view.container.querySelector('input[name="hours"]') as HTMLInputElement;
		const distance = view.container.querySelector('input[name="distance_km"]') as HTMLInputElement;

		await fireEvent.input(hours, { target: { value: '1' } });
		await fireEvent.input(distance, { target: { value: '5.5' } });

		// Simulates the load re-run after a failed logCardio: the error alert is
		// shown above the form, so the just-typed values must survive.
		view.rerender({
			data: makeCardioData(),
			form: { error: 'Duration must be between 0 and 24 hours' }
		});
		await tick();

		expect(hours.value).toBe('1');
		expect(distance.value).toBe('5.5');
		view.unmount();
	});
});

describe('Cardio detail page selected-date entries', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('renders formatted duration, distance and description for each cardio entry', () => {
		setup(makeCardioData({ selectedDateCardioEntries: entries }));

		expect(screen.getByText('1:05:30')).toBeInTheDocument();
		expect(screen.getByText('5.05 km')).toBeInTheDocument();
		expect(screen.getByText('Morning run')).toBeInTheDocument();
		expect(screen.getByText('0:30:00')).toBeInTheDocument();
	});

	it('renders no distance text for an entry with null distance', () => {
		setup(makeCardioData({ selectedDateCardioEntries: [entries[1]] }));

		expect(screen.getByText('0:30:00')).toBeInTheDocument();
		expect(screen.queryByText(/\d+(\.\d+)? km/)).not.toBeInTheDocument();
	});

	it('shows the comment form when the cardio session has entries', () => {
		const view = setup(makeCardioData({ selectedDateCardioEntries: entries }));

		expect(view.container.querySelector('form[action="?/saveComment"]')).not.toBeNull();
	});

	it('hides the comment form when the cardio session has no entries', () => {
		const view = setup(makeCardioData());

		expect(view.container.querySelector('form[action="?/saveComment"]')).toBeNull();
	});
});

describe('Cardio entry delete dialog', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('opens a confirmation dialog that posts to ?/deleteCardio with the entry id', async () => {
		const view = setup(makeCardioData({ selectedDateCardioEntries: entries }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

		expect(screen.getByText('Delete cardio entry?')).toBeInTheDocument();
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		const form = view.container.querySelector('form[action="?/deleteCardio"]');
		expect(form).not.toBeNull();

		const dateInput = form!.querySelector('input[name="workout_date"]') as HTMLInputElement;
		const entryInput = form!.querySelector('input[name="cardio_entry_id"]') as HTMLInputElement;
		expect(dateInput.value).toBe('2026-08-20');
		expect(entryInput.value).toBe('10');
	});

	it('closes the delete dialog on Escape without leaving it open', async () => {
		setup(makeCardioData({ selectedDateCardioEntries: entries }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
		expect(screen.getByText('Delete cardio entry?')).toBeInTheDocument();

		await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
		expect(screen.queryByText('Delete cardio entry?')).not.toBeInTheDocument();
	});
});

describe('Cardio entry edit dialog', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('opens an edit dialog prefilled with the entry values posting to ?/editCardio', async () => {
		const view = setup(makeCardioData({ selectedDateCardioEntries: entries }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

		expect(screen.getByRole('dialog')).toBeInTheDocument();

		const form = view.container.querySelector('form[action="?/editCardio"]');
		expect(form).not.toBeNull();

		const value = (name: string) =>
			(form!.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement).value;

		expect(value('cardio_entry_id')).toBe('10');
		expect(value('workout_date')).toBe('2026-08-20');
		expect(value('hours')).toBe('1');
		expect(value('minutes')).toBe('5');
		expect(value('seconds')).toBe('30');
		expect(value('distance_km')).toBe('5.05');
		expect(value('description')).toBe('Morning run');
	});

	it('prefills an empty distance for an entry with null distance', async () => {
		const view = setup(makeCardioData({ selectedDateCardioEntries: [entries[1]] }));

		await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

		const form = view.container.querySelector('form[action="?/editCardio"]');
		expect(form).not.toBeNull();

		const entryInput = form!.querySelector('input[name="cardio_entry_id"]') as HTMLInputElement;
		const distanceInput = form!.querySelector('input[name="distance_km"]') as HTMLInputElement;
		expect(entryInput.value).toBe('11');
		expect(distanceInput.value).toBe('');
	});
});

describe('Cardio history rendering', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('renders cardio entries in an expanded history session', () => {
		setup(
			makeCardioData({
				previousSessions: [
					{
						workout_date: '2026-08-15',
						comment: 'Easy pace',
						sets: [],
						entries: [{ id: 20, duration_seconds: 2700, distance_m: 10000, description: null }]
					}
				]
			})
		);

		expect(screen.getByRole('button', { name: '2026-08-15' })).toHaveAttribute(
			'aria-expanded',
			'true'
		);
		expect(screen.getByText('0:45:00')).toBeInTheDocument();
		expect(screen.getByText('10 km')).toBeInTheDocument();
		expect(screen.getByText('Easy pace')).toBeInTheDocument();
	});

	it('shows no edit or delete buttons in the cardio history section', () => {
		setup(
			makeCardioData({
				previousSessions: [
					{
						workout_date: '2026-08-15',
						comment: null,
						sets: [],
						entries: [{ id: 20, duration_seconds: 2700, distance_m: 10000, description: null }]
					}
				]
			})
		);

		expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
	});
});
