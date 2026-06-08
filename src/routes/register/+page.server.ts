import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { registerUser, setAuthCookies } from '$lib/server/auth';

export const load: PageServerLoad = async () => {
	return {};
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

		setAuthCookies(cookies, result.sessionToken, result.user.locale, result.user.theme);
		throw redirect(303, '/exercises');
	}
};
