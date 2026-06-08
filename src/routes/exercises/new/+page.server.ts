import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { exerciseType } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const name = String(formData.get('name') ?? '').trim();
		const shortName = String(formData.get('short_name') ?? '').trim() || null;
		const displayOrderStr = String(formData.get('display_order') ?? '');

		if (!name || name.length > 100) {
			return fail(400, { error: 'Exercise name is required (max 100 characters)' });
		}

		let displayOrder: number | null = null;
		if (displayOrderStr) {
			displayOrder = parseInt(displayOrderStr, 10);
			if (isNaN(displayOrder) || displayOrder < 0 || displayOrder > 99999) {
				return fail(400, { error: 'Display order must be between 0 and 99999' });
			}
		}

		db.insert(exerciseType)
			.values({
				user_id: locals.user.id,
				name,
				short_name: shortName,
				display_order: displayOrder,
				created_at: new Date().toISOString()
			})
			.run();

		throw redirect(303, '/exercises');
	}
};
