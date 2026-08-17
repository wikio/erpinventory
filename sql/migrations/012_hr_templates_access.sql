-- Sections 323–335 — configurable HR content/templates and position types.
CREATE TABLE IF NOT EXISTS contract_templates (
  id VARCHAR(191) PRIMARY KEY, name VARCHAR(255) NOT NULL,
  contract_type VARCHAR(80) NULL, description TEXT NULL, clauses_html LONGTEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, is_default BOOLEAN NOT NULL DEFAULT FALSE,
  payload_json JSON NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conflict_declaration_templates (
  id VARCHAR(191) PRIMARY KEY, name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, is_default BOOLEAN NOT NULL DEFAULT FALSE,
  steps_json JSON NOT NULL, questions_json JSON NOT NULL, commitments_json JSON NOT NULL,
  payload_json JSON NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_positions (
  id VARCHAR(191) PRIMARY KEY, name VARCHAR(255) NOT NULL,
  department VARCHAR(180) NULL, description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, payload_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_job_positions_department (department), INDEX idx_job_positions_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- work_rules gains an active-version marker in compatibility payload storage.
ALTER TABLE work_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_work_rules_active ON work_rules (kind, is_active);
