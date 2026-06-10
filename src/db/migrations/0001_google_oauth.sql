ALTER TABLE `users` MODIFY COLUMN `hashed_password` varchar(255) NULL;
ALTER TABLE `users` ADD COLUMN `google_id` varchar(255) NULL;
ALTER TABLE `users` ADD COLUMN `auth_provider` enum('local','google') NOT NULL DEFAULT 'local';
CREATE UNIQUE INDEX `users_google_id_unique` ON `users` (`google_id`);
