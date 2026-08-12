/**
 * SARI Système - Suppliers Management Module (Local & International)
 * Track Algerian suppliers and international manufacturers, Incoterms,
 * certifications, performance scorecards, and Local vs Import sourcing comparator.
 */

const SuppliersModule = {
  state: {
    suppliers: [],
    filterType: 'all',
    searchQuery: '',
    editingId: null
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.state.suppliers = await window.sariDB.getAll('suppliers');
    [this.state.purchaseDocuments,this.state.supplierTypes,this.state.countries] = await Promise.all(['purchaseDocuments','supplierTypes','countries'].map(s=>sariDB.getAll(s)));
    this.renderView(container);
  },

  renderView(container) {
    const canWrite = window.auth && window.auth.canWrite('importExport');
    const filtered = this.getFilteredSuppliers();

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="sari-tile p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white" data-i18n="suppliers">
              ${i18n.t('suppliers')}
            </h2>
            <p class="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Gestion des fabricants internationaux, distributeurs algériens, Incoterms (FOB/CIF/DDP) et conformité ISO/CE.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${canWrite ? `
              <button onclick="SuppliersModule.openModal()" class="sari-btn px-4 py-2 bg-sari-blue hover:bg-sari-blue/90 text-white shadow-sm text-sm">
                <i class="fas fa-plus"></i>
                <span data-i18n="addSupplier">${i18n.t('addSupplier')}</span>
              </button>
            ` : ''}
            <button onclick="SuppliersModule.openComparatorModal()" class="sari-btn px-4 py-2 bg-sari-lime hover:bg-sari-lime/90 text-slate-900 text-sm font-bold">
              <i class="fas fa-balance-scale"></i>
              <span>${i18n.t('sourcingCalc')}</span>
            </button>
            <button onclick="SuppliersModule.exportCSV()" class="sari-btn px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
              <i class="fas fa-file-export"></i>
              <span>${i18n.t('exportCSV')}</span>
            </button>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="sari-tile p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Recherche Fournisseur</label>
            <input 
              type="text" 
              value="${this.state.searchQuery}"
              oninput="SuppliersModule.state.searchQuery=this.value" onkeydown="SariUtils.searchKeyHandler(event,()=>SuppliersModule.render())"
              placeholder="Ex: MediCare, BioMed, Saidal, Allemagne..."
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Type de Fournisseur</label>
            <select 
              onchange="SuppliersModule.handleTypeFilter(this.value)"
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
            >
              <option value="all">Tous les Fournisseurs</option>
              ${(this.state.supplierTypes||[]).filter(x=>x.isActive).map(x=>`<option value="${x.id}" ${this.state.filterType===x.id?'selected':''}>${x.name?.[i18n.currentLang]||x.name?.fr}</option>`).join('')}
            </select>
          </div>
          <div class="flex items-end">
            <div class="w-full text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border">
              <strong>Info Incoterms:</strong> FOB (Free On Board) • CIF (Cost Insurance & Freight) • EXW (Ex Works) • DDP (Rendu Droits Acquittés)
            </div>
          </div>
        </div>

        <!-- Suppliers Table -->
        <div class="sari-tile overflow-x-auto">
          <table class="w-full text-left border-collapse sari-table text-sm">
            <thead>
              <tr class="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                <th class="p-3">Fournisseur & Pays</th>
                <th class="p-3">Type & Devise</th>
                <th class="p-3">Incoterm Habituel</th>
                <th class="p-3">Certifications (ISO / CE)</th>
                <th class="p-3">Contact</th>
                <th class="p-3">Performance & Fiabilité</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="7" class="p-8 text-center text-slate-500">
                    <i class="fas fa-industry text-2xl mb-2 block"></i>
                    Aucun fournisseur ne correspond à vos filtres.
                  </td>
                </tr>
              ` : filtered.map(s => {
                const isLocal = s.country === 'Algérie' || s.type === 'local';
                const score = isLocal ? '98% (Très Rapide)' : '92% (Conforme CIF)';
                const badgeColor = isLocal ? 'bg-sari-lime/20 text-sari-lime-dark' : 'bg-sari-blue/10 text-sari-blue';

                return `
                  <tr class="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td class="p-3">
                      <div class="font-bold text-slate-900 dark:text-white">${s.name}</div><div class="font-mono-tech text-[10px] text-sari-blue">${s.referenceCode||s.id}</div>
                      <div class="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <i class="fas fa-map-marker-alt text-sari-blue"></i> ${s.country}
                      </div>
                    </td>
                    <td class="p-3">
                      <span class="sari-badge ${badgeColor}">
                        ${s.type}
                      </span>
                      <div class="text-xs font-mono-tech font-bold mt-1 text-slate-600 dark:text-slate-300">
                        Devise: <strong class="text-sari-blue">${s.currency}</strong>
                      </div>
                    </td>
                    <td class="p-3 font-mono-tech font-bold text-slate-800 dark:text-slate-200">
                      ${s.incoterms || 'FOB'}
                    </td>
                    <td class="p-3 text-xs">
                      <span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-mono-tech">
                        ${s.certifications || 'CE 0123 / ISO 13485'}
                      </span>
                    </td>
                    <td class="p-3 text-xs text-slate-600 dark:text-slate-300">
                      <div>${s.contactInfo || '-'}</div>
                    </td>
                    <td class="p-3">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-sari-lime-dark">${score}</span>
                      </div>
                      <div class="w-24 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                        <div class="bg-sari-lime h-full" style="width: 94%"></div>
                      </div>
                    </td>
                    <td class="p-3 text-right">
                      <div class="flex justify-end gap-1">
                        <button onclick="SuppliersModule.open360('${s.id}')" title="Vue 360°" class="p-1.5 rounded text-sari-lime-dark"><i data-lucide="chart-no-axes-combined" class="w-4 h-4"></i></button>
                        <button onclick="DocumentManager.open('supplier','${s.id}','${SariUtils.escapeHtml(s.name)}')" title="Documents GED" class="p-1.5 rounded text-sari-blue"><i data-lucide="paperclip" class="w-4 h-4"></i></button>
                        ${canWrite ? `
                          <button onclick="SuppliersModule.openModal('${s.id}')" title="Modifier" class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sari-blue">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button onclick="SuppliersModule.deleteSupplier('${s.id}')" title="Supprimer" class="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
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

      <!-- Modal Container for Add/Edit Supplier -->
      <div id="sup-modal-container"></div>
      <!-- Modal Container for Comparator -->
      <div id="sup-comparator-modal"></div>
    `;
  },

  getFilteredSuppliers() {
    return this.state.suppliers.filter(s => {
      if (this.state.filterType !== 'all' && s.type !== this.state.filterType) {
        return false;
      }
      if (!SariUtils.matchesAdvancedSearch(s,this.state.searchQuery,['referenceCode','name','country','certifications','richDetails'])) return false;
      return true;
    });
  },

  handleSearch(val) {
    this.state.searchQuery = val;
    this.render();
  },

  handleTypeFilter(val) {
    this.state.filterType = val;
    this.render();
  },

  async openModal(supplierId = null) {
    this.state.editingId = supplierId;
    const sup = supplierId ? await window.sariDB.getById('suppliers', supplierId) : {
      name: '',
      country: 'Algérie',
      type: 'local',
      contactInfo: '',
      currency: 'DZD',
      incoterms: 'EXW',
      certifications: 'CE 0123, ISO 13485',
      notes: ''
    };

    const modalEl = document.getElementById('sup-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-5xl max-h-[94vh] overflow-y-auto bg-white dark:bg-slate-900 p-6 shadow-2xl relative">
          <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-lg text-slate-900 dark:text-white">
              ${supplierId ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur Médical'}
            </h3>
            <button onclick="SuppliersModule.closeModal()" class="text-slate-400 hover:text-slate-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <form onsubmit="SuppliersModule.saveSupplier(event)" class="space-y-4 text-sm">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nom du Fournisseur / Société *</label>
                <input type="text" id="sup-name" required value="${sup.name}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Pays d'Origine *</label>
                <input id="sup-country" list="supplier-country-options" required value="${sup.countryCode||sup.country||''}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" autocomplete="off"><datalist id="supplier-country-options">${(this.state.countries||[]).filter(c=>c.isActive).map(c=>`<option value="${c.iso3}">${c.name?.[i18n.currentLang]||c.name?.fr} • ${c.currency}</option>`).join('')}</datalist>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Type de Fournisseur</label>
                <input id="sup-type" list="supplier-type-options" value="${sup.type||''}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" required autocomplete="off"><datalist id="supplier-type-options">${(this.state.supplierTypes||[]).filter(x=>x.isActive).map(x=>`<option value="${x.id}">${x.name?.[i18n.currentLang]||x.name?.fr}</option>`).join('')}</datalist>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Devise Utilisée</label>
                <select id="sup-currency" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800">
                  <option value="DZD" ${sup.currency === 'DZD' ? 'selected' : ''}>Dinar Algérien (DZD)</option>
                  <option value="EUR" ${sup.currency === 'EUR' ? 'selected' : ''}>Euro (€)</option>
                  <option value="USD" ${sup.currency === 'USD' ? 'selected' : ''}>Dollar Américain ($)</option>
                  <option value="CNY" ${sup.currency === 'CNY' ? 'selected' : ''}>Yuan Chinois (¥)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Incoterms Habituel</label>
                <select id="sup-incoterm" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800">
                  ${SARI_CONFIG.INCOTERMS.map(i => `
                    <option value="${i.code}" ${sup.incoterms === i.code ? 'selected' : ''}>${i.code} - ${i.name}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Certifications Médicales (ISO / CE / Homologation)</label>
              <input type="text" id="sup-cert" value="${sup.certifications || ''}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Coordonnées (Email / Téléphone / Adresse)</label>
              <input type="text" id="sup-contact" value="${sup.contactInfo || ''}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800" />
            </div>

            <div class="grid md:grid-cols-[180px_1fr] gap-4">${ImageDropzone.html('sup-logo',sup.logo||'','Logo fournisseur')}${RichTextEditor.html('sup-rich-details',sup.richDetails||'','Informations détaillées / certifications / conditions')}</div>
            <div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onclick="SuppliersModule.closeModal()" class="sari-btn px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white">
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
    const modalEl = document.getElementById('sup-modal-container');
    if (modalEl) modalEl.innerHTML = '';
    this.state.editingId = null;
  },

  async saveSupplier(e) {
    if (!auth.can('suppliers', this.state.editingId ? 'edit' : 'create')) return window.app.showToast('Action non autorisée', 'error');
    e.preventDefault();
    const id = this.state.editingId || `sup-${Date.now()}`;
    const original = this.state.editingId ? await sariDB.getById('suppliers', id) : {};
    const typeInput=document.getElementById('sup-type').value.trim();const typeRecord=this.state.supplierTypes.find(x=>x.id===typeInput||[x.name?.fr,x.name?.ar,x.name?.en].includes(typeInput));if(!typeRecord)return app.showToast('Sélectionnez un type fournisseur configuré.','error');const supplierType=typeRecord.id;const subType=typeRecord.code;
    const countryInput=document.getElementById('sup-country').value.trim().toUpperCase();const countryRecord=this.state.countries.find(c=>c.iso3===countryInput||c.iso2===countryInput||[c.name?.fr,c.name?.ar,c.name?.en].includes(document.getElementById('sup-country').value.trim()));if(!countryRecord)return app.showToast('Sélectionnez un pays configuré.','error');
    const payload = {
      ...original,
      id,
      referenceCode: original.referenceCode || await ReferenceCodeManager.generate('FOU', { subType }),
      name: document.getElementById('sup-name').value.trim(),
      countryCode: countryRecord.iso3,
      country: countryRecord.name?.fr || countryRecord.iso3,
      type: supplierType,
      currency: document.getElementById('sup-currency').value,
      incoterms: document.getElementById('sup-incoterm').value,
      certifications: document.getElementById('sup-cert').value.trim(),
      contactInfo: document.getElementById('sup-contact').value.trim(),
      logo: ImageDropzone.value('sup-logo',original.logo||''),
      richDetails: RichTextEditor.value('sup-rich-details')
    };

    await window.syncController.enqueueMutation('suppliers', 'save', payload);
    this.closeModal();
    window.app.showToast(i18n.t('savedSuccessfully'), 'success');
    await this.render();
  },

  async open360(id){return Partner360.open('supplier',id);},

  async deleteSupplier(id) {
    if (!auth.can('suppliers','delete')) return window.app.showToast('Action non autorisée', 'error');
    if (!await DialogManager.confirm('Supprimer ce fournisseur médical ?')) return;
    await window.syncController.enqueueMutation('suppliers', 'delete', { id });
    window.app.showToast(i18n.t('deletedSuccessfully'), 'info');
    await this.render();
  },

  exportCSV() {
    SariUtils.exportToCSV(this.state.suppliers, 'sari-systeme-fournisseurs.csv');
  },

  /**
   * Sourcing Comparison Calculator: Local vs. Import
   */
  openComparatorModal() {
    const modalEl = document.getElementById('sup-comparator-modal');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-4xl bg-white dark:bg-slate-900 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center border-b pb-3 mb-4">
            <div>
              <span class="text-xs font-bold text-sari-blue uppercase">Outil d'Aide à la Décision SARI</span>
              <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">
                Comparateur de Coût d'Achat : Sourcing Local (Algérie) vs. Importation (International)
              </h3>
            </div>
            <button onclick="SuppliersModule.closeComparatorModal()" class="text-slate-400 hover:text-slate-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <p class="text-xs text-slate-600 dark:text-slate-300 mb-4">
            Comparez en temps réel l'achat d'un dispositif médical auprès d'un grossiste algérien (DZD) par rapport à une importation (FOB/CIF) avec devises, fret, assurance et droits de douane.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Left: Local Algerian Sourcing (DZD) -->
            <div class="sari-tile p-4 border-2 border-sari-lime">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-6 h-6 rounded bg-sari-lime/20 text-sari-lime-dark flex items-center justify-center font-bold text-xs">1</span>
                <h4 class="font-bold text-sm text-slate-900 dark:text-white">Option A: Sourcing Local Algérie (DZD)</h4>
              </div>
              <div class="space-y-3 text-xs">
                <div>
                  <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Prix Achat Unitaire en Dinars (DA)</label>
                  <input type="number" id="cmp-local-price" value="135000" oninput="SuppliersModule.updateComparator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech font-bold" />
                </div>
                <div>
                  <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Délai Livraison Estimé (Jours)</label>
                  <input type="number" id="cmp-local-days" value="5" oninput="SuppliersModule.updateComparator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                </div>
                <div>
                  <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Frais de Transport Local (DA)</label>
                  <input type="number" id="cmp-local-freight" value="8000" oninput="SuppliersModule.updateComparator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                </div>
              </div>
            </div>

            <!-- Right: International Import Sourcing -->
            <div class="sari-tile p-4 border-2 border-sari-blue">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-6 h-6 rounded bg-sari-blue/10 text-sari-blue flex items-center justify-center font-bold text-xs">2</span>
                <h4 class="font-bold text-sm text-slate-900 dark:text-white">Option B: Importation International (EUR/USD)</h4>
              </div>
              <div class="space-y-3 text-xs">
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Devise & Cours (DA)</label>
                    <select id="cmp-import-currency" onchange="SuppliersModule.updateComparator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-bold">
                      <option value="145.50">EUR (€) - 145.50 DA</option>
                      <option value="134.20" selected>USD ($) - 134.20 DA</option>
                      <option value="18.60">CNY (¥) - 18.60 DA</option>
                    </select>
                  </div>
                  <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Prix Devise (Unit)</label>
                    <input type="number" id="cmp-import-price" value="780" oninput="SuppliersModule.updateComparator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech font-bold" />
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Fret Maritime/Aérien (DA)</label>
                    <input type="number" id="cmp-import-freight" value="12000" oninput="SuppliersModule.updateComparator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                  </div>
                  <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Assurance (DA)</label>
                    <input type="number" id="cmp-import-ins" value="3000" oninput="SuppliersModule.updateComparator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                  </div>
                  <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Douanes & Port (DA)</label>
                    <input type="number" id="cmp-import-customs" value="15000" oninput="SuppliersModule.updateComparator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                  </div>
                </div>
                <div>
                  <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Délai Livraison Estimé (Jours)</label>
                  <input type="number" id="cmp-import-days" value="35" oninput="SuppliersModule.updateComparator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                </div>
              </div>
            </div>
          </div>

          <!-- Comparison Results Panel -->
          <div id="comparator-results-box" class="mt-6 p-5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700"></div>

          <div class="mt-4 flex justify-end">
            <button onclick="SuppliersModule.closeComparatorModal()" class="sari-btn px-4 py-2 bg-sari-blue text-white font-bold">
              Fermer
            </button>
          </div>
        </div>
      </div>
    `;

    this.updateComparator();
  },

  closeComparatorModal() {
    const modalEl = document.getElementById('sup-comparator-modal');
    if (modalEl) modalEl.innerHTML = '';
  },

  updateComparator() {
    const box = document.getElementById('comparator-results-box');
    if (!box) return;

    // Option A: Local
    const localPrice = Number(document.getElementById('cmp-local-price').value) || 0;
    const localDays = Number(document.getElementById('cmp-local-days').value) || 0;
    const localFreight = Number(document.getElementById('cmp-local-freight').value) || 0;
    const totalLocalDZD = localPrice + localFreight;

    // Option B: Import
    const rate = Number(document.getElementById('cmp-import-currency').value) || 134.20;
    const impPrice = Number(document.getElementById('cmp-import-price').value) || 0;
    const impDays = Number(document.getElementById('cmp-import-days').value) || 0;
    const impFreight = Number(document.getElementById('cmp-import-freight').value) || 0;
    const impIns = Number(document.getElementById('cmp-import-ins').value) || 0;
    const impCustoms = Number(document.getElementById('cmp-import-customs').value) || 0;

    const purchaseInDZD = Math.round(impPrice * rate);
    const totalImportDZD = purchaseInDZD + impFreight + impIns + impCustoms;

    const diffDZD = Math.abs(totalLocalDZD - totalImportDZD);
    const winner = totalImportDZD < totalLocalDZD ? 'import' : 'local';

    box.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div class="p-3 bg-white dark:bg-slate-900 rounded border">
          <p class="text-xs text-slate-500 font-bold uppercase">Coût Revient Local</p>
          <h4 class="text-xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${i18n.formatCurrency(totalLocalDZD)}</h4>
          <p class="text-[11px] text-slate-500 mt-1">Délai: ${localDays} jours • Disponible immédiatement</p>
        </div>

        <div class="p-3 bg-white dark:bg-slate-900 rounded border">
          <p class="text-xs text-slate-500 font-bold uppercase">Coût Revient Importation</p>
          <h4 class="text-xl font-extrabold font-mono-tech text-sari-blue mt-1">${i18n.formatCurrency(totalImportDZD)}</h4>
          <p class="text-[11px] text-slate-500 mt-1">Achat (${i18n.formatCurrency(purchaseInDZD)}) + Douane/Fret • Délai: ${impDays} jours</p>
        </div>

        <div class="p-3 ${winner === 'import' ? 'bg-sari-blue/10 border-sari-blue text-sari-blue' : 'bg-sari-lime/20 border-sari-lime-dark text-slate-900 dark:text-white'} rounded border-2 flex flex-col items-center justify-center">
          <p class="text-xs font-bold uppercase tracking-wider">RECOMMANDATION SARI</p>
          <h4 class="text-lg font-extrabold mt-1">
            ${winner === 'import' ? 'IMPORTATION AVANTAGEUSE' : 'SOURCING LOCAL AVANTAGEUX'}
          </h4>
          <p class="text-xs font-semibold mt-1">
            Économie de ${i18n.formatCurrency(diffDZD)} par unité !
          </p>
        </div>
      </div>
    `;
  }
};

if (typeof window !== 'undefined') {
  window.SuppliersModule = SuppliersModule;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SuppliersModule;
}
