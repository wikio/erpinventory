import '../signature-pad.js';
/**
 * SARI Système — Employment Contracts Manager & Electronic Signature Workflow
 * (Section 304). Contract CRUD, work rules & general terms publishing,
 * conflict-of-interest declarations, guided onboarding status board and the
 * admin-configurable portal access restriction (304.5).
 */
const ContractsModule = {
  state: {
    tab: 'contracts', contracts: [], employees: [], paymentTypes: [], declarations: [],
    acceptances: [], rules: [], positionFunctions: [], certificates: [], certificateTemplates: [], settings: {}, query: '', employee: 'all', status: 'all',
  },
  t(key, fallback) { return i18n.t(key, fallback); },
  canWrite() { return auth.can('contracts', 'edit'); },
  employee(id) { return this.state.employees.find((item) => item.id === id); },
  employeeName(id) { const employee = this.employee(id); return employee ? `${employee.firstName} ${employee.lastName}` : id || '—'; },
  rule(kind) { return this.state.rules.filter((rule) => rule.kind === kind).sort((a, b) => Number(b.version) - Number(a.version))[0]; },

  async load() {
    const [contracts, employees, paymentTypes, declarations, acceptances, rules, settings, positionFunctions, certificates, certificateTemplates] = await Promise.all(['employmentContracts', 'employees', 'paymentTypes', 'conflictDeclarations', 'ruleAcceptances', 'workRules', 'settings', 'positionFunctions', 'workCertificates', 'certificateTemplates'].map((store) => sariDB.getAll(store)));
    Object.assign(this.state, { contracts, employees, paymentTypes, declarations, acceptances, rules, positionFunctions, certificates, certificateTemplates });
    this.state.settings = settings.find((record) => record.id === 'app-settings') || {};
    this.state.policySettings = settings.find((record) => record.id === 'app-settings') || {};
  },
  async render(containerId = 'sari-main-view') {
    const c = document.getElementById(containerId); if (!c) return;
    await this.load();
    const canWrite = this.canWrite();
    const tabs = [
      ['contracts', 'file-signature', 'contractsLabel'],
      ['rules', 'scroll-text', 'workRulesLabel'],
      ['declarations', 'scale', 'conflictDeclarationsLabel'],
      ['onboarding', 'list-checks', 'onboardingLabel'],
      ['functions', 'list-tree', 'Fonctions & tâches'],
      ['certificates', 'file-badge-2', 'Attestations de travail'],
      ['access', 'shield-check', 'accessRestrictionLabel'],
    ];
    const pending = this.state.employees.filter((employee) => employee.status === 'active' && !this.onboardingFor(employee.id).done).length;
    c.innerHTML = `<div class="space-y-5">
      <section class="sari-tile p-5 sari-grid-pattern flex flex-col md:flex-row justify-between gap-4">
        <div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${this.t('contractsBadge', 'Ressources humaines • Contrats & conformité')}</span>
          <h2 class="text-2xl font-extrabold mt-2 flex items-center gap-2"><i data-lucide="file-signature" class="text-sari-blue"></i>${this.t('contractsManager', 'Contrats de travail & signatures électroniques')}</h2>
          <p class="text-sm text-slate-500">${this.t('contractsManagerDescription', 'Contrats, règlement intérieur, CGU, déclarations de conflits d’intérêts et parcours d’intégration guidé des salariés.')}</p></div>
        <div class="grid grid-cols-3 gap-2 text-center">${[
          [this.state.contracts.length, this.t('contractsCount', 'Contrats')],
          [this.state.contracts.filter((contract) => contract.status === 'signed').length, this.t('signedCount', 'Signés')],
          [pending, this.t('onboardingPending', 'Intégrations à terminer')],
        ].map(([value, label]) => `<div class="p-3 bg-white/80 dark:bg-slate-800 rounded-xl border"><b class="text-xl text-sari-blue">${value}</b><small class="block">${label}</small></div>`).join('')}</div>
      </section>
      <nav class="sari-tile p-2 flex flex-wrap gap-2">${tabs.map(([tab, icon, key]) => `<button onclick="ContractsModule.setTab('${tab}')" class="sari-btn px-4 py-2 text-xs ${this.state.tab === tab ? 'bg-sari-blue text-white' : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}"><i data-lucide="${icon}" class="w-4 h-4"></i>${this.t(key, key)}</button>`).join('')}</nav>
      ${this.tabHtml(canWrite)}
      <div id="contracts-modal"></div>
    </div>`;
    window.SariIcons?.hydrate(); app.enhanceSearchInputs();
  },
  setTab(tab) { this.state.tab = tab; this.render(); },
  tabHtml(canWrite) {
    const map = {
      contracts: () => this.contractsHtml(canWrite), rules: () => this.rulesHtml(canWrite),
      declarations: () => this.declarationsHtml(canWrite), onboarding: () => this.onboardingHtml(canWrite),
      functions: () => this.functionsHtml(canWrite), certificates: () => this.certificatesHtml(canWrite),
      access: () => this.accessHtml(canWrite),
    };
    return (map[this.state.tab] || map.contracts)();
  },

  /* ─────────────────────────────── 304.1 Contracts CRUD ─────────────────────────────── */
  statusLabel(status) {
    const labels = {
      draft: { fr: 'Brouillon', ar: 'مسودة', en: 'Draft' }, sent: { fr: 'Envoyé à la signature', ar: 'أُرسل للتوقيع', en: 'Sent for signature' },
      signed: { fr: 'Signé', ar: 'موقع', en: 'Signed' }, archived: { fr: 'Archivé', ar: 'مؤرشف', en: 'Archived' },
    };
    return labels[status]?.[i18n.currentLang] || labels[status]?.fr || status || '—';
  },
  contractStatusBadge(status) {
    const colors = { draft: 'text-slate-600', sent: 'text-sari-amber', signed: 'text-green-600', archived: 'text-slate-400' };
    return `<span class="sari-badge ${colors[status] || ''}">${SariUtils.escapeHtml(this.statusLabel(status))}</span>`;
  },
  contractsHtml(canWrite) {
    const rows = window.SariCore.ordering.stableOrder(this.state.contracts).filter((contract) =>
      (this.state.employee === 'all' || contract.employeeId === this.state.employee)
      && (this.state.status === 'all' || contract.status === this.state.status)
      && SariUtils.matchesAdvancedSearch(contract, this.state.query, ['employeeName', 'referenceCode', 'title', 'type', 'position']));
    return `<div class="space-y-4">
      <section class="sari-tile p-4 grid md:grid-cols-[1fr_200px_180px] gap-2">
        <input class="doc-input" value="${SariUtils.escapeHtml(this.state.query)}" oninput="ContractsModule.state.query=this.value" onkeydown="SariUtils.searchKeyHandler(event,()=>ContractsModule.render())" placeholder="${this.t('searchContracts', 'Rechercher un contrat, un salarié, un poste')}">
        <select class="doc-input" onchange="ContractsModule.state.employee=this.value;ContractsModule.render()"><option value="all">${this.t('allEmployees', 'Tous les salariés')}</option>${this.state.employees.map((employee) => `<option value="${employee.id}" ${this.state.employee === employee.id ? 'selected' : ''}>${SariUtils.escapeHtml(`${employee.firstName} ${employee.lastName}`)}</option>`).join('')}</select>
        <select class="doc-input" onchange="ContractsModule.state.status=this.value;ContractsModule.render()"><option value="all">${this.t('allStatuses', 'Tous les statuts')}</option>${['draft', 'sent', 'signed', 'archived'].map((status) => `<option value="${status}" ${this.state.status === status ? 'selected' : ''}>${this.statusLabel(status)}</option>`).join('')}</select>
      </section>
      ${canWrite ? `<button onclick="ContractsModule.openContractEditor()" class="sari-btn px-4 py-2 bg-sari-blue text-white"><i data-lucide="plus"></i>${this.t('newContract', 'Nouveau contrat')}</button>` : ''}
      <section class="sari-tile overflow-x-auto"><table class="w-full sari-table"><thead><tr>
        <th>${this.t('orderLabel', 'Ordre')}</th><th>${this.t('reference', 'Référence')}</th><th>${this.t('employee', 'Salarié')}</th><th>${this.t('contractType', 'Type')}</th><th>${this.t('position', 'Poste')}</th><th>${this.t('contractPeriod', 'Période')}</th><th>${this.t('baseSalary', 'Salaire')}</th><th>${this.t('signature', 'Signature')}</th><th>${this.t('status', 'Statut')}</th><th>${this.t('actionsHeader', 'Actions')}</th>
      </tr></thead><tbody>${rows.map((contract) => `<tr>
        <td class="text-center font-mono-tech text-sari-blue">${contract.order || '—'}</td>
        <td class="font-mono-tech text-sari-blue font-bold">${contract.referenceCode || contract.id}</td>
        <td><b>${SariUtils.escapeHtml(contract.employeeName || this.employeeName(contract.employeeId))}</b></td>
        <td><span class="sari-badge">${SariUtils.escapeHtml(contract.type || '—')}</span></td>
        <td>${SariUtils.escapeHtml(contract.position || '—')}</td>
        <td class="font-mono-tech text-xs">${i18n.formatDate(contract.startDate)}${contract.endDate ? ` → ${i18n.formatDate(contract.endDate)}` : ''}</td>
        <td class="font-bold">${i18n.formatCurrency(contract.baseSalary)}</td>
        <td>${(contract.employeeSignature || contract.signature)?.signedAt && contract.companySignature?.signedAt ? `<span class="text-green-600 text-xs"><i data-lucide="badge-check" class="w-3 h-3 inline"></i> Deux parties</span>` : `<span class="text-sari-amber text-xs">${(contract.employeeSignature || contract.signature)?.signedAt ? 'Entreprise à signer' : contract.companySignature?.signedAt ? 'Salarié à signer' : this.t('pendingSignature', 'En attente')}</span>`}</td>
        <td>${this.contractStatusBadge(contract.status)}</td>
        <td><div class="flex flex-wrap gap-1"><button onclick="ContractsModule.viewContract('${contract.id}')" class="doc-action">${this.t('view', 'Voir')}</button><button onclick="ContractsModule.printContract('${contract.id}')" class="doc-action"><i data-lucide="printer"></i>PDF</button><button onclick="DocumentManager.open('employmentContract','${contract.id}','${contract.referenceCode || contract.id}')" class="doc-action">GED</button>${canWrite ? `<button onclick="ContractsModule.openContractEditor('${contract.id}')" class="doc-action">${this.t('edit', 'Modifier')}</button>${contract.status === 'draft' ? `<button onclick="ContractsModule.sendContract('${contract.id}')" class="doc-action text-sari-blue">${this.t('sendForSignature', 'Envoyer à signer')}</button>` : ''}${!contract.companySignature?.signedAt ? `<button onclick="ContractsModule.openCompanySigning('${contract.id}')" class="doc-action text-green-700"><i data-lucide="pen-tool"></i>Signer entreprise</button>` : ''}<button onclick="ContractsModule.removeContract('${contract.id}')" class="doc-action text-red-600">${this.t('delete', 'Supprimer')}</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="10" class="p-8 text-slate-400">${this.t('noContract', 'Aucun contrat enregistré.')}</td></tr>`}</tbody></table></section>
    </div>`;
  },
  async openContractEditor(id = '') {
    const old = id ? await sariDB.getById('employmentContracts', id) : {};
    const modal = document.getElementById('contracts-modal');
    modal.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3">
      <form onsubmit="ContractsModule.saveContract(event)" class="sari-tile w-full max-w-5xl max-h-[95vh] overflow-y-auto p-6">
        <header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${this.t('employmentContract', 'Contrat de travail')}</span>
          <h3 class="text-xl font-extrabold mt-2">${id ? this.t('editContract', 'Modifier le contrat') : this.t('newContract', 'Nouveau contrat')}</h3></div>
          <button type="button" onclick="ContractsModule.closeModal()"><i data-lucide="x"></i></button></header>
        <input type="hidden" id="ctt-id" value="${id || ''}">
        <div class="grid md:grid-cols-2 gap-3 mt-4">
          <label class="doc-label">${this.t('employee', 'Salarié')} *<select id="ctt-employee" class="doc-input" required>${this.state.employees.map((employee) => `<option value="${employee.id}" ${old.employeeId === employee.id ? 'selected' : ''}>${SariUtils.escapeHtml(`${employee.firstName} ${employee.lastName}`)} — ${SariUtils.escapeHtml(employee.position || '')}</option>`).join('')}</select></label>
          <label class="doc-label">${this.t('contractType', 'Type de contrat')} *<select id="ctt-type" class="doc-input">${['CDI', 'CDD', 'CTT', 'Apprentissage', 'Occasionnel / Pigiste'].map((type) => `<option ${old.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select></label>
          <label class="doc-label">${this.t('contractTitle', 'Intitulé du contrat')} *<input id="ctt-title" class="doc-input" value="${SariUtils.escapeHtml(old.title || '')}" required></label>
          <label class="doc-label">${this.t('position', 'Poste')} *<input id="ctt-position" class="doc-input" value="${SariUtils.escapeHtml(old.position || '')}" required></label>
          <label class="doc-label">${this.t('startDate', 'Date de début')} *<input id="ctt-start" type="date" class="doc-input" value="${old.startDate || ''}" required></label>
          <label class="doc-label">${this.t('endDate', 'Date de fin (CDI : vide)')}<input id="ctt-end" type="date" class="doc-input" value="${old.endDate || ''}"></label>
          <label class="doc-label">${this.t('baseSalary', 'Salaire de base (DA)')}<input id="ctt-salary" type="number" class="doc-input" value="${old.baseSalary ?? ''}"></label>
          <label class="doc-label">${this.t('paymentType', 'Type de paiement')}<select id="ctt-payment" class="doc-input">${this.state.paymentTypes.map((type) => `<option value="${type.id}" ${old.paymentTypeId === type.id ? 'selected' : ''}>${SariUtils.escapeHtml(type.name?.[i18n.currentLang] || type.name?.fr || type.code)}</option>`).join('')}</select></label>
          <label class="doc-label">${this.t('weeklyHours', 'Heures hebdomadaires')}<input id="ctt-hours" type="number" step="0.5" class="doc-input" value="${old.weeklyHours ?? 40}"></label>
          <label class="doc-label">${this.t('trialPeriodMonths', 'Période d’essai (mois)')}<input id="ctt-trial" type="number" step="0.5" class="doc-input" value="${old.trialPeriodMonths ?? 3}"></label>
          <label class="doc-label">${this.t('status', 'Statut')}<select id="ctt-status" class="doc-input">${['draft', 'sent', 'signed', 'archived'].map((status) => `<option value="${status}" ${old.status === status ? 'selected' : ''}>${this.statusLabel(status)}</option>`).join('')}</select></label>
          <label class="doc-label md:col-span-2">${this.t('contractClauses', 'Clauses & mentions particulières (HTML)')}${RichTextEditor.html('ctt-clauses', old.clausesHtml || '<p></p>', this.t('contractClauses', 'Clauses'))}</label>
        </div>
        <footer class="flex justify-end gap-2 mt-5 pt-4 border-t"><button type="button" onclick="ContractsModule.closeModal()" class="sari-btn px-4 bg-slate-200">${this.t('cancel', 'Annuler')}</button><button class="sari-btn px-5 bg-sari-blue text-white">${this.t('save', 'Enregistrer')}</button></footer>
      </form></div>`;
    window.SariIcons?.hydrate();
  },
  closeModal() { document.getElementById('contracts-modal').innerHTML = ''; },
  async saveContract(event) {
    event.preventDefault();
    const id = document.getElementById('ctt-id').value;
    const old = id ? await sariDB.getById('employmentContracts', id) : {};
    const employeeId = document.getElementById('ctt-employee').value;
    const record = {
      ...old, id: id || `ctt-${crypto.randomUUID()}`, employeeId, employeeName: this.employeeName(employeeId),
      type: document.getElementById('ctt-type').value, title: document.getElementById('ctt-title').value,
      position: document.getElementById('ctt-position').value, startDate: document.getElementById('ctt-start').value,
      endDate: document.getElementById('ctt-end').value, baseSalary: Number(document.getElementById('ctt-salary').value) || 0,
      paymentTypeId: document.getElementById('ctt-payment').value, weeklyHours: Number(document.getElementById('ctt-hours').value) || 40,
      trialPeriodMonths: Number(document.getElementById('ctt-trial').value) || 0,
      status: document.getElementById('ctt-status').value || 'draft',
      clausesHtml: RichTextEditor.value('ctt-clauses'),
      updatedAt: new Date().toISOString(), createdAt: old.createdAt || new Date().toISOString(),
    };
    await sariDB.save('employmentContracts', record);
    this.closeModal();
    app.showToast(this.t('contractSaved', 'Contrat enregistré.'), 'success');
    await this.render();
  },
  async sendContract(id) {
    const contract = await sariDB.getById('employmentContracts', id);
    contract.status = 'sent'; contract.sentAt = new Date().toISOString();
    await sariDB.save('employmentContracts', contract);
    const employee = this.employee(contract.employeeId);
    if (employee?.userId) {
      await sariDB.save('notifications', { id: `notif-${crypto.randomUUID()}`, type: 'contract', targetUserId: employee.userId, title: this.t('contractToSignTitle', 'Contrat à signer'), titleI18n: { fr: 'Contrat à signer', ar: 'عقد للتوقيع', en: 'Contract to sign' }, message: `${contract.referenceCode || contract.id} — ${contract.title}`, isRead: false, createdAt: new Date().toISOString() });
      await app.updateNotificationsBadge();
    }
    app.showToast(this.t('contractSent', 'Contrat envoyé à la signature dans l’espace collaborateur.'), 'success');
    await this.render();
  },
  async removeContract(id) { if (!await DialogManager.confirm(this.t('deleteContractConfirm', 'Supprimer ce contrat ?'))) return; await sariDB.delete('employmentContracts', id); await this.render(); },
  async viewContract(id) {
    const contract = await sariDB.getById('employmentContracts', id); if (!contract) return;
    const root = document.getElementById('sari-modal-root');
    root.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3"><section class="w-full max-w-5xl max-h-[96vh] overflow-y-auto bg-white rounded-xl"><div class="sticky top-0 z-10 bg-slate-900 text-white p-2 flex justify-end gap-2 no-print"><button onclick="ContractsModule.printContract('${contract.id}')" class="sari-btn px-4 bg-sari-lime text-slate-900"><i data-lucide="file-down"></i>PDF paginé</button><button onclick="app.closeModalRoot()" class="p-2"><i data-lucide="x"></i></button></div>${this.contractDocumentHtml(contract)}</section></div>`;
    window.SariIcons?.hydrate();
  },
  printContract(id) {
    const source = document.getElementById(`contract-document-${id}`);
    if (source) { SariUtils.downloadPDF(`contract-document-${id}`, `contrat-${id}.pdf`, 'A4'); return; }
    // The consultation is not open: open it, then print after a frame.
    this.viewContract(id).then(() => setTimeout(() => { const el = document.getElementById(`contract-document-${id}`); if (el) SariUtils.downloadPDF(`contract-document-${id}`, `contrat-${id}.pdf`, 'A4'); }, 400));
  },

  /* ─────────────────── 304.2 Work rules & general terms publishing ─────────────────── */
  rulesHtml(canWrite) {
    return `<div class="grid lg:grid-cols-2 gap-4">
      ${['rules', 'terms'].map((kind) => { const rule = this.rule(kind); const acceptCount = this.state.acceptances.filter((acceptance) => acceptance.kind === kind && Number(acceptance.version) >= Number(rule?.version)).length; return `<section class="sari-tile p-5">
        <header class="flex justify-between items-start border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">v${rule?.version || 1}</span>
          <h3 class="font-extrabold text-lg mt-2">${SariUtils.escapeHtml(rule?.titleI18n?.[i18n.currentLang] || rule?.titleI18n?.fr || (kind === 'rules' ? this.t('workRulesLabel', 'Règlement intérieur') : this.t('termsLabel', 'Conditions générales')))}</h3>
          <p class="text-xs text-slate-500 mt-1">${acceptCount}/${this.state.employees.filter((employee) => employee.status === 'active').length} ${this.t('acceptedByEmployees', 'salarié(s) ayant accepté')} • ${this.t('visibleToEveryone', 'visible dans chaque espace collaborateur')}</p></div>
          ${canWrite ? `<button onclick="ContractsModule.openRuleEditor('${kind}')" class="doc-action"><i data-lucide="pencil"></i>${this.t('edit', 'Modifier')}</button>` : ''}</header>
        <div class="rich-content text-sm mt-4 max-h-96 overflow-y-auto">${RichTextEditor.sanitize(rule?.contentI18n?.[i18n.currentLang] || rule?.contentI18n?.fr || '<p>—</p>')}</div>
        <footer class="text-[10px] text-slate-400 mt-3 pt-3 border-t">${this.t('publishedAt', 'Publié')} : ${i18n.formatDate(rule?.publishedAt)}</footer></section>`; }).join('')}
      <div id="contracts-modal"></div></div>`;
  },
  async openRuleEditor(kind) {
    const rule = this.rule(kind) || { kind, version: 1 };
    const modal = document.getElementById('contracts-modal');
    modal.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3">
      <form onsubmit="ContractsModule.saveRule(event,'${kind}')" class="sari-tile w-full max-w-6xl max-h-[95vh] overflow-y-auto p-6">
        <header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${kind === 'rules' ? this.t('workRulesLabel', 'Règlement intérieur') : this.t('termsLabel', 'Conditions générales')} — v${rule.version}</span>
          <h3 class="text-xl font-extrabold mt-2">${this.t('publishNewVersion', 'Publier une nouvelle version')}</h3>
          <p class="text-xs text-slate-500 mt-1">${this.t('publishHelp', 'La publication incrémente la version : les salariés devront relire, accepter et signer à nouveau cette version.')}</p></div>
          <button type="button" onclick="ContractsModule.closeModal()"><i data-lucide="x"></i></button></header>
        <div class="grid md:grid-cols-3 gap-3 mt-4">
          <label class="doc-label">${this.t('titleFr', 'Titre (FR)')}<input id="rule-title-fr" class="doc-input" value="${SariUtils.escapeHtml(rule.titleI18n?.fr || '')}"></label>
          <label class="doc-label">${this.t('titleAr', 'Titre (AR)')}<input id="rule-title-ar" class="doc-input" value="${SariUtils.escapeHtml(rule.titleI18n?.ar || '')}"></label>
          <label class="doc-label">${this.t('titleEn', 'Titre (EN)')}<input id="rule-title-en" class="doc-input" value="${SariUtils.escapeHtml(rule.titleI18n?.en || '')}"></label>
        </div>
        <div class="mt-3">${RichTextEditor.advancedHtml('rule-content-fr', rule.contentI18n?.fr || '', 'Contenu Français')}</div>
        <div class="mt-3">${RichTextEditor.advancedHtml('rule-content-ar', rule.contentI18n?.ar || '', 'المحتوى بالعربية')}</div>
        <div class="mt-3">${RichTextEditor.advancedHtml('rule-content-en', rule.contentI18n?.en || '', 'English content')}</div>
        <footer class="flex justify-end gap-2 mt-5 pt-4 border-t"><button type="button" onclick="ContractsModule.closeModal()" class="sari-btn px-4 bg-slate-200">${this.t('cancel', 'Annuler')}</button><button class="sari-btn px-5 bg-sari-blue text-white">${this.t('publishVersion', 'Publier la version')} ${Number(rule.version) + 1}</button></footer>
      </form></div>`;
    window.SariIcons?.hydrate();
  },
  async saveRule(event, kind) {
    event.preventDefault();
    const previous = this.rule(kind);
    const record = {
      id: `${kind}-${crypto.randomUUID()}`, kind, version: Number(previous?.version || 0) + 1,
      titleI18n: { fr: document.getElementById('rule-title-fr').value, ar: document.getElementById('rule-title-ar').value, en: document.getElementById('rule-title-en').value },
      contentI18n: { fr: RichTextEditor.advancedValue('rule-content-fr'), ar: RichTextEditor.advancedValue('rule-content-ar'), en: RichTextEditor.advancedValue('rule-content-en') },
      publishedAt: new Date().toISOString(),
    };
    await sariDB.save('workRules', record);
    this.closeModal();
    app.showToast(this.t('rulesPublished', 'Nouvelle version publiée. Les salariés devront l’accepter et la signer à nouveau.'), 'success');
    await this.render();
  },

  /* ───────────────────── 304.3 Conflict-of-interest declarations ───────────────────── */
  declarationsHtml(canWrite) {
    const rows = this.state.employees.filter((employee) => employee.status === 'active').map((employee) => {
      const declaration = this.state.declarations.find((item) => item.employeeId === employee.id);
      return { employee, declaration };
    });
    return `<section class="sari-tile p-5"><header class="border-b pb-3"><h3 class="font-extrabold text-lg">${this.t('conflictDeclarationsLabel', 'Déclarations de conflits d’intérêts & éthique')}</h3>
      <p class="text-xs text-slate-500 mt-1">${this.t('conflictDeclarationsHelp', 'Engagement éthique, confidentialité et déclaration des autres emplois / engagements externes de chaque salarié.')}</p></header>
      <div class="space-y-2 mt-4">${rows.map(({ employee, declaration }) => `<article class="p-3 rounded-xl border flex flex-col md:flex-row justify-between gap-2">
        <div><b>${SariUtils.escapeHtml(`${employee.firstName} ${employee.lastName}`)}</b><small class="block text-slate-400">${SariUtils.escapeHtml(employee.position || '')} • ${SariUtils.escapeHtml(employee.department || '')}</small></div>
        <div class="flex items-center gap-2">${declaration ? `<span class="sari-badge text-green-600">${this.t('declared', 'Déclaré')} • ${i18n.formatDate(declaration.declaredAt)}</span>${declaration.hasExternalEngagements ? `<span class="sari-badge bg-sari-amber/15 text-sari-amber">${this.t('externalEngagements', 'Engagements externes')}</span>` : ''}` : `<span class="sari-badge text-sari-amber">${this.t('pendingDeclaration', 'À compléter')}</span>`}
          <button onclick="ContractsModule.viewDeclaration('${employee.id}')" class="doc-action">${this.t('view', 'Voir')}</button></div></article>`).join('')}</div></section>
      <div id="contracts-modal"></div>`;
  },
  async viewDeclaration(employeeId) {
    const declaration = this.state.declarations.find((item) => item.employeeId === employeeId);
    if (!declaration) return DialogManager.alert(this.t('noDeclarationYet', 'Ce salarié n’a pas encore complété sa déclaration. Le parcours d’intégration lui sera proposé dans son espace collaborateur.'), { title: this.t('conflictDeclarationsLabel', 'Déclaration'), icon: 'scale' });
    const root = document.getElementById('sari-modal-root');
    const checks = [
      [declaration.ethicsCommitment, this.t('ethicsCommitment', 'Engagement à une conduite éthique et professionnelle')],
      [declaration.confidentiality, this.t('confidentialityCommitment', 'Engagement de non-divulgation des informations de l’entreprise')],
      [declaration.noConflicts, this.t('noConflictsCommitment', 'Absence de conflit d’intérêts avec les activités de l’entreprise')],
    ];
    root.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3"><article class="w-full max-w-3xl max-h-[92vh] overflow-y-auto sari-tile p-6">
      <header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${this.t('conflictDeclaration', 'Déclaration de conflits d’intérêts')}</span>
        <h2 class="text-xl font-extrabold mt-2">${SariUtils.escapeHtml(this.employeeName(employeeId))}</h2><p class="text-xs text-slate-500">${i18n.formatDate(declaration.declaredAt)}</p></div>
        <button onclick="app.closeModalRoot()"><i data-lucide="x"></i></button></header>
      <div class="space-y-2 mt-4">${checks.map(([done, label]) => `<div class="p-3 rounded-xl border flex items-center gap-2 ${done ? 'border-green-300 bg-green-50 dark:bg-green-500/10' : 'border-red-200 bg-red-50 dark:bg-red-500/10'}"><i data-lucide="${done ? 'check-circle-2' : 'x-circle'}" class="${done ? 'text-green-600' : 'text-red-500'}"></i><b class="text-sm">${SariUtils.escapeHtml(label)}</b></div>`).join('')}</div>
      <section class="mt-4 p-4 border rounded-xl"><h4 class="font-extrabold text-sm">${this.t('externalEngagements', 'Autres emplois / engagements externes')}</h4>
        ${declaration.hasExternalEngagements ? `<div class="rich-content text-sm mt-2">${RichTextEditor.sanitize(declaration.externalEngagementsHtml || '<p>—</p>')}</div>` : `<p class="text-sm text-slate-500 mt-2">${this.t('noExternalEngagements', 'Aucun autre emploi ou engagement externe déclaré.')}</p>`}</section>
      <footer class="flex justify-end gap-2 mt-5 pt-4 border-t"><button onclick="DocumentManager.open('employee','${employeeId}','${SariUtils.escapeHtml(this.employeeName(employeeId))}')" class="sari-btn px-4 bg-slate-800 text-white">GED</button></footer></article></div>`;
    window.SariIcons?.hydrate();
  },
  /** Shared declaration editor — also used by the employee portal wizard (304.3/304.4). */
  openDeclarationEditor(employeeId, { onDone = null, title = '' } = {}) {
    const employee = this.employee(employeeId) || {};
    const old = this.state.declarations.find((item) => item.employeeId === employeeId) || {};
    const root = document.getElementById('sari-modal-root');
    root.innerHTML = `<div class="fixed inset-0 z-[130] sari-modal-backdrop grid place-items-center p-3">
      <form onsubmit="ContractsModule.saveDeclaration(event,'${employeeId}')" class="sari-tile w-full max-w-4xl max-h-[94vh] overflow-y-auto p-6">
        <header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${this.t('conflictDeclaration', 'Déclaration d’éthique & de conflits d’intérêts')}</span>
          <h3 class="text-xl font-extrabold mt-2">${SariUtils.escapeHtml(title || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employeeId)}</h3></div>
          <button type="button" onclick="app.closeModalRoot()"><i data-lucide="x"></i></button></header>
        <div class="space-y-4 mt-4">
          ${this.declarationQuestion('decl-ethics', this.t('ethicsCommitment', 'Engagement à une conduite éthique'), this.t('ethicsHelp', 'Je m’engage à adopter une conduite professionnelle, intègre et loyale dans l’exercice de mes fonctions, conformément aux valeurs et à la réglementation applicables à l’entreprise.'), old.ethicsCommitment)}
          ${this.declarationQuestion('decl-confidentiality', this.t('confidentialityCommitment', 'Engagement de confidentialité'), this.t('confidentialityHelp', 'Je m’engage à ne divulguer, ni pendant ni après ma relation avec l’entreprise, aucune information confidentielle : données clients, prix, fournisseurs, stratégie, documents internes.'), old.confidentiality)}
          ${this.declarationQuestion('decl-no-conflicts', this.t('noConflictsCommitment', 'Absence de conflit d’intérêts'), this.t('noConflictsHelp', 'Je déclare n’avoir aucun intérêt personnel, direct ou indirect, en conflit avec les intérêts de l’entreprise dans le cadre de mes fonctions.'), old.noConflicts)}
          <section class="p-4 border rounded-xl">
            <h4 class="font-extrabold text-sm">${this.t('externalEngagementsQuestion', 'Exercez-vous d’autres emplois ou engagements externes (autre société, activité indépendante, bénévolat dirigeant…) ?')}</h4>
            <p class="text-[11px] text-slate-500 mt-1">${this.t('externalEngagementsHelp', 'Si oui, détaillez l’employeur ou l’activité, la nature des fonctions, le temps consacré et tout lien avec les clients, fournisseurs ou concurrents de SARI — suffisamment pour écarter tout conflit d’intérêts potentiel.')}</p>
            <div class="flex gap-4 mt-3 text-sm"><label class="flex items-center gap-2"><input type="radio" name="decl-external" value="no" ${old.hasExternalEngagements ? '' : 'checked'} onchange="document.getElementById('decl-external-html').classList.toggle('hidden',this.value==='no')"> ${this.t('noExternalEngagementsShort', 'Non')}</label>
            <label class="flex items-center gap-2"><input type="radio" name="decl-external" value="yes" ${old.hasExternalEngagements ? 'checked' : ''} onchange="document.getElementById('decl-external-html').classList.toggle('hidden',this.value==='no')"> ${this.t('yesExternalEngagementsShort', 'Oui')}</label></div>
            <div id="decl-external-html" class="mt-3 ${old.hasExternalEngagements ? '' : 'hidden'}">${RichTextEditor.html('decl-external-html-editor', old.externalEngagementsHtml || '', this.t('externalEngagementsDetail', 'Détail de vos engagements externes (HTML)'))}</div>
          </section>
        </div>
        <footer class="flex justify-end gap-2 mt-5 pt-4 border-t"><button type="button" onclick="app.closeModalRoot()" class="sari-btn px-4 bg-slate-200">${this.t('cancel', 'Annuler')}</button><button class="sari-btn px-5 bg-sari-blue text-white">${this.t('signAndSubmit', 'Signer & soumettre la déclaration')}</button></footer>
      </form></div>`;
    window.SariIcons?.hydrate();
    ContractsModule._declarationDone = onDone;
  },
  declarationQuestion(id, label, help, checked) {
    return `<section class="p-4 border rounded-xl"><label class="flex items-start gap-3 cursor-pointer"><input id="${id}" type="checkbox" class="mt-1" ${checked ? 'checked' : ''}><span><b class="text-sm block">${SariUtils.escapeHtml(label)}</b><small class="text-[11px] text-slate-500">${SariUtils.escapeHtml(help)}</small></span></label></section>`;
  },
  async saveDeclaration(event, employeeId) {
    event.preventDefault();
    const old = this.state.declarations.find((item) => item.employeeId === employeeId) || {};
    const external = new FormData(event.currentTarget).get('decl-external') === 'yes';
    const record = {
      ...old, id: old.id || `cd-${crypto.randomUUID()}`, employeeId,
      ethicsCommitment: document.getElementById('decl-ethics')?.checked || false,
      confidentiality: document.getElementById('decl-confidentiality')?.checked || false,
      noConflicts: document.getElementById('decl-no-conflicts')?.checked || false,
      hasExternalEngagements: external,
      externalEngagementsHtml: external ? RichTextEditor.value('decl-external-html-editor') : '',
      declaredAt: old.declaredAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    if (!record.ethicsCommitment || !record.confidentiality || !record.noConflicts) {
      return app.showToast(this.t('checkAllCommitments', 'Merci de cocher les trois engagements avant de soumettre.'), 'warning');
    }
    await sariDB.save('conflictDeclarations', record);
    app.closeModalRoot();
    const onDone = ContractsModule._declarationDone; ContractsModule._declarationDone = null;
    if (typeof onDone === 'function') await onDone(record);
    app.showToast(this.t('declarationSaved', 'Déclaration signée et enregistrée.'), 'success');
  },

  /* ─────────────────────────── 304.4 Onboarding status board ─────────────────────────── */
  onboardingFor(employeeId) {
    return window.SariCore.leave.computeOnboarding({
      employeeId, acceptances: this.state.acceptances, contracts: this.state.contracts,
      declarations: this.state.declarations,
      rulesVersion: this.rule('rules')?.version, termsVersion: this.rule('terms')?.version,
    });
  },
  stepLabels() {
    return {
      rules_read: this.t('stepRulesRead', 'Lire le règlement intérieur'),
      rules_accepted: this.t('stepRulesAccepted', 'Accepter & signer le règlement'),
      terms_accepted: this.t('stepTermsAccepted', 'Accepter & signer les CGU'),
      contract_signed: this.t('stepContractSigned', 'Signer le contrat de travail'),
      conflict_declared: this.t('stepConflictDeclared', 'Déclarer conflits d’intérêts'),
    };
  },
  onboardingHtml(canWrite) {
    const rows = this.state.employees.filter((employee) => employee.status === 'active').map((employee) => ({ employee, onboarding: this.onboardingFor(employee.id) }));
    const labels = this.stepLabels();
    return `<section class="sari-tile p-5"><header class="border-b pb-3"><h3 class="font-extrabold text-lg">${this.t('onboardingLabel', 'Parcours d’intégration des salariés')}</h3>
      <p class="text-xs text-slate-500 mt-1">${this.t('onboardingHelp', 'Étapes guidées : lecture et signature du règlement, CGU, signature du contrat et déclaration de conflits d’intérêts. Chaque étape est marquée terminée ou en attente.')}</p></header>
      <div class="space-y-3 mt-4">${rows.map(({ employee, onboarding }) => {
        const doneCount = onboarding.steps.filter((step) => step.done).length;
        const pct = Math.round((doneCount / onboarding.steps.length) * 100);
        return `<article class="p-4 rounded-xl border">
          <div class="flex flex-col md:flex-row justify-between gap-2"><div><b>${SariUtils.escapeHtml(`${employee.firstName} ${employee.lastName}`)}</b><small class="block text-slate-400">${SariUtils.escapeHtml(employee.position || '')}</small></div>
          <div class="flex items-center gap-2">${onboarding.done ? `<span class="sari-badge bg-green-600/10 text-green-700"><i data-lucide="badge-check" class="w-3 h-3 inline"></i>${this.t('onboardingCompleted', 'Parcours terminé')}</span>` : `<span class="sari-badge bg-sari-amber/15 text-sari-amber">${onboarding.pending.length} ${this.t('stepsPending', 'étape(s) en attente')}</span>`}<b class="font-mono-tech text-xs">${pct}%</b></div></div>
          <div class="h-2 bg-slate-200 rounded-full mt-2 overflow-hidden"><div class="h-full ${onboarding.done ? 'bg-green-500' : 'bg-sari-amber'}" style="width:${pct}%"></div></div>
          <div class="flex flex-wrap gap-2 mt-3">${onboarding.steps.map((step) => `<span class="sari-badge text-[10px] ${step.done ? 'bg-green-600/10 text-green-700' : 'bg-slate-100 text-slate-500'}"><i data-lucide="${step.done ? 'check' : 'clock'}" class="w-3 h-3 inline"></i>${SariUtils.escapeHtml(labels[step.key] || step.key)}${step.at ? ` • ${i18n.formatDate(step.at)}` : ''}</span>`).join('')}</div>
        </article>`;
      }).join('')}</div></section>`;
  },

  /* ─────────────────────── 304.5 Admin-configurable access restriction ─────────────────────── */
  accessHtml(canWrite) {
    const settings = this.state.policySettings || {};
    const policy = settings.portalAccessPolicy || { enabled: false, blockedModules: ['payslips', 'tasks', 'documents', 'messages'], exemptRoles: ['admin'] };
    const moduleOptions = [
      ['payslips', this.t('payslips', 'Fiches de paie')], ['tasks', this.t('tasks', 'Tâches & Kanban')],
      ['documents', this.t('documents', 'Documents / GED')], ['messages', this.t('internalMessages', 'Messagerie interne')],
      ['leaves', this.t('leaveManager', 'Congés')], ['contracts', this.t('contractsManager', 'Contrats')],
      ['hr', this.t('hr', 'Ressources Humaines')],
    ];
    return `<form onsubmit="ContractsModule.saveAccessPolicy(event)" class="sari-tile p-5">
      <header class="border-b pb-3"><h3 class="font-extrabold text-lg flex gap-2"><i data-lucide="shield-check" class="text-sari-blue"></i>${this.t('accessRestrictionLabel', 'Restriction d’accès avant intégration')}</h3>
      <p class="text-xs text-slate-500 mt-1">${this.t('accessRestrictionHelp', 'Les Administrateurs choisissent les modules bloqués dans l’espace personnel tant que le salarié n’a pas terminé le parcours d’intégration (lecture, acceptation, signature et déclaration).')}</p></header>
      <label class="flex items-center gap-3 mt-4 p-3 border rounded-xl cursor-pointer"><input id="ap-enabled" type="checkbox" ${policy.enabled ? 'checked' : ''}><span><b class="text-sm">${this.t('enableRestriction', 'Activer la restriction d’accès')}</b><small class="block text-[11px] text-slate-500">${this.t('enableRestrictionHelp', 'Un bandeau d’alerte s’affiche de toute façon tant que le parcours n’est pas terminé ; l’activation bloque réellement les modules cochés ci-dessous.')}</small></span></label>
      <div class="mt-4"><b class="text-xs">${this.t('modulesToBlock', 'Modules bloqués jusqu’à la fin du parcours')}</b>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">${moduleOptions.map(([value, label]) => `<label class="flex items-center gap-2 p-2 border rounded-lg text-xs cursor-pointer"><input type="checkbox" name="blocked-${value}" ${(policy.blockedModules || []).includes(value) ? 'checked' : ''}> ${SariUtils.escapeHtml(label)}</label>`).join('')}</div></div>
      <div class="mt-4"><b class="text-xs">${this.t('exemptRoles', 'Rôles exemptés de la restriction')}</b>
        <div class="flex flex-wrap gap-2 mt-2">${Object.keys(SARI_CONFIG.USER_ROLES || {}).map((roleId) => `<label class="flex items-center gap-2 p-2 border rounded-lg text-xs cursor-pointer"><input type="checkbox" name="exempt-${roleId}" ${(policy.exemptRoles || ['admin']).includes(roleId) ? 'checked' : ''}> ${SariUtils.escapeHtml(i18n.getRoleName(roleId))}</label>`).join('')}</div></div>
      <p class="text-[11px] text-slate-400 mt-4">${this.t('policyPreview', 'Aperçu du bandeau salarié')} : « ${SariUtils.escapeHtml(policy.messageI18n?.[i18n.currentLang] || policy.messageI18n?.fr || '')} »</p>
      ${canWrite ? `<button class="sari-btn px-5 py-2 mt-4 bg-sari-blue text-white">${this.t('savePolicy', 'Enregistrer la politique d’accès')}</button>` : ''}
    </form>`;
  },
  async saveAccessPolicy(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const settings = await sariDB.getById('settings', 'app-settings') || { id: 'app-settings' };
    const previous = settings.portalAccessPolicy || {};
    settings.portalAccessPolicy = {
      ...previous,
      enabled: document.getElementById('ap-enabled')?.checked || false,
      blockedModules: ['payslips', 'tasks', 'documents', 'messages', 'leaves', 'contracts', 'hr'].filter((module) => form.elements[`blocked-${module}`]?.checked),
      exemptRoles: Object.keys(SARI_CONFIG.USER_ROLES || {}).filter((roleId) => form.elements[`exempt-${roleId}`]?.checked),
    };
    await sariDB.save('settings', settings);
    this.state.policySettings = settings;
    app.showToast(this.t('policySaved', 'Politique d’accès enregistrée.'), 'success');
    await this.render();
  },

  /* ─────────────── 317–321 Contract document, dual signing and certificates ─────────────── */
  positionTasks(position) { return this.state.positionFunctions.filter((item) => item.position === position && item.isActive !== false).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)); },
  signatureCard(signature, fallbackRole) {
    if (!signature?.signedAt) return `<div class="contract-signature-card"><b>${SariUtils.escapeHtml(fallbackRole)}</b><p class="text-slate-400 mt-8">Signature en attente</p></div>`;
    return `<div class="contract-signature-card"><b>${SariUtils.escapeHtml(signature.role || fallbackRole)}</b><p><strong>${SariUtils.escapeHtml(signature.fullName || signature.name || '')}</strong><br>${SariUtils.escapeHtml(signature.place || '—')} • ${new Date(signature.signedAt).toLocaleString()}</p>${signature.drawing ? `<img src="${signature.drawing}" alt="Signature manuscrite de ${SariUtils.escapeHtml(signature.fullName || signature.name || '')}">` : ''}<small>Signature électronique horodatée</small></div>`;
  },
  contractDocumentHtml(contract) {
    const employee = this.employee(contract.employeeId) || {};
    const company = this.state.settings || {};
    const companyName = company.companyName || company.legalName || 'SARI Système';
    const tasks = this.positionTasks(contract.position);
    const employeeSig = contract.employeeSignature || contract.signature;
    return `<article class="contract-document p-8" id="contract-document-${contract.id}" data-reference="${SariUtils.escapeHtml(contract.referenceCode || contract.id)}" data-company="${SariUtils.escapeHtml(companyName)}">
      <header class="document-print-header doc-header flex justify-between border-b-4 border-teal-700 pb-3"><div><b class="text-xl">${SariUtils.escapeHtml(companyName)}</b><p class="text-xs">${SariUtils.escapeHtml(company.address || company.companyAddress || 'Algérie')}<br>RC : ${SariUtils.escapeHtml(company.tradeRegister || '—')} • NIF : ${SariUtils.escapeHtml(company.taxId || company.nif || '—')}</p></div><div class="text-right"><b>CONTRAT DE TRAVAIL</b><p>${SariUtils.escapeHtml(contract.type || '—')}<br>${SariUtils.escapeHtml(contract.referenceCode || contract.id)}</p></div></header>
      <h1 class="text-center text-2xl font-bold my-6">CONTRAT DE TRAVAIL ${SariUtils.escapeHtml(contract.type || '')}</h1>
      <p><b>ENTRE LES SOUSSIGNÉS :</b></p><p><strong>L’Employeur :</strong> ${SariUtils.escapeHtml(companyName)}, société établie à ${SariUtils.escapeHtml(company.address || company.companyAddress || 'Algérie')}, représentée aux fins des présentes par son représentant habilité, ci-après « l’Entreprise » ;</p>
      <p class="my-3"><strong>Et le Salarié :</strong> ${SariUtils.escapeHtml(`${employee.firstName || ''} ${employee.lastName || ''}`.trim() || contract.employeeName)}, né(e) le ${i18n.formatDate(employee.birthDate)}, demeurant à ${SariUtils.escapeHtml(employee.address || '—')}, matricule ${SariUtils.escapeHtml(employee.referenceCode || employee.id || '—')}, ci-après « le Salarié ».</p>
      <p>Il a été convenu ce qui suit, dans le respect notamment de la loi n° 90-11 du 21 avril 1990 relative aux relations de travail, modifiée et complétée, de la réglementation algérienne applicable et du règlement intérieur de l’Entreprise.</p>
      ${[
        ['Article 1 — Objet et engagement', `L’Entreprise engage le Salarié en qualité de ${SariUtils.escapeHtml(contract.position || '—')} au sein du département ${SariUtils.escapeHtml(contract.department || employee.department || '—')}. Le Salarié accepte cet engagement et déclare disposer des aptitudes requises.`],
        ['Article 2 — Nature et durée', `Le présent contrat est conclu sous la forme ${SariUtils.escapeHtml(contract.type || '—')}, à compter du ${i18n.formatDate(contract.startDate)}${contract.endDate ? ` et jusqu’au ${i18n.formatDate(contract.endDate)}` : ', sans limitation de durée'}. Tout CDD indique un motif légal et un terme conformément aux dispositions impératives applicables.`],
        ['Article 3 — Période d’essai', `La période d’essai est fixée à ${Number(contract.trialPeriodMonths || 0)} mois. Son exécution et sa rupture obéissent à la législation, à la convention collective applicable et au règlement intérieur.`],
        ['Article 4 — Lieu et durée du travail', `Le lieu principal est celui de l’Entreprise, avec les déplacements nécessaires aux fonctions. La durée de travail est de ${Number(contract.weeklyHours || 40)} heures par semaine, organisée conformément à la durée légale et au planning en vigueur.`],
        ['Article 5 — Rémunération', `En contrepartie de son travail, le Salarié perçoit un salaire de base mensuel brut de ${i18n.formatCurrency(contract.baseSalary || 0)}, auquel s’ajoutent les primes et indemnités dues. Les retenues sociales et fiscales sont opérées conformément à la loi.`],
        ['Article 6 — Fonctions et tâches', tasks.length ? `<p>Le Salarié assure notamment les responsabilités configurées pour le poste :</p><ol>${tasks.map((task) => `<li><b>${SariUtils.escapeHtml(task.title)}</b>${task.description ? ` — ${SariUtils.escapeHtml(task.description)}` : ''}</li>`).join('')}</ol><p>Cette liste précise la fonction sans priver l’Entreprise de son pouvoir normal d’organisation, sous réserve du respect de la qualification.</p>` : '<p>Les missions sont celles normalement attachées au poste et celles précisées par la fiche de fonction remise au Salarié.</p>'],
        ['Article 7 — Obligations de l’Entreprise', 'L’Entreprise s’engage à fournir le travail et les moyens nécessaires, verser ponctuellement la rémunération, déclarer le Salarié aux organismes sociaux, assurer la santé, la sécurité et la dignité au travail, respecter le repos, les congés, la formation et l’égalité de traitement.'],
        ['Article 8 — Obligations du Salarié', 'Le Salarié s’engage à exécuter personnellement et loyalement ses tâches, respecter les horaires, consignes de sécurité et règlement intérieur, préserver le matériel, observer la confidentialité et le secret professionnel, éviter les conflits d’intérêts et rendre compte de son activité.'],
        ['Article 9 — Congés, absences et protection sociale', 'Les congés annuels, absences autorisées, accidents du travail et prestations sociales sont régis par la législation algérienne, les déclarations CNAS, la convention collective et les procédures internes. Toute absence doit être justifiée selon les règles applicables.'],
        ['Article 10 — Confidentialité et propriété', 'Les informations techniques, commerciales, personnelles et documentaires obtenues dans l’exercice des fonctions demeurent confidentielles. Les travaux réalisés dans le cadre des fonctions sont remis à l’Entreprise selon les dispositions légales applicables.'],
        ['Article 11 — Discipline et rupture', 'Toute mesure disciplinaire respecte la loi et le règlement intérieur. La suspension ou la rupture du contrat, le préavis, le solde de tout compte et la remise des documents de fin de relation sont traités selon les formes et garanties légales.'],
        ['Article 12 — Droit applicable et différends', 'Le contrat est soumis au droit algérien. Les parties recherchent une solution amiable ; à défaut, le différend relève des procédures de conciliation et juridictions territorialement compétentes.'],
        ['Article 13 — Dispositions finales', `Les clauses particulières suivantes complètent le contrat sans déroger aux dispositions d’ordre public : ${RichTextEditor.sanitize(contract.clausesHtml || '<p>Néant.</p>')} Le contrat électronique signé est établi pour chacune des parties et archivé dans la GED.`],
      ].map(([title, body]) => `<section class="contract-article"><h4>${title}</h4><div>${body}</div></section>`).join('')}
      <p class="mt-6">Fait en deux exemplaires électroniques, lus et approuvés par les parties.</p>
      <section class="contract-signatures">${this.signatureCard(contract.companySignature, 'Représentant de l’Entreprise')}${this.signatureCard(employeeSig, 'Salarié')}</section>
      <footer class="document-print-footer doc-footer mt-8 pt-3 border-t text-xs flex justify-between"><span>${SariUtils.escapeHtml(companyName)} • Contrat ${SariUtils.escapeHtml(contract.type || '')}</span><span>${SariUtils.escapeHtml(contract.referenceCode || contract.id)} • Document électronique GED</span></footer>
    </article>`;
  },
  async openCompanySigning(id) {
    const contract = await sariDB.getById('employmentContracts', id); if (!contract) return;
    const now = new Date(); const root = document.getElementById('contracts-modal');
    root.innerHTML = `<div class="fixed inset-0 z-[130] sari-modal-backdrop grid place-items-center p-3"><form onsubmit="ContractsModule.signAsCompany(event,'${id}')" class="sari-tile p-6 w-full max-w-3xl max-h-[94vh] overflow-y-auto"><header class="flex justify-between border-b pb-3"><h3 class="text-xl font-extrabold">Signature du représentant de l’entreprise</h3><button type="button" onclick="ContractsModule.closeModal()"><i data-lucide="x"></i></button></header><div class="grid md:grid-cols-2 gap-3 mt-4"><label class="doc-label">Nom et prénom *<input id="company-sign-name" class="doc-input" value="${SariUtils.escapeHtml(auth.currentUser.name || '')}" required></label><label class="doc-label">Qualité / fonction *<input id="company-sign-role" class="doc-input" value="Représentant de l’entreprise" required></label><label class="doc-label">Lieu de signature *<input id="company-sign-place" class="doc-input" value="Alger" required></label><label class="doc-label">Date et heure<input class="doc-input" value="${now.toLocaleString()}" disabled></label>${SariSignaturePad.field('company-sign-pad')}</div><button class="sari-btn bg-sari-blue text-white px-5 py-2 mt-4 w-full"><i data-lucide="badge-check"></i>Signer et enregistrer</button></form></div>`;
    window.SariIcons?.hydrate(); setTimeout(() => SariSignaturePad.mount('company-sign-pad'), 0);
  },
  async signAsCompany(event, id) {
    event.preventDefault(); const drawing = SariSignaturePad.value('company-sign-pad'); if (!drawing) return app.showToast('La signature manuscrite est obligatoire.', 'warning');
    const contract = await sariDB.getById('employmentContracts', id); const signedAt = new Date().toISOString();
    contract.companySignature = { fullName: document.getElementById('company-sign-name').value.trim(), name: document.getElementById('company-sign-name').value.trim(), role: document.getElementById('company-sign-role').value.trim(), place: document.getElementById('company-sign-place').value.trim(), signedAt, drawing, userId: auth.currentUser.id };
    if ((contract.employeeSignature || contract.signature)?.signedAt) { contract.status = 'signed'; contract.signedAt = signedAt; }
    await sariDB.save('employmentContracts', contract); this.closeModal();
    if (contract.status === 'signed') await this.archiveSignedContract(contract); app.showToast(contract.status === 'signed' ? 'Contrat signé par les deux parties et archivé dans la GED.' : 'Signature entreprise enregistrée; signature salarié en attente.', 'success'); await this.render();
  },
  async archiveSignedContract(contract) {
    let host = document.getElementById('contract-archive-host'); if (!host) { host = document.createElement('div'); host.id = 'contract-archive-host'; host.style.cssText = 'position:fixed;left:-12000px;top:0;width:794px;background:white'; document.body.appendChild(host); }
    host.innerHTML = this.contractDocumentHtml(contract); await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const blob = await SariUtils.createPDFBlob(`contract-document-${contract.id}`, 'A4'); const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
    const id = contract.signedDocumentId || `contract-signed-${contract.id}`; const existing = await sariDB.getById('documents', id);
    await sariDB.save('documents', { ...(existing || {}), id, name: `${contract.referenceCode || contract.id}-signe.pdf`, mimeType: 'application/pdf', size: blob.size, data, documentType: 'employment_contract_signed', category: 'hr', notes: `Copie signée par les deux parties — ${contract.employeeName}`, tags: ['contract', 'signed', contract.type].filter(Boolean), links: [{ recordType: 'employmentContract', recordId: contract.id }, { recordType: 'employee', recordId: contract.employeeId }], uploaderId: auth.currentUser.id, uploaderName: auth.currentUser.name, version: (existing?.version || 0) + 1, createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
    contract.signedDocumentId = id; contract.signedPdfAt = new Date().toISOString(); await sariDB.save('employmentContracts', contract); host.remove();
  },
  functionsHtml(canWrite) {
    const rows = [...this.state.positionFunctions].sort((a, b) => String(a.position).localeCompare(String(b.position)) || Number(a.order || 0) - Number(b.order || 0));
    return `<section class="sari-tile p-5"><header class="flex justify-between"><div><h3 class="font-extrabold">Fonctions & tâches par poste</h3><p class="text-xs text-slate-500">Réutilisées automatiquement dans les contrats et attestations de travail.</p></div>${canWrite ? '<button onclick="ContractsModule.editFunction()" class="sari-btn bg-sari-blue text-white px-4"><i data-lucide="plus"></i>Ajouter</button>' : ''}</header><div class="space-y-2 mt-4">${rows.map((row) => `<article class="p-3 border rounded-xl flex justify-between"><div><span class="sari-badge">${SariUtils.escapeHtml(row.position)}</span><b class="block text-sm mt-1">${SariUtils.escapeHtml(row.title)}</b><p class="text-xs text-slate-500">${SariUtils.escapeHtml(row.description || '')}</p></div>${canWrite ? `<div><button onclick="ContractsModule.editFunction('${row.id}')" class="doc-action"><i data-lucide="pencil"></i></button><button onclick="ContractsModule.deleteFunction('${row.id}')" class="doc-action text-red-600"><i data-lucide="trash-2"></i></button></div>` : ''}</article>`).join('') || '<p class="text-slate-400">Aucune tâche configurée.</p>'}</div></section>`;
  },
  async editFunction(id = '') { const old = this.state.positionFunctions.find((x) => x.id === id) || {}; const value = await DialogManager.form(id ? 'Modifier la fonction' : 'Nouvelle fonction', [{ name:'position',label:'Poste',value:old.position,required:true },{ name:'title',label:'Fonction / tâche',value:old.title,required:true },{ name:'description',label:'Description',type:'textarea',value:old.description },{ name:'order',label:'Ordre',type:'number',value:old.order || 1 }]); if (!value) return; await sariDB.save('positionFunctions',{...old,...value,id:id || `fn-${crypto.randomUUID()}`,order:Number(value.order)||1,isActive:true,updatedAt:new Date().toISOString()}); await this.render(); },
  async deleteFunction(id) { if (!await DialogManager.confirm('Supprimer cette fonction ?')) return; await sariDB.delete('positionFunctions',id); await this.render(); },
  certificatesHtml(canWrite) {
    const auto = this.state.settings.certificateAutoGeneration === true;
    return `<div class="space-y-4"><section class="sari-tile p-4 flex justify-between items-center"><div><h3 class="font-extrabold">Attestations de travail</h3><p class="text-xs text-slate-500">Génération ${auto ? 'automatique' : 'manuelle'} après demande employé.</p></div>${canWrite ? `<div class="flex gap-2"><button onclick="ContractsModule.editCertificate()" class="sari-btn px-4 bg-sari-blue text-white"><i data-lucide="plus"></i>Nouvelle</button><button onclick="ContractsModule.toggleCertificateAuto()" class="sari-btn px-4 ${auto ? 'bg-green-600 text-white' : 'bg-slate-200'}"><i data-lucide="bot"></i>Auto ${auto ? 'activé' : 'désactivé'}</button></div>` : ''}</section><section class="sari-tile overflow-x-auto"><table class="w-full sari-table"><thead><tr><th>Employé</th><th>Type</th><th>Demande</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${this.state.certificates.map((row) => `<tr><td>${SariUtils.escapeHtml(row.employeeName || this.employeeName(row.employeeId))}</td><td>${SariUtils.escapeHtml(this.state.certificateTemplates.find((x)=>x.id===row.templateId)?.name?.fr || row.templateId)}</td><td>${i18n.formatDate(row.requestedAt)}</td><td>${SariUtils.escapeHtml(row.status)}</td><td><div class="flex gap-1"><button onclick="ContractsModule.viewCertificate('${row.id}')" class="doc-action"><i data-lucide="eye"></i></button>${canWrite ? `<button onclick="ContractsModule.editCertificate('${row.id}')" class="doc-action"><i data-lucide="pencil"></i></button>` : ''}${canWrite && row.status !== 'signed' ? `<button onclick="ContractsModule.openCertificateSigning('${row.id}')" class="doc-action text-green-700"><i data-lucide="pen-tool"></i>Signer</button>` : ''}${canWrite ? `<button onclick="ContractsModule.deleteCertificate('${row.id}')" class="doc-action text-red-600"><i data-lucide="trash-2"></i></button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="5">Aucune attestation.</td></tr>'}</tbody></table></section><section class="sari-tile p-4"><div class="flex justify-between"><h4 class="font-extrabold">Types / modèles configurables</h4>${canWrite ? '<button onclick="ContractsModule.editCertificateTemplate()" class="doc-action text-sari-blue"><i data-lucide="plus"></i>Ajouter un type</button>' : ''}</div><div class="flex flex-wrap gap-2 mt-2">${this.state.certificateTemplates.map((x)=>`<span class="sari-badge">${SariUtils.escapeHtml(x.name?.fr || x.id)}${x.includeSalary?' • salaire':''}${x.includeFunctions?' • fonctions':''}${canWrite ? `<button onclick="ContractsModule.editCertificateTemplate('${x.id}')" class="ml-2"><i data-lucide="pencil" class="w-3 h-3"></i></button><button onclick="ContractsModule.deleteCertificateTemplate('${x.id}')" class="ml-1 text-red-600"><i data-lucide="trash-2" class="w-3 h-3"></i></button>` : ''}</span>`).join('')}</div></section></div>`;
  },
  async editCertificate(id = '') { const old=this.state.certificates.find((x)=>x.id===id)||{}; const value=await DialogManager.form(id?'Modifier l’attestation':'Nouvelle attestation',[{name:'employeeId',label:'Employé',type:'select',value:old.employeeId,options:this.state.employees.map((x)=>({value:x.id,label:`${x.firstName} ${x.lastName}`}))},{name:'templateId',label:'Type / modèle',type:'select',value:old.templateId,options:this.state.certificateTemplates.map((x)=>({value:x.id,label:x.name?.fr||x.id}))},{name:'reason',label:'Motif / note',type:'textarea',value:old.reason||''}]);if(!value)return;await sariDB.save('workCertificates',{...old,...value,id:id||`cert-${crypto.randomUUID()}`,employeeName:this.employeeName(value.employeeId),title:'Attestation de travail',status:old.status||'draft',generationMode:'manual',requestedAt:old.requestedAt||new Date().toISOString(),updatedAt:new Date().toISOString()});await this.render(); },
  async editCertificateTemplate(id = '') { const old=this.state.certificateTemplates.find((x)=>x.id===id)||{};const value=await DialogManager.form(id?'Modifier le type':'Nouveau type d’attestation',[{name:'name',label:'Nom',value:old.name?.fr||old.name||'',required:true},{name:'includeSalary',label:'Inclure le salaire',type:'checkbox',value:old.includeSalary},{name:'includeFunctions',label:'Inclure les fonctions / tâches',type:'checkbox',value:old.includeFunctions}]);if(!value)return;await sariDB.save('certificateTemplates',{...old,id:id||`cert-tpl-${crypto.randomUUID()}`,name:{...(old.name||{}),fr:value.name,ar:value.name,en:value.name},includeSalary:Boolean(value.includeSalary),includeFunctions:Boolean(value.includeFunctions),isActive:true,updatedAt:new Date().toISOString()});await this.render(); },
  async deleteCertificateTemplate(id) { if(this.state.certificates.some((x)=>x.templateId===id))return app.showToast('Ce type est utilisé par une attestation.','warning');if(!await DialogManager.confirm('Supprimer ce type d’attestation ?'))return;await sariDB.delete('certificateTemplates',id);await this.render(); },
  certificateDocumentHtml(row) { const employee=this.employee(row.employeeId)||{}, tpl=this.state.certificateTemplates.find((x)=>x.id===row.templateId)||{}, company=this.state.settings||{}, tasks=this.positionTasks(employee.position); return `<article id="certificate-document-${row.id}" class="contract-document p-10" data-reference="${row.id}" data-company="${SariUtils.escapeHtml(company.companyName||'SARI Système')}"><header class="doc-header document-print-header border-b-4 border-teal-700 pb-3 flex justify-between"><b>${SariUtils.escapeHtml(company.companyName||'SARI Système')}</b><span>ATTESTATION DE TRAVAIL</span></header><h1 class="text-2xl text-center font-bold my-10">ATTESTATION DE TRAVAIL</h1><p>Nous soussignés, <b>${SariUtils.escapeHtml(company.companyName||'SARI Système')}</b>, attestons que <b>${SariUtils.escapeHtml(`${employee.firstName||''} ${employee.lastName||''}`)}</b>, matricule ${SariUtils.escapeHtml(employee.referenceCode||employee.id||'—')}, est employé(e) au sein de notre entreprise depuis le ${i18n.formatDate(employee.hireDate)} en qualité de <b>${SariUtils.escapeHtml(employee.position||'—')}</b>.</p>${tpl.includeSalary?`<p class="mt-5">Son salaire mensuel brut actuel est de <b>${i18n.formatCurrency(employee.salary||0)}</b>.</p>`:''}${tpl.includeFunctions?`<section class="mt-5"><b>Fonctions et tâches exercées :</b><ul>${tasks.map((x)=>`<li>• ${SariUtils.escapeHtml(x.title)}${x.description?` — ${SariUtils.escapeHtml(x.description)}`:''}</li>`).join('')}</ul></section>`:''}<p class="mt-6">La présente attestation est délivrée à l’intéressé(e) pour servir et valoir ce que de droit.</p><section class="contract-signatures mt-10"><div></div>${this.signatureCard(row.managerSignature,'Responsable habilité')}</section><footer class="doc-footer document-print-footer mt-12 border-t pt-3 text-xs flex justify-between"><span>${SariUtils.escapeHtml(company.companyName||'SARI Système')}</span><span>${row.id} • GED</span></footer></article>`; },
  async openCertificateSigning(id){const row=await sariDB.getById('workCertificates',id);if(!row)return;const root=document.getElementById('contracts-modal');root.innerHTML=`<div class="fixed inset-0 z-[130] sari-modal-backdrop grid place-items-center p-3"><form onsubmit="ContractsModule.signCertificate(event,'${id}')" class="sari-tile p-6 w-full max-w-3xl"><h3 class="font-extrabold text-xl">Signer l’attestation</h3><div class="grid md:grid-cols-2 gap-3 mt-4"><label class="doc-label">Nom complet<input id="cert-sign-name" class="doc-input" value="${SariUtils.escapeHtml(auth.currentUser.name||'')}" required></label><label class="doc-label">Qualité<input id="cert-sign-role" class="doc-input" value="Responsable des ressources humaines" required></label><label class="doc-label">Lieu<input id="cert-sign-place" class="doc-input" value="Alger" required></label>${SariSignaturePad.field('cert-sign-pad')}</div><button class="sari-btn bg-sari-blue text-white px-5 py-2 mt-4 w-full">Signer et générer le PDF</button></form></div>`;window.SariIcons?.hydrate();setTimeout(()=>SariSignaturePad.mount('cert-sign-pad'),0);},
  async signCertificate(event,id){event.preventDefault();const drawing=SariSignaturePad.value('cert-sign-pad');if(!drawing)return app.showToast('La signature manuscrite est obligatoire.','warning');const row=await sariDB.getById('workCertificates',id),signedAt=new Date().toISOString();row.managerSignature={fullName:document.getElementById('cert-sign-name').value.trim(),name:document.getElementById('cert-sign-name').value.trim(),role:document.getElementById('cert-sign-role').value.trim(),place:document.getElementById('cert-sign-place').value.trim(),signedAt,drawing,userId:auth.currentUser.id};row.status='signed';row.signedAt=signedAt;await sariDB.save('workCertificates',row);const host=document.createElement('div');host.style.cssText='position:fixed;left:-12000px;top:0;width:794px;background:white';host.innerHTML=this.certificateDocumentHtml(row);document.body.appendChild(host);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const blob=await SariUtils.createPDFBlob(`certificate-document-${row.id}`,'A4'),data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)}),docId=row.generatedDocumentId||`certificate-pdf-${row.id}`;await sariDB.save('documents',{id:docId,name:`${row.id}.pdf`,mimeType:'application/pdf',size:blob.size,data,documentType:'work_certificate',category:'hr',notes:`Attestation de travail • ${row.employeeName}`,tags:['certificate','signed'],links:[{recordType:'workCertificate',recordId:row.id},{recordType:'employee',recordId:row.employeeId}],uploaderId:auth.currentUser.id,uploaderName:auth.currentUser.name,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});row.generatedDocumentId=docId;await sariDB.save('workCertificates',row);host.remove();this.closeModal();app.showToast('Attestation signée et archivée dans la GED.','success');await this.render();},
  async viewCertificate(id){const row=await sariDB.getById('workCertificates',id);if(!row)return;document.getElementById('sari-modal-root').innerHTML=`<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3"><div class="w-full max-w-4xl max-h-[94vh] overflow-y-auto bg-white"><button onclick="app.closeModalRoot()" class="float-right p-3"><i data-lucide="x"></i></button>${this.certificateDocumentHtml(row)}</div></div>`;window.SariIcons?.hydrate();},
  async deleteCertificate(id){if(!await DialogManager.confirm('Supprimer cette attestation ?'))return;await sariDB.delete('workCertificates',id);await this.render();},
  async toggleCertificateAuto(){const settings=await sariDB.getById('settings','app-settings')||{id:'app-settings'};settings.certificateAutoGeneration=!settings.certificateAutoGeneration;await sariDB.save('settings',settings);await this.render();},

};
window.ContractsModule = ContractsModule;
export {};
