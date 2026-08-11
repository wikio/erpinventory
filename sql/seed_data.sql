-- ==============================================================================
-- SARI SYSTÈME – Medical Equipment & Consumables Distribution Management System
-- EXAMPLE SEED DATA (DML - Sample Algerian Medical Dataset)
-- Compatible with MySQL 8.0+ / MariaDB / PostgreSQL / SQLite
-- Date: 2026-08-11
-- ==============================================================================

-- 1. SEED WAREHOUSES (4 Algerian Depots)
INSERT INTO `warehouses` (`id`, `name`, `wilaya`, `address`, `type`) VALUES
('wh-alger', 'Dépôt Central Alger (Bab Ezzouar)', '16', 'Zone Industrielle Bab Ezzouar, 16024 Alger', 'Central / Chaine Froid'),
('wh-oran', 'Dépôt Ouest Oran (Es-Sénia)', '31', 'Boulevard Emir Abdelkader, Es-Sénia, Oran', 'Régional Consommables'),
('wh-const', 'Dépôt Est Constantine (El Khroub)', '25', 'Zone d\'Activité El Khroub, Constantine', 'Régional Équipement'),
('wh-south', 'Dépôt Sud Ouargla (Hassi Messaoud)', '30', 'Route Principale, Base Médicale Hassi Messaoud', 'Point d\'Urgence EPI');

-- 2. SEED SUPPLIERS (5 Local & International Manufacturers)
INSERT INTO `suppliers` (`id`, `name`, `country`, `type`, `contact_info`, `currency`, `incoterms`, `certifications`, `notes`) VALUES
('sup-cn', 'Shenzhen MediCare Tech Ltd', 'Chine', 'international', 'sales@medicare-shenzhen.com | +86 755 8899 1122', 'USD', 'FOB', 'CE 0123, ISO 13485', 'Fournisseur principal pour moniteurs patients et ECG.'),
('sup-de', 'BioMed Diagnostics GmbH', 'Allemagne', 'manufacturer', 'export@biomed-germany.de | +49 89 234 5678', 'EUR', 'CIF', 'CE marking, TÜV Rheinland', 'Qualité premium - dispositifs de diagnostic et réactifs.'),
('sup-dz-1', 'Saidal Distribution Algérie', 'Algérie', 'local', 'contact@saidal.dz | +213 21 54 33 22', 'DZD', 'EXW', 'Agrément Ministère de la Santé DZ', 'Partenaire national pour consommables et accessoires de chirurgie.'),
('sup-fr', 'EuroSurgical Instruments Paris', 'France', 'international', 'export@eurosurgical.fr | +33 1 42 68 90 00', 'EUR', 'CIF', 'CE 0459, ISO 9001', 'Spécialiste stérilisation et mobilier de bloc opératoire.'),
('sup-dz-2', 'Algerian Medical Equipments EURL', 'Algérie', 'distributor', 'info@algeriamedical.dz | +213 555 43 21 00', 'DZD', 'DDP', 'Homologation MSPRH #2024-88', 'Mobilier hospitalier fabrication locale et import.');

-- 3. SEED PRODUCTS (8 Medical Equipment & Consumable Catalog Items)
INSERT INTO `products` (`id`, `sku`, `barcode`, `name`, `category`, `manufacturer`, `country_of_origin`, `unit`, `purchase_price`, `selling_price`, `stock`, `minimum_stock`, `lot_number`, `manufacturing_date`, `expiration_date`, `certification_ref`, `storage_conditions`, `warehouse_id`, `notes`) VALUES
('prod-001', 'DIA-MON-101', '3614271000101', 'Moniteur Patient Multiparamétrique CE/ISO 12" LCD', 'diagnostic', 'Shenzhen MediCare Tech Ltd', 'Chine', 'piece', 125000.00, 185000.00, 35, 10, 'LOT-MON-202501', '2025-01-15', '2030-01-15', 'CE 0123 / MSPRH-DZ-2024-411', 'Température ambiante 10°C - 30°C', 'wh-alger', 'Moniteur avec ECG, SpO2, PNI, Temp et Respiration.'),
('prod-002', 'DIA-ECG-012', '3614271000102', 'Électrocardiographe (ECG) 12 Pistes Numérique avec Imprimante', 'diagnostic', 'BioMed Diagnostics GmbH', 'Allemagne', 'piece', 210000.00, 295000.00, 18, 5, 'LOT-ECG-2409', '2024-09-10', '2032-09-10', 'TÜV CE 0197', 'Sec et protégé de la poussière', 'wh-alger', 'Écran tactile 10 pouces, batterie lithium rechargeable.'),
('prod-003', 'CON-SER-005', '3614271000103', 'Seringues Stériles 5ml à Usage Unique (Boîte de 100 pcs)', 'consumables', 'Saidal Distribution Algérie', 'Algérie', 'box', 1250.00, 1950.00, 450, 100, 'LOT-SER-2026-A', '2024-05-01', '2026-09-01', 'Homologation MSPRH #DZ/2023/102', 'À conserver au sec < 25°C', 'wh-oran', 'Aiguille 21G incluse, stérilisation Oxyde d\'Éthylène.'),
('prod-004', 'CON-GLO-100', '3614271000104', 'Gants d\'Examen en Nitrile Non-Poudrés Bleu - Taille L (Boîte de 100)', 'consumables', 'BioMed Diagnostics GmbH', 'Allemagne', 'box', 1600.00, 2400.00, 320, 150, 'LOT-GLO-202511', '2025-02-10', '2028-02-10', 'CE EN 455-1/2/3/4', 'À l\'abri de la lumière solaire directe', 'wh-alger', 'Haute résistance à la déchirure, hypoallergénique.'),
('prod-005', 'FUR-BED-303', '3614271000105', 'Lit d\'Hospitalisation Électrique 3 Fonctions avec Roulettes et Ridelles', 'furniture', 'Algerian Medical Equipments EURL', 'Algérie', 'piece', 180000.00, 245000.00, 12, 4, 'LOT-BED-2025-04', '2025-04-20', '2035-04-20', 'Norme NF EN 60601-2-52', 'Entrepôt couvert', 'wh-const', 'Moteurs silencieux TiMOTION, charge max 250 kg.'),
('prod-006', 'STE-AUT-050', '3614271000106', 'Autoclave de Stérilisation Vapeur 50 Litres - Classe B Automatique', 'sterilization', 'EuroSurgical Instruments Paris', 'France', 'piece', 420000.00, 580000.00, 7, 2, 'LOT-AUT-202506', '2025-06-01', '2035-06-01', 'CE 0459 - Directive 93/42/CEE', 'Endroit ventilé', 'wh-alger', 'Imprimante thermique intégrée pour rapports de cycle.'),
('prod-007', 'PPE-MSK-050', '3614271000107', 'Masque Chirurgical Type IIR 3 Plis à Lanières/Élastiques (Boîte de 50)', 'ppe', 'Saidal Distribution Algérie', 'Algérie', 'box', 480.00, 750.00, 1200, 300, 'LOT-MSK-202601', '2026-01-10', '2029-01-10', 'EN 14683 Type IIR', 'Sec < 30°C', 'wh-south', 'Filtration BFE > 98%, résistance aux éclaboussures.'),
('prod-008', 'SUR-KIT-009', '3614271000108', 'Kit de Suture Chirurgicale Stérile (Fil Résorbable 3/0 Aiguille 26mm)', 'surgical', 'EuroSurgical Instruments Paris', 'France', 'box', 5400.00, 7800.00, 85, 25, 'LOT-SUT-202509', '2025-09-01', '2028-09-01', 'CE 0123 / Agrément MSPRH DZ-2025-11', 'Température < 25°C', 'wh-alger', 'Acide polyglycolique (PGA) haute résistance.');

-- 4. SEED SHIPMENTS (3 International Imports with Landed Cost Breakdown)
INSERT INTO `shipments` (`id`, `supplier_id`, `supplier_name`, `type`, `status`, `currency`, `foreign_amount`, `exchange_rate`, `purchase_cost_dzd`, `freight_cost`, `insurance_cost`, `customs_cost`, `total_landed_cost_dzd`, `incoterm`, `expected_arrival`, `actual_arrival`, `notes`) VALUES
('SHIP-2026-001', 'sup-cn', 'Shenzhen MediCare Tech Ltd', 'import', 'inTransit', 'USD', 28500.00, 134.2000, 3824700.00, 310000.00, 95000.00, 480000.00, 4709700.00, 'CIF', '2026-08-25', NULL, '20x Moniteurs Patients + 10x ECG en mer vers Port d\'Alger.'),
('SHIP-2026-002', 'sup-de', 'BioMed Diagnostics GmbH', 'import', 'customsClearance', 'EUR', 14200.00, 145.5000, 2066100.00, 180000.00, 65000.00, 320000.00, 2631100.00, 'FOB', '2026-08-14', '2026-08-11', 'Dédouanement en cours au Port d\'Alger (Zone Sous-Douane).'),
('SHIP-2026-003', 'sup-fr', 'EuroSurgical Instruments Paris', 'import', 'received', 'EUR', 32000.00, 145.5000, 4656000.00, 290000.00, 110000.00, 610000.00, 5666000.00, 'DDP', '2026-07-28', '2026-07-28', 'Stérilisateurs Autoclaves livrés au Dépôt Central Alger.');

-- 5. SEED TENDERS (4 Public & Private Hospital Consultations)
INSERT INTO `tenders` (`id`, `title`, `issuing_organization`, `category`, `estimated_value`, `submission_deadline`, `opening_date`, `status`, `linked_product_ids_json`, `notes`) VALUES
('AO-2026-CHU-01', 'Acquisition de Moniteurs Multiparamétriques & Équipements de Réanimation', 'CHU Mustapha Pacha - Alger', 'diagnostic', 18500000.00, '2026-09-15', '2026-09-18', 'submitted', '["prod-001", "prod-002"]', 'Soumission déposée le 10/08/2026 au bureau des marchés publics CHU Alger.'),
('AO-2026-DSP-04', 'Fourniture de Consommables Médicaux Stériles & EPI Année 2026/2027', 'Direction de la Santé et de la Population (DSP) - Blida', 'consumables', 7200000.00, '2026-08-30', '2026-09-02', 'inPreparation', '["prod-003", "prod-004", "prod-007"]', 'Marge bénéficiaire cible: 24%. Préparation BPU en cours.'),
('AO-2025-EHS-09', 'Équipement de Stérilisation et Mobilier pour Bloc Opératoire', 'EHS Pierre et Marie Curie (CPMC) - Alger', 'sterilization', 12400000.00, '2025-11-15', '2025-11-20', 'won', '["prod-005", "prod-006"]', 'Appel d\'offres remporté avec succès ! Livraisons cadencées sur 4 trimestres.'),
('AO-2026-MIL-02', 'Consultation Privée - Mobilier et Chariots Médicaux pour Hôpital Central de l\'Armée', 'Hôpital Central de l\'Armée (HCA) - Aïn Naadja', 'furniture', 9800000.00, '2026-09-28', '2026-10-01', 'watching', '["prod-005"]', 'Analyse de faisabilité. Compétitivité forte sur le mobilier.');

-- 6. SEED CUSTOMERS (4 Institutional Clients & Retail Pharmacies)
INSERT INTO `customers` (`id`, `name`, `type`, `wilaya`, `contact_info`, `tax_id`, `payment_terms`, `credit_limit`, `notes`) VALUES
('cust-chu-alger', 'CHU Mustapha Pacha Alger', 'public_hospital', '16', 'Direction des Équipements | Place du 1er Mai, 16000 Alger | +213 21 23 45 67', 'NIF: 000016001234567 / RC: 16-A-098712', 'Virement Trésor Public - 60 Jours', 30000000.00, 'Client institutionnel prioritaire.'),
('cust-pharma-oran', 'Pharmacie Centrale El-Shifa (Dr. Benali)', 'pharmacy', '31', 'Dr. Benali Ahmed | Rue Larbi Ben M\'hidi, 31000 Oran | +213 41 33 22 11', 'NIF: 000031009876543 / RC: 31-B-334455', 'Chèque / Espèces - 30 Jours', 5000000.00, 'Commandes régulières de seringues et gants en nitrile.'),
('cust-clin-const', 'Clinique Privée Ibn Sina', 'private_clinic', '25', 'Service Achats | Cité Zouaghi, 25000 Constantine | +213 31 66 55 44', 'NIF: 000025001122334 / RC: 25-C-998877', 'Virement Bancaire - 15 Jours', 8000000.00, 'Clinique de chirurgie cardiaque et orthopédie.'),
('cust-dsp-setif', 'Direction de la Santé (DSP) de la Wilaya de Sétif', 'government', '19', 'Bureau des Marchés Publics | Rue de l\'ALN, Sétif', 'NIF: 000019000000999 / Article Imposition: 19008899', 'Mandat Administratif Trésor Public', 25000000.00, 'Contrat cadre en cours pour EPI et petit équipement.');

-- 7. SEED ORDERS (3 Sample B2B Orders & Printed Invoices)
INSERT INTO `orders` (`id`, `customer_id`, `customer_name`, `warehouse_id`, `subtotal`, `discount_percent`, `discount_amount`, `tax_rate`, `tax_amount`, `total`, `payment_method`, `status`, `notes`) VALUES
('ORD-2026-001', 'cust-chu-alger', 'CHU Mustapha Pacha Alger', 'wh-alger', 3075000.00, 0.00, 0.00, 0.1900, 584250.00, 3659250.00, 'bank_transfer', 'delivered', 'Bon de Livraison BL-2608-001 émis. En attente de paiement du trésor.'),
('ORD-2026-002', 'cust-pharma-oran', 'Pharmacie Centrale El-Shifa (Dr. Benali)', 'wh-oran', 169500.00, 0.00, 0.00, 0.1900, 32205.00, 201705.00, 'check', 'paid', 'Chèque BNA encaissé le 10/08/2026.'),
('ORD-2026-003', 'cust-clin-const', 'Clinique Privée Ibn Sina', 'wh-alger', 590000.00, 0.00, 0.00, 0.1900, 112100.00, 702100.00, 'bank_transfer', 'confirmed', 'Préparation d\'expédition par transporteur sanitaire vers Constantine.');

-- 8. SEED ORDER_ITEMS (Normalized Line Items for Sample Orders)
INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `product_name`, `qty`, `unit_price`, `total`) VALUES
('item-2026-001-1', 'ORD-2026-001', 'prod-001', 'Moniteur Patient Multiparamétrique CE/ISO 12" LCD', 10, 185000.00, 1850000.00),
('item-2026-001-2', 'ORD-2026-001', 'prod-005', 'Lit d\'Hospitalisation Électrique 3 Fonctions', 5, 245000.00, 1225000.00),
('item-2026-002-1', 'ORD-2026-002', 'prod-003', 'Seringues Stériles 5ml à Usage Unique (Boîte)', 50, 1950.00, 97500.00),
('item-2026-002-2', 'ORD-2026-002', 'prod-004', 'Gants d\'Examen en Nitrile Non-Poudrés (Boîte)', 30, 2400.00, 72000.00),
('item-2026-003-1', 'ORD-2026-003', 'prod-002', 'Électrocardiographe (ECG) 12 Pistes Numérique', 2, 295000.00, 590000.00);

-- 9. SEED NOTIFICATIONS (3 Active Alerts)
INSERT INTO `notifications` (`id`, `type`, `title`, `message`, `is_read`) VALUES
('notif-01', 'near_expiry', 'Alerte Péremption Proche - Consommables', 'Produit [CON-SER-005] Seringues Stériles 5ml (Lot LOT-SER-2026-A) expire dans moins de 30 jours !', FALSE),
('notif-02', 'tender_deadline', 'Échéance Appel d\'Offres Proche', 'L\'appel d\'offres [AO-2026-DSP-04] DSP Blida doit être soumissionné avant le 30/08/2026.', FALSE),
('notif-03', 'shipment', 'Expédition en Dédouanement - Port d\'Alger', 'La shchune [SHIP-2026-002] BioMed Diagnostics est arrivée en douane. Documents D10 requis.', TRUE);

-- 10. SEED AUDIT LOGS (3 Historical Trail Entries)
INSERT INTO `audit_logs` (`id`, `user_name`, `user_role`, `action`, `module`, `description`) VALUES
('audit-001', 'Administrator', 'admin', 'INIT_SYSTEM', 'System', 'Initialisation du système SARI Système et chargement des données de référence Algérie.'),
('audit-002', 'Tenders Manager', 'tenders', 'SUBMIT_TENDER', 'Tenders', 'Dépôt officiel du dossier de soumission pour l\'appel d\'offres AO-2026-CHU-01 au CHU Mustapha Pacha.'),
('audit-003', 'Import Manager', 'import_export', 'UPDATE_SHIPMENT', 'ImportExport', 'Mise à jour du statut dédouanement pour l\'expédition SHIP-2026-002 (BioMed Diagnostics GmbH).');

-- 11. SEED APP SETTINGS (1 Global Configuration Record)
INSERT INTO `app_settings` (`id`, `language`, `theme`, `currency`, `tax_rate`, `company_name`, `company_subtitle`, `address`, `phone`, `email`, `website`, `nif`, `rc`, `ai`, `nis`, `bank_rib`) VALUES
('app-settings', 'fr', 'classic', 'DZD', 0.1900, 'SARI SYSTÈMES', 'Distribution Matériel Médical & Consommables Algérie', 'Lotissement Medical, Bab Ezzouar, 16024 Alger, Algérie', '+213 21 24 88 90 / +213 550 99 12 34', 'contact@sarisysteme.dz', 'www.sarisysteme.dz', '001616098765432', '16/00-0987654B19', '1602409876', '001616012345678', 'BNA Agence 001 - RIB 00100161609876543209');

-- End of Example Seed Data
