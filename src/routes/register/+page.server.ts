import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { registerUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	return { locale: locals.locale, theme: locals.theme };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = (formData.get('username') as string) ?? '';
		const password = (formData.get('password') as string) ?? '';

		const result = registerUser({ username, password });

		if (!result.ok) {
			return fail(400, { error: result.error, field: result.field ?? null });
		}

		cookies.set('session_id', result.sessionToken, {
			httpOnly: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 60 * 60 * 24 * 30
		});

		cookies.set('locale', result.user.locale, {
			httpOnly: false,
			sameSite: 'lax',
			path: '/',
			maxAge: 60 * 60 * 24 * 30
		});

		cookies.set('theme', result.user.theme, {
			httpOnly: false,
			sameSite: 'lax',
			path: '/',
			maxAge: 60 * 60 * 24 * 30
		});

		throw redirect(303, '/exercises');
	}
};
