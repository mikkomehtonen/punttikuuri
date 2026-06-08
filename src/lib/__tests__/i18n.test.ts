import { describe, it, expect } from 'vitest';
import { t } from '../i18n';

describe('i18n', () => {
	it('should return English translation for existing key', () => {
		expect(t('app.name', 'en')).toBe('Punttikuuri');
	});

	it('should return Finnish translation for existing key', () => {
		expect(t('app.name', 'fi')).toBe('Punttikuuri');
	});

	it('should return English nav.exercises correctly', () => {
		expect(t('nav.exercises', 'en')).toBe('Exercises');
	});

	it('should return Finnish nav.exercises correctly', () => {
		expect(t('nav.exercises', 'fi')).toBe('Harjoitukset');
	});

	it('should return the key itself for missing keys', () => {
		expect(t('nonexistent.key', 'en')).toBe('nonexistent.key');
	});

	it('should return the key itself for missing locale', () => {
		expect(t('app.name', 'de' as never)).toBe('app.name');
	});

	it('should default to English when no locale provided', () => {
		expect(t('app.name')).toBe('Punttikuuri');
	});

	it('should have Finnish settings translations', () => {
		expect(t('settings.title', 'fi')).toBe('Asetukset');
		expect(t('settings.language', 'fi')).toBe('Kieli');
		expect(t('settings.theme', 'fi')).toBe('Teema');
	});

	it('should have workout translations in both languages', () => {
		expect(t('workout.today', 'en')).toBe('Today');
		expect(t('workout.today', 'fi')).toBe('Tänään');
		expect(t('workout.submit', 'en')).toBe('Log Set');
		expect(t('workout.submit', 'fi')).toBe('Tallenna sarja');
	});
});
