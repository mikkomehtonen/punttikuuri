import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import NewExercisePage from '../+page.svelte';
import { EXERCISE_ICONS } from '$lib/icons/exercise-icons';

function makeData() {
	return {
		locale: 'en' as const,
		theme: 'system' as const,
		user: { id: 1, username: 'test', locale: 'en' as const, theme: 'system' as const },
		logoLinkUrl: '',
		isAdmin: false
	};
}

function iconRadios(container: HTMLElement): HTMLInputElement[] {
	return [
		...container.querySelectorAll<HTMLInputElement>('input[type="radio"][name="icon"]')
	].filter((r) => r.value !== '');
}

describe('New Exercise Page icon picker', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('renders one radio per registry icon plus a default radio', () => {
		const { container } = render(NewExercisePage, { props: { data: makeData(), form: null } });

		const all = container.querySelectorAll<HTMLInputElement>('input[type="radio"][name="icon"]');
		expect(all.length).toBe(Object.keys(EXERCISE_ICONS).length + 1);
		expect(iconRadios(container)).toHaveLength(34);

		const defaultRadio = [...all].find((r) => r.value === '');
		expect(defaultRadio).toBeDefined();
		expect(defaultRadio!.getAttribute('aria-label')).toBe('Default');
	});

	it('gives every icon radio an aria-label from the icons.<id> translations', () => {
		const { container } = render(NewExercisePage, { props: { data: makeData(), form: null } });

		for (const radio of iconRadios(container)) {
			const id = radio.value;
			expect(id in EXERCISE_ICONS, `radio value ${id}`).toBe(true);
			const label = radio.getAttribute('aria-label');
			expect(label, `aria-label for ${id}`).toBeTruthy();
			expect(label, `aria-label for ${id}`).not.toBe(`icons.${id}`);
		}
		expect(
			container.querySelector('input[name="icon"][value="dumbbell"]')?.getAttribute('aria-label')
		).toBe('Dumbbell');
		expect(
			container.querySelector('input[name="icon"][value="run-sprint"]')?.getAttribute('aria-label')
		).toBe('Sprint');
	});

	it('pre-selects the echoed icon when re-rendered after a validation failure', () => {
		const { container } = render(NewExercisePage, {
			props: {
				data: makeData(),
				form: { error: 'Exercise name is required', icon: 'bike' }
			}
		});

		const bike = container.querySelector<HTMLInputElement>('input[name="icon"][value="bike"]');
		expect(bike).not.toBeNull();
		expect(bike!.checked).toBe(true);
	});

	it('shows the strength default preview while strength is selected', () => {
		const { container } = render(NewExercisePage, { props: { data: makeData(), form: null } });

		const preview = container.querySelector('input[name="icon"][value=""] + span svg');
		expect(preview).not.toBeNull();
		expect(preview!.getAttribute('data-icon')).toBe('dumbbell');
	});

	it('switches the default tile preview to the cardio icon when kind changes to cardio', async () => {
		const { container } = render(NewExercisePage, { props: { data: makeData(), form: null } });

		const cardioRadio = container.querySelector<HTMLInputElement>(
			'input[name="kind"][value="cardio"]'
		);
		expect(cardioRadio).not.toBeNull();
		await fireEvent.click(cardioRadio!);

		const preview = container.querySelector('input[name="icon"][value=""] + span svg');
		expect(preview!.getAttribute('data-icon')).toBe('run');
	});
});
