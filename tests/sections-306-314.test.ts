import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { weekColumnOrder, paymentTypeCode, defaultSchedule } from '../src/core/leave';
import { resolveFiscalIdentifiers } from '../src/core/payroll';
import { hijriToGregorian, gregorianToHijri, religiousHolidaysForYear, algerianHolidaysForYear, fixedAlgerianHolidays } from '../src/core/hijri';
import { parseCsv, csvToObjects, parseHolidayFile, normalizeHolidayRow, defaultCsvMapping, defaultJsonMapping, importedHolidayId } from '../src/core/holiday-import';
import { workRulesPolicy, generalTermsPolicy, policyHtml } from '../src/core/hr-policies';

const source = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const require = createRequire(import.meta.url);

describe('section 306 — payslip reference format SARI-PAY{YY}{MM}{PAYTYPE}{DD}-{EMPSEQ}', () => {
  it('renders the new mask with payment-type and employee-sequence tokens', () => {
    (globalThis as Record<string, unknown>).window = globalThis;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../js/reference-codes.js');
    const ReferenceCodeManager = (globalThis as any).ReferenceCodeManager;
    const def = { code: 'PAY', mask: 'SARI-PAY{YY}{MM}{PAYTYPE}{DD}-{EMPSEQ}', sequenceMinDigits: 5 };
    expect(ReferenceCodeManager.render(def, 42, { date: '2026-03-05', paymentType: 'MO', employeeSequence: '00042' })).toBe('SARI-PAY2603MO05-00042');
    expect(ReferenceCodeManager.render(def, 1, { date: '2026-12-31', paymentType: 'PI', employeeSequence: '7' })).toBe('SARI-PAY2612PI31-00007');
  });
  it('maps every payment cycle to its 2-letter code', () => {
    expect(paymentTypeCode('annual')).toBe('AN');
    expect(paymentTypeCode('monthly')).toBe('MO');
    expect(paymentTypeCode('weekly')).toBe('WE');
    expect(paymentTypeCode('daily')).toBe('DA');
    expect(paymentTypeCode('piecework')).toBe('PI');
  });
  it('wires the mask, tokens and payslip context in the persistence layer', () => {
    const db = source('js/db.js');
    expect(db).toContain("SARI-PAY{YY}{MM}{PAYTYPE}{DD}-{EMPSEQ}");
    expect(db).toContain('SARI-PAY2603MO05-00042');
    expect(db).toContain('context.paymentType=');
    expect(db).toContain('context.employeeSequence=');
    expect(source('js/reference-codes.js')).toContain('{PAYTYPE}');
    expect(source('js/reference-codes.js')).toContain('{EMPSEQ}');
  });
});

describe('section 307 — Algerian weekend (Friday/Saturday) and Sunday-first calendar', () => {
  it('defaults the working week to Sunday–Thursday', () => {
    expect(defaultSchedule.workingDays).toEqual([0, 1, 2, 3, 4]);
  });
  it('orders calendar columns Sunday-first with configured weekend days always last', () => {
    expect(weekColumnOrder(defaultSchedule)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(weekColumnOrder({ ...defaultSchedule, workingDays: [1, 2, 3, 4, 5] })).toEqual([1, 2, 3, 4, 5, 0, 6]);
    expect(weekColumnOrder({ ...defaultSchedule, workingDays: [0, 2, 4, 6] })).toEqual([0, 2, 4, 6, 1, 3, 5]);
  });
  it('renders the leave calendar from the live schedule configuration', () => {
    const module = source('js/modules/leaves.js');
    expect(module).toContain('weekColumnOrder(this.state.schedule)');
    expect(module).toContain('dayOrder.indexOf(firstWeekday)');
    expect(module).toContain("'sunday', 'monday'");
  });
});

describe('section 308 — publicHolidays menu title translation', () => {
  it('ships the publicHolidays key in every language', () => {
    expect(source('js/config.js')).toContain('"publicHolidays"');
    for (const lang of ['fr', 'ar', 'en']) {
      const pack = JSON.parse(source(`content/translations/${lang}.json`));
      expect(pack.publicHolidays, lang).toBeTruthy();
      expect(pack.publicHolidays).not.toBe('publicHolidays');
    }
  });
});

describe('section 309 — holiday import, auto-fetch and auto-calculation', () => {
  it('computes the tabular Hijri anchors for 2026', () => {
    expect(hijriToGregorian(1448, 1, 1)).toEqual({ year: 2026, month: 6, day: 16 });
    expect(hijriToGregorian(1448, 1, 10)).toEqual({ year: 2026, month: 6, day: 25 });
    expect(gregorianToHijri(2026, 6, 16)).toEqual({ year: 1448, month: 1, day: 1 });
    const religious = religiousHolidaysForYear(2026);
    expect(religious.some((entry) => entry.baseKey === 'eid_fitr_1' && entry.date === '2026-03-19')).toBe(true);
    expect(religious.some((entry) => entry.baseKey === 'awal_muharram' && entry.date === '2026-06-16')).toBe(true);
    expect(religious.some((entry) => entry.baseKey === 'mawlid')).toBe(true);
  });
  it('covers 2011 → 2031 with fixed + religious holidays per year', () => {
    for (const year of [2011, 2020, 2026, 2031]) {
      const all = algerianHolidaysForYear(year);
      expect(all.filter((entry) => !entry.isFixed).length).toBeGreaterThanOrEqual(6);
      expect(fixedAlgerianHolidays(year)).toHaveLength(5);
      expect(all[0].date.startsWith(String(year))).toBe(true);
    }
  });
  it('parses CSV (quotes, CRLF) and JSON through the configurable mapping', () => {
    expect(parseCsv('a,b\n"x,1","y"\r\nz,w')[0]).toEqual(['a', 'b']);
    expect(csvToObjects('date,name_fr,is_fixed\n2026-05-01,Fête,true').length).toBe(1);
    const normalized = parseHolidayFile('date,name_fr,name_ar,name_en,is_fixed,notes\n2026-05-01,Fête du Travail,عيد العمال,Labour Day,true,note', defaultCsvMapping);
    expect(normalized.format).toBe('csv');
    expect(normalized.normalized).toHaveLength(1);
    expect(normalized.normalized[0].name.fr).toBe('Fête du Travail');
    const json = parseHolidayFile(JSON.stringify([{ date: '2026-07-05', name: { fr: 'Indépendance' } }]), defaultJsonMapping);
    expect(json.normalized).toHaveLength(1);
    expect(parseHolidayFile(JSON.stringify({ holidays: [{ date: 'bad', name: {} }] }), defaultJsonMapping).rejected).toBe(1);
    expect(normalizeHolidayRow({ date: '26/05', name_fr: 'X' }, defaultCsvMapping)).toBeNull();
    expect(importedHolidayId('2026-05-01', { fr: 'Fête du Travail' })).toBe('ph-imp-2026-05-01-fete-du-travail');
  });
  it('ships ready-to-import server files for 2011 → 2031 and the server folder kind', () => {
    for (const year of [2011, 2016, 2026, 2031]) {
      expect(existsSync(join(process.cwd(), 'content', 'holidays', `${year}.json`)), String(year)).toBe(true);
    }
    const pack = JSON.parse(source('content/holidays/2026.json'));
    expect(pack.some((entry: { baseKey: string }) => entry.baseKey === 'eid_fitr_1')).toBe(true);
    expect(source('file-content.js')).toContain("holidays: ['.json', '.csv']");
    const generator = require('../scripts/generate-holiday-files.js');
    const years = generator.generateHolidayYears();
    expect(Object.keys(years)).toHaveLength(21);
    // The generator mirrors the TS engine.
    expect(years['2026'].map((entry: { date: string }) => entry.date)).toEqual(religiousHolidaysForYear(2026).concat(fixedAlgerianHolidays(2026)).sort((a, b) => a.date.localeCompare(b.date)).map((entry) => entry.date));
  });
  it('wires import, server sync, year filter and source configuration in the Leave module', () => {
    const module = source('js/modules/leaves.js');
    for (const contract of ['syncServerHolidayFiles', 'autoCalculateReligious', 'importHolidayFile', 'applyImportedHolidays', 'holidaySourceBadge', 'datalist id="holiday-years"', "fetch('/api/content/holidays'", 'holiday-config', 'saveHolidayConfig']) {
      expect(module, contract).toContain(contract);
    }
    expect(source('js/db.js')).toContain("id:'holiday-config'");
    expect(source('js/db.js')).toContain('baseKey:');
  });
});

describe('section 310 — payslip NIF / NAI / NIS / RC from settings and trade registers', () => {
  it('resolves fiscal identifiers with register precedence and settings fallback', () => {
    const settings = { nif: 'NIF-SETTINGS', rc: 'RC-SETTINGS', ai: 'NAI-SETTINGS', nis: 'NIS-SETTINGS' };
    expect(resolveFiscalIdentifiers(settings, null)).toEqual({ nif: 'NIF-SETTINGS', nai: 'NAI-SETTINGS', nis: 'NIS-SETTINGS', rc: 'RC-SETTINGS', registerName: '' });
    const register = { registerNumber: 'RC-1', legalName: 'SARI', nif: 'NIF-1', nai: 'NAI-1', nis: 'NIS-1' };
    const linked = resolveFiscalIdentifiers(settings, register);
    expect(linked.rc).toBe('RC-1');
    expect(linked.nif).toBe('NIF-1');
    expect(linked.nai).toBe('NAI-1');
    expect(linked.nis).toBe('NIS-1');
    // Partial register falls back per-field.
    expect(resolveFiscalIdentifiers(settings, { registerNumber: 'RC-2', nif: 'NIF-2' }).nis).toBe('NIS-SETTINGS');
  });
  it('wires the RC selector, fiscal preview and seed register', () => {
    const payslips = source('js/modules/payslips.js');
    expect(payslips).toContain('payslip-rc');
    expect(payslips).toContain('fiscalChanged');
    expect(payslips).toContain('paymentTypeId');
    expect(payslips).toContain('resolveFiscalIdentifiers');
    expect(payslips).toContain('NAI');
    expect(source('js/db.js')).toContain("id:'trade-register-main'");
    expect(source('js/db.js')).toContain("nai:'1602409876'");
    expect(source('js/modules/commerce-direction.js')).toContain('name:\'nai\'');
    expect(source('sql/migrations/010_payslip_reference_fiscal.sql')).toContain('ADD COLUMN `rc_id`');
    expect(source('external-db.js')).toContain("rc_id: 'trade_registers'");
  });
});

describe('section 311 — GED modal stacking above the payslip consultation', () => {
  it('stacks the GED manager above parent overlays with a back action', () => {
    const documents = source('js/documents.js');
    expect(documents).toContain('gedZ');
    expect(documents).toContain('parentOpen');
    expect(documents).toContain('backToConsultation');
    expect(documents).toContain('document-manager-root');
    expect(source('js/config.js')).toContain('"backToConsultation"');
  });
});

describe('section 312 — modern payslip templates with configurable header/footer', () => {
  it('seeds the modern default and 3 additional bordered designs', () => {
    const db = source('js/db.js');
    for (const id of ['doc-tpl-payslip-modern', 'doc-tpl-payslip-clinical', 'doc-tpl-payslip-amber', 'doc-tpl-payslip-midnight']) {
      expect(db, id).toContain(id);
    }
    expect(db).toContain('headerHtml:header306');
  });
  it('renders bordered tables, document shell and the header/footer editor', () => {
    const payslips = source('js/modules/payslips.js');
    expect(payslips).toContain('border:1px solid #94a3b8');
    expect(payslips).toContain('payslip-grid-table');
    expect(payslips).toContain('editHeaderFooter');
    expect(payslips).toContain('documentShell');
    expect(payslips).toContain('{{companyFooter}}');
    expect(payslips).toContain('{{documentReference}}');
  });
});

describe('section 313 — onboarding step refresh without manual reload', () => {
  it('re-renders the portal after every completed onboarding step', () => {
    const portal = source('js/modules/portal.js');
    expect(portal).toContain("await this.render();\n    this.openWizard('rules_accepted')");
    expect(portal).toContain('await this.render();\n    const onboarding = this.onboarding();');
    expect(portal).toContain('await this.render();\n          this.openWizard');
  });
});

describe('section 314 — detailed work rules & general terms articles', () => {
  it('provides numbered articles in all three languages', () => {
    expect(workRulesPolicy.articles).toHaveLength(20);
    expect(generalTermsPolicy.articles).toHaveLength(10);
    for (const policy of [workRulesPolicy, generalTermsPolicy]) {
      expect(policy.preamble.fr).toBeTruthy();
      for (const article of policy.articles) {
        expect(article.body.fr, `${policy.kind}#${article.n}`).toBeTruthy();
        expect(article.body.ar, `${policy.kind}#${article.n}`).toBeTruthy();
        expect(article.body.en, `${policy.kind}#${article.n}`).toBeTruthy();
      }
    }
    const fr = policyHtml(workRulesPolicy, 'fr');
    expect(fr).toContain('Article 1');
    expect(fr).toContain('Article 20');
    expect(policyHtml(workRulesPolicy, 'ar')).toContain('المادة 20');
    expect(policyHtml(generalTermsPolicy, 'en')).toContain('Article 10');
  });
  it('publishes the detailed policies as version 2 through the DB seed', () => {
    const db = source('js/db.js');
    expect(db).toContain('SariCore?.hrPolicies');
    expect(db).toContain("version:2");
    expect(db).toContain('policyHtml(policies.workRulesPolicy');
    expect(source('src/core/index.ts')).toContain('hrPolicies');
    expect(source('src/core/index.ts')).toContain('hijri');
    expect(source('src/core/index.ts')).toContain('holidayImport');
  });
});
