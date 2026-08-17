-- Sections 300–305: Leave & public holiday management, contracts/onboarding and occasional workers.
-- Sections 300–305: Leave & public holiday management, contracts/onboarding and occasional workers.
CREATE TABLE IF NOT EXISTS `leave_types` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `legacy_uid` VARCHAR(255) UNIQUE,
  `code` VARCHAR(80),
  `name_json` JSON,
  `days_per_year` DECIMAL(8,2) DEFAULT 0,
  `is_paid` TINYINT(1) DEFAULT 1,
  `deducts_balance` TINYINT(1) DEFAULT 1,
  `requires_justification` TINYINT(1) DEFAULT 0,
  `max_days_per_request` INT DEFAULT 0,
  `color` VARCHAR(20),
  `display_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `public_holidays` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `legacy_uid` VARCHAR(255) UNIQUE,
  `holiday_date` DATE NOT NULL,
  `name_json` JSON,
  `is_fixed` TINYINT(1) DEFAULT 1,
  `is_workable` TINYINT(1) DEFAULT 1,
  `notes` TEXT,
  INDEX `idx_public_holidays_date` (`holiday_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `legacy_uid` VARCHAR(255) UNIQUE,
  `reference_code` VARCHAR(150) UNIQUE,
  `display_order` INT DEFAULT 0,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `type_id` VARCHAR(255),
  `is_paid` TINYINT(1) DEFAULT 1,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `duration_days` DECIMAL(8,2) DEFAULT 0,
  `deduction_amount` DECIMAL(18,2) DEFAULT 0,
  `adjusted_periods_json` JSON,
  `status` VARCHAR(32),
  `reason` TEXT,
  `requested_at` TIMESTAMP NULL,
  `decided_by` VARCHAR(255),
  `decided_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_leave_requests_employee` (`employee_id`),
  INDEX `idx_leave_requests_dates` (`start_date`,`end_date`),
  CONSTRAINT `fk_leave_request_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `worked_holidays` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `legacy_uid` VARCHAR(255) UNIQUE,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `holiday_id` VARCHAR(255),
  `worked_date` DATE,
  `hours` DECIMAL(6,2) DEFAULT 8,
  `status` VARCHAR(32),
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_worked_holidays_employee` (`employee_id`),
  CONSTRAINT `fk_worked_holiday_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_types` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `legacy_uid` VARCHAR(255) UNIQUE,
  `code` VARCHAR(80),
  `name_json` JSON,
  `cycle` VARCHAR(32),
  `is_piecework` TINYINT(1) DEFAULT 0,
  `cnas_applicable` TINYINT(1) DEFAULT 1,
  `irg_applicable` TINYINT(1) DEFAULT 1,
  `irg_withholding_rate` DECIMAL(6,4) NULL,
  `legal_notes_json` JSON,
  `display_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `employment_contracts` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `legacy_uid` VARCHAR(255) UNIQUE,
  `reference_code` VARCHAR(150) UNIQUE,
  `display_order` INT DEFAULT 0,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `contract_type` VARCHAR(80),
  `title` VARCHAR(255),
  `position` VARCHAR(255),
  `start_date` DATE,
  `end_date` DATE NULL,
  `base_salary` DECIMAL(18,2) DEFAULT 0,
  `weekly_hours` DECIMAL(6,2) DEFAULT 40,
  `trial_period_months` DECIMAL(6,2) DEFAULT 0,
  `payment_type_id` VARCHAR(255),
  `clauses_html` MEDIUMTEXT,
  `status` VARCHAR(32),
  `sent_at` TIMESTAMP NULL,
  `signature_json` JSON,
  `signed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_contracts_employee` (`employee_id`),
  CONSTRAINT `fk_contract_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rule_acceptances` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `legacy_uid` VARCHAR(255) UNIQUE,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `kind` VARCHAR(32),
  `version` INT DEFAULT 1,
  `accepted_at` TIMESTAMP NULL,
  `signature_json` JSON,
  INDEX `idx_rule_acceptances_employee` (`employee_id`),
  CONSTRAINT `fk_rule_acceptance_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `conflict_declarations` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `legacy_uid` VARCHAR(255) UNIQUE,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `ethics_commitment` TINYINT(1) DEFAULT 0,
  `confidentiality` TINYINT(1) DEFAULT 0,
  `no_conflicts` TINYINT(1) DEFAULT 0,
  `has_external_engagements` TINYINT(1) DEFAULT 0,
  `external_engagements_html` MEDIUMTEXT,
  `declared_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_conflict_declarations_employee` (`employee_id`),
  CONSTRAINT `fk_conflict_declaration_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `work_rules` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `legacy_uid` VARCHAR(255) UNIQUE,
  `kind` VARCHAR(32),
  `version` INT DEFAULT 1,
  `title_json` JSON,
  `content_json` JSON,
  `published_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `occasional_workers` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `legacy_uid` VARCHAR(255) UNIQUE,
  `reference_code` VARCHAR(150) UNIQUE,
  `display_order` INT DEFAULT 0,
  `first_name` VARCHAR(120),
  `last_name` VARCHAR(120),
  `cin` VARCHAR(80),
  `phone` VARCHAR(60),
  `email` VARCHAR(255),
  `skill` VARCHAR(255),
  `rate` DECIMAL(18,2) DEFAULT 0,
  `payment_type_id` VARCHAR(255),
  `status` VARCHAR(32),
  `hired_at` DATE,
  `notes` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `worker_assignments` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `legacy_uid` VARCHAR(255) UNIQUE,
  `worker_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255),
  `description_html` MEDIUMTEXT,
  `start_date` DATE,
  `end_date` DATE,
  `amount` DECIMAL(18,2) DEFAULT 0,
  `irg_rate` DECIMAL(6,4) DEFAULT 0.15,
  `irg_amount` DECIMAL(18,2) DEFAULT 0,
  `net_amount` DECIMAL(18,2) DEFAULT 0,
  `invoice_reference` VARCHAR(255),
  `payment_method` VARCHAR(80),
  `payment_date` DATE NULL,
  `status` VARCHAR(32),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_worker_assignments_worker` (`worker_id`),
  CONSTRAINT `fk_worker_assignment_worker` FOREIGN KEY (`worker_id`) REFERENCES `occasional_workers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `onboarding_states` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `legacy_uid` VARCHAR(255) UNIQUE,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `steps_json` JSON,
  `completed_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  UNIQUE KEY `uq_onboarding_employee` (`employee_id`),
  CONSTRAINT `fk_onboarding_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
