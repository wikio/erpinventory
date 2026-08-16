import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const source=(file:string)=>readFileSync(join(process.cwd(),file),'utf8');

describe('sections 289–290 integration contracts',()=>{
  it('keeps SMTP on a standalone Settings route instead of the User Accounts module',()=>{
    const users=source('js/modules/users.js'),smtp=source('js/modules/smtp.js'),settings=source('js/modules/settings.js'),loader=source('src/module-loader.ts');
    expect(smtp).toContain("fetch('/api/admin/smtp'");
    expect(users).not.toContain("fetch('/api/admin/smtp'");
    expect(users).not.toContain('smtpHtml');
    expect(settings).toContain("app.navigate('smtp')");
    expect(loader).toContain("'SMTPModule'");
    const icons=source('src/icon-set.ts');for(const icon of ['Mail','MailCheck','MailX'])expect(icons).toContain(`  ${icon},`);
    expect(smtp).not.toContain('data-lucide="mail-cog"');
  });

  it('exposes localized template CRUD, secure placeholders, send actions and per-user history',()=>{
    const users=source('js/modules/users.js'),server=source('server.js');
    for(const placeholder of ['{qr_password_link}','{qr_activation_link}','{name}','{email}','{message}'])expect(users).toContain(placeholder);
    expect(users).toContain('advancedHtml');
    expect(users).toContain('templatesHtml()');
    expect(users).toContain('emailHistoryHtml');
    expect(server).toContain("/api/admin/email-templates");
    expect(server).toContain("action==='send-email'");
    expect(server).toContain("action==='email-history'");
    expect(source('smtp-service.js')).toContain('attachDataUrls');
  });

  it('ships all new feature labels in FR, AR and EN',()=>{
    const required=['emailTemplateManager','sendEmail','passwordReset','accountActivation','customMessage','sendHistory','htmlSource','insertPlaceholder','smtpStandaloneHelp','arabicEmailFont','frenchEmailFont','qrEmbeddingMode'];
    for(const lang of ['fr','ar','en']){const pack=JSON.parse(source(`content/translations/${lang}.json`));for(const key of required)expect(pack[key],`${lang}:${key}`).toBeTruthy();}
  });
});
