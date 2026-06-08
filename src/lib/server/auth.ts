import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { db as defaultDb } from './db';
import * as schema from './db/schema';
import { user, session } from './db/schema';

const SALT_ROUNDS = 12;
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateId(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function nowISO(): string {
	return new Date().toISOString();
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
	db: BetterSQLite3Database<typeof schema> = defaultDb
): RegisterOutcome {
	const usernameError = validateUsername(input.username);
	if (usernameError) {
		return { ok: false, error: usernameError, field: 'username' };
	}

	const passwordError = validatePassword(input.password);
	if (passwordError) {
		return { ok: false, error: passwordError, field: 'password' };
	}

	const existing = db.select().from(user).where(eq(user.username, input.username)).get();
	if (existing) {
		return { ok: false, error: 'Username already taken', field: 'username' };
	}

	const passwordHash = bcrypt.hashSync(input.password, SALT_ROUNDS);
	const createdAt = nowISO();

	const newUser = db
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

	const sessionToken = generateId();
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

	db.insert(session)
		.values({
			id: sessionToken,
			user_id: newUser.id,
			expires_at: expiresAt,
			created_at: createdAt
		})
		.run();

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
	db: BetterSQLite3Database<typeof schema> = defaultDb
): LoginOutcome {
	const existing = db.select().from(user).where(eq(user.username, input.username)).get();
	if (!existing) {
		return { ok: false, error: 'Invalid username or password' };
	}

	if (!bcrypt.compareSync(input.password, existing.password_hash)) {
		return { ok: false, error: 'Invalid username or password' };
	}

	const sessionToken = generateId();
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
	const createdAt = nowISO();

	db.insert(session)
		.values({
			id: sessionToken,
			user_id: existing.id,
			expires_at: expiresAt,
			created_at: createdAt
		})
		.run();

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
	sessionId: string,
	db: BetterSQLite3Database<typeof schema> = defaultDb
): AuthUser | null {
	const row = db
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
		.where(eq(session.id, sessionId))
		.get();

	if (!row) return null;

	const now = new Date();
	const expiresAt = new Date(row.sessionExpiresAt);
	if (now > expiresAt) {
		db.delete(session).where(eq(session.id, sessionId)).run();
		return null;
	}

	return row.user;
}

export function deleteSession(
	sessionId: string,
	db: BetterSQLite3Database<typeof schema> = defaultDb
): void {
	db.delete(session).where(eq(session.id, sessionId)).run();
}

export function updateUserLocale(
	userId: number,
	locale: string,
	db: BetterSQLite3Database<typeof schema> = defaultDb
): void {
	db.update(user).set({ locale }).where(eq(user.id, userId)).run();
}

export function updateUserTheme(
	userId: number,
	theme: string,
	db: BetterSQLite3Database<typeof schema> = defaultDb
): void {
	db.update(user).set({ theme }).where(eq(user.id, userId)).run();
}
