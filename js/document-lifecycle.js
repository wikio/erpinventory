/** Shared lifecycle/audit trail for sales and purchase documents. */
const DocumentLifecycle = {
  storeFor(recordType) {
    return ['purchaseDocument', 'purchaseDocuments', 'purchase'].includes(recordType) ? 'purchaseDocuments' : 'orders';
  },
  typeFor(recordType) { return this.storeFor(recordType) === 'purchaseDocuments' ? 'purchaseDocument' : 'order'; },
  async record(recordType, record, action, details = {}) {
    if (!record?.id || !window.sariDB) return;
    const actor = window.auth?.currentUser || {};
    const entry = {
      id: `audit-${crypto.randomUUID()}`,
      affectedRecordId: record.id,
      documentId: record.id,
      documentType: this.typeFor(recordType),
      referenceCode: record.referenceCode || record.id,
      user: actor.name || actor.username || 'SARI Système',
      actingUserId: actor.id || 'system',
      role: window.auth?.currentRole || 'system',
      action,
      module: this.storeFor(recordType) === 'purchaseDocuments' ? 'Purchases' : 'Sales',
      fromStatus: details.fromStatus ?? null,
      toStatus: details.toStatus ?? record.status ?? null,
      fromStage: details.fromStage ?? null,
      toStage: details.toStage ?? record.salesStage ?? record.purchaseStage ?? null,
      description: details.description || `${record.referenceCode || record.id} • ${action}`,
      timestamp: details.timestamp || new Date().toISOString(),
      changes: details.changes || []
    };
    await window.sariDB.save('auditLogs', entry);
    return entry;
  },
  async history(recordType, record) {
    const rows = await window.sariDB.getAll('auditLogs');
    const reference = record.referenceCode || record.id;
    const entries = rows.filter(row =>
      row.affectedRecordId === record.id || row.documentId === record.id ||
      (reference && String(row.description || '').includes(reference))
    );
    if (!entries.some(row => ['DOCUMENT_CREATED', 'CREATE_RECORD'].includes(row.action))) {
      entries.push({
        id: `synthetic-created-${record.id}`,
        action: 'DOCUMENT_CREATED', module: this.storeFor(recordType) === 'purchaseDocuments' ? 'Purchases' : 'Sales',
        user: record.createdByName || 'SARI Système', actingUserId: record.createdBy || 'system', role: 'system',
        affectedRecordId: record.id, toStatus: record.initialStatus || 'draft',
        description: `${reference} • création du document`, timestamp: record.createdAt || new Date().toISOString()
      });
    }
    return entries.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
  },
  actionLabel(action) {
    const labels = {
      DOCUMENT_CREATED: ['Création', 'إنشاء', 'Created'], CREATE_RECORD: ['Création', 'إنشاء', 'Created'],
      DOCUMENT_UPDATED: ['Modification', 'تعديل', 'Updated'], UPDATE_RECORD: ['Modification', 'تعديل', 'Updated'],
      STATUS_CHANGED: ['Changement de statut', 'تغيير الحالة', 'Status changed'],
      WORKFLOW_MOVED: ['Mouvement du workflow', 'نقل سير العمل', 'Workflow moved'],
      DOCUMENT_CONVERTED: ['Conversion', 'تحويل', 'Converted'], DELETE_RECORD: ['Suppression', 'حذف', 'Deleted']
    };
    const index = i18n.currentLang === 'ar' ? 1 : i18n.currentLang === 'en' ? 2 : 0;
    return labels[action]?.[index] || action || i18n.t('lifecycleEvent', 'Événement');
  },
  valueLabel(value, list = 'documentStatus') {
    if (!value) return '—';
    return OptionCatalog.label(list, value) || value;
  },
  async open(recordType, id) {
    const store = this.storeFor(recordType), record = await sariDB.getById(store, id);
    if (!record) return app.showToast(i18n.t('documentNotFound', 'Document introuvable.'), 'error');
    const entries = await this.history(recordType, record), root = document.getElementById('sari-modal-root');
    root.innerHTML = `<div class="fixed inset-0 z-[110] sari-modal-backdrop flex items-center justify-center p-3"><section class="sari-tile w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6"><header class="flex justify-between gap-3 border-b pb-4"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${i18n.t('documentLifecycle','Cycle de vie du document')}</span><h2 class="text-xl font-extrabold mt-2">${SariUtils.escapeHtml(record.referenceCode || record.id)}</h2><p class="text-xs text-slate-500">${entries.length} ${i18n.t('lifecycleEvents','événement(s)')}</p></div><button onclick="app.closeModalRoot()" class="p-2" aria-label="${i18n.t('close','Fermer')}"><i data-lucide="x"></i></button></header><ol class="lifecycle-timeline mt-5">${entries.map((entry, index) => { const stageList=store==='purchaseDocuments'?'purchaseStage':'salesStage';const transition=entry.fromStatus||entry.toStatus?`${this.valueLabel(entry.fromStatus)} → ${this.valueLabel(entry.toStatus)}`:entry.fromStage||entry.toStage?`${this.valueLabel(entry.fromStage,stageList)} → ${this.valueLabel(entry.toStage,stageList)}`:'';return `<li class="lifecycle-event"><span class="lifecycle-dot">${index+1}</span><article><div class="flex flex-wrap justify-between gap-2"><b>${SariUtils.escapeHtml(this.actionLabel(entry.action))}</b><time>${new Date(entry.timestamp).toLocaleString(i18n.currentLang==='ar'?'ar-DZ':i18n.currentLang==='en'?'en-GB':'fr-DZ')}</time></div>${transition?`<p class="font-mono-tech text-sari-blue font-bold mt-1">${SariUtils.escapeHtml(transition)}</p>`:''}<p class="text-sm text-slate-600 dark:text-slate-300 mt-1">${SariUtils.escapeHtml(entry.description || '')}</p><small class="block mt-2"><i data-lucide="user-round" class="inline w-3.5 h-3.5"></i> ${SariUtils.escapeHtml(entry.user || entry.actingUserId || 'SARI Système')} • ${SariUtils.escapeHtml(entry.role || '')}</small></article></li>`;}).join('')}</ol><footer class="flex justify-end mt-5 pt-4 border-t"><button onclick="app.closeModalRoot()" class="sari-btn px-5 py-2 bg-slate-200 dark:bg-slate-700">${i18n.t('close','Fermer')}</button></footer></section></div>`;
    window.SariIcons?.hydrate();
  }
};
window.DocumentLifecycle = DocumentLifecycle;

export {};
