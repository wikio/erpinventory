import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { EmailTemplateService, sanitizeHtml } = require('../email-template-service.js');
const roots: string[] = [];
const root = () => { const value=mkdtempSync(join(tmpdir(),'sari-email-template-'));roots.push(value);return value; };
afterEach(() => roots.splice(0).forEach(value => rmSync(value,{recursive:true,force:true})));

describe('localized account email templates', () => {
  it('provides reset, activation and custom HTML templates with required placeholders', () => {
    const service = new EmailTemplateService(root());
    const templates = service.list();
    expect(templates.map((template: any) => template.type).sort()).toEqual(['activation','custom','password_reset']);
    expect(templates.find((template: any) => template.type === 'password_reset').html.fr).toContain('{qr_password_link}');
    expect(templates.find((template: any) => template.type === 'activation').html.ar).toContain('{qr_activation_link}');
    expect(templates.find((template: any) => template.type === 'custom').html.en).toContain('{message}');
    for (const template of templates) expect(Object.keys(template.name).sort()).toEqual(['ar','en','fr']);
  });

  it('supports CRUD while sanitizing unsafe HTML in every localized version', () => {
    const service = new EmailTemplateService(root());
    const localized = { fr:'Relance', ar:'تذكير', en:'Reminder' };
    const created = service.create({ type:'custom', name:localized, subject:localized, html:{fr:'<p onclick="bad()">{message}</p><script>bad()</script>',ar:'<p>{message}</p>',en:'<p>{message}</p>'} });
    expect(created.html.fr).toBe('<p>{message}</p>');
    expect(sanitizeHtml('<img src="javascript:bad()">')).not.toContain('javascript:');
    const updated = service.update(created.id,{...created,name:{...created.name,en:'Custom Reminder'}});
    expect(updated.name.en).toBe('Custom Reminder');
    expect(service.delete(created.id)).toEqual({deleted:true,id:created.id});
    expect(service.find(created.id)).toBeUndefined();
  });

  it('persists per-user sent and failed history without message bodies or raw links', () => {
    const directory=root(),service=new EmailTemplateService(directory);
    service.record({userId:'usr-1',type:'activation',status:'sent',templateId:'email-template-activation',subject:'Activate'});
    service.record({userId:'usr-1',type:'custom',status:'failed',templateId:'email-template-custom',subject:'Message',error:'SMTP disabled'});
    expect(service.history('usr-1').map((entry: any) => entry.status).sort()).toEqual(['failed','sent']);
    const raw=readFileSync(join(directory,'.runtime','email-templates.json'),'utf8');
    expect(raw).not.toContain('?activation=');
    expect(raw).not.toContain('messageHtml');
  });
});
