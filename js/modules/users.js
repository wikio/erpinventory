/** Administrator user accounts, reset queue, activation delivery and SMTP. */
const UsersModule = {
  state: {
    users: [], employees: [], roles: [], requests: [], settings: {}, smtp: {}, tab: 'accounts',
    mode: localStorage.getItem('sari_users_mode') || 'cards', query: '', role: 'all', status: 'all',
    requestQuery: '', requestStatus: 'all'
  },

  t(key, fallback) { return i18n.t(key, fallback); },
  roleName(roleId) {
    const role = this.state.roles.find(item => item.id === roleId);
    const value = role?.name;
    if (value && typeof value === 'object') return value[i18n.currentLang] || value.fr || roleId;
    return value || i18n.getRoleName(roleId) || roleId;
  },
  statusLabel(active) { return active ? this.t('active', 'Actif') : this.t('inactive', 'Inactif'); },
  requestStatusLabel(status) {
    return this.t(status === 'pending' ? 'pending' : status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : status, status);
  },

  async render(containerId = 'sari-main-view') {
    const container = document.getElementById(containerId);
    if (auth.currentRole !== 'admin') {
      container.innerHTML = `<div class="sari-tile p-8">${this.t('administratorRequired', 'Accès Administrateur requis.')}</div>`;
      return;
    }
    const [usersData, requestsData, smtp, employees, roles] = await Promise.all([
      fetch('/api/admin/users', { credentials: 'same-origin' }).then(response => response.json()),
      fetch('/api/admin/password-reset-requests', { credentials: 'same-origin' }).then(response => response.json()),
      fetch('/api/admin/smtp', { credentials: 'same-origin' }).then(response => response.json()),
      sariDB.getAll('employees'), sariDB.getAll('roles')
    ]);
    Object.assign(this.state, {
      users: usersData.users || [], settings: usersData.settings || {}, requests: requestsData.requests || [],
      smtp, employees, roles
    });
    container.innerHTML = `<div class="space-y-5">
      <section class="sari-tile p-5 sari-grid-pattern flex flex-col md:flex-row justify-between gap-3">
        <div><span class="sari-badge">${this.t('secureAdministration', 'Administration sécurisée')}</span>
          <h2 class="text-2xl font-extrabold mt-2"><i data-lucide="users-round" class="inline text-sari-blue"></i> ${this.t('userAccounts', 'Comptes utilisateurs')}</h2>
          <p class="text-sm text-slate-500">${this.t('userAccountsDescription', 'Comptes, rôles, employés liés, activations et demandes de mot de passe.')}</p>
        </div>
        ${this.state.tab === 'accounts' ? `<button onclick="UsersModule.editUser()" class="sari-btn px-4 bg-sari-blue text-white">+ ${this.t('newAccount', 'Nouveau compte')}</button>` : ''}
      </section>
      <nav class="sari-tile p-2 flex flex-wrap gap-2">${[
        ['accounts', this.t('accounts', 'Comptes')],
        ['requests', this.t('passwordResetRequests', 'Demandes de réinitialisation')],
        ['smtp', this.t('smtpConfiguration', 'Configuration SMTP')]
      ].map(([id, label]) => `<button onclick="UsersModule.state.tab='${id}';UsersModule.render()" class="sari-btn px-4 py-2 ${this.state.tab === id ? 'bg-sari-blue text-white' : ''}">${label}</button>`).join('')}</nav>
      ${this.state.tab === 'accounts' ? this.accountsHtml() : this.state.tab === 'requests' ? this.requestsHtml() : this.smtpHtml()}
      <div id="users-modal"></div>
    </div>`;
    window.SariIcons?.hydrate();
  },

  filteredUsers() {
    return this.state.users.filter(user => {
      if (this.state.role !== 'all' && user.role !== this.state.role) return false;
      if (this.state.status !== 'all' && String(user.isActive !== false) !== this.state.status) return false;
      return SariUtils.matchesAdvancedSearch(user, this.state.query, ['name', 'username', 'email', 'description', 'role', 'permissionOverrides']);
    });
  },
  userActions(user) {
    return `<div class="flex flex-wrap gap-1">
      <button onclick="UsersModule.viewUser('${user.id}')" class="doc-action">${this.t('view', 'Voir')}</button>
      <button onclick="UsersModule.editUser('${user.id}')" class="doc-action">${this.t('edit', 'Modifier')}</button>
      <button onclick="UsersModule.generatePassword('${user.id}')" class="doc-action">${this.t('password', 'Mot de passe')}</button>
      <button onclick="UsersModule.activation('${user.id}')" class="doc-action">${this.t('activation', 'Activation')}</button>
      ${user.username !== 'admin' ? `<button onclick="UsersModule.deleteUser('${user.id}')" class="doc-action text-red-600">${this.t('delete', 'Supprimer')}</button>` : ''}
    </div>`;
  },
  accountsHtml() {
    const users = this.filteredUsers();
    const controls = `<section class="sari-tile p-4 space-y-4">
      <div class="flex flex-wrap gap-4">
        <label class="flex items-center gap-2"><input type="checkbox" ${this.state.settings.demoAccountsEnabled !== false ? 'checked' : ''} onchange="UsersModule.updateAuthSetting('demoAccountsEnabled',this.checked)">${this.t('enableDemoAccounts', 'Activer les comptes démo')}</label>
        <label class="flex items-center gap-2"><input type="checkbox" ${this.state.settings.showDemoAccounts !== false ? 'checked' : ''} onchange="UsersModule.updateAuthSetting('showDemoAccounts',this.checked)">${this.t('showDemoAccounts', 'Afficher les comptes démo sur la connexion')}</label>
        <label class="flex items-center gap-2">${this.t('activationQrSize', 'Taille QR activation')} <input type="number" min="120" max="320" value="${this.state.settings.activationQrSize || 190}" onchange="UsersModule.updateAuthSetting('activationQrSize',Number(this.value))" class="doc-input w-24"></label>
      </div>
      <div class="grid md:grid-cols-[minmax(220px,1fr)_220px_190px_auto] gap-2">
        <input class="doc-input" value="${SariUtils.escapeHtml(this.state.query)}" oninput="UsersModule.state.query=this.value" onkeydown="SariUtils.searchKeyHandler(event,()=>UsersModule.render())" placeholder="${this.t('searchUsers', 'Rechercher par nom, identifiant, email ou description')}">
        <select class="doc-input" onchange="UsersModule.state.role=this.value;UsersModule.render()"><option value="all">${this.t('allRoles', 'Tous les rôles')}</option>${this.state.roles.map(role => `<option value="${role.id}" ${this.state.role === role.id ? 'selected' : ''}>${SariUtils.escapeHtml(this.roleName(role.id))}</option>`).join('')}</select>
        <select class="doc-input" onchange="UsersModule.state.status=this.value;UsersModule.render()"><option value="all">${this.t('allAccountStatuses', 'Tous les états')}</option><option value="true" ${this.state.status === 'true' ? 'selected' : ''}>${this.t('activeAccounts', 'Comptes actifs')}</option><option value="false" ${this.state.status === 'false' ? 'selected' : ''}>${this.t('inactiveAccounts', 'Comptes inactifs')}</option></select>
        <div class="flex rounded-xl border p-1"><button onclick="UsersModule.setMode('cards')" class="sari-btn px-3 ${this.state.mode === 'cards' ? 'bg-sari-blue text-white' : ''}" title="${this.t('cardsView', 'Cartes')}"><i data-lucide="layout-grid"></i></button><button onclick="UsersModule.setMode('list')" class="sari-btn px-3 ${this.state.mode === 'list' ? 'bg-sari-blue text-white' : ''}" title="${this.t('listView', 'Liste')}"><i data-lucide="list"></i></button></div>
      </div>
    </section>`;
    return `<section class="space-y-4">${controls}${this.state.mode === 'list' ? this.userList(users) : this.userCards(users)}</section>`;
  },
  userCards(users) {
    return `<div class="grid md:grid-cols-2 xl:grid-cols-3 gap-3">${users.map(user => {
      const employee = this.state.employees.find(item => item.id === user.employeeId);
      return `<article class="sari-tile user-account-card p-4"><div class="flex justify-between"><span class="sari-badge ${user.isActive ? 'text-green-600' : 'text-red-600'}">${this.statusLabel(user.isActive)}</span>${user.isDemo ? '<span class="sari-badge">DÉMO</span>' : ''}</div><h3 class="font-extrabold mt-3">${SariUtils.escapeHtml(user.name)}</h3><p class="font-mono-tech text-sari-blue">@${SariUtils.escapeHtml(user.username)}</p><p class="text-xs mt-2">${this.t('role', 'Rôle')}: <b>${SariUtils.escapeHtml(this.roleName(user.role))}</b></p><p class="text-xs">${this.t('linkedEmployee', 'Employé lié')}: ${SariUtils.escapeHtml(employee ? `${employee.referenceCode || employee.id} • ${employee.firstName} ${employee.lastName}` : '—')}</p>${user.description ? `<p class="text-xs text-slate-500 mt-2 line-clamp-2">${SariUtils.escapeHtml(user.description)}</p>` : ''}<footer class="mt-3 pt-3 border-t">${this.userActions(user)}</footer></article>`;
    }).join('') || `<div class="sari-tile p-8 text-slate-400">${this.t('noDataFound', 'Aucune donnée')}</div>`}</div>`;
  },
  userList(users) {
    return `<section class="sari-tile overflow-x-auto"><table class="w-full sari-table user-accounts-table"><thead><tr><th>${this.t('displayName', 'Nom affiché')}</th><th>${this.t('username', 'Identifiant')}</th><th>${this.t('role', 'Rôle')}</th><th>${this.t('accountDescription', 'Description du compte')}</th><th>${this.t('state', 'État')}</th><th>${this.t('linkedEmployee', 'Employé lié')}</th><th>${this.t('actionsHeader', 'Actions')}</th></tr></thead><tbody>${users.map(user => {
      const employee = this.state.employees.find(item => item.id === user.employeeId);
      return `<tr><td><b>${SariUtils.escapeHtml(user.name)}</b><small class="block text-slate-400">${SariUtils.escapeHtml(user.email || '—')}</small></td><td class="font-mono-tech text-sari-blue">@${SariUtils.escapeHtml(user.username)}</td><td>${SariUtils.escapeHtml(this.roleName(user.role))}</td><td>${SariUtils.escapeHtml(user.description || '—')}</td><td><span class="sari-badge ${user.isActive ? 'text-green-600' : 'text-red-600'}">${this.statusLabel(user.isActive)}</span></td><td>${SariUtils.escapeHtml(employee ? `${employee.referenceCode || employee.id} • ${employee.firstName} ${employee.lastName}` : '—')}</td><td>${this.userActions(user)}</td></tr>`;
    }).join('') || `<tr><td colspan="7">${this.t('noDataFound', 'Aucune donnée')}</td></tr>`}</tbody></table></section>`;
  },
  setMode(mode) { this.state.mode = mode; localStorage.setItem('sari_users_mode', mode); this.render(); },

  filteredRequests() {
    return [...this.state.requests].sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)).filter(request => {
      if (this.state.requestStatus !== 'all' && request.status !== this.state.requestStatus) return false;
      return SariUtils.matchesAdvancedSearch(request, this.state.requestQuery, ['id', 'username', 'email', 'status', 'processedBy']);
    });
  },
  requestsHtml() {
    const rows = this.filteredRequests();
    return `<div class="space-y-4"><section class="sari-tile p-4 grid md:grid-cols-[1fr_240px] gap-2"><input class="doc-input" value="${SariUtils.escapeHtml(this.state.requestQuery)}" oninput="UsersModule.state.requestQuery=this.value" onkeydown="SariUtils.searchKeyHandler(event,()=>UsersModule.render())" placeholder="${this.t('searchResetRequests', 'Rechercher une demande, un utilisateur ou un email')}"><select class="doc-input" onchange="UsersModule.state.requestStatus=this.value;UsersModule.render()"><option value="all">${this.t('allRequestStatuses', 'Tous les statuts de demande')}</option>${['pending', 'approved', 'rejected'].map(status => `<option value="${status}" ${this.state.requestStatus === status ? 'selected' : ''}>${this.requestStatusLabel(status)}</option>`).join('')}</select></section><section class="sari-tile overflow-x-auto"><table class="w-full sari-table reset-requests-table"><thead><tr><th>${this.t('request', 'Demande')}</th><th>${this.t('user', 'Utilisateur')}</th><th>${this.t('email', 'Email')}</th><th>${this.t('date', 'Date')}</th><th>${this.t('status', 'Statut')}</th><th>${this.t('actionsHeader', 'Actions')}</th></tr></thead><tbody>${rows.map(request => `<tr><td class="font-mono-tech text-sari-blue">${SariUtils.escapeHtml(request.id)}</td><td>${SariUtils.escapeHtml(request.username)}</td><td>${SariUtils.escapeHtml(request.email || '—')}</td><td>${new Date(request.requestedAt).toLocaleString(i18n.currentLang === 'ar' ? 'ar-DZ' : i18n.currentLang === 'en' ? 'en-GB' : 'fr-FR')}</td><td><span class="sari-badge">${this.requestStatusLabel(request.status)}</span></td><td><div class="flex flex-wrap gap-1"><button onclick="UsersModule.viewRequest('${request.id}')" class="doc-action">${this.t('view', 'Voir')}</button><button onclick="UsersModule.editRequest('${request.id}')" class="doc-action">${request.status === 'pending' ? this.t('processRequest', 'Traiter la demande') : this.t('edit', 'Modifier')}</button></div></td></tr>`).join('') || `<tr><td colspan="6" class="p-8">${this.t('noRequest', 'Aucune demande.')}</td></tr>`}</tbody></table></section></div>`;
  },
  requestSheet(request, editable = false) {
    const root = document.getElementById('users-modal');
    root.innerHTML = `<div class="fixed inset-0 z-[110] sari-modal-backdrop grid place-items-center p-3"><article class="reset-request-consultation w-full max-w-3xl"><header><div><span class="sari-badge bg-white/15 text-white">${this.requestStatusLabel(request.status)}</span><h2>${editable ? this.t('processRequest', 'Traiter la demande') : this.t('requestDetails', 'Détail de la demande')}</h2><p>${SariUtils.escapeHtml(request.id)}</p></div><button onclick="UsersModule.closeModal()"><i data-lucide="x"></i></button></header><div class="p-6"><section class="grid sm:grid-cols-2 gap-3"><div><small>${this.t('user', 'Utilisateur')}</small><b>${SariUtils.escapeHtml(request.username || '—')}</b></div><div><small>${this.t('email', 'Email')}</small><b>${SariUtils.escapeHtml(request.email || '—')}</b></div><div><small>${this.t('requestedAt', 'Demandée le')}</small><b>${new Date(request.requestedAt).toLocaleString()}</b></div><div><small>${this.t('requestStatus', 'Statut de la demande')}</small><b>${this.requestStatusLabel(request.status)}</b></div><div><small>${this.t('processedAt', 'Traitée le')}</small><b>${request.processedAt ? new Date(request.processedAt).toLocaleString() : '—'}</b></div><div><small>${this.t('processedBy', 'Traitée par')}</small><b>${SariUtils.escapeHtml(request.processedBy || '—')}</b></div></section>${request.requestMeta?.ip ? `<p class="mt-4 text-xs text-slate-400 font-mono-tech">IP ${SariUtils.escapeHtml(request.requestMeta.ip)}</p>` : ''}<footer class="flex flex-wrap justify-end gap-2 mt-5 pt-4 border-t">${editable && request.status === 'pending' ? `<button onclick="UsersModule.rejectRequest('${request.id}')" class="sari-btn px-4 bg-red-600 text-white">${this.t('reject', 'Rejeter')}</button><button onclick="UsersModule.approveRequest('${request.id}',false)" class="sari-btn px-4 bg-sari-lime text-slate-900">${this.t('approve', 'Approuver')}</button>${request.email ? `<button onclick="UsersModule.approveRequest('${request.id}',true)" class="sari-btn px-4 bg-sari-blue text-white">${this.t('approveEmail', 'Approuver & email')}</button>` : ''}` : ''}<button onclick="UsersModule.closeModal()" class="sari-btn px-4 bg-slate-200">${this.t('close', 'Fermer')}</button></footer></div></article></div>`;
    window.SariIcons?.hydrate();
  },
  viewRequest(id) { const request = this.state.requests.find(item => item.id === id); if (request) this.requestSheet(request, false); },
  editRequest(id) { const request = this.state.requests.find(item => item.id === id); if (request) this.requestSheet(request, true); },

  smtpHtml() {
    const smtp = this.state.smtp;
    return `<form onsubmit="UsersModule.saveSmtp(event)" class="sari-tile p-6"><header class="border-b pb-4"><h3 class="text-xl font-extrabold">${this.t('smtpConfiguration', 'Configuration SMTP')}</h3><p class="text-xs text-slate-500">${this.t('smtpDescription', 'Configuration sécurisée du serveur de messagerie pour les activations et réinitialisations.')}</p></header><div class="grid md:grid-cols-3 gap-3 mt-5"><label class="doc-label">${this.t('smtpHost', 'Hôte SMTP')}<input id="smtp-host" value="${SariUtils.escapeHtml(smtp.host || '')}" class="doc-input" required></label><label class="doc-label">${this.t('port', 'Port')}<input id="smtp-port" type="number" value="${smtp.port || 587}" class="doc-input"></label><label class="doc-label">${this.t('security', 'Sécurité')}<select id="smtp-security" class="doc-input"><option value="starttls" ${smtp.security === 'starttls' ? 'selected' : ''}>STARTTLS</option><option value="ssl" ${smtp.security === 'ssl' ? 'selected' : ''}>SSL/TLS</option><option value="none" ${smtp.security === 'none' ? 'selected' : ''}>${this.t('none', 'Aucune')}</option></select></label><label class="doc-label">${this.t('smtpUser', 'Utilisateur SMTP')}<input id="smtp-user" value="${SariUtils.escapeHtml(smtp.username || '')}" class="doc-input"></label><label class="doc-label">${this.t('smtpPassword', 'Mot de passe SMTP')}<input id="smtp-password" type="password" placeholder="${smtp.hasPassword ? this.t('keepCurrentSecret', 'Conserver le secret actuel') : this.t('smtpPassword', 'Mot de passe SMTP')}" class="doc-input"><small class="field-helper">${this.t('smtpSecretHelper', 'Jamais enregistré sur disque depuis cette interface.')}</small></label><label class="doc-label">${this.t('state', 'État')}<select id="smtp-enabled" class="doc-input"><option value="true" ${smtp.enabled ? 'selected' : ''}>${this.t('enabled', 'Activé')}</option><option value="false" ${!smtp.enabled ? 'selected' : ''}>${this.t('disabled', 'Désactivé')}</option></select></label><label class="doc-label">${this.t('senderName', 'Nom expéditeur')}<input id="smtp-sender-name" value="${SariUtils.escapeHtml(smtp.senderName || 'SARI Système')}" class="doc-input"></label><label class="doc-label">${this.t('senderAddress', 'Adresse expéditeur')}<input id="smtp-sender-address" type="email" value="${SariUtils.escapeHtml(smtp.senderAddress || '')}" class="doc-input"></label><label class="flex items-center gap-2"><input id="smtp-reject" type="checkbox" ${smtp.rejectUnauthorized !== false ? 'checked' : ''}>${this.t('verifyTlsCertificate', 'Vérifier le certificat TLS')}</label></div><div class="flex justify-end gap-2 mt-5"><button type="button" onclick="UsersModule.testSmtp()" class="sari-btn px-4 bg-sari-lime">${this.t('testSend', 'Tester l’envoi')}</button><button class="sari-btn px-5 bg-sari-blue text-white">${this.t('saveSmtp', 'Enregistrer SMTP')}</button></div></form>`;
  },

  async updateAuthSetting(field, value) {
    await fetch('/api/admin/auth-settings', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) });
    this.render();
  },
  async editUser(id = '') {
    const old = this.state.users.find(user => user.id === id) || {};
    const values = await DialogManager.form(id ? this.t('editAccount', 'Modifier le compte') : this.t('createAccount', 'Créer un compte'), [
      { name: 'username', label: this.t('username', 'Identifiant'), value: old.username || '', required: true },
      { name: 'name', label: this.t('displayName', 'Nom affiché'), value: old.name || '', required: true },
      { name: 'description', label: this.t('accountDescription', 'Description du compte'), type: 'textarea', value: old.description || '' },
      { name: 'email', label: this.t('email', 'Email'), type: 'email', value: old.email || '' },
      { name: 'role', label: this.t('role', 'Rôle'), type: 'select', value: old.role || 'readonly', options: this.state.roles.map(role => ({ value: role.id, label: this.roleName(role.id) })) },
      { name: 'employeeId', label: this.t('linkedActiveEmployee', 'Employé actif lié'), type: 'select', value: old.employeeId || '', options: [{ value: '', label: this.t('none', 'Aucun') }, ...this.state.employees.filter(employee => employee.status === 'active').map(employee => ({ value: employee.id, label: `${employee.referenceCode || employee.id} • ${employee.firstName} ${employee.lastName}` }))] },
      { name: 'permissionOverrides', label: this.t('specificPermissions', 'Permissions spécifiques') + ' (' + this.t('commaSeparated', 'séparées par virgules') + ')', type: 'textarea', value: (old.permissionOverrides || []).join(', ') },
      { name: 'isActive', label: this.t('accountActive', 'Compte actif'), type: 'select', value: String(old.isActive !== false), options: [{ value: 'true', label: this.t('yes', 'Oui') }, { value: 'false', label: this.t('no', 'Non') }] },
      { name: 'generatePassword', label: this.t('generateSecurePassword', 'Générer un mot de passe sécurisé'), type: 'select', value: id ? 'false' : 'true', options: [{ value: 'true', label: this.t('yes', 'Oui') }, { value: 'false', label: this.t('no', 'Non') }] }
    ]);
    if (!values) return;
    const payload = { ...values, isActive: values.isActive === 'true', generatePassword: values.generatePassword === 'true', permissionOverrides: values.permissionOverrides.split(',').map(value => value.trim()).filter(Boolean) };
    const response = await fetch(id ? `/api/admin/users/${id}` : '/api/admin/users', { method: id ? 'PUT' : 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json(); if (!response.ok) return app.showToast(result.error, 'error');
    for (const employee of this.state.employees.filter(item => item.userId === result.user.id && item.id !== values.employeeId)) { employee.userId = ''; await sariDB.save('employees', employee); }
    if (values.employeeId) { const employee = await sariDB.getById('employees', values.employeeId); if (employee) { employee.userId = result.user.id; await sariDB.save('employees', employee); } }
    if (result.temporaryPassword) this.showDelivery({ title: this.t('temporaryPassword', 'Mot de passe temporaire'), link: result.temporaryPassword });
    await this.render();
  },
  async viewUser(id) {
    const user = this.state.users.find(item => item.id === id); if (!user) return;
    const employee = this.state.employees.find(item => item.id === user.employeeId), root = document.getElementById('users-modal');
    root.innerHTML = `<div class="fixed inset-0 z-50 sari-modal-backdrop grid place-items-center p-3"><article class="user-consultation w-full max-w-3xl"><header><div><span class="sari-badge bg-white/15 text-white">${SariUtils.escapeHtml(this.roleName(user.role))}</span><h2>${SariUtils.escapeHtml(user.name)}</h2><p>@${SariUtils.escapeHtml(user.username)}</p></div><button onclick="UsersModule.closeModal()"><i data-lucide="x"></i></button></header><div class="p-6 grid md:grid-cols-2 gap-3"><div><small>${this.t('email', 'Email')}</small><b>${SariUtils.escapeHtml(user.email || '—')}</b></div><div><small>${this.t('state', 'État')}</small><b>${this.statusLabel(user.isActive)}</b></div><div><small>${this.t('linkedEmployee', 'Employé lié')}</small><b>${SariUtils.escapeHtml(employee ? `${employee.referenceCode || employee.id} • ${employee.firstName} ${employee.lastName}` : '—')}</b></div><div><small>${this.t('lastLogin', 'Dernière connexion')}</small><b>${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}</b></div><div class="md:col-span-2"><small>${this.t('accountDescription', 'Description du compte')}</small><b>${SariUtils.escapeHtml(user.description || '—')}</b></div><div class="md:col-span-2"><small>${this.t('specificPermissions', 'Permissions spécifiques')}</small><b>${(user.permissionOverrides || []).map(SariUtils.escapeHtml).join(', ') || this.t('accordingToRole', 'Selon le rôle')}</b></div><footer class="md:col-span-2 flex justify-end gap-2 mt-2"><button onclick="UsersModule.closeModal();UsersModule.editUser('${user.id}')" class="sari-btn px-4 bg-sari-blue text-white">${this.t('edit', 'Modifier')}</button></footer></div></article></div>`;
    window.SariIcons?.hydrate();
  },
  async deleteUser(id) { if (await DialogManager.confirm(this.t('deleteUserConfirm', 'Supprimer ce compte utilisateur ?'))) { const response = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'same-origin' }), result = await response.json(); if (!response.ok) return app.showToast(result.error, 'error'); this.render(); } },
  async generatePassword(id) { const response = await fetch(`/api/admin/users/${id}/generate-password`, { method: 'POST', credentials: 'same-origin' }), result = await response.json(); if (response.ok) this.showDelivery({ title: this.t('newPassword', 'Nouveau mot de passe'), link: result.temporaryPassword }); else app.showToast(result.error, 'error'); },
  async activation(id) { const user = this.state.users.find(item => item.id === id), sendEmail = Boolean(user.email && this.state.smtp.enabled), response = await fetch(`/api/admin/users/${id}/activation`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sendEmail }) }), result = await response.json(); if (response.ok) this.showDelivery({ title: this.t('activationLink', 'Lien d’activation'), link: result.link, email: result.email }); else app.showToast(result.error, 'error'); },
  async rejectRequest(id) { if (!await DialogManager.confirm(this.t('rejectRequestConfirm', 'Rejeter cette demande ?'))) return; await fetch(`/api/admin/password-reset-requests/${id}/reject`, { method: 'POST', credentials: 'same-origin' }); this.closeModal(); this.render(); },
  async approveRequest(id, sendEmail) { const response = await fetch(`/api/admin/password-reset-requests/${id}/approve`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sendEmail }) }), result = await response.json(); if (response.ok) { this.showDelivery({ title: this.t('resetLink', 'Lien de réinitialisation'), link: result.link, email: result.email }); this.render(); } else app.showToast(result.error, 'error'); },
  showDelivery({ title, link, email }) { const qrSize = Math.min(320, Math.max(120, Number(this.state.settings.activationQrSize || 190))), root = document.getElementById('users-modal'); root.innerHTML = `<div class="fixed inset-0 z-[110] sari-modal-backdrop grid place-items-center p-3"><section class="sari-tile p-6 w-full max-w-xl text-center"><h3 class="text-xl font-extrabold">${title}</h3><canvas id="user-delivery-qr" width="${qrSize}" height="${qrSize}" class="mx-auto my-4 border rounded"></canvas><textarea id="user-delivery-link" readonly class="doc-input font-mono">${SariUtils.escapeHtml(link)}</textarea><p class="text-xs mt-2 ${email ? 'text-green-600' : 'text-slate-500'}">${email ? this.t('emailSentAutomatically', 'Email envoyé automatiquement.') : this.t('copyShareManually', 'Copiez et partagez manuellement ce contenu.')}</p><div class="flex justify-center gap-2 mt-4"><button onclick="UsersModule.copyDelivery()" class="sari-btn px-4 bg-sari-blue text-white">${this.t('copy', 'Copier')}</button><button onclick="UsersModule.closeModal()" class="sari-btn px-4 bg-slate-200">${this.t('close', 'Fermer')}</button></div></section></div>`; setTimeout(() => SariUtils.drawQRCode(document.getElementById('user-delivery-qr'), link, qrSize), 0); },
  async copyDelivery() { const value = document.getElementById('user-delivery-link').value; await navigator.clipboard.writeText(value); app.showToast(this.t('copiedClipboard', 'Copié dans le presse-papiers.'), 'success'); },
  closeModal() { const root = document.getElementById('users-modal'); if (root) root.innerHTML = ''; },
  async saveSmtp(event) { event.preventDefault(); const payload = { host: document.getElementById('smtp-host').value, port: Number(document.getElementById('smtp-port').value), security: document.getElementById('smtp-security').value, username: document.getElementById('smtp-user').value, password: document.getElementById('smtp-password').value, enabled: document.getElementById('smtp-enabled').value === 'true', senderName: document.getElementById('smtp-sender-name').value, senderAddress: document.getElementById('smtp-sender-address').value, rejectUnauthorized: document.getElementById('smtp-reject').checked }; const response = await fetch('/api/admin/smtp', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }), result = await response.json(); if (response.ok) { app.showToast(this.t('smtpSaved', 'SMTP enregistré.'), 'success'); this.render(); } else app.showToast(result.error, 'error'); },
  async testSmtp() { const response = await fetch('/api/admin/smtp/test', { method: 'POST', credentials: 'same-origin' }), result = await response.json(); app.showToast(response.ok ? this.t('testEmailSent', 'Email de test envoyé.') : result.error, response.ok ? 'success' : 'error'); }
};
window.UsersModule = UsersModule;
export {};
