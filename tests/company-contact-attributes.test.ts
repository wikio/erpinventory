import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';import {join} from 'node:path';
const source=(file:string)=>readFileSync(join(process.cwd(),file),'utf8');
describe('company free-text contacts and template attributes',()=>{
  it('keeps multiple phone numbers as unvalidated free text',()=>{const settings=source('js/modules/settings.js'),validation=source('js/validation.js');expect(settings).toContain('data-multi-value-text="true"');expect(settings).toContain('multiplePhonesHelp');expect(validation).toContain("field.dataset.multiValueText!=='true'");});
  it('stores all requested company contact channels',()=>{const settings=source('js/modules/settings.js');for(const field of ['mobile','fax','whatsapp','website','linkedin','facebook','youtube']){expect(settings).toContain(`id=\"cfg-${field}\"`);expect(settings).toContain(`${field}: document.getElementById('cfg-${field}')`);}});
  it('exposes contact channels as HTML/template attributes',()=>{const engine=source('js/template-engine.js'),editor=source('js/hr-template-editors.js'),contracts=source('js/modules/contracts.js'),payslips=source('js/modules/payslips.js');for(const field of ['phone','mobile','fax','email','website','whatsapp','linkedin','facebook','youtube']){expect(engine).toContain(`'company.${field}'`);expect(editor).toContain(`{{company.${field}}}`);expect(contracts).toContain(`{{company.${field}}}`);expect(payslips).toContain(`'company.${field}'`);}});
  it('ships translated contact labels and help',()=>{for(const lang of ['fr','en','ar']){const pack=JSON.parse(source(`content/translations/${lang}.json`));for(const key of ['mobile','fax','website','multiplePhonesHelp'])expect(pack[key]).toBeTruthy();}});
});
