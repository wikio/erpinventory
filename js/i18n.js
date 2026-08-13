/**
 * SARI Système - Internationalization & Localization Controller (ar / fr / en)
 * Supports RTL / LTR layouts, currency formatting, and dynamic string translation.
 */

class I18nController {
  constructor() {
    this.currentLang = localStorage.getItem('sari_language') || 'fr'; // default French
  }

  async init() {
    try {
      if (typeof window !== 'undefined' && window.sariDB) {
        const settings = await window.sariDB.getById('settings', 'app-settings');
        if (settings && settings.language) {
          this.currentLang = settings.language;
        }
      }
    } catch (err) {
      console.warn('[i18n] Could not load language from settings, using localStorage default:', this.currentLang);
    }
    this.applyLanguage(this.currentLang);
  }

  t(key, fallback = '') {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.fr;
    return dict[key] || TRANSLATIONS.fr[key] || TRANSLATIONS.en[key] || fallback || key;
  }

  async setLanguage(lang) {
    if (!['ar', 'fr', 'en'].includes(lang)) return;
    this.currentLang = lang;
    localStorage.setItem('sari_language', lang);

    try {
      if (typeof window !== 'undefined' && window.sariDB) {
        const settings = await window.sariDB.getById('settings', 'app-settings') || { id: 'app-settings' };
        settings.language = lang;
        await window.sariDB.save('settings', settings);
      }
    } catch (e) {
      console.warn('[i18n] Failed to save language in IndexedDB:', e);
    }

    this.applyLanguage(lang);
    window.dispatchEvent(new CustomEvent('sari-language-changed', { detail: { lang } }));
  }

  applyLanguage(lang) {
    document.documentElement.setAttribute('lang', lang);
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);

    // Update active language toggle buttons in UI if present
    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      const btnLang = btn.getAttribute('data-lang-btn');
      if (btnLang === lang) {
        btn.classList.add('bg-sari-blue', 'text-white', 'font-bold');
        btn.classList.remove('text-slate-600', 'dark:text-slate-300');
      } else {
        btn.classList.remove('bg-sari-blue', 'text-white', 'font-bold');
        btn.classList.add('text-slate-600', 'dark:text-slate-300');
      }
    });

    // Translate keyed and legacy/dynamic UI copy, then keep auditing future nodes.
    this.translateDOM();
    window.UICopy?.init();
    window.UICopy?.apply(document, lang);
  }

  translateDOM(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const translated = this.t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          if (el.getAttribute('placeholder')) {
            el.setAttribute('placeholder', translated);
          }
        } else {
          el.textContent = translated;
        }
      }
    });

    // Translate placeholder attributes
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', this.t(key));
      }
    });

    // Translate title attributes
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', this.t(key));
      }
    });
  }

  formatCurrency(amount, currencyCode = 'DZD') {
    const num = Number(amount) || 0;
    const curr = SARI_CONFIG.CURRENCIES[currencyCode] || SARI_CONFIG.CURRENCIES.DZD;
    
    // Format numbers with space or comma separators
    const formattedNum = new Intl.NumberFormat(
      this.currentLang === 'ar' ? 'ar-DZ' : (this.currentLang === 'fr' ? 'fr-FR' : 'en-US'),
      { minimumFractionDigits: currencyCode === 'DZD' ? 0 : 2, maximumFractionDigits: 2 }
    ).format(num);

    const symbol = currencyCode === 'DZD' ? (this.currentLang === 'ar' ? 'د.ج' : 'DA') : curr.symbol;
    return `${formattedNum} ${symbol}`;
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const locale = this.currentLang === 'ar' ? 'ar-DZ' : (this.currentLang === 'fr' ? 'fr-FR' : 'en-GB');
      return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: '2-digit' }).format(date);
    } catch (e) {
      return dateString;
    }
  }

  getWilayaName(code) {
    const w = SARI_CONFIG.ALGERIAN_WILAYAS.find(x => x.code === code);
    if (!w) return code;
    return w[this.currentLang] || w.fr || code;
  }

  getCategoryName(catId) {
    const managed = window.InventoryModule?.state?.productCategories?.find(x=>x.id===catId);
    if (managed) return managed.name?.[this.currentLang] || managed.name?.fr || catId;
    const c = SARI_CONFIG.PRODUCT_CATEGORIES.find(x => x.id === catId);
    if (!c) return catId;
    return c[this.currentLang] || c.fr || catId;
  }

  getUnitName(unitId) {
    const u = SARI_CONFIG.UNITS.find(x => x.id === unitId);
    if (!u) return unitId;
    return u[this.currentLang] || u.fr || unitId;
  }

  getRoleName(roleId) {
    const r = SARI_CONFIG.USER_ROLES[roleId];
    if (!r) return roleId;
    return r[this.currentLang] || r.fr || roleId;
  }
}

const i18n = new I18nController();
if (typeof window !== 'undefined') {
  window.i18n = i18n;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { I18nController, i18n };
}
