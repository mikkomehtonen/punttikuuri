import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import ExerciseDetailPage from '../../[id]/+page.svelte';

function makeData(overrides: Record<string, unknown> = {}) {
	return {
		exercise: { id: 1, name: 'Bench Press', short_name: null },
		todaySets: [] as Array<{ set_number: number; weight_kg: number; repetitions: number }>,
		previousSessions: [] as Array<{
			workout_date: string;
			sets: Array<{ set_number: number; weight_kg: number; repetitions: number }>;
		}>,
		locale: 'en' as const,
		theme: 'system' as const,
		user: { id: 1, username: 'test', locale: 'en' as const, theme: 'system' as const },
		...overrides
	};
}

describe('Exercise Detail Page', () => {
	it('should show add set form when no workout session for today', () => {
		const { body } = render(ExerciseDetailPage, {
			props: { data: makeData(), form: null }
		});

		expect(body).toContain('Bench Press');
		expect(body).toContain('Today');
		expect(body).toContain('Weight (kg)');
		expect(body).toContain('inputmode="decimal"');
		expect(body).toContain('Reps');
		expect(body).toContain('inputmode="numeric"');
		expect(body).toContain('Log Set');
	});

	it('should not show history section when no previous workouts exist', () => {
		const { body } = render(ExerciseDetailPage, {
			props: { data: makeData(), form: null }
		});

		expect(body).not.toContain('Previous Workouts');
	});

	it('should display today sets in set_number order', () => {
		const { body } = render(ExerciseDetailPage, {
			props: {
				data: makeData({
					todaySets: [
						{ set_number: 1, weight_kg: 80, repetitions: 10 },
						{ set_number: 2, weight_kg: 100, repetitions: 5 },
						{ set_number: 3, weight_kg: 120, repetitions: 3 }
					]
				}),
				form: null
			}
		});

		expect(body).toContain('Set 1');
		expect(body).toContain('Set 2');
		expect(body).toContain('Set 3');
	});

	it('should display previous workouts grouped by date, newest first', () => {
		const { body } = render(ExerciseDetailPage, {
			props: {
				data: makeData({
					previousSessions: [
						{
							workout_date: '2025-06-01',
							sets: [
								{ set_number: 1, weight_kg: 130, repetitions: 5 },
								{ set_number: 2, weight_kg: 130, repetitions: 5 }
							]
						},
						{
							workout_date: '2025-05-25',
							sets: [{ set_number: 1, weight_kg: 120, repetitions: 8 }]
						}
					]
				}),
				form: null
			}
		});

		expect(body).toContain('Previous Workouts');
		expect(body).toContain('2025-06-01');
		expect(body).toContain('2025-05-25');
	});

	it('should display sets in format: weight kg × reps', () => {
		const { body } = render(ExerciseDetailPage, {
			props: {
				data: makeData({
					todaySets: [{ set_number: 1, weight_kg: 130, repetitions: 5 }]
				}),
				form: null
			}
		});

		expect(body).toContain('130 kg × 5');
	});

	it('should display previous session sets in format: weight kg × reps', () => {
		const { body } = render(ExerciseDetailPage, {
			props: {
				data: makeData({
					previousSessions: [
						{
							workout_date: '2025-06-01',
							sets: [{ set_number: 1, weight_kg: 130, repetitions: 5 }]
						}
					]
				}),
				form: null
			}
		});

		expect(body).toContain('130 kg × 5');
	});

	it('should show form error when present', () => {
		const { body } = render(ExerciseDetailPage, {
			props: {
				data: makeData(),
				form: { error: 'Weight must be a positive number' }
			}
		});

		expect(body).toContain('Weight must be a positive number');
	});

	it('should show Finnish translations when locale is fi', () => {
		const { body } = render(ExerciseDetailPage, {
			props: { data: makeData({ locale: 'fi' }), form: null }
		});

		expect(body).toContain('Tänään');
		expect(body).toContain('Paino (kg)');
		expect(body).toContain('Toistot');
		expect(body).toContain('Tallenna sarja');
	});

	it('should have a back link to exercises', () => {
		const { body } = render(ExerciseDetailPage, {
			props: { data: makeData(), form: null }
		});

		expect(body).toContain('href="/exercises"');
		expect(body).toContain('Back to exercises');
	});
});
