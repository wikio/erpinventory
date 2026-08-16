'use strict';

const fs = require('fs');
const path = require('path');

const FONT_OPTIONS = {
  arabic: [
    { value: 'ibm-plex-sans-arabic', label: 'IBM Plex Sans Arabic', family: 'SARI Arabic', fallback: 'Tahoma, Arial, sans-serif', file: 'ibm-plex-sans-arabic-arabic-400-normal.woff2' },
    { value: 'tahoma', label: 'Tahoma', family: 'Tahoma', fallback: 'Arial, sans-serif' },
    { value: 'arial', label: 'Arial', family: 'Arial', fallback: 'sans-serif' }
  ],
  french: [
    { value: 'plus-jakarta-sans', label: 'Plus Jakarta Sans', family: 'SARI Latin', fallback: 'Arial, sans-serif', file: 'plus-jakarta-sans-latin-wght-normal.woff2' },
    { value: 'arial', label: 'Arial', family: 'Arial', fallback: 'sans-serif' },
    { value: 'georgia', label: 'Georgia', family: 'Georgia', fallback: 'serif' }
  ]
};

class SmtpService {
  constructor(root) {
    this.root = root;
    this.file = path.join(root, '.runtime', 'smtp.json');
    this.fontDirectory = path.join(root, 'public', 'assets', 'fonts');
    this.sessionPassword = '';
    this.fontCache = new Map();
    this.config = this.load();
  }
  defaults() {
    return {
      host: '', port: 587, username: '', security: 'starttls', senderName: 'SARI Système',
      senderAddress: '', enabled: false, rejectUnauthorized: true,
      arabicFont: 'ibm-plex-sans-arabic', frenchFont: 'plus-jakarta-sans',
      qrEmbeddingMode: 'inline_attachment'
    };
  }
  load() {
    try { const value=JSON.parse(fs.readFileSync(this.file,'utf8'));delete value.password;return{...this.defaults(),...value}; }
    catch (_) { return this.defaults(); }
  }
  public() {
    const { password, ...safe } = this.config;
    return {
      ...safe,
      hasPassword: Boolean(this.sessionPassword || process.env.SARI_SMTP_PASSWORD),
      fontOptions: {
        arabic: FONT_OPTIONS.arabic.map(({ value, label }) => ({ value, label })),
        french: FONT_OPTIONS.french.map(({ value, label }) => ({ value, label }))
      }
    };
  }
  save(input = {}) {
    if (input.password) this.sessionPassword = input.password;
    const { password, fontOptions, ...safe } = input;
    if (safe.arabicFont && !FONT_OPTIONS.arabic.some(font => font.value === safe.arabicFont)) delete safe.arabicFont;
    if (safe.frenchFont && !FONT_OPTIONS.french.some(font => font.value === safe.frenchFont)) delete safe.frenchFont;
    if (safe.qrEmbeddingMode && !['inline_attachment','data_uri'].includes(safe.qrEmbeddingMode)) delete safe.qrEmbeddingMode;
    this.config = { ...this.config, ...safe, updatedAt: new Date().toISOString() };
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.config, null, 2), { mode: 0o600 });
    try { fs.chmodSync(this.file, 0o600); } catch (_) {}
    return this.public();
  }
  fontOption(language = 'fr') {
    const group = language === 'ar' ? 'arabic' : 'french';
    const selected = language === 'ar' ? this.config.arabicFont : this.config.frenchFont;
    return FONT_OPTIONS[group].find(font => font.value === selected) || FONT_OPTIONS[group][0];
  }
  embeddedFont(font) {
    if (!font.file) return '';
    if (this.fontCache.has(font.file)) return this.fontCache.get(font.file);
    try {
      const encoded = fs.readFileSync(path.join(this.fontDirectory, font.file)).toString('base64');
      this.fontCache.set(font.file, encoded);
      return encoded;
    } catch (_) { return ''; }
  }
  prepareMessage(html = '', language = 'fr') {
    const font = this.fontOption(language), encoded = this.embeddedFont(font), direction = language === 'ar' ? 'rtl' : 'ltr';
    const family = `'${font.family}', ${font.fallback}`;
    const fontFace = encoded ? `@font-face{font-family:'${font.family}';src:url(data:font/woff2;base64,${encoded}) format('woff2');font-weight:100 900;font-style:normal;font-display:swap}` : '';
    const typography = `<style>${fontFace}html,body,.sari-email-content,.sari-email-content *{font-family:${family}!important}.sari-email-content{direction:${direction};text-align:${direction==='rtl'?'right':'left'};line-height:1.65}</style>`;
    return {
      html: `<!doctype html><html lang="${language}" dir="${direction}"><head><meta charset="utf-8">${typography}</head><body><div class="sari-email-content" dir="${direction}">${String(html||'')}</div></body></html>`,
      attachDataUrls: this.config.qrEmbeddingMode !== 'data_uri',
      font: font.value,
      direction
    };
  }
  smtpPassword() { return process.env.SARI_SMTP_PASSWORD || this.sessionPassword || ''; }
  credentialsError() { const error=new Error('SMTP credentials are missing. Enter the SMTP password again or define SARI_SMTP_PASSWORD, then retry.');error.code='SMTP_CREDENTIALS_MISSING';return error; }
  async send({ to, subject, text, html, language = 'fr' }) {
    if (!this.config.enabled) { const error=new Error('SMTP is disabled');error.code='SMTP_DISABLED';throw error; }
    const password=this.smtpPassword();
    if(this.config.username&&!password)throw this.credentialsError();
    const nodemailer = require('nodemailer'), security = this.config.security || 'starttls';
    const transport = nodemailer.createTransport({
      host: this.config.host, port: Number(this.config.port || 587), secure: security === 'ssl',
      requireTLS: security === 'starttls',
      auth: this.config.username ? { user: this.config.username, pass: password } : undefined,
      tls: { rejectUnauthorized: this.config.rejectUnauthorized !== false },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
    });
    const prepared = this.prepareMessage(html, language);
    let info;
    try {
      info = await transport.sendMail({
        from: { name: this.config.senderName || 'SARI Système', address: this.config.senderAddress || this.config.username },
        to, subject, text, html: prepared.html, attachDataUrls: prepared.attachDataUrls
      });
    } catch (error) {
      if (/missing credentials/i.test(error.message||'')) throw this.credentialsError();
      if (error.code==='EAUTH' || Number(error.responseCode)===535) { error.code='SMTP_AUTH_FAILED';error.message='SMTP authentication failed. Check the username, password, application password, and authentication policy.'; }
      throw error;
    }
    return { messageId: info.messageId, accepted: info.accepted, qrEmbeddingMode: prepared.attachDataUrls ? 'inline_attachment' : 'data_uri', font: prepared.font };
  }
  async test() { return this.send({ to:this.config.senderAddress||this.config.username,subject:'Test SMTP SARI Système',text:'Configuration SMTP validée.',html:'<p>Configuration SMTP validée.</p>',language:'fr' }); }
}

module.exports = { SmtpService, FONT_OPTIONS };
