import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import LandingPage from '../+page.svelte';

function makeData(overrides: Record<string, unknown> = {}) {
	return {
		locale: 'en' as const,
		theme: 'system' as const,
		user: null,
		logoLinkUrl: '',
		isAdmin: false,
		...overrides
	};
}

describe('Landing Page', () => {
	it('renders app.tagline i18n key text', () => {
		const { body } = render(LandingPage, { props: { data: makeData() } });
		expect(body).toContain('Log your gym workouts');
	});

	it('renders app.tagline in Finnish', () => {
		const { body } = render(LandingPage, {
			props: { data: makeData({ locale: 'fi' }) }
		});
		expect(body).toContain('Kirjaa salitreenisi');
	});

	it('renders login Button with href="/login"', () => {
		const { body } = render(LandingPage, { props: { data: makeData() } });
		expect(body).toContain('href="/login"');
		expect(body).toContain('Login');
		expect(body).toContain('bg-primary-600');
	});

	it('renders register Button with href="/register"', () => {
		const { body } = render(LandingPage, { props: { data: makeData() } });
		expect(body).toContain('href="/register"');
		expect(body).toContain('Register');
		expect(body).toContain('border-primary-600');
	});
});
