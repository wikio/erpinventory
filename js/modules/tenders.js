/**
 * SARI Système - Tenders & Consultations (Appels d'Offres) Module
 * Manage Algerian public/private hospital tenders, required documents checklist,
 * Cahier des charges, and interactive Bid Preparation Workspace (Pricing Worksheet).
 */

const TendersModule = {
  state: {
    tenders: [],
    products: [],
    filterStatus: 'all',
    searchQuery: '',
    editingId: null,
    activeBidTenderId: null,
    checklistItems: [],
    checklistTemplates: [],
    documents: [],
    activeChecklistTenderId: null
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    [this.state.tenders, this.state.products, this.state.checklistItems, this.state.checklistTemplates, this.state.documents] = await Promise.all([
      window.sariDB.getAll('tenders'), window.sariDB.getAll('products'), window.sariDB.getAll('checklistItems'),
      window.sariDB.getAll('checklistTemplates'), window.sariDB.getAll('documents')
    ]);

    this.renderView(container);
  },

  renderView(container) {
    const canWrite = window.auth && window.auth.canWrite('tenders');
    TableSort.ensure('tenders','referenceCode');
    const filtered = TableSort.apply('tenders',this.getFilteredTenders(),'referenceCode');

    // Stats
    let wonCount = 0;
    let submittedCount = 0;
    let totalWonValueDZD = 0;
    let pipelineValueDZD = 0;

    this.state.tenders.forEach(t => {
      if (t.status === 'won') {
        wonCount++;
        totalWonValueDZD += Number(t.estimatedValue) || 0;
      }
      if (t.status === 'submitted' || t.status === 'inPreparation' || t.status === 'underEvaluation') {
        submittedCount++;
        pipelineValueDZD += Number(t.estimatedValue) || 0;
      }
    });

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header & Action Toolbar -->
        <div class="sari-tile p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white" data-i18n="tenders">
              ${i18n.t('tenders')}
            </h2>
            <p class="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              ${i18n.t('tendersDescription')}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${canWrite ? `
              <button onclick="TendersModule.openModal()" class="sari-btn px-4 py-2 bg-sari-blue hover:bg-sari-blue/90 text-white shadow-sm text-sm">
                <i class="fas fa-plus"></i>
                <span data-i18n="addTender">${i18n.t('addTender')}</span>
              </button>
            ` : ''}
            <button onclick="TendersModule.openBidWorkspace('${this.state.tenders[0] ? this.state.tenders[0].id : ''}')" class="sari-btn px-4 py-2 bg-sari-lime hover:bg-sari-lime/90 text-slate-900 text-sm font-bold">
              <i class="fas fa-edit"></i>
              <span>${i18n.t('bidCalculator')}</span>
            </button>
            <button onclick="TendersModule.exportCSV()" class="sari-btn px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
              <i class="fas fa-file-export"></i>
              <span>${i18n.t('exportCSV')}</span>
            </button>
          </div>
        </div>

        <!-- Tender KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="sari-tile p-4 flex items-center justify-between border-l-4 border-l-sari-blue">
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase">Appels d'Offres Actifs (Pipeline)</p>
              <h4 class="text-2xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${submittedCount}</h4>
            </div>
            <div class="text-xs font-bold bg-sari-blue/10 text-sari-blue px-2 py-1 rounded">
              CHU & DSP Algérie
            </div>
          </div>
          <div class="sari-tile p-4 flex items-center justify-between border-l-4 border-l-sari-lime">
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase">Marchés Remportés (Won)</p>
              <h4 class="text-2xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${wonCount}</h4>
            </div>
            <div class="text-xs font-bold bg-sari-lime/20 text-sari-lime-dark px-2 py-1 rounded">
              Contrats Actifs
            </div>
          </div>
          <div class="sari-tile p-4 flex items-center justify-between border-l-4 border-l-sari-amber">
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase">Valeur Pipeline en Soumission</p>
              <h4 class="text-xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${i18n.formatCurrency(pipelineValueDZD)}</h4>
            </div>
            <div class="text-xs font-bold bg-sari-amber/10 text-sari-amber px-2 py-1 rounded font-mono-tech">
              Estimatif DA
            </div>
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="sari-tile p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Rechercher un Appel d'Offres</label>
            <input 
              type="text" 
              value="${this.state.searchQuery}"
              oninput="TendersModule.state.searchQuery=this.value" onkeydown="SariUtils.searchKeyHandler(event,()=>TendersModule.render())"
              placeholder="Ex: CHU Mustapha, DSP Blida, EHS, Moniteurs, AO-2026..."
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Filtrer par Statut de Soumission</label>
            <select 
              onchange="TendersModule.handleStatusFilter(this.value)"
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue font-semibold"
            >
              <option value="all">Tous les Statuts d'Appels d'Offres</option>
              <option value="watching" ${this.state.filterStatus === 'watching' ? 'selected' : ''}>Sous Surveillance (Watching)</option>
              <option value="inPreparation" ${this.state.filterStatus === 'inPreparation' ? 'selected' : ''}>En Préparation (In Preparation)</option>
              <option value="submitted" ${this.state.filterStatus === 'submitted' ? 'selected' : ''}>Soumission Déposée (Submitted)</option>
              <option value="underEvaluation" ${this.state.filterStatus === 'underEvaluation' ? 'selected' : ''}>En Évaluation (Under Evaluation)</option>
              <option value="won" ${this.state.filterStatus === 'won' ? 'selected' : ''}>Attribué / Gagné (Won)</option>
              <option value="lost" ${this.state.filterStatus === 'lost' ? 'selected' : ''}>Non Retenu / Perdu (Lost)</option>
            </select>
          </div>
        </div>

        <!-- Tenders Table -->
        <div class="sari-tile overflow-x-auto">
          <table class="w-full text-left border-collapse sari-table text-sm">
            <thead>
              <tr class="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                ${TableSort.th('tenders','referenceCode','Réf / Code AO','TendersModule.render()')}
                ${TableSort.th('tenders','title','Objet du Marché & Institution','TendersModule.render()')}
                ${TableSort.th('tenders','category','Catégorie','TendersModule.render()')}
                ${TableSort.th('tenders','estimatedValue','Montant Estimatif (DA)','TendersModule.render()')}
                ${TableSort.th('tenders','submissionDeadline','Échéance Dépôt','TendersModule.render()')}
                ${TableSort.th('tenders','status','Statut Soumission','TendersModule.render()')}
                <th class="p-3">Cahier des Charges & Docs</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="8" class="p-8 text-center text-slate-500">
                    <i class="fas fa-file-contract text-2xl mb-2 block"></i>
                    Aucun appel d'offres ne correspond à vos filtres.
                  </td>
                </tr>
              ` : filtered.map(t => {
                let badgeClass = 'bg-slate-100 text-slate-700';
                if (t.status === 'watching') badgeClass = 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white';
                if (t.status === 'inPreparation') badgeClass = 'bg-sari-blue/10 text-sari-blue border-sari-blue';
                if (t.status === 'submitted') badgeClass = 'bg-sari-amber/10 text-sari-amber border-sari-amber';
                if (t.status === 'won') badgeClass = 'bg-sari-lime/20 text-sari-lime-dark border-sari-lime-dark font-bold';
                if (t.status === 'lost') badgeClass = 'bg-red-500/10 text-red-600 dark:text-red-400';

                const docsCount = this.state.documents.filter(d => (d.links || []).some(l => l.recordType === 'tender' && l.recordId === t.id)).length;
                const checklist = this.state.checklistItems.filter(item => item.tenderId === t.id);
                const completed = checklist.filter(item => item.status === 'done' || item.status === 'not_applicable').length;
                const progress = checklist.length ? Math.round(completed / checklist.length * 100) : 0;
                const productsCount = Array.isArray(t.linkedProductIds) ? t.linkedProductIds.length : 0;

                return `
                  <tr class="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td class="p-3 font-mono-tech font-bold text-sari-blue">
                      ${t.referenceCode || t.id}
                      <div class="text-[9px] text-slate-400">${t.id}</div>
                    </td>
                    <td class="p-3">
                      <div class="font-bold text-slate-900 dark:text-white" ${DynamicI18n.attributes('tenders',t.id,'title',t.title)}>${SariUtils.escapeHtml(DynamicI18n.get('tenders',t.id,'title',t.title))}</div>
                      <div class="text-xs text-slate-500 mt-0.5">
                        <i class="fas fa-hospital text-sari-blue"></i> ${t.issuingOrganization}
                      </div>
                    </td>
                    <td class="p-3 text-xs">
                      <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        ${i18n.getCategoryName(t.category)}
                      </span>
                    </td>
                    <td class="p-3 font-mono-tech font-bold text-slate-800 dark:text-slate-200">
                      ${i18n.formatCurrency(t.estimatedValue)}
                    </td>
                    <td class="p-3 font-mono-tech font-semibold ${new Date(t.submissionDeadline) <= new Date() ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}">
                      ${i18n.formatDate(t.submissionDeadline)}
                    </td>
                    <td class="p-3">
                      <span class="sari-badge ${badgeClass}">
                        ${i18n.t(t.status)}
                      </span>
                    </td>
                    <td class="p-3">
                      <button onclick="TendersModule.openDocsModal('${t.id}')" class="text-xs font-bold text-sari-blue flex items-center gap-1">
                        <i data-lucide="list-checks" class="w-3.5 h-3.5"></i> ${completed}/${checklist.length} éléments terminés
                      </button>
                      <div class="w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden"><div class="h-full bg-sari-lime-dark" style="width:${progress}%"></div></div>
                      <button onclick="DocumentManager.open('tender','${t.id}','${SariUtils.escapeHtml(t.id)}')" class="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><i data-lucide="paperclip" class="w-3 h-3"></i>${docsCount} documents • ${productsCount} produits</button>
                    </td>
                    <td class="p-3 text-right">
                      <div class="flex justify-end gap-1">
                        <button onclick="TendersModule.openDetail('${t.id}')" title="Consulter" class="p-1.5 text-sari-blue"><i data-lucide="eye" class="w-4 h-4"></i></button>
                        <button onclick="TendersModule.openDocumentChain('${t.id}')" title="Chaîne documentaire" class="p-1.5 text-sari-amber"><i data-lucide="git-branch" class="w-4 h-4"></i></button>
                        <button onclick="TendersModule.openBidWorkspace('${t.id}')" title="Espace Préparation Offre (Devis)" class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sari-lime-dark">
                          <i class="fas fa-calculator"></i>
                        </button>
                        ${canWrite ? `
                          <button onclick="TendersModule.openModal('${t.id}')" title="Modifier" class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sari-blue">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button onclick="TendersModule.deleteTender('${t.id}')" title="Supprimer" class="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
                            <i class="fas fa-trash"></i>
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Container for Add/Edit Tender -->
      <div id="tender-modal-container"></div>
      <!-- Modal Container for Bid Preparation Workspace -->
      <div id="tender-workspace-modal"></div>
      <!-- Modal Container for Documents Checklist -->
      <div id="tender-docs-modal"></div>
    `;
  },

  getFilteredTenders() {
    return this.state.tenders.filter(t => {
      if (this.state.filterStatus !== 'all' && t.status !== this.state.filterStatus) {
        return false;
      }
      if (!SariUtils.matchesAdvancedSearch(t,this.state.searchQuery,['referenceCode','id','title','issuingOrganization','extendedDescription','status'])) return false;
      return true;
    });
  },

  handleSearch(val) {
    this.state.searchQuery = val;
    this.render();
  },

  handleStatusFilter(val) {
    this.state.filterStatus = val;
    this.render();
  },

  async openModal(tenderId = null) {
    this.state.editingId = tenderId;
    const ten = tenderId ? await window.sariDB.getById('tenders', tenderId) : {
      id: `AO-${new Date().getFullYear()}-CHU-${Math.floor(10 + Math.random() * 90)}`,
      title: '',
      issuingOrganization: 'CHU Mustapha Pacha - Alger',
      category: 'diagnostic',
      estimatedValue: 5000000,
      submissionDeadline: new Date().toISOString().split('T')[0],
      openingDate: new Date().toISOString().split('T')[0],
      status: 'inPreparation',
      linkedProductIds: [],
      documents: [
        { name: 'Cahier des Charges Original.pdf', status: 'ready' },
        { name: 'Offre Technique SARI.pdf', status: 'in_progress' },
        { name: 'Offre Financière & Soumission.pdf', status: 'in_progress' }
      ],
      notes: '',
      extendedDescription: ''
    };
    const previewReference = ten.referenceCode || await ReferenceCodeManager.preview('CON', { date: ten.submissionDeadline });

    const modalEl = document.getElementById('tender-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-6xl bg-white dark:bg-slate-900 p-6 shadow-2xl relative max-h-[94vh] overflow-y-auto">
          <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-lg text-slate-900 dark:text-white">
              ${tenderId ? 'Modifier l\'Appel d\'Offres / Consultation' : 'Nouvel Appel d\'Offres Médical'}
            </h3>
            <button onclick="TendersModule.closeModal()" class="text-slate-400 hover:text-slate-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <form onsubmit="TendersModule.saveTender(event)" class="space-y-4 text-sm">
            <div class="p-3 rounded-xl bg-sari-blue/5 border border-sari-blue/20"><label class="doc-label">Référence ERP automatique</label><input value="${previewReference}" readonly class="doc-input font-mono-tech font-bold text-sari-blue"><p class="text-[10px] text-slate-500 mt-1">La séquence définitive est réservée lors de l’enregistrement.</p></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Réf / Code Appel d'Offres *</label>
                <input type="text" id="ten-id" required value="${ten.id}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech font-bold" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Institution Émettrice *</label>
                <input type="text" id="ten-org" required value="${ten.issuingOrganization}" placeholder="Ex: CHU Mustapha Pacha, DSP Blida, EHS CPMC" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Objet du Marché / Titre de la Consultation *</label>
              <input type="text" id="ten-title" required value="${ten.title}" placeholder="Ex: Acquisition de 20 Moniteurs Patients & Lits d'Hospitalisation" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Catégorie Médicale</label>
                <select id="ten-category" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800">
                  ${SARI_CONFIG.PRODUCT_CATEGORIES.map(c => `
                    <option value="${c.id}" ${ten.category === c.id ? 'selected' : ''}>${i18n.getCategoryName(c.id)}</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Budget Estimé (DZD) *</label>
                <input type="number" step="0.01" id="ten-value" required value="${ten.estimatedValue}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Statut Soumission *</label>
                <select id="ten-status" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-semibold">
                  <option value="watching" ${ten.status === 'watching' ? 'selected' : ''}>Sous Surveillance</option>
                  <option value="inPreparation" ${ten.status === 'inPreparation' ? 'selected' : ''}>En Préparation</option>
                  <option value="submitted" ${ten.status === 'submitted' ? 'selected' : ''}>Soumission Déposée</option>
                  <option value="underEvaluation" ${ten.status === 'underEvaluation' ? 'selected' : ''}>En Évaluation</option>
                  <option value="won" ${ten.status === 'won' ? 'selected' : ''}>Attribué / Gagné (Won)</option>
                  <option value="lost" ${ten.status === 'lost' ? 'selected' : ''}>Non Retenu / Perdu (Lost)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Date Limite de Dépôt des Offres *</label>
                <input type="date" id="ten-deadline" required value="${ten.submissionDeadline}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Date d'Ouverture des Plis</label>
                <input type="date" id="ten-opening" required value="${ten.openingDate}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
              </div>
            </div>

            ${!tenderId ? `<div><label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Modèle de checklist à appliquer</label><select id="ten-template" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800"><option value="">Aucun modèle</option>${this.state.checklistTemplates.map(tpl => `<option value="${tpl.id}">${SariUtils.escapeHtml(tpl.name)} (${tpl.items.length} éléments)</option>`).join('')}</select><p class="text-[10px] text-slate-500 mt-1">Une copie indépendante sera créée pour cet appel d’offres.</p></div>` : ''}

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Notes Internes / Concurrence</label>
              <input type="text" id="ten-notes" value="${ten.notes || ''}" placeholder="Ex: Soumission déposée au bureau des marchés, Caution de 1% prête" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
            </div>

            ${RichTextEditor.html('ten-rich-description', ten.extendedDescription || '', 'Description détaillée de la consultation / exigences techniques')}

            <div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onclick="TendersModule.closeModal()" class="sari-btn px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white">
                ${i18n.t('cancel')}
              </button>
              <button type="submit" class="sari-btn px-5 py-2 bg-sari-blue text-white font-bold">
                ${i18n.t('save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  closeModal() {
    const modalEl = document.getElementById('tender-modal-container');
    if (modalEl) modalEl.innerHTML = '';
    this.state.editingId = null;
  },

  async saveTender(e) {
    if (!auth.can('tenders', this.state.editingId ? 'edit' : 'create')) return window.app.showToast('Action non autorisée', 'error');
    e.preventDefault();
    const id = document.getElementById('ten-id').value.trim();
    const orig = this.state.editingId ? await window.sariDB.getById('tenders', this.state.editingId) : {};

    const referenceCode = orig.referenceCode || await ReferenceCodeManager.generate('CON', { date: document.getElementById('ten-deadline').value });
    const payload = {
      id,
      referenceCode,
      issuingOrganization: document.getElementById('ten-org').value.trim(),
      title: document.getElementById('ten-title').value.trim(),
      category: document.getElementById('ten-category').value,
      estimatedValue: Number(document.getElementById('ten-value').value),
      status: document.getElementById('ten-status').value,
      submissionDeadline: document.getElementById('ten-deadline').value,
      openingDate: document.getElementById('ten-opening').value,
      notes: document.getElementById('ten-notes').value.trim(),
      extendedDescription: RichTextEditor.value('ten-rich-description'),
      linkedProductIds: orig.linkedProductIds || ['prod-001'],
      documents: orig.documents || [
        { name: 'Cahier des Charges Original.pdf', status: 'ready' },
        { name: 'Offre Technique SARI.pdf', status: 'ready' },
        { name: 'Offre Financière & Soumission.pdf', status: 'ready' },
        { name: 'Caution de Soumission (1%).pdf', status: 'ready' }
      ]
    };

    await window.syncController.enqueueMutation('tenders', 'save', payload);
    if (!this.state.editingId) {
      const templateId = document.getElementById('ten-template')?.value;
      const template = this.state.checklistTemplates.find(item => item.id === templateId);
      if (template) {
        const deadline = new Date(payload.submissionDeadline);
        for (const templateItem of template.items) {
          const due = new Date(deadline);
          due.setDate(due.getDate() + Number(templateItem.dueOffsetDays || 0));
          await window.sariDB.save('checklistItems', { id: `chk-${crypto.randomUUID()}`, tenderId: id, label: templateItem.label, status: 'todo', dueDate: due.toISOString().split('T')[0], notes: '', createdAt: new Date().toISOString() });
        }
      }
    }
    this.closeModal();
    window.app.showToast(i18n.t('savedSuccessfully'), 'success');
    await this.render();
  },

  async deleteTender(id) {
    if (!auth.can('tenders','delete')) return window.app.showToast('Action non autorisée', 'error');
    if (!await DialogManager.confirm('Supprimer cet appel d\'offres ?')) return;
    await window.syncController.enqueueMutation('tenders', 'delete', { id });
    const checklist = await sariDB.getAll('checklistItems');
    for (const item of checklist.filter(row => row.tenderId === id)) await sariDB.delete('checklistItems', item.id);
    window.app.showToast(i18n.t('deletedSuccessfully'), 'info');
    await this.render();
  },

  async openDetail(id){const t=await sariDB.getById('tenders',id),items=(await sariDB.getAll('checklistItems')).filter(x=>x.tenderId===id),root=document.getElementById('sari-modal-root');root.innerHTML=`<div class="fixed inset-0 z-50 sari-modal-backdrop flex items-center justify-center p-3"><div class="sari-tile w-full max-w-5xl max-h-[94vh] overflow-y-auto p-6"><header class="flex justify-between border-b pb-3"><div><span class="sari-badge">${i18n.t(t.status)}</span><h3 class="text-xl font-extrabold mt-2" ${DynamicI18n.attributes('tenders',t.id,'title',t.title)}>${SariUtils.escapeHtml(DynamicI18n.get('tenders',t.id,'title',t.title))}</h3><p class="font-mono-tech text-sari-blue">${t.referenceCode||t.id}</p></div><button onclick="app.closeModalRoot()"><i data-lucide="x"></i></button></header><div class="grid md:grid-cols-3 gap-3 my-4"><div class="p-3 border rounded"><small>Institution</small><b class="block">${SariUtils.escapeHtml(t.issuingOrganization)}</b></div><div class="p-3 border rounded"><small>Échéance</small><b class="block">${i18n.formatDate(t.submissionDeadline)}</b></div><div class="p-3 border rounded"><small>Checklist</small><b class="block">${items.filter(x=>x.status==='done').length}/${items.length}</b></div></div><div class="rich-content">${RichTextEditor.sanitize(t.extendedDescription||t.notes||'')}</div><footer class="flex justify-end gap-2 mt-5"><button onclick="app.closeModalRoot();TendersModule.openDocsModal('${id}')" class="sari-btn px-4 bg-slate-800 text-white">Checklist</button><button onclick="app.closeModalRoot();TendersModule.openDocumentChain('${id}')" class="sari-btn px-4 bg-sari-amber">Traçabilité</button>${auth.can('tenders','edit')?`<button onclick="app.closeModalRoot();TendersModule.openModal('${id}')" class="sari-btn px-4 bg-sari-blue text-white">Modifier</button>`:''}</footer></div></div>`;if(typeof lucide!=='undefined')lucide.createIcons();},
  async openDocumentChain(tenderId){const tender=await sariDB.getById('tenders',tenderId),orders=(await sariDB.getAll('orders')).filter(o=>o.linkedTenderId===tenderId),purchases=(await sariDB.getAll('purchaseDocuments')).filter(d=>d.linkedTenderId===tenderId),root=document.getElementById('sari-modal-root');const stages=[{title:'Consultation',icon:'file-check-2',items:[tender]},{title:'Approvisionnement',icon:'shopping-cart',items:purchases},{title:'Vente & livraison',icon:'truck',items:orders},{title:'Clôture',icon:'badge-check',items:[...purchases,...orders].filter(x=>['paid','closed'].includes(x.status))}];root.innerHTML=`<div class="fixed inset-0 z-50 sari-modal-backdrop flex items-center justify-center p-3"><div class="sari-tile w-full max-w-6xl max-h-[94vh] overflow-y-auto p-6"><header class="flex justify-between border-b pb-4"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">Traçabilité documentaire</span><h3 class="text-xl font-extrabold mt-2">${SariUtils.escapeHtml(tender.title)}</h3><p class="font-mono-tech text-xs text-sari-blue">${tender.referenceCode||tender.id}</p></div><button onclick="app.closeModalRoot()"><i data-lucide="x"></i></button></header><div class="trace-flow mt-6">${stages.map((stage,index)=>`<section class="trace-step" style="animation-delay:${index*.08}s"><div class="trace-node"><i data-lucide="${stage.icon}"></i><span>${index+1}</span></div><div class="trace-content"><h4>${stage.title}</h4>${stage.items.length?stage.items.map(item=>`<button onclick="${item.documentType?.startsWith('purchase')||item.documentType==='goods_receipt'?`app.closeModalRoot();PurchasesModule.openDetail('${item.id}')`:item.customerId?`app.closeModalRoot();SalesModule.openPrintModal('${item.id}','facture')`:'void 0'}" class="trace-document"><b>${item.referenceCode||item.id}</b><small>${item.status||'active'} • ${item.supplierName||item.customerName||item.issuingOrganization||''}</small></button>`).join(''):'<p class="text-xs text-slate-400">Aucun document à cette étape</p>'}</div></section>`).join('')}</div></div></div>`;if(typeof lucide!=='undefined')lucide.createIcons();},

  exportCSV() {
    SariUtils.exportToCSV(this.state.tenders, 'sari-systeme-appels-offres.csv');
  },

  /**
   * Bid Preparation Workspace (Pricing Worksheet linked to Inventory/Cost Data)
   */
  async openBidWorkspace(tenderId) {
    let t = null;
    if (tenderId) {
      t = await window.sariDB.getById('tenders', tenderId);
    }
    if (!t) {
      t = this.state.tenders[0];
    }
    if (!t) return;

    this.state.activeBidTenderId = t.id;
    const modalEl = document.getElementById('tender-workspace-modal');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-4xl bg-white dark:bg-slate-900 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center border-b pb-3 mb-4">
            <div>
              <span class="text-xs font-bold text-sari-blue uppercase">Fiche de Calcul Marchés Publics / Privés</span>
              <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">
                Espace de Préparation de l'Offre (Bordereau des Prix Unitaires BPU) - ${t.id}
              </h3>
            </div>
            <button onclick="TendersModule.closeBidWorkspace()" class="text-slate-400 hover:text-slate-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 mb-4 flex justify-between items-center">
            <div>
              <h4 class="font-bold text-slate-900 dark:text-white">${t.title}</h4>
              <p class="text-xs text-slate-500">${t.issuingOrganization} • Budget estimatif: <strong class="font-mono-tech">${i18n.formatCurrency(t.estimatedValue)}</strong></p>
            </div>
            <span class="sari-badge bg-sari-blue/10 text-sari-blue">${i18n.t(t.status)}</span>
          </div>

          <!-- Product Picker to add items to BPU -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Sélectionner un produit du catalogue SARI :</label>
              <div class="flex gap-2"><input id="bpu-add-select" list="bpu-product-options" class="doc-input" placeholder="Code, SKU ou nom…" autocomplete="off"><datalist id="bpu-product-options">${this.state.products.map(p=>`<option value="${p.referenceCode||p.sku}">${p.sku} • ${p.name}</option>`).join('')}</datalist><button onclick="CatalogPicker.open(p=>{document.getElementById('bpu-add-select').value=p.referenceCode||p.sku})" class="sari-btn px-3 bg-slate-800 text-white">Catalogue</button></div>
            </div>
            <div class="flex items-end">
              <button onclick="TendersModule.addItemToBidWorkspace()" class="sari-btn w-full px-4 py-2 bg-sari-blue text-white font-bold text-sm">
                <i class="fas fa-plus"></i> Ajouter au Devis
              </button>
            </div>
          </div>

          <!-- BPU Table -->
          <div class="border rounded overflow-hidden">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-slate-500">
                <tr>
                  <th class="p-2.5">Produit / Ligne</th>
                  <th class="p-2.5">Coût Achat (DA)</th>
                  <th class="p-2.5">Marge (%)</th>
                  <th class="p-2.5">Prix Offre Unitaire (DA)</th>
                  <th class="p-2.5">Quantité (Pcs)</th>
                  <th class="p-2.5">Total Ligne (DA)</th>
                  <th class="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody id="bpu-table-body"></tbody>
            </table>
          </div>

          <!-- Bid Total Summary Banner -->
          <div id="bpu-summary-box" class="mt-4 p-4 bg-sari-lime/20 rounded border-2 border-sari-lime-dark flex justify-between items-center"></div>

          <div class="mt-5 flex justify-end gap-2">
            <button onclick="TendersModule.closeBidWorkspace()" class="sari-btn px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white">
              Fermer
            </button>
            <button onclick="TendersModule.saveBidWorkspace()" class="sari-btn px-5 py-2 bg-sari-blue text-white font-bold">
              <i class="fas fa-save"></i> Enregistrer l'Offre Financière
            </button>
          </div>
        </div>
      </div>
    `;

    this.renderBPUItems(t);
  },

  renderBPUItems(t) {
    const tbody = document.getElementById('bpu-table-body');
    if (!tbody) return;

    const linkedIds = t.linkedProductIds || ['prod-001', 'prod-002'];
    const rowsHtml = linkedIds.map((pid, idx) => {
      const p = this.state.products.find(x => x.id === pid) || this.state.products[0];
      if (!p) return '';
      const margin = 24; // 24% default target profit margin
      const unitCost = Number(p.purchasePrice) || 10000;
      const unitOffer = Math.round(unitCost * (1 + margin / 100));
      const qty = idx === 0 ? 10 : 5;
      const totalLine = unitOffer * qty;

      return `
        <tr class="border-t border-slate-200 dark:border-slate-800 bpu-row" data-pid="${p.id}" data-cost="${unitCost}">
          <td class="p-2.5 font-bold">
            ${p.sku} - ${p.name}
          </td>
          <td class="p-2.5 font-mono-tech">
            ${i18n.formatCurrency(unitCost)}
          </td>
          <td class="p-2.5">
            <input type="number" value="${margin}" oninput="TendersModule.recalculateBPU()" class="bpu-margin w-16 px-2 py-1 border rounded text-center font-bold" /> %
          </td>
          <td class="p-2.5 font-mono-tech font-bold text-sari-blue bpu-unit-price">
            ${i18n.formatCurrency(unitOffer)}
          </td>
          <td class="p-2.5">
            <input type="number" value="${qty}" oninput="TendersModule.recalculateBPU()" class="bpu-qty w-16 px-2 py-1 border rounded text-center font-mono-tech font-bold" />
          </td>
          <td class="p-2.5 font-mono-tech font-extrabold text-sari-blue bpu-line-total">
            ${i18n.formatCurrency(totalLine)}
          </td>
          <td class="p-2.5 text-right">
            <button onclick="this.closest('tr').remove(); TendersModule.recalculateBPU();" class="text-red-500 hover:text-red-700">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rowsHtml;
    this.recalculateBPU();
  },

  addItemToBidWorkspace() {
    const sel = document.getElementById('bpu-add-select');
    if (!sel) return;
    const query=sel.value.trim().toLowerCase();
    const p=this.state.products.find(x=>[x.id,x.referenceCode,x.sku,x.barcode].some(v=>String(v||'').toLowerCase()===query)||x.name.toLowerCase().includes(query));
    if (!p) return;

    const tbody = document.getElementById('bpu-table-body');
    const unitCost = Number(p.purchasePrice) || 5000;
    const margin = 25;
    const unitOffer = Math.round(unitCost * (1 + margin / 100));

    const tr = document.createElement('tr');
    tr.className = 'border-t border-slate-200 dark:border-slate-800 bpu-row';
    tr.setAttribute('data-pid', p.id);
    tr.setAttribute('data-cost', unitCost);
    tr.innerHTML = `
      <td class="p-2.5 font-bold">${p.sku} - ${p.name}</td>
      <td class="p-2.5 font-mono-tech">${i18n.formatCurrency(unitCost)}</td>
      <td class="p-2.5"><input type="number" value="${margin}" oninput="TendersModule.recalculateBPU()" class="bpu-margin w-16 px-2 py-1 border rounded text-center font-bold" /> %</td>
      <td class="p-2.5 font-mono-tech font-bold text-sari-blue bpu-unit-price">${i18n.formatCurrency(unitOffer)}</td>
      <td class="p-2.5"><input type="number" value="10" oninput="TendersModule.recalculateBPU()" class="bpu-qty w-16 px-2 py-1 border rounded text-center font-mono-tech font-bold" /></td>
      <td class="p-2.5 font-mono-tech font-extrabold text-sari-blue bpu-line-total">${i18n.formatCurrency(unitOffer * 10)}</td>
      <td class="p-2.5 text-right"><button onclick="this.closest('tr').remove(); TendersModule.recalculateBPU();" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
    this.recalculateBPU();
  },

  recalculateBPU() {
    const rows = document.querySelectorAll('.bpu-row');
    let grandTotalDZD = 0;
    let totalCostDZD = 0;

    rows.forEach(r => {
      const cost = Number(r.getAttribute('data-cost')) || 0;
      const margin = Number(r.querySelector('.bpu-margin').value) || 0;
      const qty = Number(r.querySelector('.bpu-qty').value) || 1;
      const unitOffer = Math.round(cost * (1 + margin / 100));
      const lineTotal = unitOffer * qty;
      const lineCost = cost * qty;

      r.querySelector('.bpu-unit-price').textContent = i18n.formatCurrency(unitOffer);
      r.querySelector('.bpu-line-total').textContent = i18n.formatCurrency(lineTotal);

      grandTotalDZD += lineTotal;
      totalCostDZD += lineCost;
    });

    const totalProfitDZD = grandTotalDZD - totalCostDZD;
    const profitMarginPercent = totalCostDZD > 0 ? ((totalProfitDZD / totalCostDZD) * 100).toFixed(1) : 0;

    const summaryBox = document.getElementById('bpu-summary-box');
    if (summaryBox) {
      summaryBox.innerHTML = `
        <div>
          <span class="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase">Montant Total de l'Offre Financière</span>
          <h3 class="text-2xl font-extrabold font-mono-tech text-sari-lime-dark mt-0.5">${i18n.formatCurrency(grandTotalDZD)}</h3>
        </div>
        <div class="text-right">
          <span class="sari-badge bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono-tech">
            Marge Globale Estimée : ${i18n.formatCurrency(totalProfitDZD)} (+${profitMarginPercent}%)
          </span>
          <p class="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
            Conforme au barème des marchés publics algériens
          </p>
        </div>
      `;
    }
  },

  async saveBidWorkspace() {
    if (!this.state.activeBidTenderId) return;
    const rows = document.querySelectorAll('.bpu-row');
    const pids = [];
    rows.forEach(r => {
      const pid = r.getAttribute('data-pid');
      if (pid) pids.push(pid);
    });

    const t = await window.sariDB.getById('tenders', this.state.activeBidTenderId);
    if (t) {
      t.linkedProductIds = pids;
      await window.syncController.enqueueMutation('tenders', 'save', t);
      window.app.showToast('Offre financière (BPU) enregistrée avec succès !', 'success');
      this.closeBidWorkspace();
      await this.render();
    }
  },

  closeBidWorkspace() {
    const modalEl = document.getElementById('tender-workspace-modal');
    if (modalEl) modalEl.innerHTML = '';
  },

  /** Database-backed tender checklist detail. */
  async openDocsModal(tenderId) {
    const t = await window.sariDB.getById('tenders', tenderId); if (!t) return;
    this.state.activeChecklistTenderId = tenderId;
    this.state.checklistItems = await window.sariDB.getAll('checklistItems');
    const items = this.state.checklistItems.filter(item => item.tenderId === tenderId);
    const completed = items.filter(item => ['done','not_applicable'].includes(item.status)).length;
    const progress = items.length ? Math.round(completed / items.length * 100) : 0;
    const canWrite = auth.can('tenders','edit');
    const modalEl = document.getElementById('tender-docs-modal'); if (!modalEl) return;
    modalEl.innerHTML = `<div class="fixed inset-0 z-50 flex items-center justify-center p-3 sari-modal-backdrop"><div class="sari-tile w-full max-w-4xl bg-white dark:bg-slate-900 shadow-2xl max-h-[94vh] overflow-hidden flex flex-col">
      <header class="p-5 border-b sari-grid-pattern flex justify-between"><div><span class="text-[10px] font-black text-sari-blue uppercase tracking-widest">Dossier interactif • ${SariUtils.escapeHtml(t.id)}</span><h3 class="font-extrabold text-xl">${SariUtils.escapeHtml(t.title)}</h3><div class="flex items-center gap-3 mt-2"><div class="w-56 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div class="h-full bg-sari-lime-dark transition-all" style="width:${progress}%"></div></div><b class="text-xs text-sari-lime-dark">${completed}/${items.length} terminés (${progress}%)</b></div></div><button onclick="TendersModule.closeDocsModal()" aria-label="Fermer"><i data-lucide="x"></i></button></header>
      <div class="p-5 overflow-y-auto space-y-3">${items.length ? items.map(item => this.checklistRow(item, canWrite)).join('') : `<div class="p-8 text-center border-2 border-dashed rounded-xl text-slate-400"><i data-lucide="list-plus" class="w-8 h-8 mx-auto"></i><p class="font-bold mt-2">Checklist vide</p><p class="text-xs">Ajoutez un élément ou appliquez un modèle.</p></div>`}</div>
      <footer class="p-4 border-t flex flex-col sm:flex-row justify-between gap-3">${canWrite?`<form onsubmit="TendersModule.addChecklistItem(event)" class="flex flex-1 flex-col sm:flex-row gap-2"><input id="check-new-label" class="doc-input flex-1" placeholder="Nouvel élément…" required><input id="check-new-due" type="date" class="doc-input sm:w-40"><button class="sari-btn px-4 bg-sari-blue text-white text-xs"><i data-lucide="plus" class="w-4 h-4"></i>Ajouter</button></form>`:''}<button onclick="DocumentManager.open('tender','${t.id}','${SariUtils.escapeHtml(t.id)}')" class="sari-btn px-4 py-2 bg-slate-800 text-white text-xs"><i data-lucide="folder-open" class="w-4 h-4"></i>Documents du dossier</button></footer>
    </div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  checklistRow(item, canWrite) {
    const statuses = [{id:'todo',label:'À faire'},{id:'in_progress',label:'En cours'},{id:'done',label:'Terminé'},{id:'not_applicable',label:'Non applicable'}];
    const docCount = this.state.documents.filter(d => (d.links||[]).some(l=>l.recordType==='checklistItem'&&l.recordId===item.id)).length;
    return `<article class="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/60 grid grid-cols-1 md:grid-cols-[1fr_150px_130px_auto] gap-3 items-center"><div><h4 class="font-bold text-sm ${item.status==='done'?'line-through opacity-60':''}">${SariUtils.escapeHtml(item.label)}</h4><p class="text-xs text-slate-500 mt-1">${SariUtils.escapeHtml(item.notes||'Sans notes')}</p></div><select onchange="TendersModule.updateChecklistStatus('${item.id}',this.value)" class="doc-input" ${canWrite?'':'disabled'}>${statuses.map(s=>`<option value="${s.id}" ${s.id===item.status?'selected':''}>${s.label}</option>`).join('')}</select><div class="text-xs"><i data-lucide="calendar" class="w-3 h-3 inline"></i> ${item.dueDate?i18n.formatDate(item.dueDate):'Sans échéance'}</div><div class="flex justify-end gap-1"><button onclick="DocumentManager.open('checklistItem','${item.id}','${SariUtils.escapeHtml(item.label)}')" class="doc-action relative"><i data-lucide="paperclip" class="w-4 h-4"></i>${docCount}</button>${canWrite?`<button onclick="TendersModule.editChecklistItem('${item.id}')" class="doc-action"><i data-lucide="pencil" class="w-4 h-4"></i></button><button onclick="TendersModule.deleteChecklistItem('${item.id}')" class="doc-action text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`:''}</div></article>`;
  },

  async addChecklistItem(event) { event.preventDefault(); const label=document.getElementById('check-new-label').value.trim(); if(!label)return; await sariDB.save('checklistItems',{id:`chk-${crypto.randomUUID()}`,tenderId:this.state.activeChecklistTenderId,label,status:'todo',dueDate:document.getElementById('check-new-due').value,notes:'',createdAt:new Date().toISOString()}); await this.openDocsModal(this.state.activeChecklistTenderId); },
  async updateChecklistStatus(id,status) { const item=await sariDB.getById('checklistItems',id); if(!item)return; item.status=status;item.updatedAt=new Date().toISOString();await sariDB.save('checklistItems',item);await this.openDocsModal(item.tenderId); },
  async editChecklistItem(id) { const item=await sariDB.getById('checklistItems',id);if(!item)return;const v=await DialogManager.form('Modifier la ligne de checklist',[{name:'label',label:'Libellé',value:item.label,required:true},{name:'dueDate',label:'Échéance',type:'date',value:item.dueDate||''},{name:'notes',label:'Notes',type:'textarea',value:item.notes||''}]);if(!v)return;Object.assign(item,{...v,updatedAt:new Date().toISOString()});await sariDB.save('checklistItems',item);await this.openDocsModal(item.tenderId); },
  async deleteChecklistItem(id) { const item=await sariDB.getById('checklistItems',id);if(item&&await DialogManager.confirm('Supprimer cet élément de checklist ?')){await sariDB.delete('checklistItems',id);await this.openDocsModal(item.tenderId);} },
  closeDocsModal() { const el=document.getElementById('tender-docs-modal');if(el)el.innerHTML='';this.state.activeChecklistTenderId=null; }

};

if (typeof window !== 'undefined') {
  window.TendersModule = TendersModule;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TendersModule;
}
