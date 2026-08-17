-- Sections 315–322: leave change lifecycle, dual signatures, position functions and work certificates.
CREATE TABLE IF NOT EXISTS position_functions (
  id VARCHAR(191) PRIMARY KEY,
  position VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  payload_json JSON NULL,
  INDEX idx_position_functions_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS certificate_templates (
  id VARCHAR(191) PRIMARY KEY,
  name_json JSON NOT NULL,
  include_salary BOOLEAN NOT NULL DEFAULT FALSE,
  include_functions BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  body_html LONGTEXT NULL,
  payload_json JSON NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_certificates (
  id VARCHAR(191) PRIMARY KEY,
  employee_id VARCHAR(191) NOT NULL,
  template_id VARCHAR(191) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'requested',
  generation_mode VARCHAR(16) NOT NULL DEFAULT 'manual',
  manager_signature_json JSON NULL,
  generated_document_id VARCHAR(191) NULL,
  requested_at DATETIME(3) NULL,
  signed_at DATETIME(3) NULL,
  payload_json JSON NULL,
  INDEX idx_work_certificates_employee (employee_id),
  INDEX idx_work_certificates_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing leave_requests/employment_contracts use payload JSON in the compatibility
-- connector. New fields: parentRequestId, requestKind, changeReason,
-- employeeSignature, companySignature and signedDocumentId.
