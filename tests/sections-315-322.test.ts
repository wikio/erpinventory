import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canEmployeeEditLeave, applyLeaveAmendment, weekColumnOrder, defaultSchedule, computeOnboarding } from '../src/core/leave';
import { contractArticles, renderContractDocument, renderWorkCertificate, signatureBlockHtml, signedDateTime } from '../src/core/contracts';

const source = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('section 315 — leave request lifecycle & amendments', () => {
  it('allows direct edit/delete only while the request is not approved', () => {
    expect(canEmployeeEditLeave({ employeeId: 'e1', startDate: '2026-09-01', endDate: '2026-09-02', status: 'submitted' })).toBe(true);
    expect(canEmployeeEditLeave({ employeeId: 'e1', startDate: '2026-09-01', endDate: '2026-09-02', status: 'approved' })).toBe(false);
    expect(canEmployeeEditLeave({ employeeId: 'e1', startDate: '2026-09-01', endDate: '2026-09-02', status: 'taken' })).toBe(false);
    expect(canEmployeeEditLeave({ employeeId: 'e1', startDate: '2026-09-01', endDate: '2026-09-02', status: 'submitted', amendmentTargetId: 'lv-x' })).toBe(false);
  });
  it('applies postpone/modify/cancel amendments with a routed reason', () => {
    const original = { id: 'lv-1', employeeId: 'e1', typeId: 'lt-annual', startDate: '2026-09-01', endDate: '2026-09-03', durationDays: 3, status: 'approved' };
    const postpone = applyLeaveAmendment({ ...original }, { id: 'lv-2', employeeId: 'e1', amendmentType: 'postpone', startDate: '2026-10-05', endDate: '2026-10-07', durationDays: 3, reason: 'Contrainte familiale', status: 'approved' });
    expect(postpone.original.startDate).toBe('2026-10-05');
    expect(postpone.original.status).toBe('approved');
    expect(postpone.amendment.amendmentApplied).toBe(true);
    const modify = applyLeaveAmendment({ ...original }, { id: 'lv-3', employeeId: 'e1', amendmentType: 'modify', startDate: '2026-09-08', endDate: '2026-09-09', durationDays: 2, typeId: 'lt-sick', reason: 'RDV médical', status: 'approved' });
    expect(modify.original.typeId).toBe('lt-sick');
    expect(modify.original.durationDays).toBe(2);
    const cancel = applyLeaveAmendment({ ...original }, { id: 'lv-4', employeeId: 'e1', startDate: '2026-09-01', endDate: '2026-09-03', amendmentType: 'cancel', reason: 'Annulation personnelle', status: 'approved' });
    expect(cancel.original.status).toBe('cancelled');
  });
  it('routes amendments through the HR Leave module on approval', () => {
    const module = source('js/modules/leaves.js');
    expect(module).toContain('applyLeaveAmendment');
    expect(module).toContain('amendmentTargetId');
    expect(module).toContain('amendmentApplied');
    const portal = source('js/modules/portal.js');
    expect(portal).toContain('requestLeaveChange');
    expect(portal).toContain('amendmentRoutedHelp');
    expect(portal).toContain('deleteMyLeave');
    expect(portal).toContain('editMyLeave');
  });
});

describe('section 316 — icons for leave actions', () => {
  it('uses lucide icons for view/edit/delete/postpone/modify/cancel', () => {
    const portal = source('js/modules/portal.js');
    const icons = { view: 'eye', edit: 'pencil', delete: 'trash-2', postpone: 'calendar-arrow-up', modify: 'file-pen-line', cancel: 'calendar-x-2' };
    expect(portal).toContain(`const icons = { view: 'eye', edit: 'pencil', delete: 'trash-2', postpone: 'calendar-arrow-up', modify: 'file-pen-line', cancel: 'calendar-x-2' }`);
    for (const icon of Object.values(icons)) expect(portal, icon).toContain(`data-lucide="\${icons.`);
    const iconSet = source('src/icon-set.ts');
    for (const name of ['Eye', 'Pencil', 'Trash2', 'CalendarArrowUp', 'FilePenLine', 'CalendarX2', 'ArrowRightLeft', 'FileSignature', 'FileBadge', 'Eraser']) expect(iconSet, name).toContain(name);
  });
});

describe('section 317 — signed contract copy archived in the GED', () => {
  it('archives the signed PDF linked to contract and employee', () => {
    const contracts = source('js/modules/contracts.js');
    expect(contracts).toContain('downloadContractPDF');
    expect(contracts).toContain("recordType: 'employmentContract'");
    expect(contracts).toContain("recordType: 'employee'");
    expect(contracts).toContain('ctt-pdf-');
    expect(contracts).toContain('signedCopyArchived');
    const portal = source('js/modules/portal.js');
    expect(portal).toContain('ContractsModule.downloadContractPDF(contractId, { archive: true })');
  });
});

describe('section 318 — full contract text, header/footer, pagination & parties', () => {
  const contract = { id: 'ctt-1', referenceCode: 'SARI-CTT26-00001', type: 'CDI', title: 'Contrat test', position: 'Gestionnaire stocks', startDate: '2026-01-01', baseSalary: 95000, weeklyHours: 39, trialPeriodMonths: 3, clausesHtml: '<p>Clause particulière.</p>', status: 'signed', signatures: {} };
  const employee = { firstName: 'Nadir', lastName: 'Khelifi', dateOfBirth: '1991-09-20', postalAddress: 'Alger', cnasNumber: 'CNAS-160002' };
  const company = { companyName: 'SARI SYSTÈME', rc: '16/00-0987654B19', nif: '001616098765432', nai: '1602409876', nis: '001616012345678', address: 'Bab Ezzouar, Alger' };
  const jobTasks = { position: { fr: 'Gestionnaire stocks' }, tasks: { fr: '<ul><li>Tâche A</li></ul>' } };
  it('renders the full text with header, footer, parties, articles and pagination hooks', () => {
    const html = renderContractDocument({ contract, employee, company, jobTasks, lang: 'fr' });
    expect(html).toContain('CONTRAT DE TRAVAIL');
    expect(html).toContain('CDI');
    expect(html).toContain('Entre les soussignés');
    expect(html).toContain('Nadir Khelifi');
    expect(html).toContain('SARI SYSTÈME');
    expect(html).toContain('16/00-0987654B19');
    expect(html).toContain('Article 1');
    expect(html).toContain('Article 15');
    expect(html).toContain('Clause particulière.');
    expect(html).toContain('contract-doc-footer');
    expect(html).toContain('contract-page-counter');
    expect(html).toContain('page-break-inside:avoid');
    expect(html).toContain('Tâche A');
  });
  it('frames both signature blocks and stamps date/time', () => {
    const block = signatureBlockHtml({ name: 'Amel Bensaïd', title: 'Représentant de l’entreprise', place: 'Alger', signedAt: '2026-08-17T09:30:00.000Z', imageDataUrl: 'data:image/png;base64,AAAA' }, 'Pour la Société', 'fr');
    expect(block).toContain('contract-signature-block');
    expect(block).toContain('Amel Bensaïd');
    expect(block).toContain('Alger');
    expect(signedDateTime('2026-08-17T09:30:00.000Z', 'fr')).toContain('17/08/2026');
  });
});

describe('section 319 — Algerian labour-law template & configurable job functions', () => {
  it('includes mutual obligations and Algerian labour references', () => {
    const articles = contractArticles({ contract: { type: 'CDI', position: 'X', baseSalary: 90000, weeklyHours: 39, trialPeriodMonths: 3 }, employee: { firstName: 'A', lastName: 'B' }, company: { companyName: 'SARI' }, jobTasks: null, lang: 'fr' });
    const titles = articles.map((article) => article.title).join('|');
    expect(titles).toContain('Obligations du salarié');
    expect(titles).toContain('Obligations de l’employeur');
    expect(articles.map((article) => article.body).join(' ')).toContain('90-11');
    expect(articles.map((article) => article.body).join(' ')).toContain('2,5');
  });
  it('stores a CRUD-managed job-functions list reused by contracts and certificates', () => {
    const db = source('js/db.js');
    expect(db).toContain("'jobFunctions'");
    expect(db).toContain('jf-stock');
    expect(db).toContain('jf-sales');
    const contracts = source('js/modules/contracts.js');
    expect(contracts).toContain('editFunction');
    expect(contracts).toContain('jobFunctionsFor');
    expect(contracts).toContain('functionsHtml');
    expect(source('external-db.js')).toContain("jobFunctions: 'job_functions'");
    expect(source('sql/migrations/011_contracts_certificates.sql')).toContain('job_functions');
  });
});

describe('section 320 — dual signature with canvas-drawn signatures saved as PDF', () => {
  it('captures both signers with name, date/time, place, title and hand-drawn signature', () => {
    const portal = source('js/modules/portal.js');
    expect(portal).toContain('SignaturePad.html(\'ctt-sign-pad\'');
    expect(portal).toContain('ctt-sign-place');
    expect(portal).toContain("contract.signatures.employee");
    expect(portal).toContain("employee_signed");
    const contracts = source('js/modules/contracts.js');
    expect(contracts).toContain('openCompanySignature');
    expect(contracts).toContain('contract.signatures.company');
    expect(contracts).toContain('SignaturePad.value(\'cts-signature\')');
    expect(contracts).toContain('createPDFBlob');
    expect(contracts).toContain('pageFooter');
    expect(source('js/signature-pad.js')).toContain('pointerdown');
    expect(source('src/main.ts')).toContain('signature-pad');
  });
  it('keeps the onboarding step complete once the employee signed (dual signature)', () => {
    const done = computeOnboarding({ employeeId: 'e1', acceptances: [], contracts: [{ id: 'c1', employeeId: 'e1', status: 'employee_signed', signatures: { employee: { signedAt: '2026-08-01' } } }], declarations: [] });
    expect(done.steps.find((step) => step.key === 'contract_signed')?.done).toBe(true);
    const pending = computeOnboarding({ employeeId: 'e1', acceptances: [], contracts: [{ id: 'c1', employeeId: 'e1', status: 'sent' }], declarations: [] });
    expect(pending.steps.find((step) => step.key === 'contract_signed')?.done).toBe(false);
  });
});

describe('section 321 — work certificate manager', () => {
  const certificate = { id: 'wct-1', referenceCode: 'SARI-ATT26-00001', typeId: 'withSalary', includeSalary: true, includeTasks: false, position: 'Commerciale B2B', hireDate: '2024-01-15', issueDate: '2026-08-17', salary: 105000, signatures: { manager: { name: 'Amel Bensaïd', title: 'Responsable RH', place: 'Alger', signedAt: '2026-08-17T10:00:00.000Z', imageDataUrl: 'data:image/png;base64,AAAA' } } };
  const employee = { firstName: 'Lina', lastName: 'Mansouri', dateOfBirth: '1994-02-08' };
  const company = { companyName: 'SARI SYSTÈME', rc: 'RC', nif: 'NIF', address: 'Alger' };
  it('supports the three configurable types', () => {
    const withSalary = renderWorkCertificate({ certificate, employee, company, jobTasks: null, lang: 'fr' });
    expect(withSalary).toContain('105 000 DA');
    expect(withSalary).toContain('ATTESTATION DE TRAVAIL');
    const withoutSalary = renderWorkCertificate({ certificate: { ...certificate, typeId: 'withoutSalary', includeSalary: false }, employee, company, jobTasks: null, lang: 'fr' });
    expect(withoutSalary).not.toContain('105 000');
    const withTasks = renderWorkCertificate({ certificate: { ...certificate, typeId: 'withTasks', includeTasks: true }, employee, company, jobTasks: { position: { fr: 'Commerciale B2B' }, tasks: { fr: '<ul><li>Prospection</li></ul>' } }, lang: 'fr' });
    expect(withTasks).toContain('Prospection');
    expect(withTasks).toContain('Fonctions et tâches du poste');
  });
  it('wires the CRUD, request flow, manager signature and auto/manual generation', () => {
    const contracts = source('js/modules/contracts.js');
    for (const contract of ['certificatesHtml', 'openCertificateEditor', 'saveCertificate', 'openCertificateSignature', 'downloadCertificatePDF', 'toggleCertificateAutoGenerate']) expect(contracts, contract).toContain(contract);
    const portal = source('js/modules/portal.js');
    expect(portal).toContain('requestCertificate');
    expect(portal).toContain('certificateConfig');
    expect(portal).toContain('renderWorkCertificate');
    const db = source('js/db.js');
    expect(db).toContain("'workCertificates'");
    expect(db).toContain("listKey:'workCertificateType'");
    expect(db).toContain("['withSalary','Avec informations de salaire'");
    expect(db).toContain("id:'work-certificate-config'");
    expect(db).toContain("['ATT','Attestation de travail'");
    expect(source('external-db.js')).toContain("workCertificates: 'work_certificates'");
    expect(source('js/modules/ged.js')).toContain("'workCertificate'");
    expect(source('sql/migrations/011_contracts_certificates.sql')).toContain('work_certificates');
  });
});

describe('section 322 — leave calendar weekend column ordering', () => {
  it('keeps columns as a chronological rotation with weekend days last', () => {
    expect(weekColumnOrder(defaultSchedule)).toEqual([0, 1, 2, 3, 4, 5, 6]); // Sunday-first, Fri/Sat last
    expect(weekColumnOrder({ ...defaultSchedule, workingDays: [1, 2, 3, 4, 5] })).toEqual([1, 2, 3, 4, 5, 6, 0]); // Sat/Sun weekend: rotation, no inversion
    expect(weekColumnOrder({ ...defaultSchedule, workingDays: [1, 2, 3, 4, 5, 6] })).toEqual([1, 2, 3, 4, 5, 6, 0]);
    // Every produced order must be a cyclic rotation of the chronological week.
    for (const days of [[0, 1, 2, 3, 4], [1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 6], [0, 2, 4]]) {
      const order = weekColumnOrder({ ...defaultSchedule, workingDays: days });
      const rotations = Array.from({ length: 7 }, (_, start) => Array.from({ length: 7 }, (_, i) => (start + i) % 7));
      expect(rotations.some((rotation) => JSON.stringify(rotation) === JSON.stringify(order))).toBe(true);
    }
  });
  it('keeps the calendar day columns aligned under the configured headers', () => {
    const module = source('js/modules/leaves.js');
    expect(module).toContain('weekColumnOrder(this.state.schedule)');
    expect(module).toContain('dayOrder.indexOf(firstWeekday)');
    expect(module).toContain('grid-cols-7');
    expect(module).not.toContain('[1, 2, 3, 4, 5, 6, 0].map');
  });
});
