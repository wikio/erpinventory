/**
 * SARI Système - Global Configuration, Settings, Themes & Database Agnostic Module
 * Manage 4 native Apple-style themes, company contact & fiscal/tax details (NIF/RC),
 * Database switcher (IndexedDB / MySQL / PostgreSQL / MongoDB), and Data Tools (CSV & JSON Backups).
 */

const SettingsModule = {
  state: {
    activeTab: 'company', // 'company' | 'database' | 'themes' | 'dataTools' | 'architecture'
    settings: {
      id: 'app-settings',
      language: 'fr',
      theme: 'classic', // 'classic' | 'clinical' | 'sunset' | 'midnight'
      currency: 'DZD',
      taxRate: 0.19,
      companyName: 'SARI SYSTÈMES',
      companySubtitle: 'Distribution Matériel Médical & Consommables Algérie',
      address: 'Lotissement Medical, Bab Ezzouar, 16024 Alger, Algérie',
      phone: '+213 21 24 88 90 / +213 550 99 12 34',
      email: 'contact@sarisysteme.dz',
      website: 'www.sarisysteme.dz',
      nif: '001616098765432',
      rc: '16/00-0987654B19',
      ai: '1602409876',
      nis: '001616012345678',
      bankRib: 'BNA Agence 001 - RIB 00100161609876543209'
    },
    dbTestResult: null
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const s = await window.sariDB.getById('settings', 'app-settings');
      if (s) {
        this.state.settings = { ...this.state.settings, ...s };
      }
    } catch (e) {
      // ignore
    }

    this.renderView(container);
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  renderView(container) {
    const canWrite = window.auth && window.auth.canWrite('settings');
    const tab = this.state.activeTab;
    const s = this.state.settings;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="sari-tile p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="sari-badge bg-sari-blue/10 text-sari-blue border-sari-blue">Administration ERP</span>
              <span class="text-xs text-slate-500 font-mono-tech">Config • DB • Thèmes • Backups</span>
            </div>
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="settings" class="w-6 h-6 text-sari-blue"></i>
              Configuration Globale & Administration SARI Système
            </h2>
            <p class="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Coordonnées fiscales de l'entreprise, 4 thèmes natifs, connecteurs bases de données (MySQL/PostgreSQL/MongoDB) et outils d'export.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="window.app.navigate('translations')" class="sari-btn px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
              <i data-lucide="languages" class="w-4 h-4"></i> Gérer i18n
            </button>
            <button onclick="SettingsModule.openHelpDoc()" class="sari-btn px-4 py-2 bg-sari-blue text-white font-bold text-sm">
              <i data-lucide="book-open" class="w-4 h-4"></i> Architecture & Roadmap
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="sari-tile p-2 flex flex-wrap gap-2 border-b-2 border-sari-blue">
          <button 
            onclick="SettingsModule.setTab('company')" 
            class="px-4 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 ${tab === 'company' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
          >
            <i data-lucide="building-2" class="w-4 h-4"></i> Entreprise & Fiscalité (NIF/RC)
          </button>
          <button 
            onclick="SettingsModule.setTab('themes')" 
            class="px-4 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 ${tab === 'themes' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
          >
            <i data-lucide="palette" class="w-4 h-4"></i> 4 Thèmes Natifs (Apple Style)
          </button>
          <button 
            onclick="SettingsModule.setTab('database')" 
            class="px-4 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 ${tab === 'database' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
          >
            <i data-lucide="database" class="w-4 h-4"></i> Connecteur DB (Agnostic DB)
          </button>
          <button 
            onclick="SettingsModule.setTab('dataTools')" 
            class="px-4 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 ${tab === 'dataTools' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
          >
            <i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Outils Données & Exports CSV
          </button>
        </div>

        <!-- Active Tab Content -->
        <div id="settings-tab-content">
          ${this.getTabHtml(tab, s, canWrite)}
        </div>
      </div>

      <!-- Help Modal Container -->
      <div id="settings-help-modal"></div>
    `;

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  setTab(tabName) {
    this.state.activeTab = tabName;
    this.render();
  },

  getTabHtml(tab, s, canWrite) {
    if (tab === 'company') {
      return `
        <form onsubmit="SettingsModule.saveCompanySettings(event)" class="sari-tile p-6 space-y-6">
          <div class="border-b border-slate-200 dark:border-slate-800 pb-4 flex justify-between items-center">
            <div>
              <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">Coordonnées de l'Entreprise SARI SYSTÈMES</h3>
              <p class="text-xs text-slate-500 mt-0.5">Ces informations apparaissent officiellement sur l'entête des Factures, Bons de Livraison (BL) et rapports d'appel d'offres.</p>
            </div>
            ${canWrite ? `
              <button type="submit" class="sari-btn px-5 py-2 bg-sari-blue text-white font-bold text-xs">
                <i data-lucide="save" class="w-4 h-4"></i> Enregistrer les informations
              </button>
            ` : ''}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Company Identification -->
            <div class="space-y-4">
              <h4 class="text-xs font-bold uppercase tracking-wider text-sari-blue border-b pb-2">Identité & Localisation</h4>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Raison Sociale / Nom Société *</label>
                <input type="text" id="cfg-name" required value="${SariUtils.escapeHtml(s.companyName)}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-bold" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Sous-titre & Activité</label>
                <input type="text" id="cfg-sub" required value="${SariUtils.escapeHtml(s.companySubtitle || 'Distribution Matériel Médical & Consommables Algérie')}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Adresse Complète (Siège / Dépôt Principal) *</label>
                <input type="text" id="cfg-addr" required value="${SariUtils.escapeHtml(s.address)}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Téléphone(s)</label>
                  <input type="text" id="cfg-phone" value="${SariUtils.escapeHtml(s.phone)}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Email Officiel</label>
                  <input type="email" id="cfg-email" value="${SariUtils.escapeHtml(s.email)}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
                </div>
              </div>
            </div>

            <!-- Fiscal & Legal Identifiers (Algeria) -->
            <div class="space-y-4">
              <h4 class="text-xs font-bold uppercase tracking-wider text-sari-lime-dark border-b pb-2">Identifiants Fiscaux & Bancaires (Algérie)</h4>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">NIF (Numéro d'Identification Fiscale) *</label>
                  <input type="text" id="cfg-nif" required value="${s.nif || '001616098765432'}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech font-bold" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">RC (Registre de Commerce) *</label>
                  <input type="text" id="cfg-rc" required value="${s.rc || '16/00-0987654B19'}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech font-bold" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">AI (Article d'Imposition) *</label>
                  <input type="text" id="cfg-ai" required value="${s.ai || '1602409876'}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">NIS (Numéro Identification Statistique)</label>
                  <input type="text" id="cfg-nis" value="${s.nis || '001616012345678'}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Coordonnées Bancaires (RIB BNA / CPA / BEA)</label>
                <input type="text" id="cfg-rib" value="${SariUtils.escapeHtml(s.bankRib || 'BNA Agence 001 - RIB 00100161609876543209')}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech font-semibold" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Taux TVA Algérie (%)</label>
                  <input type="number" readonly value="19" class="w-full px-3 py-2 border rounded bg-slate-100 dark:bg-slate-800 font-mono-tech font-bold" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Devise Principale</label>
                  <input type="text" readonly value="Dinar Algérien (DZD - DA)" class="w-full px-3 py-2 border rounded bg-slate-100 dark:bg-slate-800 font-bold text-sari-blue" />
                </div>
              </div>
            </div>
          </div>
        </form>
      `;
    }

    if (tab === 'themes') {
      const activeTheme = localStorage.getItem('sari_native_theme') || 'classic';

      return `
        <div class="sari-tile p-6 space-y-6">
          <div class="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">4 Thèmes Natifs (Style Apple / Full-Width)</h3>
            <p class="text-xs text-slate-500 mt-0.5">
              Sélectionnez l'un des 4 thèmes natifs conçus pour s'adapter à la luminosité des entrepôts et aux besoins visuels de l'équipe médicale.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Theme 1: Sari Classic -->
            <div 
              onclick="window.app.setNativeTheme('classic')" 
              class="p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${activeTheme === 'classic' ? 'border-sari-blue bg-sari-blue/5 ring-2 ring-sari-blue/30 shadow-lg' : 'border-slate-300 dark:border-slate-700 hover:border-sari-blue'}"
            >
              <div>
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-black uppercase tracking-wider text-sari-blue">Sari Classic</span>
                  ${activeTheme === 'classic' ? '<span class="sari-badge bg-sari-blue text-white">Actif</span>' : ''}
                </div>
                <!-- Palette preview circles -->
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-6 h-6 rounded-full bg-[#009CC5] border shadow-sm"></div>
                  <div class="w-6 h-6 rounded-full bg-[#C6DA34] border shadow-sm"></div>
                  <div class="w-6 h-6 rounded-full bg-[#EBB51A] border shadow-sm"></div>
                  <div class="w-6 h-6 rounded-full bg-white border shadow-sm"></div>
                </div>
                <h4 class="font-bold text-sm text-slate-900 dark:text-white">Palette Officielle SARI</h4>
                <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Le thème officiel par défaut avec Bleu Sari, Vert Citron de réussite et accents Ambre.
                </p>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-right">
                <span class="text-xs font-bold text-sari-blue">Sélectionner &rarr;</span>
              </div>
            </div>

            <!-- Theme 2: Sari Clinical -->
            <div 
              onclick="window.app.setNativeTheme('clinical')" 
              class="p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${activeTheme === 'clinical' ? 'border-[#0D9488] bg-[#0D9488]/10 ring-2 ring-[#0D9488]/30 shadow-lg' : 'border-slate-300 dark:border-slate-700 hover:border-[#0D9488]'}"
            >
              <div>
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-black uppercase tracking-wider text-[#0D9488]">Sari Clinical</span>
                  ${activeTheme === 'clinical' ? '<span class="sari-badge bg-[#0D9488] text-white">Actif</span>' : ''}
                </div>
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-6 h-6 rounded-full bg-[#0D9488] border shadow-sm"></div>
                  <div class="w-6 h-6 rounded-full bg-[#14B8A6] border shadow-sm"></div>
                  <div class="w-6 h-6 rounded-full bg-[#99F6E4] border shadow-sm"></div>
                  <div class="w-6 h-6 rounded-full bg-[#F0FDFA] border shadow-sm"></div>
                </div>
                <h4 class="font-bold text-sm text-slate-900 dark:text-white">Teal Clinique Sober</h4>
                <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Teintes bleu-vert froides et sobres, idéales pour les écrans denses (inventaires, BPU, rapports).
                </p>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-right">
                <span class="text-xs font-bold text-[#0D9488]">Sélectionner &rarr;</span>
              </div>
            </div>

            <!-- Theme 3: Sari Sunset -->
            <div 
              onclick="window.app.setNativeTheme('sunset')" 
              class="p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${activeTheme === 'sunset' ? 'border-[#EA580C] bg-[#EA580C]/10 ring-2 ring-[#EA580C]/30 shadow-lg' : 'border-slate-300 dark:border-slate-700 hover:border-[#EA580C]'}"
            >
              <div>
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-black uppercase tracking-wider text-[#EA580C]">Sari Sunset</span>
                  ${activeTheme === 'sunset' ? '<span class="sari-badge bg-[#EA580C] text-white">Actif</span>' : ''}
                </div>
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-6 h-6 rounded-full bg-[#EA580C] border shadow-sm"></div>
                  <div class="w-6 h-6 rounded-full bg-[#F59E0B] border shadow-sm"></div>
                  <div class="w-6 h-6 rounded-full bg-[#FEF3C7] border shadow-sm"></div>
                  <div class="w-6 h-6 rounded-full bg-[#FFFBEB] border shadow-sm"></div>
                </div>
                <h4 class="font-bold text-sm text-slate-900 dark:text-white">Ambre & Orange Chaud</h4>
                <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Tons chauds dynamiques conçus pour les modules commerciaux (appels d'offres et ventes POS).
                </p>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-right">
                <span class="text-xs font-bold text-[#EA580C]">Sélectionner &rarr;</span>
              </div>
            </div>

            <!-- Theme 4: Sari Midnight -->
            <div 
              onclick="window.app.setNativeTheme('midnight')" 
              class="p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${activeTheme === 'midnight' ? 'border-[#38BDF8] bg-[#030712] text-white ring-2 ring-[#38BDF8]/40 shadow-xl' : 'border-slate-700 bg-slate-900 hover:border-[#38BDF8]'}"
            >
              <div>
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-black uppercase tracking-wider text-[#38BDF8]">Sari Midnight</span>
                  ${activeTheme === 'midnight' ? '<span class="sari-badge bg-[#38BDF8] text-slate-900 font-extrabold">Actif</span>' : ''}
                </div>
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-6 h-6 rounded-full bg-[#030712] border border-slate-600 shadow-sm"></div>
                  <div class="w-6 h-6 rounded-full bg-[#0F172A] border border-slate-600 shadow-sm"></div>
                  <div class="w-6 h-6 rounded-full bg-[#009CC5] border shadow-sm"></div>
                  <div class="w-6 h-6 rounded-full bg-[#C6DA34] border shadow-sm"></div>
                </div>
                <h4 class="font-bold text-sm text-white">Mode Sombre Natif</h4>
                <p class="text-xs text-slate-300 mt-1">
                  Vrai mode sombre à contraste élevé optimisé pour le travail de nuit dans les entrepôts.
                </p>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-700 text-right">
                <span class="text-xs font-bold text-[#38BDF8]">Sélectionner &rarr;</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (tab === 'database') {
      const curDriver = (window.dbAdapter && window.dbAdapter.currentDriver) || 'indexeddb';
      const conf = (window.dbAdapter && window.dbAdapter.driverConfig) || {};

      return `
        <div class="sari-tile p-6 space-y-6">
          <div class="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">Connecteur & Architecture Base de Données Agnostique</h3>
              <p class="text-xs text-slate-500 mt-0.5">
                Basculez à la volée entre le moteur de base de données local (IndexedDB) et des bases de données d'entreprise (MySQL, PostgreSQL, MongoDB).
              </p>
            </div>
            <button onclick="SettingsModule.testDBConnection('${curDriver}')" class="sari-btn px-4 py-2 bg-sari-lime hover:bg-sari-lime/90 text-slate-900 text-xs font-bold">
              <i data-lucide="check-circle" class="w-4 h-4"></i> Tester la connexion
            </button>
          </div>

          <!-- Driver selector grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onclick="SettingsModule.switchDriver('indexeddb')" 
              class="p-4 rounded-lg border-2 cursor-pointer ${curDriver === 'indexeddb' ? 'border-sari-blue bg-sari-blue/5 ring-2 ring-sari-blue/30' : 'border-slate-300 dark:border-slate-700 hover:border-sari-blue'}"
            >
              <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-sm text-slate-900 dark:text-white">IndexedDB (Local PWA)</span>
                ${curDriver === 'indexeddb' ? '<span class="sari-badge bg-sari-blue text-white">Actif</span>' : ''}
              </div>
              <p class="text-xs text-slate-500">Moteur offline-first embarqué 100% dans le navigateur client.</p>
            </div>

            <div 
              onclick="SettingsModule.switchDriver('mysql')" 
              class="p-4 rounded-lg border-2 cursor-pointer ${curDriver === 'mysql' ? 'border-sari-blue bg-sari-blue/5 ring-2 ring-sari-blue/30' : 'border-slate-300 dark:border-slate-700 hover:border-sari-blue'}"
            >
              <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-sm text-slate-900 dark:text-white">MySQL 8.0</span>
                ${curDriver === 'mysql' ? '<span class="sari-badge bg-sari-blue text-white">Actif</span>' : ''}
              </div>
              <p class="text-xs text-slate-500">Base de données relationnelle MySQL (Moteur InnoDB).</p>
            </div>

            <div 
              onclick="SettingsModule.switchDriver('postgresql')" 
              class="p-4 rounded-lg border-2 cursor-pointer ${curDriver === 'postgresql' ? 'border-sari-blue bg-sari-blue/5 ring-2 ring-sari-blue/30' : 'border-slate-300 dark:border-slate-700 hover:border-sari-blue'}"
            >
              <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-sm text-slate-900 dark:text-white">PostgreSQL 15+</span>
                ${curDriver === 'postgresql' ? '<span class="sari-badge bg-sari-blue text-white">Actif</span>' : ''}
              </div>
              <p class="text-xs text-slate-500">Base relationnelle d'entreprise et conformité ACID forte.</p>
            </div>

            <div 
              onclick="SettingsModule.switchDriver('mongodb')" 
              class="p-4 rounded-lg border-2 cursor-pointer ${curDriver === 'mongodb' ? 'border-sari-blue bg-sari-blue/5 ring-2 ring-sari-blue/30' : 'border-slate-300 dark:border-slate-700 hover:border-sari-blue'}"
            >
              <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-sm text-slate-900 dark:text-white">MongoDB 6.0</span>
                ${curDriver === 'mongodb' ? '<span class="sari-badge bg-sari-blue text-white">Actif</span>' : ''}
              </div>
              <p class="text-xs text-slate-500">Moteur NoSQL orienté documents JSON/BSON distribué.</p>
            </div>
          </div>

          <!-- Configuration Form for External Drivers -->
          <form onsubmit="SettingsModule.saveDBConfig(event)" class="p-5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
            <div class="flex justify-between items-center border-b pb-2">
              <h4 class="font-bold text-sm text-slate-900 dark:text-white uppercase">Paramètres de Connexion : <span class="text-sari-blue">${curDriver.toUpperCase()}</span></h4>
              <span class="text-xs text-slate-500 font-mono-tech">SSL/TLS : ${conf.ssl ? 'Activé' : 'Désactivé'}</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Hôte / Serveur DB (Host)</label>
                <input type="text" id="db-host" required value="${conf.host || 'localhost'}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-900 font-mono-tech font-bold" />
              </div>
              <div>
                <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Port</label>
                <input type="number" id="db-port" required value="${conf.port || 3306}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-900 font-mono-tech font-bold" />
              </div>
              <div>
                <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Nom Base de Données (DB Name)</label>
                <input type="text" id="db-name" required value="${conf.database || 'sari_erp_prod'}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-900 font-mono-tech font-bold" />
              </div>
              <div>
                <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Utilisateur (Username)</label>
                <input type="text" id="db-user" required value="${conf.user || 'sari_admin'}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-900 font-mono-tech font-bold" />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button type="submit" class="sari-btn px-4 py-2 bg-sari-blue text-white font-bold text-xs">
                <i data-lucide="save" class="w-4 h-4"></i> Enregistrer la configuration DB
              </button>
            </div>
          </form>

          <!-- Connection Test Feedback Area -->
          <div id="db-test-feedback"></div>
        </div>
      `;
    }

    // Data Tools Tab
    return `
      <div class="sari-tile p-6 space-y-6">
        <div class="border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">Outils de Données, Exports CSV & Sauvegardes Système</h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Exportez l'ensemble des tables en CSV pour vos tableurs Excel, effectuez un backup JSON de vos 11 stores ou restaurez votre système.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- CSV Export Tools -->
          <div class="p-5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div class="flex items-center gap-2">
              <i data-lucide="file-spreadsheet" class="w-5 h-5 text-sari-blue"></i>
              <h4 class="font-extrabold text-base text-slate-900 dark:text-white">Exportation CSV (Par Table ou Globale)</h4>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-300">
              Sélectionnez une table spécifique ou lancez un export global de toutes les données ERP au format CSV compatible UTF-8 (Excel).
            </p>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button onclick="SettingsModule.exportTableCSV('products')" class="p-2.5 rounded border bg-white dark:bg-slate-900 hover:border-sari-blue text-left text-xs font-bold flex items-center justify-between">
                <span>Produits</span>
                <i data-lucide="download" class="w-3.5 h-3.5 text-sari-blue"></i>
              </button>
              <button onclick="SettingsModule.exportTableCSV('warehouses')" class="p-2.5 rounded border bg-white dark:bg-slate-900 hover:border-sari-blue text-left text-xs font-bold flex items-center justify-between">
                <span>Dépôts</span>
                <i data-lucide="download" class="w-3.5 h-3.5 text-sari-blue"></i>
              </button>
              <button onclick="SettingsModule.exportTableCSV('suppliers')" class="p-2.5 rounded border bg-white dark:bg-slate-900 hover:border-sari-blue text-left text-xs font-bold flex items-center justify-between">
                <span>Fournisseurs</span>
                <i data-lucide="download" class="w-3.5 h-3.5 text-sari-blue"></i>
              </button>
              <button onclick="SettingsModule.exportTableCSV('shipments')" class="p-2.5 rounded border bg-white dark:bg-slate-900 hover:border-sari-blue text-left text-xs font-bold flex items-center justify-between">
                <span>Expéditions</span>
                <i data-lucide="download" class="w-3.5 h-3.5 text-sari-blue"></i>
              </button>
              <button onclick="SettingsModule.exportTableCSV('tenders')" class="p-2.5 rounded border bg-white dark:bg-slate-900 hover:border-sari-blue text-left text-xs font-bold flex items-center justify-between">
                <span>Appels Offres</span>
                <i data-lucide="download" class="w-3.5 h-3.5 text-sari-blue"></i>
              </button>
              <button onclick="SettingsModule.exportTableCSV('customers')" class="p-2.5 rounded border bg-white dark:bg-slate-900 hover:border-sari-blue text-left text-xs font-bold flex items-center justify-between">
                <span>Clients</span>
                <i data-lucide="download" class="w-3.5 h-3.5 text-sari-blue"></i>
              </button>
              <button onclick="SettingsModule.exportTableCSV('orders')" class="p-2.5 rounded border bg-white dark:bg-slate-900 hover:border-sari-blue text-left text-xs font-bold flex items-center justify-between">
                <span>Commandes BL</span>
                <i data-lucide="download" class="w-3.5 h-3.5 text-sari-blue"></i>
              </button>
              <button onclick="SettingsModule.exportTableCSV('auditLogs')" class="p-2.5 rounded border bg-white dark:bg-slate-900 hover:border-sari-blue text-left text-xs font-bold flex items-center justify-between">
                <span>Audit Logs</span>
                <i data-lucide="download" class="w-3.5 h-3.5 text-sari-blue"></i>
              </button>
            </div>

            <div class="pt-2 border-t">
              <button onclick="SettingsModule.exportAllStoresCSV()" class="sari-btn w-full py-2.5 bg-sari-blue hover:bg-sari-blue/90 text-white font-extrabold text-xs">
                <i data-lucide="file-down" class="w-4 h-4"></i> EXPORTER TOUTES LES TABLES EN CSV
              </button>
            </div>
          </div>

          <!-- JSON Backup & Demo Dataset -->
          <div class="p-5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div class="flex items-center gap-2">
              <i data-lucide="hard-drive-download" class="w-5 h-5 text-sari-lime-dark"></i>
              <h4 class="font-extrabold text-base text-slate-900 dark:text-white">Sauvegarde JSON & Restauration Système</h4>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-300">
              Générez un snapshot complet `.json` du système, incluant les paramètres, catalogues, et historiques de soumission.
            </p>

            <div class="space-y-2">
              <button onclick="SettingsModule.backupJSON()" class="sari-btn w-full py-2.5 bg-sari-lime hover:bg-sari-lime/90 text-slate-900 font-extrabold text-xs">
                <i data-lucide="download" class="w-4 h-4"></i> TÉLÉCHARGER SAUVEGARDE COMPLÈTE (.JSON)
              </button>
              <button onclick="SettingsModule.restoreJSON()" class="sari-btn w-full py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs">
                <i data-lucide="upload" class="w-4 h-4"></i> IMPORTER UNE SAUVEGARDE (.JSON)
              </button>
            </div>

            <div class="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div class="p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-300 dark:border-amber-700 space-y-2">
                <h5 class="text-xs font-bold uppercase text-amber-800 dark:text-amber-300">Jeu de Données Démo Algérie</h5>
                <p class="text-xs text-slate-600 dark:text-slate-300">
                  Réinitialisez la base de données et rechargez l'ensemble des données officielles SARI Système Algérie.
                </p>
                <button onclick="SettingsModule.resetDemoData()" class="sari-btn px-4 py-2 bg-sari-amber text-slate-900 font-extrabold text-xs w-full">
                  <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Réinitialiser & Charger Jeu Démo Algérie
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async saveCompanySettings(e) {
    e.preventDefault();
    const newSettings = {
      ...this.state.settings,
      companyName: document.getElementById('cfg-name').value.trim(),
      companySubtitle: document.getElementById('cfg-sub').value.trim(),
      address: document.getElementById('cfg-addr').value.trim(),
      phone: document.getElementById('cfg-phone').value.trim(),
      email: document.getElementById('cfg-email').value.trim(),
      nif: document.getElementById('cfg-nif').value.trim(),
      rc: document.getElementById('cfg-rc').value.trim(),
      ai: document.getElementById('cfg-ai').value.trim(),
      nis: document.getElementById('cfg-nis').value.trim(),
      bankRib: document.getElementById('cfg-rib').value.trim()
    };

    this.state.settings = newSettings;
    await window.sariDB.save('settings', newSettings);
    window.app.showToast('Coordonnées de l\'entreprise enregistrées !', 'success');
    await this.render();
  },

  async switchDriver(driverType) {
    if (window.dbAdapter) {
      await window.dbAdapter.setDriver(driverType);
      window.app.showToast(`Moteur de base de données basculé vers: ${driverType.toUpperCase()}`, 'success');
      await this.render();
    }
  },

  async saveDBConfig(e) {
    e.preventDefault();
    const curDriver = (window.dbAdapter && window.dbAdapter.currentDriver) || 'indexeddb';
    const cfg = {
      host: document.getElementById('db-host').value.trim(),
      port: Number(document.getElementById('db-port').value),
      database: document.getElementById('db-name').value.trim(),
      user: document.getElementById('db-user').value.trim()
    };
    if (window.dbAdapter) {
      await window.dbAdapter.setDriver(curDriver, cfg);
      window.app.showToast(`Configuration DB [${curDriver}] mise à jour !`, 'success');
      await this.testDBConnection(curDriver);
    }
  },

  async testDBConnection(driverType) {
    const feedbackEl = document.getElementById('db-test-feedback');
    if (!feedbackEl || !window.dbAdapter) return;

    feedbackEl.innerHTML = `
      <div class="p-4 bg-sari-blue/10 border border-sari-blue rounded flex items-center gap-3 text-xs">
        <i data-lucide="loader-2" class="w-5 h-5 text-sari-blue animate-spin"></i>
        <span>Test de connexion au moteur <strong>${driverType.toUpperCase()}</strong> en cours...</span>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const res = await window.dbAdapter.testConnection(driverType);

    feedbackEl.innerHTML = `
      <div class="p-4 rounded border-2 ${res.success ? 'bg-sari-lime/15 border-sari-lime-dark text-slate-900 dark:text-white' : 'bg-red-500/15 border-red-500 text-red-700 dark:text-red-300'} space-y-1 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-extrabold text-sm flex items-center gap-2">
            <i data-lucide="${res.success ? 'check-circle-2' : 'alert-circle'}" class="w-5 h-5 ${res.success ? 'text-sari-lime-dark' : 'text-red-500'}"></i>
            ${res.message}
          </span>
          <span class="sari-badge ${res.success ? 'bg-sari-lime/30 text-sari-lime-dark' : 'bg-red-500/30 text-red-500'} font-mono-tech">
            Latence : ${res.latencyMs} ms
          </span>
        </div>
        ${res.details ? `<p class="text-slate-600 dark:text-slate-300 font-medium pl-7">${res.details}</p>` : ''}
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  async exportTableCSV(storeName) {
    try {
      const data = await window.sariDB.getAll(storeName);
      if (!data || !data.length) {
        window.app.showToast(`Aucune donnée à exporter pour [${storeName}]`, 'warning');
        return;
      }
      SariUtils.exportToCSV(data, `sari-systeme-${storeName}-${new Date().toISOString().split('T')[0]}.csv`);
      window.app.showToast(`Exportation CSV de [${storeName}] réussie`, 'success');
    } catch (e) {
      window.app.showToast('Erreur lors de l\'exportation CSV', 'error');
    }
  },

  async exportAllStoresCSV() {
    const stores = ['products', 'warehouses', 'suppliers', 'shipments', 'tenders', 'customers', 'orders', 'auditLogs'];
    let totalExported = 0;
    for (const s of stores) {
      const data = await window.sariDB.getAll(s);
      if (data && data.length) {
        SariUtils.exportToCSV(data, `sari-systeme-ALL-${s}-${new Date().toISOString().split('T')[0]}.csv`);
        totalExported++;
        await new Promise(r => setTimeout(r, 300)); // slight pause between downloads
      }
    }
    window.app.showToast(`${totalExported} tables exportées en CSV !`, 'success');
  },

  async backupJSON() {
    try {
      const exportData = await window.sariDB.exportJSON();
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sari-systeme-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      window.app.showToast('Sauvegarde JSON générée avec succès', 'success');
    } catch (e) {
      window.app.showToast('Erreur lors de la sauvegarde JSON', 'error');
    }
  },

  restoreJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const json = JSON.parse(evt.target.result);
          await window.sariDB.importJSON(json);
          window.app.showToast('Données importées avec succès !', 'success');
          setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
          window.app.showToast('Fichier JSON invalide', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  async resetDemoData() {
    if (!confirm('Attention: Toutes les données seront réinitialisées au jeu de démonstration Algérie. Continuer ?')) {
      return;
    }
    try {
      const stores = ['products', 'warehouses', 'suppliers', 'shipments', 'tenders', 'customers', 'orders', 'notifications', 'auditLogs', 'syncQueue'];
      for (const s of stores) {
        await window.sariDB.clearStore(s);
      }
      await window.sariDB.seedDemoData();
      window.app.showToast('Données de démonstration chargées !', 'success');
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      window.app.showToast('Erreur lors de la réinitialisation.', 'error');
    }
  },

  openHelpDoc() {
    const modalEl = document.getElementById('settings-help-modal');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-4xl bg-white dark:bg-slate-900 p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto text-slate-800 dark:text-slate-200">
          <div class="flex justify-between items-center border-b pb-4 mb-6">
            <div>
              <span class="text-xs font-bold text-sari-blue uppercase">Documentation & Architecture</span>
              <h3 class="font-extrabold text-2xl text-slate-900 dark:text-white">
                SARI SYSTÈME – 4 Thèmes Natifs, Base Agnostique & Layout Full-Width Apple
              </h3>
            </div>
            <button onclick="SettingsModule.closeHelpDoc()" class="text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>

          <div class="space-y-6 text-sm">
            <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded border">
              <h4 class="font-extrabold text-base text-sari-blue mb-2">1. 4 Thèmes Natifs Apple Style</h4>
              <ul class="list-disc list-inside mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <li><strong>Sari Classic (Défaut) :</strong> Palette officielle SARI (#009CC5, #C6DA34, #EBB51A).</li>
                <li><strong>Sari Clinical :</strong> Nuances Teal froides et sobres, optimisées pour la concentration et la densité de données.</li>
                <li><strong>Sari Sunset :</strong> Tons chauds Ambre et Orange pour les soumissions d'appels d'offres et les ventes au comptoir.</li>
                <li><strong>Sari Midnight :</strong> Vrai mode sombre à fort contraste pour le travail de nuit en entrepôt.</li>
              </ul>
            </div>

            <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded border">
              <h4 class="font-extrabold text-base text-sari-lime-dark mb-2">2. Architecture de Base de Données Agnostique</h4>
              <p class="text-xs text-slate-700 dark:text-slate-300">
                Grâce au connecteur <code>DBAdapter</code>, SARI Système est 100% découplé : vous pouvez utiliser <strong>IndexedDB</strong> en mode PWA déconnecté, ou basculer en un clic vers un serveur d'entreprise <strong>MySQL 8.0</strong>, <strong>PostgreSQL 15</strong>, ou <strong>MongoDB 6.0</strong>.
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <button onclick="SettingsModule.closeHelpDoc()" class="sari-btn px-6 py-2 bg-sari-blue text-white font-bold">
              Fermer la Documentation
            </button>
          </div>
        </div>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  closeHelpDoc() {
    const modalEl = document.getElementById('settings-help-modal');
    if (modalEl) modalEl.innerHTML = '';
  }
};

if (typeof window !== 'undefined') {
  window.SettingsModule = SettingsModule;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsModule;
}
