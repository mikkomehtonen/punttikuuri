import { describe, it, expect, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import ExercisesPage from '../+page.svelte';
import ExerciseDetailPage from '../[id]/+page.svelte';
import ExerciseIcon from '$lib/components/ExerciseIcon.svelte';
import { makeData } from './detail/fixtures';

type ListExercise = {
	id: number;
	name: string;
	short_name: string | null;
	kind: 'strength' | 'cardio';
	icon: string | null;
};

function listData(exercises: ListExercise[]) {
	return {
		exercises,
		locale: 'en' as const,
		theme: 'system' as const,
		user: { id: 1, username: 'test', locale: 'en' as const, theme: 'system' as const },
		logoLinkUrl: '',
		isAdmin: false
	};
}

function renderList(exercises: ListExercise[]) {
	return render(ExercisesPage, { props: { data: listData(exercises) } });
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('Exercise list icon display', () => {
	it('shows the strength default icon for a strength exercise with a null icon', () => {
		const { container } = renderList([
			{ id: 1, name: 'Bench Press', short_name: null, kind: 'strength', icon: null }
		]);

		expect(container.querySelector('svg[data-icon="dumbbell"]')).not.toBeNull();
	});

	it('shows the cardio default icon for a cardio exercise with a null icon', () => {
		const { container } = renderList([
			{ id: 2, name: 'Running', short_name: null, kind: 'cardio', icon: null }
		]);

		expect(container.querySelector('svg[data-icon="run"]')).not.toBeNull();
	});

	it('shows the explicit icon instead of the kind default', () => {
		const { container } = renderList([
			{ id: 3, name: 'Swimming', short_name: null, kind: 'cardio', icon: 'swimming' }
		]);

		const row = container.querySelector('li');
		expect(row?.querySelector('svg[data-icon="swimming"]')).not.toBeNull();
		expect(row?.querySelector('svg[data-icon="run"]')).toBeNull();
	});

	it('falls back to the kind default for a tampered DB value without injecting it', () => {
		const { container } = renderList([
			{ id: 4, name: 'Legacy', short_name: null, kind: 'strength', icon: 'not-an-icon' }
		]);

		const row = container.querySelector('li');
		expect(row?.querySelector('svg[data-icon="dumbbell"]')).not.toBeNull();
		expect(row?.querySelector('svg[data-icon="not-an-icon"]')).toBeNull();
		expect(container.innerHTML).not.toContain('not-an-icon');
	});
});

describe('Exercise detail header icon display', () => {
	it('renders the explicit icon next to the exercise name in the header', () => {
		const { container } = render(ExerciseDetailPage, {
			props: {
				data: makeData({
					exercise: { id: 5, name: 'Curl', short_name: null, kind: 'strength', icon: 'trophy' }
				}),
				form: null
			}
		});

		const h1 = container.querySelector('h1');
		expect(h1?.textContent).toBe('Curl');
		const header = h1?.parentElement;
		expect(header?.querySelector('svg[data-icon="trophy"]')).not.toBeNull();
	});

	it('renders the kind default icon in the header when the icon is null', () => {
		const { container } = render(ExerciseDetailPage, {
			props: {
				data: makeData({
					exercise: { id: 6, name: 'Rowing', short_name: null, kind: 'cardio', icon: null }
				}),
				form: null
			}
		});

		const header = container.querySelector('h1')?.parentElement;
		expect(header?.querySelector('svg[data-icon="run"]')).not.toBeNull();
	});
});

describe('ExerciseIcon component', () => {
	it('renders a decorative Tabler-style svg carrying the id as data-icon', () => {
		const { container } = render(ExerciseIcon, { props: { id: 'bike' } });

		const svg = container.querySelector('svg');
		expect(svg).not.toBeNull();
		expect(svg).toHaveAttribute('aria-hidden', 'true');
		expect(svg).toHaveAttribute('stroke', 'currentColor');
		expect(svg).toHaveAttribute('fill', 'none');
		expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
		expect(svg).toHaveAttribute('data-icon', 'bike');
		expect(svg?.querySelectorAll('path').length).toBeGreaterThan(0);
	});
});
