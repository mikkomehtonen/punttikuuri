import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSessionUser, VALID_LOCALES, VALID_THEMES } from '$lib/server/auth';

const protectedRoutes = ['/exercises', '/settings'] as const;
const authRoutes = ['/login', '/register'] as const;

export function isProtectedRoute(pathname: string): boolean {
	return protectedRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

export function isAuthRoute(pathname: string): boolean {
	return authRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

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

	const locale = (VALID_LOCALES as readonly string[]).includes(rawLocale) ? rawLocale : 'en';
	const theme = (VALID_THEMES as readonly string[]).includes(rawTheme) ? rawTheme : 'system';

	event.locals.locale = locale as 'en' | 'fi';
	event.locals.theme = theme;

	const response = await resolve(event);

	return response;
};
