import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import NewExercisePage from '../+page.svelte';
import { EXERCISE_ICONS } from '$lib/icons/exercise-icons';
import type { Locale } from '$lib/i18n';

function makeData(locale: Locale = 'en') {
	return {
		locale,
		theme: 'system' as const,
		user: { id: 1, username: 'test', locale, theme: 'system' as const },
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

	describe('default tile caption layout', () => {
		function defaultRadio(container: HTMLElement): HTMLInputElement {
			const radio = container.querySelector<HTMLInputElement>('input[name="icon"][value=""]');
			if (!radio) throw new Error('default tile radio not found');
			return radio;
		}

		function defaultTileLabel(container: HTMLElement): HTMLLabelElement {
			const label = defaultRadio(container).closest('label');
			if (!label) throw new Error('default tile label not found');
			return label;
		}

		function mountGrid(locale: Locale = 'en') {
			const { container } = render(NewExercisePage, {
				props: { data: makeData(locale), form: null }
			});
			const label = defaultTileLabel(container);
			const grid = label.parentElement;
			if (!grid) throw new Error('icon picker grid not found');
			return { container, label, grid };
		}

		function assertCaptionAboveIcon(label: HTMLLabelElement, caption: string) {
			const spans = [...label.querySelectorAll('span')];
			const captionSpan = spans.find((s) => s.textContent?.trim() === caption);
			const iconSpan = spans.find((s) => s.querySelector('svg'));
			expect(captionSpan, `caption span "${caption}"`).toBeDefined();
			expect(iconSpan, 'icon span').toBeDefined();

			// The caption is visible: no hiding utility (plain or responsive), and it
			// keeps its caption styling.
			expect(captionSpan!.className).not.toMatch(
				/(^|\s)(sr-only|invisible|collapse|hidden|[a-z-]+:hidden)(\s|$)/
			);
			expect(captionSpan!.classList.contains('text-xs')).toBe(true);

			// The caption precedes the icon in DOM order inside the label...
			expect(
				captionSpan!.compareDocumentPosition(iconSpan!) & Node.DOCUMENT_POSITION_FOLLOWING
			).toBeTruthy();
			// ...and is the label's first child.
			expect(label.firstElementChild).toBe(captionSpan);
		}

		it.each([
			{ locale: 'en', caption: 'Default' },
			{ locale: 'fi', caption: 'Oletus' }
		] as { locale: Locale; caption: string }[])(
			'renders the $caption caption above the default tile icon ($locale)',
			({ locale, caption }) => {
				assertCaptionAboveIcon(mountGrid(locale).label, caption);
			}
		);

		it('keeps the default radio checked when nothing is selected', () => {
			expect(defaultRadio(mountGrid().container).checked).toBe(true);
		});

		it('renders no caption on the non-default tiles', () => {
			const { grid, label } = mountGrid();
			const otherLabels = [...grid.querySelectorAll(':scope > label')].filter((l) => l !== label);
			expect(otherLabels).toHaveLength(Object.keys(EXERCISE_ICONS).length);
			for (const tile of otherLabels) {
				// ExerciseIcon renders path-only svg markup, so any text means a stray caption.
				expect(tile.textContent?.trim(), 'non-default tile text').toBe('');
			}
		});

		it('adds items-end to the icon picker grid so the 44px tiles bottom-align', () => {
			const { grid, label } = mountGrid();
			expect(grid.classList.contains('items-end')).toBe(true);

			// Only the non-default tiles depend on the 44px floor; the default label's
			// content (caption + gap + tile) already exceeds it.
			const otherLabels = [...grid.querySelectorAll(':scope > label')].filter((l) => l !== label);
			for (const tile of otherLabels) {
				expect(tile.classList.contains('min-h-[44px]'), 'tile label min-height').toBe(true);
			}
		});
	});
});
