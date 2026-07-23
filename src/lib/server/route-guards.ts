const protectedRoutes = ['/exercises', '/settings', '/admin'] as const;
const authRoutes = ['/login', '/register'] as const;

export function isProtectedRoute(pathname: string): boolean {
	return protectedRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

export function isAuthRoute(pathname: string): boolean {
	return authRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
}
