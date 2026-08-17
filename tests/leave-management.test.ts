import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { calculatePayslip } from '../src/core/payroll';
import {
  leaveEngine, validateLeave, suggestLeaveDates, pieceworkCalculation,
  computeOnboarding, leaveDeduction, workedHolidayPremium, paidWorkingDaysBetween,
  workingDaysBetween, leaveDaysByPeriod, rangeDates, monthlyPeriods,
} from '../src/core/leave';

const source = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const holidays2026 = [
  { id: 'h1', date: '2026-07-05', name: { fr: 'Indépendance' }, isFixed: true },
  { id: 'h2', date: '2026-07-06', name: { fr: 'Pont' }, isFixed: false },
];
// 2026-07-05 is a Sunday, 2026-07-06 is a Monday.
const schedule = { ...leaveEngine.defaultSchedule, workingDays: [1, 2, 3, 4, 5] };

describe('section 300–302 leave & public holiday engine', () => {
  it('counts working days and excludes Algerian public holidays', () => {
    // Monday 2026-07-06 → Friday 2026-07-10: 5 working days, 1 is a holiday.
    expect(workingDaysBetween('2026-07-06', '2026-07-10', schedule)).toBe(5);
    expect(paidWorkingDaysBetween('2026-07-06', '2026-07-10', schedule, holidays2026)).toBe(4);
    expect(paidWorkingDaysBetween('2026-07-03', '2026-07-06', schedule, holidays2026)).toBe(1);
  });

  it('splits deductible days across payroll months', () => {
    const byPeriod = leaveDaysByPeriod('2026-08-28', '2026-09-03', schedule, holidays2026);
    expect(byPeriod['2026-08']).toBe(2); // Fri 28, Mon 31
    expect(byPeriod['2026-09']).toBe(3); // Tue 1, Wed 2, Thu 3
    expect(monthlyPeriods('2026-08-28', '2026-09-03')).toEqual(['2026-08', '2026-09']);
    expect(rangeDates('2026-07-04', '2026-07-06')).toEqual(['2026-07-04', '2026-07-05', '2026-07-06']);
  });

  it('applies the Algerian 1/26th unpaid-absence deduction rule', () => {
    expect(leaveDeduction(26000, 3, schedule)).toBe(3000);
    expect(leaveDeduction(26000, 3, { ...schedule, paidLeaveDivisor: 22 })).toBeCloseTo(3545.45, 2);
  });

  it('computes the worked-holiday premium (100% increase on an hourly basis)', () => {
    // 26000 / 26 = 1000 DA/day → 125 DA/h → 8h × 100% premium = 1000 DA.
    expect(workedHolidayPremium(26000, 8, schedule)).toBe(1000);
    expect(workedHolidayPremium(26000, 4, { ...schedule, holidayPremiumRate: 2 })).toBe(1000);
  });

  it('validates balance, overlaps, team coverage and holiday info', () => {
    const request = { id: 'lv-1', employeeId: 'emp-a', typeId: 'lt-annual', startDate: '2026-07-06', endDate: '2026-07-17', status: 'draft' };
    const context = {
      request,
      type: { id: 'lt-annual', daysPerYear: 10, deductsBalance: true, isPaid: true, name: { fr: 'Annuel' } },
      leaveBalance: 8,
      others: [{ id: 'lv-2', employeeId: 'emp-b', startDate: '2026-07-08', endDate: '2026-07-08', status: 'approved' }],
      own: [{ id: 'lv-3', employeeId: 'emp-a', startDate: '2026-07-15', endDate: '2026-07-15', status: 'approved' }],
      team: [{ id: 'emp-a', department: 'Logistique' }, { id: 'emp-b', department: 'Logistique' }],
      holidays: holidays2026,
      schedule,
    };
    const alerts = validateLeave(context);
    expect(alerts.some((alert) => alert.code === 'balance_exceeded' && alert.severity === 'error')).toBe(true);
    expect(alerts.some((alert) => alert.code === 'overlap_self')).toBe(true);
    expect(alerts.some((alert) => alert.code === 'holidays_in_range')).toBe(true);
    const unpaid = validateLeave({
      request: { ...request, typeId: 'lt-unpaid' },
      type: { id: 'lt-unpaid', isPaid: false, name: { fr: 'Sans solde' } },
      others: [], own: [], team: [{ id: 'emp-a', department: 'Logistique' }], holidays: holidays2026, schedule,
    });
    expect(unpaid.some((alert) => alert.code === 'unpaid_adjustment')).toBe(true);
  });

  it('suggests dates that avoid own leave and favour quiet, bridge windows', () => {
    const suggestions = suggestLeaveDates({
      employeeId: 'emp-a', durationDays: 3, fromDate: '2026-07-01', toDate: '2026-07-31',
      own: [{ id: 'lv-3', employeeId: 'emp-a', startDate: '2026-07-10', endDate: '2026-07-14', status: 'approved' }],
      others: [], team: [{ id: 'emp-a', department: 'Logistique' }], holidays: holidays2026, schedule,
    });
    expect(suggestions.length).toBeGreaterThan(0);
    for (const suggestion of suggestions) {
      expect(rangeDates(suggestion.startDate, suggestion.endDate)).not.toContain('2026-07-10');
    }
    // The 2026-07-04 → 2026-07-06 bridge (touching the 5th and 6th) should rank well.
    const first = suggestions[0];
    expect(leaveEngine.holidayMap(holidays2026).has(leaveEngine.addDays(first.endDate, 1)) || leaveEngine.holidayMap(holidays2026).has(leaveEngine.addDays(first.startDate, -1))).toBe(true);
  });
});

describe('section 303 occasional / piece-work rules', () => {
  it('withholds IRG at source without CNAS for pigiste engagements', () => {
    const calc = pieceworkCalculation(10000, { irgWithholdingRate: 0.15, cnasApplicable: false });
    expect(calc.irgAmount).toBe(1500);
    expect(calc.cnasAmount).toBe(0);
    expect(calc.net).toBe(8500);
  });
});

describe('section 304 onboarding computation', () => {
  it('flags every step completed or pending and gates on the current rules version', () => {
    const base = { acceptances: [], contracts: [], declarations: [] };
    const pending = computeOnboarding({ ...base, employeeId: 'emp-a', rulesVersion: 2, termsVersion: 1 });
    expect(pending.done).toBe(false);
    expect(pending.pending).toHaveLength(5);
    const done = computeOnboarding({
      employeeId: 'emp-a', rulesVersion: 1, termsVersion: 1,
      acceptances: [
        { employeeId: 'emp-a', kind: 'rules_read', version: 1, acceptedAt: '2026-01-01' },
        { employeeId: 'emp-a', kind: 'rules', version: 1, acceptedAt: '2026-01-01' },
        { employeeId: 'emp-a', kind: 'terms', version: 1, acceptedAt: '2026-01-01' },
      ],
      contracts: [{ id: 'c1', employeeId: 'emp-a', status: 'signed', signedAt: '2026-01-01' }],
      declarations: [{ employeeId: 'emp-a', declaredAt: '2026-01-01' }],
    });
    expect(done.done).toBe(true);
    expect(done.completedAt).toBeTruthy();
    // Accepting an outdated rules version keeps the step pending.
    const outdated = computeOnboarding({
      employeeId: 'emp-a', rulesVersion: 3, termsVersion: 1,
      acceptances: [{ employeeId: 'emp-a', kind: 'rules', version: 2, acceptedAt: '2026-01-01' }],
      contracts: [], declarations: [],
    });
    expect(outdated.steps.find((step) => step.key === 'rules_accepted')?.done).toBe(false);
  });
});

describe('section 299 payroll integration', () => {
  it('includes leave deductions and worked-holiday premiums in the payslip totals', () => {
    const payslip = calculatePayslip({ baseSalary: 100000, cnasEmployee: 9000, cnasEmployer: 26000, leaveDeductions: 3846.15, workedHolidayAmount: 3846.15 });
    expect(payslip.grossSalary).toBeCloseTo(103846.15, 2);
    expect(payslip.netPayable).toBeCloseTo(103846.15 - 9000 - payslip.irgAmount - 3846.15, 2);
  });
});

describe('section 300–305 wiring in the SARI codebase', () => {
  it('registers the new stores, seeds and navigation', () => {
    const db = source('js/db.js');
    for (const store of ['leaveTypes', 'publicHolidays', 'leaveRequests', 'workedHolidays', 'paymentTypes', 'employmentContracts', 'ruleAcceptances', 'conflictDeclarations', 'workRules', 'occasionalWorkers', 'workerAssignments', 'onboardingStates']) {
      expect(db, store).toContain(`'${store}'`);
    }
    expect(db).toContain('ensureEnhancement300Data');
    expect(db).toContain('ph-2026-eid-fitr-1');
    expect(db).toContain('pt-piecework');
    expect(db).toContain('version = 19');
    expect(source('js/app.js')).toContain("'leaves'");
    expect(source('js/app.js')).toContain('isOnboardingBlocked');
    expect(source('index.html')).toContain('data-nav-item="leaves"');
    expect(source('src/module-loader.ts')).toContain('LeaveModule');
    expect(source('src/module-loader.ts')).toContain('ContractsModule');
    expect(source('src/module-loader.ts')).toContain('OccasionalWorkersModule');
    expect(source('js/modules/settings.js')).toContain("'leaves','contracts','occasionalWorkers'");
    expect(source('external-db.js')).toContain("leaveRequests: 'leave_requests'");
    expect(source('js/modules/ged.js')).toContain("'leaveRequest'");
    expect(source('js/modules/payslips.js')).toContain('leaveAdjustments');
    expect(source('js/modules/portal.js')).toContain('computeOnboarding');
    expect(source('js/modules/dashboard.js')).toContain('loadScopedData');
    expect(source('sql/migrations/009_leave_contracts_onboarding.sql')).toContain('uq_onboarding_employee');
  });
  it('ships complete trilingual translations for the new screens', () => {
    const keys = ['leaveManager', 'leaveCalendar', 'leaveComparison', 'publicHoliday', 'workedHolidaysLabel', 'paymentTypesLabel', 'piecework', 'contractsManager', 'workRulesLabel', 'conflictDeclarationsLabel', 'onboardingLabel', 'accessRestrictionLabel', 'stepContractSigned', 'onboardingAlert', 'occasionalWorkersManager', 'nonCnas', 'myWorkspace', 'scopedDashboard', 'leaves', 'contracts', 'occasionalWorkers'];
    for (const lang of ['fr', 'ar', 'en']) {
      const pack = JSON.parse(source(`content/translations/${lang}.json`));
      for (const key of keys) expect(pack[key], `${lang}:${key}`).toBeTruthy();
    }
  });
});
