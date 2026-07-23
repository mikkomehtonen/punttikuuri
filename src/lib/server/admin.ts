import { env } from '$env/dynamic/private';

export function getAdminUsernames(): string[] {
	const raw = env.ADMIN_USERNAMES ?? '';
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

export function isAdminUsername(username: string): boolean {
	return getAdminUsernames().includes(username);
}
