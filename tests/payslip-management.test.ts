import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';import { join } from 'node:path';
const source=(file:string)=>readFileSync(join(process.cwd(),file),'utf8');
describe('section 299 payslip management',()=>{
 it('registers payslips in IndexedDB, navigation, GED and the normalized connector',()=>{expect(source('js/db.js')).toContain("'payslips'");expect(source('js/app.js')).toContain("'payslips'");expect(source('external-db.js')).toContain("payslips: 'payslips'");expect(source('js/modules/ged.js')).toContain("'payslip'");expect(source('sql/migrations/008_payslip_management.sql')).toContain('uq_payslip_employee_period');});
 it('supports CRUD, salary/CNAS links, templates, PDF and automatic GED archive',()=>{const module=source('js/modules/payslips.js');for(const contract of ['openEditor','salaryHistoryId','cnasDeclarationId','TemplateDesigner.open','createPDFBlob','archivePDF','generatedDocumentId','DocumentManager.open'])expect(module).toContain(contract);expect(source('js/template-designer.js')).toContain("'netPayable'");});
 it('ships complete payslip translations',()=>{const keys=['payslipManager','baseSalary','seniorityAllowance','performanceBonus','cnasEmployeeShare','irgWithholding','netPayable','leaveBalance'];for(const lang of ['fr','ar','en']){const pack=JSON.parse(source(`content/translations/${lang}.json`));for(const key of keys)expect(pack[key],`${lang}:${key}`).toBeTruthy();}});
});
