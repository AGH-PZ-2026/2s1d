CREATE TABLE `item_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `is_system` boolean NOT NULL DEFAULT false,
  `slug` varchar(100),
  `description` varchar(500),
  CONSTRAINT `item_status_id` PRIMARY KEY(`id`),
  CONSTRAINT `unique_item_status_name` UNIQUE(`name`)
);
