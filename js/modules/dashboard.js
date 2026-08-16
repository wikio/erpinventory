/**
 * SARI Système - Dashboard Module
 * Interactive home dashboard with KPI cards, Chart.js analytics,
 * alert banners, active tenders, shipments, and audit log timeline.
 */

const DashboardModule = {
  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Load data from IndexedDB
    const products = await window.sariDB.getAll('products');
    const orders = await window.sariDB.getAll('orders');
    const shipments = await window.sariDB.getAll('shipments');
    const tenders = await window.sariDB.getAll('tenders');
    const auditLogs = await window.sariDB.getAll('auditLogs');

    // Calculate metrics
    const totalProductsCount = products.length;
    let totalStockValueDZD = 0;
    let lowStockCount = 0;
    let nearExpiryCount = 0;

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    products.forEach(p => {
      totalStockValueDZD += (Number(p.stock) || 0) * (Number(p.purchasePrice) || 0);
      if (Number(p.stock) <= Number(p.minimumStock)) {
        lowStockCount++;
      }
      if (p.expirationDate) {
        const expDate = new Date(p.expirationDate);
        if (expDate <= thirtyDaysFromNow) {
          nearExpiryCount++;
        }
      }
    });

    // Calculate sales revenue
    let totalRevenueDZD = 0;
    let outstandingReceivablesDZD = 0;
    orders.forEach(o => {
      totalRevenueDZD += Number(o.total) || 0;
      if (o.status !== 'paid') {
        outstandingReceivablesDZD += Number(o.total) || 0;
      }
    });

    // Active import shipments in transit or customs
    const activeShipments = shipments.filter(s => s.status === 'inTransit' || s.status === 'customsClearance');
    let totalImportCostDZD = 0;
    shipments.forEach(s => {
      totalImportCostDZD += Number(s.totalLandedCostDZD) || 0;
    });

    // Active tenders
    const activeTenders = tenders.filter(t => t.status === 'inPreparation' || t.status === 'submitted' || t.status === 'underEvaluation');

    // Build HTML layout
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Dashboard Header & Welcome Banner -->
        <div class="sari-tile p-6 sari-grid-pattern relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="sari-corner-accent"></div>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="sari-badge bg-sari-blue/10 text-sari-blue border-sari-blue">ERP Médical Algérie</span>
              <span class="text-xs text-slate-500 dark:text-slate-400 font-mono-tech">v1.0.0 PWA</span>
            </div>
            <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white" data-i18n="appName">${i18n.t('appName')}</h1>
            <p class="text-sm text-slate-600 dark:text-slate-300 mt-1" data-i18n="welcomeMessage">${i18n.t('welcomeMessage')}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button onclick="window.app.navigate('sales')" class="sari-btn px-4 py-2 bg-sari-blue hover:bg-sari-blue/90 text-white shadow-sm text-sm">
              <i data-lucide="plus"></i>
              <span data-i18n="newOrder">${i18n.t('newOrder')}</span>
            </button>
            <button onclick="window.app.navigate('inventory')" class="sari-btn px-4 py-2 bg-sari-lime hover:bg-sari-lime/90 text-slate-900 shadow-sm text-sm">
              <i data-lucide="package"></i>
              <span data-i18n="inventory">${i18n.t('inventory')}</span>
            </button>
          </div>
        </div>

        <!-- Alert Banners if Low Stock or Near Expiry -->
        ${(nearExpiryCount > 0 || lowStockCount > 0) ? `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${nearExpiryCount > 0 ? `
          <div class="sari-tile p-4 bg-sari-amber/10 border-sari-amber flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded bg-sari-amber flex items-center justify-center text-slate-900 font-bold text-lg">
                <i data-lucide="triangle-alert"></i>
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-900 dark:text-white">${nearExpiryCount} ${i18n.t('expiringProducts')}</h4>
                <p class="text-xs text-slate-600 dark:text-slate-300">Des consommables médicaux expirent dans moins de 30 jours (Lot traçabilité).</p>
              </div>
            </div>
            <button onclick="window.app.navigate('inventory')" class="text-xs font-bold text-sari-amber underline hover:opacity-80">
              ${i18n.t('view')} &rarr;
            </button>
          </div>` : ''}

          ${lowStockCount > 0 ? `
          <div class="sari-tile p-4 bg-red-500/10 border-red-500 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded bg-red-500 flex items-center justify-center text-white font-bold text-lg">
                <i data-lucide="layers-3"></i>
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-900 dark:text-white">${lowStockCount} ${i18n.t('lowStockAlerts')}</h4>
                <p class="text-xs text-slate-600 dark:text-slate-300">Produits sous le seuil minimum de stock au Dépôt Central.</p>
              </div>
            </div>
            <button onclick="window.app.navigate('inventory')" class="text-xs font-bold text-red-500 underline hover:opacity-80">
              ${i18n.t('view')} &rarr;
            </button>
          </div>` : ''}
        </div>
        ` : ''}

        <!-- 4-Column KPI Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- KPI 1: Products Count -->
          <div class="sari-tile p-5 relative overflow-hidden">
            <div class="sari-corner-accent blue"></div>
            <div class="flex justify-between items-start">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400" data-i18n="totalProducts">${i18n.t('totalProducts')}</p>
                <h3 class="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono-tech">${totalProductsCount}</h3>
                <p class="text-xs text-sari-blue font-semibold mt-1">Équipements & Consommables</p>
              </div>
              <div class="w-10 h-10 rounded bg-sari-blue/10 text-sari-blue flex items-center justify-center text-xl">
                <i data-lucide="boxes"></i>
              </div>
            </div>
          </div>

          <!-- KPI 2: Total Stock Value -->
          <div class="sari-tile p-5 relative overflow-hidden">
            <div class="sari-corner-accent"></div>
            <div class="flex justify-between items-start">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400" data-i18n="totalStockValue">${i18n.t('totalStockValue')}</p>
                <h3 class="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono-tech">${i18n.formatCurrency(totalStockValueDZD, 'DZD')}</h3>
                <p class="text-xs text-sari-lime font-semibold mt-1">Valuation DZD sur 4 Dépôts</p>
              </div>
              <div class="w-10 h-10 rounded bg-sari-lime/20 text-sari-lime-dark flex items-center justify-center text-xl">
                <i data-lucide="coins"></i>
              </div>
            </div>
          </div>

          <!-- KPI 3: Active Import Shipments -->
          <div class="sari-tile p-5 relative overflow-hidden">
            <div class="sari-corner-accent amber"></div>
            <div class="flex justify-between items-start">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400" data-i18n="activeShipments">${i18n.t('activeShipments')}</p>
                <h3 class="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono-tech">${activeShipments.length}</h3>
                <p class="text-xs text-sari-amber font-semibold mt-1">Incoterms CIF / FOB Port d'Alger</p>
              </div>
              <div class="w-10 h-10 rounded bg-sari-amber/15 text-sari-amber flex items-center justify-center text-xl">
                <i data-lucide="ship"></i>
              </div>
            </div>
          </div>

          <!-- KPI 4: Active Tenders -->
          <div class="sari-tile p-5 relative overflow-hidden">
            <div class="sari-corner-accent blue"></div>
            <div class="flex justify-between items-start">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400" data-i18n="activeTenders">${i18n.t('activeTenders')}</p>
                <h3 class="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono-tech">${activeTenders.length}</h3>
                <p class="text-xs text-sari-blue font-semibold mt-1">CHU Alger & DSP Wilayas</p>
              </div>
              <div class="w-10 h-10 rounded bg-sari-blue/10 text-sari-blue flex items-center justify-center text-xl">
                <i data-lucide="file-check"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="sari-tile p-4 flex items-center justify-between border-l-4 border-l-sari-blue">
            <div>
              <p class="text-xs text-slate-500 uppercase font-bold">Chiffre d'Affaires Global</p>
              <h4 class="text-xl font-bold font-mono-tech text-slate-900 dark:text-white mt-1">${i18n.formatCurrency(totalRevenueDZD)}</h4>
            </div>
            <span class="text-xs bg-sari-blue/10 text-sari-blue px-2 py-1 rounded font-bold">+18.4% ce mois</span>
          </div>

          <div class="sari-tile p-4 flex items-center justify-between border-l-4 border-l-sari-amber">
            <div>
              <p class="text-xs text-slate-500 uppercase font-bold">Créances Clients en Attente</p>
              <h4 class="text-xl font-bold font-mono-tech text-slate-900 dark:text-white mt-1">${i18n.formatCurrency(outstandingReceivablesDZD)}</h4>
            </div>
            <span class="text-xs bg-sari-amber/10 text-sari-amber px-2 py-1 rounded font-bold">Trésor & CHU</span>
          </div>

          <div class="sari-tile p-4 flex items-center justify-between border-l-4 border-l-sari-lime">
            <div>
              <p class="text-xs text-slate-500 uppercase font-bold">Coûts Importations Cumulés</p>
              <h4 class="text-xl font-bold font-mono-tech text-slate-900 dark:text-white mt-1">${i18n.formatCurrency(totalImportCostDZD)}</h4>
            </div>
            <span class="text-xs bg-sari-lime/20 text-sari-lime-dark px-2 py-1 rounded font-bold">Achat + Douane DZD</span>
          </div>
        </div>

        <!-- Charts Grid Section (Row 1: 2 charts) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Chart 1: Inventory Movement Over Time -->
          <div class="sari-tile p-5">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-bold text-base text-slate-900 dark:text-white">Mouvements Stock (Entrées / Sorties)</h3>
              <span class="sari-badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">6 Derniers Mois</span>
            </div>
            <div class="h-64 relative">
              <canvas id="chart-inventory-movement"></canvas>
            </div>
          </div>

          <!-- Chart 2: Monthly Sales Revenue -->
          <div class="sari-tile p-5">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-bold text-base text-slate-900 dark:text-white">Évolution Chiffre d'Affaires (DZD)</h3>
              <span class="sari-badge bg-sari-blue/10 text-sari-blue">Alger / Oran / Constantine</span>
            </div>
            <div class="h-64 relative">
              <canvas id="chart-monthly-sales"></canvas>
            </div>
          </div>
        </div>

        <!-- Charts Grid Section (Row 2: 3 smaller charts) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Chart 3: Category Distribution -->
          <div class="sari-tile p-5">
            <h3 class="font-bold text-base text-slate-900 dark:text-white mb-4">Répartition par Catégorie</h3>
            <div class="h-56 relative">
              <canvas id="chart-category-dist"></canvas>
            </div>
          </div>

          <!-- Chart 4: Import vs Local Sourcing Ratio -->
          <div class="sari-tile p-5">
            <h3 class="font-bold text-base text-slate-900 dark:text-white mb-4">Sourcing Import vs. Local</h3>
            <div class="h-56 relative">
              <canvas id="chart-import-ratio"></canvas>
            </div>
          </div>

          <!-- Chart 5: Tender Win/Loss Ratio -->
          <div class="sari-tile p-5">
            <h3 class="font-bold text-base text-slate-900 dark:text-white mb-4">Pipeline Appels d'Offres</h3>
            <div class="h-56 relative">
              <canvas id="chart-tender-pipeline"></canvas>
            </div>
          </div>
        </div>

        <!-- Bottom Section: Active Tenders & Recent Audit Log Timeline -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Left: Active Tenders & Deadlines -->
          <div class="sari-tile p-5">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-bold text-base text-slate-900 dark:text-white">Appels d'Offres en Cours & Échéances</h3>
              <button onclick="window.app.navigate('tenders')" class="text-xs font-bold text-sari-blue hover:underline">
                Voir tout &rarr;
              </button>
            </div>
            <div class="space-y-3">
              ${activeTenders.map(t => `
                <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-start gap-2">
                  <div>
                    <span class="text-xs font-mono-tech text-sari-blue font-bold">${t.id}</span>
                    <h5 class="text-sm font-bold text-slate-900 dark:text-white mt-0.5">${t.title}</h5>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${t.issuingOrganization}</p>
                  </div>
                  <div class="text-right">
                    <span class="sari-badge ${t.status === 'submitted' ? 'bg-sari-amber/10 text-sari-amber' : 'bg-sari-blue/10 text-sari-blue'}">
                      ${i18n.t(t.status)}
                    </span>
                    <p class="text-xs font-mono-tech font-bold mt-1 text-slate-700 dark:text-slate-300">
                      ${i18n.formatDate(t.submissionDeadline)}
                    </p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Right: Recent Activities Timeline (Audit Log) -->
          <div class="sari-tile p-5">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-bold text-base text-slate-900 dark:text-white">Journal des Activités Récentes</h3>
              <button onclick="window.app.navigate('auditLogs')" class="text-xs font-bold text-sari-blue hover:underline">
                Voir tout &rarr;
              </button>
            </div>
            <div class="space-y-4">
              ${auditLogs.slice(0, 4).map(log => `
                <div class="flex items-start gap-3 text-sm">
                  <div class="w-2 h-2 rounded-full bg-sari-blue mt-1.5 flex-shrink-0"></div>
                  <div class="flex-1">
                    <div class="flex justify-between items-center">
                      <span class="font-bold text-slate-800 dark:text-slate-200">${log.user} <span class="text-xs text-slate-500">(${log.module})</span></span>
                      <span class="text-xs text-slate-400 font-mono-tech">${i18n.formatDate(log.timestamp)}</span>
                    </div>
                    <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">${log.description}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Initialize all 5 interactive charts
    setTimeout(() => {
      window.sariCharts.renderInventoryMovement('chart-inventory-movement');
      window.sariCharts.renderMonthlySales('chart-monthly-sales');
      window.sariCharts.renderCategoryDistribution('chart-category-dist');
      window.sariCharts.renderImportRatio('chart-import-ratio');
      window.sariCharts.renderTenderPipeline('chart-tender-pipeline');
    }, 100);
  }
};

if (typeof window !== 'undefined') {
  window.DashboardModule = DashboardModule;
}

export {};
