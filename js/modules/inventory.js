/**
 * SARI Système - Inventory Management Module
 * Medical Equipment & Consumables inventory CRUD, Lot traceability,
 * Expiration alerts, Barcode/QR label generator, and CSV Import/Export.
 */

const InventoryModule = {
  state: {
    products: [],
    warehouses: [],
    filterCategory: 'all',
    filterWarehouse: 'all',
    filterExpiry: 'all',
    searchQuery: '',
    editingId: null
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.state.products = await window.sariDB.getAll('products');
    this.state.warehouses = await window.sariDB.getAll('warehouses');
    this.state.vatRates = (await window.sariDB.getAll('vatRates')).filter(rate => rate.isActive);
    this.state.productCategories = (await sariDB.getAll('productCategories')).filter(row=>row.isActive);
    this.state.countries = (await sariDB.getAll('countries')).filter(row=>row.isActive);

    this.renderView(container);
  },

  renderView(container) {
    const canWrite = window.auth && window.auth.canWrite('inventory');
    const filtered = this.getFilteredProducts();

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header & Action Toolbar -->
        <div class="sari-tile p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white" data-i18n="inventory">
              ${i18n.t('inventory')}
            </h2>
            <p class="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Gestion des dispositifs médicaux, consommables, traçabilité de lots et conformité CE / MSPRH Algérie.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${canWrite ? `
              <button onclick="InventoryModule.openModal()" class="sari-btn px-4 py-2 bg-sari-blue hover:bg-sari-blue/90 text-white shadow-sm text-sm">
                <i class="fas fa-plus"></i>
                <span data-i18n="addProduct">${i18n.t('addProduct')}</span>
              </button>
            ` : ''}
            <button onclick="InventoryModule.openTraceabilityModal()" class="sari-btn px-3 py-2 bg-sari-lime hover:bg-sari-lime/90 text-slate-900 text-sm">
              <i class="fas fa-search-location"></i>
              <span>${i18n.t('traceability')}</span>
            </button>
            <button onclick="InventoryModule.exportCSV()" class="sari-btn px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
              <i class="fas fa-file-export"></i>
              <span>${i18n.t('exportCSV')}</span>
            </button>
            <button onclick="InventoryModule.openImportModal()" class="sari-btn px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
              <i class="fas fa-file-import"></i>
              <span>${i18n.t('importCSV')}</span>
            </button>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="sari-tile p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Search Input -->
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Recherche (SKU, Nom, Lot)</label>
            <div class="relative">
              <input 
                type="text" 
                id="inv-search" 
                value="${this.state.searchQuery}"
                oninput="InventoryModule.state.searchQuery=this.value" onkeydown="SariUtils.searchKeyHandler(event,()=>InventoryModule.render())"
                placeholder="Ex: Moniteur, DIA-MON, CE2025..." 
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
              />
              <i class="fas fa-search absolute right-3 top-2.5 text-slate-400 text-xs"></i>
            </div>
          </div>

          <!-- Category Filter -->
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1" data-i18n="category">${i18n.t('category')}</label>
            <select 
              onchange="InventoryModule.handleCategoryFilter(this.value)"
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
            >
              <option value="all">Toutes les Catégories</option>
              ${(this.state.productCategories||[]).map(c => `<option value="${c.id}" ${this.state.filterCategory===c.id?'selected':''}>${c.name?.[i18n.currentLang]||c.name?.fr}</option>`).join('')}
            </select>
          </div>

          <!-- Warehouse Filter -->
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1" data-i18n="warehouse">${i18n.t('warehouse')}</label>
            <select 
              onchange="InventoryModule.handleWarehouseFilter(this.value)"
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
            >
              <option value="all">Tous les Dépôts</option>
              ${this.state.warehouses.map(w => `
                <option value="${w.id}" ${this.state.filterWarehouse === w.id ? 'selected' : ''}>${w.name}</option>
              `).join('')}
            </select>
          </div>

          <!-- Expiry Alert Filter -->
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Statut de Péremption</label>
            <select 
              onchange="InventoryModule.handleExpiryFilter(this.value)"
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
            >
              <option value="all">Tous les Produits</option>
              <option value="near" ${this.state.filterExpiry === 'near' ? 'selected' : ''}>Péremption Proche (&lt; 30 jours)</option>
              <option value="expired" ${this.state.filterExpiry === 'expired' ? 'selected' : ''}>Périmés</option>
              <option value="valid" ${this.state.filterExpiry === 'valid' ? 'selected' : ''}>Conformes (&gt; 30 jours)</option>
            </select>
          </div>
        </div>

        <!-- Inventory Table -->
        <div class="sari-tile overflow-x-auto">
          <table class="w-full text-left border-collapse sari-table text-sm">
            <thead>
              <tr class="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                <th class="p-3">SKU / Code</th>
                <th class="p-3">Produit & Conformité</th>
                <th class="p-3">Catégorie</th>
                <th class="p-3">Stock & Dépôt</th>
                <th class="p-3">Prix d'Achat (DA)</th>
                <th class="p-3">Prix Vente (DA)</th>
                <th class="p-3">N° Lot & Péremption</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="8" class="p-8 text-center text-slate-500">
                    <i class="fas fa-inbox text-2xl mb-2 block"></i>
                    ${i18n.t('noDataFound')}
                  </td>
                </tr>
              ` : filtered.map(p => {
                const wh = this.state.warehouses.find(w => w.id === p.warehouseId);
                const isLowStock = Number(p.stock) <= Number(p.minimumStock);
                
                // Expiration check
                let expBadge = `<span class="sari-badge bg-sari-lime/20 text-sari-lime-dark">${i18n.formatDate(p.expirationDate)}</span>`;
                if (p.expirationDate) {
                  const expDate = new Date(p.expirationDate);
                  const thirtyDays = new Date();
                  thirtyDays.setDate(thirtyDays.getDate() + 30);
                  if (expDate <= new Date()) {
                    expBadge = `<span class="sari-badge bg-red-500/20 text-red-600 dark:text-red-400 font-bold">PÉRİMÉ: ${p.expirationDate}</span>`;
                  } else if (expDate <= thirtyDays) {
                    expBadge = `<span class="sari-badge bg-sari-amber/20 text-sari-amber font-bold animate-sari-pulse">PROCHE: ${p.expirationDate}</span>`;
                  }
                }

                return `
                  <tr class="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td class="p-3 font-mono-tech font-bold text-sari-blue">
                      ${p.referenceCode || p.sku}
                      <div class="text-[10px] text-slate-400 font-normal">${p.sku} • ${p.barcode || ''}</div>
                    </td>
                    <td class="p-3">
                      <div class="font-bold text-slate-900 dark:text-white">${p.name}</div>
                      <div class="text-xs text-slate-500 dark:text-slate-400">${p.manufacturer} • <span class="text-sari-blue">${p.certificationRef || 'CE'}</span></div>
                    </td>
                    <td class="p-3 text-xs">
                      <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        ${i18n.getCategoryName(p.category)}
                      </span>
                    </td>
                    <td class="p-3">
                      <div class="font-mono-tech font-bold ${isLowStock ? 'text-red-500' : 'text-slate-900 dark:text-white'}">
                        ${p.stock} ${i18n.getUnitName(p.unit || 'piece')}
                      </div>
                      <div class="text-[10px] text-slate-500">${wh ? wh.name : 'Dépôt Alger'}</div>
                    </td>
                    <td class="p-3 font-mono-tech font-medium text-slate-700 dark:text-slate-300">
                      ${i18n.formatCurrency(p.purchasePrice)}
                    </td>
                    <td class="p-3 font-mono-tech font-bold text-sari-blue">
                      ${i18n.formatCurrency(p.sellingPrice)}
                    </td>
                    <td class="p-3">
                      <div class="font-mono-tech text-xs text-slate-800 dark:text-slate-200 font-semibold">${p.lotNumber || 'N/A'}</div>
                      <div class="mt-1">${expBadge}</div>
                    </td>
                    <td class="p-3 text-right">
                      <div class="flex justify-end gap-1">
                        <button onclick="InventoryModule.openDetail('${p.id}')" title="Consulter" class="p-1.5 rounded text-sari-blue"><i data-lucide="eye" class="w-4 h-4"></i></button>
                        <button onclick="InventoryModule.openBarcodeModal('${p.id}')" title="Imprimer Barcode/QR" class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                          <i class="fas fa-barcode"></i>
                        </button>
                        <button onclick="DocumentManager.open('product','${p.id}','${SariUtils.escapeHtml(p.name)}')" title="Documents GED" class="p-1.5 rounded text-sari-blue"><i data-lucide="paperclip" class="w-4 h-4"></i></button>
                        ${canWrite ? `
                          <button onclick="InventoryModule.openModal('${p.id}')" title="Modifier" class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sari-blue">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button onclick="InventoryModule.duplicateProduct('${p.id}')" title="Dupliquer" class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sari-lime-dark">
                            <i class="fas fa-copy"></i>
                          </button>
                          <button onclick="InventoryModule.deleteProduct('${p.id}')" title="Supprimer" class="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
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

      <!-- Modal Container for Add/Edit Product -->
      <div id="inv-modal-container"></div>
      <!-- Modal Container for Barcode/QR Print -->
      <div id="inv-barcode-modal"></div>
      <!-- Modal Container for Traceability -->
      <div id="inv-trace-modal"></div>
    `;
  },

  getFilteredProducts() {
    return this.state.products.filter(p => {
      // Category filter
      if (this.state.filterCategory !== 'all' && p.category !== this.state.filterCategory) {
        return false;
      }
      // Warehouse filter
      if (this.state.filterWarehouse !== 'all' && p.warehouseId !== this.state.filterWarehouse) {
        return false;
      }
      // Expiry filter
      if (this.state.filterExpiry !== 'all' && p.expirationDate) {
        const expDate = new Date(p.expirationDate);
        const now = new Date();
        const thirtyDays = new Date();
        thirtyDays.setDate(now.getDate() + 30);

        if (this.state.filterExpiry === 'expired' && expDate > now) return false;
        if (this.state.filterExpiry === 'near' && (expDate <= now || expDate > thirtyDays)) return false;
        if (this.state.filterExpiry === 'valid' && expDate <= thirtyDays) return false;
      }
      // Search query
      if (!SariUtils.matchesAdvancedSearch(p,this.state.searchQuery,['referenceCode','sku','barcode','name','lotNumber','manufacturer','extendedDescription'])) return false;
      return true;
    });
  },

  handleSearch(val) {
    this.state.searchQuery = val;
    this.render();
  },

  handleCategoryFilter(val) {
    this.state.filterCategory = val;
    this.render();
  },

  handleWarehouseFilter(val) {
    this.state.filterWarehouse = val;
    this.render();
  },

  handleExpiryFilter(val) {
    this.state.filterExpiry = val;
    this.render();
  },

  async openDetail(id){const p=await sariDB.getById('products',id),lots=(await sariDB.getAll('productLots')).filter(l=>l.productId===id),root=document.getElementById('sari-modal-root');root.innerHTML=`<div class="fixed inset-0 z-50 sari-modal-backdrop flex items-center justify-center p-3"><div class="sari-tile w-full max-w-5xl max-h-[94vh] overflow-y-auto p-6"><header class="flex justify-between border-b pb-3"><div><span class="sari-badge">${i18n.getCategoryName(p.category)}</span><h3 class="text-xl font-extrabold mt-2">${SariUtils.escapeHtml(p.name)}</h3><p class="font-mono-tech text-sari-blue">${p.referenceCode||p.sku}</p></div><button onclick="app.closeModalRoot()"><i data-lucide="x"></i></button></header><div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4"><div class="p-3 border rounded-xl"><small>Stock</small><b class="block text-xl">${p.stock}</b></div><div class="p-3 border rounded-xl"><small>Prix vente</small><b class="block">${i18n.formatCurrency(p.sellingPrice)}</b></div><div class="p-3 border rounded-xl"><small>TVA</small><b class="block">${this.state.vatRates.find(v=>v.id===p.vatRateId)?.percentage||19}%</b></div><div class="p-3 border rounded-xl"><small>Lots</small><b class="block">${lots.length}</b></div></div><div class="grid md:grid-cols-2 gap-4"><dl class="text-sm space-y-2"><div><dt class="text-slate-400">SKU / Code-barres</dt><dd>${p.sku} • ${p.barcode||'—'}</dd></div><div><dt class="text-slate-400">Fabricant / pays</dt><dd>${p.manufacturer||'—'} • ${p.countryOfOrigin||'—'}</dd></div><div><dt class="text-slate-400">Certification</dt><dd>${p.certificationRef||'—'}</dd></div><div><dt class="text-slate-400">Stockage</dt><dd>${p.storageConditions||'—'}</dd></div></dl><div class="rich-content text-sm">${RichTextEditor.sanitize(p.extendedDescription||p.notes||'')}</div></div><footer class="flex justify-end gap-2 mt-5"><button onclick="DocumentManager.open('product','${p.id}','${SariUtils.escapeHtml(p.name)}')" class="sari-btn px-4 bg-slate-800 text-white">GED</button>${auth.can('inventory','edit')?`<button onclick="app.closeModalRoot();InventoryModule.openModal('${p.id}')" class="sari-btn px-4 bg-sari-blue text-white">Modifier</button>`:''}</footer></div></div>`;if(typeof lucide!=='undefined')lucide.createIcons();},

  /**
   * Open modal to Add or Edit a medical product
   */
  async openModal(productId = null) {
    this.state.editingId = productId;
    const prod = productId ? await window.sariDB.getById('products', productId) : {
      sku: `MED-${Math.floor(100 + Math.random() * 900)}`,
      barcode: `3614271000${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      category: 'diagnostic',
      manufacturer: 'Shenzhen MediCare Tech Ltd',
      countryOfOrigin: 'Chine',
      unit: 'piece',
      purchasePrice: 10000,
      sellingPrice: 15000,
      vatRateId: 'vat-19',
      discountPercent: 0,
      additionalFees: 0,
      extendedDescription: '',
      stock: 20,
      minimumStock: 5,
      lotNumber: `LOT-${new Date().getFullYear()}-01`,
      manufacturingDate: new Date().toISOString().split('T')[0],
      expirationDate: '2029-12-31',
      certificationRef: 'CE 0123',
      storageConditions: 'Température ambiante 10°C - 30°C',
      warehouseId: 'wh-alger',
      notes: ''
    };

    const modalEl = document.getElementById('inv-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-6xl max-h-[94vh] overflow-y-auto bg-white dark:bg-slate-900 p-6 shadow-2xl relative">
          <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">
              ${productId ? 'Modifier le Produit Médical' : 'Nouveau Produit Médical & Consommable'}
            </h3>
            <button onclick="InventoryModule.closeModal()" class="text-slate-400 hover:text-slate-600">
              <i class="fas fa-times text-lg"></i>
            </button>
          </div>

          <form onsubmit="InventoryModule.saveProduct(event)" class="space-y-4 text-sm">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SKU / Référence *</label>
                <input type="text" id="form-sku" required value="${prod.sku}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Code-barres / QR</label>
                <input type="text" id="form-barcode" value="${prod.barcode || ''}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Catégorie *</label>
                <div class="flex gap-1"><input id="form-category" list="product-category-options" value="${prod.category}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" required autocomplete="off"><button type="button" onclick="InventoryModule.addCategoryInline()" class="sari-btn px-3 bg-sari-lime text-slate-900" title="Ajouter une catégorie">+</button></div><datalist id="product-category-options">${(this.state.productCategories||[]).map(c=>`<option value="${c.id}">${c.name?.[i18n.currentLang]||c.name?.fr} • PRO${c.code}</option>`).join('')}</datalist>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Désignation Produit *</label>
              <input type="text" id="form-name" required value="${prod.name}" placeholder="Ex: Moniteur Patient Multiparamétrique CE/ISO" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Fabricant / Marque</label>
                <input type="text" id="form-manufacturer" value="${prod.manufacturer || ''}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Pays d'Origine</label>
                <input id="form-country" list="product-country-options" value="${prod.countryCode||prod.countryOfOrigin||''}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" required autocomplete="off"><datalist id="product-country-options">${this.state.countries.map(c=>`<option value="${c.iso3}">${c.name?.[i18n.currentLang]||c.name?.fr}</option>`).join('')}</datalist>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Unité de Mesure</label>
                <select id="form-unit" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800">
                  ${SARI_CONFIG.UNITS.map(u => `
                    <option value="${u.id}" ${prod.unit === u.id ? 'selected' : ''}>${i18n.getUnitName(u.id)}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Prix Achat (DA) *</label>
                <input type="number" step="0.01" id="form-purchase" required value="${prod.purchasePrice}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 font-mono-tech" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Prix Vente (DA) *</label>
                <input type="number" step="0.01" id="form-selling" required value="${prod.sellingPrice}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 font-mono-tech" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Stock Actuel *</label>
                <input type="number" id="form-stock" required value="${prod.stock}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 font-mono-tech" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Seuil Min Alerte *</label>
                <input type="number" id="form-minstock" required value="${prod.minimumStock}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 font-mono-tech" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-sari-blue/5 border border-sari-blue/20">
              <div><label class="doc-label">Taux TVA applicable</label><select id="form-vat" class="doc-input">${(this.state.vatRates||[]).map(rate=>`<option value="${rate.id}" ${rate.id===(prod.vatRateId||'vat-19')?'selected':''}>${SariUtils.escapeHtml(rate.name?.[i18n.currentLang]||rate.label)} (${rate.percentage}%)</option>`).join('')}</select></div>
              <div><label class="doc-label">Remise (% ou montant fixe)</label><input id="form-discount" type="text" value="${prod.discountExpression || (prod.discountPercent ? prod.discountPercent+'%' : '0')}" placeholder="10% ou 1500" class="doc-input"><p class="text-[10px] text-slate-400">Ajoutez % pour un pourcentage.</p></div>
              <div><label class="doc-label">Autres frais applicables (DZD)</label><input id="form-fees" type="number" min="0" step="0.01" value="${prod.additionalFees||0}" class="doc-input"></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">N° Lot / Batch (Traçabilité)</label>
                <input type="text" id="form-lot" value="${prod.lotNumber || ''}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Date Fabrication</label>
                <input type="date" id="form-mfgdate" value="${prod.manufacturingDate || ''}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Date Péremption</label>
                <input type="date" id="form-expdate" value="${prod.expirationDate || ''}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Référence Certification CE / MSPRH DZ</label>
                <input type="text" id="form-cert" value="${prod.certificationRef || ''}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Dépôt / Entrepôt de Stockage *</label>
                <select id="form-warehouse" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800">
                  ${this.state.warehouses.map(w => `
                    <option value="${w.id}" ${prod.warehouseId === w.id ? 'selected' : ''}>${w.name}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Conditions de Stockage / Chaîne de Froid</label>
              <input type="text" id="form-storage" value="${prod.storageConditions || ''}" placeholder="Ex: Conserver au sec &lt; 25°C" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800" />
            </div>

            ${RichTextEditor.html('form-rich-description', prod.extendedDescription || '', 'Description détaillée / Informations complémentaires')}

            <div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onclick="InventoryModule.closeModal()" class="sari-btn px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white">
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

  async addCategoryInline(){const v=await DialogManager.form('Nouvelle catégorie produit',[{name:'id',label:'Identifiant technique',required:true},{name:'code',label:'Sous-type PRO (01–99)',required:true},{name:'fr',label:'Nom français',required:true},{name:'ar',label:'Nom arabe',required:true},{name:'en',label:'Nom anglais',required:true}]);if(!v)return;const row={id:v.id.trim(),code:String(v.code).padStart(2,'0').slice(-2),name:{fr:v.fr,ar:v.ar,en:v.en},isActive:true};await sariDB.save('productCategories',row);this.state.productCategories.push(row);document.getElementById('form-category').value=row.id;const list=document.getElementById('product-category-options');list.insertAdjacentHTML('beforeend',`<option value="${row.id}">${SariUtils.escapeHtml(row.name[i18n.currentLang]||row.name.fr)} • PRO${row.code}</option>`);app.showToast('Catégorie ajoutée.','success');},

  closeModal() {
    const modalEl = document.getElementById('inv-modal-container');
    if (modalEl) modalEl.innerHTML = '';
    this.state.editingId = null;
  },

  async saveProduct(e) {
    if (!auth.can('inventory', this.state.editingId ? 'edit' : 'create')) return window.app.showToast('Action non autorisée', 'error');
    e.preventDefault();
    const id = this.state.editingId || `prod-${Date.now()}`;
    const original = this.state.editingId ? await sariDB.getById('products', id) : {};
    const categoryInput = document.getElementById('form-category').value.trim();
    const categoryRecord = this.state.productCategories.find(c=>c.id===categoryInput||[c.name?.fr,c.name?.ar,c.name?.en].includes(categoryInput));
    if(!categoryRecord)return app.showToast('Sélectionnez une catégorie configurée valide.','error');
    const category = categoryRecord.id;
    const subType = categoryRecord.code || '01';
    const countryInput=document.getElementById('form-country').value.trim();const countryRecord=this.state.countries.find(c=>c.iso3===countryInput||c.iso2===countryInput||[c.name?.fr,c.name?.ar,c.name?.en].includes(countryInput));if(!countryRecord)return app.showToast('Sélectionnez un pays configuré.','error');
    const referenceCode = original.referenceCode || await ReferenceCodeManager.generate('PRO', { subType });
    const payload = {
      ...original,
      id,
      referenceCode,
      sku: document.getElementById('form-sku').value.trim(),
      barcode: document.getElementById('form-barcode').value.trim(),
      category,
      name: document.getElementById('form-name').value.trim(),
      manufacturer: document.getElementById('form-manufacturer').value.trim(),
      countryCode: countryRecord.iso3,
      countryOfOrigin: countryRecord.name?.fr||countryRecord.iso3,
      unit: document.getElementById('form-unit').value,
      purchasePrice: Number(document.getElementById('form-purchase').value),
      sellingPrice: Number(document.getElementById('form-selling').value),
      vatRateId: document.getElementById('form-vat').value,
      discountExpression: document.getElementById('form-discount').value.trim() || '0',
      discountPercent: SariUtils.parseDiscount(document.getElementById('form-discount').value, Number(document.getElementById('form-selling').value)).percentage,
      additionalFees: Number(document.getElementById('form-fees').value) || 0,
      extendedDescription: RichTextEditor.value('form-rich-description'),
      stock: Number(document.getElementById('form-stock').value),
      minimumStock: Number(document.getElementById('form-minstock').value),
      lotNumber: document.getElementById('form-lot').value.trim(),
      manufacturingDate: document.getElementById('form-mfgdate').value,
      expirationDate: document.getElementById('form-expdate').value,
      certificationRef: document.getElementById('form-cert').value.trim(),
      warehouseId: document.getElementById('form-warehouse').value,
      storageConditions: document.getElementById('form-storage').value.trim()
    };

    // Use SyncController to enqueue mutation (works offline & online!)
    await window.syncController.enqueueMutation('products', 'save', payload);
    this.closeModal();
    window.app.showToast(i18n.t('savedSuccessfully'), 'success');
    await this.render();
  },

  async deleteProduct(id) {
    if (!auth.can('inventory','delete')) return window.app.showToast('Action non autorisée', 'error');
    if (!await DialogManager.confirm('Êtes-vous sûr de vouloir supprimer ce produit médical ?')) return;
    await window.syncController.enqueueMutation('products', 'delete', { id });
    window.app.showToast(i18n.t('deletedSuccessfully'), 'info');
    await this.render();
  },

  async duplicateProduct(id) {
    const orig = await window.sariDB.getById('products', id);
    if (!orig) return;
    const clone = {
      ...orig,
      id: `prod-${Date.now()}`,
      sku: `${orig.sku}-COPY`,
      name: `${orig.name} (Copie)`,
      stock: 0
    };
    await window.syncController.enqueueMutation('products', 'save', clone);
    window.app.showToast('Produit dupliqué avec succès', 'success');
    await this.render();
  },

  /**
   * Barcode & QR code printable modal
   */
  async openBarcodeModal(productId) {
    const p = await window.sariDB.getById('products', productId);
    if (!p) return;

    const modalEl = document.getElementById('inv-barcode-modal');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div id="print-label-area" class="sari-tile w-full max-w-md bg-white dark:bg-slate-900 p-6 shadow-2xl text-center">
          <div class="flex justify-between items-center border-b pb-3 mb-4 no-print">
            <h4 class="font-bold text-slate-900 dark:text-white">Étiquette Code-barres & QR</h4>
            <button onclick="InventoryModule.closeBarcodeModal()" class="text-slate-400 hover:text-slate-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Printable medical label -->
          <div class="border-2 border-slate-900 p-4 rounded bg-white text-slate-900 text-left">
            <div class="flex justify-between items-center border-b border-slate-300 pb-2 mb-2">
              <span class="font-bold text-xs uppercase tracking-wider text-sari-blue">SARI SYSTÈME ALGÉRIE</span>
              <span class="text-[10px] font-mono-tech font-bold bg-slate-100 px-1 rounded">${p.warehouseId}</span>
            </div>
            <h3 class="font-extrabold text-sm text-slate-900 truncate" title="${p.name}">${p.name}</h3>
            <div class="text-xs text-slate-600 flex justify-between mt-1">
              <span>Lot: <strong class="font-mono-tech">${p.lotNumber || 'N/A'}</strong></span>
              <span>Péremp: <strong class="font-mono-tech text-red-600">${i18n.formatDate(p.expirationDate)}</strong></span>
            </div>
            <div class="text-xs text-slate-600 mt-0.5">
              Certif: <strong>${p.certificationRef || 'CE 0123'}</strong>
            </div>

            <!-- Canvas Barcode & QR Code render area -->
            <div class="mt-4 flex flex-col items-center gap-3">
              <div>
                <canvas id="label-canvas-barcode" class="max-w-full"></canvas>
              </div>
              <div class="flex items-center gap-4 justify-center pt-2 border-t border-slate-200 w-full">
                <canvas id="label-canvas-qr"></canvas>
                <div class="text-left text-xs font-mono-tech">
                  <p><strong>SKU:</strong> ${p.sku}</p>
                  <p><strong>Prix:</strong> ${i18n.formatCurrency(p.sellingPrice)}</p>
                  <p><strong>Origine:</strong> ${p.countryOfOrigin || 'Chine'}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-5 flex justify-end gap-2 no-print">
            <button onclick="InventoryModule.closeBarcodeModal()" class="sari-btn px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white">
              Fermer
            </button>
            <button onclick="window.print()" class="sari-btn px-4 py-2 bg-sari-blue text-white font-bold">
              <i class="fas fa-print"></i> Imprimer l'Étiquette
            </button>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const barcodeCanvas = document.getElementById('label-canvas-barcode');
      const qrCanvas = document.getElementById('label-canvas-qr');
      if (barcodeCanvas) SariUtils.drawBarcode(barcodeCanvas, p.barcode || p.sku);
      if (qrCanvas) SariUtils.drawQRCode(qrCanvas, `${p.sku}|${p.lotNumber}`);
    }, 50);
  },

  closeBarcodeModal() {
    const modalEl = document.getElementById('inv-barcode-modal');
    if (modalEl) modalEl.innerHTML = '';
  },

  /**
   * Traceability lookup by Lot/Batch number modal
   */
  async openTraceabilityModal() {
    const modalEl = document.getElementById('inv-trace-modal');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
          <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-lg text-slate-900 dark:text-white">
              Traçabilité Médicale par N° Lot / Batch
            </h3>
            <button onclick="InventoryModule.closeTraceModal()" class="text-slate-400 hover:text-slate-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="mb-4">
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Rechercher ou sélectionner un N° de Lot :</label>
            <select id="trace-lot-selector" onchange="InventoryModule.renderTraceDetails(this.value)" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm">
              <option value="">-- Sélectionnez un Lot --</option>
              ${this.state.products.map(p => `
                <option value="${p.lotNumber}">${p.lotNumber} (${p.sku} - ${p.name})</option>
              `).join('')}
            </select>
          </div>

          <div id="trace-details-container" class="p-4 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-sm min-h-[160px] flex items-center justify-center text-slate-500">
            Sélectionnez un numéro de lot pour afficher sa fiche de traçabilité et conformité.
          </div>

          <div class="mt-4 flex justify-end">
            <button onclick="InventoryModule.closeTraceModal()" class="sari-btn px-4 py-2 bg-sari-blue text-white">
              Fermer
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async renderTraceDetails(lotNum) {
    const container = document.getElementById('trace-details-container');
    if (!container || !lotNum) {
      if (container) container.innerHTML = 'Sélectionnez un numéro de lot pour afficher sa fiche de traçabilité.';
      return;
    }

    const prod = this.state.products.find(p => p.lotNumber === lotNum);
    if (!prod) return;

    const wh = this.state.warehouses.find(w => w.id === prod.warehouseId);

    container.innerHTML = `
      <div class="space-y-3 w-full">
        <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
          <div>
            <span class="text-xs uppercase text-sari-blue font-bold">Fiche Traçabilité Lot</span>
            <h4 class="font-extrabold text-base text-slate-900 dark:text-white font-mono-tech">${lotNum}</h4>
          </div>
          <span class="sari-badge bg-sari-lime/20 text-sari-lime-dark">${prod.certificationRef || 'CE Conformité'}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p class="text-slate-400">Désignation</p>
            <p class="font-bold text-slate-800 dark:text-slate-200">${prod.name}</p>
          </div>
          <div>
            <p class="text-slate-400">SKU & Barcode</p>
            <p class="font-mono-tech font-bold text-slate-800 dark:text-slate-200">${prod.sku} (${prod.barcode || ''})</p>
          </div>
          <div>
            <p class="text-slate-400">Date de Fabrication</p>
            <p class="font-mono-tech font-bold text-slate-800 dark:text-slate-200">${i18n.formatDate(prod.manufacturingDate)}</p>
          </div>
          <div>
            <p class="text-slate-400">Date de Péremption</p>
            <p class="font-mono-tech font-bold text-red-600">${i18n.formatDate(prod.expirationDate)}</p>
          </div>
          <div>
            <p class="text-slate-400">Lieu de Stockage Actuel</p>
            <p class="font-bold text-slate-800 dark:text-slate-200">${wh ? wh.name : 'Dépôt Central Alger'}</p>
          </div>
          <div>
            <p class="text-slate-400">Conditions Stockage</p>
            <p class="font-bold text-slate-800 dark:text-slate-200">${prod.storageConditions || 'Température ambiante'}</p>
          </div>
        </div>
      </div>
    `;
  },

  closeTraceModal() {
    const modalEl = document.getElementById('inv-trace-modal');
    if (modalEl) modalEl.innerHTML = '';
  },

  exportCSV() {
    SariUtils.exportToCSV(this.state.products, 'sari-systeme-stock-medical.csv');
  },

  openImportModal() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const text = evt.target.result;
          const lines = text.split('\n').filter(l => l.trim());
          let added = 0;
          if (lines.length > 1) {
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',').map(s => s.replace(/"/g, '').trim());
              if (cols.length >= 5) {
                const newProd = {
                  id: `prod-imp-${Date.now()}-${i}`,
                  sku: cols[0] || `SKU-${i}`,
                  name: cols[1] || `Produit importé ${i}`,
                  category: 'consumables',
                  stock: Number(cols[2]) || 10,
                  purchasePrice: Number(cols[3]) || 5000,
                  sellingPrice: Number(cols[4]) || 7500,
                  minimumStock: 5,
                  warehouseId: 'wh-alger'
                };
                await window.sariDB.save('products', newProd);
                added++;
              }
            }
          }
          window.app.showToast(`${added} produits importés avec succès !`, 'success');
          await this.render();
        } catch (err) {
          window.app.showToast('Erreur de lecture du fichier CSV.', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
};

if (typeof window !== 'undefined') {
  window.InventoryModule = InventoryModule;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InventoryModule;
}
