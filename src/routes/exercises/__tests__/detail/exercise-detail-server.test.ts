import { describe, it, expect } from 'vitest';
import {
	deriveLastSet,
	daysAgoFrom,
	isOldSession,
	formatDuration,
	formatDistanceKm
} from '../../[id]/utils';

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

describe('daysAgoFrom', () => {
	const today = '2026-08-20';

	it('returns 0 for the same date', () => {
		expect(daysAgoFrom('2026-08-20', today)).toBe(0);
	});

	it('returns the whole-day difference for past dates', () => {
		expect(daysAgoFrom('2026-08-15', today)).toBe(5);
		expect(daysAgoFrom('2026-08-13', today)).toBe(7);
		expect(daysAgoFrom('2026-08-12', today)).toBe(8);
	});

	it('returns a negative value for future dates', () => {
		expect(daysAgoFrom('2026-08-22', today)).toBe(-2);
	});
});

describe('isOldSession', () => {
	const today = '2026-08-20';

	it('is false for sessions within 7 days (including exactly 7)', () => {
		expect(isOldSession('2026-08-20', today)).toBe(false);
		expect(isOldSession('2026-08-15', today)).toBe(false);
		expect(isOldSession('2026-08-13', today)).toBe(false);
	});

	it('is true for sessions strictly older than 7 days', () => {
		expect(isOldSession('2026-08-12', today)).toBe(true);
		expect(isOldSession('2026-01-01', today)).toBe(true);
	});
});

describe('formatDuration', () => {
	it('formats sub-hour durations with zero-padded minutes and seconds', () => {
		expect(formatDuration(45)).toBe('0:00:45');
		expect(formatDuration(0)).toBe('0:00:00');
	});

	it('formats mixed h:mm:ss durations', () => {
		expect(formatDuration(3930)).toBe('1:05:30');
		expect(formatDuration(3661)).toBe('1:01:01');
	});

	it('handles the 24-hour boundary', () => {
		expect(formatDuration(86400)).toBe('24:00:00');
	});
});

describe('formatDistanceKm', () => {
	it('renders whole km without trailing decimals', () => {
		expect(formatDistanceKm(10000)).toBe('10 km');
		expect(formatDistanceKm(1000)).toBe('1 km');
	});

	it('renders fractional km with shortest round-trip digits', () => {
		expect(formatDistanceKm(5050)).toBe('5.05 km');
		expect(formatDistanceKm(42195)).toBe('42.195 km');
	});

	it('renders zero meters as 0 km', () => {
		expect(formatDistanceKm(0)).toBe('0 km');
	});
});
