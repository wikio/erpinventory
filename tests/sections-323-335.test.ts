import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const source=(file:string)=>readFileSync(join(process.cwd(),file),'utf8');

describe('sections 323–335 HR configuration, access and documents',()=>{
  it('lists and manages all rules/terms versions with one active version',()=>{
    const contracts=source('js/modules/contracts.js');
    for(const method of ['openRuleVersionEditor','saveRuleVersion','activateRuleVersion','deleteRuleVersion'])expect(contracts).toContain(method);
    expect(contracts).toContain('Historique de toutes les versions');
    expect(contracts).toContain('isActive');
    expect(contracts).toContain("RichTextEditor.advancedHtml('rule-edit-content-fr'");
    expect(contracts).toContain("Version règlement");
  });
  it('provides contract, conflict declaration and job position template CRUD',()=>{
    const contracts=source('js/modules/contracts.js'),db=source('js/db.js');
    for(const store of ['contractTemplates','conflictDeclarationTemplates','jobPositions'])expect(db).toContain(`'${store}'`);
    for(const method of ['editContractTemplate','deleteContractTemplate','editDeclarationTemplate','deleteDeclarationTemplate','editJobPosition','deleteJobPosition'])expect(contracts).toContain(method);
    expect(source('js/hr-template-editors.js')).toContain("['text','checkbox','radio','textarea','html']");
    expect(contracts).toContain('positionDepartment');
    expect(contracts).toContain('positionStatus');
    expect(contracts).toContain('templateCommitments');
  });
  it('scopes leave and payslip pages for non-admin users',()=>{
    const leave=source('js/modules/leaves.js'),payslips=source('js/modules/payslips.js');
    expect(leave).toContain("auth.currentRole === 'admin'");
    expect(leave).toContain("['requests', 'calendar'].includes(tab)");
    expect(leave).toContain('Mes demandes uniquement');
    expect(leave).toContain("record.employeeId === ownEmployee.id");
    expect(payslips).toContain("auth.currentRole==='admin'");
    expect(payslips).toContain("record.employeeId===own.id");
    expect(payslips).toContain('Mes fiches uniquement');
    expect(payslips).toContain("this.state.tab='payslips'");
  });
  it('fixes payment-type grouping and adds consultation-style payslip template',()=>{
    expect(source('js/modules/leaves.js')).toContain('id="payment-types-list"');
    const db=source('js/db.js');
    expect(db).toContain('doc-tpl-payslip-consultation');
    expect(db).toContain('Style consultation');
    expect(db).toContain('payslip-consultation-print');
  });
  it('organizes portal submenus and certificate consultation actions',()=>{
    const portal=source('js/modules/portal.js');
    expect(portal).toContain('portalMenuHtml');
    for(const tab of ["'profile'","'leaves'","'contracts'","'documents'","'messages'"])expect(portal).toContain(tab);
    expect(portal).toContain('printCertificate');
    expect(portal).toContain('DocumentManager.download');
  });
  it('adds authenticity QR to every generated HR document and safe contract pagination',()=>{
    const contracts=source('js/modules/contracts.js'),payslips=source('js/modules/payslips.js'),utils=source('js/utils.js');
    expect(contracts.match(/authenticityQr\(/g)?.length).toBeGreaterThanOrEqual(3);
    expect(payslips).toContain('authenticityQR');
    expect(payslips).toContain('qrImageDataUrl');
    expect(utils).toContain('returnBlob=false');
    expect(utils).toContain('firstCapacity=pageH-topMargin-bottomMargin-headerH-footerH');
    expect(utils).toContain('Page ${page}/${totalPages}');
    expect(contracts).toContain("printContract(id,mode='download')");
  });
});
