import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import ExerciseDetailPage from '../../[id]/+page.svelte';

// A date N days before the current UTC date (matches makeData's default `today`),
// so the session is recent (<=7 days) and renders expanded by default.
function recentDate(daysAgo: number): string {
	return new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
}

function makeData(overrides: Record<string, unknown> = {}) {
	return {
		exercise: { id: 1, name: 'Bench Press', short_name: null },
		today: new Date().toISOString().slice(0, 10),
		selectedDate: new Date().toISOString().slice(0, 10),
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

	it('should point the log set form at the named logSet action', () => {
		const { body } = render(ExerciseDetailPage, {
			props: { data: makeData(), form: null }
		});

		expect(body).toContain('action="?/logSet"');
		// The action attribute must be on the set-logging form element itself,
		// not a bare method="POST" form that falls back to the default action.
		expect(body).toMatch(/<form[^>]*action="\?\/logSet"[^>]*>/);
		expect(body).toContain('name="weight_kg"');
		expect(body).toContain('name="repetitions"');
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
					selectedDateSets: [
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
							comment: null,
							sets: [
								{ set_number: 1, weight_kg: 130, repetitions: 5 },
								{ set_number: 2, weight_kg: 130, repetitions: 5 }
							]
						},
						{
							workout_date: '2025-05-25',
							comment: null,
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
					selectedDateSets: [{ set_number: 1, weight_kg: 130, repetitions: 5 }]
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
							workout_date: recentDate(3),
							comment: null,
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
		expect(body).toContain('border-red-400');
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

	it('should have a back link to exercises with ghost variant', () => {
		const { body } = render(ExerciseDetailPage, {
			props: { data: makeData(), form: null }
		});

		expect(body).toContain('href="/exercises"');
		expect(body).toContain('Back to exercises');
		expect(body).toContain('text-stone-600');
	});

	it('should render submit button with primary variant', () => {
		const { body } = render(ExerciseDetailPage, {
			props: { data: makeData(), form: null }
		});

		expect(body).toContain('Log Set');
		expect(body).toContain('bg-primary-600');
	});

	it('should render today sets as Card components', () => {
		const { body } = render(ExerciseDetailPage, {
			props: {
				data: makeData({
					selectedDateSets: [{ set_number: 1, weight_kg: 80, repetitions: 10 }]
				}),
				form: null
			}
		});

		expect(body).toContain('Set 1');
		expect(body).toContain('rounded-xl');
	});

	it('should render weight and reps Input components', () => {
		const { body } = render(ExerciseDetailPage, {
			props: { data: makeData(), form: null }
		});

		expect(body).toContain('name="weight_kg"');
		expect(body).toContain('name="repetitions"');
	});

	describe('prefill from lastSet', () => {
		it('should prefill weight and reps from lastSet when present', () => {
			const { body } = render(ExerciseDetailPage, {
				props: {
					data: makeData({
						lastSet: { weight_kg: 100, repetitions: 5 }
					}),
					form: null
				}
			});

			expect(body).toContain('value="100"');
			expect(body).toContain('value="5"');
		});

		it('should prefill weight with decimal value from lastSet', () => {
			const { body } = render(ExerciseDetailPage, {
				props: {
					data: makeData({
						lastSet: { weight_kg: 72.5, repetitions: 8 }
					}),
					form: null
				}
			});

			expect(body).toContain('value="72.5"');
			expect(body).toContain('value="8"');
		});

		it('should keep weight and reps empty when lastSet is null', () => {
			const { body } = render(ExerciseDetailPage, {
				props: {
					data: makeData({ lastSet: null }),
					form: null
				}
			});

			expect(body).not.toContain('value="100"');
			expect(body).not.toContain('value="5"');
		});

		it('should keep weight and reps empty when lastSet is undefined', () => {
			const { body } = render(ExerciseDetailPage, {
				props: {
					data: makeData(),
					form: null
				}
			});

			expect(body).not.toContain('value="100"');
			expect(body).not.toContain('value="5"');
		});
	});

	describe('session comments', () => {
		it('should display today comment and prefill textarea when selectedDateComment is set', () => {
			const { body } = render(ExerciseDetailPage, {
				props: {
					data: makeData({
						selectedDateSets: [{ set_number: 1, weight_kg: 80, repetitions: 10 }],
						selectedDateComment: 'Felt strong'
					}),
					form: null
				}
			});

			expect(body).toContain('Felt strong');
			expect(body).toContain('action="?/saveComment"');
			expect(body).toContain('Save Comment');
			expect(body).toContain('<textarea');
			expect(body).toContain('name="comment"');
		});

		it('should render empty textarea and no comment card when selectedDateComment is null', () => {
			const { body } = render(ExerciseDetailPage, {
				props: {
					data: makeData({
						selectedDateSets: [{ set_number: 1, weight_kg: 80, repetitions: 10 }],
						selectedDateComment: null
					}),
					form: null
				}
			});

			expect(body).toContain('action="?/saveComment"');
			expect(body).toContain('How did it feel?');
			expect(body).not.toContain('Felt strong');
		});

		it('should not render comment form when selectedDateSets is empty', () => {
			const { body } = render(ExerciseDetailPage, {
				props: {
					data: makeData({ selectedDateSets: [], selectedDateComment: 'Felt strong' }),
					form: null
				}
			});

			expect(body).not.toContain('action="?/saveComment"');
			expect(body).not.toContain('Save Comment');
			expect(body).not.toContain('Felt strong');
		});

		it('should display comment within a previous session history block', () => {
			const { body } = render(ExerciseDetailPage, {
				props: {
					data: makeData({
						previousSessions: [
							{
								workout_date: recentDate(3),
								comment: 'Felt heavy',
								sets: [{ set_number: 1, weight_kg: 130, repetitions: 5 }]
							}
						]
					}),
					form: null
				}
			});

			expect(body).toContain('Felt heavy');
		});

		it('should not render comment text for a previous session with null comment', () => {
			const { body } = render(ExerciseDetailPage, {
				props: {
					data: makeData({
						previousSessions: [
							{
								workout_date: '2025-06-01',
								comment: null,
								sets: [{ set_number: 1, weight_kg: 130, repetitions: 5 }]
							}
						]
					}),
					form: null
				}
			});

			expect(body).not.toContain('Felt heavy');
		});

		it('should render saveComment error inside an Alert with border-red-400', () => {
			const { body } = render(ExerciseDetailPage, {
				props: {
					data: makeData({
						selectedDateSets: [{ set_number: 1, weight_kg: 80, repetitions: 10 }]
					}),
					form: { error: 'Comment must be at most 500 characters' }
				}
			});

			expect(body).toContain('Comment must be at most 500 characters');
			expect(body).toContain('border-red-400');
		});

		it('should show Finnish comment translations when locale is fi', () => {
			const { body } = render(ExerciseDetailPage, {
				props: {
					data: makeData({
						locale: 'fi',
						selectedDateSets: [{ set_number: 1, weight_kg: 80, repetitions: 10 }]
					}),
					form: null
				}
			});

			expect(body).toContain('Tallenna kommentti');
			expect(body).toContain('Kommentti');
		});
	});

	describe('date selection', () => {
		it('renders a date input with name, type, max and value', () => {
			const data = makeData();
			const { body } = render(ExerciseDetailPage, {
				props: { data, form: null }
			});

			expect(body).toContain('name="date"');
			expect(body).toContain('type="date"');
			expect(body).toContain(`max="${data.today}"`);
			expect(body).toContain(`value="${data.selectedDate}"`);
		});

		it('shows the selected date in the heading when it is not today', () => {
			const { body } = render(ExerciseDetailPage, {
				props: {
					data: makeData({
						selectedDate: '2025-08-19',
						isToday: false
					}),
					form: null
				}
			});

			expect(body).toContain('2025-08-19');
			expect(body).not.toContain('>Today<');
		});

		it('includes a hidden workout_date field in both the logSet and saveComment forms', () => {
			const data = makeData({
				selectedDateSets: [{ set_number: 1, weight_kg: 80, repetitions: 10 }]
			});
			const { body } = render(ExerciseDetailPage, {
				props: { data, form: null }
			});

			const hiddenCount = body.split('name="workout_date"').length - 1;
			expect(hiddenCount).toBe(2);
			expect(body).toContain('type="hidden"');
		});

		it('includes a single hidden workout_date field when there are no sets', () => {
			const { body } = render(ExerciseDetailPage, {
				props: { data: makeData(), form: null }
			});

			const hiddenCount = body.split('name="workout_date"').length - 1;
			expect(hiddenCount).toBe(1);
		});

		it('shows the Finnish date label when locale is fi', () => {
			const { body } = render(ExerciseDetailPage, {
				props: { data: makeData({ locale: 'fi' }), form: null }
			});

			expect(body).toContain('Päivämäärä');
		});

		it('shows a date error inside an Alert with border-red-400', () => {
			const { body } = render(ExerciseDetailPage, {
				props: {
					data: makeData(),
					form: { error: "Date must be a valid past or today's date" }
				}
			});

			expect(body).toContain("Date must be a valid past or today's date");
			expect(body).toContain('border-red-400');
		});
	});
});
