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
    dbTestResult: null,
    dbDiagnostics: [],
    dbDiagnosticCursor: 0,
    migrationRunning: false,
    checklistTemplates: [],
    roles: [],
    documentTemplates: [],
    vatRates: [],
    documentCodes: [],
    paymentMethods: [],
    banks: [],
    bankAccounts: [],
    coupons: [],
    referrals: [], bankTypes: [], countries: [], barcodeLabelSettings: null
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if(!this._tabRestored){this.state.activeTab=localStorage.getItem('sari_settings_tab')||this.state.activeTab;this._tabRestored=true;}
    try {
      const s = await window.sariDB.getById('settings', 'app-settings');
      if (s) {
        this.state.settings = { ...this.state.settings, ...s };
      }
    } catch (e) {
      // ignore
    }

    [this.state.checklistTemplates, this.state.roles, this.state.documentTemplates, this.state.vatRates, this.state.documentCodes, this.state.paymentMethods, this.state.banks, this.state.bankAccounts, this.state.coupons, this.state.referrals, this.state.bankTypes, this.state.countries] = await Promise.all([
      'checklistTemplates','roles','documentTemplates','vatRates','documentCodes','paymentMethods','banks','bankAccounts','coupons','referrals','bankTypes','countries'
    ].map(store=>sariDB.getAll(store)));
    this.state.barcodeLabelSettings=await sariDB.getById('barcodeLabelSettings','default');
    if(auth.currentRole==='admin')try{const response=await fetch('/api/db/config',{credentials:'same-origin'});if(response.ok)this.state.externalDbConfig=await response.json();}catch(_){this.state.externalDbConfig={configured:false,type:'indexeddb',active:false};}
    this.renderView(container);
    if(this.state.activeTab==='database'){this.refreshDbDiagnostics();this.startDbDiagnosticPolling();}
    else this.stopDbDiagnosticPolling();
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
              <span class="text-xs text-slate-500 font-mono-tech">${i18n.t('settingsSummary','Config • DB • Thèmes • Sauvegardes')}</span>
            </div>
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="settings" class="w-6 h-6 text-sari-blue"></i>
              Configuration Globale & Administration SARI Système
            </h2>
            <p class="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              ${i18n.t('generalSettingsDescription','Coordonnées fiscales de l’entreprise, 4 thèmes natifs, connecteurs de bases de données (MySQL/PostgreSQL/MongoDB) et outils d’export.')}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="window.app.navigate('translations')" class="sari-btn px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
              <i data-lucide="languages" class="w-4 h-4"></i> ${i18n.t('manageI18n','Gérer i18n')}
            </button>
            <button onclick="SettingsModule.openHelpDoc()" class="sari-btn px-4 py-2 bg-sari-blue text-white font-bold text-sm">
              <i data-lucide="book-open" class="w-4 h-4"></i> ${i18n.t('architectureRoadmap','Architecture & Roadmap')}
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
          <button onclick="SettingsModule.setTab('barcodeLabels')" class="px-4 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 ${tab === 'barcodeLabels' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}"><i data-lucide="barcode" class="w-4 h-4"></i> ${i18n.t('barcodeLabel','Étiquette code-barres')}</button>
          <button onclick="SettingsModule.setTab('branding')" class="px-4 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 ${tab === 'branding' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}"><i data-lucide="image" class="w-4 h-4"></i> ${i18n.t('logos','Logos')}</button>
          <button onclick="SettingsModule.openSmtpSettings()" class="px-4 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="mail-cog" class="w-4 h-4"></i> ${i18n.t('smtpConfiguration','Configuration SMTP')}</button>
          <button onclick="SettingsModule.setTab('financeAdmin')" class="px-4 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 ${tab === 'financeAdmin' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}"><i data-lucide="landmark" class="w-4 h-4"></i> ${i18n.t('paymentsBanking','Paiements & banque')}</button>
          <button onclick="SettingsModule.setTab('vatRates')" class="px-4 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 ${tab === 'vatRates' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}"><i data-lucide="percent" class="w-4 h-4"></i> ${i18n.t('vatRatesMenu','Taux de TVA')}</button>
          <button onclick="SettingsModule.setTab('documentCodes')" class="px-4 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 ${tab === 'documentCodes' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}"><i data-lucide="binary" class="w-4 h-4"></i> ${i18n.t('typesNumbering','Types & numérotation')}</button>
          <button onclick="SettingsModule.setTab('checklists')" class="px-4 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 ${tab === 'checklists' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}"><i data-lucide="list-checks" class="w-4 h-4"></i> ${i18n.t('checklistTemplates','Modèles de checklist')}</button>
          <button onclick="SettingsModule.setTab('permissions')" class="px-4 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 ${tab === 'permissions' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}"><i data-lucide="shield-check" class="w-4 h-4"></i> ${i18n.t('rolesPermissions','Rôles & permissions')}</button>
          <button onclick="SettingsModule.setTab('documentTemplates')" class="px-4 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 ${tab === 'documentTemplates' ? 'bg-sari-blue text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}"><i data-lucide="layout-template" class="w-4 h-4"></i> Modèles Documents</button>
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

  async openSmtpSettings(){await app.navigate('users');if(window.UsersModule){UsersModule.state.tab='smtp';await UsersModule.render();}},
  currencyRows(){const rows=OptionCatalog.options('currency');return rows.length?rows:Object.values(SARI_CONFIG.CURRENCIES).map((item,order)=>({id:`currency-${item.code}`,value:item.code,code:item.code,name:item.name,symbol:item.symbol,order,isActive:true}));},
  currencyOptions(selected='DZD'){return this.currencyRows().map(row=>`<option value="${row.value||row.code}" ${(row.value||row.code)===selected?'selected':''}>${SariUtils.escapeHtml(row.name?.[i18n.currentLang]||row.name?.fr||row.value||row.code)} (${row.value||row.code}${row.symbol?' • '+row.symbol:''})</option>`).join('');},
  permissionRoleLabel(role){const keys={admin:'administratorFullAccess',import_export:'importExportManager',inventory:'stockManager',readonly:'readOnlyViewer',sales:'salesEmployee',tenders:'tenderManager'};return i18n.t(keys[role.id]||`role_${role.id}`,typeof role.name==='object'?(role.name[i18n.currentLang]||role.name.fr||role.id):(role.name||role.id));},
  async manageCurrencies(){await OptionCatalog.init();const rows=this.currencyRows(),root=document.getElementById('sari-modal-root');root.innerHTML=`<div class="fixed inset-0 z-[110] sari-modal-backdrop grid place-items-center p-3"><section class="sari-tile p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto"><header class="flex justify-between border-b pb-3"><div><span class="sari-badge">${i18n.t('configurableLists','Listes configurables')}</span><h2 class="text-xl font-extrabold mt-2">${i18n.t('manageCurrencies','Gérer les devises')}</h2></div><button onclick="app.closeModalRoot()"><i data-lucide="x"></i></button></header><button onclick="SettingsModule.editCurrency()" class="sari-btn px-4 py-2 mt-4 bg-sari-blue text-white">+ ${i18n.t('add','Ajouter')}</button><div class="space-y-2 mt-4">${rows.map(row=>`<article class="p-4 border rounded-xl flex justify-between gap-3"><div><b>${SariUtils.escapeHtml(row.value||row.code)} • ${SariUtils.escapeHtml(row.name?.[i18n.currentLang]||row.name?.fr||'')}</b><p class="text-xs text-slate-500">${SariUtils.escapeHtml(row.symbol||'')}</p></div><div><button onclick="SettingsModule.editCurrency('${row.id}')" class="doc-action">${i18n.t('edit','Modifier')}</button><button onclick="SettingsModule.deleteCurrency('${row.id}')" class="doc-action text-red-600">${i18n.t('delete','Supprimer')}</button></div></article>`).join('')}</div></section></div>`;window.SariIcons?.hydrate();},
  async editCurrency(id=''){const rows=this.currencyRows(),old=rows.find(row=>row.id===id)||{},values=await DialogManager.form(id?i18n.t('editCurrency','Modifier la devise'):i18n.t('newCurrency','Nouvelle devise'),[{name:'code',label:i18n.t('currencyCode','Code ISO'),value:old.value||old.code||'',required:true},{name:'symbol',label:i18n.t('currencySymbol','Symbole'),value:old.symbol||'',required:true},{name:'fr',label:'Français',value:old.name?.fr||'',required:true},{name:'ar',label:'العربية',value:old.name?.ar||'',required:true},{name:'en',label:'English',value:old.name?.en||'',required:true}]);if(!values)return;const code=values.code.trim().toUpperCase();await sariDB.save('configurableOptions',{...old,id:id||`currency-${code}`,listKey:'currency',value:code,code,symbol:values.symbol,name:{fr:values.fr,ar:values.ar,en:values.en},isActive:true,order:old.order??rows.length});await OptionCatalog.init();await this.manageCurrencies();},
  async deleteCurrency(id){const row=this.currencyRows().find(item=>item.id===id);if(!row||row.value==='DZD')return app.showToast(i18n.t('defaultCurrencyProtected','La devise DZD par défaut ne peut pas être supprimée.'),'warning');if(await DialogManager.confirm(i18n.t('deleteCurrencyConfirm','Supprimer cette devise ?'))){await sariDB.delete('configurableOptions',id);await OptionCatalog.init();await this.manageCurrencies();}},

  async setTab(tabName) {
    this.state.activeTab = tabName;
    localStorage.setItem('sari_settings_tab',tabName);
    await this.render();
    document.getElementById('settings-tab-content')?.scrollIntoView?.({behavior:'smooth',block:'start'});
  },

  getTabHtml(tab, s, canWrite) {
    if (tab === 'company') {
      return `
        <form onsubmit="SettingsModule.saveCompanySettings(event)" class="sari-tile p-6 space-y-6">
          <div class="border-b border-slate-200 dark:border-slate-800 pb-4 flex justify-between items-center">
            <div>
              <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">${i18n.t('companyDetails','Coordonnées de l’Entreprise SARI SYSTÈMES')}</h3>
              <p class="text-xs text-slate-500 mt-0.5">${i18n.t('companyDetailsDescription','Ces informations apparaissent officiellement sur l’en-tête des factures, bons de livraison (BL) et rapports d’appel d’offres.')}</p>
            </div>
            ${canWrite ? `
              <button type="submit" class="sari-btn px-5 py-2 bg-sari-blue text-white font-bold text-xs">
                <i data-lucide="save" class="w-4 h-4"></i> ${i18n.t('saveInformation','Enregistrer les informations')}
              </button>
            ` : ''}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Company Identification -->
            <div class="space-y-4">
              <h4 class="text-xs font-bold uppercase tracking-wider text-sari-blue border-b pb-2">${i18n.t('identityLocation','Identité & localisation')}</h4>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">${i18n.t('legalCompanyName','Raison sociale / nom de société *')}</label>
                <input type="text" id="cfg-name" required value="${SariUtils.escapeHtml(s.companyName)}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-bold" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">${i18n.t('subtitleActivity','Sous-titre & activité')}</label>
                <input type="text" id="cfg-sub" required value="${SariUtils.escapeHtml(s.companySubtitle || 'Distribution Matériel Médical & Consommables Algérie')}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">${i18n.t('fullAddress','Adresse complète (siège / dépôt principal)')}</label>
                <input type="text" id="cfg-addr" required value="${SariUtils.escapeHtml(s.address)}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">${i18n.t('phoneNumbers','Numéro(s) de téléphone')}</label>
                  <input type="text" id="cfg-phone" value="${SariUtils.escapeHtml(s.phone)}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">${i18n.t('officialEmail','Email officiel')}</label>
                  <input type="email" id="cfg-email" value="${SariUtils.escapeHtml(s.email)}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
                </div>
              </div>
            </div>

            <!-- Fiscal & Legal Identifiers (Algeria) -->
            <div class="space-y-4">
              <h4 class="text-xs font-bold uppercase tracking-wider text-sari-lime-dark border-b pb-2">${i18n.t('fiscalBankIdentifiers','Identifiants fiscaux & bancaires (Algérie)')}</h4>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">${i18n.t('taxIdNumber','NIF (Numéro d’identification fiscale)')}</label>
                  <input type="text" id="cfg-nif" required value="${s.nif || '001616098765432'}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech font-bold" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">${i18n.t('tradeRegister','RC (Registre de commerce)')}</label>
                  <input type="text" id="cfg-rc" required value="${s.rc || '16/00-0987654B19'}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech font-bold" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">${i18n.t('taxArticleId','AI (Numéro d’article fiscal)')}</label>
                  <input type="text" id="cfg-ai" required value="${s.ai || '1602409876'}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">${i18n.t('statisticalId','NIS (Numéro d’identification statistique)')}</label>
                  <input type="text" id="cfg-nis" value="${s.nis || '001616012345678'}" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">${i18n.t('bankDetails','Coordonnées bancaires (RIB BNA/CPA/BEA)')}</label>
                <select id="cfg-default-bank-account" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-semibold"><option value="">${i18n.t('noDefaultAccount','Aucun compte par défaut')}</option>${this.state.bankAccounts.filter(a=>a.isActive).map(a=>`<option value="${a.id}" ${a.id===s.defaultBankAccountId?'selected':''}>${SariUtils.escapeHtml(a.name)} • ${a.currency} • ${SariUtils.escapeHtml(a.iban)}</option>`).join('')}</select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">${i18n.t('algeriaVatRate','Taux TVA Algérie (%)')}</label>
                  <input type="number" readonly value="19" class="w-full px-3 py-2 border rounded bg-slate-100 dark:bg-slate-800 font-mono-tech font-bold" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">${i18n.t('mainCurrency','Devise principale')}</label>
                  <div class="flex gap-2"><select id="cfg-currency" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-bold text-sari-blue">${this.currencyOptions(s.currency)}</select><button type="button" onclick="SettingsModule.manageCurrencies()" class="sari-btn px-3 bg-slate-800 text-white" title="${i18n.t('manageCurrencies','Gérer les devises')}"><i data-lucide="list-cog"></i></button></div>
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
            <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">${i18n.t('nativeThemes','Thèmes natifs (Style Apple / pleine largeur)')}</h3>
            <p class="text-xs text-slate-500 mt-0.5">
              ${i18n.t('nativeThemesDescription','Sélectionnez l’un des 4 thèmes natifs conçus pour s’adapter à la luminosité des entrepôts et aux besoins visuels de l’équipe médicale.')}
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
                <h4 class="font-bold text-sm text-slate-900 dark:text-white">${i18n.t('sariClassicTagline','Palette officielle SARI')}</h4>
                <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Le thème officiel par défaut avec Bleu Sari, Vert Citron de réussite et accents Ambre.
                </p>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-right">
                <span class="text-xs font-bold text-sari-blue">${i18n.t('selectTheme','Sélectionner →')}</span>
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
                <h4 class="font-bold text-sm text-slate-900 dark:text-white">${i18n.t('sariClinicalTagline','Teal clinique sobre')}</h4>
                <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  ${i18n.t('sariClinicalDescription','Teal clinique sobre — tons bleu-vert froids et sobres, idéals pour les écrans denses (inventaire, BPU, rapports).')}
                </p>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-right">
                <span class="text-xs font-bold text-[#0D9488]">${i18n.t('selectTheme','Sélectionner →')}</span>
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
                <h4 class="font-bold text-sm text-slate-900 dark:text-white">${i18n.t('sariSunsetTagline','Ambre & orange chaleureux')}</h4>
                <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  ${i18n.t('sariSunsetDescription','Ambre et orange chaleureux — tons chauds dynamiques conçus pour les modules commerciaux (appels d’offres et ventes POS).')}
                </p>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-right">
                <span class="text-xs font-bold text-[#EA580C]">${i18n.t('selectTheme','Sélectionner →')}</span>
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
                <h4 class="font-bold text-sm text-white">${i18n.t('sariMidnightTagline','Vrai mode sombre natif')}</h4>
                <p class="text-xs text-slate-300 mt-1">
                  ${i18n.t('sariMidnightDescription','Vrai mode sombre natif — contraste élevé optimisé pour le travail de nuit en entrepôt.')}
                </p>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-700 text-right">
                <span class="text-xs font-bold text-[#38BDF8]">${i18n.t('selectTheme','Sélectionner →')}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if(tab==='barcodeLabels'){const cfg=this.state.barcodeLabelSettings||{};const toggles=[['showProductName','Nom produit'],['showSku','SKU'],['showCategory','Catégorie'],['showLot','Lot'],['showExpiry','Péremption'],['showCertification','Certification'],['showWarehouse','Dépôt'],['showPrice','Prix'],['showOrigin','Origine'],['showBarcode','Code-barres'],['showQr','QR code'],['includeHash','Clé hashée dans le QR']];const pattern=cfg.qrPattern||'http://sari-systeme.com/verification/{code}/{hash}';const preview=SariUtils.buildVerificationUrl(pattern,{code:'SARI-PRO03-00001',sku:'PRO03',barcode:'3614271000101',hash:'A1B2C3',numericId:9});return `<form onsubmit="SettingsModule.saveBarcodeSettings(event)" class="sari-tile p-6"><header class="border-b pb-4"><h3 class="font-extrabold text-lg">Configuration de l’étiquette code-barres</h3><p class="text-xs text-slate-500">Choisissez les informations visibles et le contenu de vérification QR.</p></header><div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">${toggles.map(([field,label])=>`<label class="flex items-center justify-between p-3 border rounded-xl"><span>${label}</span><input type="checkbox" id="barcode-${field}" ${cfg[field]?'checked':''}></label>`).join('')}</div><label class="doc-label mt-4">Nom de configuration<input id="barcode-config-name" class="doc-input" value="${SariUtils.escapeHtml(cfg.name||i18n.t('standardProductLabel','Étiquette produit standard'))}"></label><div class="mt-5 p-4 border rounded-xl bg-slate-50 dark:bg-slate-800"><b>Contenu QR — modèle d’URL configurable</b><p class="text-xs text-slate-500">${i18n.t('barcodeDescription','Utilisez les variables {code} (référence), {sku}, {barcode}, {hash} (clé hashée) et {id}. La clé hashée n’est ajoutée que si l’option « Clé hashée dans le QR » est cochée.')}</p><input id="barcode-qr-pattern" class="doc-input mt-2 font-mono-tech" value="${SariUtils.escapeHtml(pattern)}" oninput="SettingsModule.previewQrPattern(this.value)"><p class="text-[10px] text-slate-400 mt-1">Aperçu : <code id="barcode-qr-preview">${SariUtils.escapeHtml(preview)}</code></p></div><button class="sari-btn px-5 py-2 mt-5 bg-sari-blue text-white">Enregistrer la configuration</button></form>`;}

    if (tab === 'branding') {
      return `<div class="grid md:grid-cols-2 gap-5"><section class="sari-tile p-6"><h3 class="font-extrabold text-lg">${i18n.t('applicationLogo','Logo de l’application')}</h3><p class="text-xs text-slate-500">Utilisé dans l’en-tête et l’espace collaborateur.</p>${this.logoUploader('siteLogo','logo-site-preview',s.siteLogo)}</section><section class="sari-tile p-6"><h3 class="font-extrabold text-lg">${i18n.t('financialDocumentsLogo','Logo des documents financiers')}</h3><p class="text-xs text-slate-500">${i18n.t('financialLogoDescription','Logo indépendant pour les factures, devis, commandes et bons de livraison. Utilisé dans l’en-tête et l’espace collaborateur.')}</p>${this.logoUploader('documentLogo','logo-document-preview',s.documentLogo)}</section></div>`;
    }

    if (tab === 'financeAdmin') {
      return `<div class="space-y-4"><section class="sari-tile p-5"><h3 class="font-extrabold text-lg">Authenticité des documents</h3><div class="grid md:grid-cols-2 gap-3 mt-3"><label class="doc-label">${i18n.t('verificationSecretKey','Clé secrète de vérification')}<input id="cfg-verification-secret" type="password" value="${SariUtils.escapeHtml(s.verificationSecret||'SARI-CHANGE-ME')}" class="doc-input"></label><label class="doc-label">${i18n.t('verificationUrl','URL de vérification')}<input id="cfg-verification-url" value="${SariUtils.escapeHtml(s.verificationBaseUrl||'http://sari-systeme.com/code')}" class="doc-input"></label></div><button onclick="SettingsModule.saveVerificationSettings()" class="sari-btn px-4 py-2 mt-3 bg-sari-blue text-white">Enregistrer</button></section><div class="grid lg:grid-cols-2 gap-4"><section class="sari-tile p-5"><header class="flex justify-between"><h3 class="font-extrabold">Modes de paiement</h3><button onclick="SettingsModule.editPaymentMethod()" class="doc-action">+ Ajouter</button></header>${this.state.paymentMethods.map(x=>`<div class="flex justify-between p-2 border-b"><span>${SariUtils.escapeHtml(x.label?.[i18n.currentLang]||x.code)}</span><div><button onclick="SettingsModule.viewPaymentMethod('${x.id}')" class="doc-action">Voir</button><button onclick="SettingsModule.editPaymentMethod('${x.id}')" class="doc-action">Modifier</button><button onclick="SettingsModule.deletePaymentMethod('${x.id}')" class="doc-action text-red-600">Supprimer</button></div></div>`).join('')}</section><section class="sari-tile p-5"><header class="flex justify-between"><h3 class="font-extrabold">Banques & comptes société</h3><button onclick="SettingsModule.editBankAccount()" class="doc-action">${i18n.t('addAccount','+ Compte')}</button></header>${this.state.bankAccounts.map(a=>`<div class="p-2 border-b flex justify-between gap-2"><div class="flex gap-2">${a.logo?`<img src="${a.logo}" class="w-9 h-9 object-contain rounded">`:''}<div><b>${SariUtils.escapeHtml(a.name)}</b><small class="block font-mono-tech text-sari-blue">${a.referenceCode||''}</small><small class="block">${a.accountType||'bank'} • ${a.currency} • ${SariUtils.escapeHtml(a.iban)}</small></div></div><div><button onclick="SettingsModule.viewBankAccount('${a.id}')" class="doc-action">Voir/GED</button><button onclick="SettingsModule.editBankAccount('${a.id}')" class="doc-action">Modifier</button><button onclick="SettingsModule.deleteBankAccount('${a.id}')" class="doc-action text-red-600">Supprimer</button></div></div>`).join('')}</section><section class="sari-tile p-5"><header class="flex justify-between"><h3 class="font-extrabold">Coupons & bons de remise</h3><button onclick="SettingsModule.editCoupon()" class="doc-action">${i18n.t('addCoupon','+ Coupon')}</button></header>${this.state.coupons.map(x=>`<div class="p-3 border-b"><div class="flex justify-between"><b>${x.code} • ${SariUtils.escapeHtml(x.name?.[i18n.currentLang]||x.label||'')}</b><span class="sari-badge ${x.isActive?'text-green-600':'text-slate-400'}">${x.isActive?'Actif':'Inactif'}</span></div><p class="text-xs">${x.discountExpression||x.value+(x.discountType==='percentage'?'%':' DZD')} • ${x.scope} • ${i18n.formatDate(x.validFrom||x.effectiveDate)} → ${i18n.formatDate(x.validTo||x.expirationDate)}</p><div><button onclick="SettingsModule.viewCoupon('${x.id}')" class="doc-action"><i data-lucide="chevron-down" class="w-3 h-3"></i> Voir détails</button><button onclick="SettingsModule.editCoupon('${x.id}')" class="doc-action">Modifier</button><button onclick="SettingsModule.deleteCoupon('${x.id}')" class="doc-action text-red-600">Supprimer</button></div></div>`).join('')}</section><section class="sari-tile p-5"><header class="flex justify-between"><h3 class="font-extrabold">Agents & canaux commerciaux</h3><button onclick="SettingsModule.editReferral()" class="doc-action">${i18n.t('addReferrer','+ Référent')}</button></header>${this.state.referrals.map(x=>`<div class="p-2 border-b"><b>${SariUtils.escapeHtml(x.name)}</b><small class="block">${x.type} • Commission ${x.commissionPercent||0}%</small></div>`).join('')}</section></div></div>`;
    }

    if (tab === 'vatRates') {
      return `<section class="sari-tile p-6"><header class="flex justify-between border-b pb-4"><div><h3 class="font-extrabold text-lg">Gestionnaire des taux TVA</h3><p class="text-xs text-slate-500">Source unique utilisée par les produits et documents commerciaux.</p></div><button onclick="SettingsModule.editVatRate()" class="sari-btn px-4 py-2 bg-sari-blue text-white text-xs">+ Nouveau taux</button></header><div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">${this.state.vatRates.map(rate=>`<article class="p-4 border rounded-xl ${rate.isActive?'':'opacity-50'}"><div class="flex justify-between"><b>${SariUtils.escapeHtml(rate.name?.[i18n.currentLang]||rate.label)}</b>${rate.isDefault?'<span class="sari-badge bg-sari-lime/20 text-sari-lime-dark">Défaut</span>':''}</div><div class="text-3xl font-black text-sari-blue my-3">${rate.percentage}%</div><div class="flex gap-2"><button onclick="SettingsModule.editVatRate('${rate.id}')" class="doc-action">Modifier</button><button onclick="SettingsModule.toggleVatRate('${rate.id}')" class="doc-action">${rate.isActive?'Désactiver':'Activer'}</button><button onclick="SettingsModule.deleteVatRate('${rate.id}')" class="doc-action text-red-600">Supprimer</button></div></article>`).join('')}</div></section>`;
    }

    if (tab === 'documentCodes') {
      return `<section class="sari-tile p-6"><header class="flex flex-col md:flex-row justify-between gap-3 border-b pb-4"><div><h3 class="font-extrabold text-lg">Types de documents & numérotation</h3><p class="text-xs text-slate-500">Masques, séquences, réinitialisation et sous-types ERP.</p></div><button onclick="SettingsModule.editDocumentCode()" class="sari-btn px-4 py-2 bg-sari-blue text-white text-xs">+ Nouveau type</button></header><div class="overflow-x-auto mt-4"><table class="w-full sari-table text-xs min-w-[900px]"><thead><tr class="border-b text-left uppercase text-slate-500"><th class="p-2">Code</th><th>Désignation</th><th>Type</th><th>Masque</th><th>Exemple</th><th>Reset</th><th>Actions</th></tr></thead><tbody>${this.state.documentCodes.sort((a,b)=>a.code.localeCompare(b.code)).map(def=>`<tr class="border-b"><td class="p-2 font-black text-sari-blue">${def.code}</td><td><b>${SariUtils.escapeHtml(def.designation)}</b><div class="text-[10px] text-slate-400">${SariUtils.escapeHtml(def.description||'')}</div></td><td>${def.maskType}</td><td><code>${SariUtils.escapeHtml(def.mask)}</code></td><td class="font-mono-tech">${SariUtils.escapeHtml(def.example)}</td><td>${def.resetFrequency}</td><td><button onclick="SettingsModule.editDocumentCode('${def.id}')" class="doc-action">Modifier</button><button onclick="SettingsModule.deleteDocumentCode('${def.id}')" class="doc-action text-red-600">Supprimer</button></td></tr>`).join('')}</tbody></table></div><div class="mt-4 p-3 bg-sari-blue/5 rounded text-xs"><b>Jetons :</b> {YY}, {YYYY}, {MM}, {SEQ}, {SUBTYPE}, {COUNTRY3}, {TEMPLATE3}, {REGISTRY}. La séquence grandit automatiquement au-delà du minimum configuré.</div></section>`;
    }

    if (tab === 'checklists') {
      return `<div class="sari-tile p-6"><div class="flex justify-between items-center border-b pb-4"><div><h3 class="font-extrabold text-lg">Modèles de checklist</h3><p class="text-xs text-slate-500">Les modèles sont copiés lors de la création d’un appel d’offres.</p></div><button onclick="SettingsModule.editChecklistTemplate()" class="sari-btn px-4 py-2 bg-sari-blue text-white text-xs"><i data-lucide="plus" class="w-4 h-4"></i>Nouveau modèle</button></div><div class="grid md:grid-cols-2 gap-4 mt-5">${this.state.checklistTemplates.map(tpl=>`<article class="p-4 border rounded-xl bg-slate-50 dark:bg-slate-800/60"><div class="flex justify-between"><div><h4 class="font-extrabold">${SariUtils.escapeHtml(tpl.name)}</h4><p class="text-xs text-slate-500">${SariUtils.escapeHtml(tpl.description||'')}</p></div><span class="sari-badge">${tpl.items.length} lignes</span></div><ol class="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">${tpl.items.map(i=>`<li>• ${SariUtils.escapeHtml(i.label)}</li>`).join('')}</ol><div class="flex justify-end gap-2 mt-4 pt-3 border-t"><button onclick="SettingsModule.editChecklistTemplate('${tpl.id}')" class="doc-action">Modifier</button><button onclick="SettingsModule.deleteChecklistTemplate('${tpl.id}')" class="doc-action text-red-600">Supprimer</button></div></article>`).join('')}</div></div>`;
    }

    if (tab === 'permissions') {
      const modules=['dashboard','inventory','tenders','importExport','suppliers','sales','customers','reports','documents','hr','tasks','portal','messages','purchases','ged','taxes','masterData','inventoryOps','bulkImport','api','users','vatRates','documentCodes','settings']; const actions=['view','create','edit','delete'];
      return `<div class="sari-tile p-6"><div class="border-b pb-4"><h3 class="font-extrabold text-lg">${i18n.t('rolesPermissions','Rôles & permissions')}</h3><p class="text-xs text-slate-500">${i18n.t('rolesPermissionsDescription','Contrôle granulaire par module et action. Les modifications prennent effet à la prochaine navigation.')}</p></div><div class="overflow-x-auto mt-4"><table class="w-full text-xs"><thead><tr class="border-b"><th class="p-2 text-left">Module</th>${this.state.roles.map(r=>`<th class="p-2 min-w-32">${SariUtils.escapeHtml(this.permissionRoleLabel(r))}</th>`).join('')}</tr></thead><tbody>${modules.map(mod=>`<tr class="border-b"><td class="p-2 font-bold">${i18n.t(`permissionModule_${mod}`,mod)}</td>${this.state.roles.map(r=>`<td class="p-2"><div class="grid grid-cols-2 gap-1">${actions.map(a=>{const checked=r.permissions.includes('*')||r.permissions.includes(`${mod}.*`)||r.permissions.includes(`${mod}.${a}`);return `<label class="flex items-center gap-1" title="${mod}.${a}"><input type="checkbox" ${checked?'checked':''} ${r.id==='admin'?'disabled':''} onchange="SettingsModule.togglePermission('${r.id}','${mod}','${a}',this.checked)"><span>${a[0].toUpperCase()}</span></label>`}).join('')}</div></td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="text-[10px] text-slate-400 mt-3">V = view, C = create, E = edit, D = delete. Des dérogations individuelles peuvent être stockées sur la fiche employé.</p></div>`;
    }

    if (tab === 'documentTemplates') {
      const blocks = this.state.settings?.templateBlocks || [];
      return `<div class="space-y-5"><div class="sari-tile p-6"><div class="flex flex-col md:flex-row justify-between gap-3 border-b pb-4"><div><h3 class="font-extrabold text-lg">Bibliothèque de modèles</h3><p class="text-xs text-slate-500">Modèles visuels ou HTML sécurisés, miniatures, duplication et historique de versions.</p></div><div class="flex flex-wrap gap-2"><button onclick="DocumentRegression.show()" class="sari-btn px-4 py-2 bg-sari-lime text-slate-900 text-xs">QA impression</button><button onclick="TemplateDesigner.open()" class="sari-btn px-4 py-2 bg-sari-blue text-white text-xs">+ Modèle visuel</button><button onclick="TemplateDesigner.openHtml()" class="sari-btn px-4 py-2 bg-slate-800 text-white text-xs">+ Modèle HTML</button><button onclick="SettingsModule.importTemplate()" class="sari-btn px-4 py-2 bg-sari-lime text-slate-900 text-xs" title="Importer un modèle (.json / .html)"><i data-lucide="upload" class="w-3.5 h-3.5"></i> Importer un modèle</button></div></div><div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">${window.SariCore.ordering.stableOrder(this.state.documentTemplates).map(t=>`<article class="rounded-xl border overflow-hidden hover:border-sari-blue transition"><div class="h-44 bg-slate-200 overflow-hidden relative">${t.templateMode==='html'?`<iframe sandbox="" srcdoc="${SariUtils.escapeHtml(TemplateEngine.sanitize(t.htmlContent||TemplateEngine.defaultHtml()))}" class="pointer-events-none bg-white" style="width:794px;height:1123px;transform:scale(.28);transform-origin:top left"></iframe>`:`<div class="w-full h-full p-4 bg-white text-slate-900 relative" style="border-top:8px solid ${t.accent||'#009CC5'}"><b style="color:${t.accent||'#009CC5'}">SARI SYSTÈME</b>${(t.elements||[]).slice(0,6).map(el=>`<span class="absolute bg-slate-100 border text-[6px] overflow-hidden" style="left:${el.x/4}px;top:${el.y/6}px;width:${Math.max(20,el.w/4)}px;height:${Math.max(8,el.h/6)}px">${el.field||el.content||el.kind}</span>`).join('')}</div>`}<span class="absolute top-2 right-2 sari-badge bg-white text-slate-800">${t.templateMode||'designer'}</span></div><div class="p-3 bg-slate-50 dark:bg-slate-800"><b>#${t.order||'—'} • ${SariUtils.escapeHtml(t.name)}</b><p class="text-xs text-slate-500">ID ${t.numericId||'—'} • ${t.paperFormat||'A4'} • ${t.type} • v${(t.versions?.length||0)+1}</p><div class="flex flex-wrap gap-1 mt-2"><button onclick="${t.templateMode==='html'?`TemplateDesigner.openHtml('${t.id}')`:`TemplateDesigner.open('${t.id}')`}" class="doc-action">Ouvrir</button><button onclick="SettingsModule.editDocumentTemplate('${t.id}')" class="doc-action">Propriétés</button><button onclick="SettingsModule.duplicateDocumentTemplate('${t.id}')" class="doc-action" title="Copier / dupliquer">Dupliquer</button><button onclick="SettingsModule.exportTemplate('${t.id}')" class="doc-action" title="Exporter le modèle (JSON)">Exporter</button>${t.templateMode==='html'?`<button onclick="SettingsModule.exportTemplateHtml('${t.id}')" class="doc-action" title="Exporter le HTML brut">Exporter HTML</button>`:''}${t.versions?.length?`<button onclick="SettingsModule.restoreTemplateVersion('${t.id}')" class="doc-action">Restaurer version</button>`:''}<button onclick="SettingsModule.deleteDocumentTemplate('${t.id}')" class="doc-action text-red-600">Supprimer</button></div></div></article>`).join('')}</div></div><div class="sari-tile p-6"><div class="flex flex-col md:flex-row justify-between gap-3 border-b pb-4"><div><h3 class="font-extrabold text-lg">Blocs réutilisables (en-tête / pied de page)</h3><p class="text-xs text-slate-500">En-têtes et pieds de page prêts à composer dans les modèles, au lieu de les reconstruire à chaque fois.</p></div><button onclick="SettingsModule.editTemplateBlock()" class="sari-btn px-4 py-2 bg-sari-blue text-white text-xs">+ Nouveau bloc</button></div><div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">${blocks.length?blocks.map(b=>`<article class="rounded-xl border p-4"><div class="flex justify-between"><span class="sari-badge ${b.position==='footer'?'bg-sari-amber/20 text-sari-amber':'bg-sari-blue/10 text-sari-blue'}">${b.position==='footer'?'Pied de page':'En-tête'}</span><b>${SariUtils.escapeHtml(b.name)}</b></div><div class="mt-3 text-xs text-slate-500 border rounded p-2 bg-slate-50 max-h-24 overflow-hidden">${TemplateEngine.sanitize(b.html||'')}</div><div class="flex gap-2 mt-3"><button onclick="SettingsModule.editTemplateBlock('${b.id}')" class="doc-action">Modifier</button><button onclick="SettingsModule.deleteTemplateBlock('${b.id}')" class="doc-action text-red-600">Supprimer</button></div></article>`).join(''):`<p class="text-sm text-slate-400 col-span-full py-4">Aucun bloc réutilisable. Créez un en-tête ou un pied de page pour l’insérer dans vos modèles.</p>`}</div></div></div>`;
    }

    if (tab === 'database') {
      const db=this.state.externalDbConfig||{type:'indexeddb',configured:false,active:false};
      const targetType=['mysql','postgresql','mongodb'].includes(db.type)?db.type:'mysql',targetLabel={mysql:'MySQL',postgresql:'PostgreSQL',mongodb:'MongoDB'}[targetType];
      return `<div class="space-y-5"><section class="sari-tile p-6"><div class="flex justify-between border-b pb-4"><div><span class="sari-badge ${db.active?'bg-green-100 text-green-700':'bg-slate-100 text-slate-600'}">${db.active?i18n.t('externalBackendActive','BACKEND EXTERNE ACTIF'):i18n.t('indexedDbOffline','INDEXEDDB OFFLINE')}</span><h3 class="font-extrabold text-lg mt-2">${i18n.t('databaseConnector','Connexion base de données externe')}</h3><p class="text-xs text-slate-500">${i18n.t('databaseConnectorDescription','Test réel côté serveur pour MySQL, PostgreSQL et MongoDB. Les secrets saisis restent uniquement en mémoire serveur, sauf SARI_DB_PASSWORD fourni par l’environnement.')}</p></div><i data-lucide="database-zap" class="w-10 h-10 text-sari-blue"></i></div><form id="external-db-form" onsubmit="SettingsModule.saveExternalDB(event)" class="grid md:grid-cols-3 gap-4 mt-5"><label class="doc-label">${i18n.t('databaseType','Type de base de données')}<select id="ext-db-type" class="doc-input" onchange="SettingsModule.externalTypeChanged(this.value)"><option value="mysql" ${targetType==='mysql'?'selected':''}>MySQL</option><option value="postgresql" ${targetType==='postgresql'?'selected':''}>PostgreSQL</option><option value="mongodb" ${targetType==='mongodb'?'selected':''}>MongoDB</option></select></label><label class="doc-label">${i18n.t('hostRequired','Hôte *')}<input id="ext-db-host" value="${SariUtils.escapeHtml(db.host||'localhost')}" class="doc-input" required></label><label class="doc-label">${i18n.t('portRequired','Port * (nombres uniquement)')}<input id="ext-db-port" type="number" inputmode="numeric" value="${db.port||({mysql:3306,postgresql:5432,mongodb:27017}[targetType])}" class="doc-input" required></label><label class="doc-label">${i18n.t('databaseNameRequired','Nom de la base de données *')}<input id="ext-db-name" value="${SariUtils.escapeHtml(db.database||'sari_erp_prod')}" class="doc-input" required></label><label class="doc-label">${i18n.t('dbUsername','Nom d’utilisateur')}<input id="ext-db-user" autocomplete="username" value="${SariUtils.escapeHtml(db.username||'')}" class="doc-input"></label><label class="doc-label">${i18n.t('dbPassword','Mot de passe')}<input id="ext-db-password" type="password" autocomplete="new-password" placeholder="${db.hasPassword?i18n.t('keepCurrentSecret','Secret déjà disponible — laisser vide pour le conserver'):i18n.t('connectionPassword','Mot de passe de connexion')}" class="doc-input"><small class="field-helper">${i18n.t('dbSecretHelper','Jamais écrit dans .runtime. Une valeur saisie dans l’interface reste disponible dans la mémoire serveur jusqu’au redémarrage du serveur.')}</small></label><label class="doc-label">${i18n.t('ssl','SSL')}<select id="ext-db-ssl" class="doc-input"><option value="false" ${!db.ssl?'selected':''}>${i18n.t('dbDisabled','Désactivé')}</option><option value="true" ${db.ssl?'selected':''}>${i18n.t('dbEnabled','Activé')}</option></select></label><label class="doc-label">${i18n.t('activeBackend','Backend actif')}<select id="ext-db-active" class="doc-input"><option value="false" ${!db.active?'selected':''}>${i18n.t('indexedDbOnly','Non — IndexedDB uniquement')}</option><option value="true" ${db.active?'selected':''}>${i18n.t('syncViaApi','Oui — synchronisation via API')}</option></select></label><div class="flex items-end gap-2"><button type="button" onclick="SettingsModule.testExternalDB()" class="sari-btn px-4 py-2 bg-sari-lime text-slate-900">${i18n.t('testForReal','Tester réellement')}</button><button type="submit" class="sari-btn px-4 py-2 bg-sari-blue text-white">${i18n.t('testSave','Tester & enregistrer')}</button></div></form><div id="external-db-feedback" class="mt-4"></div></section>
      <section class="sari-tile p-6"><div class="flex flex-col md:flex-row justify-between gap-3"><div><h3 class="font-extrabold text-lg">${i18n.t('migrateIndexedDb','Migration IndexedDB → {database}').replace('{database}',`<span id="external-migration-target">${targetLabel}</span>`)}</h3><p class="text-xs text-slate-500">${i18n.t('migrationDescription','Transfert idempotent par table/collection, vérification des écritures dans la cible et rapport détaillé.')}</p></div><div class="flex gap-2"><button onclick="SettingsModule.preflightExternalMigration()" ${db.active?'':'disabled'} class="sari-btn px-4 bg-slate-200 disabled:opacity-40">${i18n.t('preValidate','Prévalider')}</button><button id="external-migration-start" onclick="SettingsModule.migrateToExternalDB()" ${db.active?'':'disabled'} class="sari-btn px-5 bg-sari-amber text-slate-900 disabled:opacity-40">${i18n.t('startMigration','Lancer la migration')}</button></div></div><div class="external-progress-track mt-4"><div id="external-migration-progress" class="external-progress-bar" style="width:0%"></div></div><div class="flex justify-between mt-1 text-xs"><span id="external-migration-step">${i18n.t('pending','En attente')}</span><b id="external-migration-percent">0%</b></div><div id="external-migration-results" class="mt-4 grid md:grid-cols-3 gap-2"></div></section>
      <section class="sari-tile p-5"><header class="flex justify-between gap-3"><div><h3 class="font-extrabold flex items-center gap-2"><i data-lucide="terminal" class="w-4 h-4 text-sari-blue"></i>${i18n.t('diagnosticConsole','Console diagnostique')}</h3><p class="text-xs text-slate-500">${i18n.t('diagnosticConsoleDescription','Tentatives de connexion et étapes de migration en temps réel.')}</p></div><button onclick="SettingsModule.clearDbDiagnostics()" class="doc-action">${i18n.t('clear','Effacer')}</button></header><div id="external-db-console" class="external-db-console mt-4"><p class="text-slate-500">${i18n.t('noEvent','Aucun événement.')}</p></div></section><section class="sari-tile p-4 text-xs"><b>${i18n.t('offlineFirstArchitecture','Architecture offline-first :')}</b> ${i18n.t('offlineFirstDescription','IndexedDB reste le cache local et la file de synchronisation. La cible active reçoit ensuite les mutations via le connecteur serveur.')}</section></div>`;
    }

    // Data Tools Tab
    return `
      <div class="sari-tile p-6 space-y-6">
        <div class="border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">Outils de Données, Exports CSV & Sauvegardes Système</h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Exportez l'ensemble des tables en CSV pour vos tableurs Excel, effectuez un backup JSON de vos 67 stores ou restaurez votre système.
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
              Générez un snapshot complet au format .json du système, incluant les paramètres, catalogues, et historiques de soumission.
            </p>

            <div class="space-y-2">
              <button onclick="SettingsModule.exportSQLDump()" class="sari-btn w-full py-2.5 bg-sari-blue text-white font-extrabold text-xs"><i data-lucide="database-backup" class="w-4 h-4"></i> EXPORT COMPLET MYSQL (.SQL)</button>
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
      currency: document.getElementById('cfg-currency').value,
      defaultBankAccountId: document.getElementById('cfg-default-bank-account').value,
      bankRib: this.state.bankAccounts.find(a=>a.id===document.getElementById('cfg-default-bank-account').value)?.iban || ''
    };

    this.state.settings = newSettings;
    await window.sariDB.save('settings', newSettings);
    window.app.showToast('Coordonnées de l\'entreprise enregistrées !', 'success');
    await this.render();
  },

  externalPayload(){return{type:document.getElementById('ext-db-type').value,host:document.getElementById('ext-db-host').value.trim(),port:Number(document.getElementById('ext-db-port').value),database:document.getElementById('ext-db-name').value.trim(),username:document.getElementById('ext-db-user').value.trim(),password:document.getElementById('ext-db-password').value,ssl:document.getElementById('ext-db-ssl').value==='true',active:document.getElementById('ext-db-active').value==='true'};},
  externalTypeChanged(type){const ports={mysql:3306,postgresql:5432,mongodb:27017},labels={mysql:'MySQL',postgresql:'PostgreSQL',mongodb:'MongoDB'};document.getElementById('ext-db-port').value=ports[type];const target=document.getElementById('external-migration-target'),button=document.getElementById('external-migration-start'),step=document.getElementById('external-migration-step');if(target)target.textContent=labels[type];if(button)button.disabled=true;if(step)step.textContent=i18n.t('saveTargetBeforeMigration','Enregistrez la nouvelle cible avant de migrer.');},
  dbFeedbackText(result={},success=false){if(success)return i18n.t('connectionSucceeded','Connexion réussie.');const messages={DB_NOT_ACTIVE:i18n.t('dbNotActive','La cible doit être enregistrée et active avant la migration.'),DB_NOT_CONFIGURED:i18n.t('dbNotConfigured','Enregistrez une base MySQL, PostgreSQL ou MongoDB avant la prévalidation.'),CLIENT_TIMEOUT:i18n.t('connectionTimeout','Délai de connexion dépassé. Vérifiez le réseau, le pare-feu et la liste blanche.'),ETIMEDOUT:i18n.t('connectionTimeout','Délai de connexion dépassé. Vérifiez le réseau, le pare-feu et la liste blanche.'),ECONNREFUSED:i18n.t('connectionRefused','Connexion refusée. Vérifiez que le serveur de base de données est démarré et que le port est ouvert.'),ENOTFOUND:i18n.t('hostNotFound','Hôte introuvable. Vérifiez le nom DNS ou l’adresse IP.'),ER_ACCESS_DENIED_ERROR:i18n.t('mysqlAccessDenied','Identifiant ou mot de passe MySQL incorrect.'),ER_BAD_DB_ERROR:i18n.t('mysqlDatabaseMissing','La base MySQL demandée n’existe pas.'),'28P01':i18n.t('postgresAccessDenied','Identifiant ou mot de passe PostgreSQL incorrect.'),'3D000':i18n.t('postgresDatabaseMissing','La base PostgreSQL demandée n’existe pas.'),MongoServerSelectionError:i18n.t('mongoUnavailable','Aucun serveur MongoDB joignable dans le délai imparti.'),MongoServerError:i18n.t('mongoRejected','MongoDB a refusé la connexion ou l’opération.'),NETWORK_ERROR:i18n.t('networkError','Le serveur ne répond pas. Vérifiez votre connexion.'),INVALID_RESPONSE:i18n.t('invalidServerResponse','Réponse serveur invalide.'),PREFLIGHT_NETWORK_ERROR:i18n.t('preflightNetworkError','La prévalidation ne peut pas joindre le serveur.')};return messages[result.code]||i18n.t('connectionFailed','Échec de connexion.');},
  showExternalFeedback(result,success){const el=document.getElementById('external-db-feedback'),message=this.dbFeedbackText(result,success);if(el)el.innerHTML=`<div class="p-3 rounded border ${success?'bg-green-50 border-green-300 text-green-800':'bg-red-50 border-red-300 text-red-700'}"><b>${success?i18n.t('connectionSuccessMark','✓ Connexion réussie'):i18n.t('connectionFailureMark','✗ Échec de connexion')}</b><p class="text-xs">${SariUtils.escapeHtml(message)}</p>${result.code?`<code class="block text-[10px] mt-1">${SariUtils.escapeHtml(result.code)} • ${SariUtils.escapeHtml(result.target||'')}</code>`:''}${result.serverVersion?`<small class="block mt-1">${i18n.t('serverLabel','Serveur')}: ${SariUtils.escapeHtml(result.serverVersion)}</small>`:''}${result.latencyMs!==undefined?`<span class="sari-badge mt-1">${result.latencyMs} ms</span>`:''}</div>`;},
  async testExternalDB(){const payload=this.externalPayload(),feedback=document.getElementById('external-db-feedback'),controller=new AbortController(),timeoutMs=15000,timer=setTimeout(()=>controller.abort('connection-test-timeout'),timeoutMs);if(feedback)feedback.innerHTML=`<div class="p-3 border rounded flex gap-2"><i data-lucide="loader-2" class="animate-spin"></i>${i18n.t('realConnectionInProgress','Connexion réelle en cours…')} <span class="text-slate-400">(${i18n.t('maximum','maximum')} ${timeoutMs/1000}s)</span></div>`;window.SariIcons?.hydrate();try{const response=await fetch('/api/db/test',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});let result;try{result=await response.json();}catch(_){result={success:false,error:`Réponse serveur invalide (HTTP ${response.status}).`,code:'INVALID_RESPONSE'};}if(response.ok&&result.success)result.message=`${result.message}. Test validé : sélectionnez « Backend actif : Oui », puis cliquez sur « Tester & enregistrer » pour pouvoir prévalider.`;this.showExternalFeedback(result,response.ok&&result.success);return response.ok&&result.success;}catch(error){const timedOut=error?.name==='AbortError'||controller.signal.aborted;this.showExternalFeedback({error:timedOut?`Le test a été arrêté après ${timeoutMs/1000} secondes. Vérifiez l’hôte, le port, le pare-feu et redémarrez le serveur Node après une mise à jour.`:error.message,code:timedOut?'CLIENT_TIMEOUT':'NETWORK_ERROR'},false);return false;}finally{clearTimeout(timer);await Promise.race([this.refreshDbDiagnostics(),new Promise(resolve=>setTimeout(resolve,2000))]);}},
  async saveExternalDB(event){event.preventDefault();const payload=this.externalPayload(),controller=new AbortController(),timer=setTimeout(()=>controller.abort('configuration-timeout'),18000);try{const response=await fetch('/api/db/config',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal}),result=await response.json();this.showExternalFeedback(result,response.ok);if(response.ok){this.state.externalDbConfig=result;await dbAdapter.setDriver(result.active?result.type:'indexeddb',{serverManaged:true});app.showToast(`Connexion ${String(result.type).toUpperCase()} enregistrée côté serveur.`,'success');await this.render();}return response.ok;}catch(error){const timedOut=error?.name==='AbortError'||controller.signal.aborted;this.showExternalFeedback({error:timedOut?'Enregistrement interrompu après 18 secondes. Vérifiez la cible et redémarrez le serveur Node.':error.message,code:timedOut?'CLIENT_TIMEOUT':'NETWORK_ERROR'},false);return false;}finally{clearTimeout(timer);await Promise.race([this.refreshDbDiagnostics(),new Promise(resolve=>setTimeout(resolve,2000))]);}},
  startDbDiagnosticPolling(){this.stopDbDiagnosticPolling();this._dbDiagnosticTimer=setInterval(()=>{if(app.activeModule==='settings'&&this.state.activeTab==='database')this.refreshDbDiagnostics();else this.stopDbDiagnosticPolling();},1500);},
  stopDbDiagnosticPolling(){if(this._dbDiagnosticTimer){clearInterval(this._dbDiagnosticTimer);this._dbDiagnosticTimer=null;}},
  async refreshDbDiagnostics(){try{const response=await fetch('/api/db/diagnostics',{credentials:'same-origin',cache:'no-store'});if(response.ok)this.state.dbDiagnostics=(await response.json()).entries||[];}catch(_){}this.renderDbDiagnostics();},
  diagnosticEventLabel(event=''){const keys={'connection.attempt':'connectionAttempt','connection.step':'connectionStep','connection.success':'connectionSuccess','connection.failure':'connectionFailure','configuration.saved':'configurationSaved','migration.schema.created':'migrationSchemaCreated','migration.preflight':'migrationPreflight','migration.preflight.result':'migrationPreflight','migration.batch.start':'migrationBatchStart','migration.record.failure':'migrationRecordFailure','migration.batch.failure':'migrationRecordFailure','migration.batch.complete':'migrationBatchComplete'};return i18n.t(keys[event]||'diagnosticEvent',event);},
  diagnosticMessage(entry={}){const details=entry.details||{},target=details.target||'',store=details.store||'',table=details.table||'';switch(entry.event){case'connection.attempt':return `${i18n.t('connectionAttempt','Tentative de connexion')} • ${target}`;case'connection.step':return `${i18n.t('connectionStep','Étape de connexion')} • ${target}`;case'connection.success':return `${i18n.t('connectionSuccess','Connexion réussie')} • ${target}${details.latencyMs!=null?` • ${details.latencyMs} ms`:''}`;case'connection.failure':return `${i18n.t('connectionFailure','Échec de connexion')} • ${target}${details.code?` • ${details.code}`:''}`;case'configuration.saved':return `${i18n.t('configurationSaved','Configuration enregistrée')} • ${String(details.type||'').toUpperCase()}`;case'migration.schema.created':return `${i18n.t('migrationSchemaCreated','Schéma de migration créé')} • ${table}`;case'migration.preflight':return `${i18n.t('migrationPreflight','Prévalidation de migration')} • ${target}`;case'migration.preflight.result':return `${i18n.t(details.ready?'targetReady':'targetNotReady',details.ready?'Cible prête.':'Cible non prête.')} • ${target}`;case'migration.batch.start':return `${i18n.t('migrationBatchStart','Démarrage du lot de migration')} • ${store} • ${details.attempted||0}`;case'migration.record.failure':return `${i18n.t('migrationRecordFailure','Échec d’un enregistrement')} • ${store}/${details.id||'—'}`;case'migration.batch.failure':return `${i18n.t('migrationRecordFailure','Échec du lot de migration')} • ${store}${details.code?` • ${details.code}`:''}`;case'migration.batch.complete':return `${i18n.t('migrationBatchComplete','Lot de migration terminé')} • ${store} • ${details.migrated||0}/${details.attempted||0}`;default:return this.diagnosticEventLabel(entry.event);}},
  renderDbDiagnostics(){const consoleEl=document.getElementById('external-db-console');if(!consoleEl)return;const rows=this.state.dbDiagnostics||[];consoleEl.innerHTML=rows.length?rows.slice(-200).map(entry=>`<div class="db-console-line ${entry.level}"><time>${new Date(entry.timestamp).toLocaleTimeString(i18n.currentLang==='ar'?'ar-DZ':i18n.currentLang==='en'?'en-GB':'fr-FR')}</time><b>${SariUtils.escapeHtml(this.diagnosticEventLabel(entry.event))}</b><span>${SariUtils.escapeHtml(this.diagnosticMessage(entry))}</span>${entry.details?.code?`<code>${SariUtils.escapeHtml(entry.details.code)}</code>`:''}</div>`).join(''):`<p class="text-slate-500">${i18n.t('noEvent','Aucun événement.')}</p>`;consoleEl.scrollTop=consoleEl.scrollHeight;},
  async clearDbDiagnostics(){await fetch('/api/db/diagnostics',{method:'DELETE',credentials:'same-origin'}).catch(()=>null);this.state.dbDiagnostics=[];this.renderDbDiagnostics();},
  async preflightExternalMigration(){const step=document.getElementById('external-migration-step'),config=this.state.externalDbConfig||{};if(!['mysql','postgresql','mongodb'].includes(config.type)||!config.active){const error={error:'Le test de connexion est réussi, mais la cible n’est pas encore enregistrée et active.',code:!config.active?'DB_NOT_ACTIVE':'DB_NOT_CONFIGURED',hint:'Sélectionnez « Backend actif : Oui », puis cliquez sur « Tester & enregistrer » avant de prévalider.'};this.showExternalFeedback(error,false);if(step)step.textContent=error.hint;return false;}if(step)step.textContent=`Prévalidation de ${String(config.type).toUpperCase()}…`;try{const response=await fetch('/api/db/migration/preflight',{credentials:'same-origin',cache:'no-store'}),result=await response.json();this.showExternalFeedback({message:result.message||result.error,code:result.code,target:result.target,hint:result.hint},response.ok&&result.ready);await this.refreshDbDiagnostics();return response.ok&&result.ready;}catch(error){this.showExternalFeedback({error:error.message,code:'PREFLIGHT_NETWORK_ERROR'},false);return false;}},
  updateMigrationProgress(processed,total,label=''){const percent=total?Math.min(100,Math.round(processed/total*100)):100,bar=document.getElementById('external-migration-progress'),text=document.getElementById('external-migration-percent'),step=document.getElementById('external-migration-step');if(bar)bar.style.width=`${percent}%`;if(text)text.textContent=`${percent}%`;if(step)step.textContent=`${label}${total?` • ${processed}/${total} enregistrement(s)`:''}`;},
  migrationSummaryHtml(summaries){return summaries.map(summary=>`<div class="p-3 border rounded ${summary.failed.length?'border-amber-400':'border-green-300'}"><b>${SariUtils.escapeHtml(summary.storeName)}</b><p class="text-xs">${summary.migrated}/${summary.total} migré(s) • ${summary.verified||0} vérifié(s) • ${summary.failed.length} échec(s)</p>${summary.failed.slice(0,3).map(error=>`<small class="block text-red-600">${SariUtils.escapeHtml(String(error.id))}: ${SariUtils.escapeHtml(error.reason)}</small>`).join('')}</div>`).join('');},
  async migrateToExternalDB(){if(this.state.migrationRunning)return;const ready=await this.preflightExternalMigration();if(!ready)return;this.updateMigrationProgress(0,0,'Réparation des identifiants numériques locaux…');await sariDB.backfillNumericIdsAndReferences();const dependencyOrder=['warehouses','vatRates','documentCodes','sequenceCounters','countries','clientTypes','supplierTypes','bankTypes','productCategories','logisticsStatuses','incoterms','paymentMethods','banks','bankAccounts','suppliers','customers','products','productLots','employees','jobPostings','tenders','shipments','orders','purchaseDocuments'];const available=Array.from(sariDB.db.objectStoreNames).filter(name=>!['recordSequences','syncQueue'].includes(name)),stores=[...dependencyOrder.filter(name=>available.includes(name)),...available.filter(name=>!dependencyOrder.includes(name))],results=document.getElementById('external-migration-results'),button=document.getElementById('external-migration-start'),summaries=[];this.state.migrationRunning=true;if(button)button.disabled=true;const data=[];let total=0,processed=0;for(const storeName of stores){const records=await sariDB.getAll(storeName);data.push({storeName,records});total+=records.length;}results.innerHTML='<p class="text-sm">Migration en cours…</p>';document.getElementById('external-migration-progress')?.classList.add('active');this.updateMigrationProgress(0,total,`Démarrage vers ${String(this.state.externalDbConfig?.type||'externe').toUpperCase()}`);try{for(const {storeName,records} of data){let migrated=0,verified=0,failed=[];if(!records.length){summaries.push({storeName,migrated,verified,failed,total:0});continue;}const chunkSize=storeName==='documents'?1:25;for(let offset=0;offset<records.length;offset+=chunkSize){const chunk=records.slice(offset,offset+chunkSize);this.updateMigrationProgress(processed,total,`${storeName} • lot ${Math.floor(offset/chunkSize)+1}/${Math.ceil(records.length/chunkSize)}`);try{const response=await fetch('/api/db/migrate-batch',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({storeName,records:chunk})}),result=await response.json();if(response.ok){migrated+=result.migrated||0;verified+=result.verified||0;failed.push(...(result.failed||[]));}else failed.push({id:'batch',reason:`${result.code||'ERROR'}: ${result.error||'Erreur serveur'}`});}catch(error){failed.push({id:'network',reason:error.message});}processed+=chunk.length;this.updateMigrationProgress(processed,total,storeName);await this.refreshDbDiagnostics();}summaries.push({storeName,migrated,verified,failed,total:records.length});results.innerHTML=this.migrationSummaryHtml(summaries);}this.updateMigrationProgress(total,total,summaries.some(summary=>summary.failed.length)?'Migration terminée avec anomalies':'Migration terminée et vérifiée');app.showToast(`Migration terminée : ${summaries.reduce((sum,item)=>sum+item.migrated,0)} migré(s), ${summaries.reduce((sum,item)=>sum+item.verified,0)} vérifié(s).`,summaries.some(item=>item.failed.length)?'warning':'success');}finally{this.state.migrationRunning=false;if(button)button.disabled=false;document.getElementById('external-migration-progress')?.classList.remove('active');await this.refreshDbDiagnostics();}},

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
    const stores = Array.from(window.sariDB.db?.objectStoreNames || []).filter(name=>!['syncQueue'].includes(name));
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

  async exportSQLDump(){try{const sql=await sariDB.exportSQL(),blob=new Blob([sql],{type:'application/sql;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`sari-systeme-full-dump-${new Date().toISOString().slice(0,10)}.sql`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);app.showToast('Dump SQL MySQL complet généré.','success');}catch(error){console.error(error);app.showToast('Erreur pendant la génération SQL.','error');}},

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
    if (!await DialogManager.confirm('Attention: Toutes les données seront réinitialisées au jeu de démonstration Algérie. Continuer ?')) {
      return;
    }
    try {
      const stores = ['products', 'warehouses', 'suppliers', 'shipments', 'tenders', 'customers', 'orders', 'notifications', 'auditLogs', 'syncQueue', 'checklistItems', 'checklistTemplates', 'documents', 'employees', 'missions', 'jobPostings', 'candidates', 'tasks', 'taskStages', 'roles', 'documentTemplates', 'vatRates', 'documentCodes', 'sequenceCounters', 'conversations', 'messages', 'careerRecords', 'purchaseDocuments', 'documentLinks', 'paymentMethods', 'banks', 'bankAccounts', 'coupons', 'referrals', 'taxRecords', 'g50Payments', 'attendance', 'performanceRecords', 'salaryHistory', 'taskHistory', 'clientTypes', 'supplierTypes', 'bankTypes', 'countries', 'productCategories', 'salesStages', 'productLots', 'stockMovements', 'inventoryCounts', 'importProfiles', 'apiTokens', 'apiEndpoints', 'logisticsStatuses', 'incoterms', 'paymentTransactions', 'reportAnnotations', 'entityTranslations', 'translationTexts', 'gedCategories', 'gedModules', 'gedTags', 'gedTypes', 'configurableOptions', 'userProfiles', 'recordSequences', 'barcodeLabelSettings'];
      for (const s of stores) {
        await window.sariDB.clearStore(s);
      }
      await window.sariDB.seedDemoData();
      await window.sariDB.seedFeatureData();
      await window.sariDB.seedEnterpriseData();
      await window.sariDB.seedBusinessData();
      await window.sariDB.seedConfigurationData();
      await window.sariDB.seedMultiPageInvoice();
      await window.sariDB.seedTranslationData();
      window.app.showToast('Données de démonstration chargées !', 'success');
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      window.app.showToast('Erreur lors de la réinitialisation.', 'error');
    }
  },

  logoUploader(field, previewId, value='') {
    return `<div class="logo-drop-zone mt-5" ondragover="event.preventDefault();this.classList.add('dragging')" ondragleave="this.classList.remove('dragging')" ondrop="SettingsModule.dropLogo(event,'${field}','${previewId}')"><img id="${previewId}" src="${value||'/assets/sari-logo.svg'}" class="h-28 max-w-full mx-auto object-contain" alt="Aperçu logo"><p class="text-xs font-bold mt-3">${i18n.t('dragImageHere','Glissez une image ici')}</p><p class="text-[10px] text-slate-400">PNG, JPEG, WEBP ou SVG • 2 Mo max.</p><label class="sari-btn px-4 py-2 mt-3 bg-sari-blue text-white text-xs cursor-pointer">Choisir un fichier<input type="file" accept="image/*" class="hidden" onchange="SettingsModule.selectLogo(this.files[0],'${field}','${previewId}')"></label>${value?`<button onclick="SettingsModule.removeLogo('${field}')" class="doc-action text-red-600 block mx-auto mt-2">Supprimer le logo</button>`:''}</div>`;
  },
  dropLogo(event,field,previewId){event.preventDefault();event.currentTarget.classList.remove('dragging');this.selectLogo(event.dataTransfer.files[0],field,previewId);},
  selectLogo(file,field,previewId){if(!file||!file.type.startsWith('image/'))return app.showToast('Sélectionnez une image valide.','error');if(file.size>2*1024*1024)return app.showToast('Le logo ne doit pas dépasser 2 Mo.','error');const reader=new FileReader();reader.onload=async()=>{document.getElementById(previewId).src=reader.result;this.state.settings[field]=reader.result;await sariDB.save('settings',this.state.settings);this.applyBranding(this.state.settings);app.showToast('Logo enregistré.','success');};reader.readAsDataURL(file);},
  async removeLogo(field){this.state.settings[field]='';await sariDB.save('settings',this.state.settings);this.applyBranding(this.state.settings);this.render();},
  applyBranding(settings=this.state.settings){const img=document.getElementById('sari-site-logo');const fallback=document.getElementById('sari-default-logo');if(img){img.src=settings.siteLogo||'';img.classList.toggle('hidden',!settings.siteLogo);}if(fallback)fallback.classList.toggle('hidden',!!settings.siteLogo);const values={'sidebar-company-name':settings.companyName,'footer-company-name':settings.companyName,'sidebar-company-nif':settings.nif,'sidebar-company-address':settings.address,'footer-company-address':settings.address};for(const[id,value]of Object.entries(values)){const el=document.getElementById(id);if(el&&value)el.textContent=value;}},

  previewQrPattern(value){const preview=document.getElementById('barcode-qr-preview');if(preview)preview.textContent=SariUtils.buildVerificationUrl(value||'',{code:'SARI-PRO03-00001',sku:'PRO03',barcode:'3614271000101',hash:'A1B2C3',numericId:9});},
  async saveBarcodeSettings(event){event.preventDefault();const fields=['showProductName','showSku','showCategory','showLot','showExpiry','showCertification','showWarehouse','showPrice','showOrigin','showBarcode','showQr','includeHash'],record={...(this.state.barcodeLabelSettings||{}),id:'default',name:document.getElementById('barcode-config-name').value.trim()||'Étiquette produit standard',qrPattern:(document.getElementById('barcode-qr-pattern')?.value||'').trim()||'http://sari-systeme.com/verification/{code}/{hash}',updatedAt:new Date().toISOString()};fields.forEach(field=>record[field]=document.getElementById(`barcode-${field}`).checked);await sariDB.save('barcodeLabelSettings',record);this.state.barcodeLabelSettings=record;app.showToast('Configuration étiquette enregistrée.','success');this.render();},

  async saveVerificationSettings(){this.state.settings.verificationSecret=document.getElementById('cfg-verification-secret').value;this.state.settings.verificationBaseUrl=document.getElementById('cfg-verification-url').value.replace(/\/$/,'');await sariDB.save('settings',this.state.settings);app.showToast('Paramètres de vérification enregistrés.','success');},
  async editPaymentMethod(id=''){const old=this.state.paymentMethods.find(x=>x.id===id)||{};const v=await DialogManager.form(id?'Modifier le mode de paiement':'Nouveau mode de paiement',[{name:'code',label:'Code',value:old.code||'',required:true},{name:'fr',label:'Libellé français',value:old.label?.fr||'',required:true},{name:'ar',label:'Libellé arabe',value:old.label?.ar||''},{name:'en',label:'Libellé anglais',value:old.label?.en||''}]);if(!v)return;await sariDB.save('paymentMethods',{...old,id:id||`pay-${crypto.randomUUID()}`,code:v.code,label:{fr:v.fr,ar:v.ar,en:v.en},isActive:true});this.render();},
  async viewPaymentMethod(id){const x=this.state.paymentMethods.find(m=>m.id===id),docs=[...(await sariDB.getAll('orders')),...(await sariDB.getAll('purchaseDocuments'))].filter(d=>d.paymentMethod===x.code);await DialogManager.alert(`${x.code} • ${x.label?.fr||''} • ${docs.length} document(s) • ${i18n.formatCurrency(docs.reduce((s,d)=>s+Number(d.total||0),0))}`,{title:'Mode de paiement'});},
  async deletePaymentMethod(id){if(await DialogManager.confirm('Supprimer ce mode de paiement ?')){await sariDB.delete('paymentMethods',id);this.render();}},
  async editBankAccount(id=''){const old=this.state.bankAccounts.find(a=>a.id===id)||{},bank=this.state.banks.find(b=>b.id===old.bankId)||{};const v=await DialogManager.form(id?'Modifier le compte':'Nouveau compte bancaire',[{name:'name',label:'Nom du compte',value:old.name||'',required:true},{name:'bank',label:'Banque',value:bank.name||'',required:true},{name:'iban',label:'RIB / IBAN',value:old.iban||'',required:true},{name:'currency',label:'Devise',type:'select',value:old.currency||'DZD',options:['DZD','EUR','USD']},{name:'accountType',label:'Type de compte',type:'select',value:old.accountType||this.state.bankTypes[0]?.id,options:this.state.bankTypes.filter(x=>x.isActive).map(x=>({value:x.id,label:x.name?.[i18n.currentLang]||x.name?.fr}))},{name:'paymentMethodId',label:'Mode de paiement lié',type:'select',value:old.paymentMethodId||'',options:this.state.paymentMethods.map(m=>({value:m.id,label:m.label?.fr||m.code}))},{name:'country',label:'Pays',type:'autocomplete',value:old.countryCode||'DZA',options:this.state.countries.filter(c=>c.isActive).map(c=>({value:c.iso3,label:c.name?.[i18n.currentLang]||c.name?.fr}))},{name:'address',label:'Adresse',value:old.address||''},{name:'phone',label:'Téléphone',value:old.phone||''},{name:'contactPerson',label:'Contact',value:old.contactPerson||''},{name:'details',label:'Détails',type:'textarea',value:old.details||''},{name:'logo',label:'Logo',type:'image',value:old.logo||''}]);if(!v)return;const bankId=old.bankId||`bank-${crypto.randomUUID()}`;await sariDB.save('banks',{...bank,id:bankId,name:v.bank,isActive:true});const logo=v.logo||old.logo||'';await sariDB.save('bankAccounts',{...old,id:id||`account-${crypto.randomUUID()}`,bankId,name:v.name,iban:v.iban,currency:v.currency,accountType:v.accountType,paymentMethodId:v.paymentMethodId,countryCode:v.country,country:this.state.countries.find(c=>c.iso3===v.country)?.name?.fr||v.country,address:v.address,phone:v.phone,contactPerson:v.contactPerson,details:RichTextEditor.sanitize(v.details),logo,isActive:old.isActive??true});this.render();},
  async viewBankAccount(id){return BankAccountDetailModule.open(id);},
  async deleteBankAccount(id){if(await DialogManager.confirm('Supprimer ce compte bancaire ?')){await sariDB.delete('bankAccounts',id);this.render();}},
  async editCoupon(id=''){const old=this.state.coupons.find(x=>x.id===id)||{},values=await DialogManager.form(id?'Modifier le coupon':'Nouveau coupon',[{name:'code',label:'Code coupon',value:old.code||'',required:true},{name:'labelFr',label:'Libellé français',value:old.name?.fr||old.label||'',required:true},{name:'labelAr',label:'Libellé arabe',value:old.name?.ar||'',required:true},{name:'labelEn',label:'Libellé anglais',value:old.name?.en||'',required:true},{name:'discountExpression',label:'Valeur (% ou montant fixe)',value:old.discountExpression||(old.discountType==='percentage'?old.value+'%':old.value||''),required:true},{name:'scope',label:'Portée',type:'select',value:old.scope||'invoice',options:[{value:'invoice',label:'Document entier'},{value:'product',label:'Produit spécifique'}]},{name:'productId',label:'ID produit ciblé',value:old.productId||''},{name:'clientIds',label:'IDs clients autorisés, séparés par virgules',value:(old.clientIds||[]).join(',')},{name:'validFrom',label:'Date effective',type:'date',value:old.validFrom||old.effectiveDate||new Date().toISOString().slice(0,10),required:true},{name:'validTo',label:'Date expiration',type:'date',value:old.validTo||old.expirationDate||'',required:true},{name:'usageLimit',label:'Limite utilisation',type:'number',value:old.usageLimit??1},{name:'isActive',label:'Statut',type:'select',value:String(old.isActive??true),options:[{value:'true',label:'Actif'},{value:'false',label:'Inactif'}]}]);if(!values)return;if(new Date(values.validTo)<new Date(values.validFrom))return app.showToast('La date d’expiration doit suivre la date effective.','error');const parsed=SariUtils.parseDiscount(values.discountExpression,100),record={...old,id:id||`coupon-${crypto.randomUUID()}`,code:values.code.trim().toUpperCase(),label:values.labelFr,name:{fr:values.labelFr,ar:values.labelAr,en:values.labelEn},discountExpression:values.discountExpression,discountType:parsed.type,value:parsed.value,scope:values.scope,productId:values.productId,clientIds:String(values.clientIds||'').split(',').map(x=>x.trim()).filter(Boolean),effectiveDate:values.validFrom,expirationDate:values.validTo,validFrom:values.validFrom,validTo:values.validTo,usageLimit:Number(values.usageLimit),usageCount:old.usageCount||0,isActive:values.isActive==='true',updatedAt:new Date().toISOString()};await sariDB.save('coupons',record);app.showToast(id?'Coupon modifié.':'Coupon créé.','success');this.render();},
  async viewCoupon(id){const c=this.state.coupons.find(x=>x.id===id),label=c.name?.[i18n.currentLang]||c.label;await DialogManager.alert(`${c.code} • ${label} • ${c.discountExpression||c.value} • ${i18n.formatDate(c.validFrom||c.effectiveDate)} → ${i18n.formatDate(c.validTo||c.expirationDate)} • ${c.isActive?'Actif':'Inactif'} • Utilisations ${c.usageCount||0}/${c.usageLimit||'∞'}`,{title:'Détail du coupon'});},
  async deleteCoupon(id){if(await DialogManager.confirm('Supprimer ce coupon ?')){await sariDB.delete('coupons',id);this.render();}},
  async editReferral(){const v=await DialogManager.form('Agent / canal commercial',[{name:'name',label:'Nom',required:true},{name:'type',label:'Type',type:'select',options:['agent','referrer','channel']},{name:'commissionPercent',label:'Commission %',type:'number',value:0}]);if(!v)return;await sariDB.save('referrals',{id:`ref-${crypto.randomUUID()}`,...v,commissionPercent:Number(v.commissionPercent),isActive:true});this.render();},

  async editVatRate(id=''){const old=this.state.vatRates.find(r=>r.id===id)||{};const v=await DialogManager.form(id?'Modifier le taux TVA':'Nouveau taux TVA',[{name:'fr',label:'Libellé français',value:old.name?.fr||old.label||'',required:true},{name:'ar',label:'Libellé arabe',value:old.name?.ar||'',required:true},{name:'en',label:'Libellé anglais',value:old.name?.en||'',required:true},{name:'percentage',label:'Pourcentage',type:'number',step:'0.01',value:old.percentage??19,required:true},{name:'isDefault',label:'Taux par défaut',type:'select',value:String(!!old.isDefault),options:[{value:'false',label:'Non'},{value:'true',label:'Oui'}]}]);if(!v)return;const isDefault=v.isDefault==='true';if(isDefault)for(const rate of this.state.vatRates){rate.isDefault=false;await sariDB.save('vatRates',rate);}await sariDB.save('vatRates',{...old,id:id||`vat-${crypto.randomUUID()}`,label:v.fr,name:{fr:v.fr,ar:v.ar,en:v.en},percentage:Number(v.percentage),isDefault,isActive:old.isActive??true});this.render();},
  async deleteVatRate(id){if(await DialogManager.confirm('Supprimer ce taux ? Les documents existants conserveront leur valeur.')){await sariDB.delete('vatRates',id);this.render();}},
  async editDocumentCode(id=''){const old=this.state.documentCodes.find(d=>d.id===id)||{};const v=await DialogManager.form(id?'Modifier le type de document':'Nouveau type de document',[{name:'code',label:'Code court',value:old.code||'NEW',required:true},{name:'designation',label:'Désignation',value:old.designation||'',required:true},{name:'description',label:'Description',type:'textarea',value:old.description||''},{name:'maskType',label:'Type de masque',type:'select',value:old.maskType||'Standard',options:['Standard','CountryBased','SubTypeBased','DateBased','TemplateBased']},{name:'mask',label:'Masque',value:old.mask||'SARI-{PREFIX}{YY}-{SEQ}',required:true},{name:'sequenceMinDigits',label:'Chiffres minimum',type:'number',value:old.sequenceMinDigits||5},{name:'resetFrequency',label:'Réinitialisation',type:'select',value:old.resetFrequency||'yearly',options:['yearly','monthly','never']},{name:'subtypes',label:'Sous-types (01:Libellé, ...)',type:'textarea',value:(old.subTypeOptions||[]).map(x=>`${x.code}:${x.label}`).join(',')}]);if(!v)return;const code=v.code.toUpperCase();const subTypeOptions=v.subtypes.split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const [c,...label]=x.split(':');return{code:c,label:label.join(':')||c}});const record={...old,id:old.id||code,code,designation:v.designation,description:v.description,mask:v.mask,maskType:v.maskType,sequenceMinDigits:Number(v.sequenceMinDigits)||5,resetFrequency:v.resetFrequency,subTypeOptions,isActive:true};record.example=ReferenceCodeManager.render(record,1,{subType:subTypeOptions[0]?.code});await sariDB.save('documentCodes',record);this.render();},
  async deleteDocumentCode(id){if(await DialogManager.confirm('Supprimer ce type de référence ?')){await sariDB.delete('documentCodes',id);this.render();}},
  async editChecklistTemplate(id=''){const old=this.state.checklistTemplates.find(x=>x.id===id)||{};const v=await DialogManager.form(id?'Modifier la checklist':'Nouvelle checklist',[{name:'name',label:'Nom',value:old.name||'',required:true},{name:'description',label:'Description',value:old.description||''},{name:'items',label:'Éléments, un par ligne',type:'textarea',value:(old.items||[]).map(x=>x.label).join('\n'),required:true}]);if(!v)return;await sariDB.save('checklistTemplates',{...old,id:id||`tpl-${crypto.randomUUID()}`,name:v.name,description:v.description,items:v.items.split('\n').map(x=>x.trim()).filter(Boolean).map((label,i)=>({label,dueOffsetDays:-(i+1)})),updatedAt:new Date().toISOString()});this.render();},
  async deleteChecklistTemplate(id){if(await DialogManager.confirm('Supprimer ce modèle ? Les checklists existantes resteront intactes.')){await sariDB.delete('checklistTemplates',id);this.render();}},
  async editDocumentTemplate(id){const old=this.state.documentTemplates.find(x=>x.id===id);const v=await DialogManager.form('Propriétés du modèle',[{name:'name',label:'Nom',value:old.name,required:true},{name:'type',label:'Type',type:'select',value:old.type,options:['all','invoice','quote','purchase_order','delivery_note','purchase_invoice','purchase_quote','goods_receipt']},{name:'paperFormat',label:'Format papier',type:'select',value:old.paperFormat||'A4',options:['A4','Letter']},{name:'accent',label:'Couleur',type:'color',value:old.accent||'#009CC5'}]);if(!v)return;await sariDB.save('documentTemplates',{...old,...v});this.render();},
  async deleteDocumentTemplate(id){if(await DialogManager.confirm('Supprimer ce modèle visuel ?')){await sariDB.delete('documentTemplates',id);this.render();}},
  async duplicateDocumentTemplate(id){const source=await sariDB.getById('documentTemplates',id);if(!source)return;const clone={...SariUtils.deepClone(source),id:`${source.templateMode==='html'?'html-tpl':'doc-tpl'}-${crypto.randomUUID()}`,name:`Copie de ${source.name}`,isDefault:false,referenceCode:await ReferenceCodeManager.generate('TEM',{templateType:'DOC'}),versions:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};await sariDB.save('documentTemplates',clone);app.showToast('Modèle dupliqué.','success');if(clone.templateMode==='html')TemplateDesigner.openHtml(clone.id);else TemplateDesigner.open(clone.id);},
  _downloadBlob(content, filename, mime) { const blob = new Blob([content], { type: mime }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); },
  _templateFileName(name, ext) { return `${String(name || 'modele').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'modele'}.${ext}`; },
  async exportTemplate(id) {
    const t = await sariDB.getById('documentTemplates', id); if (!t) return;
    const envelope = { format: 'sari-template', version: 1, exportedAt: new Date().toISOString(), template: SariUtils.deepClone(t) };
    this._downloadBlob(JSON.stringify(envelope, null, 2), this._templateFileName(t.name, 'saritemplate.json'), 'application/json');
    app.showToast('Modèle exporté (JSON).', 'success');
  },
  async exportTemplateHtml(id) {
    const t = await sariDB.getById('documentTemplates', id); if (!t) return;
    this._downloadBlob(t.htmlContent || '', this._templateFileName(t.name, 'html'), 'text/html');
    app.showToast('Modèle exporté (HTML).', 'success');
  },
  async importTemplate() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,.saritemplate.json,.html,.htm,.txt';
    input.onchange = async () => {
      const file = input.files[0]; if (!file) return;
      try {
        const text = await file.text();
        const looksHtml = /\.(html?|txt)$/i.test(file.name) || (!text.trim().startsWith('{') && text.trim().startsWith('<'));
        if (looksHtml) {
          const name = file.name.replace(/\.[^.]+$/, '');
          const tpl = { id: `html-tpl-${crypto.randomUUID()}`, name, type: 'all', paperFormat: 'A4', accent: '#009CC5', layout: 'html', templateMode: 'html', htmlContent: TemplateEngine.sanitize(text), versions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          await sariDB.save('documentTemplates', tpl);
          app.showToast(`Modèle HTML « ${name} » importé.`, 'success');
        } else {
          const parsed = JSON.parse(text);
          const tpl = parsed.template || parsed;
          if (!tpl || !tpl.name) throw new Error('Format de modèle invalide (champ "template" manquant).');
          const existing = await sariDB.getById('documentTemplates', tpl.id);
          if (existing) {
            const overwrite = await DialogManager.confirm(`Le modèle « ${existing.name} » existe déjà.\n\nMettre à jour ce modèle avec le fichier importé ? (Annuler = importer comme nouvelle copie)`);
            if (overwrite) {
              await sariDB.save('documentTemplates', { ...existing, ...SariUtils.deepClone(tpl), id: existing.id, versions: [...(existing.versions || []), TemplateDesigner.snapshot(existing)].slice(-10), updatedAt: new Date().toISOString() });
              app.showToast('Modèle mis à jour depuis le fichier importé.', 'success');
            } else {
              const copy = SariUtils.deepClone(tpl); copy.id = `${copy.templateMode === 'html' ? 'html-tpl' : 'doc-tpl'}-${crypto.randomUUID()}`; copy.name = `Copie de ${copy.name}`; copy.referenceCode = ''; copy.versions = []; copy.isDefault = false;
              await sariDB.save('documentTemplates', copy);
              app.showToast('Modèle importé comme nouvelle copie.', 'success');
            }
          } else {
            await sariDB.save('documentTemplates', SariUtils.deepClone(tpl));
            app.showToast('Modèle importé.', 'success');
          }
        }
        this.render();
      } catch (e) {
        app.showToast(`Import impossible : ${e.message}`, 'error');
      }
    };
    input.click();
  },
  getTemplateBlocks(){return this.state.settings?.templateBlocks||[];},
  async editTemplateBlock(id=''){const blocks=this.getTemplateBlocks(),old=blocks.find(b=>b.id===id)||{name:'',position:'header',html:'<div style="display:flex;justify-content:space-between;border-bottom:2px solid #009CC5;padding-bottom:6px"><b>{{company.name}}</b><span>{{document.reference}} • {{document.date}}</span></div>'};const v=await DialogManager.form(id?'Modifier le bloc':'Nouveau bloc réutilisable',[{name:'name',label:'Nom',value:old.name||'',required:true},{name:'position',label:'Position',type:'select',value:old.position||'header',options:[{value:'header',label:'En-tête (haut)'},{value:'footer',label:'Pied de page (bas)'}]},{name:'html',label:'HTML (champs {{...}} autorisés)',type:'textarea',value:old.html||'',required:true}]);if(!v)return;const next=[...blocks.filter(b=>b.id!==(id||''))];if(id)next.push({...old,...v,updatedAt:new Date().toISOString()});else next.push({id:`block-${crypto.randomUUID()}`,name:v.name,position:v.position,html:TemplateEngine.sanitize(v.html),createdAt:new Date().toISOString()});this.state.settings.templateBlocks=next;await sariDB.save('settings',this.state.settings);this.render();},
  async deleteTemplateBlock(id){if(await DialogManager.confirm('Supprimer ce bloc réutilisable ?')){this.state.settings.templateBlocks=(this.getTemplateBlocks()).filter(b=>b.id!==id);await sariDB.save('settings',this.state.settings);this.render();}},
  async restoreTemplateVersion(id){const template=await sariDB.getById('documentTemplates',id),options=(template.versions||[]).map((version,index)=>({value:String(index),label:`${index+1} • ${new Date(version.savedAt).toLocaleString()}`}));if(!options.length)return;const v=await DialogManager.form('Restaurer une version',[{name:'index',label:'Version',type:'select',options}]);if(!v)return;const selected=template.versions[Number(v.index)],current=TemplateDesigner.snapshot(template),restored={...SariUtils.deepClone(selected.data),id:template.id,versions:[...template.versions,current].slice(-10),updatedAt:new Date().toISOString()};await sariDB.save('documentTemplates',restored);app.showToast('Version restaurée.','success');this.render();},

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

export {};
