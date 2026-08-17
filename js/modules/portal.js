import '../signature-pad.js';
/**
 * Employee self-service portal: internal messaging, HR summary, and the
 * guided onboarding workflow (Sections 304.2–304.4): reading/accepting the
 * work rules & general terms, electronically signing the employment contract
 * and submitting the conflict-of-interest declaration.
 */
const EmployeePortalModule = {
  state: {
    employee: null, career: [], missions: [], documents: [], conversations: [], messages: [],
    employees: [], attendance: [], performance: [], salaryHistory: [], activeConversation: '',
    contracts: [], acceptances: [], declarations: [], rules: [],
    leaveRequests: [], leaveTypes: [], holidays: [], schedule: null, workCertificates: [], certificateTemplates: [], portalSettings: {}, positionFunctions: [],
  },
  t(key, fallback) { return i18n.t(key, fallback); },
  async loadData() {
    const [employees, career, missions, documents, conversations, messages, attendance, performance, salaryHistory, contracts, acceptances, declarations, rules, leaveRequests, leaveTypes, holidays, schedule, workCertificates, certificateTemplates, portalSettings, positionFunctions] = await Promise.all(['employees', 'careerRecords', 'missions', 'documents', 'conversations', 'messages', 'attendance', 'performanceRecords', 'salaryHistory', 'employmentContracts', 'ruleAcceptances', 'conflictDeclarations', 'workRules', 'leaveRequests', 'leaveTypes', 'publicHolidays', 'settings', 'workCertificates', 'certificateTemplates', 'settings', 'positionFunctions'].map((store) => sariDB.getAll(store)));
    Object.assign(this.state, { employees, career, missions, documents, conversations, messages, attendance, performance, salaryHistory, contracts, acceptances, declarations, rules, leaveRequests, leaveTypes, holidays, workCertificates, certificateTemplates, positionFunctions });
    this.state.portalSettings = portalSettings.find((record) => record.id === 'app-settings') || {};
    this.state.employee = this.state.employees.find((employee) => employee.userId === auth.currentUser.id) || null;
    this.state.schedule = schedule.find((record) => record.id === 'work-schedule') || window.SariCore.leave.defaultSchedule;
    this.state.conversations = this.state.conversations.filter((conversation) => (conversation.participantUserIds || []).includes(auth.currentUser.id));
    if (!this.state.activeConversation) this.state.activeConversation = this.state.conversations[0]?.id || '';
  },
  rule(kind) { return this.state.rules.filter((rule) => rule.kind === kind).sort((a, b) => Number(b.version) - Number(a.version))[0]; },
  onboarding() {
    if (!this.state.employee) return null;
    return window.SariCore.leave.computeOnboarding({
      employeeId: this.state.employee.id, acceptances: this.state.acceptances, contracts: this.state.contracts,
      declarations: this.state.declarations, rulesVersion: this.rule('rules')?.version, termsVersion: this.rule('terms')?.version,
    });
  },

  async render(containerId = 'sari-main-view') {
    const c = document.getElementById(containerId); if (!c) return;
    await this.loadData();
    const onboarding = this.onboarding();
    c.innerHTML = `<div class="space-y-5">
      <section class="sari-tile p-5 sari-grid-pattern"><span class="sari-badge bg-sari-blue/10 text-sari-blue">${i18n.t('personalSpace', 'Espace personnel')}</span>
        <h2 class="text-2xl font-extrabold mt-2 flex items-center gap-2"><i data-lucide="contact-round" class="text-sari-blue"></i>${SariUtils.escapeHtml(this.state.employee ? `${this.state.employee.firstName} ${this.state.employee.lastName}` : auth.currentUser.name)}</h2>
        ${this.state.employee ? `<p class="font-mono-tech text-sm text-sari-blue">${SariUtils.escapeHtml(this.state.employee.referenceCode || this.state.employee.id)}</p>` : ''}
        <p class="text-sm text-slate-500">${i18n.t('personalSpaceDescription', 'Carrière, informations RH, missions, documents et messagerie interne.')}</p></section>
      ${onboarding ? this.onboardingHtml(onboarding) : ''}
      ${this.profileActionsHtml()}${this.hrHtml()}
      ${this.state.employee ? this.contractsHtml() : ''}
      ${this.state.employee ? this.leavesHtml() : ''}
      ${this.state.employee ? this.certificatesHtml() : ''}
      ${this.messagingHtml()}
      <div id="portal-modal"></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    this.markRead();
  },

  /* ─────────────── 304.2/304.4 Onboarding alert + guided stepper ─────────────── */
  stepKeyLabel(key) {
    const labels = {
      rules_read: this.t('stepRulesRead', 'Lire le règlement intérieur'),
      rules_accepted: this.t('stepRulesAccepted', 'Accepter & signer le règlement'),
      terms_accepted: this.t('stepTermsAccepted', 'Accepter & signer les conditions générales'),
      contract_signed: this.t('stepContractSigned', 'Signer mon contrat de travail'),
      conflict_declared: this.t('stepConflictDeclared', 'Compléter la déclaration de conflits d’intérêts'),
    };
    return labels[key] || key;
  },
  stepHelp(key) {
    const helps = {
      rules_read: this.t('stepRulesReadHelp', 'Lisez attentivement le règlement intérieur. Vous devrez ensuite l’accepter et le signer.'),
      rules_accepted: this.t('stepRulesAcceptedHelp', 'Cochez la case d’acceptation et signez avec votre nom complet : cela vaut consentement électronique.'),
      terms_accepted: this.t('stepTermsAcceptedHelp', 'Acceptez les conditions générales d’utilisation des outils SARI.'),
      contract_signed: this.t('stepContractSignedHelp', 'Consultez votre contrat et signez-le électroniquement.'),
      conflict_declared: this.t('stepConflictDeclaredHelp', 'Déclarez vos engagements éthiques, la confidentialité et vos éventuels autres emplois.'),
    };
    return helps[key] || '';
  },
  onboardingHtml(onboarding) {
    const doneCount = onboarding.steps.filter((step) => step.done).length;
    const pct = Math.round((doneCount / onboarding.steps.length) * 100);
    const alert = onboarding.done ? '' : `<section class="sari-tile p-4 border-l-4 border-l-sari-amber bg-sari-amber/5 flex flex-col md:flex-row justify-between gap-3 items-start md:items-center">
      <div class="flex gap-3 items-start"><i data-lucide="triangle-alert" class="text-sari-amber shrink-0"></i>
        <div><b class="text-sm">${this.t('onboardingAlert', 'Parcours d’intégration à terminer')}</b>
        <p class="text-xs text-slate-500 mt-0.5">${this.t('onboardingAlertHelp', 'Vous n’avez pas encore lu, accepté et signé tous les documents obligatoires (règlement, CGU, contrat, déclaration). Certains modules peuvent rester bloqués jusqu’à la fin du parcours.')}</p></div></div>
      <button onclick="EmployeePortalModule.openWizard()" class="sari-btn px-4 py-2 bg-sari-amber text-slate-900 text-xs whitespace-nowrap"><i data-lucide="play"></i>${this.t('continueOnboarding', 'Continuer / Reprendre')}</button></section>`;
    return `${alert}<section class="sari-tile p-5"><div class="flex flex-col md:flex-row justify-between gap-3 items-start md:items-center">
      <div><h3 class="font-extrabold flex gap-2"><i data-lucide="list-checks" class="text-sari-blue"></i>${this.t('myOnboarding', 'Mon parcours d’intégration')}</h3>
      <p class="text-xs text-slate-500 mt-1">${this.t('onboardingProgress', 'Chaque étape est marquée terminée ou en attente.')}</p></div>
      <span class="sari-badge ${onboarding.done ? 'bg-green-600/10 text-green-700' : 'bg-sari-amber/15 text-sari-amber'}">${doneCount}/${onboarding.steps.length} • ${pct}%</span></div>
      <div class="h-2 bg-slate-200 rounded-full mt-3 overflow-hidden"><div class="h-full ${onboarding.done ? 'bg-green-500' : 'bg-sari-amber'}" style="width:${pct}%"></div></div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-4">${onboarding.steps.map((step, index) => `<button onclick="EmployeePortalModule.openWizard('${step.key}')" class="p-3 rounded-xl border text-left ${step.done ? 'border-green-300 bg-green-50 dark:bg-green-500/10' : 'border-sari-amber/40 bg-sari-amber/5 hover:border-sari-amber'}">
        <div class="flex items-center justify-between"><span class="w-6 h-6 rounded-full grid place-items-center text-[10px] font-black ${step.done ? 'bg-green-500 text-white' : 'bg-sari-amber text-slate-900'}">${index + 1}</span>${step.done ? `<i data-lucide="check-circle-2" class="text-green-600"></i>` : `<i data-lucide="clock" class="text-sari-amber"></i>`}</div>
        <b class="text-[11px] block mt-2">${SariUtils.escapeHtml(this.stepKeyLabel(step.key))}</b>
        <small class="text-[9px] ${step.done ? 'text-green-600' : 'text-slate-400'}">${step.done ? `${this.t('doneAt', 'Fait le')} ${i18n.formatDate(step.at)}` : this.t('pendingStep', 'En attente')}</small></button>`).join('')}</div></section>`;
  },
  openWizard(key = '') {
    const onboarding = this.onboarding(); if (!onboarding) return;
    const firstPending = onboarding.pending[0] || '';
    const active = key || firstPending;
    const modal = document.getElementById('portal-modal');
    modal.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3"><section class="sari-tile w-full max-w-3xl max-h-[94vh] overflow-y-auto p-6">
      <header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${this.t('guidedOnboarding', 'Intégration guidée')}</span>
        <h3 class="text-xl font-extrabold mt-2">${SariUtils.escapeHtml(this.stepKeyLabel(active))}</h3>
        <p class="text-xs text-slate-500 mt-1">${SariUtils.escapeHtml(this.stepHelp(active))}</p></div>
        <button onclick="EmployeePortalModule.closeWizard()"><i data-lucide="x"></i></button></header>
      <div class="mt-4 space-y-3">${onboarding.steps.map((step, index) => `<button onclick="EmployeePortalModule.openWizard('${step.key}')" class="w-full text-left p-3 rounded-xl border flex items-center gap-3 ${step.key === active ? 'border-sari-blue bg-sari-blue/5' : ''}">
        <span class="w-7 h-7 rounded-full grid place-items-center text-[10px] font-black shrink-0 ${step.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}">${index + 1}</span>
        <span class="flex-1"><b class="text-sm block">${SariUtils.escapeHtml(this.stepKeyLabel(step.key))}</b><small class="text-[10px] ${step.done ? 'text-green-600' : 'text-slate-400'}">${step.done ? `✓ ${this.t('completedStep', 'Terminé')}` : this.t('pendingStep', 'En attente')}</small></span>
        <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300"></i></button>`).join('')}</div>
      <div class="mt-4" id="portal-wizard-stage">${this.wizardStageHtml(active, onboarding)}</div></section></div>`;
    window.SariIcons?.hydrate();
  },
  closeWizard() { document.getElementById('portal-modal').innerHTML = ''; },
  wizardStageHtml(key, onboarding) {
    const stages = {
      rules_read: () => { const rule = this.rule('rules'); return `<div class="p-4 border rounded-xl"><div class="rich-content text-sm max-h-72 overflow-y-auto">${RichTextEditor.sanitize(rule?.contentI18n?.[i18n.currentLang] || rule?.contentI18n?.fr || '<p>—</p>')}</div><button onclick="EmployeePortalModule.markRulesRead()" class="sari-btn px-5 py-2 mt-3 bg-sari-blue text-white w-full">${this.t('iHaveRead', 'J’ai lu et compris le règlement (v' + (rule?.version || 1) + ')')}</button></div>`; },
      rules_accepted: () => this.signingForm('rules'),
      terms_accepted: () => this.signingForm('terms'),
      contract_signed: () => this.contractSigningStage(),
      conflict_declared: () => `<div class="p-4 border rounded-xl text-center"><p class="text-sm text-slate-500">${this.t('declarationStageHelp', 'La déclaration couvre votre engagement éthique, la confidentialité et vos éventuels autres emplois ou engagements externes.')}</p><button onclick="EmployeePortalModule.startDeclaration()" class="sari-btn px-5 py-2 mt-3 bg-sari-blue text-white">${this.t('openDeclaration', 'Ouvrir la déclaration')}</button></div>`,
    };
    return (stages[key] || (() => ''))();
  },
  signingForm(kind) {
    const rule = this.rule(kind);
    const accepted = this.state.acceptances.find((acceptance) => acceptance.employeeId === this.state.employee?.id && acceptance.kind === kind && Number(acceptance.version) >= Number(rule?.version));
    if (accepted) return `<div class="p-4 border rounded-xl border-green-300 bg-green-50 dark:bg-green-500/10 text-center"><b class="text-green-600 text-sm"><i data-lucide="badge-check" class="w-4 h-4 inline"></i> ${this.t('alreadyAccepted', 'Déjà accepté et signé')} — v${accepted.version}</b><p class="text-[11px] text-slate-500 mt-1">${i18n.formatDate(accepted.acceptedAt)} • ${SariUtils.escapeHtml(accepted.signature?.name || '')}</p></div>`;
    return `<form onsubmit="EmployeePortalModule.signDocument(event,'${kind}')" class="p-4 border rounded-xl space-y-3">
      <div class="rich-content text-sm max-h-56 overflow-y-auto">${RichTextEditor.sanitize(rule?.contentI18n?.[i18n.currentLang] || rule?.contentI18n?.fr || '<p>—</p>')}</div>
      <label class="flex items-start gap-2 text-xs cursor-pointer"><input id="sign-${kind}-agree" type="checkbox" required class="mt-0.5"><span>${this.t('acceptCheckbox', 'Je reconnais avoir lu ce document et j’en accepte l’intégralité des termes.')}</span></label>
      <label class="doc-label">${this.t('fullName', 'Nom complet (vaut signature électronique)')}<input id="sign-${kind}-name" class="doc-input" value="${SariUtils.escapeHtml(this.state.employee ? `${this.state.employee.firstName} ${this.state.employee.lastName}` : auth.currentUser.name)}" required></label>
      <button class="sari-btn px-5 py-2 bg-sari-blue text-white w-full">${this.t('signAndAccept', 'Signer & accepter')}</button>
      <p class="text-[10px] text-slate-400">${this.t('signatureLegalNote', 'Signature électronique horodatée avec identité, identifiant de session et version du document (valeur probante interne).')}</p></form>`;
  },
  contractSigningStage() {
    const contracts = this.state.contracts.filter((contract) => contract.employeeId === this.state.employee?.id);
    if (!contracts.length) return `<p class="text-sm text-slate-500 p-3">${this.t('noContractYet', 'Aucun contrat n’est enregistré pour votre dossier. Contactez les Ressources Humaines.')}</p>`;
    return contracts.map((contract) => `<div class="p-4 border rounded-xl flex flex-col md:flex-row justify-between gap-3">
      <div><b class="text-sm">${SariUtils.escapeHtml(contract.title || contract.referenceCode || contract.id)}</b>
        <small class="block font-mono-tech text-[10px] text-sari-blue">${contract.referenceCode || contract.id}</small>
        <small class="block text-[11px] text-slate-500">${SariUtils.escapeHtml(contract.type || '')} • ${i18n.formatDate(contract.startDate)} • ${i18n.formatCurrency(contract.baseSalary)}</small></div>
      <div class="flex items-center gap-2">${contract.signature?.signedAt ? `<span class="sari-badge bg-green-600/10 text-green-700"><i data-lucide="badge-check" class="w-3 h-3 inline"></i>${this.t('signedOn', 'Signé le')} ${i18n.formatDate(contract.signature.signedAt)}</span>` : `<button onclick="EmployeePortalModule.openContractSigning('${contract.id}')" class="sari-btn px-4 py-2 bg-sari-blue text-white text-xs">${this.t('signContract', 'Lire & signer')}</button>`}</div></div>`).join('');
  },
  async markRulesRead() {
    const rule = this.rule('rules');
    const existing = this.state.acceptances.find((acceptance) => acceptance.employeeId === this.state.employee?.id && acceptance.kind === 'rules_read');
    const record = { ...(existing || {}), id: existing?.id || `ra-${crypto.randomUUID()}`, employeeId: this.state.employee.id, kind: 'rules_read', version: Number(rule?.version) || 1, acceptedAt: new Date().toISOString(), signature: { name: `${this.state.employee.firstName} ${this.state.employee.lastName}`, userId: auth.currentUser.id, signedAt: new Date().toISOString(), device: 'Portail SARI' } };
    await sariDB.save('ruleAcceptances', record);
    this.state.acceptances = [...this.state.acceptances.filter((acceptance) => acceptance.id !== record.id), record];
    app.showToast(this.t('rulesMarkedRead', 'Lecture confirmée : passez à l’acceptation et à la signature.'), 'success');
    // Section 313 — refresh the onboarding page immediately after the step is done.
    await this.render();
    this.openWizard('rules_accepted');
  },
  async signDocument(event, kind) {
    event.preventDefault();
    const rule = this.rule(kind);
    const name = document.getElementById(`sign-${kind}-name`)?.value.trim();
    if (!name) return app.showToast(this.t('nameRequired', 'Veuillez saisir votre nom complet.'), 'warning');
    const existing = this.state.acceptances.find((acceptance) => acceptance.employeeId === this.state.employee?.id && acceptance.kind === kind);
    const record = { ...(existing || {}), id: existing?.id || `ra-${crypto.randomUUID()}`, employeeId: this.state.employee.id, kind, version: Number(rule?.version) || 1, acceptedAt: new Date().toISOString(), signature: { name, userId: auth.currentUser.id, signedAt: new Date().toISOString(), device: navigator.userAgent?.slice(0, 80) || 'Portail SARI' } };
    await sariDB.save('ruleAcceptances', record);
    this.state.acceptances = [...this.state.acceptances.filter((acceptance) => acceptance.id !== record.id), record];
    app.showToast(this.t('documentSigned', 'Document signé électroniquement. Merci !'), 'success');
    // Section 313 — re-render the page so the stepper shows the step as completed,
    // then continue the wizard at the next pending step without a manual reload.
    await this.render();
    const onboarding = this.onboarding();
    this.openWizard(onboarding.pending[0] || '');
  },
  portalContractBody(contract) {
    const tasks = this.state.positionFunctions.filter((x) => x.position === contract.position && x.isActive !== false);
    const company = this.state.portalSettings.companyName || 'SARI Système';
    const articles = [
      ['Objet', `Engagement de ${contract.employeeName} par ${company} au poste de ${contract.position}.`],
      ['Nature et durée', `${contract.type}, du ${i18n.formatDate(contract.startDate)}${contract.endDate ? ` au ${i18n.formatDate(contract.endDate)}` : ' sans limitation de durée'}.`],
      ['Temps de travail et rémunération', `${contract.weeklyHours || 40} heures par semaine; salaire de base brut ${i18n.formatCurrency(contract.baseSalary || 0)}.`],
      ['Fonctions et tâches', tasks.length ? tasks.map((x) => `${x.title}${x.description ? ` — ${x.description}` : ''}`).join('; ') : `Fonctions normalement attachées au poste de ${contract.position}.`],
      ['Obligations de l’entreprise', 'Fournir le travail et les moyens, payer la rémunération, déclarer le salarié, préserver sa santé, sa sécurité, sa dignité, ses repos, congés et droits collectifs.'],
      ['Obligations du salarié', 'Exécuter loyalement les tâches, respecter les horaires, la sécurité et le règlement intérieur, préserver le matériel, la confidentialité et éviter les conflits d’intérêts.'],
      ['Congés et protection sociale', 'Les congés, absences et prestations sociales sont régis par la législation algérienne, la CNAS et les procédures internes.'],
      ['Discipline, rupture et différends', 'Toute sanction ou rupture respecte la loi n° 90-11 relative aux relations de travail, les garanties applicables, la conciliation et les juridictions algériennes compétentes.'],
      ['Clauses particulières', contract.clausesHtml || 'Néant.'],
    ];
    return `<div class="contract-document p-5 border rounded-xl"><p><b>Parties :</b> ${SariUtils.escapeHtml(company)} (« l’Entreprise ») et ${SariUtils.escapeHtml(contract.employeeName)} (« le Salarié »).</p><p>Contrat soumis à la loi algérienne n° 90-11 du 21 avril 1990, modifiée et complétée.</p>${articles.map(([title,body],i)=>`<section class="contract-article"><h4>Article ${i+1} — ${title}</h4><div>${title === 'Clauses particulières' ? RichTextEditor.sanitize(body) : SariUtils.escapeHtml(body)}</div></section>`).join('')}</div>`;
  },
  async openContractSigning(contractId) {
    const contract = this.state.contracts.find((item) => item.id === contractId); if (!contract) return;
    const modal = document.getElementById('portal-modal');
    modal.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3">
      <form onsubmit="EmployeePortalModule.signContract(event,'${contractId}')" class="sari-tile w-full max-w-3xl max-h-[94vh] overflow-y-auto p-6">
        <header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${contract.referenceCode || contract.id}</span>
          <h3 class="text-xl font-extrabold mt-2">${SariUtils.escapeHtml(contract.title)}</h3>
          <p class="text-xs text-slate-500">${SariUtils.escapeHtml(contract.type || '')} • ${i18n.formatDate(contract.startDate)} • ${i18n.formatCurrency(contract.baseSalary)} • ${contract.weeklyHours || '—'}h/${this.t('week', 'sem')} • ${this.t('trialPeriodMonths', 'Essai')} : ${contract.trialPeriodMonths ?? 0} ${this.t('monthsShort', 'mois')}</p></div>
        <button type="button" onclick="EmployeePortalModule.closeWizard()"><i data-lucide="x"></i></button></header>
      <div class="mt-4 max-h-[45vh] overflow-y-auto">${this.portalContractBody(contract)}</div>
      <label class="flex items-start gap-2 text-xs mt-4 cursor-pointer"><input type="checkbox" required class="mt-0.5"><span>${this.t('acceptContractCheckbox', 'J’ai lu et compris les clauses de mon contrat et je les accepte sans réserve.')}</span></label>
      <div class="grid md:grid-cols-2 gap-3 mt-3"><label class="doc-label">${this.t('fullName', 'Nom complet')}<input id="ctt-sign-name" class="doc-input" value="${SariUtils.escapeHtml(`${this.state.employee.firstName} ${this.state.employee.lastName}`)}" required></label><label class="doc-label">Qualité / rôle<input id="ctt-sign-role" class="doc-input" value="Salarié" required></label><label class="doc-label">Lieu de signature<input id="ctt-sign-place" class="doc-input" value="Alger" required></label>${SariSignaturePad.field('employee-sign-pad')}</div>
      <button class="sari-btn px-5 py-2 mt-4 bg-sari-blue text-white w-full">${this.t('signContract', 'Signer mon contrat')}</button></form></div>`;
    window.SariIcons?.hydrate(); setTimeout(() => SariSignaturePad.mount('employee-sign-pad'), 0);
  },
  async signContract(event, contractId) {
    event.preventDefault();
    const contract = this.state.contracts.find((item) => item.id === contractId);
    const name = document.getElementById('ctt-sign-name')?.value.trim();
    if (!contract || !name) return app.showToast(this.t('nameRequired', 'Veuillez saisir votre nom complet.'), 'warning');
    const drawing = SariSignaturePad.value('employee-sign-pad');
    if (!drawing) return app.showToast('La signature manuscrite est obligatoire.', 'warning');
    const signedAt = new Date().toISOString();
    contract.employeeSignature = { fullName: name, name, role: document.getElementById('ctt-sign-role').value.trim() || 'Salarié', place: document.getElementById('ctt-sign-place').value.trim(), signedAt, drawing, userId: auth.currentUser.id, device: navigator.userAgent?.slice(0, 80) || 'Portail SARI' };
    contract.signature = contract.employeeSignature;
    contract.status = contract.companySignature?.signedAt ? 'signed' : 'sent';
    if (contract.status === 'signed') contract.signedAt = signedAt;
    await sariDB.save('employmentContracts', contract);
    if (contract.status === 'signed') {
      try { const module = await window.SariModuleLoader?.load('contracts'); await ContractsModule.load(); await ContractsModule.archiveSignedContract(contract); } catch (error) { console.warn('[Contract] GED archive failed', error); }
    }
    this.state.contracts = [...this.state.contracts.filter((item) => item.id !== contractId), contract];
    await sariDB.save('notifications', { id: `notif-${crypto.randomUUID()}`, type: 'contract', targetUserId: null, title: this.t('contractSignedTitle', 'Contrat signé'), titleI18n: { fr: 'Contrat signé', ar: 'عقد موقع', en: 'Contract signed' }, message: `${contract.referenceCode || contract.id} — ${name}`, isRead: false, createdAt: new Date().toISOString() });
    await app.updateNotificationsBadge();
    app.showToast(contract.status === 'signed' ? 'Contrat signé par les deux parties et archivé dans la GED.' : 'Votre signature est enregistrée; la signature de l’entreprise reste attendue.', 'success');
    // Section 313 — immediate visual refresh of the onboarding stepper.
    await this.render();
    const onboarding = this.onboarding();
    this.openWizard(onboarding.pending[0] || '');
  },
  startDeclaration() {
    const employeeId = this.state.employee?.id; if (!employeeId) return;
    window.SariModuleLoader?.load('contracts').then(() => {
      ContractsModule.state.employees = this.state.employees;
      ContractsModule.state.declarations = this.state.declarations;
      ContractsModule.openDeclarationEditor(employeeId, {
        onDone: async () => {
          this.state.declarations = await sariDB.getAll('conflictDeclarations');
          // Section 313 — refresh the page so the declaration step shows completed.
          await this.render();
          this.openWizard(this.onboarding()?.pending[0] || '');
        },
        title: `${this.state.employee.firstName} ${this.state.employee.lastName}`,
      });
    }).catch((error) => console.warn('[Portal] contracts module unavailable', error));
  },

  /* ──────────────────────────────── My contracts list ──────────────────────────────── */
  contractsHtml() {
    const contracts = this.state.contracts.filter((contract) => contract.employeeId === this.state.employee.id);
    if (!contracts.length) return '';
    return `<section class="sari-tile p-5"><h3 class="font-extrabold flex gap-2"><i data-lucide="file-signature" class="text-sari-blue"></i>${this.t('myContracts', 'Mes contrats de travail')}</h3>
      <div class="space-y-2 mt-3">${contracts.map((contract) => `<div class="p-3 rounded-xl border flex flex-col md:flex-row justify-between gap-2">
        <div><b class="text-sm">${SariUtils.escapeHtml(contract.title || contract.referenceCode || contract.id)}</b>
          <small class="block font-mono-tech text-[10px] text-sari-blue">${contract.referenceCode || contract.id}</small>
          <small class="block text-[11px] text-slate-500">${SariUtils.escapeHtml(contract.type || '')} • ${i18n.formatDate(contract.startDate)}${contract.endDate ? ` → ${i18n.formatDate(contract.endDate)}` : ''} • ${i18n.formatCurrency(contract.baseSalary)}</small></div>
        <div class="flex items-center gap-2">${contract.signature?.signedAt ? `<span class="sari-badge bg-green-600/10 text-green-700"><i data-lucide="badge-check" class="w-3 h-3 inline"></i>${this.t('signedOn', 'Signé le')} ${i18n.formatDate(contract.signature.signedAt)}</span>` : contract.status === 'sent' ? `<button onclick="EmployeePortalModule.openContractSigning('${contract.id}')" class="sari-btn px-3 py-1.5 bg-sari-blue text-white text-xs">${this.t('signContract', 'Lire & signer')}</button>` : `<span class="sari-badge text-slate-500">${SariUtils.escapeHtml(contract.status)}</span>`}
        <button onclick="EmployeePortalModule.viewContract('${contract.id}')" class="doc-action">${this.t('view', 'Voir')}</button></div></div>`).join('')}</div></section>`;
  },
  async viewContract(contractId) {
    const contract = this.state.contracts.find((item) => item.id === contractId); if (!contract) return;
    const employeeSignature = contract.employeeSignature || contract.signature;
    const signature = (item, role) => item?.signedAt ? `<div class="contract-signature-card"><b>${SariUtils.escapeHtml(item.role || role)}</b><p>${SariUtils.escapeHtml(item.fullName || item.name || '')}<br>${SariUtils.escapeHtml(item.place || '—')} • ${new Date(item.signedAt).toLocaleString()}</p>${item.drawing ? `<img src="${item.drawing}" alt="Signature">` : ''}</div>` : `<div class="contract-signature-card"><b>${role}</b><p>Signature en attente</p></div>`;
    const modal = document.getElementById('portal-modal');
    modal.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3"><article class="sari-tile w-full max-w-4xl max-h-[94vh] overflow-y-auto p-6"><header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${contract.referenceCode || contract.id}</span><h3 class="text-xl font-extrabold mt-2">${SariUtils.escapeHtml(contract.title)}</h3></div><button onclick="EmployeePortalModule.closeWizard()"><i data-lucide="x"></i></button></header>${this.portalContractBody(contract)}<section class="contract-signatures">${signature(contract.companySignature,'Représentant de l’entreprise')}${signature(employeeSignature,'Salarié')}</section></article></div>`;
    window.SariIcons?.hydrate();
  },

  /* ──────────────────────────────── My leave summary ──────────────────────────────── */
  leaveBalanceInfo() {
    const annual = this.state.leaveTypes.find((type) => type.code === 'annual' && type.deductsBalance !== false);
    if (!annual) return null;
    const year = new Date().getFullYear();
    const used = this.state.leaveRequests.filter((record) => record.employeeId === this.state.employee.id && this.state.leaveTypes.find((type) => type.id === record.typeId)?.deductsBalance !== false && ['approved', 'taken'].includes(record.status) && record.requestKind !== 'cancel' && String(record.startDate).startsWith(String(year))).reduce((sum, record) => sum + (Number(record.durationDays) || window.SariCore.leave.paidWorkingDaysBetween(record.startDate, record.endDate, this.state.schedule, this.state.holidays) || 0), 0);
    return { total: Number(annual.daysPerYear) || 30, used };
  },
  leaveTypeName(typeId) {
    const type = this.state.leaveTypes.find((item) => item.id === typeId);
    return type?.name?.[i18n.currentLang] || type?.name?.fr || type?.code || typeId;
  },
  leaveStatusLabel(status) {
    return ({ draft: 'Brouillon', submitted: 'En attente', approved: 'Approuvée', rejected: 'Rejetée', cancelled: 'Annulée', taken: 'Prise' })[status] || status;
  },
  leavesHtml() {
    const balance = this.leaveBalanceInfo();
    const requests = this.state.leaveRequests.filter((record) => record.employeeId === this.state.employee.id).sort((a, b) => String(b.requestedAt || b.startDate).localeCompare(String(a.requestedAt || a.startDate)));
    return `<section class="sari-tile p-5"><div class="flex justify-between items-center mb-3"><h3 class="font-extrabold flex gap-2"><i data-lucide="calendar-clock" class="text-sari-lime-dark"></i>${this.t('myLeaves', 'Mes congés')}</h3>
      <button onclick="EmployeePortalModule.openLeaveEditor()" class="doc-action text-sari-blue font-bold"><i data-lucide="plus"></i>${this.t('requestLeave', 'Demander un congé')}</button></div>
      ${balance ? `<div class="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 mb-3 flex items-center justify-between"><span class="text-xs">${this.t('annualBalance', 'Solde congé annuel')}</span><b class="font-mono-tech">${balance.total - balance.used} / ${balance.total} ${this.t('daysShort', 'j')}</b></div>` : ''}
      <div class="space-y-2">${requests.map((record) => { const pending = ['draft', 'submitted'].includes(record.status); const approved = ['approved', 'taken'].includes(record.status) && record.requestKind !== 'cancel'; return `<div class="p-3 rounded-lg border flex flex-col md:flex-row justify-between gap-2"><div><b class="text-xs">${SariUtils.escapeHtml(this.leaveTypeName(record.typeId))}${record.requestKind ? ` • ${SariUtils.escapeHtml(({postpone:'Report',modify:'Modification',cancel:'Annulation'})[record.requestKind] || record.requestKind)}` : ''}</b><small class="block font-mono-tech text-[10px]">${i18n.formatDate(record.startDate)} → ${i18n.formatDate(record.endDate)} • ${record.durationDays ?? '—'} ${this.t('daysShort', 'j')}</small>${record.changeReason ? `<small class="block text-slate-500">Motif : ${SariUtils.escapeHtml(record.changeReason)}</small>` : ''}</div><div class="flex flex-wrap items-center gap-1"><span class="sari-badge text-[9px] ${approved ? 'text-green-600' : record.status === 'rejected' ? 'text-red-600' : ''}">${SariUtils.escapeHtml(this.leaveStatusLabel(record.status))}</span>
        <button title="Voir" aria-label="Voir" onclick="EmployeePortalModule.viewLeave('${record.id}')" class="doc-action"><i data-lucide="eye"></i></button>
        ${pending ? `<button title="Modifier" aria-label="Modifier" onclick="EmployeePortalModule.openLeaveEditor('${record.id}')" class="doc-action text-sari-blue"><i data-lucide="pencil"></i></button><button title="Supprimer" aria-label="Supprimer" onclick="EmployeePortalModule.deleteLeave('${record.id}')" class="doc-action text-red-600"><i data-lucide="trash-2"></i></button>` : ''}
        ${approved ? `<button title="Reporter" aria-label="Reporter" onclick="EmployeePortalModule.openLeaveChange('${record.id}','postpone')" class="doc-action"><i data-lucide="calendar-sync"></i></button><button title="Modifier" aria-label="Demander une modification" onclick="EmployeePortalModule.openLeaveChange('${record.id}','modify')" class="doc-action"><i data-lucide="file-pen-line"></i></button><button title="Annuler" aria-label="Demander l’annulation" onclick="EmployeePortalModule.openLeaveChange('${record.id}','cancel')" class="doc-action text-red-600"><i data-lucide="calendar-x-2"></i></button>` : ''}</div></div>`; }).join('') || `<p class="text-xs text-slate-400">${this.t('noLeaveYet', 'Aucune demande de congé.')}</p>`}</div></section>`;
  },
  async viewLeave(id) {
    const record = this.state.leaveRequests.find((item) => item.id === id); if (!record) return;
    const linked = this.state.leaveRequests.filter((item) => item.parentRequestId === id);
    await DialogManager.alert(`${this.leaveTypeName(record.typeId)}\n${i18n.formatDate(record.startDate)} → ${i18n.formatDate(record.endDate)}\n${record.durationDays || 0} jour(s)\nStatut : ${this.leaveStatusLabel(record.status)}\nMotif : ${record.reason || '—'}${linked.length ? `\n\nDemandes de changement : ${linked.map((x) => this.leaveStatusLabel(x.status)).join(', ')}` : ''}`, { title: record.referenceCode || 'Demande de congé', icon: 'eye' });
  },
  async openLeaveEditor(id = '') {
    const old = id ? this.state.leaveRequests.find((item) => item.id === id) : null;
    if (old && !['draft', 'submitted'].includes(old.status)) return app.showToast('Une demande approuvée ne peut plus être modifiée directement.', 'warning');
    const types = this.state.leaveTypes.filter((type) => type.isActive !== false);
    const values = await DialogManager.form(id ? 'Modifier ma demande' : this.t('requestLeave', 'Demander un congé'), [
      { name: 'typeId', label: this.t('leaveType', 'Type de congé'), type: 'select', value: old?.typeId, options: types.map((type) => ({ value: type.id, label: type.name?.[i18n.currentLang] || type.name?.fr || type.code })) },
      { name: 'startDate', label: this.t('startDate', 'Date début'), type: 'date', value: old?.startDate, required: true },
      { name: 'endDate', label: this.t('endDate', 'Date fin'), type: 'date', value: old?.endDate, required: true },
      { name: 'reason', label: this.t('justification', 'Motif'), type: 'textarea', value: old?.reason || '' },
    ]);
    if (!values) return;
    if (values.endDate < values.startDate) return app.showToast(this.t('endBeforeStart', 'La date de fin précède la date de début.'), 'error');
    const type = this.state.leaveTypes.find((item) => item.id === values.typeId);
    const record = { ...(old || {}), id: old?.id || `lv-${crypto.randomUUID()}`, employeeId: this.state.employee.id, employeeName: `${this.state.employee.firstName} ${this.state.employee.lastName}`, department: this.state.employee.department || '', typeId: values.typeId, isPaid: type?.isPaid !== false, startDate: values.startDate, endDate: values.endDate, durationDays: window.SariCore.leave.paidWorkingDaysBetween(values.startDate, values.endDate, this.state.schedule, this.state.holidays), status: old?.status || 'submitted', reason: values.reason, requestedAt: old?.requestedAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    await sariDB.save('leaveRequests', record); await this.notifyLeave(record, old ? 'Demande de congé modifiée' : 'Nouvelle demande de congé');
    app.showToast(old ? 'Demande mise à jour.' : this.t('leaveSubmitted', 'Demande transmise au service RH.'), 'success'); await this.render();
  },
  newLeaveRequest() { return this.openLeaveEditor(); },
  async deleteLeave(id) {
    const record = this.state.leaveRequests.find((item) => item.id === id); if (!record || !['draft', 'submitted'].includes(record.status)) return app.showToast('Seule une demande en attente peut être supprimée.', 'warning');
    if (!await DialogManager.confirm('Supprimer définitivement cette demande en attente ?')) return;
    await sariDB.delete('leaveRequests', id); app.showToast('Demande supprimée.', 'success'); await this.render();
  },
  async openLeaveChange(id, kind) {
    const parent = this.state.leaveRequests.find((item) => item.id === id);
    if (!parent || !['approved', 'taken'].includes(parent.status)) return app.showToast('Cette action est réservée aux congés approuvés.', 'warning');
    const labels = { postpone: 'Demander le report', modify: 'Demander une modification', cancel: 'Demander l’annulation' };
    const fields = [];
    if (kind !== 'cancel') fields.push({ name: 'startDate', label: 'Nouvelle date de début', type: 'date', value: parent.startDate, required: true }, { name: 'endDate', label: 'Nouvelle date de fin', type: 'date', value: parent.endDate, required: true });
    if (kind === 'modify') fields.unshift({ name: 'typeId', label: 'Nouveau type', type: 'select', value: parent.typeId, options: this.state.leaveTypes.filter((x) => x.isActive !== false).map((x) => ({ value: x.id, label: this.leaveTypeName(x.id) })) });
    fields.push({ name: 'changeReason', label: 'Motif obligatoire de la demande', type: 'textarea', required: true });
    const values = await DialogManager.form(labels[kind], fields); if (!values) return;
    if (!String(values.changeReason || '').trim()) return app.showToast('Le motif est obligatoire.', 'warning');
    const startDate = values.startDate || parent.startDate, endDate = values.endDate || parent.endDate;
    if (endDate < startDate) return app.showToast('La date de fin précède la date de début.', 'error');
    const request = { ...parent, id: `lv-change-${crypto.randomUUID()}`, referenceCode: '', numericId: undefined, order: undefined, parentRequestId: parent.id, requestKind: kind, typeId: values.typeId || parent.typeId, startDate, endDate, durationDays: kind === 'cancel' ? parent.durationDays : window.SariCore.leave.paidWorkingDaysBetween(startDate, endDate, this.state.schedule, this.state.holidays), status: 'submitted', reason: parent.reason, changeReason: String(values.changeReason).trim(), requestedAt: new Date().toISOString(), decidedAt: null, decidedBy: null };
    await sariDB.save('leaveRequests', request); await this.notifyLeave(request, labels[kind]); app.showToast('Demande de changement transmise pour approbation.', 'success'); await this.render();
  },
  async notifyLeave(record, title) {
    await sariDB.save('notifications', { id: `notif-${crypto.randomUUID()}`, type: 'leave', targetUserId: null, title, titleI18n: { fr: title, ar: title, en: title }, message: `${record.employeeName} — ${i18n.formatDate(record.startDate)} → ${i18n.formatDate(record.endDate)}${record.changeReason ? ` • ${record.changeReason}` : ''}`, isRead: false, createdAt: new Date().toISOString() });
  },

  /* ───────────────────────────── Work certificates (321) ───────────────────────────── */
  certificatesHtml() {
    const rows = this.state.workCertificates.filter((item) => item.employeeId === this.state.employee.id);
    return `<section class="sari-tile p-5"><div class="flex justify-between"><h3 class="font-extrabold flex gap-2"><i data-lucide="file-badge-2" class="text-sari-blue"></i>Mes attestations de travail</h3><button onclick="EmployeePortalModule.requestCertificate()" class="doc-action text-sari-blue"><i data-lucide="file-plus-2"></i>Demander</button></div><div class="space-y-2 mt-3">${rows.map((row) => `<div class="p-3 border rounded-xl flex justify-between"><div><b class="text-sm">${SariUtils.escapeHtml(row.title || 'Attestation de travail')}</b><small class="block text-slate-500">${i18n.formatDate(row.requestedAt)} • ${SariUtils.escapeHtml(row.status)}</small></div>${row.generatedDocumentId ? `<button onclick="DocumentManager.preview('${row.generatedDocumentId}')" class="doc-action"><i data-lucide="file-down"></i>PDF</button>` : ''}</div>`).join('') || '<p class="text-xs text-slate-400">Aucune attestation demandée.</p>'}</div></section>`;
  },
  async requestCertificate() {
    const templates = this.state.certificateTemplates.filter((item) => item.isActive !== false);
    const values = await DialogManager.form('Demander une attestation de travail', [{ name: 'templateId', label: 'Type d’attestation', type: 'select', options: templates.map((x) => ({ value: x.id, label: x.name?.[i18n.currentLang] || x.name?.fr || x.name || x.id })) }, { name: 'reason', label: 'Motif de la demande', type: 'textarea', required: true }]); if (!values) return;
    const automatic = this.state.portalSettings.certificateAutoGeneration === true;
    const record = { id: `cert-${crypto.randomUUID()}`, employeeId: this.state.employee.id, employeeName: `${this.state.employee.firstName} ${this.state.employee.lastName}`, templateId: values.templateId, title: 'Attestation de travail', reason: values.reason, status: automatic ? 'generated' : 'requested', requestedAt: new Date().toISOString(), generationMode: automatic ? 'automatic' : 'manual' };
    await sariDB.save('workCertificates', record); await this.notifyLeave({ ...record, startDate: record.requestedAt, endDate: record.requestedAt }, 'Nouvelle demande d’attestation de travail');
    app.showToast(automatic ? 'Attestation générée automatiquement; signature du responsable en attente.' : 'Demande d’attestation transmise.', 'success'); await this.render();
  },

  /* ──────────────────────────────── Profile / HR / messaging ──────────────────────────────── */
  profileActionsHtml() {
    return `<section class="sari-tile p-5"><div class="flex justify-between items-center mb-4"><div><h3 class="font-extrabold">${i18n.t('myProfile', 'Mon profil')}</h3><p class="text-xs text-slate-500">${i18n.t('personalProfileDescription', 'Consultez vos informations personnelles et sécurisez votre compte.')}</p></div><span class="sari-badge">${SariUtils.escapeHtml(i18n.getRoleName(auth.currentRole))}</span></div><div class="personal-profile-actions"><button onclick="auth.openProfileView()" class="personal-profile-action"><span><i data-lucide="contact-round"></i></span><span><b>${i18n.t('viewMyProfile', 'Consulter mon profil')}</b><small>${i18n.t('viewProfileHelp', 'Afficher mon compte et mon dossier personnel.')}</small></span></button><button onclick="auth.openProfileEditor()" class="personal-profile-action"><span><i data-lucide="pencil"></i></span><span><b>${i18n.t('editMyProfile', 'Modifier mon profil')}</b><small>${i18n.t('editProfileHelp', 'Mettre à jour la photo et les coordonnées.')}</small></span></button><button onclick="auth.openPasswordUpdate()" class="personal-profile-action"><span><i data-lucide="lock-keyhole"></i></span><span><b>${i18n.t('updatePassword', 'Mettre à jour le mot de passe')}</b><small>${i18n.t('passwordSecurityHelp', 'Changer mon mot de passe en toute sécurité.')}</small></span></button></div></section>`;
  },
  hrHtml() {
    const e = this.state.employee;
    if (!e) return `<section class="sari-tile p-6 text-center text-slate-500">Aucun dossier employé n’est associé à ce compte.</section>`;
    const career = this.state.career.filter((x) => x.employeeId === e.id);
    const missions = this.state.missions.filter((x) => x.employeeId === e.id);
    const salaryHistory = this.state.salaryHistory.filter((x) => x.employeeId === e.id);
    const attendance = this.state.attendance.filter((x) => x.employeeId === e.id);
    const performance = this.state.performance.filter((x) => x.employeeId === e.id);
    const docs = this.state.documents.filter((d) => (d.links || []).some((l) => l.recordType === 'employee' && l.recordId === e.id));
    return `<div class="grid lg:grid-cols-3 gap-4"><section class="sari-tile p-5"><h3 class="font-extrabold flex gap-2"><i data-lucide="badge-check" class="text-sari-blue"></i>${this.t('myHrFile', 'Mon dossier RH')}</h3><dl class="grid grid-cols-2 gap-3 mt-4 text-xs"><div><dt class="text-slate-400">${this.t('position', 'Poste')}</dt><dd class="font-bold">${SariUtils.escapeHtml(e.position || '—')}</dd></div><div><dt class="text-slate-400">${this.t('department', 'Département')}</dt><dd class="font-bold">${SariUtils.escapeHtml(e.department || '—')}</dd></div><div><dt class="text-slate-400">${this.t('contractType', 'Contrat')}</dt><dd>${SariUtils.escapeHtml(e.contractType || '—')}</dd></div><div><dt class="text-slate-400">${this.t('hireDate', 'Embauche')}</dt><dd>${i18n.formatDate(e.hireDate)}</dd></div><div><dt class="text-slate-400">${this.t('status', 'Statut')}</dt><dd>${SariUtils.escapeHtml(e.status || '—')}</dd></div><div><dt class="text-slate-400">${this.t('documents', 'Documents')}</dt><dd><button onclick="DocumentManager.open('employee','${e.id}','Mon dossier')" class="text-sari-blue font-bold">${docs.length} ${i18n.t('files', 'pièce(s)')}</button></dd></div></dl></section><section class="sari-tile p-5"><h3 class="font-extrabold flex gap-2"><i data-lucide="trending-up" class="text-sari-lime-dark"></i>${this.t('careerEvolution', 'Évolution de carrière')}</h3><div class="mt-4 space-y-3">${career.length ? career.map((x) => `<div class="pl-3 border-l-2 border-sari-blue"><time class="text-[10px] text-slate-400">${i18n.formatDate(x.date)}</time><b class="block text-sm">${SariUtils.escapeHtml(x.title)}</b><p class="text-xs text-slate-500">${SariUtils.escapeHtml(x.description)}</p>${x.rating ? `<span class="text-sari-amber">${'★'.repeat(x.rating)}</span>` : ''}</div>`).join('') : '<p class="text-xs text-slate-400">Aucun événement enregistré.</p>'}</div><div class="mt-4 pt-3 border-t text-xs"><b>${this.t('performance', 'Performance')}</b><p>${performance.length ? performance.map((p) => `${p.period}: ${p.score}/100`).join(' • ') : 'Aucune évaluation'}</p><b class="block mt-2">${this.t('salaryProgression', 'Progression salariale')}</b><p>${salaryHistory.map((x) => `${i18n.formatDate(x.date)}: ${i18n.formatCurrency(x.newAmount)}`).join(' • ') || 'Aucune évolution'}</p><b class="block mt-2">${this.t('attendance', 'Présences')}</b><p>${attendance.length} ${i18n.t('daysRecorded', 'jour(s) enregistré(s)')}</p></div></section><section class="sari-tile p-5"><h3 class="font-extrabold flex gap-2"><i data-lucide="plane" class="text-sari-amber"></i>${this.t('myMissions', 'Mes missions')}</h3><div class="mt-4 space-y-2">${missions.length ? missions.map((m) => `<div class="p-3 rounded-lg border"><b>${SariUtils.escapeHtml(m.destination)}</b><p class="text-xs text-slate-500">${i18n.formatDate(m.startDate)} → ${i18n.formatDate(m.endDate)}</p><span class="sari-badge mt-1">${SariUtils.escapeHtml(m.status)}</span></div>`).join('') : '<p class="text-xs text-slate-400">Aucune mission.</p>'}</div></section></div>`;
  },
  messagingHtml() {
    const active = this.state.conversations.find((x) => x.id === this.state.activeConversation);
    const messages = this.state.messages.filter((m) => m.conversationId === this.state.activeConversation).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return `<section class="sari-tile overflow-hidden"><div class="grid md:grid-cols-[280px_1fr] min-h-[480px]"><aside class="border-r dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"><header class="p-4 border-b flex justify-between"><div><h3 class="font-extrabold">${this.t('messages', 'Messages')}</h3><p class="text-[10px] text-slate-500">${this.t('internalMessaging', 'Messagerie interne locale')}</p></div><button onclick="EmployeePortalModule.newConversation()" class="p-2 text-sari-blue"><i data-lucide="message-square-plus"></i></button></header>${this.state.conversations.map((conv) => { const unread = this.state.messages.filter((m) => m.conversationId === conv.id && m.senderUserId !== auth.currentUser.id && !(m.readBy || []).includes(auth.currentUser.id)).length; return `<button onclick="EmployeePortalModule.selectConversation('${conv.id}')" class="w-full p-4 text-left border-b hover:bg-white dark:hover:bg-slate-800 ${conv.id === this.state.activeConversation ? 'border-l-4 border-l-sari-blue bg-white dark:bg-slate-800' : ''}"><div class="flex justify-between"><b class="text-sm">${SariUtils.escapeHtml(conv.title)}</b>${unread ? `<span class="w-5 h-5 rounded-full bg-sari-blue text-white text-[10px] grid place-items-center">${unread}</span>` : ''}</div><p class="text-[10px] text-slate-400 mt-1">${(conv.participantUserIds || []).length} ${i18n.t('participants', 'participant(s)')}</p></button>`; }).join('')}</aside><div class="flex flex-col min-w-0"><header class="p-4 border-b"><h3 class="font-extrabold">${SariUtils.escapeHtml(active?.title || 'Sélectionnez une conversation')}</h3></header><div class="flex-1 p-4 overflow-y-auto space-y-3 max-h-[390px]">${messages.map((m) => { const mine = m.senderUserId === auth.currentUser.id; const sender = this.state.employees.find((e) => e.userId === m.senderUserId); return `<div class="flex ${mine ? 'justify-end' : 'justify-start'}"><div class="max-w-[80%] p-3 rounded-2xl ${mine ? 'bg-sari-blue text-white rounded-br-sm' : 'bg-slate-100 dark:bg-slate-800 rounded-bl-sm'}"><p class="text-[10px] font-bold opacity-70">${mine ? 'Moi' : sender ? sender.firstName + ' ' + sender.lastName : 'SARI'}</p><p class="text-sm">${SariUtils.escapeHtml(m.body)}</p><time class="text-[9px] opacity-60">${new Date(m.createdAt).toLocaleString()}</time></div></div>`; }).join('')}</div>${active ? `<form onsubmit="EmployeePortalModule.send(event)" class="p-3 border-t flex gap-2"><input id="portal-message" class="doc-input flex-1" placeholder="Écrire un message…" required><button class="sari-btn px-4 bg-sari-blue text-white"><i data-lucide="send" class="w-4 h-4"></i></button></form>` : ''}</div></div></section>`;
  },
  selectConversation(id) { this.state.activeConversation = id; this.render(); },
  async markRead() {
    const list = this.state.messages.filter((m) => m.conversationId === this.state.activeConversation && m.senderUserId !== auth.currentUser.id && !(m.readBy || []).includes(auth.currentUser.id));
    for (const m of list) { m.readBy = [...(m.readBy || []), auth.currentUser.id]; await sariDB.save('messages', m); }
  },
  async send(e) {
    e.preventDefault();
    const body = document.getElementById('portal-message').value.trim(); if (!body) return;
    await sariDB.save('messages', { id: `msg-${crypto.randomUUID()}`, conversationId: this.state.activeConversation, senderUserId: auth.currentUser.id, body, createdAt: new Date().toISOString(), readBy: [auth.currentUser.id] });
    const conv = await sariDB.getById('conversations', this.state.activeConversation);
    conv.updatedAt = new Date().toISOString(); await sariDB.save('conversations', conv);
    for (const userId of conv.participantUserIds.filter((x) => x !== auth.currentUser.id)) {
      await sariDB.save('notifications', { id: `notif-${crypto.randomUUID()}`, type: 'message', targetUserId: userId, title: `Nouveau message • ${conv.title}`, titleI18n: { fr: `Nouveau message • ${conv.title}`, ar: `رسالة جديدة • ${conv.title}`, en: `New message • ${conv.title}` }, message: body, isRead: false, createdAt: new Date().toISOString() });
    }
    await app.updateNotificationsBadge(); await this.render();
  },
  async newConversation() {
    const others = this.state.employees.filter((e) => e.userId && e.userId !== auth.currentUser.id);
    const v = await DialogManager.form(this.t('newConversation', 'Nouvelle conversation'), [{ name: 'targetUserId', label: this.t('colleague', 'Collaborateur'), type: 'select', options: others.map((e) => ({ value: e.userId, label: `${e.firstName} ${e.lastName}` })) }, { name: 'title', label: this.t('title', 'Titre'), value: 'Discussion interne', required: true }]);
    if (!v) return;
    const conv = { id: `conv-${crypto.randomUUID()}`, title: v.title, participantUserIds: [auth.currentUser.id, v.targetUserId], updatedAt: new Date().toISOString() };
    await sariDB.save('conversations', conv);
    this.state.activeConversation = conv.id; await this.render();
  },
};
window.EmployeePortalModule = EmployeePortalModule;
export {};
