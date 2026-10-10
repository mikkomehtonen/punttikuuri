import { describe, it, expect } from 'vitest';
import {
	EXERCISE_ICONS,
	STRENGTH_DEFAULT_ICON,
	CARDIO_DEFAULT_ICON,
	isExerciseIconId,
	resolveExerciseIcon
} from '$lib/icons/exercise-icons';
import { t } from '$lib/i18n';

const EXPECTED_IDS = [
	'dumbbell',
	'barbell',
	'weight',
	'bolt',
	'flame',
	'target',
	'trophy',
	'medal',
	'run',
	'run-sprint',
	'walk',
	'bike',
	'swimming',
	'pool',
	'jump-rope',
	'heart',
	'activity',
	'stopwatch',
	'mountain',
	'snowboarding',
	'jetski',
	'kayak',
	'ball-tennis',
	'ball-basketball',
	'ball-football',
	'golf',
	'disc-golf',
	'archery-arrow',
	'stretching',
	'yoga',
	'star',
	'flag',
	'sun',
	'moon'
];

describe('resolveExerciseIcon', () => {
	it('returns the strength default for a null icon', () => {
		expect(resolveExerciseIcon('strength', null)).toBe('dumbbell');
	});

	it('returns the cardio default for a null icon', () => {
		expect(resolveExerciseIcon('cardio', null)).toBe('run');
	});

	it('lets an explicit icon win over the kind default', () => {
		expect(resolveExerciseIcon('strength', 'bike')).toBe('bike');
	});

	it('allows cross-kind overrides', () => {
		expect(resolveExerciseIcon('cardio', 'dumbbell')).toBe('dumbbell');
	});

	it('falls through to the kind default for an unknown string', () => {
		expect(resolveExerciseIcon('cardio', 'not-an-icon')).toBe('run');
	});

	it('falls through to the kind default for an empty string', () => {
		expect(resolveExerciseIcon('cardio', '')).toBe('run');
	});

	it('exports the documented default constants', () => {
		expect(STRENGTH_DEFAULT_ICON).toBe('dumbbell');
		expect(CARDIO_DEFAULT_ICON).toBe('run');
	});
});

describe('isExerciseIconId', () => {
	it('accepts only exact registry ids', () => {
		expect(isExerciseIconId('dumbbell')).toBe(true);
		expect(isExerciseIconId('DUMBBELL')).toBe(false);
		expect(isExerciseIconId('')).toBe(false);
		expect(isExerciseIconId('<script>')).toBe(false);
		expect(isExerciseIconId(undefined)).toBe(false);
		expect(isExerciseIconId('__proto__')).toBe(false);
	});
});

describe('EXERCISE_ICONS registry', () => {
	it('contains exactly the curated 34 ids', () => {
		expect(Object.keys(EXERCISE_ICONS)).toHaveLength(34);
		expect([...Object.keys(EXERCISE_ICONS)].sort()).toEqual([...EXPECTED_IDS].sort());
	});

	it('maps every id to a non-empty SVG fragment', () => {
		for (const [id, markup] of Object.entries(EXERCISE_ICONS)) {
			expect(markup.length, `markup for ${id}`).toBeGreaterThan(0);
			expect(markup, `markup for ${id}`).toMatch(/^<(path|circle|rect|line|polyline|polygon)\b/);
		}
	});

	it('registers both kind defaults', () => {
		expect(isExerciseIconId(STRENGTH_DEFAULT_ICON)).toBe(true);
		expect(isExerciseIconId(CARDIO_DEFAULT_ICON)).toBe(true);
	});

	it('has EN and FI labels for every registry id', () => {
		for (const id of Object.keys(EXERCISE_ICONS)) {
			expect(t(`icons.${id}`, 'en'), `en label for ${id}`).not.toBe(`icons.${id}`);
			expect(t(`icons.${id}`, 'fi'), `fi label for ${id}`).not.toBe(`icons.${id}`);
		}
	});
});
