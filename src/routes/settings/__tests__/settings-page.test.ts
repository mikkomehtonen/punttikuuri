import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import SettingsPage from '../+page.svelte';

function makeData(overrides: Record<string, unknown> = {}) {
	return {
		currentLocale: 'en',
		currentTheme: 'system',
		locale: 'en' as const,
		theme: 'system',
		user: { id: 1, username: 'test', locale: 'en', theme: 'system' },
		...overrides
	};
}

describe('Settings Page', () => {
	it('should display settings form with language and theme options', () => {
		const { body } = render(SettingsPage, {
			props: { data: makeData({ currentLocale: 'fi', currentTheme: 'dark' }), form: null }
		});

		expect(body).toContain('Settings');
		expect(body).toContain('Language');
		expect(body).toContain('Theme');
		expect(body).toContain('value="en"');
		expect(body).toContain('value="fi"');
		expect(body).toContain('value="light"');
		expect(body).toContain('value="dark"');
		expect(body).toContain('value="system"');
	});

	it('should have all three theme options', () => {
		const { body } = render(SettingsPage, {
			props: { data: makeData(), form: null }
		});

		expect(body).toContain('Light');
		expect(body).toContain('Dark');
		expect(body).toContain('System');
	});

	it('should have both locale options', () => {
		const { body } = render(SettingsPage, {
			props: { data: makeData(), form: null }
		});

		expect(body).toContain('English');
		expect(body).toContain('Suomi');
	});

	it('should have a save button', () => {
		const { body } = render(SettingsPage, {
			props: { data: makeData(), form: null }
		});

		expect(body).toContain('Save');
	});

	it('should show saved confirmation when form.saved is true', () => {
		const { body } = render(SettingsPage, {
			props: { data: makeData(), form: { saved: true } }
		});

		expect(body).toContain('Settings saved');
	});

	it('should display Finnish translations when locale is fi', () => {
		const { body } = render(SettingsPage, {
			props: {
				data: makeData({ locale: 'fi', currentLocale: 'fi', currentTheme: 'system' }),
				form: null
			}
		});

		expect(body).toContain('Asetukset');
		expect(body).toContain('Kieli');
		expect(body).toContain('Teema');
		expect(body).toContain('Vaalea');
		expect(body).toContain('Tumma');
		expect(body).toContain('Järjestelmä');
		expect(body).toContain('Tallenna');
	});
});
