import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSessionUser, isValidLocale, isValidTheme } from '$lib/server/auth';
import { isProtectedRoute, isAuthRoute } from '$lib/server/route-guards';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session_id');
	let user = null;

	if (sessionId) {
		user = getSessionUser(sessionId);
	}

	event.locals.user = user;

	const pathname = event.url.pathname;

	const isProtected = isProtectedRoute(pathname);
	const isAuth = isAuthRoute(pathname);

	if (!user && isProtected) {
		throw redirect(302, '/login');
	}

	if (user && isAuth) {
		throw redirect(302, '/exercises');
	}

	const rawLocale = user?.locale ?? event.cookies.get('locale') ?? 'en';
	const rawTheme = user?.theme ?? event.cookies.get('theme') ?? 'system';

	const locale = isValidLocale(rawLocale) ? rawLocale : 'en';
	const theme = isValidTheme(rawTheme) ? rawTheme : 'system';

	event.locals.locale = locale;
	event.locals.theme = theme;

	const response = await resolve(event);

	return response;
};
