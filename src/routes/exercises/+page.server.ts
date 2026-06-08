import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { exerciseType } from '$lib/server/db/schema';
import { eq, asc, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { locale: locals.locale, theme: locals.theme, exercises: [] };
	}

	const exercises = db
		.select()
		.from(exerciseType)
		.where(eq(exerciseType.user_id, locals.user.id))
		.orderBy(asc(sql`COALESCE(${exerciseType.display_order}, 99999)`), asc(exerciseType.name))
		.all();

	return {
		locale: locals.locale,
		theme: locals.theme,
		exercises: exercises.map((e) => ({
			id: e.id,
			name: e.name,
			short_name: e.short_name
		}))
	};
};
