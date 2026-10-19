CREATE TABLE `deliveries` (
	`user_id` text NOT NULL,
	`episode_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`sent_at` integer,
	PRIMARY KEY(`user_id`, `episode_key`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_key`) REFERENCES `seen_episodes`(`key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `deliveries_unsent_idx` ON `deliveries` (`sent_at`);--> statement-breakpoint
CREATE TABLE `seen_episodes` (
	`key` text PRIMARY KEY NOT NULL,
	`rating_key` text NOT NULL,
	`show_rating_key` text NOT NULL,
	`show_title` text NOT NULL,
	`season` integer,
	`episode` integer,
	`title` text NOT NULL,
	`added_at` integer NOT NULL,
	`seen_at` integer NOT NULL
);
