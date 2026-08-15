/**
 * SARI Système - IndexedDB Database Engine & Demo Dataset
 * Implements complete schema for Products, Warehouses, Suppliers, Shipments,
 * Tenders, Customers, Sales/Orders, Notifications, Settings, AuditLogs, and SyncQueue.
 */

class SariDB {
  constructor(dbName = 'SariSystemeDB', version = 16) {
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
          'careerRecords',
          'purchaseDocuments',
          'documentLinks',
          'paymentMethods',
          'banks',
          'bankAccounts',
          'coupons',
          'referrals',
          'taxRecords',
          'g50Payments',
          'attendance',
          'performanceRecords',
          'salaryHistory',
          'taskHistory',
          'clientTypes', 'supplierTypes', 'bankTypes', 'countries', 'productCategories',
          'salesStages', 'productLots', 'stockMovements', 'inventoryCounts',
          'importProfiles', 'apiTokens', 'apiEndpoints', 'logisticsStatuses', 'incoterms', 'paymentTransactions', 'reportAnnotations',
          'entityTranslations', 'translationTexts', 'gedCategories', 'gedModules', 'gedTags', 'gedTypes', 'configurableOptions', 'userProfiles', 'recordSequences', 'barcodeLabelSettings'
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
            } else if (storeName === 'careerRecords' || storeName === 'attendance' || storeName === 'performanceRecords' || storeName === 'salaryHistory') {
              store.createIndex('employeeId', 'employeeId', { unique: false });
            } else if (storeName === 'taskHistory') {
              store.createIndex('taskId', 'taskId', { unique: false });
            } else if (storeName === 'paymentTransactions') {
              store.createIndex('partnerId','partnerId',{unique:false});
            } else if (storeName === 'entityTranslations') {
              store.createIndex('entityKey','entityKey',{unique:false});
            } else if (storeName === 'translationTexts') {
              store.createIndex('scope','scope',{unique:false});store.createIndex('language','language',{unique:false});
            } else if (storeName === 'configurableOptions') {
              store.createIndex('listKey','listKey',{unique:false});
            } else if (storeName === 'productLots' || storeName === 'stockMovements') {
              store.createIndex('productId', 'productId', { unique: false });
            } else if (storeName === 'inventoryCounts') {
              store.createIndex('warehouseId', 'warehouseId', { unique: false });
            } else if (storeName === 'purchaseDocuments') {
              store.createIndex('supplierId', 'supplierId', { unique: false });
              store.createIndex('documentType', 'documentType', { unique: false });
            } else if (storeName === 'documentLinks') {
              store.createIndex('sourceId', 'sourceId', { unique: false });
              store.createIndex('targetId', 'targetId', { unique: false });
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
        const paymentCount = await this.count('paymentMethods');
        if (paymentCount === 0) await this.seedBusinessData();
        const masterCount = await this.count('clientTypes');
        if (masterCount === 0) await this.seedConfigurationData();
        else if (await this.count('logisticsStatuses') === 0) await this.seedConfigurationData();
        if (await this.count('countries') < 200 && globalThis.SARI_COUNTRIES) for (const country of globalThis.SARI_COUNTRIES) await this.save('countries',country);
        if (await this.count('paymentTransactions') === 0) await this.seedPaymentTransactions();
        if (!await this.getById('orders','order-multipage-sample')) await this.seedMultiPageInvoice();
        if (!await this.getById('documentTemplates','tpl-ready-html') && globalThis.TemplateEngine) await this.save('documentTemplates',{id:'tpl-ready-html',name:'HTML Professionnel',type:'all',paperFormat:'A4',accent:'#009CC5',layout:'html',templateMode:'html',htmlContent:TemplateEngine.defaultHtml(),versions:[]});if (!await this.getById('documentTemplates','tpl-ready-vat') && globalThis.TemplateEngine) await this.save('documentTemplates',{id:'tpl-ready-vat',name:'Facture TVA par article',type:'invoice',paperFormat:'A4',accent:'#009CC5',layout:'html',templateMode:'html',htmlContent:'<div style="font-family:Arial;padding:12mm"><header class="document-print-header" style="display:flex;justify-content:space-between;border-bottom:3px solid #009CC5"><div><h1>{{company.name}}</h1><p>{{company.address}}</p></div><div style="text-align:right"><h2>{{document.title}}</h2><b>{{document.reference}}</b><p>{{document.date}}</p></div></header><section style="padding:12px;background:#f8fafc;margin:18px 0"><h3>{{partner.name}}</h3><p>{{partner.details}}</p></section><h3 style="font-size:13px;margin:12px 0 6px">Détail des lignes (TVA par article)</h3>{{lineItemsVatTable}}<div style="display:flex;justify-content:space-between;margin-top:18px"><div style="width:52%"><h3 style="font-size:12px">Ventilation TVA</h3>{{vatBreakdownTable}}</div><div style="width:42%">{{totalsTable}}</div></div><p>{{amountInWords}}</p><footer style="display:flex;justify-content:space-between;margin-top:24px"><div>{{verificationUrl}}</div><div>{{document.barcode}}</div><div>{{document.qr}}</div></footer></div>',versions:[]});
        if (await this.count('gedCategories') === 0 || await this.count('gedTypes') === 0 || !await this.getById('configurableOptions','documentStatus-quoted')) await this.seedTranslationData();
        await this.seedTranslationTexts();
        if(!await this.getById('barcodeLabelSettings','default'))await this.save('barcodeLabelSettings',{id:'default',name:'Étiquette produit standard',showProductName:true,showSku:true,showCategory:true,showLot:true,showExpiry:true,showCertification:true,showWarehouse:true,showPrice:true,showOrigin:true,showBarcode:true,showQr:true,includeHash:true,qrPattern:'http://sari-systeme.com/verification/{code}/{hash}',updatedAt:new Date().toISOString()});else{const bc=await this.getById('barcodeLabelSettings','default');if(!bc.qrPattern){bc.qrPattern='http://sari-systeme.com/verification/{code}/{hash}';await this.rawPut('barcodeLabelSettings',bc);}}
        await this.ensureSariReferencePrefixes();
        await this.ensureTemplateTranslations();
        await this.ensureEnhancement222Data();
        await this.backfillNumericIdsAndReferences();
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[SariDB] IndexedDB initialization error:', event.target.error);
        reject(event.target.error);
      };
    });

    return this.initPromise;
  }

  async rawGetAll(storeName){return new Promise((resolve,reject)=>{const request=this.db.transaction([storeName],'readonly').objectStore(storeName).getAll();request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>reject(request.error);});}
  async rawPut(storeName,data){return new Promise((resolve,reject)=>{const request=this.db.transaction([storeName],'readwrite').objectStore(storeName).put(data);request.onsuccess=()=>resolve(data);request.onerror=()=>reject(request.error);});}
  async nextNumericId(storeName){return new Promise((resolve,reject)=>{const tx=this.db.transaction(['recordSequences'],'readwrite'),store=tx.objectStore('recordSequences'),get=store.get(storeName);get.onsuccess=()=>{const value=Number(get.result?.value||0)+1;store.put({id:storeName,value,updatedAt:new Date().toISOString()});resolve(value);};get.onerror=()=>reject(get.error);});}
  async referenceDefinition(storeName,record){let code='',context={recordId:record.numericId};if(storeName==='products'){code='PRO';const category=record.category?await this.getById('productCategories',record.category):null;context.subType=category?.code||'01';}else if(storeName==='suppliers'){code='FOU';context.subType=['international','manufacturer'].includes(record.type)?'04':record.type==='local'?'02':'03';}else if(storeName==='banks'){code='BAN';context.subType='01';}else if(storeName==='bankAccounts'){code='BAN';const bankType=record.accountType?await this.getById('bankTypes',record.accountType):null;context.subType=bankType?.code||({bank:'01',cash:'02',online:'03'}[record.accountType]||'01');}else if(storeName==='customers'){code='CLI';context.subType=['public_hospital','government'].includes(record.type)?'01':['private_clinic','pharmacy'].includes(record.type)?'02':'03';}else if(storeName==='shipments'){code=record.type==='export'?'EXP':'IMP';context.country=record.partnerCountryCode||'DZA';}else if(storeName==='tenders'){code='CON';context.date=record.submissionDeadline;}else if(storeName==='orders')code=({invoice:'FAV',quote:'DVV',purchase_order:'BCV',delivery_note:'LIV'})[record.documentType]||'FAV';else if(storeName==='purchaseDocuments')code=({purchase_invoice:'FAC',purchase_quote:'DVA',goods_receipt:'REC',purchase_order:'BCA'})[record.documentType]||'FAC';else if(storeName==='jobPostings'){code='JOB';context.date=record.publishedAt||record.createdAt;}else if(storeName==='employees'){code='EMP';context.date=record.hireDate;}else if(storeName==='missions'){code='MIS';context.date=record.startDate;}else if(storeName==='documentTemplates'){code='TEM';context.templateType=({invoice:'FAV',quote:'DVV',purchase_order:'BCA',delivery_note:'LIV'})[record.type]||'DOC';}else if(storeName==='taxRecords'){code=record.type==='G50'?'G50':record.type==='IBS'?'FIS':'RAP';context.date=String(record.period||'').length===7?record.period+'-01':undefined;}else if(storeName==='stockMovements')code=record.type==='out'?'STS':'STE';else if(storeName==='inventoryCounts')code='INV';else if(storeName==='paymentTransactions')code=record.direction==='out'?'CHA':'REV';return code?{code,context}:null;}
  async applyDerivedReference(storeName,record){if(!record.numericId||!globalThis.ReferenceCodeManager)return record;const definition=await this.referenceDefinition(storeName,record);if(!definition)return record;const mask=await this.getById('documentCodes',definition.code);if(mask)record.referenceCode=ReferenceCodeManager.render(mask,record.numericId,{...definition.context,recordId:record.numericId});return record;}
  async ensureTemplateTranslations(){const presets={'doc-tpl-classic':{fr:'SARI Classique',ar:'ساري كلاسيكي',en:'SARI Classic'},'doc-tpl-clinical':{fr:'SARI Clinique',ar:'ساري طبي',en:'SARI Clinical'},'tpl-ready-modern':{fr:'Médical moderne',ar:'طبي عصري',en:'Modern Medical'},'tpl-ready-compact':{fr:'Institution compact',ar:'مؤسسة مختصرة',en:'Compact Institution'},'tpl-ready-letter':{fr:'International Letter',ar:'دولي Letter',en:'International Letter'},'tpl-ready-html':{fr:'HTML Professionnel',ar:'HTML احترافي',en:'Professional HTML'},'tpl-ready-vat':{fr:'Facture TVA par article',ar:'فاتورة بالضريبة لكل صنف',en:'Per-Item VAT Invoice'}};for(const template of await this.getAll('documentTemplates')){if(!template.nameI18n)template.nameI18n=presets[template.id]||{fr:template.name,ar:template.name,en:template.name};await this.rawPut('documentTemplates',template);}}
  async ensureEnhancement222Data(){
    const purchaseStages=[
      {id:'purchaseStage-quote',listKey:'purchaseStage',value:'quote',name:{fr:'Devis',ar:'عرض سعر',en:'Quote'},color:'#64748B',order:1,isActive:true},
      {id:'purchaseStage-order',listKey:'purchaseStage',value:'order',name:{fr:'Commande',ar:'طلبية',en:'Order'},color:'#EBB51A',order:2,isActive:true},
      {id:'purchaseStage-receipt',listKey:'purchaseStage',value:'receipt',name:{fr:'Réception',ar:'استلام',en:'Goods receipt'},color:'#C6DA34',order:3,isActive:true},
      {id:'purchaseStage-invoice',listKey:'purchaseStage',value:'invoice',name:{fr:'Facture',ar:'فاتورة',en:'Invoice'},color:'#009CC5',order:4,isActive:true},
      {id:'purchaseStage-payment',listKey:'purchaseStage',value:'payment',name:{fr:'Paiement',ar:'دفع',en:'Payment'},color:'#8B5CF6',order:5,isActive:true}
    ];
    for(const stage of purchaseStages)if(!await this.getById('configurableOptions',stage.id))await this.save('configurableOptions',stage);
    const inspectionOffices=[
      {id:'taxInspectionOffice-alger-est',listKey:'taxInspectionOffice',value:'alger-est',code:'DIW-16E',name:{fr:'Inspection des impôts Alger Est',ar:'مفتشية الضرائب الجزائر شرق',en:'Algiers East Tax Inspection'},address:'Bab Ezzouar, Alger',wilaya:'16',order:1,isActive:true},
      {id:'taxInspectionOffice-alger-centre',listKey:'taxInspectionOffice',value:'alger-centre',code:'DIW-16C',name:{fr:'Inspection des impôts Alger Centre',ar:'مفتشية الضرائب الجزائر وسط',en:'Algiers Centre Tax Inspection'},address:'Alger Centre',wilaya:'16',order:2,isActive:true},
      {id:'taxInspectionOffice-oran',listKey:'taxInspectionOffice',value:'oran',code:'DIW-31',name:{fr:'Inspection des impôts Oran',ar:'مفتشية الضرائب وهران',en:'Oran Tax Inspection'},address:'Oran',wilaya:'31',order:3,isActive:true}
    ];
    for(const office of inspectionOffices)if(!await this.getById('configurableOptions',office.id))await this.save('configurableOptions',office);
    if(!await this.getById('documentTemplates','doc-tpl-sari-total'))await this.save('documentTemplates',{
      id:'doc-tpl-sari-total',name:'SARI Total',nameI18n:{fr:'SARI Total',ar:'ساري الإجمالي',en:'SARI Total'},type:'invoice',paperFormat:'A4',accent:'#009CC5',layout:'designer',templateMode:'designer',isDefault:false,
      lineItemsColumns:['index','designation','qty','price','discountAmount','vat','ht','ttc'],versions:[],
      elements:[
        {id:'total-logo',kind:'field',field:'documentLogo',content:'SARI LOGO',x:35,y:30,w:160,h:70},
        {id:'total-number',kind:'field',field:'documentNumber',content:'Référence',x:510,y:35,w:245,h:45},
        {id:'total-date',kind:'field',field:'documentDate',content:'Date',x:510,y:85,w:245,h:35},
        {id:'total-client',kind:'field',field:'customerName',content:'Client',x:35,y:140,w:430,h:60,background:'#f8fafc',borderColor:'#009CC5'},
        {id:'total-lines',kind:'field',field:'lineItemsConfigurable',content:'Table lignes configurable',x:35,y:230,w:720,h:390},
        {id:'total-vat',kind:'field',field:'vatBreakdown',content:'Ventilation TVA',x:35,y:650,w:330,h:110},
        {id:'total-summary',kind:'field',field:'totals',content:'TOTAL TTC',x:500,y:650,w:255,h:110,background:'#e6f7fb'},
        {id:'total-words',kind:'field',field:'amountInWords',content:'Montant en lettres',x:35,y:785,w:500,h:65},
        {id:'total-qr',kind:'field',field:'qrCode',content:'QR vérification',x:35,y:885,w:105,h:105},
        {id:'total-barcode',kind:'field',field:'barcode',content:'Code-barres',x:165,y:910,w:220,h:60}
      ]
    });
  }
  async ensureSariReferencePrefixes(){const labels={FAV:{fr:'Facture vente',ar:'فاتورة بيع',en:'Sales invoice'},FAC:{fr:'Facture achat',ar:'فاتورة شراء',en:'Purchase invoice'},DVV:{fr:'Devis vente',ar:'عرض سعر بيع',en:'Sales quote'},DVA:{fr:'Devis achat',ar:'عرض سعر شراء',en:'Purchase quote'},BCV:{fr:'Commande vente',ar:'طلبية بيع',en:'Sales order'},BCA:{fr:'Commande achat',ar:'طلبية شراء',en:'Purchase order'},LIV:{fr:'Bon de livraison',ar:'وصل تسليم',en:'Delivery note'},REC:{fr:'Bon de réception',ar:'وصل استلام',en:'Goods receipt'}};if(!await this.getById('documentCodes','JOB'))await this.save('documentCodes',{id:'JOB',code:'JOB',designation:'Offre d’emploi',designationI18n:{fr:'Offre d’emploi',ar:'عرض عمل',en:'Job posting'},description:'Recruitment job posting',mask:'SARI-JOB{YY}-{SEQ}',example:'SARI-JOB26-00001',maskType:'Standard',sequenceMinDigits:5,resetFrequency:'yearly',isActive:true,subTypeOptions:[]});for(const definition of await this.getAll('documentCodes')){if(labels[definition.code])definition.designationI18n={...(definition.designationI18n||{}),...labels[definition.code]};if(!String(definition.mask||'').startsWith('SARI-')){definition.mask=`SARI-${definition.mask}`;definition.example=definition.example?.startsWith('SARI-')?definition.example:`SARI-${definition.example||definition.code}`;}await this.rawPut('documentCodes',definition);}}
  async backfillNumericIdsAndReferences(){const stores=Array.from(this.db.objectStoreNames).filter(name=>!['recordSequences'].includes(name));for(const storeName of stores){const rows=await this.rawGetAll(storeName);let next=Math.max(0,...rows.map(row=>Number(row.numericId)||0))+1;for(const row of rows){if(!Number.isInteger(row.numericId)||row.numericId<1)row.numericId=next++;await this.applyDerivedReference(storeName,row);await this.rawPut(storeName,row);}await this.rawPut('recordSequences',{id:storeName,value:Math.max(0,next-1),updatedAt:new Date().toISOString()});}}

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
    if(storeName!=='recordSequences'){if(!Number.isInteger(data.numericId)||data.numericId<1)data.numericId=await this.nextNumericId(storeName);await this.applyDerivedReference(storeName,data);}
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = async () => {if(window.dbAdapter?.currentDriver!=='indexeddb'&&window.dbAdapter?.driverConfig?.serverManaged&&!window.syncController?.suppressBridge&&window.SariCore?.db?.isExternalSyncStore(storeName)!==false)await window.syncController?.enqueueExternalOnly(storeName,'save',data);resolve(data);};
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, id) {
    await this.init();
    const existing=await this.getById(storeName,id);
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = async () => {if(existing&&window.dbAdapter?.currentDriver!=='indexeddb'&&window.dbAdapter?.driverConfig?.serverManaged&&!window.syncController?.suppressBridge&&window.SariCore?.db?.isExternalSyncStore(storeName)!==false)await window.syncController?.enqueueExternalOnly(storeName,'delete',{id,numericId:existing.numericId});resolve(true);};
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
      'vatRates', 'documentCodes', 'sequenceCounters', 'conversations', 'messages', 'careerRecords',
      'purchaseDocuments', 'documentLinks', 'paymentMethods', 'banks', 'bankAccounts', 'coupons', 'referrals',
      'taxRecords', 'g50Payments', 'attendance', 'performanceRecords', 'salaryHistory', 'taskHistory',
      'clientTypes', 'supplierTypes', 'bankTypes', 'countries', 'productCategories', 'salesStages',
      'productLots', 'stockMovements', 'inventoryCounts', 'importProfiles', 'apiTokens', 'apiEndpoints', 'logisticsStatuses', 'incoterms', 'paymentTransactions', 'reportAnnotations', 'entityTranslations', 'translationTexts', 'gedCategories', 'gedModules', 'gedTags', 'gedTypes', 'configurableOptions', 'userProfiles', 'barcodeLabelSettings'
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

  async exportSQL() {
    await this.init();const stores=Array.from(this.db.objectStoreNames).filter(name=>!['recordSequences'].includes(name)),escape=value=>String(value??'').replace(/\\/g,'\\\\').replace(/'/g,"''").replace(/\0/g,'');let sql=`-- SARI Système complete MySQL dump\n-- Generated ${new Date().toISOString()}\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n`;
    for(const storeName of stores){const table=`sari_${storeName.replace(/([a-z])([A-Z])/g,'$1_$2').replace(/[^a-z0-9_]/gi,'_').toLowerCase()}`,rows=await this.getAll(storeName);sql+=`DROP TABLE IF EXISTS \`${table}\`;\nCREATE TABLE \`${table}\` (\n  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\n  \`legacy_uid\` VARCHAR(255) NULL,\n  \`reference_code\` VARCHAR(180) NULL,\n  \`payload_json\` JSON NOT NULL,\n  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (\`id\`), UNIQUE KEY \`uq_${table}_legacy_uid\` (\`legacy_uid\`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n`;
      if(rows.length){const values=rows.map(row=>`(${Number(row.numericId)||'NULL'},'${escape(row.id)}',${row.referenceCode?`'${escape(row.referenceCode)}'`:'NULL'},'${escape(JSON.stringify(row))}')`);sql+=`INSERT INTO \`${table}\` (\`id\`,\`legacy_uid\`,\`reference_code\`,\`payload_json\`) VALUES\n${values.join(',\n')};\n`; }sql+='\n';
    }return sql+'SET FOREIGN_KEY_CHECKS=1;\n';
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

  async seedTranslationTexts(){const hash=value=>{let h=5381;for(const char of value)h=((h<<5)+h)^char.charCodeAt(0);return(h>>>0).toString(36);};for(const [language,values] of Object.entries(TRANSLATIONS))for(const [key,value] of Object.entries(values)){const id=`ui:${key}:${language}`;if(!await this.getById('translationTexts',id))await this.save('translationTexts',{id,scope:'ui',translationKey:key,sourceText:TRANSLATIONS.fr[key]||value,language,value,updatedAt:new Date().toISOString()});}if(globalThis.UICopy)for(const [source,values] of Object.entries(UICopy.phrases))for(const language of ['fr','ar','en']){const value=language==='fr'?source:values[language];if(!value)continue;const id=`copy:${hash(source)}:${language}`;if(!await this.getById('translationTexts',id))await this.save('translationTexts',{id,scope:'copy',translationKey:hash(source),sourceText:source,language,value,updatedAt:new Date().toISOString()});}}

  async seedTranslationData() {
    const name=(fr,ar,en)=>({fr,ar,en});
    const categories=[['invoices','Factures & commandes','الفواتير والطلبيات','Invoices & orders'],['imports','Importations','الواردات','Imports'],['exports','Exportations','الصادرات','Exports'],['fiscal','Fiscalité','الجباية','Tax & fiscal'],['consultations','Consultations','الاستشارات','Consultations'],['hr','Ressources humaines','الموارد البشرية','Human resources'],['other','Autres documents','وثائق أخرى','Other documents']].map(([id,fr,ar,en],order)=>({id,code:id,name:name(fr,ar,en),order,isActive:true}));
    const modules=[['order','Ventes / factures','المبيعات / الفواتير','Sales / invoices'],['purchaseDocument','Achats','المشتريات','Purchases'],['shipmentImport','Import','الاستيراد','Import'],['shipmentExport','Export','التصدير','Export'],['taxRecord','Fiscalité','الجباية','Tax'],['tender','Consultations','الاستشارات','Tenders'],['employee','Employés','الموظفون','Employees'],['mission','Missions','المهمات','Missions'],['candidate','Recrutement','التوظيف','Recruitment'],['bankAccount','Banques','البنوك','Banking']].map(([id,fr,ar,en],order)=>({id,code:id,name:name(fr,ar,en),order,isActive:true}));
    const tags=[['draft','Brouillon','مسودة','Draft'],['approved','Approuvé','موافق عليه','Approved'],['paid','Payé','مدفوع','Paid'],['closed','Clôturé','مغلق','Closed'],['urgent','Urgent','عاجل','Urgent'],['certification','Certification','شهادة','Certification'],['contract','Contrat','عقد','Contract']].map(([id,fr,ar,en],order)=>({id,code:id,name:name(fr,ar,en),order,isActive:true}));
    const types=[['other','Autre document','وثيقة أخرى','Other document'],['contract','Contrat','عقد','Contract'],['certification','Certification','شهادة','Certification'],['invoice','Facture','فاتورة','Invoice'],['identity','Pièce d’identité','وثيقة هوية','Identity document'],['diploma','Diplôme','شهادة دراسية','Diploma'],['tender_spec','Cahier des charges','دفتر الشروط','Tender specification'],['payment_proof','Preuve de paiement','إثبات الدفع','Payment proof'],['report','Rapport','تقرير','Report']].map(([id,fr,ar,en],order)=>({id,code:id,name:name(fr,ar,en),order,isActive:true}));
    for(const row of categories)await this.save('gedCategories',row);for(const row of modules)await this.save('gedModules',row);for(const row of tags)await this.save('gedTags',row);for(const row of types)await this.save('gedTypes',row);
    const lists={documentStatus:[['draft','Brouillon','مسودة','Draft'],['approved','Approuvé','موافق عليه','Approved'],['received','Réceptionné','مستلم','Received'],['quoted','Devis émis','تم إصدار العرض','Quoted'],['confirmed','Confirmé','مؤكد','Confirmed'],['delivered','Livré','تم التسليم','Delivered'],['invoiced','Facturé','تمت الفوترة','Invoiced'],['paid','Payé','مدفوع','Paid'],['closed','Clôturé','مغلق','Closed']],taskPriority:[['low','Faible','منخفض','Low'],['normal','Normale','عادي','Normal'],['high','Haute','مرتفع','High'],['urgent','Urgente','عاجل','Urgent']],missionStatus:[['planned','Planifiée','مخططة','Planned'],['approved','Approuvée','موافق عليها','Approved'],['in_progress','En cours','قيد التنفيذ','In progress'],['completed','Terminée','منتهية','Completed']],candidateStage:[['applied','Candidature','ترشح','Applied'],['interviewing','Entretien','مقابلة','Interviewing'],['offer','Offre','عرض','Offer'],['hired','Recruté','تم التوظيف','Hired'],['rejected','Refusé','مرفوض','Rejected']],contractType:[['CDI','CDI','عقد دائم','Permanent'],['CDD','CDD','عقد محدد','Fixed-term'],['internship','Stage','تربص','Internship']],taxStatus:[['draft','Brouillon','مسودة','Draft'],['submitted','Déposé','مودع','Submitted'],['paid','Payé','مدفوع','Paid'],['closed','Clôturé','مغلق','Closed']]};
    for(const [listKey,rows] of Object.entries(lists))for(const [value,fr,ar,en] of rows)await this.save('configurableOptions',{id:`${listKey}-${value}`,listKey,value,name:name(fr,ar,en),isActive:true,order:rows.findIndex(x=>x[0]===value)});
  }

  async seedConfigurationData() {
    const localized = (fr, ar, en) => ({ fr, ar, en });
    const clientTypes = [
      {id:'public_hospital',code:'01',name:localized('Hôpital public','مستشفى عمومي','Public hospital'),isActive:true},
      {id:'private_clinic',code:'02',name:localized('Clinique privée','عيادة خاصة','Private clinic'),isActive:true},
      {id:'pharmacy',code:'02',name:localized('Pharmacie','صيدلية','Pharmacy'),isActive:true},
      {id:'government',code:'03',name:localized('Organisme public','هيئة عمومية','Government organization'),isActive:true},
      {id:'international',code:'04',name:localized('Client international','عميل دولي','International client'),isActive:true}
    ];
    const supplierTypes = [
      {id:'local',code:'02',name:localized('Fournisseur national','مورد وطني','National supplier'),isActive:true},
      {id:'distributor',code:'03',name:localized('Distributeur / organisme','موزع / هيئة','Distributor / organization'),isActive:true},
      {id:'international',code:'04',name:localized('Fournisseur international','مورد دولي','International supplier'),isActive:true},
      {id:'manufacturer',code:'04',name:localized('Fabricant international','مصنع دولي','International manufacturer'),isActive:true}
    ];
    const bankTypes = [
      {id:'bank',code:'01',name:localized('Compte bancaire','حساب بنكي','Bank account'),isActive:true},
      {id:'cash',code:'02',name:localized('Caisse','صندوق نقدي','Petty cash'),isActive:true},
      {id:'online',code:'03',name:localized('Paiement électronique','دفع إلكتروني','Online payment'),isActive:true}
    ];
    const countries = globalThis.SARI_COUNTRIES || [
      ['DZA','DZ',localized('Algérie','الجزائر','Algeria'),'DZD'],['FRA','FR',localized('France','فرنسا','France'),'EUR'],
      ['CHN','CN',localized('Chine','الصين','China'),'CNY'],['DEU','DE',localized('Allemagne','ألمانيا','Germany'),'EUR'],
      ['USA','US',localized('États-Unis','الولايات المتحدة','United States'),'USD']
    ].map(([iso3,iso2,name,currency])=>({id:iso3,code:iso3,iso2,iso3,name,currency,isActive:true}));
    const productCategories = [
      {id:'diagnostic',code:'03',name:localized('Équipement de diagnostic','معدات التشخيص','Diagnostic equipment'),isActive:true},
      {id:'consumables',code:'02',name:localized('Consommable médical','مستهلك طبي','Medical consumable'),isActive:true},
      {id:'furniture',code:'03',name:localized('Mobilier hospitalier','أثاث استشفائي','Hospital furniture'),isActive:true},
      {id:'sterilization',code:'03',name:localized('Stérilisation & laboratoire','التعقيم والمختبر','Sterilization & laboratory'),isActive:true},
      {id:'ppe',code:'01',name:localized('Protection individuelle','الحماية الفردية','PPE'),isActive:true},
      {id:'surgical',code:'04',name:localized('Chirurgie / pièce','الجراحة / قطعة غيار','Surgical / spare part'),isActive:true},
      {id:'service',code:'05',name:localized('Service','خدمة','Service'),isActive:true}
    ];
    const logisticsStatuses = [
      {id:'orderPlaced',order:1,name:localized('Commande passée','تم تقديم الطلب','Order placed'),color:'#64748B',isActive:true},
      {id:'inTransit',order:2,name:localized('En transit','قيد النقل','In transit'),color:'#009CC5',isActive:true},
      {id:'customsClearance',order:3,name:localized('Dédouanement','التخليص الجمركي','Customs clearance'),color:'#EBB51A',isActive:true},
      {id:'received',order:4,name:localized('Réceptionné','تم الاستلام','Received'),color:'#9BB024',isActive:true},
      {id:'exported',order:5,name:localized('Exporté / livré','تم التصدير / التسليم','Exported / delivered'),color:'#8B5CF6',isActive:true}
    ];
    const incoterms = ['EXW','FCA','FOB','CFR','CIF','DAP','DDP'].map(code=>({id:code,code,name:{fr:code,ar:code,en:code},isActive:true}));
    const salesStages = [
      {id:'quote',order:1,name:localized('Devis','عرض سعر','Quote'),color:'#64748B'},
      {id:'order',order:2,name:localized('Commande','طلبية','Order'),color:'#009CC5'},
      {id:'delivery',order:3,name:localized('Livraison','تسليم','Delivery'),color:'#EBB51A'},
      {id:'invoice',order:4,name:localized('Facture','فاتورة','Invoice'),color:'#8B5CF6'},
      {id:'payment',order:5,name:localized('Paiement','دفع','Payment'),color:'#9BB024'}
    ];
    for(const [store,rows] of [['clientTypes',clientTypes],['supplierTypes',supplierTypes],['bankTypes',bankTypes],['countries',countries],['productCategories',productCategories],['logisticsStatuses',logisticsStatuses],['incoterms',incoterms],['salesStages',salesStages]]) for(const row of rows) await this.save(store,row);
    const products = await this.getAll('products');
    for(const product of products) await this.save('productLots',{id:`lot-${product.id}`,productId:product.id,lotNumber:product.lotNumber||`LOT-${product.id}`,warehouseId:product.warehouseId,quantity:Number(product.stock||0),manufacturingDate:product.manufacturingDate||'',expirationDate:product.expirationDate||'',status:'active',createdAt:new Date().toISOString()});
    const profiles = [
      {id:'import-products',recordType:'products',name:'Import Produits',columns:['sku','name','category','purchasePrice','sellingPrice','stock','warehouseId']},
      {id:'import-orders',recordType:'orders',name:'Import Commandes',columns:['referenceCode','customerId','currency','status','total']},
      {id:'import-purchases',recordType:'purchaseDocuments',name:'Import Documents Achat',columns:['referenceCode','supplierId','documentType','currency','status','total']}
    ]; for(const row of profiles) await this.save('importProfiles',row);
    await this.save('apiEndpoints',{id:'api-config',basePath:'/api/v1',isEnabled:true,endpoints:[{name:'products',path:'products',store:'products'},{name:'customers',path:'customers',store:'customers'},{name:'suppliers',path:'suppliers',store:'suppliers'},{name:'sales',path:'sales',store:'orders'},{name:'purchases',path:'purchases',store:'purchaseDocuments'}]});
    const roles=await this.getAll('roles');for(const role of roles){if(role.id==='admin')continue;role.permissions=[...new Set([...(role.permissions||[]),'masterData.view',role.id==='inventory'?'bulkImport.*':'bulkImport.view','api.view',role.id==='inventory'?'inventoryOps.*':'inventoryOps.view'])];await this.save('roles',role);}
  }

  async seedMultiPageInvoice(){if(!globalThis.ReferenceCodeManager)return;const products=await this.getAll('products'),customer=(await this.getAll('customers'))[0];if(!products.length||!customer)return;const items=Array.from({length:58},(_,i)=>{const p=products[i%products.length],qty=i%4+1,unitPrice=Number(p.sellingPrice||1000);return{productId:p.id,name:`${p.name} — Ligne ${i+1}`,qty,unitPrice,discountExpression:i%9===0?'5%':'0',discountPercent:i%9===0?5:0,vatRate:.19,total:unitPrice*qty*(i%9===0?.95:1)}}),subtotal=items.reduce((s,x)=>s+x.total,0),taxAmount=subtotal*.19,total=subtotal+taxAmount;const referenceCode=await ReferenceCodeManager.generate('FAV');const order={id:'order-multipage-sample',referenceCode,referenceCodes:{invoice:referenceCode},customerId:customer.id,customerName:customer.name,warehouseId:'wh-alger',items,subtotal,discountAmount:0,shippingFee:25000,taxAmount,total:total+25000,currency:'DZD',documentType:'invoice',status:'draft',paymentMethod:'bank_transfer',printHeader:'SARI SYSTÈME • FACTURE MULTI-PAGE • En-tête de continuation',documentNote:'Échantillon de validation pagination (58 lignes).',createdAt:new Date().toISOString()};if(globalThis.DocumentSecurity)await DocumentSecurity.sign(order);await this.save('orders',order);}

  async seedPaymentTransactions(){if(!globalThis.ReferenceCodeManager)return;const order=(await this.getAll('orders'))[0],purchase=(await this.getAll('purchaseDocuments'))[0];if(order&&!await this.getById('paymentTransactions','payment-client-demo'))await this.save('paymentTransactions',{id:'payment-client-demo',referenceCode:await ReferenceCodeManager.generate('REV'),partnerType:'customer',partnerId:order.customerId,partnerName:order.customerName,documentType:'order',documentId:order.id,documentReference:order.referenceCode||order.id,direction:'in',amount:Number(order.total||0),currency:order.currency||'DZD',paymentMethod:order.paymentMethod||'bank_transfer',bankAccountId:'account-bna-001',status:'completed',transactionDate:'2026-08-12',notes:'Règlement client'});if(purchase&&!await this.getById('paymentTransactions','payment-supplier-demo'))await this.save('paymentTransactions',{id:'payment-supplier-demo',referenceCode:await ReferenceCodeManager.generate('CHA'),partnerType:'supplier',partnerId:purchase.supplierId,partnerName:purchase.supplierName,documentType:'purchaseDocument',documentId:purchase.id,documentReference:purchase.referenceCode,direction:'out',amount:Number(purchase.total||0),currency:purchase.currency||'DZD',paymentMethod:'bank_transfer',bankAccountId:'account-bna-001',status:'completed',transactionDate:'2026-08-13',notes:'Paiement fournisseur'});}

  async seedBusinessData() {
    const methods = [
      { id:'pay-transfer', code:'bank_transfer', label:{fr:'Virement bancaire',ar:'تحويل بنكي',en:'Bank transfer'}, isActive:true },
      { id:'pay-check', code:'check', label:{fr:'Chèque',ar:'شيك',en:'Check'}, isActive:true },
      { id:'pay-cash', code:'cash', label:{fr:'Espèces',ar:'نقداً',en:'Cash'}, isActive:true },
      { id:'pay-card', code:'card', label:{fr:'Carte bancaire',ar:'بطاقة بنكية',en:'Card'}, isActive:true }
    ];
    for (const item of methods) await this.save('paymentMethods', item);
    const readyTemplates=[
      {id:'tpl-ready-modern',name:'Modern Médical',type:'invoice',paperFormat:'A4',accent:'#009CC5',layout:'designer',elements:[{id:'m1',kind:'field',field:'documentLogo',content:'SARI LOGO',x:35,y:30,w:150,h:70},{id:'m2',kind:'field',field:'documentNumber',content:'SARI-FAV26-00001',x:530,y:35,w:220,h:45},{id:'m3',kind:'field',field:'customerName',content:'Client',x:35,y:140,w:340,h:60},{id:'m4',kind:'field',field:'lineItems',content:'Table lignes',x:35,y:240,w:720,h:360},{id:'m5',kind:'field',field:'totals',content:'Totaux',x:510,y:650,w:245,h:100},{id:'m6',kind:'field',field:'qrCode',content:'QR',x:35,y:800,w:110,h:110},{id:'m7',kind:'field',field:'barcode',content:'Barcode',x:170,y:825,w:260,h:60}]},
      {id:'tpl-ready-compact',name:'Compact Institution',type:'all',paperFormat:'A4',accent:'#0D9488',layout:'designer',elements:[{id:'c1',kind:'field',field:'documentNumber',content:'Référence',x:35,y:35,w:260,h:45},{id:'c2',kind:'field',field:'customerName',content:'Client',x:35,y:100,w:300,h:50},{id:'c3',kind:'field',field:'lineItems',content:'Lignes',x:35,y:180,w:720,h:420},{id:'c4',kind:'field',field:'vatBreakdown',content:'TVA',x:460,y:630,w:295,h:100},{id:'c5',kind:'field',field:'amountInWords',content:'Montant en lettres',x:35,y:760,w:500,h:70}]},
      {id:'tpl-ready-letter',name:'International Letter',type:'all',paperFormat:'Letter',accent:'#334155',layout:'designer',templateMode:'designer',elements:[{id:'l1',kind:'field',field:'documentLogo',content:'Logo',x:35,y:30,w:150,h:70},{id:'l2',kind:'field',field:'supplierName',content:'Supplier',x:35,y:130,w:300,h:50},{id:'l3',kind:'field',field:'lineItems',content:'Items',x:35,y:230,w:745,h:350},{id:'l4',kind:'field',field:'totals',content:'Total',x:540,y:640,w:240,h:90},{id:'l5',kind:'field',field:'qrCode',content:'Verify',x:35,y:780,w:110,h:110}]},
      {id:'tpl-ready-html',name:'HTML Professionnel',type:'all',paperFormat:'A4',accent:'#009CC5',layout:'html',templateMode:'html',htmlContent:'<div style="font-family:Arial;padding:12mm"><header class="document-print-header" style="display:flex;justify-content:space-between;border-bottom:3px solid #009CC5"><h1>{{company.name}}</h1><div><b>{{document.title}}</b><br>{{document.reference}}</div></header><section style="padding:12px;background:#f8fafc;margin:18px 0"><h3>{{partner.name}}</h3><p>{{partner.details}}</p></section>{{lineItemsTable}}<div style="margin-left:auto;width:42%;margin-top:18px">{{totalsTable}}</div><p>{{amountInWords}}</p><footer>{{verificationUrl}}</footer></div>',versions:[]},
      {id:'tpl-ready-vat',name:'Facture TVA par article',type:'invoice',paperFormat:'A4',accent:'#009CC5',layout:'html',templateMode:'html',htmlContent:'<div style="font-family:Arial;padding:12mm"><header class="document-print-header" style="display:flex;justify-content:space-between;border-bottom:3px solid #009CC5"><div><h1>{{company.name}}</h1><p>{{company.address}}</p></div><div style="text-align:right"><h2>{{document.title}}</h2><b>{{document.reference}}</b><p>{{document.date}}</p></div></header><section style="padding:12px;background:#f8fafc;margin:18px 0"><h3>{{partner.name}}</h3><p>{{partner.details}}</p></section><h3 style="font-size:13px;margin:12px 0 6px">Détail des lignes (TVA par article)</h3>{{lineItemsVatTable}}<div style="display:flex;justify-content:space-between;margin-top:18px"><div style="width:52%"><h3 style="font-size:12px">Ventilation TVA</h3>{{vatBreakdownTable}}</div><div style="width:42%">{{totalsTable}}</div></div><p>{{amountInWords}}</p><footer style="display:flex;justify-content:space-between;margin-top:24px"><div>{{verificationUrl}}</div><div>{{document.barcode}}</div><div>{{document.qr}}</div></footer></div>',versions:[]}
    ];for(const tpl of readyTemplates)if(!await this.getById('documentTemplates',tpl.id))await this.save('documentTemplates',tpl);
    await this.save('banks',{id:'bank-bna',name:'Banque Nationale d’Algérie',swift:'BNALDZAL',country:'DZA',isActive:true});
    await this.save('bankAccounts',{id:'account-bna-001',bankId:'bank-bna',name:'Compte exploitation DZD',iban:'00100161609876543209',currency:'DZD',isDefault:true,isActive:true});
    await this.save('coupons',{id:'coupon-welcome',code:'SARI10',label:'Remise institution partenaire',discountType:'percentage',value:10,scope:'invoice',productId:'',clientIds:[],validFrom:'2026-01-01',validTo:'2026-12-31',usageLimit:100,usageCount:0,isActive:true});
    await this.save('referrals',{id:'ref-direct',name:'Vente directe SARI',type:'channel',employeeId:'emp-sales',commissionPercent:0,isActive:true});
    await this.save('attendance',{id:'attendance-demo',employeeId:'emp-sales',date:'2026-08-11',clockIn:'08:12',clockOut:'17:06',status:'present',notes:''});
    await this.save('performanceRecords',{id:'perf-demo',employeeId:'emp-sales',period:'2026-S1',evaluationDate:'2026-07-05',score:88,goals:'Développer le portefeuille CHU',kpis:'CA, nouveaux clients, taux conversion',notes:'Objectifs atteints.',status:'completed'});
    await this.save('taxRecords',{id:'tax-g50-demo',referenceCode:'G502026-08-R01',type:'G50',period:'2026-08',status:'draft',taxableRevenue:1200000,vatCollected:228000,vatDeductible:95000,amountDue:133000,createdAt:new Date().toISOString()});
    if (globalThis.ReferenceCodeManager) {
      const docs = [
        { id:'pdoc-demo-quote', documentType:'purchase_quote', code:'DVA', supplierId:'sup-de', supplierName:'BioMed Diagnostics GmbH', status:'draft', currency:'EUR', items:[{productId:'prod-002',name:'ECG 12 pistes',qty:2,unitPrice:1400,vatRate:.19,discountPercent:0,total:2800}], subtotal:2800,taxAmount:532,total:3332,createdAt:new Date().toISOString() },
        { id:'pdoc-demo-receipt', documentType:'goods_receipt', code:'REC', supplierId:'sup-cn', supplierName:'Shenzhen MediCare Tech Ltd', status:'received', currency:'USD', items:[{productId:'prod-001',name:'Moniteur patient',qty:10,unitPrice:900,vatRate:.19,discountPercent:0,total:9000}], subtotal:9000,taxAmount:1710,total:10710,createdAt:new Date().toISOString() }
      ];
      for(const doc of docs){doc.referenceCode=await globalThis.ReferenceCodeManager.generate(doc.code);await this.save('purchaseDocuments',doc);}
      await this.seedPaymentTransactions();
    }
    const roles=await this.getAll('roles');for(const role of roles){if(role.id!=='admin')role.permissions=[...new Set([...(role.permissions||[]),role.id==='import_export'?'purchases.*':role.id==='sales'?'purchases.create':'purchases.view','purchases.view','ged.view'])];await this.save('roles',role);}
  }

  async seedEnterpriseData() {
    const vats = [
      { id: 'vat-0', label: 'Exonéré / 0%', name:{fr:'Exonéré',ar:'معفى',en:'Exempt'}, percentage: 0, isDefault: false, isActive: true },
      { id: 'vat-9', label: 'TVA réduite 9%', name:{fr:'TVA réduite',ar:'ضريبة مخفضة',en:'Reduced VAT'}, percentage: 9, isDefault: false, isActive: true },
      { id: 'vat-19', label: 'TVA normale 19%', name:{fr:'TVA normale',ar:'ضريبة عادية',en:'Standard VAT'}, percentage: 19, isDefault: true, isActive: true }
    ];
    const standard = ['FAC|Purchase invoice','FAV|Sales invoice','BCA|Purchase order','CHA|Expense / Charge','REV|Revenue','MIS|Mission','CAT|Catalogue','DOC|Document','RAP|Report','LET|Letter','MOD|Model document','FIS|Fiscal record','DVV|Sales quote','BCV|Sales order','DVA|Purchase quote','LIV|Delivery note','REC|Goods receipt','STE|Stock entry','STS|Stock exit','CON|Consultation / Tender','EMP|Employee','ADM|Administration','REG|Trade register','PVE|Minutes','NIS|Statistical ID','NIF|Tax ID','NAI|Tax article','INV|Inventory','JOB|Job posting'];
    const subtypeLists = {
      CLI: [{code:'01',label:'National / Public'},{code:'02',label:'National / Private'},{code:'03',label:'National / Organization'},{code:'04',label:'International'}],
      FOU: [{code:'01',label:'National / Public'},{code:'02',label:'National / Private'},{code:'03',label:'National / Organization'},{code:'04',label:'International'}],
      PRO: [{code:'01',label:'Standard product'},{code:'02',label:'Consumable product'},{code:'03',label:'Equipment'},{code:'04',label:'Spare part'},{code:'05',label:'Service'}],
      BAN: [{code:'01',label:'Standard bank account'},{code:'02',label:'Petty cash'},{code:'03',label:'Online payment account'}]
    };
    const codes = standard.map(row => { const [code, designation] = row.split('|'); return { id: code, code, designation, description: designation, mask: `SARI-${code}{YY}-{SEQ}`, example: `SARI-${code}26-00001`, maskType: 'Standard', sequenceMinDigits: 5, resetFrequency: 'yearly', isActive: true, subTypeOptions: [] }; });
    Object.entries(subtypeLists).forEach(([code, subTypeOptions]) => codes.push({ id: code, code, designation: {CLI:'Client',FOU:'Supplier',PRO:'Product',BAN:'Bank account'}[code], description: 'Sub-type based reference', mask: `SARI-${code}{SUBTYPE}-{SEQ}`, example: `SARI-${code}01-00001`, maskType: 'SubTypeBased', sequenceMinDigits: 5, resetFrequency: 'never', isActive: true, subTypeOptions }));
    ['IMP','EXP'].forEach(code => codes.push({ id: code, code, designation: code === 'IMP' ? 'Import' : 'Export', description: 'Country-based reference', mask: `SARI-${code}{YY}{COUNTRY3}-{SEQ}`, example: `SARI-${code}26DZA-00001`, maskType: 'CountryBased', sequenceMinDigits: 5, resetFrequency: 'yearly', isActive: true, subTypeOptions: [] }));
    codes.push({ id:'G50',code:'G50',designation:'G50 Algerian tax declaration',description:'Monthly registry reference',mask:'SARI-G50{YYYY}-{MM}-R{REGISTRY}',example:'SARI-G502026-08-R12',maskType:'DateBased',sequenceMinDigits:2,resetFrequency:'monthly',isActive:true,subTypeOptions:[] });
    codes.push({ id:'TEM',code:'TEM',designation:'Document template',description:'Template type reference',mask:'SARI-TEM{TEMPLATE3}-{SEQ}',example:'SARI-TEMFAC-00001',maskType:'TemplateBased',sequenceMinDigits:5,resetFrequency:'never',isActive:true,subTypeOptions:[] });
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
      { id: 'emp-admin', userId: 'usr-admin', firstName: 'Amel', lastName: 'Bensaïd', email: 'amel@sarisysteme.dz', dateOfBirth:'1985-04-12', gender:'Female', postalAddress:'Alger', cnasNumber:'CNAS-160001', phone: '+213 550 10 20 30', position: 'Directrice générale', department: 'Direction', contractType: 'CDI', salary: 180000, hireDate: '2021-03-01', status: 'active', managerId: '' },
      { id: 'emp-stock', userId: 'usr-stock', firstName: 'Nadir', lastName: 'Khelifi', email: 'nadir@sarisysteme.dz', dateOfBirth:'1991-09-20', gender:'Male', postalAddress:'Alger', cnasNumber:'CNAS-160002', phone: '+213 550 22 33 44', position: 'Gestionnaire stocks', department: 'Logistique', contractType: 'CDI', salary: 95000, hireDate: '2023-06-12', status: 'active', managerId: 'emp-admin' },
      { id: 'emp-sales', userId: 'usr-sales', firstName: 'Lina', lastName: 'Mansouri', email: 'lina@sarisysteme.dz', dateOfBirth:'1994-02-08', gender:'Female', postalAddress:'Blida', cnasNumber:'CNAS-160003', phone: '+213 550 55 66 77', position: 'Commerciale B2B', department: 'Commercial', contractType: 'CDI', salary: 105000, hireDate: '2024-01-15', status: 'active', managerId: 'emp-admin' }
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
    const candidates = [{ id: 'cand-001', jobPostingId: 'job-001', name: 'Samir Haddad', email: 'samir@example.dz', dateOfBirth:'1990-06-15', stage: 'interviewing', notes: 'Entretien technique planifié.' }];
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
      defaultWarehouseId: 'wh-alger',
      verificationBaseUrl: 'http://sari-systeme.com/code',
      verificationSecret: 'SARI-CHANGE-ME'
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

export {};
