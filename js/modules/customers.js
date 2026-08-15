/**
 * SARI Système - Customers Management Module
 * Manage Algerian public hospitals, private clinics, pharmacies,
 * Wilaya Health Directorates (DSP), credit limits, and NIF/RC tax numbers.
 */

const CustomersModule = {
  state: {
    customers: [],
    filterType: 'all',
    filterWilaya: 'all',
    filterCountry: 'all',
    searchQuery: '',
    editingId: null
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.state.customers = await window.sariDB.getAll('customers');
    [this.state.orders,this.state.purchaseDocuments,this.state.clientTypes,this.state.countries] = await Promise.all(['orders','purchaseDocuments','clientTypes','countries'].map(s=>sariDB.getAll(s)));
    this.renderView(container);
  },

  renderView(container) {
    const canWrite = window.auth && window.auth.canWrite('sales');
    TableSort.ensure('customers','name');
    const filtered = TableSort.apply('customers',this.getFilteredCustomers(),'name');

    // Summary KPIs
    let hospitalCount = 0;
    let pharmacyCount = 0;
    let totalCreditLimitDZD = 0;

    this.state.customers.forEach(c => {
      if (c.type === 'public_hospital' || c.type === 'private_clinic') hospitalCount++;
      if (c.type === 'pharmacy') pharmacyCount++;
      totalCreditLimitDZD += Number(c.creditLimit) || 0;
    });

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="sari-tile p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white" data-i18n="customers">
              ${i18n.t('customers')}
            </h2>
            <p class="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Gestion des hôpitaux CHU, cliniques privées, pharmacies d'officine et directions de la santé (DSP) des wilayas.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${canWrite ? `
              <button onclick="CustomersModule.openModal()" class="sari-btn px-4 py-2 bg-sari-blue hover:bg-sari-blue/90 text-white shadow-sm text-sm">
                <i data-lucide="plus"></i>
                <span data-i18n="addCustomer">${i18n.t('addCustomer')}</span>
              </button>
            ` : ''}
            <button onclick="CustomersModule.exportCSV()" class="sari-btn px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
              <i data-lucide="file-up"></i>
              <span>${i18n.t('exportCSV')}</span>
            </button>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="sari-tile p-4 flex items-center justify-between border-l-4 border-l-sari-blue">
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase">Hôpitaux & Cliniques</p>
              <h4 class="text-2xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${hospitalCount}</h4>
            </div>
            <div class="text-xs font-bold bg-sari-blue/10 text-sari-blue px-2 py-1 rounded">
              Institutions B2B
            </div>
          </div>
          <div class="sari-tile p-4 flex items-center justify-between border-l-4 border-l-sari-lime">
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase">Pharmacies & Grossistes</p>
              <h4 class="text-2xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${pharmacyCount}</h4>
            </div>
            <div class="text-xs font-bold bg-sari-lime/20 text-sari-lime-dark px-2 py-1 rounded">
              Clients Officines
            </div>
          </div>
          <div class="sari-tile p-4 flex items-center justify-between border-l-4 border-l-sari-amber">
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase">Plafond Crédit Cumulé</p>
              <h4 class="text-xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${i18n.formatCurrency(totalCreditLimitDZD)}</h4>
            </div>
            <div class="text-xs font-bold bg-sari-amber/10 text-sari-amber px-2 py-1 rounded">
              Lignes Trésor/Banque
            </div>
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="sari-tile p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Recherche (Nom, NIF, RC)</label>
            <input 
              type="text" 
              value="${this.state.searchQuery}"
              oninput="CustomersModule.state.searchQuery=this.value" onkeydown="SariUtils.searchKeyHandler(event,()=>CustomersModule.render())"
              placeholder="Ex: CHU Mustapha, El-Shifa, Ibn Sina, 000016..."
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Type de Client</label>
            <select 
              onchange="CustomersModule.handleTypeFilter(this.value)"
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
            >
              <option value="all">Tous les Clients</option>
              ${(this.state.clientTypes||[]).filter(x=>x.isActive).map(x=>`<option value="${x.id}" ${this.state.filterType===x.id?'selected':''}>${x.name?.[i18n.currentLang]||x.name?.fr}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">${i18n.t('country','Pays')}</label>
            <select onchange="CustomersModule.handleCountryFilter(this.value)" class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"><option value="all">${i18n.t('allCountries','Tous les pays')}</option>${this.countryOptions()}</select>
          </div>
          ${this.state.filterCountry==='all'||this.state.filterCountry==='DZA'?`<div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Wilaya (Algérie)</label>
            <select 
              onchange="CustomersModule.handleWilayaFilter(this.value)"
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
            >
              <option value="all">Toutes les Wilayas</option>
              ${SARI_CONFIG.ALGERIAN_WILAYAS.map(w => `
                <option value="${w.code}" ${this.state.filterWilaya === w.code ? 'selected' : ''}>${w[i18n.currentLang] || w.fr}</option>
              `).join('')}
            </select>
          </div>`:''}
        </div>

        <!-- Customers Table -->
        <div class="sari-tile overflow-x-auto">
          <table class="w-full text-left border-collapse sari-table text-sm">
            <thead>
              <tr class="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                ${TableSort.th('customers','name','Client / Établissement','CustomersModule.render()')}
                ${TableSort.th('customers','type','Type & Catégorie','CustomersModule.render()')}
                ${TableSort.th('customers','wilaya','Wilaya & Localisation','CustomersModule.render()')}
                ${TableSort.th('customers','taxId','NIF / RC (Fiscalité)','CustomersModule.render()')}
                ${TableSort.th('customers','paymentTerms','Conditions de Paiement','CustomersModule.render()')}
                ${TableSort.th('customers','creditLimit','Plafond Crédit (DA)','CustomersModule.render()')}
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="7" class="p-8 text-center text-slate-500">
                    <i data-lucide="user-round" class="text-2xl mb-2 block"></i>
                    Aucun client ne correspond à vos filtres.
                  </td>
                </tr>
              ` : filtered.map(c => {
                let badgeClass = 'bg-slate-100 text-slate-700';
                if (c.type === 'public_hospital') badgeClass = 'bg-sari-blue/10 text-sari-blue font-bold';
                if (c.type === 'private_clinic') badgeClass = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
                if (c.type === 'pharmacy') badgeClass = 'bg-sari-lime/20 text-sari-lime-dark font-bold';
                if (c.type === 'government') badgeClass = 'bg-sari-amber/10 text-sari-amber';

                const typeLabel = c.type === 'public_hospital' ? 'Hôpital Public' : (c.type === 'private_clinic' ? 'Clinique Privée' : (c.type === 'pharmacy' ? 'Pharmacie' : 'DSP / État'));

                return `
                  <tr class="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td class="p-3">
                      <div class="font-bold text-slate-900 dark:text-white">${c.name}</div><div class="font-mono-tech text-[10px] text-sari-blue">${c.referenceCode||c.id}</div>
                      <div class="text-xs text-slate-500 mt-0.5">${c.contactInfo || '-'}</div>
                    </td>
                    <td class="p-3">
                      <span class="sari-badge ${badgeClass}">
                        ${typeLabel}
                      </span>
                    </td>
                    <td class="p-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                      ${this.customerCountryCode(c)==='DZA'?(c.wilaya ? i18n.getWilayaName(c.wilaya) : 'Algérie'):SariUtils.escapeHtml(c.country||this.customerCountryCode(c)||'—')}
                    </td>
                    <td class="p-3 font-mono-tech text-xs text-slate-600 dark:text-slate-300">
                      <div>${c.taxId || 'NIF: Non renseigné'}</div>
                    </td>
                    <td class="p-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
                      ${c.paymentTerms || '30 Jours'}
                    </td>
                    <td class="p-3 font-mono-tech font-bold text-sari-blue">
                      ${i18n.formatCurrency(c.creditLimit)}
                    </td>
                    <td class="p-3 text-right">
                      <div class="flex justify-end gap-1">
                        <button onclick="CustomersModule.startSale('${c.id}')" title="Créer Commande / BL" class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sari-lime-dark">
                          <i data-lucide="shopping-cart"></i>
                        </button>
                        <button onclick="CustomersModule.openDetail('${c.id}')" title="Consulter la fiche" class="p-1.5 rounded text-sari-blue"><i data-lucide="eye" class="w-4 h-4"></i></button>
                        <button onclick="CustomersModule.open360('${c.id}')" title="Transactions & statistiques" class="p-1.5 rounded text-sari-lime-dark"><i data-lucide="chart-no-axes-combined" class="w-4 h-4"></i></button>
                        <button onclick="DocumentManager.open('customer','${c.id}','${SariUtils.escapeHtml(c.name)}')" title="Documents GED" class="p-1.5 rounded text-sari-blue"><i data-lucide="paperclip" class="w-4 h-4"></i></button>
                        ${canWrite ? `
                          <button onclick="CustomersModule.openModal('${c.id}')" title="Modifier" class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sari-blue">
                            <i data-lucide="pencil"></i>
                          </button>
                          <button onclick="CustomersModule.deleteCustomer('${c.id}')" title="Supprimer" class="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
                            <i data-lucide="trash-2"></i>
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

      <!-- Modal Container for Add/Edit Customer -->
      <div id="cust-modal-container"></div>
    `;
  },

  customerCountryCode(customer){if(customer.countryCode)return customer.countryCode;if(customer.wilaya||/alg[eé]rie/i.test(customer.country||''))return'DZA';return'';},
  countryOptions(){const used=new Set(this.state.customers.map(customer=>this.customerCountryCode(customer)).filter(Boolean));return (this.state.countries||[]).filter(country=>country.isActive&&(used.has(country.iso3)||country.iso3==='DZA')).sort((a,b)=>(a.name?.[i18n.currentLang]||a.name?.fr||'').localeCompare(b.name?.[i18n.currentLang]||b.name?.fr||'')).map(country=>`<option value="${country.iso3}" ${this.state.filterCountry===country.iso3?'selected':''}>${SariUtils.escapeHtml(country.name?.[i18n.currentLang]||country.name?.fr||country.iso3)}</option>`).join('');},
  getFilteredCustomers() {
    return this.state.customers.filter(c => {
      if (this.state.filterType !== 'all' && c.type !== this.state.filterType) return false;
      const countryCode=this.customerCountryCode(c);
      if(this.state.filterCountry!=='all'&&countryCode!==this.state.filterCountry)return false;
      if ((this.state.filterCountry==='all'||this.state.filterCountry==='DZA')&&this.state.filterWilaya !== 'all' && c.wilaya !== this.state.filterWilaya) {
        return false;
      }
      if (!SariUtils.matchesAdvancedSearch(c,this.state.searchQuery,['referenceCode','name','taxId','contactInfo','richDetails'])) return false;
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

  handleCountryFilter(val){this.state.filterCountry=val;if(val!=='all'&&val!=='DZA')this.state.filterWilaya='all';this.render();},
  handleWilayaFilter(val) {
    this.state.filterWilaya = val;
    this.render();
  },

  async openModal(customerId = null) {
    this.state.editingId = customerId;
    const cust = customerId ? await window.sariDB.getById('customers', customerId) : {
      name: '',
      type: 'public_hospital',
      wilaya: '16',
      contactInfo: '',
      taxId: 'NIF: 000000000000000 / RC: ',
      paymentTerms: 'Virement Trésor Public - 60 Jours',
      creditLimit: 10000000,
      notes: ''
    };

    const modalEl = document.getElementById('cust-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-5xl max-h-[94vh] overflow-y-auto bg-white dark:bg-slate-900 p-6 shadow-2xl relative">
          <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-lg text-slate-900 dark:text-white">
              ${customerId ? 'Modifier le Client / Hôpital' : 'Nouveau Client ou Institution Algérie'}
            </h3>
            <button onclick="CustomersModule.closeModal()" class="text-slate-400 hover:text-slate-600">
              <i data-lucide="x"></i>
            </button>
          </div>

          <form onsubmit="CustomersModule.saveCustomer(event)" class="space-y-4 text-sm">
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nom Client / Établissement *</label>
              <input type="text" id="cust-name" required value="${cust.name}" placeholder="Ex: CHU Mustapha Pacha, Pharmacie El-Shifa" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Type de Client *</label>
                ${ManagedAutocomplete.html({id:'cust-type',items:(this.state.clientTypes||[]).filter(x=>x.isActive),selected:cust.type||'',valueFor:x=>x.id,labelFor:x=>x.name?.[i18n.currentLang]||x.name?.fr,className:'w-full px-3 py-2 border rounded bg-white dark:bg-slate-800'})}
              </div>
              <div><label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Pays *</label>${ManagedAutocomplete.html({id:'cust-country',items:this.state.countries.filter(c=>c.isActive),selected:cust.countryCode||'DZA',valueFor:c=>c.iso3,labelFor:c=>c.name?.[i18n.currentLang]||c.name?.fr,className:'w-full px-3 py-2 border rounded bg-white dark:bg-slate-800'})}</div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Wilaya (Algérie) *</label>
                <select id="cust-wilaya" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-bold">
                  ${SARI_CONFIG.ALGERIAN_WILAYAS.map(w => `
                    <option value="${w.code}" ${cust.wilaya === w.code ? 'selected' : ''}>${w.fr}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Fiscalité (NIF / RC / Article Imposition)</label>
                <input type="text" id="cust-tax" value="${cust.taxId || ''}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Plafond Crédit Autorisé (DZD) *</label>
                <input type="number" step="1000" id="cust-credit" required value="${cust.creditLimit}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech font-bold" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Conditions de Paiement & Échéance</label>
              <input type="text" id="cust-payment" value="${cust.paymentTerms || ''}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Coordonnées / Adresse Complète</label>
              <input type="text" id="cust-contact" value="${cust.contactInfo || ''}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
            </div>

            <div><label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">${i18n.t('notes','Notes')}</label><textarea id="cust-notes" class="doc-input min-h-24" placeholder="Notes libres sur le client…">${SariUtils.escapeHtml(cust.notes||'')}</textarea></div>
            <div class="grid md:grid-cols-[180px_1fr] gap-4">${ImageDropzone.html('cust-logo',cust.logo||'','Logo client')}${RichTextEditor.html('cust-rich-details',cust.richDetails||'','Informations détaillées / conditions spéciales')}</div>
            <div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onclick="CustomersModule.closeModal()" class="sari-btn px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white">
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
    const modalEl = document.getElementById('cust-modal-container');
    if (modalEl) modalEl.innerHTML = '';
    this.state.editingId = null;
  },

  async saveCustomer(e) {
    if (!auth.can('customers', this.state.editingId ? 'edit' : 'create')) return window.app.showToast('Action non autorisée', 'error');
    e.preventDefault();
    const id = this.state.editingId || `cust-${Date.now()}`;
    const original = this.state.editingId ? await sariDB.getById('customers', id) : {};
    const typeInput=document.getElementById('cust-type').value.trim();const typeRecord=this.state.clientTypes.find(x=>x.id===typeInput||[x.name?.fr,x.name?.ar,x.name?.en].includes(typeInput));if(!typeRecord)return app.showToast('Sélectionnez un type client configuré.','error');const customerType=typeRecord.id;const subType=typeRecord.code;const countryInput=document.getElementById('cust-country').value.trim();const countryRecord=this.state.countries.find(c=>c.iso3===countryInput||c.iso2===countryInput||[c.name?.fr,c.name?.ar,c.name?.en].includes(countryInput));if(!countryRecord)return app.showToast('Sélectionnez un pays configuré.','error');
    const payload = {
      ...original,
      id,
      referenceCode: original.referenceCode || await ReferenceCodeManager.generate('CLI', { subType }),
      name: document.getElementById('cust-name').value.trim(),
      type: customerType,
      countryCode:countryRecord.iso3,country:countryRecord.name?.fr||countryRecord.iso3,
      wilaya: countryRecord.iso3==='DZA' ? document.getElementById('cust-wilaya').value : '',
      taxId: document.getElementById('cust-tax').value.trim(),
      creditLimit: Number(document.getElementById('cust-credit').value),
      paymentTerms: document.getElementById('cust-payment').value.trim(),
      contactInfo: document.getElementById('cust-contact').value.trim(),
      notes: document.getElementById('cust-notes').value.trim(),
      logo: ImageDropzone.value('cust-logo',original.logo||''),
      richDetails: RichTextEditor.value('cust-rich-details')
    };

    await window.syncController.enqueueMutation('customers', 'save', payload);
    this.closeModal();
    window.app.showToast(i18n.t('savedSuccessfully'), 'success');
    await this.render();
  },

  async startSale(id){sessionStorage.setItem('sari_sales_customer_id',id);if(window.SalesModule?.state)window.SalesModule.state.selectedCustomerId=id;await window.app.navigate('sales');if(window.SalesModule?.state){window.SalesModule.state.selectedCustomerId=id;await window.SalesModule.render();document.querySelector('[data-sales-customer-field]')?.scrollIntoView({behavior:'smooth',block:'center'});}},
  async openDetail(id){return Partner360.open('customer',id);},async open360(id){return Partner360.open('customer',id);},

  async deleteCustomer(id) {
    if (!auth.can('customers','delete')) return window.app.showToast('Action non autorisée', 'error');
    if (!await DialogManager.confirm('Supprimer ce client ?')) return;
    await window.syncController.enqueueMutation('customers', 'delete', { id });
    window.app.showToast(i18n.t('deletedSuccessfully'), 'info');
    await this.render();
  },

  exportCSV() {
    SariUtils.exportToCSV(this.state.customers, 'sari-systeme-clients.csv');
  }
};

if (typeof window !== 'undefined') {
  window.CustomersModule = CustomersModule;
}

export {};
