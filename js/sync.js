/**
 * SARI Système - Offline-First Synchronization & Queue Manager
 * Manages Online/Offline connectivity states, simulated network drops,
 * and background IndexedDB sync queue processing.
 */

class SyncController {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.simulatedOffline = false;
    this.syncing = false;
  }

  async init() {
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
    
    // Check initial queue
    await this.updateSyncBadge();
  }

  getOnlineStatus() {
    if (this.simulatedOffline) return false;
    return this.isOnline;
  }

  setSimulatedOffline(offline) {
    this.simulatedOffline = !!offline;
    this.handleNetworkChange(!this.simulatedOffline);
  }

  async handleNetworkChange(online) {
    const actualStatus = this.simulatedOffline ? false : online;
    this.isOnline = actualStatus;
    
    const indicatorEl = document.getElementById('sari-network-badge');
    const indicatorText = document.getElementById('sari-network-text');
    const indicatorDot = document.getElementById('sari-network-dot');

    if (indicatorEl) {
      if (actualStatus) {
        indicatorEl.classList.remove('border-sari-amber', 'text-sari-amber');
        indicatorEl.classList.add('border-sari-lime', 'text-sari-lime');
        if (indicatorText) indicatorText.textContent = i18n ? i18n.t('online') : 'Online';
        if (indicatorDot) indicatorDot.className = 'w-2 h-2 rounded-full bg-sari-lime mr-1 animate-pulse';
        
        // When restored to online, automatically process queue!
        await this.processSyncQueue();
      } else {
        indicatorEl.classList.remove('border-sari-lime', 'text-sari-lime');
        indicatorEl.classList.add('border-sari-amber', 'text-sari-amber');
        if (indicatorText) indicatorText.textContent = i18n ? i18n.t('offline') : 'Offline';
        if (indicatorDot) indicatorDot.className = 'w-2 h-2 rounded-full bg-sari-amber mr-1';
      }
    }

    await this.updateSyncBadge();
    window.dispatchEvent(new CustomEvent('sari-network-status-changed', { detail: { online: actualStatus } }));
  }

  async enqueueMutation(storeName, action, payload) {
    const item = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      storeName,
      action, // 'save' | 'delete'
      payload,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    if (typeof window !== 'undefined' && window.sariDB) {
      await window.sariDB.save('syncQueue', item);
      await this.updateSyncBadge();
    }

    if (this.getOnlineStatus()) {
      // Process immediately if online
      setTimeout(() => this.processSyncQueue(), 500);
    }
  }

  async processSyncQueue() {
    if (this.syncing || !this.getOnlineStatus()) return;
    if (!window.sariDB) return;

    this.syncing = true;
    const badgeCountEl = document.getElementById('sari-sync-count');
    if (badgeCountEl) badgeCountEl.classList.add('animate-spin');

    try {
      const queueItems = await window.sariDB.getAll('syncQueue');
      if (queueItems.length === 0) {
        this.syncing = false;
        await this.updateSyncBadge();
        return;
      }

      console.log(`[Sync] Processing ${queueItems.length} items from offline IndexedDB queue...`);

      for (const item of queueItems) {
        try {
          // Simulate server synchronization / conflict resolution
          if (item.action === 'save') {
            await window.sariDB.save(item.storeName, item.payload);
          } else if (item.action === 'delete') {
            await window.sariDB.delete(item.storeName, item.payload.id);
          }
          await window.sariDB.delete('syncQueue', item.id);
        } catch (err) {
          console.warn('[Sync] Error processing queue item:', item.id, err);
        }
      }

      console.log('[Sync] Synchronization queue completed successfully.');
      
      // Notify UI
      if (typeof window !== 'undefined' && window.app) {
        window.app.showToast(i18n ? i18n.t('syncSuccessMessage') : 'Offline queue synced successfully!', 'success');
      }
    } catch (e) {
      console.error('[Sync] Fatal queue processing error:', e);
    } finally {
      this.syncing = false;
      await this.updateSyncBadge();
    }
  }

  async updateSyncBadge() {
    if (!window.sariDB) return;
    try {
      const count = await window.sariDB.count('syncQueue');
      const countBadge = document.getElementById('sari-sync-count');
      const syncBtn = document.getElementById('sari-sync-btn');
      
      if (countBadge) {
        countBadge.textContent = count > 0 ? count : '';
        countBadge.classList.toggle('hidden', count === 0);
      }
      if (syncBtn) {
        syncBtn.classList.toggle('opacity-50', count === 0);
      }
    } catch (e) {
      // ignore
    }
  }
}

const syncController = new SyncController();
if (typeof window !== 'undefined') {
  window.syncController = syncController;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SyncController, syncController };
}
