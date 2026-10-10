import { beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { sql, desc } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { registerUser } from '$lib/server/auth';
import { exerciseType } from '$lib/server/db/schema';
import { cleanAllTables } from '$lib/server/db/__tests__/test-utils';

// Shared harness for create-exercise action tests. The `vi.hoisted` holder and the
// `vi.mock('$lib/server/db')` call must stay in each test file (vitest hoists them
// per file); everything else lives here.
export function createExerciseActionHarness(mockDb: { current: never }, username: string) {
	let sqlite: Database.Database;
	let db: ReturnType<typeof drizzle<typeof schema>>;
	let userId: number;

	function mockEvent(formDataValues: Record<string, string>) {
		return {
			locals: {
				user: { id: userId, username, locale: 'en', theme: 'system' },
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

		const user = registerUser({ username, password: 'password123' }, db);
		if (!user.ok) throw new Error('Failed to create user');
		userId = user.user.id;
	});

	return {
		get db() {
			return db;
		},
		get userId() {
			return userId;
		},
		mockEvent,
		countExercises,
		latestExercise,
		redirectOf
	};
}
