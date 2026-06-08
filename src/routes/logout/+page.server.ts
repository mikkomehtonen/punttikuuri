import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { deleteSession } from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ cookies, locals }) => {
		const sessionId = cookies.get('session_id');
		if (sessionId) {
			deleteSession(sessionId);
		}

		cookies.delete('session_id', { path: '/' });
		cookies.delete('locale', { path: '/' });
		cookies.delete('theme', { path: '/' });

		throw redirect(303, '/login');
	}
};
