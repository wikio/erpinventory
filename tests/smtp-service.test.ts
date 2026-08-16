import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);const{SmtpService}=require('../smtp-service.js');
const roots:string[]=[];
function createRoot(){const root=mkdtempSync(join(tmpdir(),'sari-smtp-'));roots.push(root);const fonts=join(root,'public','assets','fonts');mkdirSync(fonts,{recursive:true});for(const file of ['plus-jakarta-sans-latin-wght-normal.woff2','ibm-plex-sans-arabic-arabic-400-normal.woff2'])cpSync(join(process.cwd(),'public','assets','fonts',file),join(fonts,file));return root;}
afterEach(()=>roots.splice(0).forEach(root=>rmSync(root,{recursive:true,force:true})));

describe('SMTP secret, QR and font handling',()=>{
  it('persists SMTP metadata without writing the password',()=>{const root=createRoot(),service=new SmtpService(root);service.save({host:'smtp.example.test',username:'sari',password:'TopSecret!',enabled:true,arabicFont:'ibm-plex-sans-arabic',frenchFont:'plus-jakarta-sans'});const raw=readFileSync(join(root,'.runtime','smtp.json'),'utf8');expect(raw).not.toContain('TopSecret!');expect(service.public()).toMatchObject({host:'smtp.example.test',hasPassword:true,arabicFont:'ibm-plex-sans-arabic',frenchFont:'plus-jakarta-sans'});expect(service.public()).not.toHaveProperty('password');});

  it('embeds self-hosted Arabic and French fonts as base64 WOFF2 data',()=>{const service=new SmtpService(createRoot()),arabic=service.prepareMessage('<p>مرحبا</p>','ar'),french=service.prepareMessage('<p>Bonjour à tous</p>','fr');expect(arabic.html).toContain('dir="rtl"');expect(arabic.html).toContain("font-family:'SARI Arabic'");expect(arabic.html).toMatch(/data:font\/woff2;base64,[A-Za-z0-9+/=]+/);expect(french.html).toContain("font-family:'SARI Latin'");expect(french.html).toContain('Bonjour à tous');});

  it('keeps QR PNG data URIs embedded and enables inline CID conversion by default',()=>{const service=new SmtpService(createRoot()),png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',prepared=service.prepareMessage(`<img src="${png}" alt="QR">`,'fr');expect(prepared.html).toContain(`src="${png}"`);expect(prepared.attachDataUrls).toBe(true);service.save({qrEmbeddingMode:'data_uri'});expect(service.prepareMessage(`<img src="${png}">`,'fr').attachDataUrls).toBe(false);});

  it('returns an actionable code when AUTH PLAIN has no password in server memory',async()=>{const service=new SmtpService(createRoot());service.save({host:'smtp.example.test',username:'sari',enabled:true});await expect(service.send({to:'test@example.test',subject:'Test',text:'Test',html:'<p>Test</p>'})).rejects.toMatchObject({code:'SMTP_CREDENTIALS_MISSING'});});
});
