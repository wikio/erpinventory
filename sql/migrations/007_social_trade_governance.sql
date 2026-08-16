-- Sections 293–296: CNAS, CASNOS, trade directorate, company minutes and shareholder registry.
ALTER TABLE `configurable_options` ADD COLUMN IF NOT EXISTS `template_html` MEDIUMTEXT NULL;
ALTER TABLE `configurable_options` ADD COLUMN IF NOT EXISTS `template_html_i18n_json` JSON NULL;

CREATE TABLE IF NOT EXISTS `shareholders` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) UNIQUE,
  `reference_code` VARCHAR(150) UNIQUE, `display_order` INT DEFAULT 0,
  `name` VARCHAR(200) NOT NULL, `type` VARCHAR(40), `national_id` VARCHAR(100),
  `email` VARCHAR(180), `phone` VARCHAR(60), `address` VARCHAR(500),
  `parts` DECIMAL(18,4) DEFAULT 0, `capital_value` DECIMAL(18,2) DEFAULT 0,
  `status` VARCHAR(32), `notes_html` MEDIUMTEXT, `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shareholder_history` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) UNIQUE,
  `shareholder_id` BIGINT UNSIGNED NOT NULL, `previous_parts` DECIMAL(18,4) DEFAULT 0,
  `new_parts` DECIMAL(18,4) DEFAULT 0, `effective_date` DATE, `reason` VARCHAR(500),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_shareholder_history_owner` (`shareholder_id`),
  CONSTRAINT `fk_shareholder_history_owner` FOREIGN KEY (`shareholder_id`) REFERENCES `shareholders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `company_registers` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) UNIQUE,
  `reference_code` VARCHAR(150) UNIQUE, `display_order` INT DEFAULT 0,
  `name` VARCHAR(220), `type` VARCHAR(50), `register_number` VARCHAR(120),
  `authority` VARCHAR(200), `issue_date` DATE, `status` VARCHAR(32),
  `notes_html` MEDIUMTEXT, `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `updated_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cnas_declarations` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) UNIQUE,
  `reference_code` VARCHAR(150) UNIQUE, `display_order` INT DEFAULT 0,
  `period` VARCHAR(30), `filing_date` DATE, `due_date` DATE, `status` VARCHAR(32),
  `employee_entries_json` JSON, `related_invoice_ids_json` JSON,
  `amount_due` DECIMAL(18,2) DEFAULT 0, `notes_html` MEDIUMTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `updated_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cnas_payments` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) UNIQUE,
  `declaration_uid` VARCHAR(255) NOT NULL, `amount` DECIMAL(18,2) DEFAULT 0,
  `payment_date` DATE, `method` VARCHAR(80), `payment_reference` VARCHAR(180),
  `bank_account_id` BIGINT UNSIGNED NULL, `related_invoice_ids_json` JSON,
  `proof_document_id` VARCHAR(255), `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_cnas_payment_declaration` (`declaration_uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `casnos_declarations` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) UNIQUE,
  `reference_code` VARCHAR(150) UNIQUE, `display_order` INT DEFAULT 0,
  `shareholder_id` BIGINT UNSIGNED NULL, `period` VARCHAR(30), `periodicity` VARCHAR(40),
  `filing_date` DATE, `due_date` DATE, `status` VARCHAR(32),
  `contribution_base` DECIMAL(18,2) DEFAULT 0, `amount_due` DECIMAL(18,2) DEFAULT 0,
  `shareholder_entries_json` JSON, `register_ids_json` JSON, `related_invoice_ids_json` JSON,
  `notes_html` MEDIUMTEXT, `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `updated_at` TIMESTAMP NULL,
  INDEX `idx_casnos_shareholder` (`shareholder_id`),
  CONSTRAINT `fk_casnos_shareholder` FOREIGN KEY (`shareholder_id`) REFERENCES `shareholders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `casnos_payments` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) UNIQUE,
  `declaration_uid` VARCHAR(255) NOT NULL, `amount` DECIMAL(18,2) DEFAULT 0,
  `payment_date` DATE, `method` VARCHAR(80), `payment_reference` VARCHAR(180),
  `bank_account_id` BIGINT UNSIGNED NULL, `proof_document_id` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_casnos_payment_declaration` (`declaration_uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `social_accounts` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) UNIQUE,
  `reference_code` VARCHAR(150) UNIQUE, `display_order` INT DEFAULT 0,
  `title` VARCHAR(255), `fiscal_year` VARCHAR(10), `approval_date` DATE, `filing_date` DATE,
  `status` VARCHAR(32), `capital` DECIMAL(18,2), `revenue` DECIMAL(18,2),
  `net_result` DECIMAL(18,2), `assets` DECIMAL(18,2), `liabilities` DECIMAL(18,2),
  `notes_html` MEDIUMTEXT, `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `updated_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `company_minutes` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) UNIQUE,
  `reference_code` VARCHAR(150) UNIQUE, `display_order` INT DEFAULT 0,
  `title` VARCHAR(255), `pv_type` VARCHAR(80), `scope` VARCHAR(50), `meeting_date` DATE,
  `meeting_place` VARCHAR(255), `chairperson` VARCHAR(200), `participants_json` JSON,
  `shareholder_ids_json` JSON, `content_html` MEDIUMTEXT, `resolutions_html` MEDIUMTEXT,
  `status` VARCHAR(32), `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `updated_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `trade_registers` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) UNIQUE,
  `reference_code` VARCHAR(150) UNIQUE, `display_order` INT DEFAULT 0,
  `register_number` VARCHAR(150), `legal_name` VARCHAR(255), `legal_form` VARCHAR(100),
  `activity` VARCHAR(500), `address` VARCHAR(500), `issue_date` DATE, `modification_date` DATE,
  `status` VARCHAR(32), `notes_html` MEDIUMTEXT, `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `trade_register_history` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) UNIQUE,
  `trade_register_id` BIGINT UNSIGNED NOT NULL, `event_date` DATE, `action` VARCHAR(100),
  `description` TEXT, `snapshot_json` JSON, `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_trade_register_history` (`trade_register_id`),
  CONSTRAINT `fk_trade_register_history` FOREIGN KEY (`trade_register_id`) REFERENCES `trade_registers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `commerce_requests` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY, `legacy_uid` VARCHAR(255) UNIQUE,
  `reference_code` VARCHAR(150) UNIQUE, `display_order` INT DEFAULT 0,
  `request_type` VARCHAR(100), `subject` VARCHAR(255), `submission_date` DATE, `due_date` DATE,
  `status` VARCHAR(32), `register_ids_json` JSON, `notes_html` MEDIUMTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `updated_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
