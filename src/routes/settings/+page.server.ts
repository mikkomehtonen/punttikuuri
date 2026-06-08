import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { PUBLIC_COOKIE_OPTIONS, isValidLocale, isValidTheme } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	return {
		currentLocale: locals.user.locale,
		currentTheme: locals.user.theme,
		saved: url.searchParams.get('saved') === '1'
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

		if (!isValidLocale(locale)) {
			return fail(400, { error: 'Invalid locale' });
		}

		if (!isValidTheme(theme)) {
			return fail(400, { error: 'Invalid theme' });
		}

		db.update(user).set({ locale, theme }).where(eq(user.id, locals.user!.id)).run();

		cookies.set('locale', locale, PUBLIC_COOKIE_OPTIONS);
		cookies.set('theme', theme, PUBLIC_COOKIE_OPTIONS);

		throw redirect(303, '/settings?saved=1');
	}
};
