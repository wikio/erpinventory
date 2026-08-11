/**
 * SARI Système - Role-Based Access Control (RBAC)
 * Admin | Inventory Manager | Import/Export Manager | Tenders Manager | Sales Employee | Read-Only Viewer
 */

class AuthController {
  constructor() {
    this.currentRole = localStorage.getItem('sari_role') || 'admin'; // default Admin
  }

  init() {
    this.applyRole(this.currentRole);
  }

  getRole() {
    return SARI_CONFIG.USER_ROLES[this.currentRole] || SARI_CONFIG.USER_ROLES.admin;
  }

  setRole(roleId) {
    if (!SARI_CONFIG.USER_ROLES[roleId]) return;
    this.currentRole = roleId;
    localStorage.setItem('sari_role', roleId);
    this.applyRole(roleId);
    window.dispatchEvent(new CustomEvent('sari-role-changed', { detail: { roleId } }));
  }

  canWrite(moduleName) {
    if (this.currentRole === 'admin') return true;
    if (this.currentRole === 'readonly') return false;

    switch (moduleName) {
      case 'inventory':
      case 'products':
      case 'warehouses':
        return ['inventory'].includes(this.currentRole);
      case 'importExport':
      case 'shipments':
      case 'suppliers':
        return ['import_export'].includes(this.currentRole);
      case 'tenders':
        return ['tenders'].includes(this.currentRole);
      case 'sales':
      case 'orders':
      case 'customers':
        return ['sales'].includes(this.currentRole);
      case 'settings':
        return false; // only admin can edit general settings
      default:
        return false;
    }
  }

  applyRole(roleId) {
    const roleObj = SARI_CONFIG.USER_ROLES[roleId] || SARI_CONFIG.USER_ROLES.admin;
    
    // Update role selector dropdowns in UI
    const roleSelect = document.getElementById('sari-role-selector');
    if (roleSelect && roleSelect.value !== roleId) {
      roleSelect.value = roleId;
    }

    // Update role badges in header
    const roleBadgeEl = document.getElementById('sari-active-role-badge');
    if (roleBadgeEl) {
      const name = i18n ? i18n.getRoleName(roleId) : roleObj.en;
      roleBadgeEl.textContent = name;
      roleBadgeEl.style.borderColor = roleObj.badgeColor;
      roleBadgeEl.style.color = roleObj.badgeColor;
    }

    // Update permissions UI across active screen
    this.updateUIForPermissions();
  }

  updateUIForPermissions(activeModule = '') {
    const isReadOnly = this.currentRole === 'readonly';
    const canEditCurrent = activeModule ? this.canWrite(activeModule) : (this.currentRole === 'admin');

    // Show or hide read-only alert banner
    const warningEl = document.getElementById('sari-readonly-banner');
    if (warningEl) {
      if (isReadOnly || (activeModule && !canEditCurrent && this.currentRole !== 'admin')) {
        warningEl.classList.remove('hidden');
      } else {
        warningEl.classList.add('hidden');
      }
    }
  }
}

const auth = new AuthController();
if (typeof window !== 'undefined') {
  window.auth = auth;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthController, auth };
}
