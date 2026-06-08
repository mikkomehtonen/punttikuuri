import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { db as defaultDb } from './db';
import * as schema from './db/schema';
import { user, session } from './db/schema';
import type { Cookies } from '@sveltejs/kit';

const SALT_ROUNDS = 12;
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const VALID_LOCALES = ['en', 'fi'] as const;
export const VALID_THEMES = ['light', 'dark', 'system'] as const;
export type ValidLocale = (typeof VALID_LOCALES)[number];
export type ValidTheme = (typeof VALID_THEMES)[number];

function generateId(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

function nowISO(): string {
	return new Date().toISOString();
}

function createSessionForUser(userId: number, dbArg: BetterSQLite3Database<typeof schema>): string {
	const sessionToken = generateId();
	const sessionHash = hashToken(sessionToken);
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
	const createdAt = nowISO();

	dbArg
		.insert(session)
		.values({
			id: sessionHash,
			user_id: userId,
			expires_at: expiresAt,
			created_at: createdAt
		})
		.run();

	return sessionToken;
}

export interface AuthUser {
	id: number;
	username: string;
	locale: string;
	theme: string;
}

export interface RegisterInput {
	username: string;
	password: string;
}

export function validateUsername(username: string): string | null {
	if (username.length < 3 || username.length > 30) {
		return 'Username must be 3\u201330 characters';
	}
	if (!/^[a-zA-Z0-9_]+$/.test(username)) {
		return 'Username can only contain letters, numbers, and underscores';
	}
	return null;
}

export function validatePassword(password: string): string | null {
	if (password.length < 8) {
		return 'Password must be at least 8 characters';
	}
	return null;
}

export interface RegisterResult {
	ok: true;
	user: AuthUser;
	sessionToken: string;
}

export interface RegisterError {
	ok: false;
	error: string;
	field?: 'username' | 'password';
}

export type RegisterOutcome = RegisterResult | RegisterError;

export function registerUser(
	input: RegisterInput,
	dbArg: BetterSQLite3Database<typeof schema> = defaultDb
): RegisterOutcome {
	const usernameError = validateUsername(input.username);
	if (usernameError) {
		return { ok: false, error: usernameError, field: 'username' };
	}

	const passwordError = validatePassword(input.password);
	if (passwordError) {
		return { ok: false, error: passwordError, field: 'password' };
	}

	const existing = dbArg.select().from(user).where(eq(user.username, input.username)).get();
	if (existing) {
		return { ok: false, error: 'Username already taken', field: 'username' };
	}

	const passwordHash = bcrypt.hashSync(input.password, SALT_ROUNDS);
	const createdAt = nowISO();

	let newUser: typeof user.$inferSelect;
	try {
		newUser = dbArg
			.insert(user)
			.values({
				username: input.username,
				password_hash: passwordHash,
				locale: 'en',
				theme: 'system',
				created_at: createdAt
			})
			.returning()
			.get();
	} catch (err) {
		if (
			err &&
			typeof err === 'object' &&
			'code' in err &&
			(err as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
		) {
			return { ok: false, error: 'Username already taken', field: 'username' };
		}
		throw err;
	}

	const sessionToken = createSessionForUser(newUser.id, dbArg);

	return {
		ok: true,
		user: {
			id: newUser.id,
			username: newUser.username,
			locale: newUser.locale,
			theme: newUser.theme
		},
		sessionToken
	};
}

export interface LoginInput {
	username: string;
	password: string;
}

export interface LoginResult {
	ok: true;
	user: AuthUser;
	sessionToken: string;
}

export interface LoginError {
	ok: false;
	error: string;
}

export type LoginOutcome = LoginResult | LoginError;

export function loginUser(
	input: LoginInput,
	dbArg: BetterSQLite3Database<typeof schema> = defaultDb
): LoginOutcome {
	const existing = dbArg.select().from(user).where(eq(user.username, input.username)).get();
	if (!existing) {
		return { ok: false, error: 'Invalid username or password' };
	}

	if (!bcrypt.compareSync(input.password, existing.password_hash)) {
		return { ok: false, error: 'Invalid username or password' };
	}

	const sessionToken = createSessionForUser(existing.id, dbArg);

	return {
		ok: true,
		user: {
			id: existing.id,
			username: existing.username,
			locale: existing.locale,
			theme: existing.theme
		},
		sessionToken
	};
}

export function getSessionUser(
	sessionToken: string,
	dbArg: BetterSQLite3Database<typeof schema> = defaultDb
): AuthUser | null {
	const sessionHash = hashToken(sessionToken);
	const row = dbArg
		.select({
			user: {
				id: user.id,
				username: user.username,
				locale: user.locale,
				theme: user.theme
			},
			sessionExpiresAt: session.expires_at
		})
		.from(session)
		.innerJoin(user, eq(session.user_id, user.id))
		.where(eq(session.id, sessionHash))
		.get();

	if (!row) return null;

	const now = new Date();
	const expiresAt = new Date(row.sessionExpiresAt);
	if (now > expiresAt) {
		dbArg.delete(session).where(eq(session.id, sessionHash)).run();
		return null;
	}

	return row.user;
}

export function deleteSession(
	sessionToken: string,
	dbArg: BetterSQLite3Database<typeof schema> = defaultDb
): void {
	const sessionHash = hashToken(sessionToken);
	dbArg.delete(session).where(eq(session.id, sessionHash)).run();
}

export function updateUserLocale(
	userId: number,
	locale: ValidLocale,
	dbArg: BetterSQLite3Database<typeof schema> = defaultDb
): void {
	dbArg.update(user).set({ locale }).where(eq(user.id, userId)).run();
}

export function updateUserTheme(
	userId: number,
	theme: ValidTheme,
	dbArg: BetterSQLite3Database<typeof schema> = defaultDb
): void {
	dbArg.update(user).set({ theme }).where(eq(user.id, userId)).run();
}

const COOKIE_BASE = {
	sameSite: 'lax' as const,
	path: '/',
	maxAge: 60 * 60 * 24 * 30 // 30 days
};

const COOKIE_OPTIONS = {
	...COOKIE_BASE,
	httpOnly: true as const
};

export const PUBLIC_COOKIE_OPTIONS = {
	...COOKIE_BASE,
	httpOnly: false as const
};

export function setAuthCookies(
	cookies: Cookies,
	sessionToken: string,
	locale: string,
	theme: string
): void {
	cookies.set('session_id', sessionToken, COOKIE_OPTIONS);
	cookies.set('locale', locale, PUBLIC_COOKIE_OPTIONS);
	cookies.set('theme', theme, PUBLIC_COOKIE_OPTIONS);
}

export function clearAuthCookies(cookies: Cookies): void {
	cookies.delete('session_id', { path: '/' });
	cookies.delete('locale', { path: '/' });
	cookies.delete('theme', { path: '/' });
}
