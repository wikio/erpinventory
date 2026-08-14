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

  async enqueueExternalOnly(storeName, action, payload) {
    if(!window.sariDB||['syncQueue','recordSequences'].includes(storeName))return;
    const item={id:`sync-ext-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,storeName,action,payload,externalOnly:true,createdAt:new Date().toISOString(),status:'pending'};await window.sariDB.save('syncQueue',item);await this.updateSyncBadge();if(this.getOnlineStatus())setTimeout(()=>this.processSyncQueue(),100);
  }

  async enqueueMutation(storeName, action, payload) {
    const before = payload?.id && window.sariDB ? await window.sariDB.getById(storeName,payload.id) : null;
    const after = action === 'save' ? payload : null;
    const keys = [...new Set([...Object.keys(before||{}),...Object.keys(after||{})])].filter(key=>!['data','photo','logo'].includes(key));
    const changes = keys.filter(key=>JSON.stringify(before?.[key])!==JSON.stringify(after?.[key])).map(key=>({field:key,before:before?.[key],after:after?.[key]}));
    if(window.sariDB && window.auth?.currentUser && !['auditLogs','syncQueue'].includes(storeName)) await window.sariDB.save('auditLogs',{id:`audit-${crypto.randomUUID()}`,user:window.auth.currentUser.name,role:window.auth.currentRole,actingUserId:window.auth.currentUser.id,action:action==='delete'?'DELETE_RECORD':before?'UPDATE_RECORD':'CREATE_RECORD',module:storeName,affectedRecordId:payload?.id||'',recordType:storeName,changes,beforeSummary:before?JSON.stringify(before).slice(0,500):'',afterSummary:after?JSON.stringify(after).slice(0,500):'',description:`${action} ${storeName} ${payload?.id||''} • ${changes.length} champ(s) modifié(s)`,timestamp:new Date().toISOString()});

    // Apply the mutation to local IndexedDB immediately so list views refresh right after a save
    // (without a page reload); the queue entry below still drives the external DB migration / offline replay.
    let appliedPayload = payload;
    if (typeof window !== 'undefined' && window.sariDB && !['auditLogs','syncQueue','recordSequences'].includes(storeName)) {
      this.suppressBridge = true;
      try {
        if (action === 'save') appliedPayload = await window.sariDB.save(storeName, payload);
        else if (action === 'delete') await window.sariDB.delete(storeName, payload.id);
      } finally {
        this.suppressBridge = false;
      }
    }

    const item = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      storeName,
      action, // 'save' | 'delete'
      payload: appliedPayload,
      numericId: before?.numericId ?? appliedPayload?.numericId,
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
          if(item.externalOnly){
            const endpoint=item.action==='delete'?'/api/db/delete-record':'/api/db/migrate-batch',body=item.action==='delete'?{storeName:item.storeName,numericId:item.payload.numericId}:{storeName:item.storeName,records:[item.payload]};const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw Error((await response.json()).error||'External sync failed');
          } else if (item.action === 'save') {
            this.suppressBridge=true;try{await window.sariDB.save(item.storeName,item.payload);}finally{this.suppressBridge=false;}
            if(window.dbAdapter?.currentDriver!=='indexeddb'&&window.dbAdapter?.driverConfig?.serverManaged){const response=await fetch('/api/db/migrate-batch',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({storeName:item.storeName,records:[item.payload]})});if(!response.ok)throw Error((await response.json()).error||'External sync failed');}
          } else if (item.action === 'delete') {
            const existing=await window.sariDB.getById(item.storeName,item.payload.id);
            const numericId=item.numericId ?? existing?.numericId;
            if(numericId&&window.dbAdapter?.currentDriver!=='indexeddb'&&window.dbAdapter?.driverConfig?.serverManaged){const response=await fetch('/api/db/delete-record',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({storeName:item.storeName,numericId})});if(!response.ok)throw Error((await response.json()).error||'External delete failed');}
            this.suppressBridge=true;try{await window.sariDB.delete(item.storeName,item.payload.id);}finally{this.suppressBridge=false;}
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
