import type { Handle } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/auth';

const protectedRoutes = ['/exercises', '/settings'];
const authRoutes = ['/login', '/register'];

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session_id');
	let user = null;

	if (sessionId) {
		user = getSessionUser(sessionId);
	}

	event.locals.user = user;

	const pathname = event.url.pathname;

	const isProtected = protectedRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
	const isAuth = authRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));

	if (!user && isProtected) {
		return new Response(null, {
			status: 302,
			headers: { location: '/login' }
		});
	}

	if (user && isAuth) {
		return new Response(null, {
			status: 302,
			headers: { location: '/exercises' }
		});
	}

	const locale = user?.locale ?? event.cookies.get('locale') ?? 'en';
	const theme = user?.theme ?? event.cookies.get('theme') ?? 'system';

	event.locals.locale = locale as 'en' | 'fi';
	event.locals.theme = theme;

	const response = await resolve(event);

	return response;
};
