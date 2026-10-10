import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { exerciseType } from '$lib/server/db/schema';
import {
	validateExerciseName,
	validateShortName,
	validateExerciseKind,
	validateExerciseIcon
} from '$lib/server/workout-validation';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const name = String(formData.get('name') ?? '').trim();
		const shortName = String(formData.get('short_name') ?? '').trim() || null;
		const displayOrderStr = String(formData.get('display_order') ?? '');
		const kindStr = String(formData.get('kind') ?? '');
		const iconStr = String(formData.get('icon') ?? '').trim();

		const iconResult = validateExerciseIcon(iconStr, locals.locale);
		if (iconResult.error !== null) {
			// Do not echo the rejected value: it matches no picker tile, and echoing
			// '' avoids re-seeding a tampered payload into the next submit.
			return fail(400, { error: iconResult.error, icon: '' });
		}

		// Every failure echoes the submitted icon so the picker keeps its selection.
		const failure = (error: string) => fail(400, { error, icon: iconStr });

		const nameError = validateExerciseName(name);
		if (nameError) {
			return failure(nameError);
		}

		const shortNameError = validateShortName(shortName);
		if (shortNameError) {
			return failure(shortNameError);
		}

		const kindResult = validateExerciseKind(kindStr, locals.locale);
		if (kindResult.error !== null) {
			return failure(kindResult.error);
		}

		let displayOrder: number | null = null;
		if (displayOrderStr) {
			displayOrder = parseInt(displayOrderStr, 10);
			if (isNaN(displayOrder) || displayOrder < 0 || displayOrder > 99999) {
				return failure('Display order must be between 0 and 99999');
			}
		}

		db.insert(exerciseType)
			.values({
				user_id: locals.user.id,
				name,
				short_name: shortName,
				display_order: displayOrder,
				kind: kindResult.kind,
				icon: iconResult.icon,
				created_at: new Date().toISOString()
			})
			.run();

		throw redirect(303, '/exercises');
	}
};
