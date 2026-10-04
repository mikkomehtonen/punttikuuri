import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '$lib/server/db/schema';
import { registerUser } from '$lib/server/auth';
import { exerciseType } from '$lib/server/db/schema';
import { cleanAllTables } from '$lib/server/db/__tests__/test-utils';

const { mockDb } = vi.hoisted(() => ({ mockDb: { current: null as never } }));

vi.mock('$lib/server/db', () => ({
	get db() {
		return mockDb.current;
	}
}));

import { load } from '../+page.server';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
let userId: number;

beforeAll(() => {
	sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: './drizzle' });
	mockDb.current = db as never;
});

afterAll(() => {
	sqlite.close();
});

beforeEach(() => {
	cleanAllTables(sqlite);

	const user = registerUser({ username: 'list_user', password: 'password123' }, db);
	if (!user.ok) throw new Error('Failed to create user');
	userId = user.user.id;
});

describe('exercises list load', () => {
	it('returns kind for every exercise', async () => {
		db.insert(exerciseType)
			.values([
				{
					user_id: userId,
					name: 'Bench Press',
					kind: 'strength',
					created_at: new Date().toISOString()
				},
				{ user_id: userId, name: 'Running', kind: 'cardio', created_at: new Date().toISOString() }
			])
			.run();

		const result = (await load({
			locals: { user: { id: userId, username: 'list_user', locale: 'en', theme: 'system' } }
		} as never)) as { exercises: Array<{ id: number; name: string; kind: string }> };

		expect(result.exercises).toHaveLength(2);
		const bench = result.exercises.find((e) => e.name === 'Bench Press');
		const running = result.exercises.find((e) => e.name === 'Running');
		expect(bench?.kind).toBe('strength');
		expect(running?.kind).toBe('cardio');
	});
});
