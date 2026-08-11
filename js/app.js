/**
 * SARI Système - Main Application Controller & Router (Apple-Style Full-Width)
 * Medical Equipment & Consumables Distribution Management System - Algeria
 * Controls SPA routing, 4 native themes, Lucide icons, DB Agnostic switcher,
 * global shortcuts (Ctrl+K), notification drawer, and toast alerts.
 */

class SariApp {
  constructor() {
    this.activeModule = 'dashboard';
    this.modules = {
      dashboard: window.DashboardModule,
      inventory: window.InventoryModule,
      suppliers: window.SuppliersModule,
      importExport: window.ImportExportModule,
      tenders: window.TendersModule,
      sales: window.SalesModule,
      customers: window.CustomersModule,
      reports: window.ReportsModule,
      translations: window.TranslationsModule,
      auditLogs: window.AuditModule,
      settings: window.SettingsModule
    };
  }

  async init() {
    console.log('[SARI Système] Initializing core modules in Apple-Style Full-Width layout...');

    // 1. Init DB Adapter & seed if empty
    if (window.dbAdapter) {
      await window.dbAdapter.init();
    } else if (window.sariDB) {
      await window.sariDB.init();
    }

    // 2. Init Internationalization (FR / AR / EN)
    if (window.i18n) {
      await window.i18n.init();
    }

    // 3. Init Auth & RBAC
    if (window.auth) {
      window.auth.init();
    }

    // 4. Init Sync Controller
    if (window.syncController) {
      await window.syncController.init();
    }

    // 5. Apply saved Native Theme (Classic / Clinical / Sunset / Midnight)
    const savedTheme = localStorage.getItem('sari_native_theme') || 'classic';
    this.setNativeTheme(savedTheme, false);

    // 6. Register Service Worker for PWA
    this.registerServiceWorker();

    // 7. Setup Event Listeners & Shortcuts
    this.setupEventListeners();

    // 8. Load initial route from URL hash or default to 'dashboard'
    const hash = window.location.hash.replace('#', '');
    const validRoute = Object.keys(this.modules).includes(hash) ? hash : 'dashboard';
    await this.navigate(validRoute);

    // 9. Update notification bell badge
    await this.updateNotificationsBadge();

    // 10. Render Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    console.log('[SARI Système] Application ready in offline-first PWA mode!');
  }

  registerServiceWorker() {
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

  setupEventListeners() {
    // Re-render active view on language change
    window.addEventListener('sari-language-changed', () => {
      this.navigate(this.activeModule, false);
      this.updateNavigationLabels();
    });

    // Re-render active view on role change
    window.addEventListener('sari-role-changed', () => {
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
      if (this.modules[hash] && hash !== this.activeModule) {
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

  async navigate(moduleName, updateHash = true) {
    if (!this.modules[moduleName]) {
      moduleName = 'dashboard';
    }

    this.activeModule = moduleName;
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

    // Render active module
    const mod = this.modules[moduleName];
    if (mod && typeof mod.render === 'function') {
      await mod.render('sari-main-view');
    }

    // Refresh Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      const notifs = await window.sariDB.getAll('notifications');
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

    const notifs = await window.sariDB.getAll('notifications');
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
              if (n.type === 'tender_deadline') icon = 'file-contract';
              if (n.type === 'shipment') icon = 'ship';

              return `
                <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded border ${n.isRead ? 'opacity-70' : 'border-l-4 border-l-sari-blue font-semibold'}">
                  <div class="flex items-start gap-2.5">
                    <i data-lucide="${icon}" class="w-4 h-4 text-sari-blue mt-0.5"></i>
                    <div class="flex-1">
                      <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-200">${n.title}</span>
                        <span class="text-[10px] text-slate-400">${i18n ? i18n.formatDate(n.createdAt) : ''}</span>
                      </div>
                      <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">${n.message}</p>
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
    const notifs = await window.sariDB.getAll('notifications');
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
  window.addEventListener('DOMContentLoaded', () => app.init());
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SariApp, app };
}
