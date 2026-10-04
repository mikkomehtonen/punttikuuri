CREATE TABLE `cardio_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workout_session_id` integer NOT NULL,
	`duration_seconds` integer NOT NULL,
	`distance_m` integer,
	`description` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workout_session_id`) REFERENCES `workout_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `exercise_type` ADD `kind` text DEFAULT 'strength' NOT NULL;