import { describe, it, expect, afterEach, vi } from 'vitest';
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
		unmount: result.unmount,
		deleteButtons: () => screen.getAllByRole('button', { name: 'Delete' }),
		deleteForm: () =>
			result.container.querySelector('form[action="?/deleteSet"]') as HTMLFormElement
	};
}

const sets = [
	{ set_number: 1, weight_kg: 60, repetitions: 10 },
	{ set_number: 2, weight_kg: 80, repetitions: 8 }
];

describe('Exercise Detail Page set deletion UI', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('renders a ghost-styled delete button for each set of the selected date', () => {
		setup(makeData({ selectedDateSets: sets }));

		const buttons = screen.getAllByRole('button', { name: 'Delete' });
		expect(buttons).toHaveLength(2);
		for (const button of buttons) {
			expect(button).toHaveAttribute('type', 'button');
			expect(button.className).toContain('text-stone-600');
		}
	});

	it('renders no delete buttons when the selected date has no sets', () => {
		setup(
			makeData({
				previousSessions: [
					{
						workout_date: '2026-08-19',
						comment: null,
						sets: [{ set_number: 1, weight_kg: 50, repetitions: 12 }]
					}
				]
			})
		);

		expect(screen.queryAllByRole('button', { name: 'Delete' })).toHaveLength(0);
	});

	it('opens a confirmation modal with the localized prompt when a delete button is clicked', async () => {
		const view = setup(makeData({ selectedDateSets: sets }));

		expect(screen.queryByText('Delete set?')).not.toBeInTheDocument();

		await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]);

		expect(screen.getByText('Delete set?')).toBeInTheDocument();
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		expect(view.deleteForm()).not.toBeNull();
	});

	it('submits the deleteSet form with the selected workout_date and set_number', async () => {
		const view = setup(makeData({ selectedDateSets: sets }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]);

		const form = view.deleteForm();
		expect(form).not.toBeNull();

		const dateInput = form.querySelector('input[name="workout_date"]') as HTMLInputElement;
		const setNumberInput = form.querySelector('input[name="set_number"]') as HTMLInputElement;
		expect(dateInput).not.toBeNull();
		expect(setNumberInput).not.toBeNull();
		expect(dateInput.value).toBe('2026-08-20');
		expect(setNumberInput.value).toBe('2');

		const confirmButton = screen.getByRole('button', { name: 'Confirm' });
		expect(confirmButton).toHaveAttribute('type', 'submit');
		expect(form.contains(confirmButton)).toBe(true);

		let submitEventFired = false;
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			submitEventFired = true;
		});

		await fireEvent.click(confirmButton);
		expect(submitEventFired).toBe(true);
	});

	it('moves focus into the dialog and closes the modal on Escape', async () => {
		setup(makeData({ selectedDateSets: sets }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

		const dialog = screen.getByRole('dialog');
		await vi.waitFor(() => expect(dialog).toHaveFocus());

		await fireEvent.keyDown(dialog, { key: 'Escape' });
		expect(screen.queryByText('Delete set?')).not.toBeInTheDocument();
	});

	it('closes the modal without submitting when cancel is clicked', async () => {
		const view = setup(makeData({ selectedDateSets: sets }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
		expect(screen.getByText('Delete set?')).toBeInTheDocument();

		const form = view.deleteForm();
		let submitEventFired = false;
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			submitEventFired = true;
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(screen.queryByText('Delete set?')).not.toBeInTheDocument();
		expect(submitEventFired).toBe(false);
		expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
	});

	it('shows no delete buttons in the history section', () => {
		setup(
			makeData({
				selectedDateSets: [sets[0]],
				previousSessions: [
					{
						workout_date: '2026-08-19',
						comment: null,
						sets: [
							{ set_number: 1, weight_kg: 50, repetitions: 12 },
							{ set_number: 2, weight_kg: 55, repetitions: 10 }
						]
					}
				]
			})
		);

		expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1);
	});

	it('shows the Finnish confirmation prompt when the locale is Finnish', async () => {
		setup(makeData({ locale: 'fi', selectedDateSets: sets }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'Poista' })[0]);

		expect(screen.getByText('Poistetaanko sarja?')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Peruuta' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Vahvista' })).toBeInTheDocument();
	});
});
