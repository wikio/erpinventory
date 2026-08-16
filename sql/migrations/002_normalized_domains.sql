-- SARI Système normalized domain expansion (MySQL 8+)
-- Safe to re-run: DDL uses IF NOT EXISTS and migration runner records this file.

CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `name` VARCHAR(255) NOT NULL PRIMARY KEY,
  `applied_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stable bridge identifiers let legacy IndexedDB string IDs resolve to numeric FKs.
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `warehouses` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `suppliers` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `shipments` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `tenders` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `customers` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `notifications` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `audit_logs` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `app_settings` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `vat_rates` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `document_codes` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `sequence_counters` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `conversations` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `messages` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `payment_methods` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `banks` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `bank_accounts` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `purchase_documents` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `document_links` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `tax_records` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `g50_payments` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `countries` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `client_types` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `supplier_types` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `bank_types` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `product_categories` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `logistics_statuses` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `incoterms` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `product_lots` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `stock_movements` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `inventory_counts` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `api_tokens` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `payment_transactions` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `coupons` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `job_postings` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `candidates` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `report_annotations` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `barcode_label_settings` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `user_profiles` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `translation_texts` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `entity_translations` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `ged_categories` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `ged_modules` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `ged_tags` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `ged_types` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;
ALTER TABLE `configurable_options` ADD COLUMN IF NOT EXISTS `legacy_uid` VARCHAR(255) NULL UNIQUE AFTER `id`;

ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `document_type` VARCHAR(32) NOT NULL DEFAULT 'invoice' AFTER `reference_code`;
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `currency` VARCHAR(10) NOT NULL DEFAULT 'DZD' AFTER `document_type`;
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `shipping_fee` DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER `discount_amount`;
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `verification_hash` VARCHAR(128) NULL;
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `verification_url` VARCHAR(500) NULL;

CREATE TABLE IF NOT EXISTS `checklist_templates` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `name` VARCHAR(200) NOT NULL, `module` VARCHAR(64) NULL, `description` TEXT NULL,
  `items_json` JSON NULL, `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `checklist_items` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `template_id` BIGINT UNSIGNED NULL, `tender_id` BIGINT UNSIGNED NULL, `title` VARCHAR(255) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending', `deadline` DATE NULL, `notes` TEXT NULL,
  `attachments_json` JSON NULL, `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_checklist_tender` (`tender_id`), INDEX `idx_checklist_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ged_documents` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `reference_code` VARCHAR(150) NULL UNIQUE, `name` VARCHAR(255) NOT NULL, `type` VARCHAR(100) NULL,
  `category` VARCHAR(100) NULL, `module` VARCHAR(100) NULL, `mime_type` VARCHAR(150) NULL,
  `file_name` VARCHAR(255) NULL, `file_size` BIGINT UNSIGNED NULL, `storage_path` VARCHAR(1000) NULL,
  `data` LONGTEXT NULL, `version` INT NOT NULL DEFAULT 1, `expires_at` DATE NULL,
  `links_json` JSON NULL, `tags_json` JSON NULL, `metadata_json` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_ged_category` (`category`), INDEX `idx_ged_module` (`module`), INDEX `idx_ged_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `employees` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `reference_code` VARCHAR(150) NULL UNIQUE, `first_name` VARCHAR(120) NOT NULL, `last_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(180) NULL, `phone` VARCHAR(60) NULL, `date_of_birth` DATE NULL, `gender` VARCHAR(30) NULL,
  `postal_address` VARCHAR(500) NULL, `cnas_number` VARCHAR(100) NULL, `position` VARCHAR(180) NULL,
  `department` VARCHAR(120) NULL, `contract_type` VARCHAR(64) NULL, `salary` DECIMAL(18,2) NULL,
  `hire_date` DATE NULL, `status` VARCHAR(32) NOT NULL DEFAULT 'active', `photo` LONGTEXT NULL,
  `bio` MEDIUMTEXT NULL, `experience` MEDIUMTEXT NULL, `extended_details` MEDIUMTEXT NULL,
  `permission_overrides_json` JSON NULL, `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_employee_department` (`department`), INDEX `idx_employee_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `missions` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `reference_code` VARCHAR(150) NULL UNIQUE, `employee_id` BIGINT UNSIGNED NULL, `title` VARCHAR(255) NOT NULL,
  `purpose` TEXT NULL, `destination` VARCHAR(255) NULL, `start_date` DATE NULL, `end_date` DATE NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'planned', `expenses` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'DZD', `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_mission_employee` (`employee_id`), INDEX `idx_mission_dates` (`start_date`,`end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `career_records` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `employee_id` BIGINT UNSIGNED NOT NULL, `type` VARCHAR(64) NOT NULL, `date` DATE NOT NULL,
  `title` VARCHAR(255) NULL, `details` TEXT NULL, `previous_value` TEXT NULL, `new_value` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX `idx_career_employee_date` (`employee_id`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `task_stages` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `code` VARCHAR(64) NULL, `label_json` JSON NOT NULL, `color` VARCHAR(20) NULL,
  `sort_order` INT NOT NULL DEFAULT 0, `is_active` BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `reference_code` VARCHAR(150) NULL UNIQUE, `title` VARCHAR(255) NOT NULL, `description` TEXT NULL,
  `assignee_id` BIGINT UNSIGNED NULL, `stage_id` BIGINT UNSIGNED NULL, `priority` VARCHAR(32) NOT NULL DEFAULT 'normal',
  `due_date` DATE NULL, `scope` VARCHAR(20) NULL, `related_records_json` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_task_assignee` (`assignee_id`), INDEX `idx_task_stage` (`stage_id`), INDEX `idx_task_due` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `task_history` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `task_id` BIGINT UNSIGNED NOT NULL, `from_stage_id` VARCHAR(255) NULL, `to_stage_id` VARCHAR(255) NULL,
  `moved_by` VARCHAR(255) NULL, `moved_by_name` VARCHAR(180) NULL, `moved_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT NULL, INDEX `idx_task_history` (`task_id`,`moved_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `code` VARCHAR(64) NOT NULL UNIQUE, `name` VARCHAR(150) NOT NULL, `permissions_json` JSON NOT NULL,
  `is_system` BOOLEAN NOT NULL DEFAULT FALSE, `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `document_templates` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `reference_code` VARCHAR(150) NULL UNIQUE, `name` VARCHAR(200) NOT NULL, `type` VARCHAR(64) NOT NULL,
  `template_mode` VARCHAR(20) NOT NULL DEFAULT 'designer', `paper_format` VARCHAR(20) NOT NULL DEFAULT 'A4',
  `accent` VARCHAR(20) NULL, `html_content` MEDIUMTEXT NULL, `elements_json` JSON NULL,
  `versions_json` JSON NULL, `is_default` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `referrals` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `reference_code` VARCHAR(150) NULL UNIQUE, `name` VARCHAR(180) NOT NULL, `type` VARCHAR(64) NULL,
  `commission_percent` DECIMAL(7,3) NOT NULL DEFAULT 0, `contact` VARCHAR(255) NULL, `is_active` BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `employee_id` BIGINT UNSIGNED NOT NULL, `date` DATE NOT NULL, `status` VARCHAR(32) NOT NULL,
  `check_in` TIME NULL, `check_out` TIME NULL, `notes` TEXT NULL, UNIQUE KEY `uq_attendance_employee_date` (`employee_id`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `performance_records` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `employee_id` BIGINT UNSIGNED NOT NULL, `period` VARCHAR(32) NOT NULL, `evaluation_date` DATE NULL,
  `score` DECIMAL(6,2) NULL, `goals` TEXT NULL, `kpis` TEXT NULL, `notes` TEXT NULL, `status` VARCHAR(32) NULL,
  INDEX `idx_performance_employee` (`employee_id`,`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `salary_history` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `employee_id` BIGINT UNSIGNED NOT NULL, `effective_date` DATE NOT NULL, `amount` DECIMAL(18,2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'DZD', `reason` VARCHAR(255) NULL, INDEX `idx_salary_employee_date` (`employee_id`,`effective_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_stages` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `code` VARCHAR(64) NULL, `name_json` JSON NOT NULL, `color` VARCHAR(20) NULL,
  `sort_order` INT NOT NULL DEFAULT 0, `is_active` BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `import_profiles` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `name` VARCHAR(180) NOT NULL, `record_type` VARCHAR(100) NOT NULL, `columns_json` JSON NOT NULL,
  `mapping_json` JSON NULL, `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `api_endpoints` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) NULL UNIQUE,
  `base_path` VARCHAR(255) NOT NULL DEFAULT '/api/v1', `endpoints_json` JSON NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_document_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, `purchase_document_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NULL, `product_name` VARCHAR(255) NOT NULL, `description` TEXT NULL,
  `qty` DECIMAL(15,3) NOT NULL DEFAULT 1, `unit_price` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `discount_percent` DECIMAL(7,3) NOT NULL DEFAULT 0, `vat_rate` DECIMAL(7,4) NOT NULL DEFAULT 0.19,
  `line_total` DECIMAL(18,2) NOT NULL DEFAULT 0,
  INDEX `idx_purchase_item_document` (`purchase_document_id`), INDEX `idx_purchase_item_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
