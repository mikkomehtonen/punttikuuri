import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import ExercisesPage from '../+page.svelte';

describe('Exercises Page', () => {
	it('should show empty state message and create link when no exercises exist', () => {
		const { body } = render(ExercisesPage, {
			props: {
				data: {
					exercises: [],
					locale: 'en' as const,
					theme: 'system' as const,
					user: { id: 1, username: 'test', locale: 'en' as const, theme: 'system' as const }
				}
			}
		});

		expect(body).toContain('No exercises yet. Create your first exercise!');
		expect(body).toContain('href="/exercises/new"');
		expect(body).toContain('Create Exercise');
	});

	it('should display exercise list when exercises exist', () => {
		const { body } = render(ExercisesPage, {
			props: {
				data: {
					exercises: [
						{ id: 1, name: 'Bench Press', short_name: 'BP' },
						{ id: 2, name: 'Squat', short_name: null }
					],
					locale: 'en' as const,
					theme: 'system' as const,
					user: { id: 1, username: 'test', locale: 'en' as const, theme: 'system' as const }
				}
			}
		});

		expect(body).toContain('Bench Press');
		expect(body).toContain('BP');
		expect(body).toContain('Squat');
		expect(body).toContain('href="/exercises/1"');
		expect(body).toContain('href="/exercises/2"');
	});

	it('should show Finnish translations when locale is fi', () => {
		const { body } = render(ExercisesPage, {
			props: {
				data: {
					exercises: [],
					locale: 'fi' as const,
					theme: 'system' as const,
					user: { id: 1, username: 'test', locale: 'fi' as const, theme: 'system' as const }
				}
			}
		});

		expect(body).toContain('Ei harjoituksia. Luo ensimmäinen harjoituksesi!');
	});

	it('should have a create exercise button linking to /exercises/new', () => {
		const { body } = render(ExercisesPage, {
			props: {
				data: {
					exercises: [{ id: 1, name: 'Test', short_name: null }],
					locale: 'en' as const,
					theme: 'system' as const,
					user: { id: 1, username: 'test', locale: 'en' as const, theme: 'system' as const }
				}
			}
		});

		expect(body).toContain('href="/exercises/new"');
		expect(body).toContain('Create Exercise');
		expect(body).toContain('bg-primary-600');
	});

	it('should render each exercise as a Card with href', () => {
		const { body } = render(ExercisesPage, {
			props: {
				data: {
					exercises: [{ id: 1, name: 'Bench Press', short_name: 'BP' }],
					locale: 'en' as const,
					theme: 'system' as const,
					user: { id: 1, username: 'test', locale: 'en' as const, theme: 'system' as const }
				}
			}
		});

		expect(body).toContain('href="/exercises/1"');
		expect(body).toContain('rounded-xl');
	});

	it('should render exercise short_name inside a Badge component', () => {
		const { body } = render(ExercisesPage, {
			props: {
				data: {
					exercises: [{ id: 1, name: 'Bench Press', short_name: 'BP' }],
					locale: 'en' as const,
					theme: 'system' as const,
					user: { id: 1, username: 'test', locale: 'en' as const, theme: 'system' as const }
				}
			}
		});

		expect(body).toContain('BP');
		expect(body).toContain('bg-primary-50');
		expect(body).toContain('rounded-md');
	});
});
