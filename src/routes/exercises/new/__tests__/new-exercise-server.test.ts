import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { sql, desc } from 'drizzle-orm';
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

import * as page from '../+page.server';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
let userId: number;

function mockEvent(formDataValues: Record<string, string>) {
	return {
		locals: {
			user: { id: userId, username: 'newex_user', locale: 'en', theme: 'system' },
			locale: 'en',
			theme: 'system'
		},
		request: {
			formData: async () => {
				const fd = new FormData();
				for (const [key, value] of Object.entries(formDataValues)) {
					fd.set(key, value);
				}
				return fd;
			}
		}
	} as never;
}

function countExercises(): number {
	const row = db
		.select({ count: sql<number>`COUNT(*)` })
		.from(exerciseType)
		.get();
	return row?.count ?? 0;
}

function latestExercise() {
	return db.select().from(exerciseType).orderBy(desc(exerciseType.id)).get();
}

async function redirectOf(action: unknown): Promise<unknown> {
	let caught: unknown = null;
	try {
		await action;
	} catch (err) {
		caught = err;
	}
	return caught;
}

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

	const user = registerUser({ username: 'newex_user', password: 'password123' }, db);
	if (!user.ok) throw new Error('Failed to create user');
	userId = user.user.id;
});

describe('create exercise action with kind', () => {
	const kindCases: Array<[string, Record<string, string>, string]> = [
		['kind=cardio', { name: 'Running', short_name: 'RUN', kind: 'cardio' }, 'cardio'],
		['kind=strength', { name: 'Bench Press', kind: 'strength' }, 'strength'],
		['kind missing', { name: 'Squat' }, 'strength'],
		['kind empty', { name: 'Deadlift', kind: '' }, 'strength']
	];

	it.each(kindCases)(
		'stores the expected kind and redirects for %s',
		async (_label, fields, expectedKind) => {
			const caught = await redirectOf(page.actions.default(mockEvent(fields)));

			expect(caught).toHaveProperty('status', 303);
			expect(caught).toHaveProperty('location', '/exercises');
			expect(countExercises()).toBe(1);
			expect(latestExercise()?.kind).toBe(expectedKind);
		}
	);

	it('fails with the invalid-value error and inserts nothing for an unknown kind', async () => {
		const result = await page.actions.default(mockEvent({ name: 'Mystery', kind: 'bogus' }));

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', 'Invalid value');
		expect(countExercises()).toBe(0);
	});
});
