PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_exercise_type` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`display_order` integer,
	`kind` text DEFAULT 'strength' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "kind_chk" CHECK("__new_exercise_type"."kind" IN ('strength', 'cardio'))
);
--> statement-breakpoint
INSERT INTO `__new_exercise_type`("id", "user_id", "name", "short_name", "display_order", "kind", "created_at") SELECT "id", "user_id", "name", "short_name", "display_order", "kind", "created_at" FROM `exercise_type`;--> statement-breakpoint
DROP TABLE `exercise_type`;--> statement-breakpoint
ALTER TABLE `__new_exercise_type` RENAME TO `exercise_type`;--> statement-breakpoint
PRAGMA foreign_keys=ON;