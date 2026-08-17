/**
 * SARI Système — Temporary / Freelance Worker Manager (Section 303).
 * Occasional workers hired short-term and paid per task/piece under the
 * Algerian "Occasional / Piece-work (Pigiste)" payment type: NOT declared
 * under CNAS, IRG withheld at source, contract/invoice justification.
 */
const OccasionalWorkersModule = {
  state: { tab: 'workers', workers: [], assignments: [], paymentTypes: [], documents: [], query: '', status: 'all' },
  t(key, fallback) { return i18n.t(key, fallback); },
  canWrite() { return auth.can('occasionalWorkers', 'edit'); },
  worker(id) { return this.state.workers.find((item) => item.id === id); },
  workerName(id) { const worker = this.worker(id); return worker ? `${worker.firstName} ${worker.lastName}` : id || '—'; },
  paymentType(id) { return this.state.paymentTypes.find((item) => item.id === id) || this.pieceworkType(); },
  pieceworkType() { return this.state.paymentTypes.find((item) => item.isPiecework) || {}; },
  docCount(type, id) { return this.state.documents.filter((document) => (document.links || []).some((link) => link.recordType === type && link.recordId === id)).length; },

  async load() {
    const [workers, assignments, paymentTypes, documents] = await Promise.all(['occasionalWorkers', 'workerAssignments', 'paymentTypes', 'documents'].map((store) => sariDB.getAll(store)));
    Object.assign(this.state, { workers, assignments, paymentTypes, documents });
  },
  async render(containerId = 'sari-main-view') {
    const c = document.getElementById(containerId); if (!c) return;
    await this.load();
    const canWrite = this.canWrite();
    const piecework = this.pieceworkType();
    const activeCount = this.state.workers.filter((worker) => worker.status === 'active').length;
    const paidAmount = this.state.assignments.filter((assignment) => assignment.status === 'paid').reduce((sum, assignment) => sum + Number(assignment.netAmount || 0), 0);
    c.innerHTML = `<div class="space-y-5">
      <section class="sari-tile p-5 sari-grid-pattern flex flex-col md:flex-row justify-between gap-4">
        <div><span class="sari-badge bg-sari-amber/15 text-sari-amber">${this.t('occasionalBadge', 'Ressources humaines • Travailleurs occasionnels')}</span>
          <h2 class="text-2xl font-extrabold mt-2 flex items-center gap-2"><i data-lucide="handshake" class="text-sari-amber"></i>${this.t('occasionalWorkersManager', 'Travailleurs temporaires / pigistes')}</h2>
          <p class="text-sm text-slate-500">${this.t('occasionalDescription', 'Missions courtes rémunérées à la tâche — régime occasionnel algérien (non CNAS, IRG retenu à la source).')}</p></div>
        <div class="grid grid-cols-3 gap-2 text-center">${[
          [activeCount, this.t('activeWorkers', 'Actifs')],
          [this.state.assignments.filter((assignment) => assignment.status !== 'paid').length, this.t('openAssignments', 'Missions ouvertes')],
          [i18n.formatCurrency(paidAmount), this.t('paidNet', 'Net payé')],
        ].map(([value, label]) => `<div class="p-3 bg-white/80 dark:bg-slate-800 rounded-xl border"><b class="text-xl text-sari-amber">${value}</b><small class="block">${label}</small></div>`).join('')}</div>
      </section>
      <section class="sari-tile p-4 border-l-4 border-l-sari-amber flex gap-3 items-start">
        <i data-lucide="info" class="text-sari-amber shrink-0"></i>
        <div><b class="text-sm">${this.t('nonCnasRegime', 'Régime occasionnel — hors CNAS')}</b>
        <p class="text-xs text-slate-500 mt-0.5">${SariUtils.escapeHtml(piecework.legalNotesI18n?.[i18n.currentLang] || piecework.legalNotesI18n?.fr || '')}</p>
        <p class="text-[10px] text-slate-400 mt-1">${this.t('retentionRate', 'Retenue à la source IRG')} : ${Math.round((piecework.irgWithholdingRate ?? 0.15) * 100)}% — ${this.t('configurableInLeaves', 'taux configurable dans Congés → Configuration → Types de paiement.')}</p></div>
      </section>
      <nav class="sari-tile p-2 flex flex-wrap gap-2"><button onclick="OccasionalWorkersModule.state.tab='workers';OccasionalWorkersModule.render()" class="sari-btn px-4 py-2 text-xs ${this.state.tab === 'workers' ? 'bg-sari-blue text-white' : ''}"><i data-lucide="users-round" class="w-4 h-4"></i>${this.t('workersLabel', 'Travailleurs')}</button><button onclick="OccasionalWorkersModule.state.tab='assignments';OccasionalWorkersModule.render()" class="sari-btn px-4 py-2 text-xs ${this.state.tab === 'assignments' ? 'bg-sari-blue text-white' : ''}"><i data-lucide="briefcase-business" class="w-4 h-4"></i>${this.t('assignmentsLabel', 'Missions & paiements')}</button></nav>
      ${this.state.tab === 'workers' ? this.workersHtml(canWrite) : this.assignmentsHtml(canWrite)}
      <div id="occasional-modal"></div>
    </div>`;
    window.SariIcons?.hydrate(); app.enhanceSearchInputs();
  },

  workersHtml(canWrite) {
    const rows = window.SariCore.ordering.stableOrder(this.state.workers).filter((worker) => (this.state.status === 'all' || worker.status === this.state.status) && SariUtils.matchesAdvancedSearch(worker, this.state.query, ['firstName', 'lastName', 'referenceCode', 'skill', 'email', 'phone']));
    return `<div class="space-y-4">
      <section class="sari-tile p-4 grid md:grid-cols-[1fr_180px] gap-2"><input class="doc-input" value="${SariUtils.escapeHtml(this.state.query)}" oninput="OccasionalWorkersModule.state.query=this.value" onkeydown="SariUtils.searchKeyHandler(event,()=>OccasionalWorkersModule.render())" placeholder="${this.t('searchWorkers', 'Rechercher un travailleur, une compétence')}"><select class="doc-input" onchange="OccasionalWorkersModule.state.status=this.value;OccasionalWorkersModule.render()"><option value="all">${this.t('allStatuses', 'Tous les statuts')}</option><option value="active" ${this.state.status === 'active' ? 'selected' : ''}>${this.t('active', 'Actif')}</option><option value="inactive" ${this.state.status === 'inactive' ? 'selected' : ''}>${this.t('inactive', 'Inactif')}</option></select></section>
      ${canWrite ? `<button onclick="OccasionalWorkersModule.openWorkerEditor()" class="sari-btn px-4 py-2 bg-sari-blue text-white"><i data-lucide="user-plus"></i>${this.t('newWorker', 'Nouveau travailleur')}</button>` : ''}
      <section class="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">${rows.map((worker) => { const assignments = this.state.assignments.filter((assignment) => assignment.workerId === worker.id); const total = assignments.reduce((sum, assignment) => sum + Number(assignment.netAmount || 0), 0); return `<article class="p-4 rounded-xl border ${worker.status === 'inactive' ? 'opacity-60' : ''}">
        <div class="flex justify-between items-start"><div><b>${SariUtils.escapeHtml(`${worker.firstName} ${worker.lastName}`)}</b><small class="block font-mono-tech text-sari-blue text-[10px]">${worker.referenceCode || worker.id}</small></div><span class="sari-badge bg-sari-amber/15 text-sari-amber">${this.t('nonCnas', 'Non CNAS')}</span></div>
        <p class="text-xs text-slate-500 mt-2">${SariUtils.escapeHtml(worker.skill || '')}</p>
        <div class="grid grid-cols-2 gap-2 mt-3 text-[11px]"><div><small class="text-slate-400 block">${this.t('rate', 'Tarif (DA)')}</small><b class="font-mono-tech">${i18n.formatCurrency(worker.rate)}</b></div><div><small class="text-slate-400 block">${this.t('assignmentsLabel', 'Missions')}</small><b>${assignments.length}</b></div><div><small class="text-slate-400 block">${this.t('totalNetPaid', 'Net cumulé')}</small><b class="text-green-700">${i18n.formatCurrency(total)}</b></div><div><small class="text-slate-400 block">${this.t('hiredAt', 'Engagé le')}</small><b>${i18n.formatDate(worker.hiredAt)}</b></div></div>
        <footer class="flex flex-wrap gap-2 mt-3 pt-3 border-t"><button onclick="OccasionalWorkersModule.viewWorker('${worker.id}')" class="doc-action">${this.t('view', 'Voir')}</button><button onclick="DocumentManager.open('occasionalWorker','${worker.id}','${SariUtils.escapeHtml(`${worker.firstName} ${worker.lastName}`)}')" class="doc-action">GED (${this.docCount('occasionalWorker', worker.id)})</button>${canWrite ? `<button onclick="OccasionalWorkersModule.openWorkerEditor('${worker.id}')" class="doc-action">${this.t('edit', 'Modifier')}</button><button onclick="OccasionalWorkersModule.removeWorker('${worker.id}')" class="doc-action text-red-600">${this.t('delete', 'Supprimer')}</button>` : ''}</footer></article>`; }).join('') || `<p class="text-sm text-slate-400">${this.t('noWorker', 'Aucun travailleur occasionnel.')}</p>`}</section>
    </div>`;
  },
  async openWorkerEditor(id = '') {
    const old = id ? await sariDB.getById('occasionalWorkers', id) : {};
    const values = await DialogManager.form(id ? this.t('editWorker', 'Modifier le travailleur') : this.t('newWorker', 'Nouveau travailleur occasionnel'), [
      { name: 'firstName', label: `${this.t('firstName', 'Prénom')} *`, value: old.firstName || '', required: true },
      { name: 'lastName', label: `${this.t('lastName', 'Nom')} *`, value: old.lastName || '', required: true },
      { name: 'cin', label: this.t('cin', 'N° pièce d’identité (CIN)'), value: old.cin || '' },
      { name: 'phone', label: this.t('phone', 'Téléphone'), value: old.phone || '' },
      { name: 'email', label: this.t('email', 'Email'), type: 'email', value: old.email || '' },
      { name: 'skill', label: this.t('skill', 'Compétence / prestation'), value: old.skill || '', required: true },
      { name: 'rate', label: `${this.t('rate', 'Tarif (DA / jour ou / tâche)')} *`, type: 'number', value: old.rate ?? 0, required: true },
      { name: 'paymentTypeId', label: this.t('paymentType', 'Type de paiement'), type: 'select', value: old.paymentTypeId || this.pieceworkType().id, options: this.state.paymentTypes.map((type) => ({ value: type.id, label: type.name?.[i18n.currentLang] || type.name?.fr || type.code })) },
      { name: 'hiredAt', label: this.t('hiredAt', 'Date d’engagement'), type: 'date', value: old.hiredAt || new Date().toISOString().slice(0, 10) },
      { name: 'status', label: this.t('status', 'Statut'), type: 'select', value: old.status || 'active', options: [{ value: 'active', label: this.t('active', 'Actif') }, { value: 'inactive', label: this.t('inactive', 'Inactif') }] },
      { name: 'notes', label: this.t('notes', 'Notes'), type: 'textarea', value: old.notes || '' },
    ], { message: this.t('nonCnasWarning', 'Ce travailleur relève du régime occasionnel : non déclaré CNAS, IRG retenu à la source sur chaque mission.') });
    if (!values) return;
    await sariDB.save('occasionalWorkers', { ...old, id: id || `occ-${crypto.randomUUID()}`, ...values, rate: Number(values.rate) || 0, status: values.status || 'active' });
    app.showToast(this.t('workerSaved', 'Travailleur enregistré.'), 'success');
    await this.render();
  },
  async removeWorker(id) { if (!await DialogManager.confirm(this.t('deleteWorkerConfirm', 'Supprimer ce travailleur ?'))) return; await sariDB.delete('occasionalWorkers', id); await this.render(); },
  async viewWorker(id) {
    const worker = await sariDB.getById('occasionalWorkers', id); if (!worker) return;
    const assignments = this.state.assignments.filter((assignment) => assignment.workerId === id);
    const root = document.getElementById('sari-modal-root');
    root.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3"><article class="w-full max-w-3xl max-h-[92vh] overflow-y-auto sari-tile p-6">
      <header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-amber/15 text-sari-amber">${worker.referenceCode || worker.id}</span>
        <h2 class="text-xl font-extrabold mt-2">${SariUtils.escapeHtml(`${worker.firstName} ${worker.lastName}`)}</h2><p class="text-xs text-slate-500">${SariUtils.escapeHtml(worker.skill || '')}</p></div>
        <button onclick="app.closeModalRoot()"><i data-lucide="x"></i></button></header>
      <div class="grid sm:grid-cols-2 gap-3 mt-4 text-sm"><div><small class="text-slate-400">${this.t('cin', 'CIN')}</small><b class="block font-mono-tech">${SariUtils.escapeHtml(worker.cin || '—')}</b></div>
      <div><small class="text-slate-400">${this.t('contact', 'Contact')}</small><b class="block">${SariUtils.escapeHtml(worker.phone || '')} ${SariUtils.escapeHtml(worker.email || '')}</b></div>
      <div><small class="text-slate-400">${this.t('rate', 'Tarif')}</small><b class="block">${i18n.formatCurrency(worker.rate)}</b></div>
      <div><small class="text-slate-400">${this.t('hiredAt', 'Engagé le')}</small><b class="block">${i18n.formatDate(worker.hiredAt)}</b></div></div>
      <section class="mt-5"><h4 class="font-extrabold text-sm">${this.t('assignmentsLabel', 'Missions')}</h4><div class="space-y-2 mt-2">${assignments.map((assignment) => `<div class="p-3 rounded-xl border flex justify-between gap-2"><div><b class="text-xs">${SariUtils.escapeHtml(assignment.title)}</b><small class="block font-mono-tech text-[10px]">${i18n.formatDate(assignment.startDate)} → ${i18n.formatDate(assignment.endDate)}</small></div><div class="text-right"><b class="text-xs text-green-700">${i18n.formatCurrency(assignment.netAmount)}</b><small class="block text-[10px] text-slate-400">${this.assignmentStatusLabel(assignment.status)}</small></div></div>`).join('') || `<p class="text-xs text-slate-400">${this.t('noAssignment', 'Aucune mission.')}</p>`}</div></section>
      <p class="text-xs text-slate-400 mt-4">${SariUtils.escapeHtml(worker.notes || '')}</p></article></div>`;
    window.SariIcons?.hydrate();
  },

  assignmentStatusLabel(status) {
    const labels = {
      draft: { fr: 'Brouillon', ar: 'مسودة', en: 'Draft' }, assigned: { fr: 'Attribuée', ar: 'مسندة', en: 'Assigned' },
      completed: { fr: 'Terminée', ar: 'منجزة', en: 'Completed' }, invoiced: { fr: 'Facturée', ar: 'مفوترة', en: 'Invoiced' },
      paid: { fr: 'Payée', ar: 'مدفوعة', en: 'Paid' },
    };
    return labels[status]?.[i18n.currentLang] || labels[status]?.fr || status || '—';
  },
  assignmentsHtml(canWrite) {
    const rows = [...this.state.assignments].sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
    const piecework = this.pieceworkType();
    return `<div class="space-y-4">
      ${canWrite ? `<button onclick="OccasionalWorkersModule.openAssignmentEditor()" class="sari-btn px-4 py-2 bg-sari-blue text-white"><i data-lucide="plus"></i>${this.t('newAssignment', 'Nouvelle mission')}</button>` : ''}
      <section class="sari-tile overflow-x-auto"><table class="w-full sari-table"><thead><tr>
        <th>${this.t('worker', 'Travailleur')}</th><th>${this.t('missionTitle', 'Mission')}</th><th>${this.t('assignmentPeriod', 'Période')}</th><th>${this.t('grossAmount', 'Brut')}</th><th>${this.t('irgWithholding', 'IRG retenu')}</th><th>${this.t('netAmount', 'Net à payer')}</th><th>${this.t('invoiceRef', 'Facture / justificatif')}</th><th>${this.t('status', 'Statut')}</th><th>${this.t('actionsHeader', 'Actions')}</th>
      </tr></thead><tbody>${rows.map((assignment) => `<tr>
        <td><b>${SariUtils.escapeHtml(assignment.workerName || this.workerName(assignment.workerId))}</b></td>
        <td>${SariUtils.escapeHtml(assignment.title)}</td>
        <td class="font-mono-tech text-xs">${i18n.formatDate(assignment.startDate)} → ${i18n.formatDate(assignment.endDate)}</td>
        <td class="font-bold">${i18n.formatCurrency(assignment.amount)}</td>
        <td class="text-red-600 font-bold">${i18n.formatCurrency(assignment.irgAmount)}<small class="block text-[9px] text-slate-400">${Math.round((assignment.irgRate ?? piecework.irgWithholdingRate ?? 0.15) * 100)}% ${this.t('atSource', 'à la source')}</small></td>
        <td class="font-black text-green-700">${i18n.formatCurrency(assignment.netAmount)}</td>
        <td class="font-mono-tech text-xs">${SariUtils.escapeHtml(assignment.invoiceReference || '—')}</td>
        <td><span class="sari-badge ${assignment.status === 'paid' ? 'text-green-700' : ''}">${this.assignmentStatusLabel(assignment.status)}</span></td>
        <td><div class="flex flex-wrap gap-1"><button onclick="OccasionalWorkersModule.viewAssignment('${assignment.id}')" class="doc-action">${this.t('view', 'Voir')}</button><button onclick="DocumentManager.open('workerAssignment','${assignment.id}','${SariUtils.escapeHtml(assignment.title)}')" class="doc-action">GED (${this.docCount('workerAssignment', assignment.id)})</button>${canWrite ? `<button onclick="OccasionalWorkersModule.openAssignmentEditor('${assignment.id}')" class="doc-action">${this.t('edit', 'Modifier')}</button>${assignment.status !== 'paid' ? `<button onclick="OccasionalWorkersModule.payAssignment('${assignment.id}')" class="doc-action text-sari-lime-dark"><i data-lucide="banknote"></i>${this.t('pay', 'Payer')}</button>` : ''}<button onclick="OccasionalWorkersModule.removeAssignment('${assignment.id}')" class="doc-action text-red-600">${this.t('delete', 'Supprimer')}</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="9" class="p-8 text-slate-400">${this.t('noAssignment', 'Aucune mission enregistrée.')}</td></tr>`}</tbody></table></section>
    </div>`;
  },
  async openAssignmentEditor(id = '') {
    const old = id ? await sariDB.getById('workerAssignments', id) : {};
    const piecework = this.pieceworkType();
    const modal = document.getElementById('occasional-modal');
    modal.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3">
      <form onsubmit="OccasionalWorkersModule.saveAssignment(event)" class="sari-tile w-full max-w-4xl max-h-[95vh] overflow-y-auto p-6">
        <header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-amber/15 text-sari-amber">${this.t('occasionalMission', 'Mission occasionnelle')}</span>
          <h3 class="text-xl font-extrabold mt-2">${id ? this.t('editAssignment', 'Modifier la mission') : this.t('newAssignment', 'Nouvelle mission')}</h3></div>
          <button type="button" onclick="OccasionalWorkersModule.closeModal()"><i data-lucide="x"></i></button></header>
        <input type="hidden" id="wa-id" value="${id || ''}">
        <div class="grid md:grid-cols-2 gap-3 mt-4">
          <label class="doc-label">${this.t('worker', 'Travailleur')} *<select id="wa-worker" class="doc-input" required>${this.state.workers.map((worker) => `<option value="${worker.id}" ${old.workerId === worker.id ? 'selected' : ''}>${SariUtils.escapeHtml(`${worker.firstName} ${worker.lastName}`)} — ${SariUtils.escapeHtml(worker.skill || '')}</option>`).join('')}</select></label>
          <label class="doc-label">${this.t('missionTitle', 'Intitulé de la mission')} *<input id="wa-title" class="doc-input" value="${SariUtils.escapeHtml(old.title || '')}" required></label>
          <label class="doc-label">${this.t('startDate', 'Date début')} *<input id="wa-start" type="date" class="doc-input" value="${old.startDate || ''}" required></label>
          <label class="doc-label">${this.t('endDate', 'Date fin')} *<input id="wa-end" type="date" class="doc-input" value="${old.endDate || ''}" required></label>
          <label class="doc-label">${this.t('grossAmount', 'Montant brut (DA)')} *<input id="wa-amount" type="number" class="doc-input" value="${old.amount ?? ''}" required oninput="OccasionalWorkersModule.previewAssignmentCalc()"></label>
          <label class="doc-label">${this.t('retentionRate', 'Retenue à la source IRG (%)')}<input id="wa-rate" type="number" step="0.5" class="doc-input" value="${Math.round((old.irgRate ?? piecework.irgWithholdingRate ?? 0.15) * 100)}" oninput="OccasionalWorkersModule.previewAssignmentCalc()"></label>
          <div class="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 md:col-span-2 grid grid-cols-3 gap-2 text-xs"><div><small class="text-slate-400 block">${this.t('grossAmount', 'Brut')}</small><b id="wa-preview-gross" class="font-mono-tech">—</b></div><div><small class="text-slate-400 block">IRG ${this.t('atSource', 'à la source')}</small><b id="wa-preview-irg" class="font-mono-tech text-red-600">—</b></div><div><small class="text-slate-400 block">${this.t('netAmount', 'Net à payer')}</small><b id="wa-preview-net" class="font-mono-tech text-green-700">—</b></div></div>
          <label class="doc-label">${this.t('invoiceRef', 'Référence facture / justificatif')}<input id="wa-invoice" class="doc-input" value="${SariUtils.escapeHtml(old.invoiceReference || '')}"></label>
          <label class="doc-label">${this.t('status', 'Statut')}<select id="wa-status" class="doc-input">${['draft', 'assigned', 'completed', 'invoiced', 'paid'].map((status) => `<option value="${status}" ${old.status === status ? 'selected' : ''}>${this.assignmentStatusLabel(status)}</option>`).join('')}</select></label>
          ${old.status === 'paid' || id ? `<label class="doc-label">${this.t('paymentMethod', 'Mode de règlement')}<input id="wa-method" class="doc-input" value="${SariUtils.escapeHtml(old.paymentMethod || '')}"></label><label class="doc-label">${this.t('paymentDate', 'Date de paiement')}<input id="wa-payment" type="date" class="doc-input" value="${old.paymentDate || ''}"></label>` : ''}
          <label class="doc-label md:col-span-2">${this.t('assignmentDescription', 'Description de la prestation (HTML)')}${RichTextEditor.html('wa-description', old.descriptionHtml || '<p></p>', this.t('assignmentDescription', 'Description'))}</label>
        </div>
        <p class="text-[11px] text-slate-500 mt-3">${SariUtils.escapeHtml(piecework.legalNotesI18n?.[i18n.currentLang] || piecework.legalNotesI18n?.fr || '')}</p>
        <footer class="flex justify-end gap-2 mt-5 pt-4 border-t"><button type="button" onclick="OccasionalWorkersModule.closeModal()" class="sari-btn px-4 bg-slate-200">${this.t('cancel', 'Annuler')}</button><button class="sari-btn px-5 bg-sari-blue text-white">${this.t('save', 'Enregistrer')}</button></footer>
      </form></div>`;
    window.SariIcons?.hydrate();
    this.previewAssignmentCalc();
  },
  closeModal() { document.getElementById('occasional-modal').innerHTML = ''; },
  previewAssignmentCalc() {
    const amount = Number(document.getElementById('wa-amount')?.value) || 0;
    const rate = (Number(document.getElementById('wa-rate')?.value) || 0) / 100;
    const calc = window.SariCore.leave.pieceworkCalculation(amount, { irgWithholdingRate: rate });
    if (document.getElementById('wa-preview-gross')) document.getElementById('wa-preview-gross').textContent = i18n.formatCurrency(calc.gross);
    if (document.getElementById('wa-preview-irg')) document.getElementById('wa-preview-irg').textContent = i18n.formatCurrency(calc.irgAmount);
    if (document.getElementById('wa-preview-net')) document.getElementById('wa-preview-net').textContent = i18n.formatCurrency(calc.net);
  },
  async saveAssignment(event) {
    event.preventDefault();
    const id = document.getElementById('wa-id').value;
    const old = id ? await sariDB.getById('workerAssignments', id) : {};
    const workerId = document.getElementById('wa-worker').value;
    const amount = Number(document.getElementById('wa-amount').value) || 0;
    const irgRate = (Number(document.getElementById('wa-rate').value) || 0) / 100;
    const calc = window.SariCore.leave.pieceworkCalculation(amount, { irgWithholdingRate: irgRate });
    const status = document.getElementById('wa-status').value;
    const record = {
      ...old, id: id || `wa-${crypto.randomUUID()}`, workerId, workerName: this.workerName(workerId),
      title: document.getElementById('wa-title').value, startDate: document.getElementById('wa-start').value,
      endDate: document.getElementById('wa-end').value, amount, irgRate, irgAmount: calc.irgAmount, netAmount: calc.net,
      invoiceReference: document.getElementById('wa-invoice').value, status,
      paymentMethod: document.getElementById('wa-method')?.value || old.paymentMethod || '',
      paymentDate: document.getElementById('wa-payment')?.value || old.paymentDate || '',
      descriptionHtml: RichTextEditor.value('wa-description'),
      updatedAt: new Date().toISOString(), createdAt: old.createdAt || new Date().toISOString(),
    };
    if (status === 'paid' && !record.paymentDate) record.paymentDate = new Date().toISOString().slice(0, 10);
    await sariDB.save('workerAssignments', record);
    this.closeModal();
    app.showToast(this.t('assignmentSaved', 'Mission enregistrée.'), 'success');
    await this.render();
  },
  async payAssignment(id) {
    const assignment = await sariDB.getById('workerAssignments', id);
    const values = await DialogManager.form(`${this.t('pay', 'Payer')} — ${assignment.title}`, [
      { name: 'paymentMethod', label: this.t('paymentMethod', 'Mode de règlement'), value: assignment.paymentMethod || 'cash' },
      { name: 'paymentDate', label: this.t('paymentDate', 'Date de paiement'), type: 'date', value: new Date().toISOString().slice(0, 10) },
      { name: 'invoiceReference', label: this.t('invoiceRef', 'Référence facture / justificatif'), value: assignment.invoiceReference || '' },
    ], { message: `${this.t('netAmount', 'Net à payer')} : ${i18n.formatCurrency(assignment.netAmount)} — ${this.t('irgWithholding', 'IRG retenu')} : ${i18n.formatCurrency(assignment.irgAmount)}` });
    if (!values) return;
    assignment.status = 'paid'; assignment.paymentMethod = values.paymentMethod; assignment.paymentDate = values.paymentDate; assignment.invoiceReference = values.invoiceReference;
    await sariDB.save('workerAssignments', assignment);
    app.showToast(this.t('assignmentPaid', 'Mission réglée : le net a été versé, l’IRG retenu à la source reste à reverser.') + ' ' + i18n.formatCurrency(assignment.netAmount), 'success');
    await this.render();
  },
  async removeAssignment(id) { if (!await DialogManager.confirm(this.t('deleteAssignmentConfirm', 'Supprimer cette mission ?'))) return; await sariDB.delete('workerAssignments', id); await this.render(); },
  async viewAssignment(id) {
    const assignment = await sariDB.getById('workerAssignments', id); if (!assignment) return;
    const root = document.getElementById('sari-modal-root');
    root.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3"><article class="w-full max-w-3xl max-h-[92vh] overflow-y-auto sari-tile p-6">
      <header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-amber/15 text-sari-amber">${assignment.referenceCode || assignment.id}</span>
        <h2 class="text-xl font-extrabold mt-2">${SariUtils.escapeHtml(assignment.title)}</h2><p class="text-xs text-slate-500">${SariUtils.escapeHtml(assignment.workerName || this.workerName(assignment.workerId))} • ${this.assignmentStatusLabel(assignment.status)}</p></div>
        <button onclick="app.closeModalRoot()"><i data-lucide="x"></i></button></header>
      <div class="grid sm:grid-cols-3 gap-3 mt-4"><div class="compliance-info"><small>${this.t('grossAmount', 'Brut')}</small><b>${i18n.formatCurrency(assignment.amount)}</b></div>
      <div class="compliance-info"><small>IRG ${this.t('atSource', 'à la source')} (${Math.round((assignment.irgRate ?? 0.15) * 100)}%)</small><b class="text-red-600">${i18n.formatCurrency(assignment.irgAmount)}</b></div>
      <div class="compliance-info accent"><small>${this.t('netAmount', 'Net à payer')}</small><b>${i18n.formatCurrency(assignment.netAmount)}</b></div></div>
      <div class="grid sm:grid-cols-2 gap-3 mt-4 text-sm"><div><small class="text-slate-400">${this.t('assignmentPeriod', 'Période')}</small><b class="block font-mono-tech text-xs">${i18n.formatDate(assignment.startDate)} → ${i18n.formatDate(assignment.endDate)}</b></div>
      <div><small class="text-slate-400">${this.t('payment', 'Paiement')}</small><b class="block">${assignment.paymentDate ? `${i18n.formatDate(assignment.paymentDate)} • ${SariUtils.escapeHtml(assignment.paymentMethod || '')}` : this.t('notPaidYet', 'Non réglé')}</b></div></div>
      <section class="mt-4 p-4 border rounded-xl"><h4 class="font-extrabold text-sm">${this.t('assignmentDescription', 'Description de la prestation')}</h4><div class="rich-content text-sm mt-2">${RichTextEditor.sanitize(assignment.descriptionHtml || '<p>—</p>')}</div></section>
      ${assignment.invoiceReference ? `<p class="text-xs text-slate-500 mt-3">${this.t('invoiceRef', 'Facture / justificatif')} : <b class="font-mono-tech">${SariUtils.escapeHtml(assignment.invoiceReference)}</b></p>` : ''}
      <footer class="flex justify-end gap-2 mt-5 pt-4 border-t"><button onclick="DocumentManager.open('workerAssignment','${assignment.id}','${SariUtils.escapeHtml(assignment.title)}')" class="sari-btn px-4 bg-slate-800 text-white">GED</button></footer></article></div>`;
    window.SariIcons?.hydrate();
  },
};
window.OccasionalWorkersModule = OccasionalWorkersModule;
export {};
