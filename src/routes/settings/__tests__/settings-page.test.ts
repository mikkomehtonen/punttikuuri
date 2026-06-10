import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import SettingsPage from '../+page.svelte';

function makeData(overrides: Record<string, unknown> = {}) {
	return {
		currentLocale: 'en' as const,
		currentTheme: 'system' as const,
		saved: false,
		locale: 'en' as const,
		theme: 'system' as const,
		user: { id: 1, username: 'test', locale: 'en' as const, theme: 'system' as const },
		...overrides
	};
}

describe('Settings Page', () => {
	it('should display settings form with language and theme options', () => {
		const { body } = render(SettingsPage, {
			props: { data: makeData({ currentLocale: 'fi', currentTheme: 'dark' }) }
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
		const { body } = render(SettingsPage, { props: { data: makeData() } });

		expect(body).toContain('Light');
		expect(body).toContain('Dark');
		expect(body).toContain('System');
	});

	it('should have both locale options', () => {
		const { body } = render(SettingsPage, { props: { data: makeData() } });

		expect(body).toContain('English');
		expect(body).toContain('Suomi');
	});

	it('should have a save button with primary variant', () => {
		const { body } = render(SettingsPage, { props: { data: makeData() } });

		expect(body).toContain('Save');
		expect(body).toContain('bg-primary-600');
	});

	it('should show saved confirmation with success Alert when saved is true', () => {
		const { body } = render(SettingsPage, {
			props: { data: makeData({ saved: true }) }
		});

		expect(body).toContain('Settings saved');
		expect(body).toContain('border-green-400');
	});

	it('should render radio inputs with accent-primary-600 class', () => {
		const { body } = render(SettingsPage, { props: { data: makeData() } });

		expect(body).toContain('accent-primary-600');
	});

	it('should display Finnish translations when locale is fi', () => {
		const { body } = render(SettingsPage, {
			props: {
				data: makeData({ locale: 'fi', currentLocale: 'fi', currentTheme: 'system' })
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
