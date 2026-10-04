import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import NewExercisePage from '../+page.svelte';

function makeData(overrides: Record<string, unknown> = {}) {
	return {
		locale: 'en' as const,
		theme: 'system' as const,
		user: { id: 1, username: 'test', locale: 'en' as const, theme: 'system' as const },
		logoLinkUrl: '',
		isAdmin: false,
		...overrides
	};
}

describe('New Exercise Page', () => {
	it('renders Input components for name, short_name, and display_order', () => {
		const { body } = render(NewExercisePage, {
			props: { data: makeData(), form: null }
		});
		expect(body).toContain('name="name"');
		expect(body).toContain('name="short_name"');
		expect(body).toContain('name="display_order"');
	});

	it('renders submit Button with primary variant', () => {
		const { body } = render(NewExercisePage, {
			props: { data: makeData(), form: null }
		});
		expect(body).toContain('Create');
		expect(body).toContain('bg-primary-600');
	});

	it('renders back Button with ghost variant and href="/exercises"', () => {
		const { body } = render(NewExercisePage, {
			props: { data: makeData(), form: null }
		});
		expect(body).toContain('href="/exercises"');
		expect(body).toContain('Back to exercises');
		expect(body).toContain('text-stone-600');
	});

	it('renders a kind radio group with strength checked by default', () => {
		const { body } = render(NewExercisePage, {
			props: { data: makeData(), form: null }
		});

		expect(body).toContain('<fieldset>');
		expect(body).toContain('Exercise type');
		expect(body).toContain('name="kind"');
		expect(body).toContain('value="strength"');
		expect(body).toContain('value="cardio"');
		expect(body).toContain('>Strength<');
		expect(body).toContain('>Cardio<');

		const strengthChecked =
			/<input[^>]*type="radio"[^>]*name="kind"[^>]*value="strength"[^>]*checked/.test(body);
		expect(strengthChecked).toBe(true);
		expect(body).not.toMatch(/<input[^>]*value="cardio"[^>]*checked/);
	});

	it('renders the kind radio group labels in Finnish when locale is fi', () => {
		const { body } = render(NewExercisePage, {
			props: { data: makeData({ locale: 'fi' }), form: null }
		});

		expect(body).toContain('Harjoituksen tyyppi');
		expect(body).toContain('>Voima<');
		expect(body).toContain('>Cardio<');
	});
});
