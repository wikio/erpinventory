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
    documentTemplates: []
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.state.orders = await window.sariDB.getAll('orders');
    this.state.products = await window.sariDB.getAll('products');
    this.state.customers = await window.sariDB.getAll('customers');
    this.state.warehouses = await window.sariDB.getAll('warehouses');
    this.state.documentTemplates = await window.sariDB.getAll('documentTemplates');

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
    const taxAmount = Math.round(this.state.cart.reduce((sum, item) => sum + Number(item.total) * (1 - this.state.discountPercent / 100) * Number(item.vatRate ?? .19), 0) + Number(this.state.shippingFee || 0) * .19);
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
                  oninput="SalesModule.handleProductSearch(this.value)"
                  placeholder="Rechercher ou scanner code-barres / SKU (Ex: Moniteur, Seringues, 361427...)" 
                  class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium focus:outline-none focus:border-sari-blue"
                />
                <i class="fas fa-search absolute right-3.5 top-3.5 text-slate-400"></i>
              </div>

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
                      <label class="text-[9px] text-slate-400">TVA<select onchange="SalesModule.updateLineVat('${item.productId}',this.value)" class="block w-14 px-1 py-1 border rounded"><option value="0.19" ${(item.vatRate??.19)==.19?'selected':''}>19%</option><option value="0.09" ${item.vatRate==.09?'selected':''}>9%</option><option value="0" ${item.vatRate===0?'selected':''}>0%</option></select></label>
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
                <div><label class="block font-bold mb-1">Modèle visuel</label><select onchange="SalesModule.setDocumentField('selectedTemplateId',this.value)" class="w-full px-2 py-1.5 border rounded bg-white dark:bg-slate-800">${this.state.documentTemplates.map(t=>`<option value="${t.id}" ${t.id===this.state.selectedTemplateId?'selected':''}>${t.name}</option>`).join('')}</select></div>
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
                    <option value="bank_transfer" ${this.state.paymentMethod === 'bank_transfer' ? 'selected' : ''}>Virement Bancaire</option>
                    <option value="check" ${this.state.paymentMethod === 'check' ? 'selected' : ''}>Chèque Bancaire</option>
                    <option value="cash" ${this.state.paymentMethod === 'cash' ? 'selected' : ''}>Espèces au Dépôt</option>
                    <option value="credit" ${this.state.paymentMethod === 'credit' ? 'selected' : ''}>Terme (Crédit Trésor)</option>
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
                        ${o.id}
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
                        <span class="sari-badge ${badge}">
                          ${i18n.t(o.status)}
                        </span>
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
    return this.state.products.filter(p => {
      if (this.state.searchQuery) {
        const q = this.state.searchQuery.toLowerCase();
        const matchSku = p.sku && p.sku.toLowerCase().includes(q);
        const matchName = p.name && p.name.toLowerCase().includes(q);
        const matchBarcode = p.barcode && p.barcode.toLowerCase().includes(q);
        if (!matchSku && !matchName && !matchBarcode) return false;
      }
      return true;
    });
  },

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
        unitPrice: Number(p.sellingPrice) || 0,
        qty: 1,
        discountPercent: 0,
        vatRate: 0.19,
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
    const taxAmount = Math.round(this.state.cart.reduce((sum, item) => sum + Number(item.total) * (1 - this.state.discountPercent / 100) * Number(item.vatRate ?? .19), 0) + Number(this.state.shippingFee || 0) * .19);
    const grandTotal = taxableAmount + taxAmount;

    const conversionRate = Number(SARI_CONFIG.CURRENCIES[this.state.currency]?.rate || 1);
    const toDocumentCurrency = value => Math.round((Number(value) / conversionRate) * 100) / 100;
    const newOrder = {
      id: `ORD-2026-${Math.floor(100 + Math.random() * 900)}`,
      customerId: customer.id,
      customerName: customer.name,
      warehouseId: this.state.selectedWarehouseId,
      items: this.state.cart.map(item => ({ ...item, unitPrice: toDocumentCurrency(item.unitPrice), total: toDocumentCurrency(item.total) })),
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
      assignedEmployeeId: window.auth.employee?.id || '',
      paymentMethod: this.state.paymentMethod,
      status: 'delivered',
      createdAt: new Date().toISOString()
    };

    // Save order
    await window.syncController.enqueueMutation('orders', 'save', newOrder);

    // Decrement stock in IndexedDB
    for (const item of this.state.cart) {
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

  async deleteOrder(id) {
    if (!auth.can('sales','delete')) return window.app.showToast('Action non autorisée', 'error');
    if (!confirm('Supprimer cette commande ?')) return;
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
    const vatMap = (o.items || []).reduce((acc, item) => { const rate=Number(item.vatRate ?? .19); const base=Number(item.total||0)*(1-Number(o.discountPercent||0)/100); const key=String(rate); acc[key] ||= { rate, base: 0, tax: 0 }; acc[key].base += base; acc[key].tax += base*rate; return acc; }, {});
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
          <div class="bg-white text-slate-900 p-4 border border-slate-300" style="border-top:8px solid ${template.accent}">
            <!-- Header -->
            <div class="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
              <div>
                <h1 class="text-2xl font-black text-sari-blue tracking-tight">SARI SYSTÈME</h1>
                <p class="text-xs font-bold uppercase mt-0.5">Distribution & Import Équipements Médicaux</p>
                <p class="text-xs text-slate-600 mt-1">${SARI_CONFIG.COMPANY_ADDRESS}</p>
                <p class="text-xs text-slate-600">Tél: ${SARI_CONFIG.COMPANY_PHONE}</p>
                <p class="text-xs text-slate-600 font-mono-tech mt-1">
                  <strong>NIF:</strong> ${SARI_CONFIG.COMPANY_NIF} | <strong>RC:</strong> ${SARI_CONFIG.COMPANY_RC}
                </p>
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
              <div><p class="text-xs text-slate-600"><strong>Mode de Règlement :</strong> ${o.paymentMethod || 'Virement Bancaire'}<br/><strong>Compte Bancaire SARI :</strong> BNA Agence 001 - RIB 00100161609876543209</p>${o.documentNote?`<div class="mt-3 p-2 border rounded text-xs"><strong>Note :</strong> ${SariUtils.escapeHtml(o.documentNote)}</div>`:''}<div class="flex items-end gap-4 mt-4"><div><canvas id="commercial-qr" width="88" height="88" class="border"></canvas><p class="text-[8px] text-slate-400 max-w-24 truncate">${SariUtils.escapeHtml(o.qrContent||docCode)}</p></div><div class="pt-2 border-t border-slate-300 text-center w-48"><p class="text-xs font-bold">Cachet & Signature</p><div class="h-10 text-slate-300 text-xs italic pt-3">(Approuvé & Certifié)</div></div></div></div>
              ${hideAmounts ? '' : `<div class="space-y-3"><div class="border rounded p-3 bg-slate-50 space-y-1.5 text-xs"><div class="flex justify-between"><span>Sous-total HT :</span><b>${formatMoney(o.subtotal)}</b></div>${o.discountAmount>0?`<div class="flex justify-between text-amber-700"><span>Remise globale (${o.discountPercent}%) :</span><b>-${formatMoney(o.discountAmount)}</b></div>`:''}${o.shippingFee?`<div class="flex justify-between"><span>Livraison / transport :</span><b>${formatMoney(o.shippingFee)}</b></div>`:''}<div class="flex justify-between"><span>Total TVA :</span><b>${formatMoney(o.taxAmount)}</b></div><div class="flex justify-between pt-2 border-t-2 font-black text-sm"><span>NET TTC :</span><span style="color:${template.accent}">${formatMoney(o.total)}</span></div></div><table class="w-full text-[10px] border"><thead><tr class="bg-slate-100"><th class="p-1">Taux TVA</th><th>Base taxable</th><th>Taxe</th></tr></thead><tbody>${vatBreakdown.map(v=>`<tr class="text-center border-t"><td class="p-1">${Math.round(v.rate*100)}%</td><td>${formatMoney(v.base)}</td><td>${formatMoney(v.tax)}</td></tr>`).join('')}</tbody></table><p class="text-xs p-2 border-l-4" style="border-color:${template.accent}"><strong>Arrêté à la somme de :</strong><br>${amountWords}</p></div>`}
            </div>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => SariUtils.drawQRCode(document.getElementById('commercial-qr'), o.qrContent || docCode, 88), 0);
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
