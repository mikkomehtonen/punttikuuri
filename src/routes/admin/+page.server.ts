import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdminUsername } from '$lib/server/admin';
import { listAllUsers, resetUserPassword } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || !isAdminUsername(locals.user.username)) {
		throw redirect(302, '/exercises');
	}
	return {
		users: listAllUsers(),
		resetUsername: url.searchParams.get('reset') ?? null
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		if (!locals.user || !isAdminUsername(locals.user.username)) {
			throw redirect(302, '/exercises');
		}

		const formData = await request.formData();
		const username = String(formData.get('username') ?? '');
		const newPassword = String(formData.get('password') ?? '');
		const preserveSessionToken = cookies.get('session_id') ?? undefined;

		const result = resetUserPassword({ username, newPassword, preserveSessionToken });

		if (!result.ok) {
			return fail(400, { error: result.error, field: result.field ?? null });
		}

		throw redirect(303, `/admin?reset=${encodeURIComponent(username)}`);
	}
};
