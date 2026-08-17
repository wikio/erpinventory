-- Sections 306/310: payslip reference format (payment type + employee sequence)
-- and per-register fiscal identifiers (multiple RC support).
ALTER TABLE `payslips`
  ADD COLUMN `payment_type_id` BIGINT UNSIGNED NULL AFTER `generated_document_id`,
  ADD COLUMN `rc_id` BIGINT UNSIGNED NULL AFTER `payment_type_id`,
  ADD CONSTRAINT `fk_payslip_payment_type` FOREIGN KEY (`payment_type_id`) REFERENCES `payment_types` (`id`),
  ADD CONSTRAINT `fk_payslip_rc` FOREIGN KEY (`rc_id`) REFERENCES `trade_registers` (`id`);

ALTER TABLE `trade_registers`
  ADD COLUMN `nif` VARCHAR(80) NULL AFTER `activity`,
  ADD COLUMN `nai` VARCHAR(80) NULL AFTER `nif`,
  ADD COLUMN `nis` VARCHAR(80) NULL AFTER `nai`;
