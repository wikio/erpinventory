/** Financial document authenticity hashes and verification URLs. */
const DocumentSecurity = {
  async hash(referenceCode) { return SariUtils.verificationHash(referenceCode); },
  async sign(document) { document.verificationHash = await this.hash(document.referenceCode); document.verificationUrl = await this.url(document.referenceCode, document.verificationHash); return document; },
  async url(referenceCode, hash='') { const [settings,labelSettings]=await Promise.all([sariDB.getById('settings','app-settings'),sariDB.getById('barcodeLabelSettings','default')]),verificationHash=hash||await this.hash(referenceCode),pattern=labelSettings?.qrPattern||settings?.verificationBaseUrl||'http://sarisysteme.com/verification/{code}/{hash}';return SariUtils.buildVerificationUrl(pattern,{code:referenceCode,referenceCode,hash:verificationHash}); },
  async verify(referenceCode, hash) { return (await this.hash(referenceCode)) === String(hash||'').toUpperCase(); }
};
window.DocumentSecurity=DocumentSecurity;

export {};
