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

  async init() {
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
    if (passwordInput) passwordInput.value = 'Sari@2026';
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

  async openProfileEditor(){if(!this.currentUser||!window.sariDB)return;const profile=this.userProfile||await sariDB.getById('userProfiles',this.currentUser.id)||{},employee=this.employee||{};const values=await DialogManager.form(i18n.currentLang==='ar'?'تعديل ملفي الشخصي':i18n.currentLang==='en'?'Edit My Profile':'Modifier mon profil',[{name:'photo',label:i18n.currentLang==='ar'?'الصورة الشخصية':i18n.currentLang==='en'?'Profile Photo':'Photo de profil',type:'image',value:profile.photo||employee.photo||''},{name:'displayName',label:i18n.currentLang==='ar'?'الاسم المعروض':i18n.currentLang==='en'?'Display Name':'Nom affiché',value:profile.displayName||this.currentUser.name,required:true},{name:'email',label:'Email',type:'email',value:profile.email||employee.email||''},{name:'phone',label:i18n.currentLang==='ar'?'الهاتف':i18n.currentLang==='en'?'Phone':'Téléphone',type:'tel',value:profile.phone||employee.phone||''},{name:'address',label:i18n.currentLang==='ar'?'العنوان':i18n.currentLang==='en'?'Address':'Adresse',value:profile.address||employee.postalAddress||''}]);if(!values)return;this.userProfile={id:this.currentUser.id,userId:this.currentUser.id,...values,updatedAt:new Date().toISOString()};await sariDB.save('userProfiles',this.userProfile);if(this.employee){Object.assign(this.employee,{email:values.email,phone:values.phone,postalAddress:values.address,photo:values.photo});await sariDB.save('employees',this.employee);}this.currentUser.name=values.displayName;this.applyRole();app.showToast(i18n.currentLang==='ar'?'تم تحديث الملف الشخصي.':i18n.currentLang==='en'?'Profile updated.':'Profil mis à jour.','success');}

  async loadPermissions() {
    if (!window.sariDB || !this.currentUser) return;
    const role = await window.sariDB.getById('roles', this.currentRole);
    const employees = await window.sariDB.getAll('employees');
    this.employee = employees.find(item => item.userId === this.currentUser.id) || null;
    this.userProfile = await window.sariDB.getById('userProfiles', this.currentUser.id) || null;
    if(this.userProfile?.displayName)this.currentUser.name=this.userProfile.displayName;else if(this.employee)this.currentUser.name=`${this.employee.firstName} ${this.employee.lastName}`.trim();
    this.permissions = this.employee?.permissionOverrides?.length ? this.employee.permissionOverrides : (role?.permissions || []);
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
