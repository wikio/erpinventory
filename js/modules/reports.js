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
    customers: [], suppliers: [], purchaseDocuments: [], documents: [], missions: [], expenses: [], annotations: []
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.state.products = await window.sariDB.getAll('products');
    this.state.orders = await window.sariDB.getAll('orders');
    this.state.shipments = await window.sariDB.getAll('shipments');
    this.state.tenders = await window.sariDB.getAll('tenders');
    this.state.customers = await window.sariDB.getAll('customers');
    [this.state.suppliers,this.state.purchaseDocuments,this.state.documents,this.state.missions,this.state.annotations]=await Promise.all(['suppliers','purchaseDocuments','documents','missions','reportAnnotations'].map(s=>sariDB.getAll(s)));

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
            <button onclick="ReportsModule.openFullReport()" class="sari-btn px-4 py-2 bg-sari-lime text-slate-900 text-sm"><i data-lucide="scan-eye" class="w-4 h-4"></i> Rapport détaillé</button>
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

          <button onclick="ReportsModule.setTab('partners')" class="px-4 py-2 rounded text-xs font-bold ${tab==='partners'?'bg-sari-blue text-white':'hover:bg-slate-100 dark:hover:bg-slate-800'}"><i class="fas fa-users mr-1"></i> Clients & Fournisseurs</button>
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
    if (tab === 'partners') {
      const clients=this.state.customers.map(c=>{const docs=this.state.orders.filter(o=>o.customerId===c.id),total=docs.reduce((s,d)=>s+Number(d.total||0),0);return{name:c.name,type:'Client',count:docs.length,total,average:docs.length?total/docs.length:0,outstanding:docs.filter(d=>!['paid','closed'].includes(d.status)).reduce((s,d)=>s+Number(d.total||0),0)}});const suppliers=this.state.suppliers.map(x=>{const docs=this.state.purchaseDocuments.filter(d=>d.supplierId===x.id),total=docs.reduce((s,d)=>s+Number(d.total||0),0);return{name:x.name,type:'Fournisseur',count:docs.length,total,average:docs.length?total/docs.length:0,outstanding:docs.filter(d=>!['paid','closed'].includes(d.status)).reduce((s,d)=>s+Number(d.total||0),0)}});return `<div class="sari-tile overflow-x-auto"><table class="w-full sari-table text-sm"><thead><tr class="border-b"><th class="p-3 text-left">Partenaire</th><th>Type</th><th>Documents</th><th>Volume</th><th>Moyenne</th><th>Encours</th></tr></thead><tbody>${[...clients,...suppliers].map(x=>`<tr class="border-b"><td class="p-3 font-bold">${SariUtils.escapeHtml(x.name)}</td><td>${x.type}</td><td>${x.count}</td><td>${i18n.formatCurrency(x.total)}</td><td>${i18n.formatCurrency(x.average)}</td><td class="text-sari-amber font-bold">${i18n.formatCurrency(x.outstanding)}</td></tr>`).join('')}</tbody></table></div>`;
    }
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

  reportData(tab){if(tab==='inventory')return this.state.products;if(tab==='sales')return this.state.orders;if(tab==='imports')return this.state.shipments;if(tab==='tenders')return this.state.tenders;if(tab==='partners')return [...this.state.customers,...this.state.suppliers];return [...this.state.orders,...this.state.purchaseDocuments];},
  async openFullReport(){const tab=this.state.activeTab,data=this.reportData(tab),annotation=this.state.annotations.find(x=>x.id===`report-${tab}`),root=document.getElementById('sari-modal-root'),salesTotal=this.state.orders.reduce((s,x)=>s+Number(x.total||0),0),purchaseTotal=this.state.purchaseDocuments.reduce((s,x)=>s+Number(x.total||0),0),missionExpenses=this.state.missions.reduce((s,x)=>s+Number(x.expenses||0),0);root.innerHTML=`<div class="fixed inset-0 z-50 sari-modal-backdrop flex items-center justify-center p-3"><div class="sari-tile w-full max-w-7xl max-h-[95vh] overflow-y-auto p-5"><header class="no-print flex justify-between border-b pb-3"><div><span class="sari-badge">Rapport complet</span><h2 class="text-xl font-extrabold mt-2">${tab.toUpperCase()} • SARI Système</h2></div><div class="flex gap-2"><button onclick="ReportsModule.saveAnnotation('${tab}')" class="sari-btn px-4 bg-slate-800 text-white">Enregistrer notes</button><button onclick="SariUtils.downloadPDF('full-report-area','rapport-${tab}.pdf')" class="sari-btn px-4 bg-sari-lime text-slate-900">Télécharger PDF</button><button onclick="app.closeModalRoot()">×</button></div></header><div id="full-report-area" class="bg-white text-slate-900 p-6"><div class="document-print-header border-b-2 pb-3"><h1 class="text-2xl font-black text-sari-blue">SARI SYSTÈME • RAPPORT ${tab.toUpperCase()}</h1><p>${new Date().toLocaleString()} • ${data.length} enregistrement(s)</p></div><div class="grid md:grid-cols-4 gap-3 my-5"><div class="p-3 border rounded"><small>Ventes</small><b class="block text-lg">${i18n.formatCurrency(salesTotal)}</b></div><div class="p-3 border rounded"><small>Achats</small><b class="block text-lg">${i18n.formatCurrency(purchaseTotal)}</b></div><div class="p-3 border rounded"><small>Gains estimés</small><b class="block text-lg text-green-700">${i18n.formatCurrency(salesTotal-purchaseTotal-missionExpenses)}</b></div><div class="p-3 border rounded"><small>Frais missions</small><b class="block text-lg text-amber-700">${i18n.formatCurrency(missionExpenses)}</b></div></div><div class="p-4 border rounded-xl mb-5"><h3 class="font-extrabold mb-3">Vue graphique</h3><div class="grid grid-cols-3 gap-3 items-end h-36">${[['Ventes',salesTotal,'#009CC5'],['Achats',purchaseTotal,'#EBB51A'],['Résultat',Math.max(0,salesTotal-purchaseTotal-missionExpenses),'#9BB024']].map(([label,value,color])=>`<div class="h-full flex flex-col justify-end"><div class="rounded-t" style="height:${Math.max(5,Math.min(100,value/Math.max(salesTotal,purchaseTotal,1)*100))}%;background:${color}"></div><b class="text-xs text-center mt-1">${label}</b></div>`).join('')}</div></div><div class="grid lg:grid-cols-[1fr_320px] gap-4"><section><h3 class="font-extrabold">Transactions / données liées</h3><div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr><th class="text-left p-2">Référence</th><th>Libellé / partenaire</th><th>Statut</th><th>Montant</th></tr></thead><tbody>${data.slice(0,250).map(x=>`<tr class="border-t"><td class="p-2 font-mono-tech text-sari-blue">${x.referenceCode||x.sku||x.id}</td><td>${SariUtils.escapeHtml(x.name||x.title||x.customerName||x.supplierName||'')}</td><td>${x.status||x.category||x.type||'—'}</td><td>${i18n.formatCurrency(x.total||x.estimatedValue||x.totalLandedCostDZD||x.sellingPrice||0,x.currency||'DZD')}</td></tr>`).join('')}</tbody></table></div></section><aside class="space-y-3"><div class="p-3 border rounded"><h4 class="font-bold">Contacts</h4>${[...this.state.customers,...this.state.suppliers].slice(0,12).map(x=>`<p class="text-xs border-b py-1">${SariUtils.escapeHtml(x.name)}<br>${SariUtils.escapeHtml(x.contactInfo||'')}</p>`).join('')}</div><div class="p-3 border rounded"><h4 class="font-bold">Missions</h4>${this.state.missions.map(x=>`<p class="text-xs">${x.referenceCode||x.id} • ${x.destination} • ${i18n.formatCurrency(x.expenses)}</p>`).join('')||'<small>Aucune</small>'}</div><div class="p-3 border rounded"><h4 class="font-bold">Documents GED</h4><p class="text-xs">${this.state.documents.length} document(s) liés au système</p></div></aside></div><section class="mt-5"><h3 class="font-extrabold">Annotations du rapport</h3><div id="report-annotation" contenteditable="${auth.can('reports','edit')}" class="rich-editor border rounded mt-2">${RichTextEditor.sanitize(annotation?.html||'Ajoutez ici une analyse, des décisions ou des commentaires…')}</div></section></div></div></div>`;if(typeof lucide!=='undefined')lucide.createIcons();},
  async saveAnnotation(tab){const html=RichTextEditor.sanitize(document.getElementById('report-annotation')?.innerHTML||'');await sariDB.save('reportAnnotations',{id:`report-${tab}`,tab,html,updatedAt:new Date().toISOString(),updatedBy:auth.currentUser.id});app.showToast('Annotations enregistrées.','success');},

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
