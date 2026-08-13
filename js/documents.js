/** Centralized offline-first document management (GED). */
const DocumentManager = {
  context: null,
  documents: [],

  async getFor(recordType, recordId) {
    const all = await window.sariDB.getAll('documents');
    return all.filter(doc => (doc.links || []).some(link => link.recordType === recordType && link.recordId === recordId));
  },

  async count(recordType, recordId) {
    return (await this.getFor(recordType, recordId)).length;
  },

  async open(recordType, recordId, recordLabel = '') {
    this.context = { recordType, recordId, recordLabel };
    this.documents = await this.getFor(recordType, recordId);
    this.render();
  },

  render() {
    let root = document.getElementById('document-manager-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'document-manager-root';
      document.body.appendChild(root);
    }
    const canWrite = window.auth?.can('documents', 'edit') ?? window.auth?.canWrite(this.context.recordType);
    root.innerHTML = `
      <div class="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 sari-modal-backdrop" role="dialog" aria-modal="true">
        <div class="sari-tile w-full max-w-4xl bg-white dark:bg-slate-900 shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">
          <header class="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start gap-3 sari-grid-pattern">
            <div><div class="text-[10px] font-black uppercase tracking-widest text-sari-blue">GED • Gestion électronique des documents</div><h3 class="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><i data-lucide="folder-kanban" class="w-5 h-5 text-sari-blue"></i>${SariUtils.escapeHtml(this.context.recordLabel || this.context.recordId)}</h3><p class="text-xs text-slate-500">${this.documents.length} document(s) lié(s) • ${SariUtils.escapeHtml(this.context.recordType)}</p></div>
            <button onclick="DocumentManager.close()" class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Fermer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </header>
          <div class="p-5 overflow-y-auto space-y-5">
            ${canWrite ? `
            <form onsubmit="DocumentManager.upload(event)" class="p-4 rounded-xl border-2 border-dashed border-sari-blue/40 bg-sari-blue/5 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div class="md:col-span-2"><label class="doc-label">Fichier *</label><input id="ged-file" type="file" required class="doc-input text-xs" /></div>
              <div><label class="doc-label">Type</label><select id="ged-type" class="doc-input"><option>Autre</option><option>Contrat</option><option>Certification</option><option>Facture</option><option>Identité</option><option>Diplôme</option><option>Cahier des charges</option></select></div>
              <div><label class="doc-label">Expiration</label><input id="ged-expiry" type="date" class="doc-input" /></div>
              <div><label class="doc-label">Description</label><input id="ged-notes" class="doc-input" placeholder="Notes…" /></div>
              <button class="sari-btn py-2 bg-sari-blue text-white text-xs"><i data-lucide="upload" class="w-4 h-4"></i>Ajouter</button>
            </form>` : ''}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${this.documents.length ? this.documents.map(doc => this.card(doc, canWrite)).join('') : `<div class="sm:col-span-2 p-10 text-center border-2 border-dashed rounded-xl text-slate-400"><i data-lucide="file-x-2" class="w-8 h-8 mx-auto mb-2"></i><p class="text-sm font-bold">Aucun document attaché</p></div>`}
            </div>
            ${canWrite ? `<div class="border-t pt-4"><label class="doc-label">Lier un document existant sans le dupliquer</label><div class="flex gap-2"><select id="ged-existing" class="doc-input flex-1"><option value="">Sélectionner dans la GED…</option></select><button onclick="DocumentManager.linkExisting()" class="sari-btn px-4 bg-slate-800 text-white text-xs">Créer le lien</button></div></div>` : ''}
          </div>
        </div>
      </div>`;
    this.loadExistingOptions();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  card(doc, canWrite) {
    const escapedName = SariUtils.escapeHtml(doc.name);
    return `<article class="p-4 border rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:border-sari-blue transition">
      <div class="flex gap-3"><div class="w-10 h-10 rounded-lg bg-sari-blue/10 text-sari-blue grid place-items-center shrink-0"><i data-lucide="file-text" class="w-5 h-5"></i></div><div class="min-w-0 flex-1"><h4 class="font-bold text-sm truncate text-slate-900 dark:text-white" title="${escapedName}">${escapedName}</h4><p class="text-[10px] text-slate-500">${SariUtils.escapeHtml(doc.documentType || 'Autre')} • ${this.formatBytes(doc.size)}${doc.expirationDate ? ` • Exp. ${i18n.formatDate(doc.expirationDate)}` : ''}</p><p class="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">${SariUtils.escapeHtml(doc.notes || 'Sans description')}</p></div></div>
      <div class="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
        <button onclick="DocumentManager.preview('${doc.id}')" class="doc-action"><i data-lucide="eye" class="w-3.5 h-3.5"></i>Voir</button>
        ${canWrite ? `<button onclick="DocumentManager.editMetadata('${doc.id}')" class="doc-action"><i data-lucide="pencil" class="w-3.5 h-3.5"></i>Métadonnées</button><button onclick="DocumentManager.replace('${doc.id}')" class="doc-action"><i data-lucide="replace" class="w-3.5 h-3.5"></i>Remplacer</button><button onclick="DocumentManager.unlink('${doc.id}')" class="doc-action text-red-600"><i data-lucide="unlink" class="w-3.5 h-3.5"></i>Délier</button>` : ''}
      </div></article>`;
  },

  async loadExistingOptions() {
    const select = document.getElementById('ged-existing');
    if (!select) return;
    const all = await window.sariDB.getAll('documents');
    const linkedIds = new Set(this.documents.map(d => d.id));
    select.innerHTML += all.filter(d => !linkedIds.has(d.id)).map(d => `<option value="${d.id}">${SariUtils.escapeHtml(d.name)} (${d.documentType || 'Autre'})</option>`).join('');
  },

  readFile(file) {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  },

  async upload(event) {
    event.preventDefault();
    const file = document.getElementById('ged-file').files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return window.app.showToast('La taille maximale hors-ligne est 10 Mo.', 'error');
    const doc = { id: `doc-${crypto.randomUUID()}`, name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, data: await this.readFile(file), documentType: document.getElementById('ged-type').value, expirationDate: document.getElementById('ged-expiry').value, notes: document.getElementById('ged-notes').value.trim(), tags: [], uploaderId: auth.currentUser?.id, uploaderName: auth.currentUser?.name, links: [{ recordType: this.context.recordType, recordId: this.context.recordId }], version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await window.sariDB.save('documents', doc);
    window.app.showToast('Document enregistré hors-ligne.', 'success');
    await this.open(this.context.recordType, this.context.recordId, this.context.recordLabel);
  },

  async preview(id) {
    const doc = await window.sariDB.getById('documents', id);
    if (!doc?.data) return window.app.showToast('Aucun contenu disponible.', 'warning');
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (win) { win.document.write(`<title>${SariUtils.escapeHtml(doc.name)}</title><iframe src="${doc.data}" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>`); win.document.close(); }
  },

  async editMetadata(id) {
    const doc = await window.sariDB.getById('documents', id); if (!doc) return;
    const values = await DialogManager.form('Métadonnées du document',[{name:'documentType',label:'Type',value:doc.documentType||'Autre'},{name:'expirationDate',label:'Expiration',type:'date',value:doc.expirationDate||''},{name:'tags',label:'Tags (séparés par virgules)',value:(doc.tags||[]).join(', ')},{name:'notes',label:'Description / notes',type:'textarea',value:doc.notes||''}]); if (!values) return;
    Object.assign(doc, { documentType: values.documentType.trim(), expirationDate: values.expirationDate, tags:values.tags.split(',').map(x=>x.trim()).filter(Boolean), notes: values.notes.trim(), updatedAt: new Date().toISOString() });
    await window.sariDB.save('documents', doc); await this.open(this.context.recordType, this.context.recordId, this.context.recordLabel);
  },

  replace(id) {
    const input = document.createElement('input'); input.type = 'file';
    input.onchange = async () => { const file = input.files[0]; if (!file) return; const doc = await window.sariDB.getById('documents', id); Object.assign(doc, { name: file.name, mimeType: file.type, size: file.size, data: await this.readFile(file), version: (doc.version || 1) + 1, updatedAt: new Date().toISOString() }); await window.sariDB.save('documents', doc); window.app.showToast(`Document remplacé • version ${doc.version}`, 'success'); await this.open(this.context.recordType, this.context.recordId, this.context.recordLabel); }; input.click();
  },

  async unlink(id) {
    if (!await DialogManager.confirm('Délier ce document de cet enregistrement ?')) return;
    const doc = await window.sariDB.getById('documents', id); if (!doc) return;
    doc.links = (doc.links || []).filter(link => !(link.recordType === this.context.recordType && link.recordId === this.context.recordId));
    if (doc.links.length) await window.sariDB.save('documents', doc); else if (await DialogManager.confirm('Ce document ne sera plus lié. Le supprimer définitivement de la GED ?')) await window.sariDB.delete('documents', id); else await window.sariDB.save('documents', doc);
    await this.open(this.context.recordType, this.context.recordId, this.context.recordLabel);
  },

  async linkExisting() {
    const id = document.getElementById('ged-existing')?.value; if (!id) return;
    const doc = await window.sariDB.getById('documents', id); if (!doc) return;
    doc.links = [...(doc.links || []), { recordType: this.context.recordType, recordId: this.context.recordId }]; doc.updatedAt = new Date().toISOString(); await window.sariDB.save('documents', doc); await this.open(this.context.recordType, this.context.recordId, this.context.recordLabel);
  },

  formatBytes(bytes = 0) { if (!bytes) return '0 o'; const units = ['o','Ko','Mo','Go']; const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3); return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`; },
  close() { document.getElementById('document-manager-root')?.remove(); }
};
window.DocumentManager = DocumentManager;
