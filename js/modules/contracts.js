/**
 * SARI Système — Employment Contracts Manager & Electronic Signature Workflow
 * (Section 304). Contract CRUD, work rules & general terms publishing,
 * conflict-of-interest declarations, guided onboarding status board and the
 * admin-configurable portal access restriction (304.5).
 */
const ContractsModule = {
  state: {
    tab: 'contracts', contracts: [], employees: [], paymentTypes: [], declarations: [],
    acceptances: [], rules: [], jobFunctions: [], certificates: [], certificateConfig: null,
    query: '', employee: 'all', status: 'all', certStatus: 'all',
  },
  t(key, fallback) { return i18n.t(key, fallback); },
  canWrite() { return auth.can('contracts', 'edit'); },
  employee(id) { return this.state.employees.find((item) => item.id === id); },
  employeeName(id) { const employee = this.employee(id); return employee ? `${employee.firstName} ${employee.lastName}` : id || '—'; },
  rule(kind) { return this.state.rules.filter((rule) => rule.kind === kind).sort((a, b) => Number(b.version) - Number(a.version))[0]; },
  /* 319 — configurable job functions/tasks per position, reused by contracts & certificates. */
  jobFunctionsFor(position = '') {
    const normalized = String(position).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    return this.state.jobFunctions.find((item) => String(item.position?.fr || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === normalized) || null;
  },
  companyInfo() {
    const settings = this.state.companySettings || {};
    return {
      companyName: settings.companyName || 'SARI SYSTÈME',
      legalName: settings.legalName || settings.companyName || 'SARI SYSTÈME',
      address: settings.address || 'Algérie', nif: settings.nif || '', rc: settings.rc || '',
      nai: settings.nai || settings.ai || '', ai: settings.ai || '', nis: settings.nis || '',
      documentLogo: settings.documentLogo || '', phone: settings.phone || '', email: settings.email || '',
    };
  },
  /* 318/319/320 — full contract document (articles, parties, dual signature blocks). */
  contractDocumentHtml(contract) {
    const employee = this.employee(contract.employeeId) || {};
    return window.SariCore.contracts.renderContractDocument({
      contract, employee, company: this.companyInfo(),
      jobTasks: this.jobFunctionsFor(contract.position),
      lang: i18n.currentLang,
    });
  },
  certificateTypeLabel(typeId) { return OptionCatalog.label('workCertificateType', typeId); },
  certificateTypes() { return OptionCatalog.options('workCertificateType'); },

  async load() {
    const [contracts, employees, paymentTypes, declarations, acceptances, rules, jobFunctions, certificates, settings] = await Promise.all(['employmentContracts', 'employees', 'paymentTypes', 'conflictDeclarations', 'ruleAcceptances', 'workRules', 'jobFunctions', 'workCertificates', 'settings'].map((store) => sariDB.getAll(store)));
    Object.assign(this.state, { contracts, employees, paymentTypes, declarations, acceptances, rules, jobFunctions, certificates });
    this.state.policySettings = settings.find((record) => record.id === 'app-settings') || {};
    this.state.companySettings = settings.find((record) => record.id === 'app-settings') || {};
    this.state.certificateConfig = settings.find((record) => record.id === 'work-certificate-config') || { id: 'work-certificate-config', autoGenerate: false };
  },
  async render(containerId = 'sari-main-view') {
    const c = document.getElementById(containerId); if (!c) return;
    await this.load();
    const canWrite = this.canWrite();
    const tabs = [
      ['contracts', 'file-signature', 'contractsLabel'],
      ['functions', 'list-checks', 'jobFunctionsLabel'],
      ['certificates', 'file-badge', 'workCertificatesLabel'],
      ['rules', 'scroll-text', 'workRulesLabel'],
      ['declarations', 'scale', 'conflictDeclarationsLabel'],
      ['onboarding', 'list-checks', 'onboardingLabel'],
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
      contracts: () => this.contractsHtml(canWrite), functions: () => this.functionsHtml(canWrite),
      certificates: () => this.certificatesHtml(canWrite), rules: () => this.rulesHtml(canWrite),
      declarations: () => this.declarationsHtml(canWrite), onboarding: () => this.onboardingHtml(canWrite),
      access: () => this.accessHtml(canWrite),
    };
    return (map[this.state.tab] || map.contracts)();
  },

  /* ─────────────────────────────── 304.1 Contracts CRUD ─────────────────────────────── */
  statusLabel(status) {
    const labels = {
      draft: { fr: 'Brouillon', ar: 'مسودة', en: 'Draft' }, sent: { fr: 'Envoyé à la signature', ar: 'أُرسل للتوقيع', en: 'Sent for signature' },
      employee_signed: { fr: 'Signé par le salarié', ar: 'وقعه العامل', en: 'Employee signed' },
      signed: { fr: 'Signé (2 parties)', ar: 'موقع (طرفان)', en: 'Signed (both parties)' }, archived: { fr: 'Archivé', ar: 'مؤرشف', en: 'Archived' },
    };
    return labels[status]?.[i18n.currentLang] || labels[status]?.fr || status || '—';
  },
  contractStatusBadge(status) {
    const colors = { draft: 'text-slate-600', sent: 'text-sari-amber', employee_signed: 'text-sari-blue', signed: 'text-green-600', archived: 'text-slate-400' };
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
        <td>${contract.signature?.signedAt ? `<span class="text-green-600 text-xs"><i data-lucide="badge-check" class="w-3 h-3 inline"></i> ${i18n.formatDate(contract.signature.signedAt)}<small class="block text-slate-400">${SariUtils.escapeHtml(contract.signature.name || '')}</small></span>` : `<span class="text-slate-400 text-xs">${this.t('pendingSignature', 'En attente')}</span>`}</td>
        <td>${this.contractStatusBadge(contract.status)}</td>
        <td><div class="flex flex-wrap gap-1"><button onclick="ContractsModule.viewContract('${contract.id}')" class="doc-action">${this.t('view', 'Voir')}</button><button onclick="ContractsModule.printContract('${contract.id}')" class="doc-action"><i data-lucide="printer"></i>PDF</button><button onclick="DocumentManager.open('employmentContract','${contract.id}','${contract.referenceCode || contract.id}')" class="doc-action">GED</button>${canWrite ? `<button onclick="ContractsModule.openContractEditor('${contract.id}')" class="doc-action">${this.t('edit', 'Modifier')}</button>${contract.status === 'draft' ? `<button onclick="ContractsModule.sendContract('${contract.id}')" class="doc-action text-sari-blue">${this.t('sendForSignature', 'Envoyer à signer')}</button>` : ''}<button onclick="ContractsModule.removeContract('${contract.id}')" class="doc-action text-red-600">${this.t('delete', 'Supprimer')}</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="10" class="p-8 text-slate-400">${this.t('noContract', 'Aucun contrat enregistré.')}</td></tr>`}</tbody></table></section>
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
    if (record.status === 'signed' && !record.signature) record.signature = { name: 'Signé manuellement (RH)', signedAt: new Date().toISOString().slice(0, 10), device: 'Contrats SARI' };
    // 318/319 — persist the full text (Algerian template + configurable job functions).
    record.contentHtml = this.contractDocumentHtml(record);
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
    await this.load();
    const employee = this.employee(contract.employeeId) || {};
    const paymentType = this.state.paymentTypes.find((type) => type.id === contract.paymentTypeId) || {};
    // 318 — full text with header/footer, pagination and identified parties
    // (regenerated live in the active language; the archived PDF keeps the
    // frozen version stored at signature time).
    const documentHtml = this.contractDocumentHtml(contract);
    const employeeSig = contract.signatures?.employee;
    const companySig = contract.signatures?.company;
    const legacy = contract.signature;
    const root = document.getElementById('sari-modal-root');
    root.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3"><article class="w-full max-w-4xl max-h-[94vh] overflow-y-auto sari-tile p-6" id="ctt-print-${contract.id}">
      <header class="no-print flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${contract.referenceCode || contract.id}</span>
        <h2 class="text-xl font-extrabold mt-2">${SariUtils.escapeHtml(contract.title)}</h2><p class="text-xs text-slate-500">${SariUtils.escapeHtml(contract.employeeName || this.employeeName(contract.employeeId))} • ${this.statusLabel(contract.status)}</p></div>
        <button onclick="app.closeModalRoot()"><i data-lucide="x"></i></button></header>
      <div class="no-print grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-sm">
        <div><small class="text-slate-400">${this.t('contractType', 'Type')}</small><b class="block">${SariUtils.escapeHtml(contract.type || '—')}</b></div>
        <div><small class="text-slate-400">${this.t('position', 'Poste')}</small><b class="block">${SariUtils.escapeHtml(contract.position || '—')}</b></div>
        <div><small class="text-slate-400">${this.t('contractPeriod', 'Période')}</small><b class="block font-mono-tech text-xs">${i18n.formatDate(contract.startDate)}${contract.endDate ? ` → ${i18n.formatDate(contract.endDate)}` : ''}</b></div>
        <div><small class="text-slate-400">${this.t('baseSalary', 'Salaire')}</small><b class="block">${i18n.formatCurrency(contract.baseSalary)}</b></div>
      </div>
      <div class="no-print mt-4 p-4 border rounded-xl grid sm:grid-cols-2 gap-3">
        <div><h4 class="font-extrabold text-sm">${this.t('signatureStatus', 'État des signatures')}</h4>
          <div class="space-y-1 mt-2 text-xs">${[
            [companySig, this.t('companySignature', 'Signature de l’entreprise')],
            [employeeSig || legacy, this.t('employeeSignature', 'Signature du salarié')],
          ].map(([sig, label]) => `<div class="flex items-center gap-2">${sig ? `<i data-lucide="check-circle-2" class="w-4 h-4 text-green-600"></i>` : `<i data-lucide="circle" class="w-4 h-4 text-slate-300"></i>`}<span>${label}${sig ? ` — ${SariUtils.escapeHtml(sig.name || '')} • ${i18n.formatDate(sig.signedAt)}` : ''}</span></div>`).join('')}</div></div>
        <div><h4 class="font-extrabold text-sm">${this.t('workflowHistory', 'Historique')}</h4><p class="text-xs text-slate-500 mt-2">${this.t('sentAt', 'Envoyé')} : ${i18n.formatDate(contract.sentAt)}<br>${this.t('createdAt', 'Créé')} : ${i18n.formatDate(contract.createdAt)}</p></div>
      </div>
      <div class="contract-print-sheet mt-5 bg-white text-slate-900 border rounded-xl p-5">${documentHtml}</div>
      <footer class="no-print flex flex-wrap justify-end gap-2 mt-5 pt-4 border-t">
        <button onclick="ContractsModule.downloadContractPDF('${contract.id}')" class="sari-btn px-4 bg-sari-lime text-slate-900"><i data-lucide="download"></i>PDF</button>
        <button onclick="ContractsModule.printContract('${contract.id}')" class="sari-btn px-4 bg-slate-800 text-white"><i data-lucide="printer"></i>${this.t('print', 'Imprimer')}</button>
        <button onclick="DocumentManager.open('employmentContract','${contract.id}','${contract.referenceCode || contract.id}')" class="sari-btn px-4 bg-slate-200">GED</button>
        ${this.canWrite() && !companySig ? `<button onclick="ContractsModule.openCompanySignature('${contract.id}')" class="sari-btn px-4 bg-sari-blue text-white"><i data-lucide="file-signature"></i>${this.t('signForCompany', 'Signer pour l’entreprise')}</button>` : ''}
        ${this.canWrite() ? `<button onclick="app.closeModalRoot();ContractsModule.openContractEditor('${contract.id}')" class="sari-btn px-4 bg-slate-200">${this.t('edit', 'Modifier')}</button>` : ''}
      </footer></article></div>`;
    window.SariIcons?.hydrate();
  },
  printContract(id) {
    const source = document.getElementById(`ctt-print-${id}`);
    if (source) { SariUtils.printElement(`ctt-print-${id}`, 'Contrat SARI'); return; }
    this.viewContract(id).then(() => setTimeout(() => { const el = document.getElementById(`ctt-print-${id}`); if (el) SariUtils.printElement(`ctt-print-${id}`, 'Contrat SARI'); }, 400));
  },
  /** 318/320 — PDF export of the full document with page numbering. */
  async downloadContractPDF(id, { archive = false } = {}) {
    const contract = await sariDB.getById('employmentContracts', id); if (!contract) return;
    await this.load();
    const employee = this.employee(contract.employeeId) || {};
    const mount = document.getElementById('contracts-modal');
    mount.innerHTML = `<div id="ctt-doc-${contract.id}" class="bg-white text-slate-900" style="width:794px;padding:24px;font-family:'Plus Jakarta Sans',Arial,sans-serif">${window.SariCore.contracts.renderContractDocument({ contract, employee, company: this.companyInfo(), jobTasks: this.jobFunctionsFor(contract.position), lang: i18n.currentLang })}</div>`;
    window.SariIcons?.hydrate();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const reference = contract.referenceCode || contract.id;
    const frozen = contract.contentHtml || this.contractDocumentHtml(contract);
    const frozenMount = document.getElementById(`ctt-doc-${contract.id}`);
    if (frozenMount) frozenMount.innerHTML = frozen;
    const blob = await SariUtils.createPDFBlob(`ctt-doc-${contract.id}`, 'A4', { pageFooter: (page, total) => `${reference} — ${i18n.t('pageOf', 'Page')} ${page}/${total}` });
    mount.innerHTML = '';
    if (archive) {
      // 317 — automatically post the signed copy into the GED, linked to the employee.
      const documentId = `ctt-pdf-${contract.id}`;
      const existing = await sariDB.getById('documents', documentId);
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
      const document = { ...existing, id: documentId, name: `${reference}-signe.pdf`, mimeType: 'application/pdf', size: blob.size, data, documentType: 'employmentContract', category: 'hr', notes: `${this.t('signedContractCopy', 'Copie signée du contrat')} ${contract.title || ''} • ${contract.employeeName || ''}`, tags: ['contract', 'signé', contract.status].filter(Boolean), links: [{ recordType: 'employmentContract', recordId: contract.id }, { recordType: 'employee', recordId: contract.employeeId }], uploaderId: auth.currentUser?.id || '', uploaderName: auth.currentUser?.name || 'SARI', version: (existing?.version || 0) + 1, createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      await sariDB.save('documents', document);
      contract.generatedDocumentId = documentId;
      contract.generatedAt = new Date().toISOString();
      await sariDB.save('employmentContracts', contract);
      app.showToast(this.t('signedCopyArchived', 'Copie signée archivée dans la GED (dossier du salarié).'), 'success');
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${reference}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    return blob;
  },
  /** 320 — company side of the dual signature (canvas-drawn). */
  async openCompanySignature(contractId) {
    const contract = await sariDB.getById('employmentContracts', contractId); if (!contract) return;
    const modal = document.getElementById('contracts-modal');
    modal.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3">
      <form onsubmit="ContractsModule.saveCompanySignature(event,'${contractId}')" class="sari-tile w-full max-w-2xl max-h-[94vh] overflow-y-auto p-6">
        <header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${this.t('companySignature', 'Signature de l’entreprise')}</span>
          <h3 class="text-xl font-extrabold mt-2">${SariUtils.escapeHtml(contract.title || contract.referenceCode || contract.id)}</h3>
          <p class="text-xs text-slate-500 mt-1">${this.t('companySignatureHelp', 'Signature du représentant de l’entreprise : nom, fonction, lieu, date/heure et signature manuscrite tracée sur le pavé.')}</p></div>
          <button type="button" onclick="ContractsModule.closeModal()"><i data-lucide="x"></i></button></header>
        <div class="grid md:grid-cols-2 gap-3 mt-4">
          <label class="doc-label">${this.t('fullName', 'Nom complet du signataire')} *<input id="cts-name" class="doc-input" value="${SariUtils.escapeHtml(auth.currentUser?.name || '')}" required></label>
          <label class="doc-label">${this.t('signatureTitle', 'Fonction / titre')} *<input id="cts-title" class="doc-input" value="${this.t('companyRepresentative', 'Représentant de l’entreprise')}" required></label>
          <label class="doc-label md:col-span-2">${this.t('signaturePlace', 'Lieu de signature')} *<input id="cts-place" class="doc-input" value="${SariUtils.escapeHtml(this.companyInfo().address || 'Alger')}" required></label>
          <div class="md:col-span-2">${SignaturePad.html('cts-signature', this.t('drawSignature', 'Signature manuscrite (souris / doigt / stylet)'), contract.signatures?.company?.imageDataUrl || '')}</div>
        </div>
        <footer class="flex justify-end gap-2 mt-5 pt-4 border-t"><button type="button" onclick="ContractsModule.closeModal()" class="sari-btn px-4 bg-slate-200">${this.t('cancel', 'Annuler')}</button><button class="sari-btn px-5 bg-sari-blue text-white">${this.t('signAndFinalize', 'Signer & finaliser')}</button></footer>
      </form></div>`;
    window.SariIcons?.hydrate();
    SignaturePad.mount();
  },
  async saveCompanySignature(event, contractId) {
    event.preventDefault();
    const contract = await sariDB.getById('employmentContracts', contractId);
    const name = document.getElementById('cts-name')?.value.trim();
    const title = document.getElementById('cts-title')?.value.trim();
    const place = document.getElementById('cts-place')?.value.trim();
    if (!name || !title || !place) return app.showToast(this.t('signatureFieldsRequired', 'Renseignez le nom, la fonction et le lieu.'), 'warning');
    if (SignaturePad.isEmpty('cts-signature')) return app.showToast(this.t('drawRequired', 'Tracez votre signature manuscrite dans le pavé.'), 'warning');
    contract.signatures = contract.signatures || {};
    contract.signatures.company = { name, title, place, imageDataUrl: SignaturePad.value('cts-signature'), userId: auth.currentUser?.id, signedAt: new Date().toISOString() };
    if (contract.signatures.employee) { contract.status = 'signed'; contract.signedAt = new Date().toISOString(); }
    contract.updatedAt = new Date().toISOString();
    await sariDB.save('employmentContracts', contract);
    this.closeModal();
    app.showToast(this.t('companySigned', 'Contrat signé pour l’entreprise.'), 'success');
    await this.downloadContractPDF(contractId, { archive: true });
    await this.render();
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
  /* ──────────────────── 319 Job functions & tasks per position (CRUD) ──────────────────── */
  functionsHtml(canWrite) {
    const rows = [...this.state.jobFunctions].sort((a, b) => (a.order || 0) - (b.order || 0));
    return `<section class="sari-tile p-5"><header class="flex justify-between items-center mb-4"><div><h3 class="font-extrabold text-lg">${this.t('jobFunctionsLabel', 'Fonctions & tâches par poste')}</h3>
      <p class="text-xs text-slate-500">${this.t('jobFunctionsHelp', 'Liste CRUD des missions de chaque poste : injectées automatiquement dans le contrat (article « Fonctions et tâches ») et réutilisables dans l’attestation de travail (Section 321).')}</p></div>
      ${canWrite ? `<button onclick="ContractsModule.editFunction()" class="sari-btn px-4 py-2 bg-sari-blue text-white text-xs"><i data-lucide="plus"></i>${this.t('newJobFunction', 'Nouvelle fiche de poste')}</button>` : ''}</header>
      <div class="grid md:grid-cols-2 gap-3">${rows.map((item) => `<article class="p-4 rounded-xl border ${item.isActive === false ? 'opacity-50' : ''}">
        <div class="flex justify-between items-start"><b>${SariUtils.escapeHtml(item.position?.[i18n.currentLang] || item.position?.fr || item.id)}</b><span class="sari-badge text-[9px]">${item.order || '—'}</span></div>
        <div class="rich-content text-xs mt-2 max-h-44 overflow-y-auto">${RichTextEditor.sanitize(item.tasks?.[i18n.currentLang] || item.tasks?.fr || '')}</div>
        ${canWrite ? `<footer class="flex gap-2 mt-3 pt-3 border-t"><button onclick="ContractsModule.editFunction('${item.id}')" class="doc-action">${this.t('edit', 'Modifier')}</button><button onclick="ContractsModule.toggleFunction('${item.id}')" class="doc-action">${item.isActive === false ? this.t('activate', 'Activer') : this.t('deactivate', 'Désactiver')}</button><button onclick="ContractsModule.deleteFunction('${item.id}')" class="doc-action text-red-600">${this.t('delete', 'Supprimer')}</button></footer>` : ''}</article>`).join('')}</div></section>`;
  },
  async editFunction(id = '') {
    const old = id ? await sariDB.getById('jobFunctions', id) : {};
    const values = await DialogManager.form(id ? this.t('editJobFunction', 'Modifier la fiche de poste') : this.t('newJobFunction', 'Nouvelle fiche de poste'), [
      { name: 'fr', label: `${this.t('position', 'Poste')} (FR)`, value: old.position?.fr || '', required: true },
      { name: 'ar', label: `${this.t('position', 'Poste')} (AR)`, value: old.position?.ar || '' },
      { name: 'en', label: `${this.t('position', 'Poste')} (EN)`, value: old.position?.en || '' },
      { name: 'tasksFr', label: `${this.t('tasksLabel', 'Tâches & fonctions')} (FR, HTML)`, type: 'textarea', value: old.tasks?.fr || '<ul><li></li></ul>' },
      { name: 'tasksAr', label: `${this.t('tasksLabel', 'Tâches & fonctions')} (AR, HTML)`, type: 'textarea', value: old.tasks?.ar || '' },
      { name: 'tasksEn', label: `${this.t('tasksLabel', 'Tâches & fonctions')} (EN, HTML)`, type: 'textarea', value: old.tasks?.en || '' },
      { name: 'order', label: this.t('orderLabel', 'Ordre'), type: 'number', value: old.order ?? this.state.jobFunctions.length + 1 },
    ]);
    if (!values) return;
    await sariDB.save('jobFunctions', { ...old, id: id || `jf-${crypto.randomUUID()}`, position: { fr: values.fr, ar: values.ar, en: values.en }, tasks: { fr: values.tasksFr, ar: values.tasksAr, en: values.tasksEn }, order: Number(values.order) || 0, isActive: old.isActive !== false });
    app.showToast(this.t('jobFunctionSaved', 'Fiche de poste enregistrée.'), 'success');
    await this.render();
  },
  async toggleFunction(id) { const item = await sariDB.getById('jobFunctions', id); item.isActive = item.isActive === false; await sariDB.save('jobFunctions', item); await this.render(); },
  async deleteFunction(id) { if (!await DialogManager.confirm(this.t('deleteJobFunctionConfirm', 'Supprimer cette fiche de poste ?'))) return; await sariDB.delete('jobFunctions', id); await this.render(); },

  /* ──────────────────────── 321 Work certificates manager (CRUD) ──────────────────────── */
  certificateStatusLabel(status) {
    const labels = {
      requested: { fr: 'Demandée', ar: 'مطلوبة', en: 'Requested' }, draft: { fr: 'Brouillon', ar: 'مسودة', en: 'Draft' },
      generated: { fr: 'Générée', ar: 'مولدة', en: 'Generated' }, signed: { fr: 'Signée', ar: 'موقعة', en: 'Signed' }, archived: { fr: 'Archivée', ar: 'مؤرشفة', en: 'Archived' },
    };
    return labels[status]?.[i18n.currentLang] || labels[status]?.fr || status || '—';
  },
  certificatesHtml(canWrite) {
    const config = this.state.certificateConfig || {};
    const rows = window.SariCore.ordering.stableOrder(this.state.certificates).filter((record) => (this.state.certStatus === 'all' || record.status === this.state.certStatus) && (this.state.employee === 'all' || record.employeeId === this.state.employee));
    return `<div class="space-y-4">
      <section class="sari-tile p-4 flex flex-wrap items-center gap-3">
        <select class="doc-input w-44" onchange="ContractsModule.state.employee=this.value;ContractsModule.render()"><option value="all">${this.t('allEmployees', 'Tous les salariés')}</option>${this.state.employees.map((employee) => `<option value="${employee.id}" ${this.state.employee === employee.id ? 'selected' : ''}>${SariUtils.escapeHtml(`${employee.firstName} ${employee.lastName}`)}</option>`).join('')}</select>
        <select class="doc-input w-44" onchange="ContractsModule.state.certStatus=this.value;ContractsModule.render()"><option value="all">${this.t('allStatuses', 'Tous les statuts')}</option>${['requested', 'draft', 'generated', 'signed', 'archived'].map((status) => `<option value="${status}" ${this.state.certStatus === status ? 'selected' : ''}>${this.certificateStatusLabel(status)}</option>`).join('')}</select>
        <label class="flex items-center gap-2 text-xs ml-auto"><input type="checkbox" ${config.autoGenerate ? 'checked' : ''} onchange="ContractsModule.toggleCertificateAutoGenerate(this.checked)"> ${this.t('certificateAutoGeneration', 'Génération automatique à la demande du salarié')}</label>
        ${canWrite ? `<button onclick="ContractsModule.openCertificateEditor()" class="sari-btn px-4 py-2 bg-sari-blue text-white text-xs"><i data-lucide="plus"></i>${this.t('newCertificate', 'Nouvelle attestation')}</button>` : ''}
      </section>
      <section class="sari-tile overflow-x-auto"><table class="w-full sari-table"><thead><tr>
        <th>${this.t('orderLabel', 'Ordre')}</th><th>${this.t('reference', 'Référence')}</th><th>${this.t('employee', 'Salarié')}</th><th>${this.t('certificateType', 'Type')}</th><th>${this.t('issueDate', 'Délivrée le')}</th><th>${this.t('signature', 'Signature')}</th><th>${this.t('status', 'Statut')}</th><th>${this.t('actionsHeader', 'Actions')}</th>
      </tr></thead><tbody>${rows.map((record) => `<tr>
        <td class="text-center font-mono-tech text-sari-blue">${record.order || '—'}</td>
        <td class="font-mono-tech text-sari-blue font-bold">${record.referenceCode || record.id}</td>
        <td><b>${SariUtils.escapeHtml(record.employeeName || this.employeeName(record.employeeId))}</b><small class="block">${SariUtils.escapeHtml(record.position || '')}</small></td>
        <td><span class="sari-badge">${SariUtils.escapeHtml(this.certificateTypeLabel(record.typeId))}</span></td>
        <td class="font-mono-tech text-xs">${i18n.formatDate(record.issueDate)}</td>
        <td>${record.signatures?.manager?.signedAt ? `<span class="text-green-600 text-xs"><i data-lucide="badge-check" class="w-3 h-3 inline"></i> ${SariUtils.escapeHtml(record.signatures.manager.name || '')}</span>` : `<span class="text-slate-400 text-xs">${this.t('pendingSignature', 'En attente')}</span>`}</td>
        <td><span class="sari-badge ${record.status === 'signed' ? 'text-green-600' : ''}">${this.certificateStatusLabel(record.status)}</span></td>
        <td><div class="flex flex-wrap gap-1"><button onclick="ContractsModule.viewCertificate('${record.id}')" class="doc-action">${this.t('view', 'Voir')}</button>${canWrite ? `<button onclick="ContractsModule.openCertificateEditor('${record.id}')" class="doc-action">${this.t('edit', 'Modifier')}</button>${record.status !== 'signed' ? `<button onclick="ContractsModule.openCertificateSignature('${record.id}')" class="doc-action text-sari-blue"><i data-lucide="file-signature"></i>${this.t('sign', 'Signer')}</button>` : `<button onclick="ContractsModule.downloadCertificatePDF('${record.id}')" class="doc-action"><i data-lucide="download"></i>PDF</button>`}<button onclick="ContractsModule.removeCertificate('${record.id}')" class="doc-action text-red-600">${this.t('delete', 'Supprimer')}</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="8" class="p-8 text-slate-400">${this.t('noCertificate', 'Aucune attestation de travail.')}</td></tr>`}</tbody></table></section>
      <div id="contracts-modal"></div></div>`;
  },
  async toggleCertificateAutoGenerate(value) {
    const config = await sariDB.getById('settings', 'work-certificate-config') || { id: 'work-certificate-config' };
    config.autoGenerate = Boolean(value);
    config.updatedAt = new Date().toISOString();
    await sariDB.save('settings', config);
    this.state.certificateConfig = config;
    app.showToast(this.t('certificateConfigSaved', 'Paramètre de génération enregistré.'), 'success');
  },
  certificateDocumentHtml(record) {
    const employee = this.employee(record.employeeId) || {};
    return window.SariCore.contracts.renderWorkCertificate({
      certificate: record, employee, company: this.companyInfo(),
      jobTasks: this.jobFunctionsFor(record.position),
      lang: i18n.currentLang,
    });
  },
  async openCertificateEditor(id = '') {
    const old = id ? await sariDB.getById('workCertificates', id) : {};
    const types = this.certificateTypes();
    const modal = document.getElementById('contracts-modal');
    modal.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3">
      <form onsubmit="ContractsModule.saveCertificate(event)" class="sari-tile w-full max-w-4xl max-h-[94vh] overflow-y-auto p-6">
        <header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${this.t('workCertificate', 'Attestation de travail')}</span>
          <h3 class="text-xl font-extrabold mt-2">${id ? this.t('editCertificate', 'Modifier l’attestation') : this.t('newCertificate', 'Nouvelle attestation')}</h3></div>
          <button type="button" onclick="ContractsModule.closeModal()"><i data-lucide="x"></i></button></header>
        <input type="hidden" id="wct-id" value="${id || ''}">
        <div class="grid md:grid-cols-2 gap-3 mt-4">
          <label class="doc-label">${this.t('employee', 'Salarié')} *<select id="wct-employee" class="doc-input" required onchange="ContractsModule.certificateEmployeeChanged()">${this.state.employees.map((employee) => `<option value="${employee.id}" ${old.employeeId === employee.id ? 'selected' : ''}>${SariUtils.escapeHtml(`${employee.firstName} ${employee.lastName}`)} — ${SariUtils.escapeHtml(employee.position || '')}</option>`).join('')}</select></label>
          <label class="doc-label">${this.t('certificateType', 'Type d’attestation')} *<select id="wct-type" class="doc-input" onchange="ContractsModule.certificateTypeChanged()">${types.map((type) => `<option value="${type.value}" ${old.typeId === type.value ? 'selected' : ''}>${SariUtils.escapeHtml(type.name?.[i18n.currentLang] || type.name?.fr || type.value)}</option>`).join('')}</select></label>
          <label class="doc-label">${this.t('issueDate', 'Date de délivrance')}<input id="wct-date" type="date" class="doc-input" value="${old.issueDate || new Date().toISOString().slice(0, 10)}"></label>
          <label class="doc-label">${this.t('status', 'Statut')}<select id="wct-status" class="doc-input">${['requested', 'draft', 'generated', 'signed', 'archived'].map((status) => `<option value="${status}" ${old.status === status ? 'selected' : ''}>${this.certificateStatusLabel(status)}</option>`).join('')}</select></label>
          <label class="doc-label">${this.t('position', 'Poste')}<input id="wct-position" class="doc-input" value="${SariUtils.escapeHtml(old.position || '')}"></label>
          <label class="doc-label">${this.t('salaryForCertificate', 'Salaire mensuel (DA)')}<input id="wct-salary" type="number" class="doc-input" value="${old.salary ?? ''}"></label>
          <label class="doc-label md:col-span-2">${this.t('notes', 'Notes / mentions')}${RichTextEditor.html('wct-notes', old.notesHtml || '', this.t('notes', 'Notes'))}</label>
        </div>
        <div id="wct-preview" class="mt-4"></div>
        <footer class="flex justify-end gap-2 mt-5 pt-4 border-t"><button type="button" onclick="ContractsModule.closeModal()" class="sari-btn px-4 bg-slate-200">${this.t('cancel', 'Annuler')}</button><button class="sari-btn px-5 bg-sari-blue text-white">${this.t('save', 'Enregistrer')}</button></footer>
      </form></div>`;
    window.SariIcons?.hydrate();
    this.certificateEmployeeChanged();
  },
  certificateEmployeeChanged() {
    const employeeId = document.getElementById('wct-employee')?.value;
    const employee = this.employee(employeeId);
    if (!employee) return;
    const positionInput = document.getElementById('wct-position');
    if (positionInput && !positionInput.value) positionInput.value = employee.position || '';
    const salaryInput = document.getElementById('wct-salary');
    if (salaryInput && !salaryInput.value) salaryInput.value = employee.salary || '';
    this.certificateTypeChanged();
  },
  certificateTypeChanged() {
    const preview = document.getElementById('wct-preview');
    if (!preview) return;
    const typeId = document.getElementById('wct-type')?.value;
    const employeeId = document.getElementById('wct-employee')?.value;
    const employee = this.employee(employeeId) || {};
    const record = {
      id: 'wct-preview-record', typeId, employeeId,
      employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      position: document.getElementById('wct-position')?.value || employee.position || '',
      hireDate: employee.hireDate || '',
      issueDate: document.getElementById('wct-date')?.value || '',
      includeSalary: typeId !== 'withoutSalary',
      includeTasks: typeId === 'withTasks',
      salary: Number(document.getElementById('wct-salary')?.value) || employee.salary || 0,
      signatures: {},
    };
    preview.innerHTML = `<h4 class="font-extrabold text-xs">${this.t('certificatePreview', 'Aperçu')}</h4><div class="certificate-print-sheet mt-2 bg-white text-slate-900 border rounded-xl p-5 max-h-96 overflow-y-auto">${this.certificateDocumentHtml(record)}</div>`;
    window.SariIcons?.hydrate();
  },
  async saveCertificate(event) {
    event.preventDefault();
    const id = document.getElementById('wct-id').value;
    const old = id ? await sariDB.getById('workCertificates', id) : {};
    const employeeId = document.getElementById('wct-employee').value;
    const employee = this.employee(employeeId) || {};
    const typeId = document.getElementById('wct-type').value;
    const record = {
      ...old, id: id || `wct-${crypto.randomUUID()}`, employeeId,
      employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      position: document.getElementById('wct-position').value || employee.position || '',
      department: employee.department || '',
      hireDate: employee.hireDate || '',
      typeId,
      issueDate: document.getElementById('wct-date').value,
      includeSalary: typeId !== 'withoutSalary',
      includeTasks: typeId === 'withTasks',
      salary: Number(document.getElementById('wct-salary').value) || employee.salary || 0,
      status: document.getElementById('wct-status').value || 'draft',
      notesHtml: RichTextEditor.value('wct-notes'),
      updatedAt: new Date().toISOString(), createdAt: old.createdAt || new Date().toISOString(),
    };
    if (record.status === 'generated' || record.status === 'signed') { record.contentHtml = this.certificateDocumentHtml(record); record.generatedAt = record.generatedAt || new Date().toISOString(); }
    await sariDB.save('workCertificates', record);
    this.closeModal();
    app.showToast(this.t('certificateSaved', 'Attestation enregistrée.'), 'success');
    await this.render();
  },
  async viewCertificate(id) {
    const record = await sariDB.getById('workCertificates', id); if (!record) return;
    await this.load();
    const root = document.getElementById('sari-modal-root');
    root.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3"><article class="w-full max-w-4xl max-h-[94vh] overflow-y-auto sari-tile p-6" id="wct-print-${record.id}">
      <header class="no-print flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${record.referenceCode || record.id}</span>
        <h2 class="text-xl font-extrabold mt-2">${this.t('workCertificate', 'Attestation de travail')} — ${SariUtils.escapeHtml(record.employeeName || this.employeeName(record.employeeId))}</h2>
        <p class="text-xs text-slate-500">${SariUtils.escapeHtml(this.certificateTypeLabel(record.typeId))} • ${this.certificateStatusLabel(record.status)}</p></div>
        <button onclick="app.closeModalRoot()"><i data-lucide="x"></i></button></header>
      <div class="mt-4 bg-white text-slate-900 border rounded-xl p-5">${this.certificateDocumentHtml(record)}</div>
      <footer class="no-print flex flex-wrap justify-end gap-2 mt-5 pt-4 border-t">
        <button onclick="ContractsModule.downloadCertificatePDF('${record.id}')" class="sari-btn px-4 bg-sari-lime text-slate-900"><i data-lucide="download"></i>PDF</button>
        <button onclick="SariUtils.printElement('wct-print-${record.id}','Attestation de travail')" class="sari-btn px-4 bg-slate-800 text-white"><i data-lucide="printer"></i>${this.t('print', 'Imprimer')}</button>
        ${this.canWrite() && record.status !== 'signed' ? `<button onclick="app.closeModalRoot();ContractsModule.openCertificateSignature('${record.id}')" class="sari-btn px-4 bg-sari-blue text-white"><i data-lucide="file-signature"></i>${this.t('sign', 'Signer')}</button>` : ''}
      </footer></article></div>`;
    window.SariIcons?.hydrate();
  },
  async openCertificateSignature(id) {
    const record = await sariDB.getById('workCertificates', id); if (!record) return;
    const modal = document.getElementById('contracts-modal');
    modal.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3">
      <form onsubmit="ContractsModule.saveCertificateSignature(event,'${id}')" class="sari-tile w-full max-w-2xl max-h-[94vh] overflow-y-auto p-6">
        <header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${this.t('certificateManagerSignature', 'Signature du responsable')}</span>
          <h3 class="text-xl font-extrabold mt-2">${SariUtils.escapeHtml(record.employeeName || this.employeeName(record.employeeId))}</h3>
          <p class="text-xs text-slate-500 mt-1">${this.t('certificateSignatureHelp', 'L’attestation est signée électroniquement par le responsable habilité, avec signature manuscrite tracée au pavé (Section 320).')}</p></div>
          <button type="button" onclick="ContractsModule.closeModal()"><i data-lucide="x"></i></button></header>
        <div class="grid md:grid-cols-2 gap-3 mt-4">
          <label class="doc-label">${this.t('fullName', 'Nom complet du responsable')} *<input id="wcts-name" class="doc-input" value="${SariUtils.escapeHtml(auth.currentUser?.name || '')}" required></label>
          <label class="doc-label">${this.t('signatureTitle', 'Fonction / titre')} *<input id="wcts-title" class="doc-input" value="${this.t('hrManager', 'Responsable Ressources Humaines')}" required></label>
          <label class="doc-label md:col-span-2">${this.t('signaturePlace', 'Lieu de signature')} *<input id="wcts-place" class="doc-input" value="${SariUtils.escapeHtml(this.companyInfo().address || 'Alger')}" required></label>
          <div class="md:col-span-2">${SignaturePad.html('wcts-signature', this.t('drawSignature', 'Signature manuscrite (souris / doigt / stylet)'), record.signatures?.manager?.imageDataUrl || '')}</div>
        </div>
        <footer class="flex justify-end gap-2 mt-5 pt-4 border-t"><button type="button" onclick="ContractsModule.closeModal()" class="sari-btn px-4 bg-slate-200">${this.t('cancel', 'Annuler')}</button><button class="sari-btn px-5 bg-sari-blue text-white">${this.t('signAndGenerate', 'Signer & générer le PDF')}</button></footer>
      </form></div>`;
    window.SariIcons?.hydrate();
    SignaturePad.mount();
  },
  async saveCertificateSignature(event, id) {
    event.preventDefault();
    const record = await sariDB.getById('workCertificates', id);
    const name = document.getElementById('wcts-name')?.value.trim();
    const title = document.getElementById('wcts-title')?.value.trim();
    const place = document.getElementById('wcts-place')?.value.trim();
    if (!name || !title || !place) return app.showToast(this.t('signatureFieldsRequired', 'Renseignez le nom, la fonction et le lieu.'), 'warning');
    if (SignaturePad.isEmpty('wcts-signature')) return app.showToast(this.t('drawRequired', 'Tracez votre signature manuscrite dans le pavé.'), 'warning');
    record.signatures = { manager: { name, title, place, imageDataUrl: SignaturePad.value('wcts-signature'), userId: auth.currentUser?.id, signedAt: new Date().toISOString() } };
    record.status = 'signed';
    record.contentHtml = this.certificateDocumentHtml(record);
    record.generatedAt = new Date().toISOString();
    await sariDB.save('workCertificates', record);
    this.closeModal();
    app.showToast(this.t('certificateSigned', 'Attestation signée.'), 'success');
    await this.downloadCertificatePDF(id, { archive: true });
    await this.render();
  },
  async downloadCertificatePDF(id, { archive = false } = {}) {
    const record = await sariDB.getById('workCertificates', id); if (!record) return;
    await this.load();
    const mount = document.getElementById('contracts-modal');
    mount.innerHTML = `<div id="wct-doc-${record.id}" class="bg-white text-slate-900" style="width:794px;padding:24px;font-family:'Plus Jakarta Sans',Arial,sans-serif">${record.contentHtml || this.certificateDocumentHtml(record)}</div>`;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const reference = record.referenceCode || record.id;
    const blob = await SariUtils.createPDFBlob(`wct-doc-${record.id}`, 'A4', { pageFooter: (page, total) => `${reference} — ${i18n.t('pageOf', 'Page')} ${page}/${total}` });
    mount.innerHTML = '';
    if (archive) {
      const documentId = `wct-pdf-${record.id}`;
      const existing = await sariDB.getById('documents', documentId);
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
      const document = { ...existing, id: documentId, name: `${reference}.pdf`, mimeType: 'application/pdf', size: blob.size, data, documentType: 'workCertificate', category: 'hr', notes: `${this.t('workCertificate', 'Attestation de travail')} ${record.employeeName || ''}`, tags: ['certificate', record.typeId, record.status].filter(Boolean), links: [{ recordType: 'workCertificate', recordId: record.id }, { recordType: 'employee', recordId: record.employeeId }], uploaderId: auth.currentUser?.id || '', uploaderName: auth.currentUser?.name || 'SARI', version: (existing?.version || 0) + 1, createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      await sariDB.save('documents', document);
      record.generatedDocumentId = documentId;
      await sariDB.save('workCertificates', record);
      app.showToast(this.t('certificateArchived', 'Attestation PDF archivée dans la GED (dossier du salarié).'), 'success');
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${reference}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    return blob;
  },
  async removeCertificate(id) { if (!await DialogManager.confirm(this.t('deleteCertificateConfirm', 'Supprimer cette attestation ?'))) return; await sariDB.delete('workCertificates', id); await this.render(); },

}
window.ContractsModule = ContractsModule;
export {};

