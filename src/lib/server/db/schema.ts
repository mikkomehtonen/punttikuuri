import { sqliteTable, text, integer, real, unique } from 'drizzle-orm/sqlite-core';

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

export const exerciseType = sqliteTable('exercise_type', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	user_id: integer('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	short_name: text('short_name'),
	display_order: integer('display_order'),
	created_at: text('created_at').notNull()
});

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
