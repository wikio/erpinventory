/**
 * SARI Système authentication and role-based access control.
 * Identity and role are issued by the server; the browser cannot select its own role.
 */
class AuthController {
  constructor() {
    this.currentUser = null;
    this.currentRole = null;
    this.captchaId = null;
    this.permissions = [];
    this.employee = null;
  }

  async loadLoginBranding(){window.app?.applyCachedBranding?.();try{await window.sariDB?.init();const settings=await window.sariDB?.getById('settings','app-settings');if(settings)window.app?.applyBranding?.(settings);}catch(error){console.warn('[Auth] Login branding unavailable',error);}}
  async loadPublicAuthSettings(){try{const response=await fetch('/api/auth/public-settings',{cache:'no-store'}),settings=await response.json(),demo=document.getElementById('auth-demo-accounts');if(demo)demo.classList.toggle('hidden',settings.showDemoAccounts===false||settings.demoAccountsEnabled===false);}catch(_){}}
  async forgotPassword(){const values=await DialogManager.form('Demande de réinitialisation',[{name:'identifier',label:'Identifiant ou email',required:true}],{message:'La demande sera placée dans la file Administrateur. Aucun mot de passe ne sera modifié automatiquement.',confirmText:'Envoyer la demande'});if(!values)return;const response=await fetch('/api/auth/password-reset-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)}),result=await response.json();this.setLoginError(response.ok?'Demande enregistrée. Un Administrateur doit maintenant la traiter.':result.error||'Demande impossible.');}
  async handleActionToken(){const params=new URLSearchParams(location.search),token=params.get('reset')||params.get('activation');if(!token)return;const validation=await fetch('/api/auth/token/validate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})}).then(response=>response.json()).catch(()=>({valid:false}));if(!validation.valid){this.showLogin('Le lien d’activation/réinitialisation est invalide ou expiré.');return;}const values=await DialogManager.form(validation.purpose==='activation'?'Activer le compte':'Réinitialiser le mot de passe',[{name:'password',label:'Nouveau mot de passe',type:'password',required:true},{name:'confirmation',label:'Confirmer le mot de passe',type:'password',required:true}],{confirmText:'Enregistrer'});if(!values)return;if(values.password!==values.confirmation||values.password.length<10){this.showLogin('Les mots de passe doivent être identiques et contenir au moins 10 caractères.');return;}const response=await fetch('/api/auth/token/consume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password:values.password})}),result=await response.json();history.replaceState({},'',location.pathname);this.showLogin(response.ok?'Mot de passe enregistré. Vous pouvez vous connecter.':result.error||'Lien invalide.');}

  async init() {
    this.setupProfileMenu();
    await this.loadLoginBranding();
    await this.loadPublicAuthSettings();
    await this.handleActionToken();
    // A short-lived session hint prevents the empty login form flashing while
    // the HttpOnly session is verified after a refresh.
    const sessionHint=sessionStorage.getItem('sari_authenticated_hint')==='true';
    if(sessionHint){this.hideLogin();window.app?.showBootLoader?.();}else this.showLogin();
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) {
        sessionStorage.removeItem('sari_authenticated_hint');
        window.app?.hideBootLoader?.();
        this.showLogin();
        await this.refreshCaptcha();
        return false;
      }
      const data = await response.json();
      this.setAuthenticatedUser(data.user);
      sessionStorage.setItem('sari_authenticated_hint','true');
      // The app controller hides the gate only after the offline database is ready.
      return true;
    } catch (error) {
      console.error('[Auth] Session initialization failed:', error);
      sessionStorage.removeItem('sari_authenticated_hint');
      window.app?.hideBootLoader?.();
      this.showLogin(`Initialisation de la session impossible : ${error?.message || 'erreur inconnue'}.`);
      await this.refreshCaptcha();
      return false;
    }
  }

  setAuthenticatedUser(user) {
    this.currentUser = user;
    this.currentRole = user.role;
    localStorage.removeItem('sari_role'); // Remove legacy client-controlled role value.
    this.applyRole();
  }

  getRole() {
    return SARI_CONFIG.USER_ROLES[this.currentRole] || SARI_CONFIG.USER_ROLES.readonly;
  }

  async refreshCaptcha() {
    const refreshButton = document.getElementById('captcha-refresh');
    if (refreshButton) refreshButton.disabled = true;
    try {
      const response = await fetch('/api/auth/captcha', { cache: 'no-store' });
      if (!response.ok) throw new Error('captcha');
      const data = await response.json();
      this.captchaId = data.id;
      this.drawCaptcha(data.prompt);
      const answer = document.getElementById('captcha-answer');
      if (answer) answer.value = '';
    } catch (_) {
      this.setLoginError('Impossible de charger le CAPTCHA. Réessayez.');
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  drawCaptcha(prompt) {
    const canvas = document.getElementById('captcha-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#e6f7fb');
    gradient.addColorStop(1, '#f3f8d2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 8; i += 1) {
      ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 80)}, 130, 160, .25)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((Math.random() - 0.5) * 0.06);
    ctx.font = '700 24px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#075f78';
    ctx.fillText(prompt, 0, 1);
    ctx.restore();
    canvas.setAttribute('aria-label', `Question CAPTCHA : ${prompt}`);
  }

  showLogin(message = '') {
    const gate = document.getElementById('sari-auth-gate');
    if (gate) gate.classList.remove('hidden');
    document.body.classList.add('auth-locked');
    this.setLoginError(message);
    setTimeout(() => document.getElementById('login-username')?.focus(), 50);
  }

  hideLogin() {
    const gate = document.getElementById('sari-auth-gate');
    if (gate) gate.classList.add('hidden');
    document.body.classList.remove('auth-locked');
  }

  setLoginError(message = '') {
    const error = document.getElementById('login-error');
    if (!error) return;
    error.textContent = message;
    error.classList.toggle('hidden', !message);
  }

  togglePassword() {
    const input = document.getElementById('login-password');
    const icon = document.getElementById('password-toggle-icon');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    if (icon) icon.setAttribute('data-lucide', input.type === 'password' ? 'eye' : 'eye-off');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  useDemoAccount(username) {
    const userInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    if (userInput) userInput.value = username;
    if (passwordInput) passwordInput.value = username === 'admin' ? '' : 'Sari@2026';
    document.getElementById('captcha-answer')?.focus();
  }

  async login(event) {
    event.preventDefault();
    const button = document.getElementById('login-submit');
    const username = document.getElementById('login-username')?.value || '';
    const password = document.getElementById('login-password')?.value || '';
    const captchaAnswer = document.getElementById('captcha-answer')?.value || '';
    this.setLoginError();
    if (!username || !password || !captchaAnswer) {
      this.setLoginError('Veuillez remplir tous les champs et résoudre le CAPTCHA.');
      return;
    }

    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="auth-spinner"></span> Connexion sécurisée…';
    }
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, captchaId: this.captchaId, captchaAnswer })
      });
      const data = await response.json();
      if (!response.ok) {
        this.setLoginError(data.error || 'La connexion a échoué.');
        await this.refreshCaptcha();
        return;
      }
      this.setAuthenticatedUser(data.user);
      sessionStorage.setItem('sari_authenticated_hint','true');
      document.body.classList.add('auth-transitioning');
      this.hideLogin();
      const ready = await window.app?.continueAfterAuthentication();
      document.body.classList.remove('auth-transitioning');
      if (ready === false) return;
    } catch (error) {
      console.error('[Auth] Login finalization failed:', error);
      sessionStorage.removeItem('sari_authenticated_hint');
      window.app?.hideBootLoader?.();
      this.showLogin(`La connexion n’a pas pu être finalisée : ${error?.message || 'erreur inconnue'}.`);
      await this.refreshCaptcha();
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i> Se connecter';
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    }
  }

  setupProfileMenu(){if(this.profileMenuBound)return;this.profileMenuBound=true;document.addEventListener('click',event=>{const wrap=document.getElementById('sari-profile-menu-wrap');if(wrap&&!wrap.contains(event.target))this.closeProfileMenu();});document.addEventListener('keydown',event=>{if(event.key==='Escape')this.closeProfileMenu();});}
  toggleProfileMenu(event){event?.preventDefault?.();event?.stopPropagation?.();const menu=document.getElementById('sari-profile-menu'),trigger=document.getElementById('sari-profile-menu-trigger');if(!menu)return;const opening=menu.classList.contains('hidden');menu.classList.toggle('hidden',!opening);trigger?.setAttribute('aria-expanded',String(opening));if(opening)setTimeout(()=>menu.querySelector('button')?.focus(),0);}
  closeProfileMenu(){document.getElementById('sari-profile-menu')?.classList.add('hidden');document.getElementById('sari-profile-menu-trigger')?.setAttribute('aria-expanded','false');}

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      this.currentUser = null;
      this.currentRole = null;
      sessionStorage.removeItem('sari_authenticated_hint');
      window.location.hash = '';
      window.location.reload();
    }
  }

  async openProfileView(){
    if(!this.currentUser||!window.sariDB)return;
    const profile=this.userProfile||await sariDB.getById('userProfiles',this.currentUser.id)||{},employee=this.employee||{},root=document.getElementById('sari-modal-root'),photo=profile.photo||employee.photo||'',displayName=profile.displayName||this.currentUser.name||this.currentUser.username;
    root.innerHTML=`<div class="fixed inset-0 z-[110] sari-modal-backdrop grid place-items-center p-3"><article class="profile-consultation w-full max-w-4xl max-h-[94vh] overflow-y-auto"><header><div class="flex items-center gap-4"><div class="profile-consultation-avatar">${photo?`<img src="${SariUtils.escapeHtml(photo)}" alt="">`:'<i data-lucide="user-round"></i>'}</div><div><span class="sari-badge bg-white/15 text-white">${i18n.t('myProfile','Mon profil')}</span><h2>${SariUtils.escapeHtml(displayName)}</h2><p>@${SariUtils.escapeHtml(this.currentUser.username)} • ${SariUtils.escapeHtml(i18n.getRoleName(this.currentRole))}</p></div></div><button onclick="app.closeModalRoot()"><i data-lucide="x"></i></button></header><div class="profile-consultation-body"><section class="profile-info-grid"><div><small>${i18n.t('username','Identifiant')}</small><b>@${SariUtils.escapeHtml(this.currentUser.username)}</b></div><div><small>${i18n.t('role','Rôle')}</small><b>${SariUtils.escapeHtml(i18n.getRoleName(this.currentRole))}</b></div><div><small>${i18n.t('email','Email')}</small><b>${SariUtils.escapeHtml(profile.email||employee.email||this.currentUser.email||'—')}</b></div><div><small>${i18n.t('phone','Téléphone')}</small><b>${SariUtils.escapeHtml(profile.phone||employee.phone||'—')}</b></div><div><small>${i18n.t('address','Adresse')}</small><b>${SariUtils.escapeHtml(profile.address||employee.postalAddress||'—')}</b></div><div><small>${i18n.t('employeeReference','Référence employé')}</small><b>${SariUtils.escapeHtml(employee.referenceCode||employee.id||i18n.t('noLinkedEmployee','Aucun dossier employé lié'))}</b></div>${employee.position?`<div><small>${i18n.t('position','Poste')}</small><b>${SariUtils.escapeHtml(employee.position)}</b></div>`:''}${employee.department?`<div><small>${i18n.t('department','Département')}</small><b>${SariUtils.escapeHtml(employee.department)}</b></div>`:''}</section><footer class="flex flex-wrap justify-end gap-2 mt-5 pt-4 border-t"><button onclick="app.closeModalRoot();app.navigate('portal')" class="sari-btn px-4 bg-slate-800 text-white"><i data-lucide="contact-round"></i>${i18n.t('openPersonalSpace','Ouvrir l’espace personnel')}</button><button onclick="app.closeModalRoot();auth.openProfileEditor()" class="sari-btn px-4 bg-sari-lime text-slate-900"><i data-lucide="pencil"></i>${i18n.t('editMyProfile','Modifier mon profil')}</button><button onclick="app.closeModalRoot();auth.openPasswordUpdate()" class="sari-btn px-4 bg-sari-blue text-white"><i data-lucide="lock-keyhole"></i>${i18n.t('updatePassword','Mettre à jour le mot de passe')}</button></footer></div></article></div>`;
    window.SariIcons?.hydrate();
  }

  async openProfileEditor(){
    if(!this.currentUser||!window.sariDB)return;
    const profile=this.userProfile||await sariDB.getById('userProfiles',this.currentUser.id)||{},employee=this.employee||{};
    const values=await DialogManager.form(i18n.t('editMyProfile','Modifier mon profil'),[
      {name:'photo',label:i18n.t('profilePhoto','Photo de profil'),type:'image',value:profile.photo||employee.photo||''},
      {name:'displayName',label:i18n.t('displayName','Nom affiché'),value:profile.displayName||this.currentUser.name,required:true},
      {name:'email',label:i18n.t('email','Email'),type:'email',value:profile.email||employee.email||this.currentUser.email||''},
      {name:'phone',label:i18n.t('phone','Téléphone'),type:'tel',value:profile.phone||employee.phone||''},
      {name:'address',label:i18n.t('address','Adresse'),value:profile.address||employee.postalAddress||''}
    ]);
    if(!values)return;
    this.userProfile={id:this.currentUser.id,userId:this.currentUser.id,...values,updatedAt:new Date().toISOString()};
    await sariDB.save('userProfiles',this.userProfile);
    if(this.employee){Object.assign(this.employee,{email:values.email,phone:values.phone,postalAddress:values.address,photo:values.photo});await sariDB.save('employees',this.employee);}
    this.currentUser.name=values.displayName;this.applyRole();app.showToast(i18n.t('profileUpdated','Profil mis à jour.'),'success');
  }

  passwordError(result={}){const keys={CURRENT_PASSWORD_INCORRECT:'currentPasswordIncorrect',PASSWORD_TOO_SHORT:'passwordTooShort',PASSWORD_UNCHANGED:'newPasswordMustDiffer',PASSWORD_MISMATCH:'passwordMismatch',AUTH_REQUIRED:'authenticationRequired'};return i18n.t(keys[result.code]||'passwordChangeFailed',result.error||'La mise à jour du mot de passe a échoué.');}
  async openPasswordUpdate(){
    if(!this.currentUser)return;
    const values=await DialogManager.form(i18n.t('updatePassword','Mettre à jour le mot de passe'),[
      {name:'currentPassword',label:i18n.t('currentPassword','Mot de passe actuel'),type:'password',required:true},
      {name:'newPassword',label:i18n.t('newPassword','Nouveau mot de passe'),type:'password',required:true},
      {name:'confirmation',label:i18n.t('confirmNewPassword','Confirmer le nouveau mot de passe'),type:'password',required:true}
    ],{message:i18n.t('passwordRequirements','Le nouveau mot de passe doit contenir au moins 10 caractères.'),confirmText:i18n.t('updatePassword','Mettre à jour le mot de passe')});
    if(!values)return;
    if(values.newPassword!==values.confirmation)return app.showToast(i18n.t('passwordMismatch','Les mots de passe ne correspondent pas.'),'warning');
    if(values.newPassword.length<10)return app.showToast(i18n.t('passwordTooShort','Le nouveau mot de passe doit contenir au moins 10 caractères.'),'warning');
    if(values.newPassword===values.currentPassword)return app.showToast(i18n.t('newPasswordMustDiffer','Le nouveau mot de passe doit être différent du mot de passe actuel.'),'warning');
    const response=await fetch('/api/auth/change-password',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)}),result=await response.json();
    if(!response.ok)return app.showToast(this.passwordError(result),'error');
    app.showToast(i18n.t('passwordChanged','Mot de passe mis à jour avec succès.'),'success');
  }

  async loadPermissions() {
    if (!window.sariDB || !this.currentUser) return;
    const role = await window.sariDB.getById('roles', this.currentRole);
    const employees = await window.sariDB.getAll('employees');
    this.employee = employees.find(item => item.userId === this.currentUser.id) || null;
    this.userProfile = await window.sariDB.getById('userProfiles', this.currentUser.id) || null;
    if(this.userProfile?.displayName)this.currentUser.name=this.userProfile.displayName;else if(this.employee)this.currentUser.name=`${this.employee.firstName} ${this.employee.lastName}`.trim();
    this.permissions = this.currentUser?.permissionOverrides?.length ? this.currentUser.permissionOverrides : this.employee?.permissionOverrides?.length ? this.employee.permissionOverrides : (role?.permissions || []);
    this.applyRole();
  }

  can(moduleName, action = 'view') {
    if (!this.currentUser) return false;
    if (this.currentRole === 'admin' || this.permissions.includes('*')) return true;
    const key = `${moduleName}.${action}`;
    return this.permissions.includes(key) || this.permissions.includes(`${moduleName}.*`);
  }

  canWrite(moduleName) {
    const aliases = { products: 'inventory', warehouses: 'inventory', shipments: 'importExport', orders: 'sales' };
    return this.can(aliases[moduleName] || moduleName, 'edit') || this.can(aliases[moduleName] || moduleName, 'create');
  }

  applyRole() {
    const roleObj = this.getRole();
    const roleBadge = document.getElementById('sari-active-role-badge');
    const userName = document.getElementById('sari-active-user-name');
    if (roleBadge) {
      roleBadge.textContent = window.i18n ? window.i18n.getRoleName(this.currentRole) : roleObj.fr;
      roleBadge.style.borderColor = roleObj.badgeColor;
      roleBadge.style.color = roleObj.badgeColor;
    }
    if (userName) userName.textContent = this.currentUser?.name || '';
    const avatar=document.getElementById('sari-active-user-avatar'),fallback=document.getElementById('sari-active-user-avatar-fallback'),photo=this.userProfile?.photo||this.employee?.photo||'';if(avatar){avatar.src=photo;avatar.classList.toggle('hidden',!photo);}if(fallback)fallback.classList.toggle('hidden',!!photo);
    this.updateUIForPermissions();
  }

  updateUIForPermissions(activeModule = '') {
    const restricted = this.currentRole === 'readonly' || (activeModule && !this.canWrite(activeModule) && this.currentRole !== 'admin');
    const warning = document.getElementById('sari-readonly-banner');
    if (warning) warning.classList.toggle('hidden', !restricted);
  }
}

const auth = new AuthController();
if (typeof window !== 'undefined') window.auth = auth;

export { AuthController, auth };
