/**
 * SARI Système - Role-based Dashboard (Section 305).
 * Every block/widget is gated by the roles & permissions system (Section 7/82):
 * a user only sees the KPIs, charts and alerts belonging to the modules their
 * role explicitly grants. The page also personalizes each user's workspace
 * (their tasks, pending items, notifications and relevant KPIs).
 */

const DashboardModule = {
  state: {},
  t(key, fallback) { return i18n.t(key, fallback); },
  can(module, action = 'view') { return window.auth ? window.auth.can(module, action) : true; },

  /** Fetches only the stores required by the union of the user's permissions. */
  async loadScopedData() {
    const wanted = new Set(['notifications', 'tasks', 'employees']);
    if (this.can('inventory', 'view')) ['products', 'stockMovements'].forEach((store) => wanted.add(store));
    if (this.can('sales', 'view') || this.can('reports', 'view')) wanted.add('orders');
    if (this.can('importExport', 'view')) wanted.add('shipments');
    if (this.can('tenders', 'view')) wanted.add('tenders');
    if (this.can('hr', 'view') || this.can('leaves', 'view')) ['leaveRequests', 'leaveTypes', 'publicHolidays', 'payslips'].forEach((store) => wanted.add(store));
    if (this.can('hr', 'view')) wanted.add('attendance');
    const entries = await Promise.all([...wanted].map(async (store) => [store, await window.sariDB.getAll(store)]));
    this.state.data = Object.fromEntries(entries);
    this.state.employee = this.state.data.employees?.find((employee) => employee.userId === window.auth?.currentUser?.id) || null;
    return this.state.data;
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;
    await this.loadScopedData();
    const role = window.auth?.currentRole || 'readonly';
    const roleName = i18n.getRoleName(role);
    const isAdmin = role === 'admin';
    const sections = [
      this.headerHtml(roleName, isAdmin),
      this.workspaceSummaryHtml(),
      this.alertHtml(),
      this.kpiHtml(),
      this.chartsHtml(),
      this.listsHtml(),
      this.notificationsHtml(),
    ].filter(Boolean).join('');
    container.innerHTML = `<div class="space-y-6">${sections}</div>`;
    this.afterRender();
    window.SariIcons?.hydrate();
  },

  headerHtml(roleName, isAdmin) {
    const quick = [];
    if (this.can('sales', 'create') || isAdmin) quick.push(`<button onclick="window.app.navigate('sales')" class="sari-btn px-4 py-2 bg-sari-blue hover:bg-sari-blue/90 text-white shadow-sm text-sm"><i data-lucide="plus"></i><span data-i18n="newOrder">${i18n.t('newOrder', 'Nouvelle commande')}</span></button>`);
    if (this.can('inventory', 'view')) quick.push(`<button onclick="window.app.navigate('inventory')" class="sari-btn px-4 py-2 bg-sari-lime hover:bg-sari-lime/90 text-slate-900 shadow-sm text-sm"><i data-lucide="package"></i><span data-i18n="inventory">${i18n.t('inventory')}</span></button>`);
    if (this.can('hr', 'view')) quick.push(`<button onclick="window.app.navigate('hr')" class="sari-btn px-4 py-2 bg-slate-800 text-white shadow-sm text-sm"><i data-lucide="users-round"></i><span>${this.t('hrShort', 'Ressources Humaines')}</span></button>`);
    if (this.can('leaves', 'view')) quick.push(`<button onclick="window.app.navigate('leaves')" class="sari-btn px-4 py-2 bg-white border text-sm"><i data-lucide="calendar-clock"></i><span>${this.t('leavesShort', 'Congés')}</span></button>`);
    if (this.can('portal', 'view')) quick.push(`<button onclick="window.app.navigate('portal')" class="sari-btn px-4 py-2 bg-white border text-sm"><i data-lucide="contact-round"></i><span>${this.t('mySpace', 'Mon espace')}</span></button>`);
    return `<div class="sari-tile p-6 sari-grid-pattern relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div class="sari-corner-accent"></div>
      <div>
        <div class="flex items-center gap-2 mb-1"><span class="sari-badge bg-sari-blue/10 text-sari-blue border-sari-blue">ERP Médical Algérie</span>
          <span class="text-xs text-slate-500 dark:text-slate-400 font-mono-tech">v1.0.0 PWA</span></div>
        <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white" data-i18n="appName">${i18n.t('appName')}</h1>
        <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">${this.t('welcomeBack', 'Bienvenue')} <b>${SariUtils.escapeHtml(window.auth?.currentUser?.name || '')}</b> — ${this.t('roleScope', 'votre tableau de bord')} <b>${SariUtils.escapeHtml(roleName)}</b>. ${this.t('scopedDashboard', 'Seuls les blocs autorisés pour votre rôle sont affichés.')}</p>
      </div>
      <div class="flex flex-wrap gap-2">${quick.join('')}</div>
    </div>`;
  },

  /* ─────────────── Personal workspace summary (tasks / pending / KPI) ─────────────── */
  workspaceSummaryHtml() {
    const employeeId = this.state.employee?.id;
    const tasks = this.state.data.tasks || [];
    const myTasks = employeeId ? tasks.filter((task) => task.assigneeId === employeeId) : [];
    const openTasks = myTasks.filter((task) => !['done', 'completed'].includes(String(task.stageId || '')) && task.status !== 'done');
    const notifications = (this.state.data.notifications || []).filter((notification) => !notification.targetUserId || notification.targetUserId === window.auth?.currentUser?.id);
    const unread = notifications.filter((notification) => !notification.isRead);
    const leaves = this.state.data.leaveRequests || [];
    const myPendingLeave = employeeId ? leaves.filter((record) => record.employeeId === employeeId && ['submitted', 'approved', 'taken'].includes(record.status)) : [];
    const approvals = this.can('leaves', 'view') ? leaves.filter((record) => record.status === 'submitted') : [];
    const cards = [];
    cards.push({ icon: 'square-kanban', label: this.t('myOpenTasks', 'Mes tâches ouvertes'), value: employeeId ? openTasks.length : '—', sub: employeeId ? `${myTasks.length} ${this.t('tasksTotal', 'tâche(s) au total')}` : this.t('noLinkedEmployee', 'Compte non lié à un dossier employé'), action: `window.app.navigate('tasks')` });
    cards.push({ icon: 'bell', label: this.t('unreadNotifications', 'Notifications non lues'), value: unread.length, sub: this.t('openNotificationsDrawer', 'Ouvrir le tiroir de notifications'), action: `window.app.openNotificationsModal()` });
    if (employeeId) cards.push({ icon: 'calendar-clock', label: this.t('myUpcomingLeave', 'Mes congés en cours / à venir'), value: myPendingLeave.length, sub: myPendingLeave[0] ? `${i18n.formatDate(myPendingLeave[0].startDate)} → ${i18n.formatDate(myPendingLeave[0].endDate)}` : this.t('none', 'Aucun'), action: `window.app.navigate('portal')` });
    if (this.can('leaves', 'view')) cards.push({ icon: 'inbox', label: this.t('leaveApprovals', 'Demandes de congé à traiter'), value: approvals.length, sub: this.t('reviewInLeaves', 'Consulter le module Congés'), action: `window.app.navigate('leaves')` });
    if (this.can('hr', 'view')) {
      const active = (this.state.data.employees || []).filter((employee) => employee.status === 'active').length;
      cards.push({ icon: 'users-round', label: this.t('activeHeadcount', 'Effectif actif'), value: active, sub: this.t('hrKpi', 'Indicateur Ressources Humaines'), action: `window.app.navigate('hr')` });
    }
    if (this.can('sales', 'view') || this.can('reports', 'view')) {
      const today = new Date().toISOString().slice(0, 10);
      const orders = this.state.data.orders || [];
      const todayOrders = orders.filter((order) => String(order.createdAt).slice(0, 10) === today && order.documentType !== 'quote').length;
      cards.push({ icon: 'shopping-cart', label: this.t('ordersToday', 'Commandes du jour'), value: todayOrders, sub: this.t('salesKpi', 'Indicateur commercial'), action: `window.app.navigate('sales')` });
    }
    if (this.can('inventory', 'view')) {
      const products = this.state.data.products || [];
      const low = products.filter((product) => Number(product.stock) <= Number(product.minimumStock)).length;
      cards.push({ icon: 'layers-3', label: this.t('lowStockAlerts', 'Alertes stock faible'), value: low, sub: this.t('inventoryKpi', 'Indicateur stock'), action: `window.app.navigate('inventory')` });
    }
    return `<section class="sari-tile p-5"><div class="flex justify-between items-center mb-4"><div><h3 class="font-extrabold text-base flex gap-2"><i data-lucide="layout-dashboard" class="text-sari-blue"></i>${this.t('myWorkspace', 'Mon espace de travail')}</h3>
      <p class="text-xs text-slate-500">${this.t('myWorkspaceHelp', 'Vos tâches, vos éléments en attente et vos indicateurs personnels — synthèse propre à votre rôle.')}</p></div>
      <span class="sari-badge">${SariUtils.escapeHtml(i18n.getRoleName(window.auth?.currentRole || 'readonly'))}</span></div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">${cards.map((card) => `<button onclick="${card.action}" class="p-4 rounded-xl border text-left hover:border-sari-blue bg-white dark:bg-slate-800/60 transition"><div class="flex justify-between items-start"><span class="w-9 h-9 rounded-lg grid place-items-center bg-sari-blue/10 text-sari-blue"><i data-lucide="${card.icon}" class="w-4 h-4"></i></span><b class="text-2xl font-mono-tech">${card.value}</b></div><p class="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-2">${card.label}</p><small class="text-[10px] text-slate-400">${card.sub}</small></button>`).join('')}</div></section>`;
  },

  alertHtml() {
    const alerts = [];
    if (this.can('inventory', 'view')) {
      const products = this.state.data.products || [];
      const now = new Date(); const in30 = new Date(now.getTime() + 30 * 86400000);
      const nearExpiry = products.filter((product) => product.expirationDate && new Date(product.expirationDate) <= in30 && new Date(product.expirationDate) >= now).length;
      const lowStock = products.filter((product) => Number(product.stock) <= Number(product.minimumStock)).length;
      if (nearExpiry) alerts.push({ tone: 'amber', icon: 'triangle-alert', title: `${nearExpiry} ${i18n.t('expiringProducts', 'péremptions < 30 jours')}`, text: this.t('expiryAlertText', 'Consommables proches de la date de péremption (traçabilité des lots).'), action: `window.app.navigate('inventory')` });
      if (lowStock) alerts.push({ tone: 'red', icon: 'layers-3', title: `${lowStock} ${i18n.t('lowStockAlerts', 'alertes stock faible')}`, text: this.t('lowStockAlertText', 'Produits sous le seuil minimum de stock.'), action: `window.app.navigate('inventory')` });
    }
    if (this.can('leaves', 'view')) {
      const leaves = this.state.data.leaveRequests || [];
      const today = window.SariCore.leave.isoDate(new Date());
      const awayNow = leaves.filter((record) => ['approved', 'taken'].includes(record.status) && today >= record.startDate && today <= record.endDate).length;
      if (awayNow) alerts.push({ tone: 'blue', icon: 'calendar-clock', title: `${awayNow} ${this.t('onLeaveToday', 'salarié(s) en congé aujourd’hui')}`, text: this.t('leaveTodayAlertText', 'Vérifiez la couverture des équipes et les remplacements.'), action: `window.app.navigate('leaves')` });
    }
    if (this.state.employee) {
      alerts.push({ tone: 'amber', icon: 'list-checks', title: this.t('onboardingCheckTitle', 'Votre parcours d’intégration'), text: this.t('onboardingCheckText', 'Vérifiez dans votre espace collaborateur que le règlement, les CGU, le contrat et la déclaration sont complétés.'), action: `window.app.navigate('portal')` });
    }
    if (!alerts.length) return '';
    return `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">${alerts.map((alert) => `<div class="sari-tile p-4 bg-${alert.tone === 'amber' ? 'sari-amber/10 border-sari-amber' : alert.tone === 'red' ? 'red-500/10 border-red-500' : 'sari-blue/10 border-sari-blue'} flex items-center justify-between border">
      <div class="flex items-center gap-3"><div class="w-10 h-10 rounded flex items-center justify-center text-lg ${alert.tone === 'amber' ? 'bg-sari-amber text-slate-900' : alert.tone === 'red' ? 'bg-red-500 text-white' : 'bg-sari-blue text-white'}"><i data-lucide="${alert.icon}"></i></div>
      <div><h4 class="text-sm font-bold text-slate-900 dark:text-white">${alert.title}</h4><p class="text-xs text-slate-600 dark:text-slate-300">${alert.text}</p></div></div>
      <button onclick="${alert.action}" class="text-xs font-bold underline hover:opacity-80 ${alert.tone === 'amber' ? 'text-sari-amber' : alert.tone === 'red' ? 'text-red-500' : 'text-sari-blue'}">${i18n.t('view', 'Voir')} →</button></div>`).join('')}</div>`;
  },

  kpiTile(label, value, sub, icon, tone = 'blue') {
    const tones = { blue: 'bg-sari-blue/10 text-sari-blue', lime: 'bg-sari-lime/20 text-sari-lime-dark', amber: 'bg-sari-amber/15 text-sari-amber', red: 'bg-red-500/10 text-red-500', green: 'bg-green-500/10 text-green-700' };
    const accents = { blue: '', lime: '', amber: 'amber', red: 'red' };
    return `<div class="sari-tile p-5 relative overflow-hidden"><div class="sari-corner-accent ${accents[tone] || ''}"></div>
      <div class="flex justify-between items-start"><div><p class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">${label}</p>
      <h3 class="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono-tech">${value}</h3>
      <p class="text-xs font-semibold mt-1 ${tones[tone]}">${sub}</p></div>
      <div class="w-10 h-10 rounded ${tones[tone]} flex items-center justify-center text-xl"><i data-lucide="${icon}"></i></div></div></div>`;
  },
  kpiHtml() {
    const blocks = [];
    if (this.can('inventory', 'view')) {
      const products = this.state.data.products || [];
      let stockValue = 0;
      products.forEach((product) => { stockValue += (Number(product.stock) || 0) * (Number(product.purchasePrice) || 0); });
      const low = products.filter((product) => Number(product.stock) <= Number(product.minimumStock)).length;
      blocks.push(this.kpiTile(i18n.t('totalProducts', 'Total produits'), products.length, this.t('productsSub', 'Équipements & consommables'), 'boxes', 'blue'));
      blocks.push(this.kpiTile(i18n.t('totalStockValue', 'Valeur stock (DZD)'), i18n.formatCurrency(stockValue, 'DZD'), this.t('valuationSub', 'Valuation des dépôts'), 'coins', 'lime'));
      blocks.push(this.kpiTile(i18n.t('lowStockAlerts', 'Alertes stock faible'), low, this.t('lowStockSub', 'Sous le seuil minimum'), 'layers-3', 'red'));
    }
    if (this.can('sales', 'view') || this.can('reports', 'view')) {
      const orders = this.state.data.orders || [];
      const revenue = orders.filter((order) => order.documentType !== 'quote').reduce((sum, order) => sum + (Number(order.total) || 0), 0);
      const receivables = orders.filter((order) => order.documentType !== 'quote' && order.status !== 'paid').reduce((sum, order) => sum + (Number(order.total) || 0), 0);
      blocks.push(this.kpiTile(i18n.t('globalRevenue', 'Chiffre d’affaires global'), i18n.formatCurrency(revenue), this.t('revenueSub', 'Factures & commandes'), 'trending-up', 'blue'));
      blocks.push(this.kpiTile(i18n.t('outstandingReceivables', 'Créances clients'), i18n.formatCurrency(receivables), this.t('receivablesSub', 'En attente de règlement'), 'hourglass', 'amber'));
    }
    if (this.can('importExport', 'view')) {
      const shipments = this.state.data.shipments || [];
      const active = shipments.filter((shipment) => shipment.status === 'inTransit' || shipment.status === 'customsClearance');
      const costs = shipments.reduce((sum, shipment) => sum + (Number(shipment.totalLandedCostDZD) || 0), 0);
      blocks.push(this.kpiTile(i18n.t('activeShipments', 'Expéditions en cours'), active.length, this.t('shipmentsSub', 'Transit & dédouanement'), 'ship', 'amber'));
      blocks.push(this.kpiTile(i18n.t('cumulativeImportCosts', 'Coûts import cumulés'), i18n.formatCurrency(costs), this.t('importCostsSub', 'Achat + douane + fret'), 'anchor', 'lime'));
    }
    if (this.can('tenders', 'view')) {
      const tenders = this.state.data.tenders || [];
      const active = tenders.filter((tender) => ['inPreparation', 'submitted', 'underEvaluation'].includes(tender.status));
      blocks.push(this.kpiTile(i18n.t('activeTenders', 'Appels d’offres actifs'), active.length, this.t('tendersSub', 'CHU & DSP wilayas'), 'file-check', 'blue'));
    }
    if (this.can('hr', 'view') || this.can('leaves', 'view')) {
      const employees = this.state.data.employees || [];
      const leaves = this.state.data.leaveRequests || [];
      blocks.push(this.kpiTile(this.t('activeHeadcount', 'Effectif actif'), employees.filter((employee) => employee.status === 'active').length, this.t('headcountSub', 'Salariés sous contrat'), 'users-round', 'blue'));
      blocks.push(this.kpiTile(this.t('pendingLeaveRequests', 'Demandes de congé en attente'), leaves.filter((record) => record.status === 'submitted').length, this.t('pendingLeaveSub', 'À traiter par le service RH'), 'inbox', 'amber'));
    }
    return blocks.length ? `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">${blocks.join('')}</div>` : `<div class="sari-tile p-5 text-center text-sm text-slate-500"><i data-lucide="shield-check" class="w-8 h-8 text-sari-blue mx-auto mb-2"></i>${this.t('noKpiForRole', 'Votre rôle ne donne accès à aucun indicateur métier : seuls les blocs autorisés apparaissent ici.')}</div>`;
  },

  chartTile(title, badge, canvasId) {
    return `<div class="sari-tile p-5"><div class="flex justify-between items-center mb-4"><h3 class="font-bold text-base text-slate-900 dark:text-white">${title}</h3><span class="sari-badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">${badge}</span></div><div class="h-64 relative"><canvas id="${canvasId}"></canvas></div></div>`;
  },
  chartsHtml() {
    const charts = [];
    if (this.can('inventory', 'view')) charts.push(this.chartTile(this.t('stockMovementsChart', 'Mouvements stock (entrées / sorties)'), this.t('last6Months', '6 derniers mois'), 'chart-inventory-movement'));
    if (this.can('sales', 'view') || this.can('reports', 'view')) charts.push(this.chartTile(this.t('monthlySalesChart', 'Évolution du chiffre d’affaires (DZD)'), this.t('algerOranConstantine', 'Alger / Oran / Constantine'), 'chart-monthly-sales'));
    if (this.can('inventory', 'view')) charts.push(this.chartTile(this.t('categoryChart', 'Répartition par catégorie'), this.t('catalogSub', 'Catalogue médical'), 'chart-category-dist'));
    if (this.can('importExport', 'view')) charts.push(this.chartTile(this.t('sourcingChart', 'Sourcing import vs local'), this.t('sourcingSub', 'Comparaison'), 'chart-import-ratio'));
    if (this.can('tenders', 'view')) charts.push(this.chartTile(this.t('tenderPipelineChart', 'Pipeline appels d’offres'), this.t('pipelineSub', 'Gagnés / perdus / en cours'), 'chart-tender-pipeline'));
    if (!charts.length) return '';
    return `<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">${charts.join('')}</div>`;
  },

  listsHtml() {
    const sections = [];
    if (this.can('tenders', 'view')) {
      const tenders = (this.state.data.tenders || []).filter((tender) => ['inPreparation', 'submitted', 'underEvaluation'].includes(tender.status)).sort((a, b) => new Date(a.submissionDeadline) - new Date(b.submissionDeadline)).slice(0, 4);
      sections.push({ title: this.t('activeTendersList', 'Appels d’offres en cours & échéances'), rows: tenders.map((tender) => `<button onclick="window.app.navigate('tenders')" class="flex justify-between items-center p-3 border-b hover:bg-slate-50 dark:hover:bg-slate-800/60 w-full text-left"><div><b class="text-sm">${SariUtils.escapeHtml(tender.tenderReference || tender.referenceCode || tender.id)}</b><p class="text-[11px] text-slate-500">${SariUtils.escapeHtml(tender.title || tender.hospital || '')}</p></div><span class="font-mono-tech text-[11px] text-sari-amber">${i18n.formatDate(tender.submissionDeadline)}</span></button>`) });
    }
    if (this.can('importExport', 'view')) {
      const shipments = (this.state.data.shipments || []).filter((shipment) => shipment.status === 'inTransit' || shipment.status === 'customsClearance').slice(0, 4);
      sections.push({ title: this.t('shipmentsList', 'Expéditions en transit'), rows: shipments.map((shipment) => `<button onclick="window.app.navigate('importExport')" class="flex justify-between items-center p-3 border-b hover:bg-slate-50 dark:hover:bg-slate-800/60 w-full text-left"><div><b class="text-sm">${SariUtils.escapeHtml(shipment.referenceCode || shipment.id)}</b><p class="text-[11px] text-slate-500">${SariUtils.escapeHtml(shipment.supplierName || '')}</p></div><span class="sari-badge text-[9px] bg-sari-amber/15 text-sari-amber">${SariUtils.escapeHtml(shipment.status || '')}</span></button>`) });
    }
    if (this.can('leaves', 'view') || this.can('hr', 'view')) {
      const leaves = (this.state.data.leaveRequests || []);
      const employees = this.state.data.employees || [];
      const today = window.SariCore.leave.isoDate(new Date());
      const upcoming = leaves.filter((record) => ['approved', 'taken'].includes(record.status) && record.endDate >= today).sort((a, b) => String(a.startDate).localeCompare(String(b.startDate))).slice(0, 4);
      sections.push({ title: this.t('upcomingLeavesList', 'Congés à venir'), rows: upcoming.map((record) => `<button onclick="window.app.navigate('leaves')" class="flex justify-between items-center p-3 border-b hover:bg-slate-50 dark:hover:bg-slate-800/60 w-full text-left"><div><b class="text-sm">${SariUtils.escapeHtml(record.employeeName || (employees.find((employee) => employee.id === record.employeeId)?.firstName || record.employeeId))}</b><p class="text-[11px] text-slate-500">${i18n.formatDate(record.startDate)} → ${i18n.formatDate(record.endDate)}</p></div><span class="text-[11px]">${SariUtils.escapeHtml((this.state.data.leaveTypes || []).find((type) => type.id === record.typeId)?.name?.[i18n.currentLang] || (this.state.data.leaveTypes || []).find((type) => type.id === record.typeId)?.name?.fr || '')}</span></button>`) });
    }
    if (!sections.length) return '';
    return `<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">${sections.map((section) => `<div class="sari-tile p-5"><h3 class="font-bold text-base text-slate-900 dark:text-white mb-2">${section.title}</h3>${section.rows.join('') || `<p class="text-xs text-slate-400 p-3">${this.t('nothingHere', 'Rien à afficher pour le moment.')}</p>`}</div>`).join('')}</div>`;
  },

  notificationsHtml() {
    const notifications = (this.state.data.notifications || []).filter((notification) => !notification.targetUserId || notification.targetUserId === window.auth?.currentUser?.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    return `<div class="sari-tile p-5"><div class="flex justify-between items-center mb-3"><h3 class="font-bold text-base flex gap-2"><i data-lucide="bell" class="text-sari-blue"></i>${this.t('myNotifications', 'Mes notifications')}</h3>
      <button onclick="window.app.openNotificationsModal()" class="text-xs font-bold text-sari-blue">${this.t('seeAll', 'Tout voir')} →</button></div>
      ${notifications.map((notification) => `<div class="flex gap-3 p-3 border-b last:border-0 items-start"><span class="w-8 h-8 rounded-lg grid place-items-center shrink-0 ${notification.isRead ? 'bg-slate-100 text-slate-400' : 'bg-sari-blue/10 text-sari-blue'}"><i data-lucide="${notification.type === 'message' ? 'message-square' : notification.type === 'contract' ? 'file-signature' : notification.type === 'leave' ? 'calendar-clock' : 'bell'}"></i></span>
      <div class="min-w-0"><b class="text-sm ${notification.isRead ? 'text-slate-500' : ''}">${SariUtils.escapeHtml(notification.titleI18n?.[i18n.currentLang] || notification.titleI18n?.fr || notification.title || '')}</b>
      <p class="text-[11px] text-slate-500 truncate">${SariUtils.escapeHtml(notification.message || '')}</p><time class="text-[9px] text-slate-400">${new Date(notification.createdAt).toLocaleString()}</time></div></div>`).join('') || `<p class="text-xs text-slate-400 p-3">${this.t('noNotifications', 'Aucune notification.')}</p>`}
    </div>`;
  },

  afterRender() {
    if (window.sariCharts) {
      if (this.can('inventory', 'view')) window.sariCharts.renderInventoryMovement('chart-inventory-movement');
      if (this.can('sales', 'view') || this.can('reports', 'view')) window.sariCharts.renderMonthlySales('chart-monthly-sales');
      if (this.can('inventory', 'view')) window.sariCharts.renderCategoryDistribution('chart-category-dist');
      if (this.can('importExport', 'view')) window.sariCharts.renderImportRatio('chart-import-ratio');
      if (this.can('tenders', 'view')) window.sariCharts.renderTenderPipeline('chart-tender-pipeline');
    }
  },
};
window.DashboardModule = DashboardModule;
export {};
