import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { deleteSession, clearAuthCookies } from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const sessionId = cookies.get('session_id');
		if (sessionId) {
			deleteSession(sessionId);
		}

		clearAuthCookies(cookies);
		throw redirect(303, '/login');
	}
};
