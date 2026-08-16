-- Sections 255–263: GED rich metadata and G50 product associations.
ALTER TABLE `ged_documents` ADD COLUMN IF NOT EXISTS `notes_html` MEDIUMTEXT NULL;
ALTER TABLE `ged_documents` ADD COLUMN IF NOT EXISTS `updated_by` VARCHAR(255) NULL;
ALTER TABLE `ged_documents` ADD COLUMN IF NOT EXISTS `updated_by_name` VARCHAR(180) NULL;
ALTER TABLE `tax_records` ADD COLUMN IF NOT EXISTS `associated_product_ids_json` JSON NULL;
