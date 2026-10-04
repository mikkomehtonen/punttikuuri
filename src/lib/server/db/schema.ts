import { sqliteTable, text, integer, real, unique, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const KIND_VALUES = ['strength', 'cardio'] as const;
export type ExerciseKind = (typeof KIND_VALUES)[number];

export const user = sqliteTable('user', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().unique(),
	password_hash: text('password_hash').notNull(),
	locale: text('locale').notNull().default('en'),
	theme: text('theme').notNull().default('system'),
	created_at: text('created_at').notNull()
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	user_id: integer('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	expires_at: text('expires_at').notNull(),
	created_at: text('created_at').notNull()
});

// drizzle-kit 0.31 does not emit a CHECK for SQLite text `enum` (type-only),
// so the constraint is declared explicitly from the same KIND_VALUES source.
export const exerciseType = sqliteTable(
	'exercise_type',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		user_id: integer('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		short_name: text('short_name'),
		display_order: integer('display_order'),
		kind: text('kind', { enum: KIND_VALUES }).notNull().default('strength'),
		created_at: text('created_at').notNull()
	},
	(table) => [
		// sql.raw is safe here only because KIND_VALUES is an `as const`
		// compile-time literal tuple — never interpolate request data.
		check(
			'kind_chk',
			sql`${table.kind} IN (${sql.raw(KIND_VALUES.map((k) => `'${k}'`).join(', '))})`
		)
	]
);

export const workoutSession = sqliteTable(
	'workout_session',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		user_id: integer('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		exercise_type_id: integer('exercise_type_id')
			.notNull()
			.references(() => exerciseType.id, { onDelete: 'cascade' }),
		workout_date: text('workout_date').notNull(),
		comment: text('comment'),
		created_at: text('created_at').notNull()
	},
	(table) => [unique().on(table.user_id, table.exercise_type_id, table.workout_date)]
);

export const setEntry = sqliteTable('set_entry', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	workout_session_id: integer('workout_session_id')
		.notNull()
		.references(() => workoutSession.id, { onDelete: 'cascade' }),
	set_number: integer('set_number').notNull(),
	weight_kg: real('weight_kg').notNull(),
	repetitions: integer('repetitions').notNull(),
	created_at: text('created_at').notNull()
});

export const cardioEntry = sqliteTable('cardio_entry', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	workout_session_id: integer('workout_session_id')
		.notNull()
		.references(() => workoutSession.id, { onDelete: 'cascade' }),
	duration_seconds: integer('duration_seconds').notNull(),
	distance_m: integer('distance_m'),
	description: text('description'),
	created_at: text('created_at').notNull()
});
