/**
 * SARI Système - Audit Logs & Activity Tracker Module
 * Comprehensive audit trail of system changes, user actions,
 * tender submissions, and inventory modifications.
 */

const AuditModule = {
  state: {
    logs: [],
    documents: [],
    filterModule: 'all',
    searchQuery: ''
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    [this.state.logs,this.state.documents] = await Promise.all([window.sariDB.getAll('auditLogs'),window.sariDB.getAll('documents')]);
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
              <i data-lucide="file-up"></i> Exporter CSV
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
              oninput="AuditModule.state.searchQuery=this.value" onkeydown="SariUtils.searchKeyHandler(event,()=>AuditModule.render())"
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
                      <i data-lucide="shield"></i>
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
                  <div class="text-right"><div class="text-xs font-mono-tech text-slate-400 whitespace-nowrap">${new Date(log.timestamp).toLocaleString(i18n.currentLang === 'ar' ? 'ar-DZ' : 'fr-FR')}</div><button onclick="AuditModule.viewLog('${log.id}')" class="doc-action">Consulter</button><button onclick="DocumentManager.open('auditLog','${log.id}','${SariUtils.escapeHtml(log.action||log.id)}')" class="doc-action"><i data-lucide="paperclip"></i>GED (${this.gedCount(log.id)})</button>${auth.currentRole==='admin'?`<button onclick="AuditModule.editLog('${log.id}')" class="doc-action">Modifier</button><button onclick="AuditModule.deleteLog('${log.id}')" class="doc-action text-red-600">Supprimer</button>`:''}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  },

  gedCount(id){return this.state.documents.filter(document=>(document.links||[]).some(link=>link.recordType==='auditLog'&&link.recordId===id)).length;},

  getFilteredLogs() {
    return this.state.logs.filter(l => {
      if (this.state.filterModule !== 'all' && l.module !== this.state.filterModule) {
        return false;
      }
      if (!SariUtils.matchesAdvancedSearch(l,this.state.searchQuery,['user','description','action','module'])) return false;
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

  async viewLog(id){const l=await sariDB.getById('auditLogs',id),root=document.getElementById('sari-modal-root');root.innerHTML=`<div class="fixed inset-0 z-50 sari-modal-backdrop flex items-center justify-center p-3"><div class="sari-tile w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6"><header class="flex justify-between border-b pb-3"><div><span class="sari-badge">${l.action}</span><h3 class="text-xl font-extrabold mt-2">${l.module} • ${l.affectedRecordId||'Système'}</h3></div><div class="flex gap-2"><button onclick="DocumentManager.open('auditLog','${l.id}','${SariUtils.escapeHtml(l.action||l.id)}')" class="sari-btn px-4 bg-sari-blue text-white"><i data-lucide="paperclip"></i>Pièces GED (${this.gedCount(l.id)})</button><button onclick="app.closeModalRoot()">×</button></div></header><div class="grid md:grid-cols-4 gap-3 my-4 text-xs"><div><span class="text-slate-400">Utilisateur</span><b class="block">${l.user} (${l.role})</b></div><div><span class="text-slate-400">ID utilisateur</span><b class="block">${l.actingUserId||'—'}</b></div><div><span class="text-slate-400">Horodatage</span><b class="block">${new Date(l.timestamp).toLocaleString()}</b></div><div><span class="text-slate-400">Type / ID</span><b class="block">${l.recordType||l.module} / ${l.affectedRecordId||'—'}</b></div></div><p class="p-3 bg-slate-50 dark:bg-slate-800 rounded">${SariUtils.escapeHtml(l.description||'')}</p><h4 class="font-extrabold mt-5">Champs modifiés (${l.changes?.length||0})</h4><div class="overflow-x-auto"><table class="w-full text-xs mt-2"><thead><tr><th class="text-left p-2">Champ</th><th>Avant</th><th>Après</th></tr></thead><tbody>${(l.changes||[]).map(x=>`<tr class="border-t"><td class="p-2 font-mono-tech text-sari-blue">${x.field}</td><td><pre class="whitespace-pre-wrap max-w-sm">${SariUtils.escapeHtml(JSON.stringify(x.before,null,2))}</pre></td><td><pre class="whitespace-pre-wrap max-w-sm">${SariUtils.escapeHtml(JSON.stringify(x.after,null,2))}</pre></td></tr>`).join('')||'<tr><td colspan="3" class="p-4 text-slate-400">Ancienne entrée sans diff structuré.</td></tr>'}</tbody></table></div></div></div>`;},
  async editLog(id){if(auth.currentRole!=='admin')return;const l=await sariDB.getById('auditLogs',id),v=await DialogManager.form('Modifier une entrée d’audit',[{name:'action',label:'Action',value:l.action},{name:'module',label:'Module',value:l.module},{name:'description',label:'Description',type:'textarea',value:l.description}]);if(!v)return;const before=JSON.stringify(l);Object.assign(l,v,{editedAt:new Date().toISOString(),editedBy:auth.currentUser.name});await sariDB.save('auditLogs',l);await sariDB.save('auditLogs',{id:`audit-${crypto.randomUUID()}`,user:auth.currentUser.name,role:auth.currentRole,action:'EDIT_AUDIT_LOG',module:'Audit',description:`Modification de ${id}. Empreinte précédente: ${before.slice(0,180)}`,timestamp:new Date().toISOString()});this.render();},
  async deleteLog(id){if(auth.currentRole!=='admin'||!await DialogManager.confirm('Supprimer cette entrée ? Une trace de cette suppression sera conservée.'))return;const l=await sariDB.getById('auditLogs',id);await sariDB.delete('auditLogs',id);await sariDB.save('auditLogs',{id:`audit-${crypto.randomUUID()}`,user:auth.currentUser.name,role:auth.currentRole,action:'DELETE_AUDIT_LOG',module:'Audit',description:`Suppression de ${id} [${l?.action}]`,timestamp:new Date().toISOString()});this.render();},

  exportCSV() {
    SariUtils.exportToCSV(this.state.logs, 'sari-systeme-audit-logs.csv');
  }
};

if (typeof window !== 'undefined') {
  window.AuditModule = AuditModule;
}

export {};
