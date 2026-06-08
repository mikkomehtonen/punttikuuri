import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { updateUserLocale, updateUserTheme, VALID_LOCALES, VALID_THEMES } from '$lib/server/auth';

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

		if (!VALID_LOCALES.includes(locale as never)) {
			return fail(400, { error: 'Invalid locale' });
		}

		if (!VALID_THEMES.includes(theme as never)) {
			return fail(400, { error: 'Invalid theme' });
		}

		updateUserLocale(locals.user.id, locale as never);
		updateUserTheme(locals.user.id, theme as never);

		cookies.set('locale', locale, {
			httpOnly: false,
			sameSite: 'lax',
			path: '/',
			maxAge: 60 * 60 * 24 * 30
		});
		cookies.set('theme', theme, {
			httpOnly: false,
			sameSite: 'lax',
			path: '/',
			maxAge: 60 * 60 * 24 * 30
		});

		return { saved: true };
	}
};
