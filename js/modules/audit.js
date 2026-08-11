/**
 * SARI Système - Audit Logs & Activity Tracker Module
 * Comprehensive audit trail of system changes, user actions,
 * tender submissions, and inventory modifications.
 */

const AuditModule = {
  state: {
    logs: [],
    filterModule: 'all',
    searchQuery: ''
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.state.logs = await window.sariDB.getAll('auditLogs');
    // Sort descending by timestamp
    this.state.logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    this.renderView(container);
  },

  renderView(container) {
    const filtered = this.getFilteredLogs();

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="sari-tile p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white" data-i18n="auditLogs">
              ${i18n.t('auditLogs')}
            </h2>
            <p class="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Journalisation inviolable des opérations utilisateurs, soumissions d'offres et mouvements de stock.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="AuditModule.exportCSV()" class="sari-btn px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
              <i class="fas fa-file-export"></i> Exporter CSV
            </button>
          </div>
        </div>

        <!-- Filters -->
        <div class="sari-tile p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Rechercher une action</label>
            <input 
              type="text" 
              value="${this.state.searchQuery}" 
              oninput="AuditModule.handleSearch(this.value)"
              placeholder="Ex: SUBMIT_TENDER, Administrator, CHU Mustapha..."
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Filtrer par Module ERP</label>
            <select 
              onchange="AuditModule.handleModuleFilter(this.value)"
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-sari-blue"
            >
              <option value="all">Tous les Modules</option>
              <option value="System" ${this.state.filterModule === 'System' ? 'selected' : ''}>Système</option>
              <option value="Inventory" ${this.state.filterModule === 'Inventory' ? 'selected' : ''}>Stock & Produits</option>
              <option value="ImportExport" ${this.state.filterModule === 'ImportExport' ? 'selected' : ''}>Import / Export</option>
              <option value="Tenders" ${this.state.filterModule === 'Tenders' ? 'selected' : ''}>Appels d'Offres</option>
              <option value="Sales" ${this.state.filterModule === 'Sales' ? 'selected' : ''}>Ventes & POS</option>
            </select>
          </div>
        </div>

        <!-- Timeline List -->
        <div class="sari-tile p-5">
          <div class="space-y-4">
            ${filtered.length === 0 ? `
              <div class="p-8 text-center text-slate-500">
                Aucune entrée de journal d'audit trouvée.
              </div>
            ` : filtered.map(log => {
              let badgeColor = 'bg-sari-blue/10 text-sari-blue border-sari-blue';
              if (log.role === 'admin') badgeColor = 'bg-sari-blue/10 text-sari-blue font-bold';
              if (log.role === 'inventory') badgeColor = 'bg-sari-lime/20 text-sari-lime-dark';
              if (log.role === 'import_export') badgeColor = 'bg-sari-amber/10 text-sari-amber';
              if (log.role === 'tenders') badgeColor = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';

              return `
                <div class="p-4 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded bg-sari-blue/10 text-sari-blue flex items-center justify-center text-base flex-shrink-0">
                      <i class="fas fa-shield-alt"></i>
                    </div>
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="sari-badge ${badgeColor}">${log.user} (${log.role})</span>
                        <span class="text-xs font-bold text-slate-500 uppercase">${log.module}</span>
                        <span class="text-xs font-mono-tech font-extrabold text-sari-blue">[${log.action}]</span>
                      </div>
                      <p class="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">${log.description}</p>
                    </div>
                  </div>
                  <div class="text-xs font-mono-tech text-slate-400 whitespace-nowrap">
                    ${new Date(log.timestamp).toLocaleString(i18n.currentLang === 'ar' ? 'ar-DZ' : 'fr-FR')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  },

  getFilteredLogs() {
    return this.state.logs.filter(l => {
      if (this.state.filterModule !== 'all' && l.module !== this.state.filterModule) {
        return false;
      }
      if (this.state.searchQuery) {
        const q = this.state.searchQuery.toLowerCase();
        const matchUser = l.user && l.user.toLowerCase().includes(q);
        const matchDesc = l.description && l.description.toLowerCase().includes(q);
        const matchAction = l.action && l.action.toLowerCase().includes(q);
        if (!matchUser && !matchDesc && !matchAction) return false;
      }
      return true;
    });
  },

  handleSearch(val) {
    this.state.searchQuery = val;
    this.render();
  },

  handleModuleFilter(val) {
    this.state.filterModule = val;
    this.render();
  },

  exportCSV() {
    SariUtils.exportToCSV(this.state.logs, 'sari-systeme-audit-logs.csv');
  }
};

if (typeof window !== 'undefined') {
  window.AuditModule = AuditModule;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuditModule;
}
