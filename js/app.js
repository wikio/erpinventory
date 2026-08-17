/**
 * SARI Système - Main Application Controller & Router (Apple-Style Full-Width)
 * Medical Equipment & Consumables Distribution Management System - Algeria
 * Controls SPA routing, 4 native themes, Lucide icons, DB Agnostic switcher,
 * global shortcuts (Ctrl+K), notification drawer, and toast alerts.
 */

class SariApp {
  constructor() {
    this.activeModule = 'dashboard';
    // Values are populated on first navigation by the Vite dynamic-import
    // registry. Keeping the route keys here preserves hash routing and RBAC.
    this.modules = Object.fromEntries([
      'dashboard', 'inventory', 'suppliers', 'importExport', 'tenders', 'sales',
      'customers', 'reports', 'translations', 'auditLogs', 'settings', 'hr',
      'tasks', 'portal', 'purchases', 'ged', 'taxes', 'masterData',
      'inventoryOps', 'bulkImport', 'api', 'users', 'smtp', 'cnas', 'casnos', 'commerceDirection', 'companyMinutes', 'payslips',
      'leaves', 'contracts', 'occasionalWorkers', 'documentDetail', 'bankAccountDetail'
    ].map(name => [name, null]));
  }

  async init() {
    console.log('[SARI Système] Initializing secure application shell...');
    if (window.auth) {
      const authenticated = await window.auth.init();
      if (!authenticated) {
        window.SariIcons?.hydrate();
        return false;
      }
    }
    return this.initializeWorkspace();
  }

  loadingMarkup(message = i18n?.t?.('loadingModule', 'Chargement du module') || 'Chargement du module') {
    return `<div class="sari-grid-loader-wrap" role="status" aria-live="polite"><div class="sari-grid-loader" aria-hidden="true">${Array.from({length:9},(_,index)=>`<span style="--grid-index:${index}"></span>`).join('')}</div><p>${SariUtils.escapeHtml(message)}…</p></div>`;
  }

  showBootLoader() {
    let loader = document.getElementById('sari-boot-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'sari-boot-loader';
      loader.className = 'sari-boot-loader sari-grid-pattern';
      document.body.appendChild(loader);
    }
    loader.innerHTML = this.loadingMarkup(i18n?.t?.('loadingModule', 'Ouverture de votre espace SARI') || 'Ouverture de votre espace SARI');
    loader.classList.remove('hidden');
  }

  hideBootLoader() { document.getElementById('sari-boot-loader')?.classList.add('hidden'); }

  async continueAfterAuthentication() {
    window.auth?.hideLogin();
    this.showBootLoader();
    return this.initializeWorkspace();
  }

  async initializeWorkspace() {
    if (this.workspaceReady) return true;
    if (this.workspacePromise) return this.workspacePromise;
    this.showBootLoader();
    this.workspacePromise = (async () => {
      try {
        if (window.dbAdapter) await window.dbAdapter.init();
        else if (window.sariDB) await window.sariDB.init();
      } catch (error) {
        console.error('[SARI Système] IndexedDB startup failed:', error);
        this.hideBootLoader();
        window.auth?.showLogin('La base locale ne peut pas être ouverte. Fermez les autres onglets SARI, puis actualisez la page.');
        return false;
      }

      await window.sariDB?.migrateGedDocumentsToDisk?.();

      if (window.i18n) await window.i18n.init();
      await window.UICopy?.persistCatalog();
      await window.DynamicI18n?.init();
      await window.OptionCatalog?.init();
      window.TranslationOverlay?.init();
      const brandingSettings = await window.sariDB?.getById('settings', 'app-settings');
      let portableSettings = {};
      try {
        const response = await fetch('/api/content/config/site.json', { credentials: 'same-origin' });
        if (response.ok) portableSettings = (await response.json()).content || {};
      } catch (_) { /* offline: IndexedDB settings remain authoritative */ }
      // The value saved by “Raison sociale / nom de société” is authoritative.
      // Portable defaults may fill missing fields but must never overwrite local Company settings.
      this.applyBranding({ ...portableSettings, ...(brandingSettings || {}) });

      if (window.auth?.loadPermissions) await window.auth.loadPermissions();
      this.configureAdaptiveLayer();
      await window.SariScanner?.init?.();
      this.renderMobileBottomNav();
      window.auth?.hideLogin();
      if (window.syncController) await window.syncController.init();

      this.setNativeTheme(localStorage.getItem('sari_native_theme') || 'classic', false);
      this.registerServiceWorker();
      this.setupEventListeners();
      window.AppValidator?.init();
      this.initializeSidebarMenus();
      this.updateNavigationPermissions();
      this.applySidebarPreference();

      const hash = window.location.hash.replace('#', '');
      await this.navigate(Object.prototype.hasOwnProperty.call(this.modules, hash) ? hash : 'dashboard');
      await this.updateNotificationsBadge();
      window.DocumentRegression?.run().catch(error => console.warn('[Print regression]', error));
      this.workspaceReady = true;
      this.hideBootLoader();
      window.SariIcons?.hydrate();
      console.log('[SARI Système] Application ready in offline-first PWA mode!');
      return true;
    })().catch(error=>{console.error('[SARI Système] Workspace initialization failed:',error);this.hideBootLoader();window.auth?.showLogin(`Initialisation de l’application impossible : ${error?.message||'erreur inconnue'}.`);return false;}).finally(() => { this.workspacePromise = null; });
    return this.workspacePromise;
  }

  cachedBranding(){try{return JSON.parse(localStorage.getItem('sari_branding_identity')||'{}')||{};}catch(_){return{};}}
  applyCachedBranding(){this.applyBranding(this.cachedBranding());}

  applyBranding(settings = {}) {
    const cached=this.cachedBranding(),has=(key)=>Object.prototype.hasOwnProperty.call(settings,key),logo=has('siteLogo')?settings.siteLogo:(cached.siteLogo||localStorage.getItem('sari_site_logo')||''),companyName=has('companyName')&&settings.companyName?settings.companyName:(cached.companyName||'SARI SYSTÈME'),companySubtitle=has('companySubtitle')&&settings.companySubtitle?settings.companySubtitle:(cached.companySubtitle||'Distribution Matériel Médical & Consommables');
    document.querySelectorAll('[data-sari-site-logo]').forEach(img=>{img.src=logo;img.classList.toggle('hidden',!logo);});
    document.querySelectorAll('[data-sari-default-logo]').forEach(fallback=>fallback.classList.toggle('hidden',Boolean(logo)));
    const favicon=document.getElementById('sari-favicon'),apple=document.getElementById('sari-apple-touch-icon'),defaultIcon='/assets/icon-192.svg';
    if(favicon){favicon.href=logo||defaultIcon;favicon.type=logo.startsWith('data:image/png')?'image/png':logo.startsWith('data:image/jpeg')?'image/jpeg':logo.startsWith('data:image/webp')?'image/webp':'image/svg+xml';}
    if(apple)apple.href=logo||defaultIcon;
    if(logo)localStorage.setItem('sari_site_logo',logo);else localStorage.removeItem('sari_site_logo');
    localStorage.setItem('sari_branding_identity',JSON.stringify({siteLogo:logo,companyName,companySubtitle,updatedAt:Date.now()}));
    const values = {'login-company-name':companyName,'login-company-subtitle':companySubtitle,'header-company-name':companyName,'header-company-subtitle':companySubtitle,'sidebar-company-name':companyName,'footer-company-name':companyName,'sidebar-company-nif':settings.nif,'sidebar-company-address':settings.address,'footer-company-address':settings.address};
    for (const [id,value] of Object.entries(values)){const element=document.getElementById(id);if(element&&value){element.textContent=value;if(['login-company-name','login-company-subtitle','header-company-name','header-company-subtitle'].includes(id))element.title=String(value);}}
    document.title=`${companyName} — ${companySubtitle}`;
  }

  registerServiceWorker() {
    if (import.meta.env?.DEV) {
      navigator.serviceWorker?.getRegistrations?.().then(registrations=>registrations.forEach(registration=>registration.unregister()));
      return;
    }
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered successfully:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed (normal in some preview environments):', err);
          });
      });
    }
  }

  permissionForModule(moduleName) {
    if(moduleName==='documentDetail')return window.DocumentDetailModule?.state?.recordType==='purchaseDocument'?'purchases':'sales';
    if(moduleName==='bankAccountDetail'||moduleName==='users'||moduleName==='smtp')return 'settings';
    return ({ auditLogs:'settings', translations:'settings', settings:'settings', cnas:'taxes', casnos:'taxes', commerceDirection:'settings', companyMinutes:'settings', payslips:'hr', leaves:'leaves', contracts:'contracts', occasionalWorkers:'occasionalWorkers' })[moduleName] || moduleName;
  }

  /**
   * Section 304.5: an Administrator can block modules in the employee's
   * personal space until the rules-acceptance / signature onboarding is done.
   */
  async isOnboardingBlocked(moduleName) {
    if (moduleName === 'portal' || moduleName === 'dashboard') return false;
    const user = window.auth?.currentUser;
    const employee = window.auth?.employee;
    if (!user || !employee || employee.userId !== user.id) return false;
    if (user.role === 'admin') return false;
    const settings = await window.sariDB?.getById('settings', 'app-settings');
    const policy = settings?.portalAccessPolicy;
    if (!policy?.enabled || !Array.isArray(policy.blockedModules) || !policy.blockedModules.length) return false;
    if ((policy.exemptRoles || []).includes(user.role)) return false;
    if (!policy.blockedModules.includes(moduleName)) return false;
    const [contracts, acceptances, declarations, rules] = await Promise.all(['employmentContracts', 'ruleAcceptances', 'conflictDeclarations', 'workRules'].map((store) => window.sariDB.getAll(store)));
    const latest = (kind) => rules.filter((rule) => rule.kind === kind).sort((a, b) => Number(b.version) - Number(a.version))[0]?.version;
    const onboarding = window.SariCore.leave.computeOnboarding({ employeeId: employee.id, acceptances, contracts, declarations, rulesVersion: latest('rules'), termsVersion: latest('terms') });
    if (onboarding.done) return false;
    const labels = {
      rules_read: i18n.t('stepRulesRead', 'Lire le règlement intérieur'),
      rules_accepted: i18n.t('stepRulesAccepted', 'Accepter & signer le règlement'),
      terms_accepted: i18n.t('stepTermsAccepted', 'Accepter & signer les conditions générales'),
      contract_signed: i18n.t('stepContractSigned', 'Signer mon contrat de travail'),
      conflict_declared: i18n.t('stepConflictDeclared', 'Compléter la déclaration de conflits d’intérêts'),
    };
    const doneCount = onboarding.steps.filter((step) => step.done).length;
    const pct = Math.round((doneCount / onboarding.steps.length) * 100);
    const view = document.getElementById('sari-main-view');
    if (view) view.innerHTML = `<div class="sari-tile p-10 max-w-3xl mx-auto">
      <i data-lucide="lock" class="w-12 h-12 text-sari-amber mx-auto mb-3"></i>
      <h2 class="text-xl font-extrabold text-slate-900 dark:text-white text-center">${i18n.t('moduleLockedTitle', 'Module temporairement verrouillé')}</h2>
      <p class="text-sm text-slate-500 mt-2 text-center">${SariUtils.escapeHtml(policy.messageI18n?.[i18n.currentLang] || policy.messageI18n?.fr || '')}</p>
      <div class="h-2 bg-slate-200 rounded-full mt-4 overflow-hidden max-w-md mx-auto"><div class="h-full bg-sari-amber" style="width:${pct}%"></div></div>
      <p class="text-xs text-center text-slate-400 mt-1">${doneCount}/${onboarding.steps.length} ${i18n.t('stepsCompleted', 'étape(s) terminée(s)')}</p>
      <div class="max-w-md mx-auto mt-4 space-y-2">${onboarding.steps.map((step, index) => `<div class="flex items-center gap-2 text-xs p-2 rounded-lg border ${step.done ? 'border-green-300 bg-green-50 dark:bg-green-500/10 text-green-700' : 'border-slate-200 text-slate-500'}"><span class="w-5 h-5 rounded-full grid place-items-center text-[9px] font-black shrink-0 ${step.done ? 'bg-green-500 text-white' : 'bg-slate-200'}">${index + 1}</span>${SariUtils.escapeHtml(labels[step.key] || step.key)}${step.done ? ' ✓' : ''}</div>`).join('')}</div>
      <div class="text-center mt-5"><button onclick="window.app.navigate('portal')" class="sari-btn px-5 py-2 bg-sari-blue text-white">${i18n.t('goToOnboarding', 'Terminer mon parcours d’intégration')}</button></div>
    </div>`;
    window.SariIcons?.hydrate();
    return true;
  }

  initializeSidebarMenus() {
    const sidebar=document.getElementById('mobile-sidebar');if(!sidebar||sidebar.dataset.grouped)return;sidebar.dataset.grouped='true';const root=sidebar.firstElementChild;
    const groups=[
      {id:'operations',key:'menuOperations',label:i18n.t('menuOperations'),icon:'blocks',items:['inventory','inventoryOps','importExport','tenders']},
      {id:'commerce',key:'menuCommerce',label:i18n.t('menuCommerce'),icon:'shopping-bag',items:['sales','purchases','customers','suppliers']},
      {id:'people',key:'menuPeople',label:i18n.t('menuPeople'),icon:'users-round',items:['hr','payslips','leaves','contracts','occasionalWorkers','tasks','portal']},
      {id:'analysis',key:'menuAnalytics',label:i18n.t('menuAnalytics'),icon:'chart-no-axes-combined',items:['reports','ged','taxes','cnas','casnos']},
      {id:'admin',key:'menuAdministration',label:i18n.t('menuAdministration'),icon:'settings-2',items:['bulkImport','api','users','commerceDirection','companyMinutes','masterData','translations','auditLogs','settings']}
    ];
    const saved=JSON.parse(localStorage.getItem('sari_submenus')||'{}');
    groups.forEach(group=>{const wrapper=document.createElement('div');wrapper.className='sidebar-submenu';wrapper.dataset.menuGroup=group.id;const expanded=saved[group.id]!==false;wrapper.innerHTML=`<button class="sidebar-submenu-toggle sari-sidebar-item w-full" aria-expanded="${expanded}" title="${group.label}"><i data-lucide="${group.icon}" class="w-4 h-4"></i><span class="sari-nav-label" data-i18n="${group.key}">${group.label}</span><i data-lucide="chevron-down" class="submenu-chevron w-3 h-3"></i></button><div class="sidebar-submenu-items ${expanded?'':'collapsed'}"></div>`;const items=wrapper.querySelector('.sidebar-submenu-items');group.items.forEach(module=>{const item=root.querySelector(`[data-nav-item="${module}"]`);if(item){item.classList.add('sidebar-child-item');items.appendChild(item);}});wrapper.querySelector('.sidebar-submenu-toggle').onclick=()=>this.toggleSubmenu(group.id);root.appendChild(wrapper);});
    root.querySelectorAll('.sidebar-section-label').forEach(label=>label.remove());this.refreshNavigationTooltips();if(typeof lucide!=='undefined')lucide.createIcons();
  }

  toggleSubmenu(id){const group=document.querySelector(`[data-menu-group="${id}"]`),items=group?.querySelector('.sidebar-submenu-items');if(!items)return;const collapsed=items.classList.toggle('collapsed');group.querySelector('.sidebar-submenu-toggle').setAttribute('aria-expanded',String(!collapsed));const saved=JSON.parse(localStorage.getItem('sari_submenus')||'{}');saved[id]=!collapsed;localStorage.setItem('sari_submenus',JSON.stringify(saved));}

  refreshNavigationTooltips(){document.querySelectorAll('[data-nav-item]').forEach(item=>{const label=item.querySelector('.sari-nav-label')?.textContent.trim()||item.dataset.navItem;item.title=label;item.setAttribute('aria-label',label);});}

  updateNavigationPermissions(){document.querySelectorAll('[data-nav-item]').forEach(item=>{const allowed=!window.auth||window.auth.can(this.permissionForModule(item.dataset.navItem),'view');item.classList.toggle('permission-hidden',!allowed);});document.querySelectorAll('[data-menu-group]').forEach(group=>{const visible=[...group.querySelectorAll('[data-nav-item]')].some(item=>!item.classList.contains('permission-hidden'));group.classList.toggle('permission-hidden',!visible);});this.refreshNavigationTooltips();}

  applySidebarPreference() {
    const sidebar = document.getElementById('mobile-sidebar');
    if (!sidebar) return;
    const collapsed = localStorage.getItem('sari_sidebar_collapsed') === 'true';
    sidebar.classList.toggle('sidebar-collapsed', collapsed && window.innerWidth >= 1024);
    const icon = sidebar.querySelector('.sidebar-toggle-icon');
    if (icon) icon.setAttribute('data-lucide', collapsed ? 'panel-left-open' : 'panel-left-close');
  }

  toggleSidebarCollapse() {
    const sidebar = document.getElementById('mobile-sidebar'); if (!sidebar) return;
    const collapsed = !sidebar.classList.contains('sidebar-collapsed');
    sidebar.classList.toggle('sidebar-collapsed', collapsed);
    localStorage.setItem('sari_sidebar_collapsed', String(collapsed));
    this.applySidebarPreference();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  toggleMobileSidebar() { document.body.classList.toggle('sidebar-mobile-open'); }
  closeMobileSidebar() { document.body.classList.remove('sidebar-mobile-open'); }

  setupEventListeners() {
    // Re-render active view on language change
    window.addEventListener('sari-language-changed', () => {
      this.navigate(this.activeModule, false);
      this.updateNavigationLabels();
      this.refreshNavigationTooltips();
    });

    // Re-render active view on role change
    window.addEventListener('sari-role-changed', () => {
      this.updateNavigationPermissions();
      this.navigate(this.activeModule, false);
    });

    // Re-render active view on DB driver change
    window.addEventListener('sari-db-driver-changed', (e) => {
      this.showToast(`Moteur de base de données basculé: ${e.detail.driver.toUpperCase()}`, 'info');
      this.navigate(this.activeModule, false);
    });

    // Hash navigation
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (Object.prototype.hasOwnProperty.call(this.modules, hash) && hash !== this.activeModule) {
        this.navigate(hash, false);
      }
    });

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K -> Global Quick Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openGlobalSearchModal();
      }
      // Alt+N -> New Product
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        this.navigate('inventory');
        setTimeout(() => window.InventoryModule && window.InventoryModule.openModal(), 200);
      }
      // Alt+S -> POS Sales
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.navigate('sales');
      }
    });
  }

  toggleTopbarOverflow(event){event?.stopPropagation?.();const menu=document.getElementById('topbar-overflow-menu'),trigger=document.getElementById('topbar-overflow-trigger');if(!menu)return;const open=menu.classList.contains('hidden');menu.classList.toggle('hidden',!open);trigger?.setAttribute('aria-expanded',String(open));if(open&&!this._topbarOverflowBound){this._topbarOverflowBound=true;document.addEventListener('click',click=>{if(!click.target.closest('.topbar-overflow-wrap'))this.closeTopbarOverflow();});document.addEventListener('keydown',key=>{if(key.key==='Escape')this.closeTopbarOverflow();});}}
  closeTopbarOverflow(){document.getElementById('topbar-overflow-menu')?.classList.add('hidden');document.getElementById('topbar-overflow-trigger')?.setAttribute('aria-expanded','false');}

  configureAdaptiveLayer(){const apply=()=>{const width=window.innerWidth,form=width<=640?'mobile':width<=1023?'tablet':'desktop';document.body.dataset.formFactor=form;const sidebar=document.getElementById('mobile-sidebar'),topbar=document.querySelector('.sari-topbar');if(topbar)document.documentElement.style.setProperty('--sari-topbar-height',`${Math.ceil(topbar.getBoundingClientRect().height)}px`);if(form==='tablet')sidebar?.classList.add('sidebar-collapsed');else if(form==='desktop'&&localStorage.getItem('sari_sidebar_collapsed')!=='true')sidebar?.classList.remove('sidebar-collapsed');this.enhanceResponsiveTables();this.renderMobileBottomNav();};apply();if(!this._adaptiveBound){this._adaptiveBound=true;window.addEventListener('resize',SariUtils.debounce?SariUtils.debounce(apply,150):apply);const topbar=document.querySelector('.sari-topbar');if(topbar&&globalThis.ResizeObserver){this._topbarObserver=new ResizeObserver(apply);this._topbarObserver.observe(topbar);}}}
  mobileShortcutCandidates(){return[['dashboard','layout-dashboard','dashboard','Tableau'],['inventory','package','inventory','Stock'],['sales','shopping-cart','sales','Ventes'],['purchases','receipt-text','purchases','Achats'],['tasks','square-kanban','tasks','Tâches'],['portal','contact-round','portal','Mon espace']];}
  renderMobileBottomNav(){const nav=document.getElementById('sari-mobile-bottom-nav');if(!nav)return;const permitted=this.mobileShortcutCandidates().filter(([, ,permission])=>!window.auth||window.auth.can(this.permissionForModule(permission),'view')),preferred=permitted.filter(([module])=>module==='dashboard'||module===this.activeModule||!['tasks','portal'].includes(module)),items=[...new Map([...preferred,...permitted].map(item=>[item[0],item])).values()].slice(0,window.SariScanner?.available?4:5);nav.innerHTML=items.map(([module,icon,,fallback])=>`<button type="button" data-mobile-nav="${module}" class="${this.activeModule===module?'active':''}" onclick="app.navigate('${module}')" title="${SariUtils.escapeHtml(i18n?.t?.(module,fallback)||fallback)}"><i data-lucide="${icon}"></i><span>${i18n?.t?.(module,fallback)||fallback}</span></button>`).join('')+(window.SariScanner?.available?`<button type="button" class="mobile-scan-action" onclick="SariScanner.open()"><i data-lucide="scan-line"></i><span>${i18n?.t?.('scan','Scanner')||'Scanner'}</span></button>`:'');window.SariIcons?.hydrate();}

  async navigate(moduleName, updateHash = true) {
    if (!(moduleName in this.modules)) moduleName = 'dashboard';

    const permissionModule = this.permissionForModule(moduleName);
    if (window.auth && !window.auth.can(permissionModule, 'view')) {
      const view = document.getElementById('sari-main-view');
      if (view) view.innerHTML = `<div class="sari-tile p-10 text-center max-w-2xl mx-auto"><i data-lucide="shield-x" class="w-12 h-12 text-red-500 mx-auto mb-3"></i><h2 class="text-xl font-extrabold text-slate-900 dark:text-white">Accès non autorisé</h2><p class="text-sm text-slate-500 mt-2">Votre rôle ne dispose pas de l’autorisation <code>${permissionModule}.view</code>.</p><button onclick="window.app.navigate('dashboard')" class="sari-btn px-4 py-2 mt-5 bg-sari-blue text-white">Retour au tableau de bord</button></div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    // Section 304.5: Administrator-configurable restriction until the employee
    // completes the rules-acceptance / signature onboarding process.
    if (window.auth && await this.isOnboardingBlocked(moduleName)) return;

    this.activeModule = moduleName;
    this.renderMobileBottomNav();
    if (updateHash && window.location.hash !== `#${moduleName}`) {
      window.location.hash = `#${moduleName}`;
    }

    // Highlight sidebar menu items
    document.querySelectorAll('[data-nav-item]').forEach(el => {
      const navModule = el.getAttribute('data-nav-item');
      if (navModule === moduleName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Check RBAC read-only warning
    if (window.auth) {
      window.auth.updateUIForPermissions(moduleName);
    }

    // Load and render the functional domain only when it is first visited.
    let mod = this.modules[moduleName];
    if (!mod && window.SariModuleLoader) {
      const view = document.getElementById('sari-main-view');
      if (view) view.innerHTML = `<div class="sari-tile p-10 text-center sari-grid-pattern">${this.loadingMarkup()}</div>`;
      try {
        mod = await window.SariModuleLoader.load(moduleName);
        this.modules[moduleName] = mod;
      } catch (error) {
        console.error(`[SARI Système] Failed to load module ${moduleName}:`, error);
        if (view) view.innerHTML = `<div class="sari-tile p-10 text-center"><h2 class="font-extrabold text-red-600">Module indisponible</h2><p class="mt-2 text-sm text-slate-500">${String(error.message || error)}</p><button onclick="window.app.navigate('dashboard')" class="sari-btn px-4 py-2 mt-4 bg-sari-blue text-white">Retour</button></div>`;
        return;
      }
    }
    if (mod && typeof mod.render === 'function') await mod.render('sari-main-view');
    await new Promise(resolve => requestAnimationFrame(resolve));

    this.enhanceSearchInputs();
    this.enhanceResponsiveTables();
    window.UICopy?.apply(document.getElementById('sari-main-view'), window.i18n?.currentLang || 'fr');
    // Refresh Lucide icons
    window.SariIcons?.hydrate();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  enhanceResponsiveTables() {
    const width=window.innerWidth,isTablet=width>640&&width<=1023;
    document.querySelectorAll('table.sari-table').forEach(table=>{
      const labels=[...table.querySelectorAll('thead th')].map(cell=>cell.textContent.trim());
      table.querySelectorAll('tbody tr').forEach(row=>[...row.children].forEach((cell,index)=>{if(!cell.dataset.label)cell.dataset.label=labels[index]||'';}));
      const container=table.parentElement,available=Math.min(container?.clientWidth||width,width),overflowing=table.scrollWidth>available+2;
      table.classList.toggle('responsive-card-table',isTablet&&overflowing);
      container?.classList.toggle('responsive-card-container',isTablet&&overflowing);
    });
    this.enhanceInternalSubmenus();
  }
  enhanceInternalSubmenus(){const view=document.getElementById('sari-main-view');if(!view)return;view.querySelectorAll('nav').forEach(nav=>nav.classList.add('sticky-section-tabs'));view.querySelectorAll('.sari-tile').forEach(tile=>{const directButtons=[...tile.children].filter(child=>child.tagName==='BUTTON'),tabButtons=[...tile.querySelectorAll(':scope > button[onclick*="setTab"],:scope > button[onclick*="state.tab"]')];if(directButtons.length>=2&&tabButtons.length>=2)tile.classList.add('sticky-section-tabs');});}


  enhanceSearchInputs() {
    document.querySelectorAll('input[onkeydown*="searchKeyHandler"]').forEach(input => {
      if (input.dataset.searchEnhanced) return; input.dataset.searchEnhanced='true'; input.style.paddingInlineEnd='2.5rem';
      const parent=input.parentElement; if(!parent)return; parent.style.position='relative';
      if(parent.querySelector('.sari-search-submit'))return;const button=document.createElement('button');button.type='button';button.className='sari-search-submit';button.setAttribute('aria-label','Lancer la recherche');button.innerHTML='<i data-lucide="search"></i>';button.onclick=()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));parent.appendChild(button);
    });
  }

  updateNavigationLabels() {
    if (window.i18n) {
      window.i18n.translateDOM();
    }
  }

  setNativeTheme(themeName, showToast = true) {
    const validThemes = ['classic', 'clinical', 'sunset', 'midnight'];
    if (!validThemes.includes(themeName)) {
      themeName = 'classic';
    }

    document.body.classList.remove('theme-classic', 'theme-clinical', 'theme-sunset', 'theme-midnight', 'theme-light', 'theme-dark');
    document.body.classList.add(`theme-${themeName}`);

    // If midnight, also apply theme-dark for Tailwind dark: classes
    if (themeName === 'midnight') {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.add('theme-light');
    }

    localStorage.setItem('sari_native_theme', themeName);

    // Update active theme selector card UI if present
    if (showToast) {
      const names = {
        classic: 'Sari Classic (Palette Officielle)',
        clinical: 'Sari Clinical (Teal Sober)',
        sunset: 'Sari Sunset (Orange/Ambre Commercial)',
        midnight: 'Sari Midnight (Dark Mode Entrepôt)'
      };
      this.showToast(`Thème appliqué: ${names[themeName] || themeName}`, 'success');
      this.navigate(this.activeModule, false);
    }
  }

  setTheme(themeName) {
    if (themeName === 'dark') {
      this.setNativeTheme('midnight');
    } else {
      this.setNativeTheme('classic');
    }
  }

  /**
   * Toast Notification System
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('sari-toast-container');
    if (!container) return;

    let bgClass = 'bg-slate-900 border-sari-blue text-white';
    let icon = 'info';
    if (type === 'success') {
      bgClass = 'bg-slate-900 border-sari-lime text-white';
      icon = 'check-circle';
    } else if (type === 'error') {
      bgClass = 'bg-red-900 border-red-400 text-white';
      icon = 'alert-circle';
    } else if (type === 'warning') {
      bgClass = 'bg-amber-900 border-sari-amber text-white';
      icon = 'alert-triangle';
    }

    const toast = document.createElement('div');
    toast.className = `p-4 rounded-xl border-2 shadow-2xl flex items-center gap-3 text-sm transform transition-all duration-300 translate-y-0 ${bgClass}`;
    toast.innerHTML = `
      <i data-lucide="${icon}" class="w-5 h-5 text-sari-blue"></i>
      <span class="font-bold">${message}</span>
    `;

    container.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /**
   * Notification Drawer / Center
   */
  async updateNotificationsBadge() {
    if (!window.sariDB) return;
    try {
      const allNotifs = await window.sariDB.getAll('notifications');
      const notifs = allNotifs.filter(n => !n.targetUserId || n.targetUserId === window.auth?.currentUser?.id);
      const unread = notifs.filter(n => !n.isRead).length;
      const badge = document.getElementById('sari-notif-badge');
      if (badge) {
        badge.textContent = unread > 0 ? unread : '';
        badge.classList.toggle('hidden', unread === 0);
      }
    } catch (e) {
      // ignore
    }
  }

  async openNotificationsModal() {
    const modalEl = document.getElementById('sari-modal-root');
    if (!modalEl || !window.sariDB) return;

    const notifs = (await window.sariDB.getAll('notifications')).filter(n => !n.targetUserId || n.targetUserId === window.auth?.currentUser?.id);
    notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-start justify-end p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-md bg-white dark:bg-slate-900 p-5 shadow-2xl mt-14 mr-4 text-slate-900 dark:text-white">
          <div class="flex justify-between items-center border-b pb-3 mb-4">
            <div class="flex items-center gap-2">
              <i data-lucide="bell" class="w-5 h-5 text-sari-blue"></i>
              <h3 class="font-bold text-base">Centre de Notifications SARI</h3>
            </div>
            <button onclick="window.app.closeModalRoot()" class="text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="space-y-3 max-h-[65vh] overflow-y-auto pr-1 text-sm">
            ${notifs.length === 0 ? `
              <div class="p-6 text-center text-slate-400">Aucune notification active.</div>
            ` : notifs.map(n => {
              let icon = 'info';
              if (n.type === 'near_expiry') icon = 'alert-triangle';
              if (n.type === 'tender_deadline') icon = 'file-check';
              if (n.type === 'shipment') icon = 'ship';

              return `
                <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded border ${n.isRead ? 'opacity-70' : 'border-l-4 border-l-sari-blue font-semibold'}">
                  <div class="flex items-start gap-2.5">
                    <i data-lucide="${icon}" class="w-4 h-4 text-sari-blue mt-0.5"></i>
                    <div class="flex-1">
                      <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-200">${n.titleI18n?.[i18n.currentLang]||n.title}</span>
                        <span class="text-[10px] text-slate-400">${i18n ? i18n.formatDate(n.createdAt) : ''}</span>
                      </div>
                      <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">${n.messageI18n?.[i18n.currentLang]||n.message}</p>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="mt-4 pt-3 border-t flex justify-between items-center">
            <button onclick="window.app.markAllNotificationsRead()" class="text-xs text-sari-blue font-bold hover:underline">
              Tout marquer comme lu
            </button>
            <button onclick="window.app.closeModalRoot()" class="sari-btn px-4 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-xs">
              Fermer
            </button>
          </div>
        </div>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async markAllNotificationsRead() {
    if (!window.sariDB) return;
    const notifs = (await window.sariDB.getAll('notifications')).filter(n => !n.targetUserId || n.targetUserId === window.auth?.currentUser?.id);
    for (const n of notifs) {
      if (!n.isRead) {
        n.isRead = true;
        await window.sariDB.save('notifications', n);
      }
    }
    await this.updateNotificationsBadge();
    this.closeModalRoot();
    this.showToast('Toutes les notifications ont été marquées comme lues', 'success');
  }

  closeModalRoot() {
    const modalEl = document.getElementById('sari-modal-root');
    if (modalEl) modalEl.innerHTML = '';
  }

  /**
   * Global Quick Search Modal (Ctrl+K / Cmd+K)
   */
  async openGlobalSearchModal() {
    const modalEl = document.getElementById('sari-modal-root');
    if (!modalEl || !window.sariDB) return;

    const products = await window.sariDB.getAll('products');
    const tenders = await window.sariDB.getAll('tenders');
    const shipments = await window.sariDB.getAll('shipments');
    const customers = await window.sariDB.getAll('customers');

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-start justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl mt-16 text-slate-900 dark:text-white">
          <div class="flex items-center gap-3 border-b pb-3 mb-4">
            <i data-lucide="search" class="w-5 h-5 text-sari-blue"></i>
            <input 
              type="text" 
              id="global-search-input" 
              placeholder="${i18n ? i18n.t('searchPlaceholder') : 'Rechercher...'}"
              oninput="window.app.handleGlobalSearch(this.value)"
              class="w-full bg-transparent border-none text-base font-medium focus:outline-none text-slate-900 dark:text-white"
              autofocus
            />
            <button onclick="window.app.closeModalRoot()" class="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono-tech">
              ESC
            </button>
          </div>

          <div id="global-search-results" class="space-y-2 max-h-[55vh] overflow-y-auto pr-1 text-sm">
            <div class="p-6 text-center text-slate-400 text-xs">
              Tapez au moins 2 caractères pour rechercher instantanément dans les produits, appels d'offres, expéditions et clients.
            </div>
          </div>

          <div class="mt-4 pt-3 border-t text-[11px] text-slate-500 flex justify-between items-center">
            <span><strong>Raccourcis :</strong> Alt+N (Produit) • Alt+S (POS) • Ctrl+K (Recherche)</span>
            <span>ERP SARI Système Algérie</span>
          </div>
        </div>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    setTimeout(() => {
      const inp = document.getElementById('global-search-input');
      if (inp) inp.focus();
    }, 50);

    // Cache items for quick search handler
    this._searchCache = { products, tenders, shipments, customers };
  }

  handleGlobalSearch(val) {
    const resBox = document.getElementById('global-search-results');
    if (!resBox || !this._searchCache) return;

    const q = (val || '').trim().toLowerCase();
    if (q.length < 2) {
      resBox.innerHTML = `
        <div class="p-6 text-center text-slate-400 text-xs">
          Tapez au moins 2 caractères pour rechercher instantanément dans les produits, appels d'offres, expéditions et clients.
        </div>
      `;
      return;
    }

    const prodMatches = this._searchCache.products.filter(p => 
      (p.sku && p.sku.toLowerCase().includes(q)) || 
      (p.name && p.name.toLowerCase().includes(q)) || 
      (p.lotNumber && p.lotNumber.toLowerCase().includes(q))
    ).slice(0, 4);

    const tenderMatches = this._searchCache.tenders.filter(t => 
      (t.id && t.id.toLowerCase().includes(q)) || 
      (t.title && t.title.toLowerCase().includes(q)) || 
      (t.issuingOrganization && t.issuingOrganization.toLowerCase().includes(q))
    ).slice(0, 3);

    const shipMatches = this._searchCache.shipments.filter(s => 
      (s.id && s.id.toLowerCase().includes(q)) || 
      (s.supplierName && s.supplierName.toLowerCase().includes(q))
    ).slice(0, 3);

    const custMatches = this._searchCache.customers.filter(c => 
      (c.name && c.name.toLowerCase().includes(q)) || 
      (c.taxId && c.taxId.toLowerCase().includes(q))
    ).slice(0, 3);

    let html = '';

    if (prodMatches.length > 0) {
      html += `
        <div class="text-xs font-bold uppercase text-sari-blue px-1 mb-1">Produits & Consommables Médicaux</div>
        ${prodMatches.map(p => `
          <div onclick="window.app.closeModalRoot(); window.app.navigate('inventory');" class="p-2.5 bg-slate-50 dark:bg-slate-800 rounded border hover:border-sari-blue cursor-pointer flex justify-between items-center">
            <div>
              <span class="font-mono-tech text-xs font-bold text-sari-blue">${p.sku}</span> • <strong>${p.name}</strong>
              <div class="text-xs text-slate-500">Lot: ${p.lotNumber || '-'}</div>
            </div>
            <span class="font-mono-tech font-bold text-xs">${i18n ? i18n.formatCurrency(p.sellingPrice) : p.sellingPrice}</span>
          </div>
        `).join('')}
      `;
    }

    if (tenderMatches.length > 0) {
      html += `
        <div class="text-xs font-bold uppercase text-sari-lime-dark px-1 mt-3 mb-1">Appels d'Offres & Consultations</div>
        ${tenderMatches.map(t => `
          <div onclick="window.app.closeModalRoot(); window.app.navigate('tenders');" class="p-2.5 bg-slate-50 dark:bg-slate-800 rounded border hover:border-sari-lime-dark cursor-pointer flex justify-between items-center">
            <div>
              <span class="font-mono-tech text-xs font-bold text-sari-blue">${t.id}</span> • <strong>${t.title}</strong>
              <div class="text-xs text-slate-500">${t.issuingOrganization}</div>
            </div>
            <span class="sari-badge bg-slate-200">${t.status}</span>
          </div>
        `).join('')}
      `;
    }

    if (shipMatches.length > 0) {
      html += `
        <div class="text-xs font-bold uppercase text-sari-amber px-1 mt-3 mb-1">Expéditions & Importations</div>
        ${shipMatches.map(s => `
          <div onclick="window.app.closeModalRoot(); window.app.navigate('importExport');" class="p-2.5 bg-slate-50 dark:bg-slate-800 rounded border hover:border-sari-amber cursor-pointer flex justify-between items-center">
            <div>
              <span class="font-mono-tech text-xs font-bold text-sari-blue">${s.id}</span> • <strong>${s.supplierName}</strong>
              <div class="text-xs text-slate-500">Incoterm: ${s.incoterm}</div>
            </div>
            <span class="font-mono-tech font-bold text-xs">${i18n ? i18n.formatCurrency(s.totalLandedCostDZD) : ''}</span>
          </div>
        `).join('')}
      `;
    }

    if (custMatches.length > 0) {
      html += `
        <div class="text-xs font-bold uppercase text-purple-600 px-1 mt-3 mb-1">Clients & Institutions Algérie</div>
        ${custMatches.map(c => `
          <div onclick="window.app.closeModalRoot(); window.app.navigate('customers');" class="p-2.5 bg-slate-50 dark:bg-slate-800 rounded border hover:border-purple-500 cursor-pointer flex justify-between items-center">
            <div>
              <strong>${c.name}</strong>
              <div class="text-xs text-slate-500">${c.taxId || ''}</div>
            </div>
            <span class="font-mono-tech text-xs">${c.wilaya ? i18n.getWilayaName(c.wilaya) : ''}</span>
          </div>
        `).join('')}
      `;
    }

    if (!html) {
      html = `
        <div class="p-6 text-center text-slate-400 text-xs">
          Aucun résultat pour "<strong>${val}</strong>".
        </div>
      `;
    }

    resBox.innerHTML = html;
  }
}

const app = new SariApp();
if (typeof window !== 'undefined') {
  window.app = app;
  app.applyCachedBranding();
  window.addEventListener('DOMContentLoaded', () => app.init());
}

export {};
