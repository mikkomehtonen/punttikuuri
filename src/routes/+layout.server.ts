import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/public';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
		locale: locals.locale,
		theme: locals.theme,
		logoLinkUrl: env.PUBLIC_LOGO_LINK_URL ?? ''
	};
};
