import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { exerciseType } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	return { locale: locals.locale, theme: locals.theme };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const name = ((formData.get('name') as string) ?? '').trim();
		const shortName = ((formData.get('short_name') as string) ?? '').trim() || null;
		const displayOrderStr = (formData.get('display_order') as string) ?? '';

		if (!name || name.length > 100) {
			return fail(400, { error: 'Exercise name is required (max 100 characters)' });
		}

		const displayOrder = displayOrderStr ? parseInt(displayOrderStr, 10) : null;

		db.insert(exerciseType)
			.values({
				user_id: locals.user.id,
				name,
				short_name: shortName,
				display_order: displayOrder ?? null,
				created_at: new Date().toISOString()
			})
			.run();

		throw redirect(303, '/exercises');
	}
};
