import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const source = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('sections 315–322 employee leave and HR documents', () => {
  it('enforces pending versus approved leave actions with icons and linked approval requests', () => {
    const portal = source('js/modules/portal.js');
    for (const action of ['viewLeave', 'openLeaveEditor', 'deleteLeave', 'openLeaveChange']) expect(portal).toContain(action);
    for (const icon of ['eye', 'pencil', 'trash-2', 'calendar-sync', 'file-pen-line', 'calendar-x-2']) expect(portal).toContain(`data-lucide=\"${icon}\"`);
    expect(portal).toContain("parentRequestId: parent.id");
    expect(portal).toContain("changeReason");
    expect(portal).toContain("status: 'submitted'");
    expect(source('js/modules/leaves.js')).toContain('parent.supersededBy = record.id');
  });

  it('captures both canvas signatures and archives the final paginated contract PDF in GED', () => {
    const contracts = source('js/modules/contracts.js');
    const portal = source('js/modules/portal.js');
    const signature = source('js/signature-pad.js');
    expect(signature).toContain("canvas.toDataURL('image/png')");
    expect(contracts).toContain('companySignature');
    expect(portal).toContain('employeeSignature');
    expect(contracts).toContain('archiveSignedContract');
    expect(contracts).toContain("mimeType: 'application/pdf'");
    expect(contracts).toContain("{ recordType: 'employee', recordId: contract.employeeId }");
    expect(source('js/utils.js')).toContain('Page ${page}/${totalPages}');
  });

  it('renders the complete Algerian-style contract with parties, articles and reusable position tasks', () => {
    const contracts = source('js/modules/contracts.js');
    expect(contracts).toContain('loi n° 90-11 du 21 avril 1990');
    expect(contracts).toContain('ENTRE LES SOUSSIGNÉS');
    expect(contracts).toContain('Article 7 — Obligations de l’Entreprise');
    expect(contracts).toContain('Article 8 — Obligations du Salarié');
    expect(contracts).toContain('positionFunctions');
    expect(contracts).toContain('document-print-header');
    expect(contracts).toContain('document-print-footer');
  });

  it('provides work-certificate CRUD, templates, employee requests and manager canvas signing', () => {
    const db = source('js/db.js');
    const contracts = source('js/modules/contracts.js');
    const portal = source('js/modules/portal.js');
    for (const store of ['positionFunctions', 'workCertificates', 'certificateTemplates']) expect(db).toContain(`'${store}'`);
    for (const method of ['editCertificate(', 'deleteCertificate(', 'editCertificateTemplate(', 'deleteCertificateTemplate(', 'signCertificate(']) expect(contracts).toContain(method);
    expect(portal).toContain('requestCertificate()');
    expect(contracts).toContain('certificateAutoGeneration');
    expect(contracts).toContain('includeSalary');
    expect(contracts).toContain('includeFunctions');
  });

  it('pins the visual calendar to Sunday through Saturday regardless of working-day configuration', () => {
    const leaves = source('js/modules/leaves.js');
    expect(leaves).toContain('const dayOrder = [0, 1, 2, 3, 4, 5, 6]');
    expect(leaves).toContain('Friday/Saturday are therefore adjacent');
  });
});
