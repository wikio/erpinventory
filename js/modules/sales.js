/**
 * SARI Système - Sales & Distribution Module (POS + B2B Orders)
 * Quick sales & institutional B2B order builder, Barcode scanner simulator,
 * 19% TVA calculation, and printable Facture / Bon de Livraison (BL) generator.
 */

const SalesModule = {
  state: {
    orders: [],
    products: [],
    customers: [],
    warehouses: [],
    cart: [],
    selectedCustomerId: '',
    selectedWarehouseId: 'wh-alger',
    paymentMethod: 'bank_transfer',
    discountPercent: 0,
    searchQuery: '',
    barcodeInput: '',
    currency: 'DZD',
    documentType: 'invoice',
    documentNote: '',
    shippingFee: 0,
    qrContent: 'https://sarisysteme.dz/verify',
    hideBLAmounts: true,
    selectedTemplateId: 'doc-tpl-classic',
    documentTemplates: [],
    vatRates: [],
    globalVatRateId: '',
    editingOrderId: '',
    linkedTenderId: '',
    linkedPurchaseDocumentIds: [],
    bankAccountId: '',
    referralId: '',
    couponCode: '',
    purchaseDocuments: [], tenders: [], bankAccounts: [], referrals: [], coupons: [], paymentMethods: []
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.state.orders = await window.sariDB.getAll('orders');
    this.state.products = await window.sariDB.getAll('products');
    this.state.customers = await window.sariDB.getAll('customers');
    this.state.warehouses = await window.sariDB.getAll('warehouses');
    this.state.documentTemplates = await window.sariDB.getAll('documentTemplates');
    this.state.vatRates = (await window.sariDB.getAll('vatRates')).filter(rate => rate.isActive);
    [this.state.purchaseDocuments,this.state.tenders,this.state.bankAccounts,this.state.referrals,this.state.coupons,this.state.paymentMethods] = await Promise.all(['purchaseDocuments','tenders','bankAccounts','referrals','coupons','paymentMethods'].map(s=>sariDB.getAll(s)));

    if (!this.state.selectedCustomerId && this.state.customers[0]) {
      this.state.selectedCustomerId = this.state.customers[0].id;
    }

    this.renderView(container);
  },

  renderView(container) {
    const canWrite = window.auth && window.auth.canWrite('sales');

    // Calculate totals for cart
    let subtotal = 0;
    this.state.cart.forEach(item => {
      const gross = Number(item.qty) * Number(item.unitPrice);
      item.total = Math.round(gross * (1 - Number(item.discountPercent || 0) / 100));
      subtotal += Number(item.total) || 0;
    });

    const discountAmount = Math.round(subtotal * (this.state.discountPercent / 100));
    const taxableAmount = subtotal - discountAmount + Number(this.state.shippingFee || 0);
    const taxAmount = Math.round(this.state.cart.reduce((sum, item) => sum + Number(item.total) * (1 - this.state.discountPercent / 100) * this.getVatRate(item), 0) + Number(this.state.shippingFee || 0) * this.getVatRate({ vatRate: .19 }));
    const grandTotal = taxableAmount + taxAmount;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="sari-tile p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white" data-i18n="sales">
              ${i18n.t('sales')}
            </h2>
            <p class="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Création de commandes B2B (Hôpitaux/Pharmacies), vente comptoir POS et impression de Factures / BL.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="SalesModule.openScannerModal()" class="sari-btn px-4 py-2 bg-sari-lime hover:bg-sari-lime/90 text-slate-900 text-sm font-bold">
              <i class="fas fa-barcode"></i>
              <span>Scanner Code-barres</span>
            </button>
            <button onclick="SalesModule.exportCSV()" class="sari-btn px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
              <i class="fas fa-file-export"></i>
              <span>${i18n.t('exportCSV')}</span>
            </button>
          </div>
        </div>

        ${canWrite ? `
        <!-- Main POS & B2B Order Builder Split Workspace -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left 2 Cols: Product Catalog & Scanner Search -->
          <div class="lg:col-span-2 sari-tile p-5 flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <i class="fas fa-boxes text-sari-blue"></i>
                  Catalogue Produits SARI & Ajout au Panier
                </h3>
                <div class="flex items-center gap-2 text-xs">
                  <span class="text-slate-500 font-semibold">Dépôt d'expédition:</span>
                  <select 
                    onchange="SalesModule.handleWarehouseSelect(this.value)"
                    class="px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded font-bold text-sari-blue"
                  >
                    ${this.state.warehouses.map(w => `
                      <option value="${w.id}" ${this.state.selectedWarehouseId === w.id ? 'selected' : ''}>${w.name}</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <!-- Quick Search Input / Scanner -->
              <div class="relative mb-4">
                <input 
                  type="text" 
                  id="pos-product-search" 
                  value="${this.state.searchQuery}"
                  oninput="SalesModule.state.searchQuery=this.value"
                  onkeydown="SariUtils.searchKeyHandler(event,()=>SalesModule.applyProductSearch())"
                  placeholder="Rechercher ou scanner code-barres / SKU (Ex: Moniteur, Seringues, 361427...)" 
                  class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium focus:outline-none focus:border-sari-blue"
                />
                <button onclick="SalesModule.applyProductSearch()" class="absolute right-3.5 top-3 text-sari-blue"><i data-lucide="search" class="w-4 h-4"></i></button>
              </div>

              <button onclick="CatalogPicker.open(p=>SalesModule.addToCart(p.id))" class="sari-btn px-3 py-2 mb-3 bg-slate-800 text-white text-xs"><i data-lucide="panel-right-open" class="w-4 h-4"></i> Parcourir le catalogue</button>
              <!-- Product Tile Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                ${this.getFilteredCatalog().map(p => {
                  const outOfStock = Number(p.stock) <= 0;
                  return `
                    <div 
                      onclick="${outOfStock ? '' : `SalesModule.addToCart('${p.id}')`}" 
                      class="p-3 bg-slate-50 dark:bg-slate-800/80 rounded border-2 ${outOfStock ? 'border-red-300 opacity-60 cursor-not-allowed' : 'border-slate-200 dark:border-slate-700 hover:border-sari-blue cursor-pointer transition'} flex justify-between items-center gap-2"
                    >
                      <div>
                        <div class="flex items-center gap-1.5">
                          <span class="text-[11px] font-mono-tech font-bold text-sari-blue">${p.sku}</span>
                          <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 font-bold">${i18n.getCategoryName(p.category)}</span>
                        </div>
                        <h4 class="font-bold text-sm text-slate-900 dark:text-white mt-1 line-clamp-1">${p.name}</h4>
                        <p class="text-xs text-slate-500 mt-0.5">Lot: <strong class="font-mono-tech">${p.lotNumber || 'N/A'}</strong></p>
                      </div>
                      <div class="text-right flex-shrink-0">
                        <div class="text-sm font-mono-tech font-extrabold text-sari-blue">${i18n.formatCurrency(p.sellingPrice)}</div>
                        <div class="text-[11px] font-bold mt-1 ${outOfStock ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}">
                          Stock: ${p.stock}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Right Col: Cart & Checkout Summary -->
          <div class="sari-tile p-5 flex flex-col justify-between border-2 border-sari-blue">
            <div>
              <div class="border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
                <span class="text-xs uppercase text-sari-blue font-extrabold tracking-wider">PANIER COMMANDE B2B / POS</span>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mt-0.5">Nouvelle Vente ou Facturation</h3>
              </div>

              <!-- Client Selector -->
              <div class="mb-4">
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Client / Institution Algérie *</label>
                <select 
                  onchange="SalesModule.handleCustomerSelect(this.value)"
                  class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm font-bold focus:outline-none focus:border-sari-blue"
                >
                  ${this.state.customers.map(c => `
                    <option value="${c.id}" ${this.state.selectedCustomerId === c.id ? 'selected' : ''}>${c.name} (${c.wilaya ? i18n.getWilayaName(c.wilaya) : 'Alger'})</option>
                  `).join('')}
                </select>
              </div>

              <!-- Cart Line Items -->
              <div class="space-y-2 max-h-[220px] overflow-y-auto mb-4 pr-1">
                ${this.state.cart.length === 0 ? `
                  <div class="p-6 text-center text-slate-400 border-2 border-dashed rounded text-xs">
                    <i class="fas fa-shopping-cart text-xl mb-1 block"></i>
                    Aucun produit dans le panier.<br/>Cliquez ou scannez pour ajouter.
                  </div>
                ` : this.state.cart.map(item => `
                  <div class="p-2.5 bg-slate-50 dark:bg-slate-800 rounded border flex justify-between items-center text-xs">
                    <div class="flex-1 pr-2">
                      <p class="font-bold text-slate-800 dark:text-slate-200">${item.name}</p>
                      <p class="text-[11px] text-slate-500 font-mono-tech">${i18n.formatCurrency(item.unitPrice)} unitaire</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="1" 
                        value="${item.qty}" 
                        onchange="SalesModule.updateCartQty('${item.productId}', this.value)"
                        class="w-14 px-1.5 py-1 border rounded text-center font-mono-tech font-bold"
                      />
                      <label class="text-[9px] text-slate-400">Rem.%<input type="number" min="0" max="100" value="${item.discountPercent||0}" onchange="SalesModule.updateLineDiscount('${item.productId}',this.value)" class="block w-12 px-1 py-1 border rounded text-center"></label>
                      <label class="text-[9px] text-slate-400">TVA<select onchange="SalesModule.updateLineVat('${item.productId}',this.value)" class="block w-16 px-1 py-1 border rounded">${this.state.vatRates.map(rate=>`<option value="${rate.percentage/100}" ${Number(item.vatRate??.19)===rate.percentage/100?'selected':''}>${rate.percentage}%</option>`).join('')}</select></label>
                      <span class="font-mono-tech font-extrabold text-sari-blue w-20 text-right">${i18n.formatCurrency(item.total)}</span>
                      <button onclick="SalesModule.removeFromCart('${item.productId}')" class="text-red-500 hover:text-red-700 p-1">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>

              <!-- Commercial document configuration -->
              <div class="grid grid-cols-2 gap-2 mb-3 text-xs p-3 rounded-lg border bg-sari-blue/5">
                <div><label class="block font-bold mb-1">Type document</label><select onchange="SalesModule.setDocumentField('documentType',this.value)" class="w-full px-2 py-1.5 border rounded bg-white dark:bg-slate-800"><option value="invoice">Facture</option><option value="quote">Devis</option><option value="purchase_order">Bon de commande</option><option value="delivery_note">Bon de livraison</option></select></div>
                <div><label class="block font-bold mb-1">Devise</label><select onchange="SalesModule.setDocumentField('currency',this.value)" class="w-full px-2 py-1.5 border rounded bg-white dark:bg-slate-800">${['DZD','EUR','USD'].map(c=>`<option ${c===this.state.currency?'selected':''}>${c}</option>`).join('')}</select></div>
                <div><label class="block font-bold mb-1">Frais livraison</label><input type="number" value="${this.state.shippingFee}" onchange="SalesModule.setDocumentField('shippingFee',Number(this.value))" class="w-full px-2 py-1.5 border rounded"></div>
                <div><label class="block font-bold mb-1">TVA globale optionnelle</label><select onchange="SalesModule.setDocumentField('globalVatRateId',this.value)" class="w-full px-2 py-1.5 border rounded bg-white dark:bg-slate-800"><option value="">Taux par produit</option>${this.state.vatRates.map(rate=>`<option value="${rate.id}" ${rate.id===this.state.globalVatRateId?'selected':''}>${rate.label}</option>`).join('')}</select></div>
                <div><label class="block font-bold mb-1">Modèle visuel</label><select onchange="SalesModule.setDocumentField('selectedTemplateId',this.value)" class="w-full px-2 py-1.5 border rounded bg-white dark:bg-slate-800">${this.state.documentTemplates.map(t=>`<option value="${t.id}" ${t.id===this.state.selectedTemplateId?'selected':''}>${t.name}</option>`).join('')}</select></div>
                <div><label class="block font-bold mb-1">Compte bancaire</label><select onchange="SalesModule.setDocumentField('bankAccountId',this.value)" class="w-full px-2 py-1.5 border rounded"><option value="">—</option>${this.state.bankAccounts.map(a=>`<option value="${a.id}" ${a.id===this.state.bankAccountId?'selected':''}>${a.name}</option>`).join('')}</select></div>
                <div><label class="block font-bold mb-1">Consultation liée</label><select onchange="SalesModule.setDocumentField('linkedTenderId',this.value)" class="w-full px-2 py-1.5 border rounded"><option value="">—</option>${this.state.tenders.map(t=>`<option value="${t.id}" ${t.id===this.state.linkedTenderId?'selected':''}>${t.referenceCode||t.id}</option>`).join('')}</select></div>
                <div><label class="block font-bold mb-1">Agent / canal</label><select onchange="SalesModule.setDocumentField('referralId',this.value)" class="w-full px-2 py-1.5 border rounded"><option value="">—</option>${this.state.referrals.map(r=>`<option value="${r.id}" ${r.id===this.state.referralId?'selected':''}>${r.name}</option>`).join('')}</select></div>
                <div><label class="block font-bold mb-1">Coupon</label><div class="flex"><input id="sales-coupon" value="${this.state.couponCode}" class="w-full px-2 py-1.5 border rounded" placeholder="SARI10"><button onclick="SalesModule.applyCoupon()" type="button" class="px-2 text-sari-blue">Appliquer</button></div></div>
                <div class="col-span-2"><label class="block font-bold mb-1">Documents achat liés</label><select multiple onchange="SalesModule.state.linkedPurchaseDocumentIds=[...this.selectedOptions].map(o=>o.value)" class="w-full px-2 py-1.5 border rounded h-16">${this.state.purchaseDocuments.map(d=>`<option value="${d.id}" ${this.state.linkedPurchaseDocumentIds.includes(d.id)?'selected':''}>${d.referenceCode} • ${d.supplierName}</option>`).join('')}</select></div>
                <div class="col-span-2"><label class="block font-bold mb-1">Note document</label><input value="${SariUtils.escapeHtml(this.state.documentNote)}" onchange="SalesModule.setDocumentField('documentNote',this.value)" class="w-full px-2 py-1.5 border rounded" placeholder="Conditions, instructions…"></div>
                <div class="col-span-2"><label class="block font-bold mb-1">Contenu QR</label><input value="${SariUtils.escapeHtml(this.state.qrContent)}" onchange="SalesModule.setDocumentField('qrContent',this.value)" class="w-full px-2 py-1.5 border rounded" placeholder="URL de vérification ou paiement"></div>
                <label class="col-span-2 flex items-center gap-2"><input type="checkbox" ${this.state.hideBLAmounts?'checked':''} onchange="SalesModule.setDocumentField('hideBLAmounts',this.checked)"> Masquer les montants sur le BL</label>
              </div>

              <!-- Payment Method & Discount -->
              <div class="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div>
                  <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Mode Règlement</label>
                  <select 
                    onchange="SalesModule.handlePaymentSelect(this.value)"
                    class="w-full px-2 py-1.5 border rounded bg-white dark:bg-slate-800 font-semibold"
                  >
                    ${this.state.paymentMethods.filter(m=>m.isActive).map(m=>`<option value="${m.code}" ${this.state.paymentMethod===m.code?'selected':''}>${m.label?.[i18n.currentLang]||m.code}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Remise Spéciale (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="50" 
                    value="${this.state.discountPercent}"
                    onchange="SalesModule.handleDiscountChange(this.value)"
                    class="w-full px-2 py-1.5 border rounded bg-white dark:bg-slate-800 text-center font-bold"
                  />
                </div>
              </div>

              <!-- Totals Breakdown -->
              <div class="space-y-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 p-3 rounded border">
                <div class="flex justify-between">
                  <span class="text-slate-500">Sous-total HT :</span>
                  <span class="font-mono-tech font-bold">${i18n.formatCurrency(subtotal)}</span>
                </div>
                ${this.state.discountPercent > 0 ? `
                  <div class="flex justify-between text-sari-amber font-bold">
                    <span>Remise (${this.state.discountPercent}%) :</span>
                    <span class="font-mono-tech">-${i18n.formatCurrency(discountAmount)}</span>
                  </div>
                ` : ''}
                ${Number(this.state.shippingFee)>0?`<div class="flex justify-between"><span class="text-slate-500">Livraison / transport :</span><span class="font-mono-tech font-bold">${i18n.formatCurrency(this.state.shippingFee)}</span></div>`:''}
                <div class="flex justify-between">
                  <span class="text-slate-500">TVA calculée par taux :</span>
                  <span class="font-mono-tech font-bold text-sari-blue">${i18n.formatCurrency(taxAmount)}</span>
                </div>
                <div class="flex justify-between pt-2 border-t font-extrabold text-sm text-slate-900 dark:text-white">
                  <span>NET À PAYER TTC :</span>
                  <span class="font-mono-tech text-sari-lime-dark">${i18n.formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            <div class="mt-4 flex gap-2">
              <button 
                onclick="SalesModule.clearCart()" 
                class="sari-btn px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-xs"
              >
                Vider
              </button>
              <button 
                onclick="SalesModule.confirmOrder()" 
                ${this.state.cart.length === 0 ? 'disabled' : ''}
                class="sari-btn flex-1 py-2.5 bg-sari-blue hover:bg-sari-blue/90 text-white font-extrabold text-sm shadow-sm disabled:opacity-50"
              >
                <i class="fas fa-check-circle"></i> Confirmer & Facturer
              </button>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Recent Sales & Orders Table -->
        <div class="sari-tile p-5">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-lg text-slate-900 dark:text-white">
              Historique des Commandes & Factures SARI
            </h3>
            <span class="sari-badge bg-sari-blue/10 text-sari-blue">${this.state.orders.length} Commandes</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse sari-table text-sm">
              <thead>
                <tr class="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold uppercase text-slate-500">
                  <th class="p-3">N° Commande / BL</th>
                  <th class="p-3">Client & Wilaya</th>
                  <th class="p-3">Dépôt</th>
                  <th class="p-3">Date Émission</th>
                  <th class="p-3">Montant TTC (DA)</th>
                  <th class="p-3">Mode Règlement</th>
                  <th class="p-3">Statut Commande</th>
                  <th class="p-3 text-right">Actions / Impression</th>
                </tr>
              </thead>
              <tbody>
                ${this.state.orders.length === 0 ? `
                  <tr>
                    <td colspan="8" class="p-8 text-center text-slate-500">
                      Aucune commande ou facture enregistrée.
                    </td>
                  </tr>
                ` : this.state.orders.map(o => {
                  let badge = 'bg-slate-200 text-slate-800';
                  if (o.status === 'quoted') badge = 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white';
                  if (o.status === 'confirmed') badge = 'bg-sari-blue/10 text-sari-blue border-sari-blue';
                  if (o.status === 'delivered') badge = 'bg-sari-amber/10 text-sari-amber border-sari-amber';
                  if (o.status === 'invoiced') badge = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
                  if (o.status === 'paid') badge = 'bg-sari-lime/20 text-sari-lime-dark font-bold';

                  const wh = this.state.warehouses.find(w => w.id === o.warehouseId);

                  return `
                    <tr class="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td class="p-3 font-mono-tech font-bold text-sari-blue">
                        ${o.referenceCode || o.id}
                        <div class="text-[9px] text-slate-400">${o.id}</div>
                      </td>
                      <td class="p-3">
                        <div class="font-bold text-slate-900 dark:text-white">${o.customerName}</div>
                        <div class="text-xs text-slate-500">Algérie</div>
                      </td>
                      <td class="p-3 text-xs">
                        ${wh ? wh.name : 'Dépôt Central Alger'}
                      </td>
                      <td class="p-3 font-mono-tech text-slate-600 dark:text-slate-300">
                        ${i18n.formatDate(o.createdAt)}
                      </td>
                      <td class="p-3 font-mono-tech font-extrabold text-slate-900 dark:text-white">
                        ${i18n.formatCurrency(o.total, o.currency || 'DZD')}
                      </td>
                      <td class="p-3 text-xs">
                        <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          ${o.paymentMethod || 'bank_transfer'}
                        </span>
                      </td>
                      <td class="p-3">
                        <select onchange="SalesModule.changeOrderStatus('${o.id}',this.value)" class="doc-input w-32" ${o.status==='closed'&&!auth.can('sales','finalize')?'disabled':''}>${['draft','quoted','confirmed','delivered','invoiced','paid','closed'].map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${i18n.t(s,s)}</option>`).join('')}</select>
                      </td>
                      <td class="p-3 text-right">
                        <div class="flex justify-end gap-1">
                          <button onclick="SalesModule.openPrintModal('${o.id}', 'facture')" title="Imprimer Facture" class="px-2 py-1 rounded bg-sari-blue/10 hover:bg-sari-blue/20 text-sari-blue text-xs font-bold flex items-center gap-1">
                            <i class="fas fa-file-invoice"></i> Facture
                          </button>
                          <button onclick="SalesModule.openPrintModal('${o.id}', 'purchase_order')" title="Bon de commande" class="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">BC</button>
                          <button onclick="SalesModule.openPrintModal('${o.id}', 'quote')" title="Imprimer Devis" class="px-2 py-1 rounded bg-sari-amber/10 text-sari-amber text-xs font-bold flex items-center gap-1"><i class="fas fa-file-signature"></i> Devis</button>
                          <button onclick="SalesModule.openPrintModal('${o.id}', 'bl')" title="Imprimer Bon de Livraison" class="px-2 py-1 rounded bg-sari-lime/20 hover:bg-sari-lime/30 text-sari-lime-dark text-xs font-bold flex items-center gap-1">
                            <i class="fas fa-truck-loading"></i> BL
                          </button>
                          ${o.status!=='closed'&&canWrite?`<button onclick="SalesModule.editOrder('${o.id}')" class="p-1 text-sari-blue" title="Modifier"><i data-lucide="pencil" class="w-4 h-4"></i></button><button onclick="SalesModule.convertOrder('${o.id}')" class="p-1 text-sari-amber" title="Convertir"><i data-lucide="repeat-2" class="w-4 h-4"></i></button>`:''}
                          <button onclick="DocumentManager.open('order','${o.id}','${o.id}')" title="Documents" class="p-1 rounded text-sari-blue"><i data-lucide="paperclip" class="w-4 h-4"></i></button>
                          ${canWrite ? `
                            <button onclick="SalesModule.deleteOrder('${o.id}')" title="Supprimer" class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
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
      </div>

      <!-- Modal Container for Barcode Scanner Simulator -->
      <div id="sales-scanner-modal"></div>
      <!-- Modal Container for Printable Invoice & BL -->
      <div id="sales-print-modal"></div>
    `;
  },

  getFilteredCatalog() {
    return this.state.products.filter(p => SariUtils.matchesAdvancedSearch(p, this.state.searchQuery, ['referenceCode','sku','barcode','name','extendedDescription','category']));
  },

  applyProductSearch() { this.render(); },
  applyCoupon() { const code=(document.getElementById('sales-coupon')?.value||'').trim().toUpperCase();const coupon=this.state.coupons.find(c=>c.isActive&&c.code.toUpperCase()===code&&(!c.validFrom||new Date(c.validFrom)<=new Date())&&(!c.validTo||new Date(c.validTo)>=new Date())&&(c.usageLimit===0||c.usageCount<c.usageLimit)&&(!(c.clientIds||[]).length||c.clientIds.includes(this.state.selectedCustomerId)));if(!coupon)return app.showToast('Coupon invalide ou expiré.','warning');this.state.couponCode=code;if(coupon.scope==='product'&&coupon.productId){const item=this.state.cart.find(i=>i.productId===coupon.productId);if(!item)return app.showToast('Le produit du coupon n’est pas dans le document.','warning');item.discountPercent=coupon.discountType==='percentage'?Number(coupon.value):Math.min(100,Number(coupon.value)/(item.qty*item.unitPrice)*100);item.total=item.qty*item.unitPrice*(1-item.discountPercent/100);}else if(coupon.discountType==='percentage')this.state.discountPercent=Number(coupon.value);else{const subtotal=this.state.cart.reduce((s,i)=>s+Number(i.total||0),0);this.state.discountPercent=subtotal?Math.min(100,Number(coupon.value)/subtotal*100):0;}app.showToast('Coupon appliqué.','success');this.render();},

  handleProductSearch(val) {
    this.state.searchQuery = val;
    // Check if barcode exact match
    const exact = this.state.products.find(p => p.barcode === val.trim() || p.sku === val.trim());
    if (exact && Number(exact.stock) > 0) {
      this.addToCart(exact.id);
      this.state.searchQuery = '';
    }
    this.render();
  },

  handleWarehouseSelect(val) {
    this.state.selectedWarehouseId = val;
  },

  handleCustomerSelect(val) {
    this.state.selectedCustomerId = val;
  },

  handlePaymentSelect(val) {
    this.state.paymentMethod = val;
  },

  handleDiscountChange(val) {
    this.state.discountPercent = Number(val) || 0;
    this.render();
  },

  setDocumentField(field, value) { this.state[field] = value; this.render(); },
  getVatRate(item) { const selected=this.state.vatRates.find(rate=>rate.id===this.state.globalVatRateId); return selected ? selected.percentage/100 : Number(item.vatRate ?? .19); },
  updateLineDiscount(productId, value) { const item=this.state.cart.find(x=>x.productId===productId); if(item){item.discountPercent=Math.min(100,Math.max(0,Number(value)||0));item.total=Math.round(item.qty*item.unitPrice*(1-item.discountPercent/100));this.render();} },
  updateLineVat(productId, value) { const item=this.state.cart.find(x=>x.productId===productId); if(item){item.vatRate=Number(value);this.render();} },

  addToCart(productId) {
    const p = this.state.products.find(x => x.id === productId);
    if (!p) return;

    const existing = this.state.cart.find(item => item.productId === productId);
    if (existing) {
      existing.qty += 1;
      existing.total = existing.qty * existing.unitPrice;
    } else {
      this.state.cart.push({
        productId: p.id,
        name: p.name,
        unitPrice: (Number(p.sellingPrice) || 0) + Number(p.additionalFees || 0),
        qty: 1,
        discountPercent: Number(p.discountPercent || 0),
        vatRate: Number(this.state.vatRates.find(rate => rate.id === p.vatRateId)?.percentage ?? 19) / 100,
        total: Number(p.sellingPrice) || 0
      });
    }
    this.render();
    window.app.showToast(`+1 ${p.name} ajouté au panier`, 'success');
  },

  updateCartQty(productId, newQty) {
    const item = this.state.cart.find(x => x.productId === productId);
    if (!item) return;
    const q = Math.max(1, Number(newQty) || 1);
    item.qty = q;
    item.total = q * item.unitPrice;
    this.render();
  },

  removeFromCart(productId) {
    this.state.cart = this.state.cart.filter(x => x.productId !== productId);
    this.render();
  },

  clearCart() {
    this.state.cart = [];
    this.state.editingOrderId = '';
    this.state.linkedPurchaseDocumentIds = [];
    this.state.linkedTenderId = '';
    this.render();
  },

  async confirmOrder() {
    if (!auth.can('sales','create')) return window.app.showToast('Action non autorisée', 'error');
    if (this.state.cart.length === 0) return;
    const customer = this.state.customers.find(c => c.id === this.state.selectedCustomerId) || { name: 'Client Algérie' };

    let subtotal = 0;
    this.state.cart.forEach(item => {
      const gross = Number(item.qty) * Number(item.unitPrice);
      item.total = Math.round(gross * (1 - Number(item.discountPercent || 0) / 100));
      subtotal += Number(item.total) || 0;
    });

    const discountAmount = Math.round(subtotal * (this.state.discountPercent / 100));
    const taxableAmount = subtotal - discountAmount + Number(this.state.shippingFee || 0);
    const taxAmount = Math.round(this.state.cart.reduce((sum, item) => sum + Number(item.total) * (1 - this.state.discountPercent / 100) * this.getVatRate(item), 0) + Number(this.state.shippingFee || 0) * this.getVatRate({ vatRate: .19 }));
    const grandTotal = taxableAmount + taxAmount;

    const referenceType = ({ invoice:'FAV', quote:'DVV', purchase_order:'BCA', delivery_note:'LIV' })[this.state.documentType] || 'FAV';
    const existingOrder = this.state.editingOrderId ? await sariDB.getById('orders', this.state.editingOrderId) : null;
    if (existingOrder?.status === 'closed' && !auth.can('sales','finalize')) return app.showToast('Facture clôturée : modification interdite.','warning');
    const referenceCode = existingOrder?.referenceCode || await ReferenceCodeManager.generate(referenceType);
    const conversionRate = Number(SARI_CONFIG.CURRENCIES[this.state.currency]?.rate || 1);
    const toDocumentCurrency = value => Math.round((Number(value) / conversionRate) * 100) / 100;
    const newOrder = {
      ...(existingOrder || {}),
      id: existingOrder?.id || `ORD-${Date.now()}`,
      referenceCode,
      customerId: customer.id,
      customerName: customer.name,
      warehouseId: this.state.selectedWarehouseId,
      items: this.state.cart.map(item => ({ ...item, vatRate: this.getVatRate(item), unitPrice: toDocumentCurrency(item.unitPrice), total: toDocumentCurrency(item.total) })),
      subtotal: toDocumentCurrency(subtotal),
      discountPercent: this.state.discountPercent,
      discountAmount: toDocumentCurrency(discountAmount),
      shippingFee: toDocumentCurrency(this.state.shippingFee),
      taxAmount: toDocumentCurrency(taxAmount),
      total: toDocumentCurrency(grandTotal),
      currency: this.state.currency,
      documentType: this.state.documentType,
      documentNote: this.state.documentNote,
      qrContent: this.state.qrContent,
      hideBLAmounts: this.state.hideBLAmounts,
      documentTemplateId: this.state.selectedTemplateId,
      linkedTenderId: this.state.linkedTenderId,
      linkedPurchaseDocumentIds: [...this.state.linkedPurchaseDocumentIds],
      bankAccountId: this.state.bankAccountId,
      referralId: this.state.referralId,
      couponCode: this.state.couponCode,
      assignedEmployeeId: window.auth.employee?.id || '',
      paymentMethod: this.state.paymentMethod,
      status: existingOrder?.status || 'draft',
      createdAt: existingOrder?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await DocumentSecurity.sign(newOrder);
    await window.syncController.enqueueMutation('orders', 'save', newOrder);
    if(newOrder.couponCode){const coupon=this.state.coupons.find(c=>c.code===newOrder.couponCode);if(coupon){coupon.usageCount=Number(coupon.usageCount||0)+1;await sariDB.save('coupons',coupon);}}
    for(const targetId of [...newOrder.linkedPurchaseDocumentIds,newOrder.linkedTenderId].filter(Boolean)) await sariDB.save('documentLinks',{id:`link-${crypto.randomUUID()}`,sourceType:'salesDocument',sourceId:newOrder.id,targetType:targetId.startsWith('AO-')?'tender':'purchaseDocument',targetId,relation:'related',createdAt:new Date().toISOString()});

    // Decrement stock in IndexedDB
    for (const item of existingOrder ? [] : this.state.cart) {
      const p = this.state.products.find(x => x.id === item.productId);
      if (p) {
        p.stock = Math.max(0, Number(p.stock) - Number(item.qty));
        await window.syncController.enqueueMutation('products', 'save', p);
      }
    }

    const createdId = newOrder.id;
    this.clearCart();
    window.app.showToast(`Commande ${createdId} validée et stock décrémenté !`, 'success');
    await this.render();

    // Automatically open invoice printable modal
    setTimeout(() => {
      this.openPrintModal(createdId, 'facture');
    }, 400);
  },

  async editOrder(id){const o=await sariDB.getById('orders',id);if(!o||o.status==='closed'&&!auth.can('sales','finalize'))return app.showToast('Document clôturé.','warning');this.state.editingOrderId=id;this.state.cart=structuredClone(o.items||[]);this.state.selectedCustomerId=o.customerId;this.state.currency=o.currency||'DZD';this.state.documentType=o.documentType||'invoice';this.state.documentNote=o.documentNote||'';this.state.shippingFee=o.shippingFee||0;this.state.discountPercent=o.discountPercent||0;this.state.linkedTenderId=o.linkedTenderId||'';this.state.linkedPurchaseDocumentIds=o.linkedPurchaseDocumentIds||[];this.state.bankAccountId=o.bankAccountId||'';this.state.referralId=o.referralId||'';this.state.couponCode=o.couponCode||'';await this.render();window.scrollTo({top:0,behavior:'smooth'});},
  async changeOrderStatus(id,status){const o=await sariDB.getById('orders',id);if(o.status==='closed'&&!auth.can('sales','finalize'))return app.showToast('Document clôturé.','warning');o.status=status;o.updatedAt=new Date().toISOString();await sariDB.save('orders',o);for(const link of (await sariDB.getAll('documentLinks')).filter(l=>l.sourceId===id||l.targetId===id)){link.statusFlag=`sales:${status}`;await sariDB.save('documentLinks',link);}this.render();},
  async convertOrder(id){const o=await sariDB.getById('orders',id);const v=await DialogManager.form('Convertir le document',[{name:'target',label:'Document cible',type:'select',options:[{value:'sales_invoice',label:'Facture vente'},{value:'purchase_invoice',label:'Facture achat'}]}]);if(!v)return;if(v.target==='purchase_invoice')return PurchasesModule.createFromSales(o);await this.createFromDocument(o);},
  async createFromDocument(source){this.state.editingOrderId='';this.state.cart=structuredClone(source.items||[]);this.state.selectedCustomerId=source.customerId||this.state.customers[0]?.id;this.state.currency=source.currency||'DZD';this.state.documentType='invoice';this.state.documentNote=`Conversion de ${source.referenceCode||source.id}`;this.state.shippingFee=source.shippingFee||0;this.state.discountPercent=source.discountPercent||0;this.state.linkedTenderId=source.linkedTenderId||'';await app.navigate('sales');await this.render();window.scrollTo({top:0});},

  async deleteOrder(id) {
    if (!auth.can('sales','delete')) return window.app.showToast('Action non autorisée', 'error');
    if (!await DialogManager.confirm('Supprimer cette commande ?')) return;
    await window.syncController.enqueueMutation('orders', 'delete', { id });
    window.app.showToast('Commande supprimée', 'info');
    await this.render();
  },

  exportCSV() {
    SariUtils.exportToCSV(this.state.orders, 'sari-systeme-commandes.csv');
  },

  /**
   * Barcode Scanner Simulator Modal
   */
  openScannerModal() {
    const modalEl = document.getElementById('sales-scanner-modal');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-md bg-white dark:bg-slate-900 p-6 shadow-2xl text-center">
          <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-base text-slate-900 dark:text-white">Simulateur Lecteur Code-barres USB/Bluetooth</h3>
            <button onclick="SalesModule.closeScannerModal()" class="text-slate-400 hover:text-slate-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="p-6 bg-slate-100 dark:bg-slate-800 rounded mb-4 border-2 border-dashed border-sari-blue">
            <i class="fas fa-barcode text-4xl text-sari-blue mb-2 block animate-pulse"></i>
            <p class="text-xs text-slate-600 dark:text-slate-300 font-bold">
              Prêt à lire un code-barres EAN13 ou SKU SARI Système
            </p>
            <p class="text-[11px] text-slate-400 mt-1">Exemple de codes au catalogue :</p>
            <div class="flex flex-wrap gap-1 justify-center mt-2">
              <button onclick="SalesModule.simulateScan('3614271000101')" class="px-2 py-1 bg-white dark:bg-slate-700 rounded text-[11px] font-mono-tech border">3614271000101 (Moniteur)</button>
              <button onclick="SalesModule.simulateScan('3614271000103')" class="px-2 py-1 bg-white dark:bg-slate-700 rounded text-[11px] font-mono-tech border">3614271000103 (Seringues)</button>
              <button onclick="SalesModule.simulateScan('3614271000104')" class="px-2 py-1 bg-white dark:bg-slate-700 rounded text-[11px] font-mono-tech border">3614271000104 (Gants Nitrile)</button>
            </div>
          </div>

          <div class="mt-4 flex justify-end">
            <button onclick="SalesModule.closeScannerModal()" class="sari-btn px-4 py-2 bg-sari-blue text-white font-bold">
              Fermer
            </button>
          </div>
        </div>
      </div>
    `;
  },

  simulateScan(code) {
    this.closeScannerModal();
    this.handleProductSearch(code);
  },

  closeScannerModal() {
    const modalEl = document.getElementById('sales-scanner-modal');
    if (modalEl) modalEl.innerHTML = '';
  },

  /**
   * Official Facture / Bon de Livraison (BL) Printable Modal
   */
  async openPrintModal(orderId, docType = 'facture') {
    const o = await window.sariDB.getById('orders', orderId);
    if (!o) return;
    if (!o.verificationHash && o.referenceCode) { await DocumentSecurity.sign(o); await sariDB.save('orders',o); }
    const companySettings = await window.sariDB.getById('settings', 'app-settings') || {};

    const modalEl = document.getElementById('sales-print-modal');
    if (!modalEl) return;

    const customer = this.state.customers.find(c => c.id === o.customerId) || { name: o.customerName, wilaya: '16', taxId: 'NIF: 00001600000' };
    const docTitles = { facture: 'FACTURE COMMERCIALE', quote: 'DEVIS / OFFRE DE PRIX', purchase_order: 'BON DE COMMANDE', bl: 'BON DE LIVRAISON (BL)' };
    const docPrefixes = { facture: 'FACT', quote: 'DEV', purchase_order: 'BC', bl: 'BL' };
    const docTitle = docTitles[docType] || docTitles.facture;
    const docCode = `${docPrefixes[docType] || 'DOC'}-${o.id}`;
    const currency = o.currency || 'DZD';
    const hideAmounts = docType === 'bl' && (o.hideBLAmounts !== false);
    const template = this.state.documentTemplates.find(t => t.id === o.documentTemplateId) || this.state.documentTemplates[0] || { accent: '#009CC5', layout: 'classic' };
    const amountWords = SariUtils.amountInWords(o.total, currency, i18n.currentLang === 'ar' ? 'ar' : 'fr');
    const vatMap = (o.items || []).reduce((acc, item) => { const rate=this.getVatRate(item); const base=Number(item.total||0)*(1-Number(o.discountPercent||0)/100); const key=String(rate); acc[key] ||= { rate, base: 0, tax: 0 }; acc[key].base += base; acc[key].tax += base*rate; return acc; }, {});
    if (o.shippingFee) { vatMap['0.19'] ||= { rate: .19, base: 0, tax: 0 }; vatMap['0.19'].base += Number(o.shippingFee); vatMap['0.19'].tax += Number(o.shippingFee)*.19; }
    const vatBreakdown = Object.values(vatMap);
    const formatMoney = value => new Intl.NumberFormat(i18n.currentLang === 'ar' ? 'ar-DZ' : 'fr-DZ', { style: 'currency', currency }).format(Number(value || 0));

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div id="print-doc-area" class="sari-tile w-full max-w-3xl bg-white dark:bg-slate-900 p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto text-slate-900">
          <div class="flex justify-between items-center border-b pb-3 mb-6 no-print">
            <span class="text-sm font-bold text-sari-blue">Aperçu Avant Impression • SARI Système Algérie</span>
            <div class="flex gap-2">
              <button onclick="SalesModule.closePrintModal()" class="sari-btn px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-xs">
                Fermer
              </button>
              <button onclick="window.print()" class="sari-btn px-4 py-1.5 bg-sari-blue text-white font-bold text-xs">
                <i class="fas fa-print"></i> Lancer l'Impression
              </button>
            </div>
          </div>

          <!-- Printable SARI Système Template -->
          ${template.elements?.length ? this.renderDesignerOutput(template, o, customer, docCode, formatMoney, amountWords, vatBreakdown, companySettings) : ''}
          <div class="${template.elements?.length ? 'hidden' : ''} bg-white text-slate-900 p-4 border border-slate-300" style="border-top:8px solid ${template.accent}">
            <!-- Header -->
            <div class="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
              <div class="flex items-start gap-3">
                ${companySettings.documentLogo?`<img src="${companySettings.documentLogo}" class="w-16 h-16 object-contain" alt="Logo document">`:''}
                <div><h1 class="text-2xl font-black text-sari-blue tracking-tight">SARI SYSTÈME</h1>
                <p class="text-xs font-bold uppercase mt-0.5">Distribution & Import Équipements Médicaux</p>
                <p class="text-xs text-slate-600 mt-1">${SARI_CONFIG.COMPANY_ADDRESS}</p>
                <p class="text-xs text-slate-600">Tél: ${SARI_CONFIG.COMPANY_PHONE}</p>
                <p class="text-xs text-slate-600 font-mono-tech mt-1">
                  <strong>NIF:</strong> ${SARI_CONFIG.COMPANY_NIF} | <strong>RC:</strong> ${SARI_CONFIG.COMPANY_RC}
                </p>
                </div>
              </div>
              <div class="text-right">
                <span class="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-sm uppercase tracking-wider mb-2">
                  ${docTitle}
                </span>
                <p class="text-base font-mono-tech font-bold text-sari-blue">${docCode}</p>
                <p class="text-xs text-slate-600">Date d'émission: <strong>${i18n.formatDate(o.createdAt)}</strong></p>
                <p class="text-xs text-slate-600">Dépôt: <strong>Alger Central</strong></p>
              </div>
            </div>

            <!-- Client Box -->
            <div class="p-3 bg-slate-50 border border-slate-300 rounded mb-6">
              <span class="text-[10px] font-bold text-slate-500 uppercase">CLIENT / INSTITUTION DESTINATAIRE :</span>
              <h3 class="text-base font-extrabold text-slate-900">${o.customerName}</h3>
              <p class="text-xs text-slate-700 mt-0.5">Wilaya: ${customer.wilaya ? i18n.getWilayaName(customer.wilaya) : 'Alger'}</p>
              <p class="text-xs text-slate-700 font-mono-tech">${customer.taxId || ''}</p>
            </div>

            <!-- Items Table -->
            <table class="w-full text-left border-collapse border border-slate-300 text-xs mb-6">
              <thead class="bg-slate-100 font-bold uppercase text-slate-700 border-b-2 border-slate-300">
                <tr>
                  <th class="p-2.5 border-r border-slate-300">N°</th>
                  <th class="p-2.5 border-r border-slate-300">Désignation Dispositif Médical</th>
                  <th class="p-2.5 border-r border-slate-300 text-center">Qté</th>
                  ${hideAmounts ? '' : `<th class="p-2.5 border-r border-slate-300 text-right">Prix Unitaire HT</th><th class="p-2.5 border-r border-slate-300 text-center">Remise</th><th class="p-2.5 text-right">Total HT (${currency})</th>`}
                </tr>
              </thead>
              <tbody>
                ${o.items.map((it, idx) => `
                  <tr class="border-b border-slate-200">
                    <td class="p-2.5 border-r border-slate-300 font-mono-tech">${idx + 1}</td>
                    <td class="p-2.5 border-r border-slate-300 font-bold">${it.name}</td>
                    <td class="p-2.5 border-r border-slate-300 text-center font-mono-tech font-bold">${it.qty}</td>
                    ${hideAmounts ? '' : `<td class="p-2.5 border-r border-slate-300 text-right font-mono-tech">${formatMoney(it.unitPrice)}</td><td class="p-2.5 border-r border-slate-300 text-center">${it.discountPercent||0}%</td><td class="p-2.5 text-right font-mono-tech font-bold">${formatMoney(it.total)}</td>`}
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Summary, VAT breakdown, QR & signature -->
            <div class="grid ${hideAmounts ? 'grid-cols-1' : 'grid-cols-2'} gap-8 items-start">
              <div><p class="text-xs text-slate-600"><strong>Mode de Règlement :</strong> ${o.paymentMethod || 'Virement Bancaire'}<br/><strong>Compte Bancaire SARI :</strong> BNA Agence 001 - RIB 00100161609876543209</p>${o.documentNote?`<div class="mt-3 p-2 border rounded text-xs"><strong>Note :</strong> ${SariUtils.escapeHtml(o.documentNote)}</div>`:''}<div class="flex items-end gap-4 mt-4"><div><canvas id="commercial-qr" width="88" height="88" class="border"></canvas><p class="text-[8px] text-slate-400 max-w-28 break-all">${SariUtils.escapeHtml(o.verificationUrl||docCode)}</p><canvas id="commercial-barcode" width="180" height="55" class="mt-2 border"></canvas></div><div class="pt-2 border-t border-slate-300 text-center w-48"><p class="text-xs font-bold">Cachet & Signature</p><div class="h-10 text-slate-300 text-xs italic pt-3">(Approuvé & Certifié)</div></div></div></div>
              ${hideAmounts ? '' : `<div class="space-y-3"><div class="border rounded p-3 bg-slate-50 space-y-1.5 text-xs"><div class="flex justify-between"><span>Sous-total HT :</span><b>${formatMoney(o.subtotal)}</b></div>${o.discountAmount>0?`<div class="flex justify-between text-amber-700"><span>Remise globale (${o.discountPercent}%) :</span><b>-${formatMoney(o.discountAmount)}</b></div>`:''}${o.shippingFee?`<div class="flex justify-between"><span>Livraison / transport :</span><b>${formatMoney(o.shippingFee)}</b></div>`:''}<div class="flex justify-between"><span>Total TVA :</span><b>${formatMoney(o.taxAmount)}</b></div><div class="flex justify-between pt-2 border-t-2 font-black text-sm"><span>NET TTC :</span><span style="color:${template.accent}">${formatMoney(o.total)}</span></div></div><table class="w-full text-[10px] border"><thead><tr class="bg-slate-100"><th class="p-1">Taux TVA</th><th>Base taxable</th><th>Taxe</th></tr></thead><tbody>${vatBreakdown.map(v=>`<tr class="text-center border-t"><td class="p-1">${Math.round(v.rate*100)}%</td><td>${formatMoney(v.base)}</td><td>${formatMoney(v.tax)}</td></tr>`).join('')}</tbody></table><p class="text-xs p-2 border-l-4" style="border-color:${template.accent}"><strong>Arrêté à la somme de :</strong><br>${amountWords}</p></div>`}
            </div>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => { SariUtils.drawQRCode(document.getElementById('commercial-qr'), o.verificationUrl || docCode, 88); SariUtils.drawBarcode(document.getElementById('commercial-barcode'), o.referenceCode || docCode, 180, 55); }, 0);
  },

  renderDesignerOutput(template, order, customer, docCode, formatMoney, amountWords, vatBreakdown, companySettings) {
    const values = {
      customerName: SariUtils.escapeHtml(customer.name || order.customerName), documentNumber: docCode,
      documentDate: i18n.formatDate(order.createdAt), totals: `TOTAL TTC : ${formatMoney(order.total)}`,
      amountInWords: SariUtils.escapeHtml(amountWords), documentLogo: companySettings.documentLogo ? `<img src="${companySettings.documentLogo}" style="max-width:100%;max-height:100%">` : '<b>SARI SYSTÈME</b>',
      qrCode: `<div class="font-mono-tech text-center text-2xl">▦<small class="block text-[8px]">${SariUtils.escapeHtml(order.qrContent || docCode)}</small></div>`,
      lineItems: `<table class="w-full text-[10px] border"><tbody>${order.items.map(item=>`<tr><td>${SariUtils.escapeHtml(item.name)}</td><td>${item.qty}</td><td>${formatMoney(item.total)}</td></tr>`).join('')}</tbody></table>`,
      vatBreakdown: `<table class="w-full text-[10px]">${vatBreakdown.map(v=>`<tr><td>TVA ${v.rate*100}%</td><td>${formatMoney(v.tax)}</td></tr>`).join('')}</table>`
    };
    return `<div class="relative bg-white text-slate-900 mx-auto overflow-hidden border" style="width:${template.paperFormat==='Letter'?'816':'794'}px;min-height:${template.paperFormat==='Letter'?'1056':'1123'}px;transform-origin:top left">${template.elements.map(el=>`<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;overflow:hidden;${el.background?`background:${el.background};`:''}">${el.kind==='image'?`<img src="${el.src}" style="width:100%;height:100%;object-fit:contain">`:el.kind==='field'?(values[el.field]||SariUtils.escapeHtml(el.content||'')):RichTextEditor.sanitize(el.content||'')}</div>`).join('')}</div>`;
  },

  closePrintModal() {
    const modalEl = document.getElementById('sales-print-modal');
    if (modalEl) modalEl.innerHTML = '';
  }
};

if (typeof window !== 'undefined') {
  window.SalesModule = SalesModule;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SalesModule;
}
