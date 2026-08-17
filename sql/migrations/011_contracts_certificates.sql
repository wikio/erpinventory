-- Sections 315–321: job functions per position and work certificates.
CREATE TABLE IF NOT EXISTS `job_functions` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `legacy_uid` VARCHAR(255) UNIQUE,
  `position_json` JSON,
  `tasks_json` JSON,
  `display_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `work_certificates` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `legacy_uid` VARCHAR(255) UNIQUE,
  `reference_code` VARCHAR(150) UNIQUE,
  `display_order` INT DEFAULT 0,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `type_id` VARCHAR(80),
  `position` VARCHAR(255),
  `department` VARCHAR(255),
  `hire_date` DATE,
  `issue_date` DATE,
  `include_salary` TINYINT(1) DEFAULT 1,
  `include_tasks` TINYINT(1) DEFAULT 0,
  `salary` DECIMAL(18,2) DEFAULT 0,
  `content_html` MEDIUMTEXT,
  `signatures_json` JSON,
  `status` VARCHAR(32),
  `requested_by_user_id` VARCHAR(255),
  `requested_at` TIMESTAMP NULL,
  `generated_at` TIMESTAMP NULL,
  `generated_document_id` VARCHAR(255),
  `notes_html` MEDIUMTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_work_certificates_employee` (`employee_id`),
  CONSTRAINT `fk_work_certificate_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
