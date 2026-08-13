/**
 * SARI Système - Translation Management Module
 * Manage bilingual/trilingual dictionary strings (French LTR, Arabic RTL, English LTR),
 * edit translations in real time, add custom translation keys, and export/import language packs.
 */

const TranslationsModule = {
  state: {
    searchQuery: '',
    editingKey: null,
    customTranslations: {},
    filterLang: 'all'
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Load custom overrides from IndexedDB settings if any
    try {
      const s = await window.sariDB.getById('settings', 'app-settings');
      if (s && s.customTranslations) {
        this.state.customTranslations = s.customTranslations;
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
    const allKeys = Object.keys(TRANSLATIONS.fr);

    // Filter keys by search query
    const filteredKeys = allKeys.filter(k => {
      if (!this.state.searchQuery) return true;
      const q = this.state.searchQuery.toLowerCase();
      const matchKey = k.toLowerCase().includes(q);
      const matchFr = (TRANSLATIONS.fr[k] || '').toLowerCase().includes(q);
      const matchAr = (TRANSLATIONS.ar[k] || '').toLowerCase().includes(q);
      const matchEn = (TRANSLATIONS.en[k] || '').toLowerCase().includes(q);
      return matchKey || matchFr || matchAr || matchEn;
    });

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="sari-tile p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="sari-badge bg-sari-blue/10 text-sari-blue border-sari-blue">i18n & Localisation</span>
              <span class="text-xs text-slate-500 font-mono-tech">FR • AR • EN</span>
            </div>
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="languages" class="w-6 h-6 text-sari-blue"></i>
              Gestionnaire des Traductions & Langues
            </h2>
            <p class="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Édition en temps réel du dictionnaire trilingue, ajout de clés personnalisées et export des packs de langues.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="TranslationsModule.openAudit()" class="sari-btn px-4 py-2 bg-slate-800 text-white text-sm"><i data-lucide="scan-search" class="w-4 h-4"></i> Audit couverture</button>
            <button onclick="ReferenceTranslations.open()" class="sari-btn px-4 py-2 bg-sari-lime text-slate-900 text-sm"><i data-lucide="list-tree" class="w-4 h-4"></i> Listes configurables</button>
            ${canWrite ? `
              <button onclick="TranslationsModule.openAddKeyModal()" class="sari-btn px-4 py-2 bg-sari-blue hover:bg-sari-blue/90 text-white shadow-sm text-sm">
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span>+ Nouvelle Clé de Traduction</span>
              </button>
            ` : ''}
            <button onclick="TranslationsModule.exportJSON()" class="sari-btn px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
              <i data-lucide="download" class="w-4 h-4"></i>
              <span>Exporter JSON</span>
            </button>
            <button onclick="TranslationsModule.importJSON()" class="sari-btn px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
              <i data-lucide="upload" class="w-4 h-4"></i>
              <span>Importer JSON</span>
            </button>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="sari-tile p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2">
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Rechercher une clé ou un texte traduit</label>
            <div class="relative">
              <input 
                type="text" 
                value="${this.state.searchQuery}"
                oninput="TranslationsModule.state.searchQuery=this.value" onkeydown="SariUtils.searchKeyHandler(event,()=>TranslationsModule.render())"
                placeholder="Ex: appName, stock, Facture, الجزائر, Tender..."
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
              />
              <i data-lucide="search" class="w-4 h-4 absolute right-3 top-2.5 text-slate-400"></i>
            </div>
          </div>
          <div class="flex items-end">
            <div class="w-full text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border flex justify-between items-center">
              <span><strong>Clés actives :</strong> <span class="font-mono-tech font-bold text-sari-blue">${allKeys.length}</span></span>
              <span><strong>Surcharge custom :</strong> <span class="font-mono-tech font-bold text-sari-lime-dark">${Object.keys(this.state.customTranslations).length}</span></span>
            </div>
          </div>
        </div>

        <!-- Translations Table -->
        <div class="sari-tile overflow-x-auto">
          <table class="w-full text-left border-collapse sari-table text-sm">
            <thead>
              <tr class="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                <th class="p-3 w-48">Clé Identifiant (Key)</th>
                <th class="p-3">Français (FR - LTR)</th>
                <th class="p-3">العربية (AR - RTL)</th>
                <th class="p-3">English (EN - LTR)</th>
                <th class="p-3 text-right w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              ${filteredKeys.length === 0 ? `
                <tr>
                  <td colspan="5" class="p-8 text-center text-slate-500">
                    Aucune clé de traduction ne correspond à "${this.state.searchQuery}".
                  </td>
                </tr>
              ` : filteredKeys.map(k => {
                const frVal = this.getVal('fr', k);
                const arVal = this.getVal('ar', k);
                const enVal = this.getVal('en', k);
                const isCustom = !!this.state.customTranslations[k];

                return `
                  <tr class="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td class="p-3 font-mono-tech text-xs font-bold text-sari-blue">
                      ${k}
                      ${isCustom ? `<span class="block text-[10px] text-sari-lime-dark font-normal">* Modifié</span>` : ''}
                    </td>
                    <td class="p-3 text-xs text-slate-800 dark:text-slate-200">
                      <div class="line-clamp-2">${SariUtils.escapeHtml(frVal)}</div>
                    </td>
                    <td class="p-3 text-xs text-slate-800 dark:text-slate-200" dir="rtl">
                      <div class="line-clamp-2">${SariUtils.escapeHtml(arVal)}</div>
                    </td>
                    <td class="p-3 text-xs text-slate-800 dark:text-slate-200">
                      <div class="line-clamp-2">${SariUtils.escapeHtml(enVal)}</div>
                    </td>
                    <td class="p-3 text-right">
                      <button 
                        onclick="TranslationsModule.openEditModal('${k}')" 
                        title="Modifier les traductions"
                        class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sari-blue"
                      >
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Container -->
      <div id="trans-modal-container"></div>
    `;
  },

  getVal(lang, key) {
    if (this.state.customTranslations[key] && this.state.customTranslations[key][lang] !== undefined) {
      return this.state.customTranslations[key][lang];
    }
    return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || '';
  },

  handleSearch(val) {
    this.state.searchQuery = val;
    this.render();
  },

  /**
   * Edit Modal for an existing or custom key
   */
  openEditModal(key) {
    const frVal = this.getVal('fr', key);
    const arVal = this.getVal('ar', key);
    const enVal = this.getVal('en', key);

    const modalEl = document.getElementById('trans-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl relative">
          <div class="flex justify-between items-center border-b pb-3 mb-4">
            <div>
              <span class="text-xs font-bold text-sari-blue uppercase font-mono-tech">Clé : ${key}</span>
              <h3 class="font-bold text-lg text-slate-900 dark:text-white">
                Modifier la Traduction Trilingue
              </h3>
            </div>
            <button onclick="TranslationsModule.closeModal()" class="text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form onsubmit="TranslationsModule.saveTranslation(event, '${key}')" class="space-y-4 text-sm">
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Français (FR - LTR) *</label>
              <textarea id="trans-edit-fr" required rows="2" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 text-sm font-medium">${SariUtils.escapeHtml(frVal)}</textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">العربية (AR - RTL - Script Arabe) *</label>
              <textarea id="trans-edit-ar" required rows="2" dir="rtl" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 text-sm font-medium">${SariUtils.escapeHtml(arVal)}</textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">English (EN - LTR) *</label>
              <textarea id="trans-edit-en" required rows="2" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 text-sm font-medium">${SariUtils.escapeHtml(enVal)}</textarea>
            </div>

            <div class="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
              <button 
                type="button" 
                onclick="TranslationsModule.resetKey('${key}')"
                class="text-xs font-bold text-red-500 hover:underline"
              >
                Réinitialiser à l'origine
              </button>
              <div class="flex gap-2">
                <button type="button" onclick="TranslationsModule.closeModal()" class="sari-btn px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-xs">
                  Annuler
                </button>
                <button type="submit" class="sari-btn px-5 py-2 bg-sari-blue text-white font-bold text-xs">
                  Enregistrer les traductions
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  closeModal() {
    const modalEl = document.getElementById('trans-modal-container');
    if (modalEl) modalEl.innerHTML = '';
  },

  async saveTranslation(e, key) {
    e.preventDefault();
    const frVal = document.getElementById('trans-edit-fr').value.trim();
    const arVal = document.getElementById('trans-edit-ar').value.trim();
    const enVal = document.getElementById('trans-edit-en').value.trim();

    // Update in-memory TRANSLATIONS dictionary
    TRANSLATIONS.fr[key] = frVal;
    TRANSLATIONS.ar[key] = arVal;
    TRANSLATIONS.en[key] = enVal;

    // Save override to customTranslations in IndexedDB
    this.state.customTranslations[key] = { fr: frVal, ar: arVal, en: enVal };

    try {
      const s = await window.sariDB.getById('settings', 'app-settings') || { id: 'app-settings' };
      s.customTranslations = this.state.customTranslations;
      await window.sariDB.save('settings', s);
    } catch (err) {
      console.warn('[Translations] Error saving custom translations to DB:', err);
    }

    this.closeModal();
    window.app.showToast(`Traduction de la clé [${key}] mise à jour !`, 'success');

    // Update DOM instantly
    if (window.i18n) {
      window.i18n.translateDOM();
    }
    await this.render();
  },

  async resetKey(key) {
    if (!await DialogManager.confirm(`Réinitialiser la clé [${key}] aux valeurs officielles par défaut ?`)) return;

    delete this.state.customTranslations[key];
    try {
      const s = await window.sariDB.getById('settings', 'app-settings');
      if (s) {
        s.customTranslations = this.state.customTranslations;
        await window.sariDB.save('settings', s);
      }
    } catch (e) {
      // ignore
    }

    this.closeModal();
    window.app.showToast(`Clé [${key}] réinitialisée`, 'info');
    if (window.i18n) window.i18n.translateDOM();
    await this.render();
  },

  /**
   * Add Custom Translation Key Modal
   */
  openAddKeyModal() {
    const modalEl = document.getElementById('trans-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sari-modal-backdrop">
        <div class="sari-tile w-full max-w-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl relative">
          <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-lg text-slate-900 dark:text-white">
              Ajouter une Nouvelle Clé de Traduction
            </h3>
            <button onclick="TranslationsModule.closeModal()" class="text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form onsubmit="TranslationsModule.addCustomKey(event)" class="space-y-4 text-sm">
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Clé Identifiant (alphanumérique camelCase sans espaces) *</label>
              <input 
                type="text" 
                id="trans-new-key" 
                required 
                placeholder="Ex: customModuleTitle, newHospitalField" 
                class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 font-mono-tech font-bold" 
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Français (FR - LTR) *</label>
              <input type="text" id="trans-new-fr" required placeholder="Ex: Titre du Module Personnalisé" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">العربية (AR - RTL) *</label>
              <input type="text" id="trans-new-ar" required dir="rtl" placeholder="Ex: عنوان الوحدة المخصصة" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">English (EN - LTR) *</label>
              <input type="text" id="trans-new-en" required placeholder="Ex: Custom Module Title" class="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800" />
            </div>

            <div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onclick="TranslationsModule.closeModal()" class="sari-btn px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-xs">
                Annuler
              </button>
              <button type="submit" class="sari-btn px-5 py-2 bg-sari-blue text-white font-bold text-xs">
                Ajouter au dictionnaire
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  async addCustomKey(e) {
    e.preventDefault();
    const key = document.getElementById('trans-new-key').value.trim();
    if (!key) return;

    if (TRANSLATIONS.fr[key]) {
      window.app.showToast(`La clé [${key}] existe déjà dans le dictionnaire.`, 'warning');
      return;
    }

    const frVal = document.getElementById('trans-new-fr').value.trim();
    const arVal = document.getElementById('trans-new-ar').value.trim();
    const enVal = document.getElementById('trans-new-en').value.trim();

    TRANSLATIONS.fr[key] = frVal;
    TRANSLATIONS.ar[key] = arVal;
    TRANSLATIONS.en[key] = enVal;

    this.state.customTranslations[key] = { fr: frVal, ar: arVal, en: enVal };

    try {
      const s = await window.sariDB.getById('settings', 'app-settings') || { id: 'app-settings' };
      s.customTranslations = this.state.customTranslations;
      await window.sariDB.save('settings', s);
    } catch (err) {
      console.warn('[Translations] Error saving new key to DB:', err);
    }

    this.closeModal();
    window.app.showToast(`Clé personnalisée [${key}] ajoutée avec succès !`, 'success');
    await this.render();
  },

  openAudit(){const staticMissing={fr:[],ar:[],en:[]};const keys=new Set(Object.keys(TRANSLATIONS.fr));for(const lang of ['fr','ar','en'])for(const key of keys)if(!TRANSLATIONS[lang]?.[key])staticMissing[lang].push(key);const runtime=window.UICopy?.audit(document.getElementById('sari-main-view'))||[],root=document.getElementById('sari-modal-root');root.innerHTML=`<div class="fixed inset-0 z-50 sari-modal-backdrop flex items-center justify-center p-3"><div class="sari-tile w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6"><header class="flex justify-between border-b pb-3"><div><span class="sari-badge">i18n QA</span><h3 class="text-xl font-extrabold mt-2">Rapport de couverture des traductions</h3></div><button onclick="app.closeModalRoot()">×</button></header><div class="grid md:grid-cols-3 gap-3 my-4">${['fr','ar','en'].map(lang=>`<div class="p-4 border rounded-xl"><b>${lang.toUpperCase()}</b><p class="text-2xl font-black ${staticMissing[lang].length?'text-red-600':'text-green-600'}">${staticMissing[lang].length}</p><small>clés statiques manquantes</small></div>`).join('')}</div><h4 class="font-extrabold">Textes dynamiques/non marqués détectés (${runtime.length})</h4><p class="text-xs text-slate-500">Cette liste prévient les régressions : ajoutez les expressions légitimes au dictionnaire ou à UICopy.</p><table class="w-full text-xs mt-3"><thead><tr><th class="text-left">Texte source</th><th>Occurrences</th><th>Couverture auto</th></tr></thead><tbody>${runtime.slice(0,300).map(row=>`<tr class="border-t"><td class="p-2">${SariUtils.escapeHtml(row.text)}</td><td>${row.count}</td><td>${UICopy.phrases[row.text]?'Oui':'À traduire'}</td></tr>`).join('')}</tbody></table></div></div>`;},

  exportJSON() {
    const pack = {
      exportedAt: new Date().toISOString(),
      appName: 'SARI Système - Trilingual Language Pack',
      defaultTranslations: TRANSLATIONS,
      customOverrides: this.state.customTranslations
    };
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sari-systeme-i18n-pack-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.app.showToast('Pack de langue trilingue exporté', 'success');
  },

  importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const pack = JSON.parse(evt.target.result);
          if (pack.customOverrides) {
            this.state.customTranslations = { ...this.state.customTranslations, ...pack.customOverrides };
            Object.keys(pack.customOverrides).forEach(k => {
              TRANSLATIONS.fr[k] = pack.customOverrides[k].fr;
              TRANSLATIONS.ar[k] = pack.customOverrides[k].ar;
              TRANSLATIONS.en[k] = pack.customOverrides[k].en;
            });
            const s = await window.sariDB.getById('settings', 'app-settings') || { id: 'app-settings' };
            s.customTranslations = this.state.customTranslations;
            await window.sariDB.save('settings', s);
          }
          window.app.showToast('Traductions importées et appliquées !', 'success');
          if (window.i18n) window.i18n.translateDOM();
          await this.render();
        } catch (err) {
          window.app.showToast('Fichier de traduction JSON invalide', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
};

if (typeof window !== 'undefined') {
  window.TranslationsModule = TranslationsModule;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranslationsModule;
}
