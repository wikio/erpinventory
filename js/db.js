/**
 * SARI Système - IndexedDB Database Engine & Demo Dataset
 * Implements complete schema for Products, Warehouses, Suppliers, Shipments,
 * Tenders, Customers, Sales/Orders, Notifications, Settings, AuditLogs, and SyncQueue.
 */

class SariDB {
  constructor(dbName = 'SariSystemeDB', version = 4) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.initPromise = null;
  }

  async init() {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const stores = [
          'products',
          'warehouses',
          'suppliers',
          'shipments',
          'tenders',
          'customers',
          'orders',
          'notifications',
          'settings',
          'auditLogs',
          'syncQueue',
          'checklistItems',
          'checklistTemplates',
          'documents',
          'employees',
          'missions',
          'jobPostings',
          'candidates',
          'tasks',
          'taskStages',
          'roles',
          'documentTemplates',
          'vatRates',
          'documentCodes',
          'sequenceCounters',
          'conversations',
          'messages',
          'careerRecords'
        ];

        stores.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            if (storeName === 'products') {
              store.createIndex('category', 'category', { unique: false });
              store.createIndex('warehouseId', 'warehouseId', { unique: false });
              store.createIndex('lotNumber', 'lotNumber', { unique: false });
              store.createIndex('sku', 'sku', { unique: true });
            } else if (storeName === 'tenders') {
              store.createIndex('status', 'status', { unique: false });
            } else if (storeName === 'shipments') {
              store.createIndex('status', 'status', { unique: false });
            } else if (storeName === 'orders') {
              store.createIndex('customerId', 'customerId', { unique: false });
            } else if (storeName === 'checklistItems') {
              store.createIndex('tenderId', 'tenderId', { unique: false });
              store.createIndex('status', 'status', { unique: false });
            } else if (storeName === 'documents') {
              store.createIndex('name', 'name', { unique: false });
            } else if (storeName === 'missions') {
              store.createIndex('employeeId', 'employeeId', { unique: false });
            } else if (storeName === 'candidates') {
              store.createIndex('jobPostingId', 'jobPostingId', { unique: false });
            } else if (storeName === 'tasks') {
              store.createIndex('assigneeId', 'assigneeId', { unique: false });
              store.createIndex('stageId', 'stageId', { unique: false });
            } else if (storeName === 'messages') {
              store.createIndex('conversationId', 'conversationId', { unique: false });
            } else if (storeName === 'careerRecords') {
              store.createIndex('employeeId', 'employeeId', { unique: false });
            }
          }
        });
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        // Check if database is empty -> seed demo dataset
        const productsCount = await this.count('products');
        if (productsCount === 0) {
          console.log('[SariDB] Empty IndexedDB detected. Seeding Algerian demo dataset...');
          await this.seedDemoData();
        }
        const templateCount = await this.count('checklistTemplates');
        if (templateCount === 0) await this.seedFeatureData();
        const vatCount = await this.count('vatRates');
        if (vatCount === 0) await this.seedEnterpriseData();
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[SariDB] IndexedDB initialization error:', event.target.error);
        reject(event.target.error);
      };
    });

    return this.initPromise;
  }

  async getAll(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getById(storeName, id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async save(storeName, data) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error);
    });
  }

  async clearStore(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async exportJSON() {
    await this.init();
    const stores = [
      'products',
      'warehouses',
      'suppliers',
      'shipments',
      'tenders',
      'customers',
      'orders',
      'notifications',
      'settings',
      'auditLogs',
      'checklistItems', 'checklistTemplates', 'documents', 'employees', 'missions',
      'jobPostings', 'candidates', 'tasks', 'taskStages', 'roles', 'documentTemplates',
      'vatRates', 'documentCodes', 'sequenceCounters', 'conversations', 'messages', 'careerRecords'
    ];
    const exportData = {
      exportedAt: new Date().toISOString(),
      appName: 'SARI Système - ERP Medical Distribution Algérie',
      data: {}
    };

    for (const s of stores) {
      exportData.data[s] = await this.getAll(s);
    }
    return exportData;
  }

  async importJSON(jsonData) {
    await this.init();
    if (!jsonData || !jsonData.data) {
      throw new Error('Invalid JSON backup file structure');
    }
    const stores = Object.keys(jsonData.data);
    for (const storeName of stores) {
      if (this.db.objectStoreNames.contains(storeName)) {
        await this.clearStore(storeName);
        const records = jsonData.data[storeName];
        for (const item of records) {
          await this.save(storeName, item);
        }
      }
    }
    console.log('[SariDB] Successfully imported backup data');
    return true;
  }

  async seedEnterpriseData() {
    const vats = [
      { id: 'vat-0', label: 'Exonéré / 0%', percentage: 0, isDefault: false, isActive: true },
      { id: 'vat-9', label: 'TVA réduite 9%', percentage: 9, isDefault: false, isActive: true },
      { id: 'vat-19', label: 'TVA normale 19%', percentage: 19, isDefault: true, isActive: true }
    ];
    const standard = ['FAC|Purchase invoice','FAV|Sales invoice','BCA|Purchase order','CHA|Expense / Charge','REV|Revenue','MIS|Mission','CAT|Catalogue','DOC|Document','RAP|Report','LET|Letter','MOD|Model document','FIS|Fiscal record','DVV|Sales quote','BCV|Sales order','DVA|Purchase quote','LIV|Delivery note','REC|Goods receipt','STE|Stock entry','STS|Stock exit','CON|Consultation / Tender','EMP|Employee','ADM|Administration','REG|Trade register','PVE|Minutes','NIS|Statistical ID','NIF|Tax ID','NAI|Tax article','INV|Inventory'];
    const subtypeLists = {
      CLI: [{code:'01',label:'National / Public'},{code:'02',label:'National / Private'},{code:'03',label:'National / Organization'},{code:'04',label:'International'}],
      FOU: [{code:'01',label:'National / Public'},{code:'02',label:'National / Private'},{code:'03',label:'National / Organization'},{code:'04',label:'International'}],
      PRO: [{code:'01',label:'Standard product'},{code:'02',label:'Consumable product'},{code:'03',label:'Equipment'},{code:'04',label:'Spare part'},{code:'05',label:'Service'}],
      BAN: [{code:'01',label:'Standard bank account'},{code:'02',label:'Petty cash'},{code:'03',label:'Online payment account'}]
    };
    const codes = standard.map(row => { const [code, designation] = row.split('|'); return { id: code, code, designation, description: designation, mask: `SARI-${code}{YY}-{SEQ}`, example: `SARI-${code}26-00001`, maskType: 'Standard', sequenceMinDigits: 5, resetFrequency: 'yearly', isActive: true, subTypeOptions: [] }; });
    Object.entries(subtypeLists).forEach(([code, subTypeOptions]) => codes.push({ id: code, code, designation: {CLI:'Client',FOU:'Supplier',PRO:'Product',BAN:'Bank account'}[code], description: 'Sub-type based reference', mask: `${code}{SUBTYPE}-{SEQ}`, example: `${code}01-00001`, maskType: 'SubTypeBased', sequenceMinDigits: 5, resetFrequency: 'never', isActive: true, subTypeOptions }));
    ['IMP','EXP'].forEach(code => codes.push({ id: code, code, designation: code === 'IMP' ? 'Import' : 'Export', description: 'Country-based reference', mask: `${code}{YY}{COUNTRY3}-{SEQ}`, example: `${code}26DZA-00001`, maskType: 'CountryBased', sequenceMinDigits: 5, resetFrequency: 'yearly', isActive: true, subTypeOptions: [] }));
    codes.push({ id:'G50',code:'G50',designation:'G50 Algerian tax declaration',description:'Monthly registry reference',mask:'G50{YYYY}-{MM}-R{REGISTRY}',example:'G502026-08-R12',maskType:'DateBased',sequenceMinDigits:2,resetFrequency:'monthly',isActive:true,subTypeOptions:[] });
    codes.push({ id:'TEM',code:'TEM',designation:'Document template',description:'Template type reference',mask:'TEM{TEMPLATE3}-{SEQ}',example:'TEMFAC-00001',maskType:'TemplateBased',sequenceMinDigits:5,resetFrequency:'never',isActive:true,subTypeOptions:[] });
    for (const x of vats) await this.save('vatRates', x);
    for (const x of codes) await this.save('documentCodes', x);
    if (globalThis.ReferenceCodeManager) {
      const mappings = [
        ['products','PRO', item => ({ subType: item.category === 'consumables' ? '02' : ['diagnostic','furniture','sterilization'].includes(item.category) ? '03' : '01' })],
        ['tenders','CON', item => ({ date: item.submissionDeadline })], ['orders','FAV', () => ({})],
        ['customers','CLI', item => ({ subType: ['public_hospital','government'].includes(item.type) ? '01' : '02' })],
        ['suppliers','FOU', item => ({ subType: ['international','manufacturer'].includes(item.type) ? '04' : '02' })],
        ['shipments','IMP', item => ({ country: item.supplierName?.slice(0,3) || 'DZA' })],
        ['employees','EMP', item => ({ date: item.hireDate })], ['missions','MIS', item => ({ date: item.startDate })]
      ];
      for (const [store, code, context] of mappings) for (const item of await this.getAll(store)) if (!item.referenceCode) { item.referenceCode = await globalThis.ReferenceCodeManager.generate(code, context(item)); await this.save(store, item); }
    }
    await this.save('careerRecords',  { id:'career-001', employeeId:'emp-sales', type:'promotion', date:'2025-01-15', title:'Promotion Commerciale B2B', description:'Évolution vers le portefeuille institutions de santé.', rating: 4 });
    await this.save('careerRecords', { id:'career-002', employeeId:'emp-stock', type:'evaluation', date:'2026-06-30', title:'Évaluation semestrielle', description:'Excellente maîtrise de la traçabilité des lots.', rating: 5 });
    await this.save('conversations', { id:'conv-hr-team', title:'RH • Équipe SARI', participantUserIds:['usr-admin','usr-stock','usr-sales'], updatedAt:new Date().toISOString() });
    await this.save('messages', { id:'msg-welcome', conversationId:'conv-hr-team', senderUserId:'usr-admin', body:'Bienvenue dans votre nouvel espace collaborateur SARI.', createdAt:new Date().toISOString(), readBy:['usr-admin'] });
    const roles = await this.getAll('roles');
    for (const role of roles) {
      if (role.id !== 'admin') role.permissions = [...new Set([...(role.permissions || []), 'portal.view', role.id === 'readonly' ? 'messages.view' : 'messages.*'])];
      await this.save('roles', role);
    }
  }

  async seedFeatureData() {
    const checklistTemplates = [{
      id: 'tpl-tender-standard', name: 'Dossier standard appel d’offres', description: 'Pièces administratives et techniques usuelles en Algérie',
      items: [
        { label: 'Cahier des charges lu, paraphé et signé', dueOffsetDays: -10 },
        { label: 'Déclaration de candidature', dueOffsetDays: -9 },
        { label: 'Fiches techniques et catalogues', dueOffsetDays: -7 },
        { label: 'Agrément MSPRH à jour', dueOffsetDays: -7 },
        { label: 'Offre financière et BPU', dueOffsetDays: -3 },
        { label: 'Caution de soumission bancaire', dueOffsetDays: -2 }
      ], createdAt: new Date().toISOString()
    }];
    const checklistLabels = ['Cahier des charges lu, paraphé et signé', 'Déclaration de candidature', 'Fiches techniques et catalogues', 'Agrément MSPRH à jour', 'Offre financière et BPU', 'Caution de soumission bancaire'];
    const tenderChecklistStates = {
      'AO-2026-CHU-01': ['done','done','done','done','done','done'],
      'AO-2026-DSP-04': ['done','done','in_progress','done','in_progress','todo'],
      'AO-2025-EHS-09': ['done','done','done','done','done','not_applicable'],
      'AO-2026-MIL-02': ['todo','todo','todo','todo','todo','todo']
    };
    const checklistItems = Object.entries(tenderChecklistStates).flatMap(([tenderId, states]) => checklistLabels.map((label, index) => ({ id: `chk-${tenderId}-${index + 1}`, tenderId, label, status: states[index], dueDate: `2026-08-${20 + index}`, notes: '', createdAt: new Date().toISOString() })));
    const employees = [
      { id: 'emp-admin', userId: 'usr-admin', firstName: 'Amel', lastName: 'Bensaïd', email: 'amel@sarisysteme.dz', phone: '+213 550 10 20 30', position: 'Directrice générale', department: 'Direction', contractType: 'CDI', salary: 180000, hireDate: '2021-03-01', status: 'active', managerId: '' },
      { id: 'emp-stock', userId: 'usr-stock', firstName: 'Nadir', lastName: 'Khelifi', email: 'nadir@sarisysteme.dz', phone: '+213 550 22 33 44', position: 'Gestionnaire stocks', department: 'Logistique', contractType: 'CDI', salary: 95000, hireDate: '2023-06-12', status: 'active', managerId: 'emp-admin' },
      { id: 'emp-sales', userId: 'usr-sales', firstName: 'Lina', lastName: 'Mansouri', email: 'lina@sarisysteme.dz', phone: '+213 550 55 66 77', position: 'Commerciale B2B', department: 'Commercial', contractType: 'CDI', salary: 105000, hireDate: '2024-01-15', status: 'active', managerId: 'emp-admin' }
    ];
    const stages = [
      { id: 'todo', label: { fr: 'À faire', ar: 'للإنجاز', en: 'To Do' }, color: '#64748B', order: 1 },
      { id: 'in_progress', label: { fr: 'En cours', ar: 'قيد التنفيذ', en: 'In Progress' }, color: '#009CC5', order: 2 },
      { id: 'review', label: { fr: 'Révision', ar: 'مراجعة', en: 'Review' }, color: '#EBB51A', order: 3 },
      { id: 'done', label: { fr: 'Terminé', ar: 'مكتمل', en: 'Done' }, color: '#9BB024', order: 4 }
    ];
    const tasks = [
      { id: 'task-001', title: 'Finaliser le BPU DSP Blida', description: 'Vérifier les prix et la TVA.', assigneeId: 'emp-sales', stageId: 'in_progress', priority: 'high', dueDate: '2026-08-27', relatedType: 'tender', relatedId: 'AO-2026-DSP-04', createdAt: new Date().toISOString() },
      { id: 'task-002', title: 'Contrôler le lot de seringues', description: 'Vérifier date et traçabilité.', assigneeId: 'emp-stock', stageId: 'todo', priority: 'urgent', dueDate: '2026-08-15', relatedType: 'product', relatedId: 'prod-003', createdAt: new Date().toISOString() }
    ];
    const roles = Object.entries({
      admin: ['*'], inventory: ['dashboard.view','inventory.view','inventory.create','inventory.edit','documents.*','tasks.*','portal.view','messages.*'],
      import_export: ['dashboard.view','importExport.*','suppliers.*','documents.*','tasks.*','portal.view','messages.*'],
      tenders: ['dashboard.view','tenders.*','documents.*','tasks.*','portal.view','messages.*'], sales: ['dashboard.view','sales.*','customers.*','documents.*','tasks.*','portal.view','messages.*'],
      readonly: ['dashboard.view','inventory.view','tenders.view','importExport.view','sales.view','reports.view','tasks.view','portal.view','messages.view']
    }).map(([id, permissions]) => ({ id, name: SARI_CONFIG.USER_ROLES[id]?.fr || id, permissions }));
    const documentTemplates = [
      { id: 'doc-tpl-classic', name: 'SARI Classique', type: 'all', accent: '#009CC5', layout: 'classic', isDefault: true },
      { id: 'doc-tpl-clinical', name: 'SARI Clinique', type: 'all', accent: '#0D9488', layout: 'compact', isDefault: false }
    ];
    const missions = [{ id: 'mission-001', employeeId: 'emp-sales', destination: 'Oran', startDate: '2026-09-03', endDate: '2026-09-05', purpose: 'Visite clients et prospection pharmacies', expenses: 45000, status: 'approved' }];
    const jobs = [{ id: 'job-001', title: 'Responsable qualité dispositifs médicaux', department: 'Qualité', location: 'Alger', status: 'open', publishedAt: '2026-08-01' }];
    const candidates = [{ id: 'cand-001', jobPostingId: 'job-001', name: 'Samir Haddad', email: 'samir@example.dz', stage: 'interviewing', notes: 'Entretien technique planifié.' }];
    for (const x of checklistTemplates) await this.save('checklistTemplates', x);
    for (const x of checklistItems) await this.save('checklistItems', x);
    for (const x of employees) await this.save('employees', x);
    for (const x of stages) await this.save('taskStages', x);
    for (const x of tasks) await this.save('tasks', x);
    for (const x of roles) await this.save('roles', x);
    for (const x of documentTemplates) await this.save('documentTemplates', x);
    for (const x of missions) await this.save('missions', x);
    for (const x of jobs) await this.save('jobPostings', x);
    for (const x of candidates) await this.save('candidates', x);
  }

  async seedDemoData() {
    await this.init();

    // 1. Warehouses (Dépôts)
    const warehouses = [
      { id: 'wh-alger', name: 'Dépôt Central Alger (Bab Ezzouar)', wilaya: '16', address: 'Zone Industrielle Bab Ezzouar, 16024 Alger', type: 'Central / Chaine Froid' },
      { id: 'wh-oran', name: 'Dépôt Ouest Oran (Es-Sénia)', wilaya: '31', address: 'Boulevard Emir Abdelkader, Es-Sénia, Oran', type: 'Régional Consommables' },
      { id: 'wh-const', name: 'Dépôt Est Constantine (El Khroub)', wilaya: '25', address: 'Zone d\'Activité El Khroub, Constantine', type: 'Régional Équipement' },
      { id: 'wh-south', name: 'Dépôt Sud Ouargla (Hassi Messaoud)', wilaya: '30', address: 'Route Principale, Base Médicale Hassi Messaoud', type: 'Point d\'Urgence EPI' }
    ];

    // 2. Suppliers
    const suppliers = [
      { id: 'sup-cn', name: 'Shenzhen MediCare Tech Ltd', country: 'Chine', type: 'international', contactInfo: 'sales@medicare-shenzhen.com | +86 755 8899 1122', currency: 'USD', incoterms: 'FOB', certifications: 'CE 0123, ISO 13485', notes: 'Fournisseur principal pour moniteurs patients et ECG.' },
      { id: 'sup-de', name: 'BioMed Diagnostics GmbH', country: 'Allemagne', type: 'manufacturer', contactInfo: 'export@biomed-germany.de | +49 89 234 5678', currency: 'EUR', incoterms: 'CIF', certifications: 'CE marking, TÜV Rheinland', notes: 'Qualité premium - dispositifs de diagnostic et réactifs.' },
      { id: 'sup-dz-1', name: 'Saidal Distribution Algérie', country: 'Algérie', type: 'local', contactInfo: 'contact@saidal.dz | +213 21 54 33 22', currency: 'DZD', incoterms: 'EXW', certifications: 'Agrément Ministère de la Santé DZ', notes: 'Partenaire national pour consommables et accessoires de chirurgie.' },
      { id: 'sup-fr', name: 'EuroSurgical Instruments Paris', country: 'France', type: 'international', contactInfo: 'export@eurosurgical.fr | +33 1 42 68 90 00', currency: 'EUR', incoterms: 'CIF', certifications: 'CE 0459, ISO 9001', notes: 'Spécialiste stérilisation et mobilier de bloc opératoire.' },
      { id: 'sup-dz-2', name: 'Algerian Medical Equipments EURL', country: 'Algérie', type: 'distributor', contactInfo: 'info@algeriamedical.dz | +213 555 43 21 00', currency: 'DZD', incoterms: 'DDP', certifications: 'Homologation MSPRH #2024-88', notes: 'Mobilier hospitalier fabrication locale et import.' }
    ];

    // 3. Products (Equipment & Consumables with real Lot numbers, CE refs, expiry dates)
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(now.getDate() + 20); // Near-Expiry test product

    const products = [
      {
        id: 'prod-001',
        sku: 'DIA-MON-101',
        barcode: '3614271000101',
        name: 'Moniteur Patient Multiparamétrique CE/ISO 12" LCD',
        category: 'diagnostic',
        manufacturer: 'Shenzhen MediCare Tech Ltd',
        countryOfOrigin: 'Chine',
        unit: 'piece',
        purchasePrice: 125000,
        sellingPrice: 185000,
        stock: 35,
        minimumStock: 10,
        lotNumber: 'LOT-MON-202501',
        manufacturingDate: '2025-01-15',
        expirationDate: '2030-01-15',
        certificationRef: 'CE 0123 / MSPRH-DZ-2024-411',
        storageConditions: 'Température ambiante 10°C - 30°C',
        warehouseId: 'wh-alger',
        notes: 'Moniteur avec ECG, SpO2, PNI, Temp et Respiration.'
      },
      {
        id: 'prod-002',
        sku: 'DIA-ECG-012',
        barcode: '3614271000102',
        name: 'Électrocardiographe (ECG) 12 Pistes Numérique avec Imprimante',
        category: 'diagnostic',
        manufacturer: 'BioMed Diagnostics GmbH',
        countryOfOrigin: 'Allemagne',
        unit: 'piece',
        purchasePrice: 210000,
        sellingPrice: 295000,
        stock: 18,
        minimumStock: 5,
        lotNumber: 'LOT-ECG-2409',
        manufacturingDate: '2024-09-10',
        expirationDate: '2032-09-10',
        certificationRef: 'TÜV CE 0197',
        storageConditions: 'Sec et protégé de la poussière',
        warehouseId: 'wh-alger',
        notes: 'Écran tactile 10 pouces, batterie lithium rechargeable.'
      },
      {
        id: 'prod-003',
        sku: 'CON-SER-005',
        barcode: '3614271000103',
        name: 'Seringues Stériles 5ml à Usage Unique (Boîte de 100 pcs)',
        category: 'consumables',
        manufacturer: 'Saidal Distribution Algérie',
        countryOfOrigin: 'Algérie',
        unit: 'box',
        purchasePrice: 1250,
        sellingPrice: 1950,
        stock: 450,
        minimumStock: 100,
        lotNumber: 'LOT-SER-2026-A',
        manufacturingDate: '2024-05-01',
        expirationDate: nextMonth.toISOString().split('T')[0], // Near expiration!
        certificationRef: 'Homologation MSPRH #DZ/2023/102',
        storageConditions: 'À conserver au sec < 25°C',
        warehouseId: 'wh-oran',
        notes: 'Aiguille 21G incluse, stérilisation Oxyde d\'Éthylène.'
      },
      {
        id: 'prod-004',
        sku: 'CON-GLO-100',
        barcode: '3614271000104',
        name: 'Gants d\'Examen en Nitrile Non-Poudrés Bleu - Taille L (Boîte de 100)',
        category: 'consumables',
        manufacturer: 'BioMed Diagnostics GmbH',
        countryOfOrigin: 'Allemagne',
        unit: 'box',
        purchasePrice: 1600,
        sellingPrice: 2400,
        stock: 320,
        minimumStock: 150,
        lotNumber: 'LOT-GLO-202511',
        manufacturingDate: '2025-02-10',
        expirationDate: '2028-02-10',
        certificationRef: 'CE EN 455-1/2/3/4',
        storageConditions: 'À l\'abri de la lumière solaire directe',
        warehouseId: 'wh-alger',
        notes: 'Haute résistance à la déchirure, hypoallergénique.'
      },
      {
        id: 'prod-005',
        sku: 'FUR-BED-303',
        barcode: '3614271000105',
        name: 'Lit d\'Hospitalisation Électrique 3 Fonctions avec Roulettes et Ridelles',
        category: 'furniture',
        manufacturer: 'Algerian Medical Equipments EURL',
        countryOfOrigin: 'Algérie',
        unit: 'piece',
        purchasePrice: 180000,
        sellingPrice: 245000,
        stock: 12,
        minimumStock: 4,
        lotNumber: 'LOT-BED-2025-04',
        manufacturingDate: '2025-04-20',
        expirationDate: '2035-04-20',
        certificationRef: 'Norme NF EN 60601-2-52',
        storageConditions: 'Entrepôt couvert',
        warehouseId: 'wh-const',
        notes: 'Moteurs silencieux TiMOTION, charge max 250 kg.'
      },
      {
        id: 'prod-006',
        sku: 'STE-AUT-050',
        barcode: '3614271000106',
        name: 'Autoclave de Stérilisation Vapeur 50 Litres - Classe B Automatique',
        category: 'sterilization',
        manufacturer: 'EuroSurgical Instruments Paris',
        countryOfOrigin: 'France',
        unit: 'piece',
        purchasePrice: 420000,
        sellingPrice: 580000,
        stock: 7,
        minimumStock: 2,
        lotNumber: 'LOT-AUT-202506',
        manufacturingDate: '2025-06-01',
        expirationDate: '2035-06-01',
        certificationRef: 'CE 0459 - Directive 93/42/CEE',
        storageConditions: 'Endroit ventilé',
        warehouseId: 'wh-alger',
        notes: 'Imprimante thermique intégrée pour rapports de cycle.'
      },
      {
        id: 'prod-007',
        sku: 'PPE-MSK-050',
        barcode: '3614271000107',
        name: 'Masque Chirurgical Type IIR 3 Plis à Lanières/Élastiques (Boîte de 50)',
        category: 'ppe',
        manufacturer: 'Saidal Distribution Algérie',
        countryOfOrigin: 'Algérie',
        unit: 'box',
        purchasePrice: 480,
        sellingPrice: 750,
        stock: 1200,
        minimumStock: 300,
        lotNumber: 'LOT-MSK-202601',
        manufacturingDate: '2026-01-10',
        expirationDate: '2029-01-10',
        certificationRef: 'EN 14683 Type IIR',
        storageConditions: 'Sec < 30°C',
        warehouseId: 'wh-south',
        notes: 'Filtration BFE > 98%, résistance aux éclaboussures.'
      },
      {
        id: 'prod-008',
        sku: 'SUR-KIT-009',
        barcode: '3614271000108',
        name: 'Kit de Suture Chirurgicale Stérile (Fil Résorbable 3/0 Aiguille 26mm)',
        category: 'surgical',
        manufacturer: 'EuroSurgical Instruments Paris',
        countryOfOrigin: 'France',
        unit: 'box',
        purchasePrice: 5400,
        sellingPrice: 7800,
        stock: 85,
        minimumStock: 25,
        lotNumber: 'LOT-SUT-202509',
        manufacturingDate: '2025-09-01',
        expirationDate: '2028-09-01',
        certificationRef: 'CE 0123 / Agrément MSPRH DZ-2025-11',
        storageConditions: 'Température < 25°C',
        warehouseId: 'wh-alger',
        notes: 'Acide polyglycolique (PGA) haute résistance.'
      }
    ];

    // 4. Shipments (Import/Export)
    const shipments = [
      {
        id: 'SHIP-2026-001',
        supplierId: 'sup-cn',
        supplierName: 'Shenzhen MediCare Tech Ltd',
        type: 'import',
        status: 'inTransit',
        currency: 'USD',
        foreignAmount: 28500,
        exchangeRate: 134.20,
        purchaseCostDZD: 3824700,
        freightCost: 310000,
        customsCost: 480000,
        insuranceCost: 95000,
        totalLandedCostDZD: 4709700,
        incoterm: 'CIF',
        expectedArrival: '2026-08-25',
        actualArrival: '',
        documents: ['Facture Pro-forma #SH-2601', 'Packing List', 'Certificat d\'Origine', 'Bill of Lading #BL-99120'],
        notes: '20x Moniteurs Patients + 10x ECG en mer vers Port d\'Alger.'
      },
      {
        id: 'SHIP-2026-002',
        supplierId: 'sup-de',
        supplierName: 'BioMed Diagnostics GmbH',
        type: 'import',
        status: 'customsClearance',
        currency: 'EUR',
        foreignAmount: 14200,
        exchangeRate: 145.50,
        purchaseCostDZD: 2066100,
        freightCost: 180000,
        customsCost: 320000,
        insuranceCost: 65000,
        totalLandedCostDZD: 2631100,
        incoterm: 'FOB',
        expectedArrival: '2026-08-14',
        actualArrival: '2026-08-11',
        documents: ['Facture Commerciale #BM-0988', 'Certificat Conformité CE', 'Déclaration en Douane D10'],
        notes: 'Dédouanement en cours au Port d\'Alger (Zone Sous-Douane).'
      },
      {
        id: 'SHIP-2026-003',
        supplierId: 'sup-fr',
        supplierName: 'EuroSurgical Instruments Paris',
        type: 'import',
        status: 'received',
        currency: 'EUR',
        foreignAmount: 32000,
        exchangeRate: 145.50,
        purchaseCostDZD: 4656000,
        freightCost: 290000,
        customsCost: 610000,
        insuranceCost: 110000,
        totalLandedCostDZD: 5666000,
        incoterm: 'DDP',
        expectedArrival: '2026-07-28',
        actualArrival: '2026-07-28',
        documents: ['Bon de Réception BR-0032', 'Attestation de Garantie'],
        notes: 'Stérilisateurs Autoclaves livrés au Dépôt Central Alger.'
      }
    ];

    // 5. Tenders (Appels d'Offres - Public/Private Consultations)
    const tenders = [
      {
        id: 'AO-2026-CHU-01',
        title: 'Acquisition de Moniteurs Multiparamétriques & Équipements de Réanimation',
        issuingOrganization: 'CHU Mustapha Pacha - Alger',
        category: 'diagnostic',
        estimatedValue: 18500000,
        submissionDeadline: '2026-09-15',
        openingDate: '2026-09-18',
        status: 'submitted',
        linkedProductIds: ['prod-001', 'prod-002'],
        documents: [
          { name: 'Cahier des Charges CHU Mustapha.pdf', status: 'ready' },
          { name: 'Offre Technique SARI.pdf', status: 'ready' },
          { name: 'Offre Financière & Soumission.pdf', status: 'ready' },
          { name: 'Caution de Soumission (1%).pdf', status: 'ready' }
        ],
        notes: 'Soumission déposée le 10/08/2026 au bureau des marchés publics CHU Alger.'
      },
      {
        id: 'AO-2026-DSP-04',
        title: 'Fourniture de Consommables Médicaux Stériles & EPI Année 2026/2027',
        issuingOrganization: 'Direction de la Santé et de la Population (DSP) - Blida',
        category: 'consumables',
        estimatedValue: 7200000,
        submissionDeadline: '2026-08-30',
        openingDate: '2026-09-02',
        status: 'inPreparation',
        linkedProductIds: ['prod-003', 'prod-004', 'prod-007'],
        documents: [
          { name: 'Cahier des Charges DSP Blida.pdf', status: 'ready' },
          { name: 'Fiches Techniques Consommables.pdf', status: 'ready' },
          { name: 'Agrément MSPRH à jour.pdf', status: 'ready' },
          { name: 'Bordereau des Prix Unitaires (BPU).pdf', status: 'in_progress' }
        ],
        notes: 'Marge bénéficiaire cible: 24%. Préparation en cours.'
      },
      {
        id: 'AO-2025-EHS-09',
        title: 'Équipement de Stérilisation et Mobilier pour Bloc Opératoire',
        issuingOrganization: 'EHS Pierre et Marie Curie (CPMC) - Alger',
        category: 'sterilization',
        estimatedValue: 12400000,
        submissionDeadline: '2025-11-15',
        openingDate: '2025-11-20',
        status: 'won',
        linkedProductIds: ['prod-005', 'prod-006'],
        documents: [
          { name: 'Attestation Attribution Marché #2025-99.pdf', status: 'ready' },
          { name: 'Ordre de Service (ODS).pdf', status: 'ready' }
        ],
        notes: 'Appel d\'offres remporté avec succès ! Livraisons cadencées sur 4 trimestres.'
      },
      {
        id: 'AO-2026-MIL-02',
        title: 'Consultation Privée - Mobilier et Chariots Médicaux pour Hôpital Central de l\'Armée',
        issuingOrganization: 'Hôpital Central de l\'Armée (HCA) - Aïn Naadja',
        category: 'furniture',
        estimatedValue: 9800000,
        submissionDeadline: '2026-09-28',
        openingDate: '2026-10-01',
        status: 'watching',
        linkedProductIds: ['prod-005'],
        documents: [
          { name: 'Avis de Consultation #HCA-02.pdf', status: 'ready' }
        ],
        notes: 'Analyse de faisabilité. Compétitivité forte sur le mobilier.'
      }
    ];

    // 6. Customers
    const customers = [
      {
        id: 'cust-chu-alger',
        name: 'CHU Mustapha Pacha Alger',
        type: 'public_hospital',
        wilaya: '16',
        contactInfo: 'Direction des Équipements | Place du 1er Mai, 16000 Alger | +213 21 23 45 67',
        taxId: 'NIF: 000016001234567 / RC: 16-A-098712',
        paymentTerms: 'Virement Trésor Public - 60 Jours',
        creditLimit: 30000000,
        notes: 'Client institutionnel prioritaire.'
      },
      {
        id: 'cust-pharma-oran',
        name: 'Pharmacie Centrale El-Shifa (Dr. Benali)',
        type: 'pharmacy',
        wilaya: '31',
        contactInfo: 'Dr. Benali Ahmed | Rue Larbi Ben M\'hidi, 31000 Oran | +213 41 33 22 11',
        taxId: 'NIF: 000031009876543 / RC: 31-B-334455',
        paymentTerms: 'Chèque / Espèces - 30 Jours',
        creditLimit: 5000000,
        notes: 'Commandes régulières de seringues et gants en nitrile.'
      },
      {
        id: 'cust-clin-const',
        name: 'Clinique Privée Ibn Sina',
        type: 'private_clinic',
        wilaya: '25',
        contactInfo: 'Service Achats | Cité Zouaghi, 25000 Constantine | +213 31 66 55 44',
        taxId: 'NIF: 000025001122334 / RC: 25-C-998877',
        paymentTerms: 'Virement Bancaire - 15 Jours',
        creditLimit: 8000000,
        notes: 'Clinique de chirurgie cardiaque et orthopédie.'
      },
      {
        id: 'cust-dsp-setif',
        name: 'Direction de la Santé (DSP) de la Wilaya de Sétif',
        type: 'government',
        wilaya: '19',
        contactInfo: 'Bureau des Marchés Publics | Rue de l\'ALN, Sétif',
        taxId: 'NIF: 000019000000999',
        paymentTerms: 'Mandat Administratif Trésor Public',
        creditLimit: 25000000,
        notes: 'Contrat cadre en cours pour EPI et petit équipement.'
      }
    ];

    // 7. Sales / Orders (POS + B2B)
    const orders = [
      {
        id: 'ORD-2026-001',
        customerId: 'cust-chu-alger',
        customerName: 'CHU Mustapha Pacha Alger',
        warehouseId: 'wh-alger',
        items: [
          { productId: 'prod-001', name: 'Moniteur Patient Multiparamétrique CE/ISO', qty: 10, unitPrice: 185000, total: 1850000 },
          { productId: 'prod-005', name: 'Lit d\'Hospitalisation Électrique 3 Fonctions', qty: 5, unitPrice: 245000, total: 1225000 }
        ],
        subtotal: 3075000,
        taxAmount: 584250, // 19% TVA
        total: 3659250,
        paymentMethod: 'bank_transfer',
        status: 'delivered',
        createdAt: '2026-08-05T10:30:00.000Z',
        notes: 'Bon de Livraison BL-2608-001 émis. En attente de paiement du trésor.'
      },
      {
        id: 'ORD-2026-002',
        customerId: 'cust-pharma-oran',
        customerName: 'Pharmacie Centrale El-Shifa (Dr. Benali)',
        warehouseId: 'wh-oran',
        items: [
          { productId: 'prod-003', name: 'Seringues Stériles 5ml à Usage Unique (Boîte)', qty: 50, unitPrice: 1950, total: 97500 },
          { productId: 'prod-004', name: 'Gants d\'Examen en Nitrile Non-Poudrés (Boîte)', qty: 30, unitPrice: 2400, total: 72000 }
        ],
        subtotal: 169500,
        taxAmount: 32205, // 19% TVA
        total: 201705,
        paymentMethod: 'check',
        status: 'paid',
        createdAt: '2026-08-09T14:15:00.000Z',
        notes: 'Chèque BNA encaissé le 10/08/2026.'
      },
      {
        id: 'ORD-2026-003',
        customerId: 'cust-clin-const',
        customerName: 'Clinique Privée Ibn Sina',
        warehouseId: 'wh-alger',
        items: [
          { productId: 'prod-002', name: 'Électrocardiographe (ECG) 12 Pistes Numérique', qty: 2, unitPrice: 295000, total: 590000 }
        ],
        subtotal: 590000,
        taxAmount: 112100, // 19% TVA
        total: 702100,
        paymentMethod: 'bank_transfer',
        status: 'confirmed',
        createdAt: '2026-08-11T09:00:00.000Z',
        notes: 'Préparation d\'expédition par transporteur sanitaire vers Constantine.'
      }
    ];

    // 8. Notifications
    const notifications = [
      {
        id: 'notif-01',
        type: 'near_expiry',
        title: 'Alerte Péremption Proche - Consommables',
        message: 'Produit [CON-SER-005] Seringues Stériles 5ml (Lot LOT-SER-2026-A) expire dans moins de 30 jours !',
        isRead: false,
        createdAt: '2026-08-11T08:00:00.000Z'
      },
      {
        id: 'notif-02',
        type: 'tender_deadline',
        title: 'Échéance Appel d\'Offres Proche',
        message: 'L\'appel d\'offres [AO-2026-DSP-04] DSP Blida doit être soumissionné avant le 30/08/2026.',
        isRead: false,
        createdAt: '2026-08-10T11:20:00.000Z'
      },
      {
        id: 'notif-03',
        type: 'shipment',
        title: 'Expédition en Dédouanement - Port d\'Alger',
        message: 'La shchune [SHIP-2026-002] BioMed Diagnostics est arrivée en douane. Documents D10 requis.',
        isRead: true,
        createdAt: '2026-08-09T16:45:00.000Z'
      }
    ];

    // 9. Settings
    const settings = {
      id: 'app-settings',
      language: 'fr', // Default French LTR, can switch to AR RTL or EN LTR
      theme: 'light',
      currency: 'DZD',
      taxRate: 0.19,
      companyName: 'SARI Système',
      defaultWarehouseId: 'wh-alger'
    };

    // 10. Audit Logs
    const auditLogs = [
      {
        id: 'audit-001',
        user: 'Administrator',
        role: 'admin',
        action: 'INIT_SYSTEM',
        module: 'System',
        description: 'Initialisation du système SARI Système et chargement des données de référence Algérie.',
        timestamp: '2026-08-01T08:00:00.000Z'
      },
      {
        id: 'audit-002',
        user: 'Tenders Manager',
        role: 'tenders',
        action: 'SUBMIT_TENDER',
        module: 'Tenders',
        description: 'Dépôt officiel du dossier de soumission pour l\'appel d\'offres AO-2026-CHU-01 au CHU Mustapha Pacha.',
        timestamp: '2026-08-10T10:15:00.000Z'
      },
      {
        id: 'audit-003',
        user: 'Import Manager',
        role: 'import_export',
        action: 'UPDATE_SHIPMENT',
        module: 'ImportExport',
        description: 'Mise à jour du statut dédouanement pour l\'expédition SHIP-2026-002 (BioMed Diagnostics GmbH).',
        timestamp: '2026-08-11T08:45:00.000Z'
      }
    ];

    // Save all to IndexedDB
    for (const w of warehouses) await this.save('warehouses', w);
    for (const s of suppliers) await this.save('suppliers', s);
    for (const p of products) await this.save('products', p);
    for (const sh of shipments) await this.save('shipments', sh);
    for (const t of tenders) await this.save('tenders', t);
    for (const c of customers) await this.save('customers', c);
    for (const o of orders) await this.save('orders', o);
    for (const n of notifications) await this.save('notifications', n);
    for (const l of auditLogs) await this.save('auditLogs', l);
    await this.save('settings', settings);

    console.log('[SariDB] Demo dataset seeded successfully with Algerian medical distribution context!');
    return true;
  }
}

const sariDB = new SariDB();
if (typeof window !== 'undefined') {
  window.sariDB = sariDB;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SariDB, sariDB };
}
