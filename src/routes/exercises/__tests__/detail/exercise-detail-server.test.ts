import { describe, it, expect } from 'vitest';
import { deriveLastSet } from '../../[id]/utils';

describe('deriveLastSet', () => {
	it('should return last set from todaySets when todaySets is non-empty', () => {
		const todaySets = [
			{ set_number: 1, weight_kg: 80, repetitions: 10 },
			{ set_number: 2, weight_kg: 100, repetitions: 5 }
		];
		const previousSessions: Array<{
			workout_date: string;
			sets: Array<{ set_number: number; weight_kg: number; repetitions: number }>;
		}> = [];

		const result = deriveLastSet(todaySets, previousSessions);
		expect(result).toEqual({ weight_kg: 100, repetitions: 5 });
	});

	it('should return last set from most recent previous session when todaySets is empty', () => {
		const todaySets: Array<{
			set_number: number;
			weight_kg: number;
			repetitions: number;
		}> = [];

		const previousSessions = [
			{
				workout_date: '2025-06-01',
				sets: [
					{ set_number: 1, weight_kg: 60, repetitions: 12 },
					{ set_number: 2, weight_kg: 60, repetitions: 10 }
				]
			}
		];

		const result = deriveLastSet(todaySets, previousSessions);
		expect(result).toEqual({ weight_kg: 60, repetitions: 10 });
	});

	it('should return null when todaySets is empty and previousSessions is empty', () => {
		const result = deriveLastSet([], []);
		expect(result).toBeNull();
	});

	it('should return null when todaySets is empty and previousSessions has a session with no sets', () => {
		const todaySets: Array<{
			set_number: number;
			weight_kg: number;
			repetitions: number;
		}> = [];

		const previousSessions = [
			{
				workout_date: '2025-06-01',
				sets: [] as Array<{ set_number: number; weight_kg: number; repetitions: number }>
			}
		];

		const result = deriveLastSet(todaySets, previousSessions);
		expect(result).toBeNull();
	});

	it('should prefer todaySets over previousSessions when both have data', () => {
		const todaySets = [{ set_number: 1, weight_kg: 100, repetitions: 5 }];
		const previousSessions = [
			{
				workout_date: '2025-06-01',
				sets: [{ set_number: 1, weight_kg: 60, repetitions: 10 }]
			}
		];

		const result = deriveLastSet(todaySets, previousSessions);
		expect(result).toEqual({ weight_kg: 100, repetitions: 5 });
	});

	it('should handle single-set todaySets correctly', () => {
		const todaySets = [{ set_number: 1, weight_kg: 72.5, repetitions: 8 }];

		const result = deriveLastSet(todaySets, []);
		expect(result).toEqual({ weight_kg: 72.5, repetitions: 8 });
	});
});
