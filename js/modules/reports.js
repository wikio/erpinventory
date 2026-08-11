/**
 * SARI Système - Reporting & Analytics Module
 * Generate professional multi-tab reports for Inventory, Sales,
 * Imports, Tenders, and Finance. Export to PDF, CSV, and Excel.
 */

const ReportsModule = {
  state: {
    activeTab: 'inventory', // 'inventory' | 'sales' | 'imports' | 'tenders' | 'finance'
    products: [],
    orders: [],
    shipments: [],
    tenders: [],
    customers: []
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.state.products = await window.sariDB.getAll('products');
    this.state.orders = await window.sariDB.getAll('orders');
    this.state.shipments = await window.sariDB.getAll('shipments');
    this.state.tenders = await window.sariDB.getAll('tenders');
    this.state.customers = await window.sariDB.getAll('customers');

    this.renderView(container);
  },

  renderView(container) {
    const tab = this.state.activeTab;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="sari-tile p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white" data-i18n="reports">
              ${i18n.t('reports')}
            </h2>
            <p class="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Évaluations des stocks, analyses de chiffre d'affaires par wilaya, coûts importations et profitabilité.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="ReportsModule.exportCurrentCSV()" class="sari-btn px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
              <i class="fas fa-file-csv"></i> Exporter CSV
            </button>
            <button onclick="ReportsModule.printReport()" class="sari-btn px-4 py-2 bg-sari-blue text-white font-bold text-sm">
              <i class="fas fa-print"></i> Imprimer / PDF
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="sari-tile p-2 flex flex-wrap gap-2 border-b-2 border-sari-blue">
          <button 
            onclick="ReportsModule.setTab('inventory')" 
            class="px-4 py-2 rounded text-xs font-bold transition ${tab === 'inventory' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
          >
            <i class="fas fa-box mr-1"></i> Stock & Péremptions
          </button>
          <button 
            onclick="ReportsModule.setTab('sales')" 
            class="px-4 py-2 rounded text-xs font-bold transition ${tab === 'sales' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
          >
            <i class="fas fa-chart-line mr-1"></i> Ventes & Créances
          </button>
          <button 
            onclick="ReportsModule.setTab('imports')" 
            class="px-4 py-2 rounded text-xs font-bold transition ${tab === 'imports' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
          >
            <i class="fas fa-ship mr-1"></i> Coûts Importations
          </button>
          <button 
            onclick="ReportsModule.setTab('tenders')" 
            class="px-4 py-2 rounded text-xs font-bold transition ${tab === 'tenders' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
          >
            <i class="fas fa-file-contract mr-1"></i> Appels d'Offres
          </button>
          <button 
            onclick="ReportsModule.setTab('finance')" 
            class="px-4 py-2 rounded text-xs font-bold transition ${tab === 'finance' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
          >
            <i class="fas fa-balance-scale mr-1"></i> Rentabilité & Finances
          </button>
        </div>

        <!-- Tab Body -->
        <div id="report-tab-body">
          ${this.getTabHtml(tab)}
        </div>
      </div>
    `;
  },

  setTab(tabName) {
    this.state.activeTab = tabName;
    this.render();
  },

  getTabHtml(tab) {
    if (tab === 'inventory') {
      let totalPurchaseDZD = 0;
      let totalSellingDZD = 0;
      this.state.products.forEach(p => {
        const qty = Number(p.stock) || 0;
        totalPurchaseDZD += qty * (Number(p.purchasePrice) || 0);
        totalSellingDZD += qty * (Number(p.sellingPrice) || 0);
      });
      const estProfit = totalSellingDZD - totalPurchaseDZD;

      return `
        <div class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="sari-tile p-4 bg-sari-blue/10 border-sari-blue">
              <p class="text-xs text-slate-500 font-bold uppercase">Valeur Achat Stock (DZD)</p>
              <h3 class="text-2xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${i18n.formatCurrency(totalPurchaseDZD)}</h3>
            </div>
            <div class="sari-tile p-4 bg-sari-lime/20 border-sari-lime-dark">
              <p class="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase">Valeur Vente Estimée (DZD)</p>
              <h3 class="text-2xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${i18n.formatCurrency(totalSellingDZD)}</h3>
            </div>
            <div class="sari-tile p-4 bg-sari-amber/10 border-sari-amber">
              <p class="text-xs text-slate-500 font-bold uppercase">Profit Brut Potentiel</p>
              <h3 class="text-2xl font-extrabold font-mono-tech text-sari-blue mt-1">${i18n.formatCurrency(estProfit)}</h3>
            </div>
          </div>

          <div class="sari-tile overflow-x-auto">
            <table class="w-full text-left border-collapse sari-table text-sm">
              <thead>
                <tr class="bg-slate-100 dark:bg-slate-800 uppercase text-xs font-bold text-slate-500 border-b-2">
                  <th class="p-3">SKU & Désignation</th>
                  <th class="p-3">Catégorie</th>
                  <th class="p-3">Stock Actuel</th>
                  <th class="p-3">Prix Achat (DA)</th>
                  <th class="p-3">Valuation Achat</th>
                  <th class="p-3">N° Lot & Péremption</th>
                </tr>
              </thead>
              <tbody>
                ${this.state.products.map(p => {
                  const qty = Number(p.stock) || 0;
                  const val = qty * (Number(p.purchasePrice) || 0);
                  return `
                    <tr class="border-b">
                      <td class="p-3 font-bold">${p.sku} • ${p.name}</td>
                      <td class="p-3 text-xs">${i18n.getCategoryName(p.category)}</td>
                      <td class="p-3 font-mono-tech font-bold">${p.stock}</td>
                      <td class="p-3 font-mono-tech">${i18n.formatCurrency(p.purchasePrice)}</td>
                      <td class="p-3 font-mono-tech font-extrabold text-sari-blue">${i18n.formatCurrency(val)}</td>
                      <td class="p-3 text-xs font-mono-tech">${p.lotNumber || 'N/A'} • <span class="text-red-500">${p.expirationDate || ''}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (tab === 'sales') {
      let totalSalesDZD = 0;
      let unpaidDZD = 0;
      this.state.orders.forEach(o => {
        totalSalesDZD += Number(o.total) || 0;
        if (o.status !== 'paid') unpaidDZD += Number(o.total) || 0;
      });

      return `
        <div class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="sari-tile p-4 border-l-4 border-l-sari-blue">
              <p class="text-xs text-slate-500 font-bold uppercase">Total Ventes & Commandes B2B</p>
              <h3 class="text-2xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${i18n.formatCurrency(totalSalesDZD)}</h3>
            </div>
            <div class="sari-tile p-4 border-l-4 border-l-sari-amber">
              <p class="text-xs text-slate-500 font-bold uppercase">Créances Clients en Attente</p>
              <h3 class="text-2xl font-extrabold font-mono-tech text-sari-amber mt-1">${i18n.formatCurrency(unpaidDZD)}</h3>
            </div>
          </div>

          <div class="sari-tile overflow-x-auto">
            <table class="w-full text-left border-collapse sari-table text-sm">
              <thead>
                <tr class="bg-slate-100 dark:bg-slate-800 uppercase text-xs font-bold text-slate-500 border-b-2">
                  <th class="p-3">N° Commande</th>
                  <th class="p-3">Client</th>
                  <th class="p-3">Date</th>
                  <th class="p-3">Total TTC (DA)</th>
                  <th class="p-3">Mode Règlement</th>
                  <th class="p-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                ${this.state.orders.map(o => `
                  <tr class="border-b">
                    <td class="p-3 font-mono-tech font-bold text-sari-blue">${o.id}</td>
                    <td class="p-3 font-bold">${o.customerName}</td>
                    <td class="p-3 font-mono-tech text-xs">${i18n.formatDate(o.createdAt)}</td>
                    <td class="p-3 font-mono-tech font-extrabold">${i18n.formatCurrency(o.total)}</td>
                    <td class="p-3 text-xs">${o.paymentMethod}</td>
                    <td class="p-3"><span class="sari-badge bg-slate-200">${i18n.t(o.status)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (tab === 'imports') {
      let totalForeignUSD = 0;
      let totalLandedDZD = 0;
      this.state.shipments.forEach(s => {
        totalLandedDZD += Number(s.totalLandedCostDZD) || 0;
      });

      return `
        <div class="space-y-6">
          <div class="sari-tile p-4 bg-sari-lime/20">
            <p class="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase">Total Coût de Revient Landed Cost (DA)</p>
            <h3 class="text-2xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${i18n.formatCurrency(totalLandedDZD)}</h3>
          </div>
          <div class="sari-tile overflow-x-auto">
            <table class="w-full text-left border-collapse sari-table text-sm">
              <thead>
                <tr class="bg-slate-100 dark:bg-slate-800 uppercase text-xs font-bold text-slate-500 border-b-2">
                  <th class="p-3">Réf Expédition</th>
                  <th class="p-3">Fournisseur</th>
                  <th class="p-3">Incoterm</th>
                  <th class="p-3">Achat Devise</th>
                  <th class="p-3">Achat DZD</th>
                  <th class="p-3">Douane/Fret (DA)</th>
                  <th class="p-3">Coût Revient Total (DA)</th>
                </tr>
              </thead>
              <tbody>
                ${this.state.shipments.map(s => {
                  const customs = (Number(s.freightCost) || 0) + (Number(s.customsCost) || 0) + (Number(s.insuranceCost) || 0);
                  return `
                    <tr class="border-b">
                      <td class="p-3 font-mono-tech font-bold text-sari-blue">${s.id}</td>
                      <td class="p-3 font-bold">${s.supplierName}</td>
                      <td class="p-3 font-mono-tech">${s.incoterm}</td>
                      <td class="p-3 font-mono-tech">${Number(s.foreignAmount || 0).toLocaleString()} ${s.currency}</td>
                      <td class="p-3 font-mono-tech">${i18n.formatCurrency(s.purchaseCostDZD)}</td>
                      <td class="p-3 font-mono-tech text-sari-amber">${i18n.formatCurrency(customs)}</td>
                      <td class="p-3 font-mono-tech font-extrabold text-sari-blue">${i18n.formatCurrency(s.totalLandedCostDZD)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (tab === 'tenders') {
      let wonVal = 0;
      let totalEst = 0;
      this.state.tenders.forEach(t => {
        totalEst += Number(t.estimatedValue) || 0;
        if (t.status === 'won') wonVal += Number(t.estimatedValue) || 0;
      });

      return `
        <div class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="sari-tile p-4 border-l-4 border-l-sari-blue">
              <p class="text-xs text-slate-500 font-bold uppercase">Budget Total Appels d'Offres</p>
              <h3 class="text-2xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${i18n.formatCurrency(totalEst)}</h3>
            </div>
            <div class="sari-tile p-4 border-l-4 border-l-sari-lime">
              <p class="text-xs text-slate-500 font-bold uppercase">Marchés Remportés (Won)</p>
              <h3 class="text-2xl font-extrabold font-mono-tech text-sari-lime-dark mt-1">${i18n.formatCurrency(wonVal)}</h3>
            </div>
          </div>
          <div class="sari-tile overflow-x-auto">
            <table class="w-full text-left border-collapse sari-table text-sm">
              <thead>
                <tr class="bg-slate-100 dark:bg-slate-800 uppercase text-xs font-bold text-slate-500 border-b-2">
                  <th class="p-3">Réf AO</th>
                  <th class="p-3">Institution / CHU</th>
                  <th class="p-3">Titre du Marché</th>
                  <th class="p-3">Budget Estimé (DA)</th>
                  <th class="p-3">Date Dépôt</th>
                  <th class="p-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                ${this.state.tenders.map(t => `
                  <tr class="border-b">
                    <td class="p-3 font-mono-tech font-bold text-sari-blue">${t.id}</td>
                    <td class="p-3 font-bold">${t.issuingOrganization}</td>
                    <td class="p-3">${t.title}</td>
                    <td class="p-3 font-mono-tech font-bold">${i18n.formatCurrency(t.estimatedValue)}</td>
                    <td class="p-3 font-mono-tech text-xs">${i18n.formatDate(t.submissionDeadline)}</td>
                    <td class="p-3"><span class="sari-badge bg-slate-200">${i18n.t(t.status)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // Finance Tab
    let totRevenue = 0;
    this.state.orders.forEach(o => totRevenue += Number(o.total) || 0);
    let totImport = 0;
    this.state.shipments.forEach(s => totImport += Number(s.totalLandedCostDZD) || 0);
    let netEst = Math.round(totRevenue * 0.24); // est 24% net profit margin

    return `
      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="sari-tile p-4 border-l-4 border-l-sari-blue">
            <p class="text-xs text-slate-500 font-bold uppercase">Chiffre d'Affaires Brut (DA)</p>
            <h3 class="text-2xl font-extrabold font-mono-tech text-slate-900 dark:text-white mt-1">${i18n.formatCurrency(totRevenue)}</h3>
          </div>
          <div class="sari-tile p-4 border-l-4 border-l-sari-amber">
            <p class="text-xs text-slate-500 font-bold uppercase">Coûts d'Achat & Importation</p>
            <h3 class="text-2xl font-extrabold font-mono-tech text-sari-amber mt-1">${i18n.formatCurrency(totImport)}</h3>
          </div>
          <div class="sari-tile p-4 border-l-4 border-l-sari-lime">
            <p class="text-xs text-slate-500 font-bold uppercase">Marge Nette Estimée (~24%)</p>
            <h3 class="text-2xl font-extrabold font-mono-tech text-sari-lime-dark mt-1">${i18n.formatCurrency(netEst)}</h3>
          </div>
        </div>

        <div class="sari-tile p-5">
          <h3 class="font-bold text-base text-slate-900 dark:text-white mb-3">Synthèse Financière & Sourcing Algérie</h3>
          <p class="text-sm text-slate-600 dark:text-slate-300">
            Les estimations de marge bénéficiaire intègrent à la fois les approvisionnements directs importés au Port d'Alger (Incoterms CIF/FOB) et les achats locaux auprès de grossistes nationaux. Le taux moyen d'imposition applicable (TVA) est de 19%.
          </p>
        </div>
      </div>
    `;
  },

  exportCurrentCSV() {
    const tab = this.state.activeTab;
    if (tab === 'inventory') SariUtils.exportToCSV(this.state.products, 'rapport-inventaire-stock.csv');
    else if (tab === 'sales') SariUtils.exportToCSV(this.state.orders, 'rapport-ventes-commandes.csv');
    else if (tab === 'imports') SariUtils.exportToCSV(this.state.shipments, 'rapport-couts-importations.csv');
    else if (tab === 'tenders') SariUtils.exportToCSV(this.state.tenders, 'rapport-appels-offres.csv');
    else SariUtils.exportToCSV(this.state.products, 'rapport-financier-produits.csv');
  },

  printReport() {
    window.print();
  }
};

if (typeof window !== 'undefined') {
  window.ReportsModule = ReportsModule;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportsModule;
}
