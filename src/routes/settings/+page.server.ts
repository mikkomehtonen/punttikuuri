import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { updateUserLocale, updateUserTheme } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	return {
		locale: locals.locale,
		theme: locals.theme,
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
		const locale = (formData.get('locale') as string) ?? 'en';
		const theme = (formData.get('theme') as string) ?? 'system';

		updateUserLocale(locals.user.id, locale);
		updateUserTheme(locals.user.id, theme);

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

		return { saved: true, locale, theme };
	}
};
