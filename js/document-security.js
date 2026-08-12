/** Financial document authenticity hashes and verification URLs. */
const DocumentSecurity = {
  async hash(referenceCode) {
    const settings = await sariDB.getById('settings','app-settings') || {};
    const secret = settings.verificationSecret || 'SARI-CHANGE-ME';
    const payload = `${secret}:${referenceCode}`;
    if (globalThis.crypto?.subtle) {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
      return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2,'0')).join('').slice(0,24).toUpperCase();
    }
    let hash=2166136261;for(const char of payload){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return Math.abs(hash>>>0).toString(16).padStart(8,'0').toUpperCase();
  },
  async sign(document) { document.verificationHash = await this.hash(document.referenceCode); document.verificationUrl = await this.url(document.referenceCode, document.verificationHash); return document; },
  async url(referenceCode, hash='') { const settings=await sariDB.getById('settings','app-settings')||{};const base=String(settings.verificationBaseUrl||'https://verify.sari-systeme.dz').replace(/\/$/,'');return `${base}/${encodeURIComponent(referenceCode)}/${hash||await this.hash(referenceCode)}`; },
  async verify(referenceCode, hash) { return (await this.hash(referenceCode)) === String(hash||'').toUpperCase(); }
};
window.DocumentSecurity=DocumentSecurity;
