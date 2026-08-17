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
    [this.documents,this.gedTypes,this.gedTags] = await Promise.all([this.getFor(recordType, recordId),sariDB.getAll('gedTypes'),sariDB.getAll('gedTags')]);
    this.render();
  },

  render() {
    let root = document.getElementById('document-manager-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'document-manager-root';
      document.body.appendChild(root);
    }
    const canWrite = Boolean(window.auth?.can('ged','edit') || window.auth?.can('documents','edit'));
    // Section 311 — stacking fix: when the GED manager opens from an existing
    // overlay (e.g. the payslip consultation), it must render ABOVE it, with a
    // dedicated "Back" action returning to the parent view.
    const overlays=[...document.querySelectorAll('.sari-modal-backdrop,.sari-dialog-backdrop')].filter(node=>!node.closest('#document-manager-root')).map(node=>Number.parseInt(getComputedStyle(node).zIndex,10)||0);
    const gedZ=Math.max(200,...overlays.map(value=>value+10));
    const parentOpen=Boolean(document.querySelector('#sari-modal-root .sari-modal-backdrop'));
    root.innerHTML = `
      <div class="fixed inset-0 z-[${gedZ}] flex items-center justify-center p-3 sm:p-6 sari-modal-backdrop" role="dialog" aria-modal="true" style="z-index:${gedZ}">
        <div class="sari-tile w-full max-w-4xl bg-white dark:bg-slate-900 shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">
          <header class="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start gap-3 sari-grid-pattern">
            <div><div class="text-[10px] font-black uppercase tracking-widest text-sari-blue">GED • Gestion électronique des documents</div><h3 class="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><i data-lucide="folder-kanban" class="w-5 h-5 text-sari-blue"></i>${SariUtils.escapeHtml(this.context.recordLabel || this.context.recordId)}</h3><p class="text-xs text-slate-500">${this.documents.length} document(s) lié(s) • ${SariUtils.escapeHtml(this.context.recordType)}</p></div>
            <div class="flex gap-2">${parentOpen?`<button onclick="DocumentManager.close()" class="sari-btn px-3 py-1.5 bg-slate-800 text-white text-xs"><i data-lucide="arrow-left" class="w-3 h-3"></i>${i18n.t('backToConsultation','Retour à la consultation')}</button>`:''}<button onclick="DocumentManager.close()" class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Fermer"><i data-lucide="x" class="w-5 h-5"></i></button></div>
          </header>
          <div class="p-5 overflow-y-auto space-y-5">
            ${canWrite ? `
            <form onsubmit="DocumentManager.upload(event)" class="p-4 rounded-xl border-2 border-dashed border-sari-blue/40 bg-sari-blue/5 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div class="md:col-span-2"><label class="doc-label">Fichier *</label><input id="ged-file" type="file" required class="doc-input text-xs" /></div>
              <div><label class="doc-label">${i18n.t('gedTypeLabel','Type GED')}</label><select id="ged-type" class="doc-input">${(this.gedTypes||[]).filter(x=>x.isActive).map(x=>`<option value="${x.id}">${SariUtils.escapeHtml(x.name?.[i18n.currentLang]||x.name?.fr||x.id)}</option>`).join('')}</select></div>
              <div><label class="doc-label">Expiration</label><input id="ged-expiry" type="date" class="doc-input" /></div>
              <div><label class="doc-label">Description</label><input id="ged-notes" class="doc-input" placeholder="Notes…" /></div>
              <div><label class="doc-label">Tags</label><input id="ged-tags" list="ged-tag-options" class="doc-input" placeholder="draft, urgent…"><datalist id="ged-tag-options">${(this.gedTags||[]).filter(x=>x.isActive).map(x=>`<option value="${x.id}">${x.name?.[i18n.currentLang]||x.name?.fr}</option>`).join('')}</datalist></div>
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

  canEdit(){return Boolean(window.auth?.can('ged','edit')||window.auth?.can('documents','edit'));},
  typeLabel(id){const row=(this.gedTypes||[]).find(x=>x.id===id);return row?.name?.[i18n.currentLang]||row?.name?.fr||id||i18n.t('gedOtherType','Autre');},

  card(doc, canWrite) {
    const escapedName = SariUtils.escapeHtml(doc.name);
    return `<article class="p-4 border rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:border-sari-blue transition">
      <div class="flex gap-3"><div class="w-10 h-10 rounded-lg bg-sari-blue/10 text-sari-blue grid place-items-center shrink-0"><i data-lucide="file-text" class="w-5 h-5"></i></div><div class="min-w-0 flex-1"><h4 class="font-bold text-sm truncate text-slate-900 dark:text-white" title="${escapedName}">${escapedName}</h4><p class="text-[10px] text-slate-500">${SariUtils.escapeHtml(this.typeLabel(doc.documentType))} • ${this.formatBytes(doc.size)}${doc.expirationDate ? ` • Exp. ${i18n.formatDate(doc.expirationDate)}` : ''}</p><p class="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">${SariUtils.escapeHtml(doc.notes || 'Sans description')}</p></div></div>
      <div class="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
        <button onclick="DocumentManager.preview('${doc.id}')" class="doc-action"><i data-lucide="eye" class="w-3.5 h-3.5"></i>Voir</button>
        <button onclick="DocumentManager.download('${doc.id}')" class="doc-action"><i data-lucide="download" class="w-3.5 h-3.5"></i>Télécharger</button>
        ${canWrite ? `<button onclick="DocumentManager.editMetadata('${doc.id}')" class="doc-action"><i data-lucide="pencil" class="w-3.5 h-3.5"></i>Titre & métadonnées</button><button onclick="DocumentManager.replace('${doc.id}')" class="doc-action"><i data-lucide="replace" class="w-3.5 h-3.5"></i>Remplacer</button><button onclick="DocumentManager.unlink('${doc.id}')" class="doc-action text-amber-600"><i data-lucide="unlink" class="w-3.5 h-3.5"></i>Délier</button><button onclick="DocumentManager.unlinkAll('${doc.id}')" class="doc-action text-amber-700"><i data-lucide="unlink-2" class="w-3.5 h-3.5"></i>Tout délier</button><button onclick="DocumentManager.deleteDocument('${doc.id}')" class="doc-action text-red-600"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i>Supprimer</button>` : ''}
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
    event.preventDefault();if(!this.canEdit())return app.showToast('Permission GED.edit requise.','error');
    const file = document.getElementById('ged-file').files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return window.app.showToast('La taille maximale hors-ligne est 10 Mo.', 'error');
    const doc = { id: `doc-${crypto.randomUUID()}`, name: file.name, fileCode: this.context.recordLabel || file.name.replace(/\.[^.]+$/,''), mimeType: file.type || 'application/octet-stream', size: file.size, data: await this.readFile(file), documentType: document.getElementById('ged-type').value, expirationDate: document.getElementById('ged-expiry').value, notes: document.getElementById('ged-notes').value.trim(), tags: document.getElementById('ged-tags').value.split(',').map(x=>x.trim()).filter(Boolean), uploaderId: auth.currentUser?.id, uploaderName: auth.currentUser?.name, links: [{ recordType: this.context.recordType, recordId: this.context.recordId }], version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await window.sariDB.save('documents', doc);
    window.app.showToast('Document enregistré hors-ligne.', 'success');
    await this._refresh();
  },

  async createObjectUrl(doc){if(doc?.storagePath)return doc.storagePath;if(!doc?.data)return'';const response=await fetch(doc.data),blob=await response.blob();return URL.createObjectURL(blob);},
  async preview(id) {
    const doc = await window.sariDB.getById('documents', id);
    if (!doc?.data&&!doc?.storagePath) return window.app.showToast('Aucun contenu disponible.', 'warning');
    const url=await this.createObjectUrl(doc),win=window.open(url,'_blank','noopener,noreferrer');if(!win)app.showToast('Autorisez les fenêtres contextuelles pour afficher le document.','warning');if(String(url).startsWith('blob:'))setTimeout(()=>URL.revokeObjectURL(url),60000);
  },
  async download(id){const doc=await sariDB.getById('documents',id);if(!doc?.data&&!doc?.storagePath)return app.showToast('Aucun fichier à télécharger.','warning');const url=await this.createObjectUrl(doc),a=document.createElement('a');a.href=url;a.download=doc.fileName||doc.name||`document-${id}`;document.body.appendChild(a);a.click();a.remove();if(String(url).startsWith('blob:'))setTimeout(()=>URL.revokeObjectURL(url),1000);},

  async editMetadata(id) {
    if(!this.canEdit())return app.showToast('Permission GED.edit requise.','error');
    const doc=await sariDB.getById('documents',id);if(!doc)return;
    let root=document.getElementById('document-metadata-editor');if(!root){root=document.createElement('div');root.id='document-metadata-editor';document.body.appendChild(root);}
    const metadataZ=Math.max(210,...[...document.querySelectorAll('.sari-modal-backdrop,.sari-dialog-backdrop')].filter(node=>!node.closest('#document-manager-root')).map(node=>Number.parseInt(getComputedStyle(node).zIndex,10)||0).map(value=>value+10));root.innerHTML=`<div class="fixed inset-0 z-[${metadataZ}] sari-modal-backdrop grid place-items-center p-3" style="z-index:${metadataZ}"><form onsubmit="DocumentManager.saveMetadata(event,'${id}')" class="sari-tile w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6"><header class="flex justify-between border-b pb-3"><div><span class="sari-badge">GED.edit</span><h3 class="text-xl font-extrabold mt-2">Corriger le document</h3></div><button type="button" onclick="document.getElementById('document-metadata-editor').remove()"><i data-lucide="x"></i></button></header><div class="grid md:grid-cols-2 gap-3 mt-5"><label class="doc-label">${i18n.t('gedTitleLabel','Titre / nom du fichier')}<input id="ged-edit-name" value="${SariUtils.escapeHtml(doc.name||'')}" class="doc-input" required></label><label class="doc-label">Code unique du fichier<input id="ged-edit-file-code" value="${SariUtils.escapeHtml(doc.fileCode||doc.referenceCode||doc.name?.replace(/\.[^.]+$/,'')||doc.id)}" class="doc-input font-mono-tech" required><small>Le fichier physique devient CODE-ID_UNIQUE.extension</small></label><label class="doc-label">${i18n.t('gedTypeLabel','Type GED')}<select id="ged-edit-type" class="doc-input">${(this.gedTypes||[]).filter(item=>item.isActive).map(item=>`<option value="${item.id}" ${doc.documentType===item.id?'selected':''}>${SariUtils.escapeHtml(item.name?.[i18n.currentLang]||item.name?.fr||item.id)}</option>`).join('')}</select></label><label class="doc-label">Expiration<input id="ged-edit-expiry" type="date" value="${doc.expirationDate||''}" class="doc-input"></label><label class="doc-label">Tags<input id="ged-edit-tags" value="${SariUtils.escapeHtml((doc.tags||[]).join(', '))}" class="doc-input"></label></div><div class="mt-4">${RichTextEditor.html('ged-edit-notes',doc.notesHtml||doc.notes||'','Note / description détaillée')}</div><footer class="flex justify-end gap-2 mt-5"><button type="button" onclick="document.getElementById('document-metadata-editor').remove()" class="sari-btn px-4 bg-slate-200">Annuler</button><button class="sari-btn px-5 bg-sari-blue text-white">Enregistrer les corrections</button></footer></form></div>`;window.SariIcons?.hydrate();
  },
  async saveMetadata(event,id){event.preventDefault();if(!this.canEdit())return;const doc=await sariDB.getById('documents',id);Object.assign(doc,{name:document.getElementById('ged-edit-name').value.trim(),fileCode:document.getElementById('ged-edit-file-code').value.trim(),documentType:document.getElementById('ged-edit-type').value,expirationDate:document.getElementById('ged-edit-expiry').value,tags:document.getElementById('ged-edit-tags').value.split(',').map(value=>value.trim()).filter(Boolean),notesHtml:RichTextEditor.value('ged-edit-notes'),notes:RichTextEditor.value('ged-edit-notes').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(),updatedAt:new Date().toISOString(),updatedBy:auth.currentUser?.id,updatedByName:auth.currentUser?.name});await sariDB.save('documents',doc);document.getElementById('document-metadata-editor')?.remove();app.showToast('Document GED corrigé.','success');await this._refresh();},

  async deleteDocument(id) {
    if(!this.canEdit())return app.showToast('Permission GED.edit requise.','error');
    const doc = await window.sariDB.getById('documents', id); if (!doc) return;
    const linkCount = (doc.links || []).length;
    const extra = linkCount ? `\n\nIl est actuellement lié à ${linkCount} enregistrement(s).` : '';
    if (!await DialogManager.confirm(`Supprimer définitivement le fichier « ${doc.name} » de la GED ?${extra}`)) return;
    await window.sariDB.delete('documents', id);
    window.app.showToast('Fichier supprimé de la GED.', 'success');
    await this._refresh();
  },

  async unlinkAll(id) {
    if(!this.canEdit())return app.showToast('Permission GED.edit requise.','error');
    const doc = await window.sariDB.getById('documents', id); if (!doc) return;
    const count = (doc.links || []).length;
    if (!count) return window.app.showToast('Ce document n’est lié à aucun enregistrement.', 'info');
    if (!await DialogManager.confirm(`Retirer toutes les associations (${count}) de ce document, sans supprimer le fichier ?`)) return;
    doc.links = []; doc.updatedAt = new Date().toISOString();
    await window.sariDB.save('documents', doc);
    window.app.showToast('Toutes les associations ont été retirées. Le fichier est conservé dans la GED.', 'success');
    await this._refresh();
  },

  replace(id) {
    if(!this.canEdit())return app.showToast('Permission GED.edit requise.','error');
    const input = document.createElement('input'); input.type = 'file';
    input.onchange = async () => { const file = input.files[0]; if (!file) return; const doc = await window.sariDB.getById('documents', id); Object.assign(doc, { name: file.name, mimeType: file.type, size: file.size, data: await this.readFile(file), version: (doc.version || 1) + 1, updatedAt: new Date().toISOString() }); await window.sariDB.save('documents', doc); window.app.showToast(`Document remplacé • version ${doc.version}`, 'success'); await this._refresh(); }; input.click();
  },

  async unlink(id) {
    if(!this.canEdit())return app.showToast('Permission GED.edit requise.','error');
    if (!await DialogManager.confirm('Délier ce document de cet enregistrement ?')) return;
    const doc = await window.sariDB.getById('documents', id); if (!doc) return;
    doc.links = (doc.links || []).filter(link => !(link.recordType === this.context.recordType && link.recordId === this.context.recordId));
    if (doc.links.length) await window.sariDB.save('documents', doc); else if (await DialogManager.confirm('Ce document ne sera plus lié. Le supprimer définitivement de la GED ?')) await window.sariDB.delete('documents', id); else await window.sariDB.save('documents', doc);
    await this._refresh();
  },

  async linkExisting() {
    if(!this.canEdit())return app.showToast('Permission GED.edit requise.','error');
    const id = document.getElementById('ged-existing')?.value; if (!id) return;
    const doc = await window.sariDB.getById('documents', id); if (!doc) return;
    doc.links = [...(doc.links || []), { recordType: this.context.recordType, recordId: this.context.recordId }]; doc.updatedAt = new Date().toISOString(); await window.sariDB.save('documents', doc); await this._refresh();
  },

  formatBytes(bytes = 0) { if (!bytes) return '0 o'; const units = ['o','Ko','Mo','Go']; const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3); return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`; },
  close() { document.getElementById('document-manager-root')?.remove(); },
  /** Refresh the host view: the inline document manager if open, otherwise the central GED page. */
  async _refresh() {
    if (this.context?.recordType) await this.open(this.context.recordType,this.context.recordId,this.context.recordLabel);
    else if (window.GEDModule) await GEDModule.render();
  }
};
window.DocumentManager = DocumentManager;

export {};
