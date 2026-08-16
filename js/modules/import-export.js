/**
 * SARI Système - Import / Export Management Module
 * Shipment tracking (Order -> In Transit -> Customs -> Received),
 * Multi-currency Landed Cost calculator, Incoterms, and Customs documentation checklist.
 */

const ImportExportModule = {
  state: {
    shipments: [],
    suppliers: [],
    filterStatus: 'all',
    searchQuery: '',
    editingId: null
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.state.shipments = await window.sariDB.getAll('shipments');
    this.state.suppliers = await window.sariDB.getAll('suppliers');
    this.state.countries = (await sariDB.getAll('countries')).filter(c=>c.isActive);
    [this.state.customers,this.state.tenders,this.state.logisticsStatuses,this.state.incoterms]=await Promise.all(['customers','tenders','logisticsStatuses','incoterms'].map(store=>sariDB.getAll(store)));

    this.renderView(container);
  },

  renderView(container) {
    const canWrite = window.auth && window.auth.canWrite('importExport');
    TableSort.ensure('shipments','order');
    const filtered = TableSort.apply('shipments',this.getFilteredShipments(),'order');

    // Summary KPIs
    let activeCount = 0;
    let totalLandedDZD = 0;
    let customsPendingCount = 0;

    this.state.shipments.forEach(sh => {
      if (sh.status !== 'received') activeCount++;
      if (sh.status === 'customsClearance') customsPendingCount++;
      totalLandedDZD += Number(sh.totalLandedCostDZD) || 0;
    });

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header & Action Toolbar -->
        <div class="sari-tile p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white" data-i18n="importExport">
              ${i18n.t('importExport')}
            </h2>
            <p class="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              ${i18n.t('importDescription')}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${canWrite ? `
              <button onclick="ImportExportModule.openModal()" class="sari-btn px-4 py-2 bg-sari-blue hover:bg-sari-blue/90 text-white shadow-sm text-sm">
                <i data-lucide="plus"></i>
                <span data-i18n="addShipment">${i18n.t('addShipment')}</span>
              </button>
            ` : ''}
            <button onclick="ImportExportModule.openLandedCostModal()" class="sari-btn px-4 py-2 bg-sari-lime hover:bg-sari-lime/90 text-slate-900 text-sm font-bold">
              <i data-lucide="calculator"></i>
              <span>${i18n.t('landedCostCalc')}</span>
            </button>
            <button onclick="ImportExportModule.exportCSV()" class="sari-btn px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
              <i data-lucide="file-up"></i>
              <span>${i18n.t('exportCSV')}</span>
            </button>
          </div>
        </div>

        <!-- KPI Mini Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="sari-tile p-4 flex items-center justify-between border-l-4 border-l-sari-blue">
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase">Expéditions en Cours</p>
              <h4 class="text-2xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${activeCount}</h4>
            </div>
            <div class="text-xs font-bold bg-sari-blue/10 text-sari-blue px-2 py-1 rounded">
              Mer & Air
            </div>
          </div>
          <div class="sari-tile p-4 flex items-center justify-between border-l-4 border-l-sari-amber">
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase">En Dédouanement (Port/Aéroport)</p>
              <h4 class="text-2xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${customsPendingCount}</h4>
            </div>
            <div class="text-xs font-bold bg-sari-amber/10 text-sari-amber px-2 py-1 rounded animate-sari-pulse">
              Documents D10 Requis
            </div>
          </div>
          <div class="sari-tile p-4 flex items-center justify-between border-l-4 border-l-sari-lime">
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase">Valeur Cumulée Coût Revient</p>
              <h4 class="text-2xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${i18n.formatCurrency(totalLandedDZD)}</h4>
            </div>
            <div class="text-xs font-bold bg-sari-lime/20 text-sari-lime-dark px-2 py-1 rounded">
              Achat + Douane
            </div>
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="sari-tile p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Recherche Expédition</label>
            <input 
              type="text" 
              value="${this.state.searchQuery}"
              oninput="ImportExportModule.state.searchQuery=this.value" onkeydown="SariUtils.searchKeyHandler(event,()=>ImportExportModule.render())"
              placeholder="Ex: SARI-IMP26DZA-00001, MediCare, CIF, D10…"
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Filtrer par Statut Logistique</label>
            <select 
              onchange="ImportExportModule.handleStatusFilter(this.value)"
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
            >
              <option value="all">Tous les Statuts</option>
              <option value="orderPlaced" ${this.state.filterStatus === 'orderPlaced' ? 'selected' : ''}>Commande Passée (Order Placed)</option>
              <option value="inTransit" ${this.state.filterStatus === 'inTransit' ? 'selected' : ''}>En Transit / Expédié (In Transit)</option>
              <option value="customsClearance" ${this.state.filterStatus === 'customsClearance' ? 'selected' : ''}>Dédouanement en Cours (Customs)</option>
              <option value="received" ${this.state.filterStatus === 'received' ? 'selected' : ''}>Réceptionné au Dépôt (Received)</option>
            </select>
          </div>
        </div>

        <!-- Shipments Table -->
        <div class="sari-tile overflow-x-auto">
          <table class="w-full text-left border-collapse sari-table text-sm">
            <thead>
              <tr class="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                ${TableSort.th('shipments','order','Ordre','ImportExportModule.render()')}
                ${TableSort.th('shipments','referenceCode','N° Expédition / Réf','ImportExportModule.render()')}
                ${TableSort.th('shipments','supplierName','Fournisseur & Incoterm','ImportExportModule.render()')}
                ${TableSort.th('shipments','status','Statut Logistique','ImportExportModule.render()')}
                ${TableSort.th('shipments','foreignAmount','Montant Devise','ImportExportModule.render()')}
                ${TableSort.th('shipments','purchaseCostDZD',"Coût d'Achat (DA)",'ImportExportModule.render()')}
                <th class="p-3">Douane & Fret (DA)</th>
                ${TableSort.th('shipments','totalLandedCostDZD','Coût de Revient Total (DA)','ImportExportModule.render()')}
                <th class="p-3">Documents & Échéance</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="9" class="p-8 text-center text-slate-500">
                    <i data-lucide="ship" class="text-2xl mb-2 block"></i>
                    Aucune expédition ne correspond à vos filtres.
                  </td>
                </tr>
              ` : filtered.map(s => {
                let statusBadge = '';
                if (s.status === 'orderPlaced') statusBadge = `<span class="sari-badge bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white">${i18n.t('orderPlaced')}</span>`;
                else if (s.status === 'inTransit') statusBadge = `<span class="sari-badge bg-sari-blue/10 text-sari-blue border-sari-blue">${i18n.t('inTransit')}</span>`;
                else if (s.status === 'customsClearance') statusBadge = `<span class="sari-badge bg-sari-amber/10 text-sari-amber border-sari-amber animate-sari-pulse">${i18n.t('customsClearance')}</span>`;
                else if (s.status === 'received') statusBadge = `<span class="sari-badge bg-sari-lime/20 text-sari-lime-dark">${i18n.t('received')}</span>`;

                const docsCount = Array.isArray(s.documents) ? s.documents.length : 0;
                const customsTotal = (Number(s.freightCost) || 0) + (Number(s.customsCost) || 0) + (Number(s.insuranceCost) || 0);

                return `
                  <tr class="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td class="p-3 font-mono-tech font-bold text-sari-blue">${s.order||'—'}</td>
                    <td class="p-3 font-mono-tech font-bold text-sari-blue">
                      ${s.referenceCode || s.id}
                      <div class="text-[10px] text-slate-400 font-normal uppercase">${s.id} • ${s.type || 'import'}</div>
                    </td>
                    <td class="p-3">
                      <div class="font-bold text-slate-900 dark:text-white">${s.supplierName}</div>
                      <div class="text-xs text-slate-500">Incoterm: <strong class="text-sari-blue">${s.incoterm || 'CIF'}</strong></div>
                    </td>
                    <td class="p-3">
                      ${statusBadge}
                    </td>
                    <td class="p-3 font-mono-tech font-bold text-slate-800 dark:text-slate-200">
                      ${Number(s.foreignAmount || 0).toLocaleString()} ${s.currency}
                      <div class="text-[10px] text-slate-400">Taux: ${s.exchangeRate} DA</div>
                    </td>
                    <td class="p-3 font-mono-tech text-slate-700 dark:text-slate-300">
                      ${i18n.formatCurrency(s.purchaseCostDZD)}
                    </td>
                    <td class="p-3 font-mono-tech text-sari-amber font-medium">
                      ${i18n.formatCurrency(customsTotal)}
                    </td>
                    <td class="p-3 font-mono-tech font-bold text-sari-blue">
                      ${i18n.formatCurrency(s.totalLandedCostDZD)}
                    </td>
                    <td class="p-3">
                      <button onclick="DocumentManager.open('shipment','${s.id}','${SariUtils.escapeHtml(s.id)}')" class="text-xs font-bold text-sari-blue underline flex items-center gap-1">
                        <i data-lucide="folder-open" class="w-4 h-4"></i> GED documents &rarr;
                      </button>
                      <div class="text-[10px] text-slate-500 mt-0.5">Arrivée: ${i18n.formatDate(s.expectedArrival)}</div>
                    </td>
                    <td class="p-3 text-right">
                      <div class="flex justify-end gap-1">
                        <button onclick="ImportExportModule.openDetail('${s.id}')" title="Consulter" class="p-1.5 text-sari-blue"><i data-lucide="eye" class="w-4 h-4"></i></button>
                        ${canWrite ? `
                          <button onclick="ImportExportModule.openModal('${s.id}')" title="Modifier" class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sari-blue">
                            <i data-lucide="pencil"></i>
                          </button>
                          <button onclick="ImportExportModule.deleteShipment('${s.id}')" title="Supprimer" class="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
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

      <!-- Modal Container for Add/Edit Shipment -->
      <div id="ship-modal-container"></div>
      <!-- Modal Container for Landed Cost Calculator -->
      <div id="ship-landed-modal"></div>
      <!-- Modal Container for Customs Documents Checklist -->
      <div id="ship-docs-modal"></div>
    `;
  },

  getFilteredShipments() {
    return this.state.shipments.filter(s => {
      if (this.state.filterStatus !== 'all' && s.status !== this.state.filterStatus) {
        return false;
      }
      if (!SariUtils.matchesAdvancedSearch(s,this.state.searchQuery,['referenceCode','id','supplierName','incoterm','status','notes'])) return false;
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

  /**
   * Open modal to create or edit an import/export shipment
   */
  async openDetail(id){const s=await sariDB.getById('shipments',id),root=document.getElementById('sari-modal-root'),country=this.state.countries.find(c=>c.iso3===s.partnerCountryCode),tender=(this.state.tenders||[]).find(t=>t.id===s.linkedTenderId);root.innerHTML=`<div class="fixed inset-0 z-50 sari-modal-backdrop flex items-center justify-center p-3"><div class="sari-tile w-full max-w-5xl p-6"><header class="flex justify-between border-b pb-3"><div><span class="sari-badge">${s.type}</span><h3 class="text-xl font-extrabold">${s.referenceCode||s.id}</h3><p class="font-mono-tech text-xs">Ordre ${s.order||'—'} • ID technique ${s.numericId||'—'}</p></div><button onclick="app.closeModalRoot()">×</button></header><div class="grid md:grid-cols-4 gap-3 my-4"><div class="p-3 border rounded"><small>Partenaire</small><b class="block">${SariUtils.escapeHtml(s.partnerName||s.supplierName)}</b></div><div class="p-3 border rounded"><small>Pays</small><b class="block">${country?.name?.[i18n.currentLang]||s.partnerCountryCode}</b></div><div class="p-3 border rounded"><small>Statut</small><b class="block">${s.status}</b></div><div class="p-3 border rounded"><small>Coût rendu</small><b class="block">${i18n.formatCurrency(s.totalLandedCostDZD)}</b></div></div><p class="text-sm">Consultation : <b>${tender?.referenceCode||'—'}</b></p><p class="text-sm mt-3">${SariUtils.escapeHtml(s.notes||'')}</p><footer class="flex justify-end gap-2 mt-5"><button onclick="DocumentManager.open('shipment','${id}','${s.referenceCode||id}')" class="sari-btn px-4 bg-slate-800 text-white">GED</button>${auth.can('importExport','edit')?`<button onclick="app.closeModalRoot();ImportExportModule.openModal('${id}')" class="sari-btn px-4 bg-sari-blue text-white">Modifier</button>`:''}</footer></div></div>`;},

  async openModal(shipmentId = null) {
    this.state.editingId = shipmentId;
    const sh = shipmentId ? await window.sariDB.getById('shipments', shipmentId) : {
      id: `SHIP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      supplierId: this.state.suppliers[0] ? this.state.suppliers[0].id : '',
      supplierName: this.state.suppliers[0] ? this.state.suppliers[0].name : '',
      partnerCountryCode: this.state.suppliers[0]?.countryCode || 'DZA',
      type: 'import',
      status: 'inTransit',
      currency: 'USD',
      foreignAmount: 20000,
      exchangeRate: 134.20,
      purchaseCostDZD: 2684000,
      freightCost: 250000,
      customsCost: 350000,
      insuranceCost: 80000,
      totalLandedCostDZD: 3364000,
      incoterm: 'CIF',
      expectedArrival: new Date().toISOString().split('T')[0],
      actualArrival: '',
      documents: ['Facture Pro-forma', 'Packing List', 'Certificat d\'Origine'],
      notes: ''
    };

    const modalEl = document.getElementById('ship-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-6xl max-h-[94vh] overflow-y-auto bg-white dark:bg-slate-900 p-6 shadow-2xl relative">
          <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-lg text-slate-900 dark:text-white">
              ${shipmentId ? 'Modifier l\'Expédition Import / Export' : 'Nouvelle Expédition Maritime / Aérienne'}
            </h3>
            <button onclick="ImportExportModule.closeModal()" class="text-slate-400 hover:text-slate-600">
              <i data-lucide="x"></i>
            </button>
          </div>

          <form onsubmit="ImportExportModule.saveShipment(event)" class="space-y-4 text-sm"><div class="grid md:grid-cols-2 gap-3"><label class="doc-label">ID technique (immuable)<input value="${sh.numericId||i18n.t('assignedToRecord','Attribué à l’enregistrement')}" readonly class="doc-input bg-slate-100"></label><label class="doc-label">Ordre / séquence métier<input id="sh-order" type="number" min="1" value="${sh.order||this.state.shipments.length+1}" class="doc-input"></label></div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">N° Expédition / Dossier *</label>
                <input type="text" id="sh-id" required value="${sh.id}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech font-bold" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Fournisseur / Expéditeur *</label>
                <input id="sh-partner" list="shipment-partners" value="${sh.partnerId||sh.supplierId||''}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" required autocomplete="off"><datalist id="shipment-partners">${this.state.suppliers.map(x=>`<option value="${x.id}">Fournisseur • ${x.name}</option>`).join('')}${this.state.customers.map(x=>`<option value="${x.id}">Client • ${x.name}</option>`).join('')}</datalist>
              </div>
              <div><label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Pays partenaire *</label>${ManagedAutocomplete.html({id:'sh-country',items:this.state.countries,selected:sh.partnerCountryCode||'DZA',valueFor:c=>c.iso3,labelFor:c=>(c.name?.[i18n.currentLang]||c.name?.fr)+' ('+c.iso3+')',className:'w-full px-3 py-2 border rounded bg-white dark:bg-slate-800'})}</div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Statut Logistique *</label>
                <select id="sh-status" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800">${this.state.logisticsStatuses.filter(x=>x.isActive).map(x=>`<option value="${x.id}" ${x.id===sh.status?'selected':''}>${x.name?.[i18n.currentLang]||x.name?.fr}</option>`).join('')}</select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><label class="doc-label">Type transaction<select id="sh-type" class="doc-input"><option value="import" ${sh.type!=='export'?'selected':''}>Import</option><option value="export" ${sh.type==='export'?'selected':''}>Export</option></select></label><label class="doc-label">Consultation / appel d’offres<select id="sh-tender" class="doc-input"><option value="">Aucune</option>${this.state.tenders.map(t=>`<option value="${t.id}" ${t.id===sh.linkedTenderId?'selected':''}>${t.referenceCode||t.id} • ${t.title}</option>`).join('')}</select></label></div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Devise *</label>
                <select id="sh-curr" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800">
                  <option value="USD" ${sh.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                  <option value="EUR" ${sh.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                  <option value="CNY" ${sh.currency === 'CNY' ? 'selected' : ''}>CNY (¥)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Montant Devise *</label>
                <input type="number" step="0.01" id="sh-foreign" required value="${sh.foreignAmount}" oninput="ImportExportModule.recalculateForm()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Taux Change (DA) *</label>
                <input type="number" step="0.01" id="sh-rate" required value="${sh.exchangeRate}" oninput="ImportExportModule.recalculateForm()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Incoterm *</label>
                <select id="sh-incoterm" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800">${this.state.incoterms.filter(x=>x.isActive).map(x=>`<option value="${x.id}" ${x.id===sh.incoterm?'selected':''}>${x.name?.[i18n.currentLang]||x.code}</option>`).join('')}</select>
              </div>
            </div>

            <!-- Landed Cost Breakdown inputs -->
            <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
              <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-3">Décomposition Coût de Revient (Dinar Algérien DA)</h4>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label class="block text-xs text-slate-500 mb-1">Fret Maritime/Aérien (DA)</label>
                  <input type="number" id="sh-freight" value="${sh.freightCost}" oninput="ImportExportModule.recalculateForm()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                </div>
                <div>
                  <label class="block text-xs text-slate-500 mb-1">Assurance (DA)</label>
                  <input type="number" id="sh-ins" value="${sh.insuranceCost}" oninput="ImportExportModule.recalculateForm()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                </div>
                <div>
                  <label class="block text-xs text-slate-500 mb-1">Droits de Douane D10 (DA)</label>
                  <input type="number" id="sh-customs" value="${sh.customsCost}" oninput="ImportExportModule.recalculateForm()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-sari-blue mb-1">Coût Revient TOTAL (DA)</label>
                  <input type="number" id="sh-landed" readonly value="${sh.totalLandedCostDZD}" class="w-full px-3 py-2 border rounded bg-slate-200 dark:bg-slate-700 font-mono-tech font-extrabold text-sari-blue" />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Date Arrivée Prévue Port/Dépôt *</label>
                <input type="date" id="sh-arrival" required value="${sh.expectedArrival}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Notes / Port de Déchargement</label>
                <input type="text" id="sh-notes" value="${sh.notes || ''}" placeholder="Ex: Port d'Alger, Dédouanement par Transit Benali" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onclick="ImportExportModule.closeModal()" class="sari-btn px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white">
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

  recalculateForm() {
    const foreign = Number(document.getElementById('sh-foreign').value) || 0;
    const rate = Number(document.getElementById('sh-rate').value) || 1;
    const freight = Number(document.getElementById('sh-freight').value) || 0;
    const ins = Number(document.getElementById('sh-ins').value) || 0;
    const customs = Number(document.getElementById('sh-customs').value) || 0;

    const purchaseDZD = foreign * rate;
    const landedDZD = Math.round(purchaseDZD + freight + ins + customs);
    const landedEl = document.getElementById('sh-landed');
    if (landedEl) landedEl.value = landedDZD;
  },

  closeModal() {
    const modalEl = document.getElementById('ship-modal-container');
    if (modalEl) modalEl.innerHTML = '';
    this.state.editingId = null;
  },

  async saveShipment(e) {
    if (!auth.can('importExport', this.state.editingId ? 'edit' : 'create')) return window.app.showToast('Action non autorisée', 'error');
    e.preventDefault();
    const partnerId = document.getElementById('sh-partner').value.trim();
    const supplier = this.state.suppliers.find(item=>item.id===partnerId), customer=this.state.customers.find(item=>item.id===partnerId), partner=supplier||customer;
    if(!partner)return app.showToast('Sélectionnez un fournisseur ou client configuré.','error');
    const transactionType=document.getElementById('sh-type').value;
    const countryInput=document.getElementById('sh-country').value.trim().toUpperCase(),countryRecord=this.state.countries.find(c=>c.iso3===countryInput||c.iso2===countryInput);if(!countryRecord)return app.showToast('Sélectionnez un pays configuré.','error');
    const foreign = Number(document.getElementById('sh-foreign').value) || 0;
    const rate = Number(document.getElementById('sh-rate').value) || 1;
    const freight = Number(document.getElementById('sh-freight').value) || 0;
    const ins = Number(document.getElementById('sh-ins').value) || 0;
    const customs = Number(document.getElementById('sh-customs').value) || 0;

    const purchaseDZD = Math.round(foreign * rate);
    const landedDZD = Math.round(purchaseDZD + freight + ins + customs);
    const recordId = document.getElementById('sh-id').value.trim();
    const original = this.state.editingId ? await sariDB.getById('shipments', this.state.editingId) : {};
    const payload = {
      ...original,
      id: recordId,
      referenceCode: original.referenceCode || await ReferenceCodeManager.generate(transactionType==='export'?'EXP':'IMP', { country: countryRecord.iso3 }),
      order: Number(document.getElementById('sh-order').value),
      partnerCountryCode: countryRecord.iso3,
      partnerType: supplier?'supplier':'customer', partnerId:partner.id, partnerName:partner.name,
      supplierId: supplier?.id || '', supplierName: supplier?.name || '', customerId:customer?.id||'', customerName:customer?.name||'',
      linkedTenderId: document.getElementById('sh-tender').value,
      type: transactionType,
      status: document.getElementById('sh-status').value,
      currency: document.getElementById('sh-curr').value,
      foreignAmount: foreign,
      exchangeRate: rate,
      purchaseCostDZD: purchaseDZD,
      freightCost: freight,
      insuranceCost: ins,
      customsCost: customs,
      totalLandedCostDZD: landedDZD,
      incoterm: document.getElementById('sh-incoterm').value,
      expectedArrival: document.getElementById('sh-arrival').value,
      notes: document.getElementById('sh-notes').value.trim(),
      documents: ['Facture Commerciale', 'Packing List', 'Certificat d\'Origine', 'Déclaration en Douane D10']
    };

    await window.syncController.enqueueMutation('shipments', 'save', payload);
    this.closeModal();
    window.app.showToast(i18n.t('savedSuccessfully'), 'success');
    await this.render();
  },

  async deleteShipment(id) {
    if (!auth.can('importExport','delete')) return window.app.showToast('Action non autorisée', 'error');
    if (!await DialogManager.confirm('Supprimer cette expédition ?')) return;
    await window.syncController.enqueueMutation('shipments', 'delete', { id });
    window.app.showToast(i18n.t('deletedSuccessfully'), 'info');
    await this.render();
  },

  exportCSV() {
    SariUtils.exportToCSV(this.state.shipments, 'sari-systeme-shipments-import.csv');
  },

  /**
   * Dedicated Landed Cost Calculator Modal
   */
  openLandedCostModal() {
    const modalEl = document.getElementById('ship-landed-modal');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl relative">
          <div class="flex justify-between items-center border-b pb-3 mb-4">
            <div>
              <span class="text-xs font-bold text-sari-blue uppercase">Calculateur DZD SARI</span>
              <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">
                Calculateur de Coût de Revient Unitaire (Landed Cost)
              </h3>
            </div>
            <button onclick="ImportExportModule.closeLandedCostModal()" class="text-slate-400 hover:text-slate-600">
              <i data-lucide="x"></i>
            </button>
          </div>

          <div class="space-y-4 text-sm">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Montant Achat en Devise (€ / $)</label>
                <input type="number" id="calc-foreign" value="10000" oninput="ImportExportModule.updateLandedCalculator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech font-bold" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Taux Change Devise/DA</label>
                <input type="number" id="calc-rate" value="145.50" oninput="ImportExportModule.updateLandedCalculator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nombre d'Unités / Pcs</label>
                <input type="number" id="calc-units" value="50" oninput="ImportExportModule.updateLandedCalculator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs text-slate-500 mb-1">Frais Fret (DA)</label>
                <input type="number" id="calc-freight" value="150000" oninput="ImportExportModule.updateLandedCalculator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
              </div>
              <div>
                <label class="block text-xs text-slate-500 mb-1">Assurance Transport (DA)</label>
                <input type="number" id="calc-ins" value="45000" oninput="ImportExportModule.updateLandedCalculator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
              </div>
              <div>
                <label class="block text-xs text-slate-500 mb-1">Droits de Douane D10 (DA)</label>
                <input type="number" id="calc-customs" value="280000" oninput="ImportExportModule.updateLandedCalculator()" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
              </div>
            </div>

            <div id="landed-result-box" class="p-5 bg-sari-blue/10 rounded border-2 border-sari-blue"></div>
          </div>

          <div class="mt-4 flex justify-end">
            <button onclick="ImportExportModule.closeLandedCostModal()" class="sari-btn px-4 py-2 bg-sari-blue text-white font-bold">
              Fermer
            </button>
          </div>
        </div>
      </div>
    `;

    this.updateLandedCalculator();
  },

  closeLandedCostModal() {
    const modalEl = document.getElementById('ship-landed-modal');
    if (modalEl) modalEl.innerHTML = '';
  },

  updateLandedCalculator() {
    const foreign = Number(document.getElementById('calc-foreign').value) || 0;
    const rate = Number(document.getElementById('calc-rate').value) || 1;
    const units = Number(document.getElementById('calc-units').value) || 1;
    const freight = Number(document.getElementById('calc-freight').value) || 0;
    const ins = Number(document.getElementById('calc-ins').value) || 0;
    const customs = Number(document.getElementById('calc-customs').value) || 0;

    const res = SariUtils.calculateLandedCost({
      foreignAmount: foreign,
      exchangeRate: rate,
      freightDZD: freight,
      insuranceDZD: ins,
      customsDZD: customs,
      unitsCount: units
    });

    const box = document.getElementById('landed-result-box');
    if (!box) return;

    box.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
        <div class="p-3 bg-white dark:bg-slate-900 rounded shadow-sm">
          <p class="text-xs text-slate-500 font-bold uppercase">Coût de Revient TOTAL (DZD)</p>
          <h3 class="text-2xl font-extrabold font-mono-tech text-sari-blue mt-1">${i18n.formatCurrency(res.totalLandedDZD)}</h3>
          <p class="text-xs text-slate-500 mt-1">Achat: ${i18n.formatCurrency(res.purchaseDZD)} + Fret/Douane: ${i18n.formatCurrency(res.freightDZD + res.insuranceDZD + res.customsDZD)}</p>
        </div>
        <div class="p-3 bg-sari-lime/20 rounded shadow-sm">
          <p class="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase">Coût Revient par Unité / Pièce</p>
          <h3 class="text-2xl font-extrabold font-mono-tech text-sari-lime-dark mt-1">${i18n.formatCurrency(res.perUnitDZD)}</h3>
          <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">Sur la base de ${units} unités importées</p>
        </div>
      </div>
    `;
  },

  /**
   * Customs documentation checklist modal
   */
  async openDocsModal(shipmentId) {
    const sh = await window.sariDB.getById('shipments', shipmentId);
    if (!sh) return;

    const modalEl = document.getElementById('ship-docs-modal');
    if (!modalEl) return;

    const requiredDocs = [
      { name: 'Facture Commerciale / Pro-forma Originale', req: true },
      { name: 'Packing List (Liste de Colisage Détaillée)', req: true },
      { name: 'Certificat d\'Origine (Visé Chambre de Commerce)', req: true },
      { name: 'Bill of Lading (B/L) / Lettre de Transport Aérien (LTA)', req: true },
      { name: 'Déclaration en Douane D10 (Port d\'Alger/Oran)', req: true },
      { name: 'Certificat de Conformité CE / Agrément MSPRH Algérie', req: true }
    ];

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-xl bg-white dark:bg-slate-900 p-6 shadow-2xl relative">
          <div class="flex justify-between items-center border-b pb-3 mb-4">
            <div>
              <span class="text-xs font-bold text-sari-blue uppercase">Dossier Douane Algérie</span>
              <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">
                Checklist Documents : ${sh.id}
              </h3>
            </div>
            <button onclick="ImportExportModule.closeDocsModal()" class="text-slate-400 hover:text-slate-600">
              <i data-lucide="x"></i>
            </button>
          </div>

          <div class="space-y-3 text-sm">
            <p class="text-xs text-slate-500">
              Vérifiez la présence des documents douaniers et sanitaires obligatoires pour le dédouanement.
            </p>
            <div class="space-y-2">
              ${requiredDocs.map((doc, idx) => {
                const checked = idx < 4 ? 'checked' : '';
                return `
                  <label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded border cursor-pointer hover:border-sari-blue">
                    <input type="checkbox" ${checked} class="w-4 h-4 text-sari-blue rounded" />
                    <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">${doc.name}</span>
                    <span class="ml-auto text-[10px] font-bold px-2 py-0.5 rounded ${checked ? 'bg-sari-lime/20 text-sari-lime-dark' : 'bg-sari-amber/20 text-sari-amber'}">
                      ${checked ? 'Présent' : 'À Vérifier'}
                    </span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button onclick="ImportExportModule.closeDocsModal()" class="sari-btn px-4 py-2 bg-sari-blue text-white font-bold">
              Valider le Dossier
            </button>
          </div>
        </div>
      </div>
    `;
  },

  closeDocsModal() {
    const modalEl = document.getElementById('ship-docs-modal');
    if (modalEl) modalEl.innerHTML = '';
  }
};

if (typeof window !== 'undefined') {
  window.ImportExportModule = ImportExportModule;
}

export {};
