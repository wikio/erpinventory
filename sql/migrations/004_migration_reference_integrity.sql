-- Repair bridge identities required by IndexedDB message/user relationships.
INSERT INTO `users` (`username`,`display_name`,`password_hash`,`role`,`is_active`,`legacy_uid`) VALUES
('admin','Administrateur SARI','EXTERNAL_AUTH_MANAGED','admin',FALSE,'usr-admin'),
('stock','Gestionnaire des stocks','EXTERNAL_AUTH_MANAGED','inventory',FALSE,'usr-stock'),
('import','Responsable import/export','EXTERNAL_AUTH_MANAGED','import_export',FALSE,'usr-import'),
('tenders','Responsable appels d''offres','EXTERNAL_AUTH_MANAGED','tenders',FALSE,'usr-tenders'),
('sales','Employé commercial','EXTERNAL_AUTH_MANAGED','sales',FALSE,'usr-sales'),
('viewer','Observateur','EXTERNAL_AUTH_MANAGED','readonly',FALSE,'usr-viewer')
ON DUPLICATE KEY UPDATE
`display_name`=VALUES(`display_name`),
`role`=VALUES(`role`),
`legacy_uid`=VALUES(`legacy_uid`);

-- Existing installations seeded before legacy_uid was introduced are repaired explicitly.
UPDATE `users` SET `legacy_uid`=CONCAT('usr-',`username`) WHERE (`legacy_uid` IS NULL OR `legacy_uid`='') AND `username` IN ('admin','stock','import','tenders','sales','viewer');
