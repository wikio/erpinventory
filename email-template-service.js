'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TYPES = new Set(['password_reset', 'activation', 'custom']);
const LANGUAGES = ['fr', 'ar', 'en'];

function localized(fr, ar, en) { return { fr, ar, en }; }
function sanitizeHtml(html = '') {
  let safe = String(html);
  safe = safe.replace(/<(script|style|iframe|object|embed|form|link|meta)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  safe = safe.replace(/<(script|style|iframe|object|embed|form|link|meta)\b[^>]*\/?>/gi, '');
  safe = safe.replace(/\s(on\w+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  safe = safe.replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
  safe = safe.replace(/\s(href|src)\s*=\s*(["'])\s*data:text\/html[\s\S]*?\2/gi, ' $1="#"');
  return safe;
}
function cleanText(value = '', max = 240) { return String(value).replace(/[<>\r\n]/g, ' ').trim().slice(0, max); }
function normalizeLocalized(value, fallback = '') {
  if (typeof value === 'string') return localized(value, value, value);
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(LANGUAGES.map(lang => [lang, String(source[lang] ?? source.fr ?? fallback)]));
}

class EmailTemplateService {
  constructor(root) {
    this.file = path.join(root, '.runtime', 'email-templates.json');
    this.data = this.load();
  }
  defaults() {
    return {
      version: 1,
      templates: [
        {
          id: 'email-template-password-reset', type: 'password_reset', isDefault: true,
          name: localized('Réinitialisation du mot de passe', 'إعادة تعيين كلمة المرور', 'Password Reset'),
          subject: localized('Réinitialisation de votre mot de passe SARI', 'إعادة تعيين كلمة مرور SARI', 'Reset your SARI password'),
          html: localized(
            '<div style="font-family:Arial,sans-serif;color:#0f172a"><h1 style="color:#009CC5">Réinitialisation du mot de passe</h1><p>Bonjour {name},</p><p>Utilisez le lien sécurisé ci-dessous pour définir un nouveau mot de passe.</p>{qr_password_link}<p style="color:#64748b;font-size:12px">Ce lien est personnel et expire dans 24 heures.</p></div>',
            '<div dir="rtl" style="font-family:Arial,sans-serif;color:#0f172a"><h1 style="color:#009CC5">إعادة تعيين كلمة المرور</h1><p>مرحباً {name}،</p><p>استخدم الرابط الآمن أدناه لتعيين كلمة مرور جديدة.</p>{qr_password_link}<p style="color:#64748b;font-size:12px">هذا الرابط شخصي وتنتهي صلاحيته خلال 24 ساعة.</p></div>',
            '<div style="font-family:Arial,sans-serif;color:#0f172a"><h1 style="color:#009CC5">Password reset</h1><p>Hello {name},</p><p>Use the secure link below to set a new password.</p>{qr_password_link}<p style="color:#64748b;font-size:12px">This link is personal and expires in 24 hours.</p></div>'
          ), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        },
        {
          id: 'email-template-activation', type: 'activation', isDefault: true,
          name: localized('Activation du compte', 'تفعيل الحساب', 'Account Activation'),
          subject: localized('Activez votre compte SARI', 'فعّل حساب SARI الخاص بك', 'Activate your SARI account'),
          html: localized(
            '<div style="font-family:Arial,sans-serif;color:#0f172a"><h1 style="color:#009CC5">Activation du compte</h1><p>Bonjour {name},</p><p>Votre compte SARI est prêt. Activez-le avec le lien sécurisé ci-dessous.</p>{qr_activation_link}<p>Adresse associée : <strong>{email}</strong></p></div>',
            '<div dir="rtl" style="font-family:Arial,sans-serif;color:#0f172a"><h1 style="color:#009CC5">تفعيل الحساب</h1><p>مرحباً {name}،</p><p>حساب SARI الخاص بك جاهز. فعّله باستخدام الرابط الآمن أدناه.</p>{qr_activation_link}<p>البريد المرتبط: <strong>{email}</strong></p></div>',
            '<div style="font-family:Arial,sans-serif;color:#0f172a"><h1 style="color:#009CC5">Account activation</h1><p>Hello {name},</p><p>Your SARI account is ready. Activate it with the secure link below.</p>{qr_activation_link}<p>Associated address: <strong>{email}</strong></p></div>'
          ), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        },
        {
          id: 'email-template-custom', type: 'custom', isDefault: true,
          name: localized('Message personnalisé', 'رسالة مخصصة', 'Custom Message'),
          subject: localized('Message de SARI Système', 'رسالة من نظام SARI', 'Message from SARI System'),
          html: localized(
            '<div style="font-family:Arial,sans-serif;color:#0f172a"><h1 style="color:#009CC5">SARI Système</h1><p>Bonjour {name},</p>{message}<p style="color:#64748b;font-size:12px">Ce message a été envoyé à {email}.</p></div>',
            '<div dir="rtl" style="font-family:Arial,sans-serif;color:#0f172a"><h1 style="color:#009CC5">نظام SARI</h1><p>مرحباً {name}،</p>{message}<p style="color:#64748b;font-size:12px">أُرسلت هذه الرسالة إلى {email}.</p></div>',
            '<div style="font-family:Arial,sans-serif;color:#0f172a"><h1 style="color:#009CC5">SARI System</h1><p>Hello {name},</p>{message}<p style="color:#64748b;font-size:12px">This message was sent to {email}.</p></div>'
          ), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        }
      ],
      history: []
    };
  }
  load() {
    try {
      const stored = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (!Array.isArray(stored.templates) || !Array.isArray(stored.history)) throw Error('Invalid email template store');
      return stored;
    } catch (_) {
      const value = this.defaults(); this.persist(value); return value;
    }
  }
  persist(value = this.data) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const temporary = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
    fs.renameSync(temporary, this.file);
    try { fs.chmodSync(this.file, 0o600); } catch (_) {}
    this.data = value;
  }
  normalize(input = {}, existing = {}) {
    const type = TYPES.has(input.type) ? input.type : existing.type;
    if (!type) throw Error('Invalid email template type');
    const name = normalizeLocalized(input.name ?? existing.name, 'Message SARI');
    const subject = normalizeLocalized(input.subject ?? existing.subject, 'SARI Système');
    const html = normalizeLocalized(input.html ?? existing.html, '<p>{message}</p>');
    for (const lang of LANGUAGES) {
      name[lang] = cleanText(name[lang], 120);
      subject[lang] = cleanText(subject[lang], 180);
      html[lang] = sanitizeHtml(html[lang]);
      if (!name[lang] || !subject[lang] || !html[lang]) throw Error(`Missing ${lang} email template content`);
    }
    return { ...existing, type, name, subject, html, isDefault: Boolean(input.isDefault ?? existing.isDefault), updatedAt: new Date().toISOString() };
  }
  list() { return this.data.templates.map(template => structuredClone(template)); }
  find(id) { return this.data.templates.find(template => template.id === id); }
  create(input) {
    const template = this.normalize(input, { id: `email-template-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), isDefault: false });
    this.data.templates.push(template); this.persist(); return structuredClone(template);
  }
  update(id, input) {
    const index = this.data.templates.findIndex(template => template.id === id);
    if (index < 0) throw Error('Email template not found');
    this.data.templates[index] = this.normalize(input, this.data.templates[index]);
    this.persist(); return structuredClone(this.data.templates[index]);
  }
  delete(id) {
    const template = this.find(id); if (!template) throw Error('Email template not found');
    this.data.templates = this.data.templates.filter(item => item.id !== id);
    this.persist(); return { deleted: true, id };
  }
  localized(template, language = 'fr') {
    const lang = LANGUAGES.includes(language) ? language : 'fr';
    return { ...structuredClone(template), localizedName: template.name[lang] || template.name.fr, localizedSubject: template.subject[lang] || template.subject.fr, localizedHtml: template.html[lang] || template.html.fr };
  }
  record(entry) {
    const row = { id: `email-history-${crypto.randomUUID()}`, ...entry, sentAt: entry.sentAt || new Date().toISOString() };
    this.data.history.push(row);
    if (this.data.history.length > 10000) this.data.history = this.data.history.slice(-10000);
    this.persist(); return structuredClone(row);
  }
  history(userId) { return this.data.history.filter(entry => entry.userId === userId).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt)).map(entry => structuredClone(entry)); }
}

module.exports = { EmailTemplateService, sanitizeHtml, normalizeLocalized, TYPES, LANGUAGES };
