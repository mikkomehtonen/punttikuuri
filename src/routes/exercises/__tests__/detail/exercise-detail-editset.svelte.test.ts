import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ExerciseDetailPage from '../../[id]/+page.svelte';
import { makeData, type PageDataInput } from './fixtures';

function setup(data: PageDataInput) {
	const result = render(ExerciseDetailPage, { props: { data, form: null } });
	return {
		unmount: result.unmount,
		editButtons: () => screen.getAllByRole('button', { name: 'Edit' }),
		deleteButtons: () => screen.getAllByRole('button', { name: 'Delete' }),
		editForm: () => result.container.querySelector('form[action="?/editSet"]') as HTMLFormElement
	};
}

const sets = [
	{ set_number: 1, weight_kg: 60, repetitions: 10 },
	{ set_number: 2, weight_kg: 80, repetitions: 8 }
];

describe('Exercise Detail Page set editing UI', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('renders a ghost-styled edit and delete icon button for each set of the selected date', () => {
		setup(makeData({ selectedDateSets: sets }));

		const editButtons = screen.getAllByRole('button', { name: 'Edit' });
		expect(editButtons).toHaveLength(2);
		for (const button of editButtons) {
			expect(button).toHaveAttribute('type', 'button');
			expect(button.className).toContain('text-stone-600');
			expect(button.querySelector('svg')).not.toBeNull();
		}

		const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
		expect(deleteButtons).toHaveLength(2);
		for (const button of deleteButtons) {
			expect(button).toHaveAttribute('type', 'button');
			expect(button.className).toContain('text-stone-600');
			expect(button.querySelector('svg')).not.toBeNull();
		}
	});

	it('renders no edit or delete buttons when the selected date has no sets', () => {
		setup(
			makeData({
				previousSessions: [
					{
						workout_date: '2026-08-19',
						comment: null,
						sets: [{ set_number: 1, weight_kg: 50, repetitions: 12 }],
						entries: []
					}
				]
			})
		);

		expect(screen.queryAllByRole('button', { name: 'Edit' })).toHaveLength(0);
		expect(screen.queryAllByRole('button', { name: 'Delete' })).toHaveLength(0);
	});

	it('opens an edit modal with pre-filled weight and reps inputs and Save and Cancel buttons', async () => {
		const view = setup(makeData({ selectedDateSets: sets }));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		await fireEvent.click(view.editButtons()[1]);

		expect(screen.getByRole('dialog')).toBeInTheDocument();

		const form = view.editForm();
		expect(form).not.toBeNull();

		const weightInput = form.querySelector('input[name="weight_kg"]') as HTMLInputElement;
		const repsInput = form.querySelector('input[name="repetitions"]') as HTMLInputElement;
		expect(weightInput).not.toBeNull();
		expect(repsInput).not.toBeNull();
		expect(weightInput.value).toBe('80');
		expect(repsInput.value).toBe('8');

		expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
	});

	it('submits the editSet form with the selected workout_date, set_number, weight, and reps', async () => {
		const view = setup(makeData({ selectedDateSets: sets }));

		await fireEvent.click(view.editButtons()[0]);

		const form = view.editForm();
		expect(form).not.toBeNull();

		const dateInput = form.querySelector('input[name="workout_date"]') as HTMLInputElement;
		const setNumberInput = form.querySelector('input[name="set_number"]') as HTMLInputElement;
		const weightInput = form.querySelector('input[name="weight_kg"]') as HTMLInputElement;
		const repsInput = form.querySelector('input[name="repetitions"]') as HTMLInputElement;
		expect(dateInput).not.toBeNull();
		expect(setNumberInput).not.toBeNull();
		expect(weightInput).not.toBeNull();
		expect(repsInput).not.toBeNull();
		expect(dateInput.value).toBe('2026-08-20');
		expect(setNumberInput.value).toBe('1');
		expect(weightInput.value).toBe('60');
		expect(repsInput.value).toBe('10');

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

	it('closes the modal without submitting when cancel is clicked', async () => {
		const view = setup(makeData({ selectedDateSets: sets }));

		await fireEvent.click(view.editButtons()[0]);
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		const form = view.editForm();
		let submitEventFired = false;
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			submitEventFired = true;
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(submitEventFired).toBe(false);
		expect(view.editButtons()).toHaveLength(2);
	});

	it('moves focus into the dialog and closes the modal on Escape', async () => {
		setup(makeData({ selectedDateSets: sets }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

		const dialog = screen.getByRole('dialog');
		await vi.waitFor(() => expect(dialog).toHaveFocus());

		await fireEvent.keyDown(dialog, { key: 'Escape' });
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('opens the delete confirmation modal when the delete button is clicked', async () => {
		const view = setup(makeData({ selectedDateSets: sets }));

		await fireEvent.click(view.deleteButtons()[0]);

		expect(screen.getByText('Delete set?')).toBeInTheDocument();
		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('shows no edit or delete buttons in the history section', () => {
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
						],
						entries: []
					}
				]
			})
		);

		expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1);
		expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1);
	});

	it('shows the Finnish edit button label and modal actions when the locale is Finnish', async () => {
		setup(makeData({ locale: 'fi', selectedDateSets: sets }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'Muokkaa' })[0]);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Peruuta' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Vahvista' })).toBeInTheDocument();
	});
});
