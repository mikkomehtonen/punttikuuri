import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	updateUserLocale,
	updateUserTheme,
	VALID_LOCALES,
	VALID_THEMES,
	PUBLIC_COOKIE_OPTIONS
} from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	return {
		currentLocale: locals.user.locale,
		currentTheme: locals.user.theme
	};
};

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const locale = String(formData.get('locale') ?? 'en');
		const theme = String(formData.get('theme') ?? 'system');

		if (!(VALID_LOCALES as readonly string[]).includes(locale)) {
			return fail(400, { error: 'Invalid locale' });
		}

		if (!(VALID_THEMES as readonly string[]).includes(theme)) {
			return fail(400, { error: 'Invalid theme' });
		}

		updateUserLocale(locals.user.id, locale as (typeof VALID_LOCALES)[number]);
		updateUserTheme(locals.user.id, theme as (typeof VALID_THEMES)[number]);

		cookies.set('locale', locale, PUBLIC_COOKIE_OPTIONS);
		cookies.set('theme', theme, PUBLIC_COOKIE_OPTIONS);

		return { saved: true };
	}
};
