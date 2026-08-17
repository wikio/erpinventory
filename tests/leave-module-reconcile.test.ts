import { describe, expect, it } from 'vitest';
import { leaveEngine } from '../src/core/leave';
import { calculatePayslip } from '../src/core/payroll';

/**
 * Integration test for Section 300.1: taking leave (or an unpaid absence)
 * automatically adjusts the corresponding employee's payslip. Exercises the
 * real LeaveModule.reconcileAdjustments flow against an in-memory store.
 */
const makeMemoryDb = (initial: Record<string, any[]>) => {
  const stores = new Map(Object.entries(initial));
  return {
    async getAll(store: string) { return stores.get(store) || []; },
    async getById(store: string, id: string) { return (stores.get(store) || []).find((row: any) => row.id === id) || null; },
    async save(store: string, data: any) {
      const rows = stores.get(store) || [];
      const index = rows.findIndex((row) => row.id === data.id);
      if (index >= 0) rows[index] = { ...rows[index], ...data }; else rows.push(data);
      stores.set(store, rows);
      return data;
    },
    async delete(store: string, id: string) {
      stores.set(store, (stores.get(store) || []).filter((row) => row.id !== id));
    },
    snapshot(store: string) { return stores.get(store) || []; },
  };
};

describe('LeaveModule payslip auto-adjustment (Section 300.1)', () => {
  it('deducts unpaid leave days from the payslip and records attendance', async () => {
    (globalThis as any).window = globalThis;
    (globalThis as any).i18n = { t: (_key: string, fallback: string) => fallback, formatCurrency: (value: number) => String(Math.round(value)), formatDate: (value: string) => value || '—', currentLang: 'fr' };
    (globalThis as any).app = { showToast: () => undefined };
    (globalThis as any).SariCore = { leave: leaveEngine, payroll: { calculatePayslip }, ordering: { stableOrder: (rows: any[]) => rows } };
    (globalThis as any).auth = { currentUser: { id: 'usr-admin', name: 'Admin', username: 'admin' }, can: () => true, currentRole: 'admin' };

    const schedule = { ...leaveEngine.defaultSchedule, workingDays: [1, 2, 3, 4, 5], dailyHours: 8, paidLeaveDivisor: 26, holidayPremiumRate: 1 };
    const db = makeMemoryDb({
      employees: [{ id: 'emp-stock', firstName: 'Nadir', lastName: 'Khelifi', department: 'Logistique', status: 'active', salary: 95000, referenceCode: 'EMP-2' }],
      leaveTypes: [{ id: 'lt-unpaid', code: 'unpaid', name: { fr: 'Sans solde' }, isPaid: false, deductsBalance: false }],
      publicHolidays: [],
      leaveRequests: [{ id: 'lv-1', employeeId: 'emp-stock', employeeName: 'Nadir Khelifi', department: 'Logistique', typeId: 'lt-unpaid', isPaid: false, startDate: '2026-08-24', endDate: '2026-08-26', durationDays: 3, status: 'approved' }],
      workedHolidays: [],
      payslips: [],
      salaryHistory: [],
      attendance: [],
      paymentTypes: [],
      settings: [{ id: 'work-schedule', ...schedule }],
    });
    (globalThis as any).sariDB = db;
    (globalThis as any).SariUtils = { escapeHtml: (value: string) => value };
    await import('../js/modules/leaves.js');
    const LeaveModule = (globalThis as any).LeaveModule;
    await LeaveModule.load();
    await LeaveModule.reconcileAdjustments();

    const payslips = db.snapshot('payslips');
    expect(payslips).toHaveLength(1);
    const payslip = payslips[0];
    expect(payslip.employeeId).toBe('emp-stock');
    expect(payslip.period).toBe('2026-08');
    expect(payslip.leaveDeductions).toBeCloseTo(95000 / 26 * 3, 2);
    expect(payslip.leaveAdjustments).toHaveLength(1);
    expect(payslip.leaveAdjustments[0].days).toBe(3);
    expect(payslip.netPayable).toBeCloseTo(calculatePayslip({ baseSalary: 95000, leaveDeductions: 95000 / 26 * 3 }).netPayable, 2);

    const attendance = db.snapshot('attendance');
    expect(attendance.filter((row: any) => String(row.id).startsWith('att-leave-'))).toHaveLength(3);
    expect(attendance.every((row: any) => row.status === 'leave')).toBe(true);

    const request = db.snapshot('leaveRequests')[0];
    expect(request.deductionAmount).toBeCloseTo(95000 / 26 * 3, 2);
    expect(request.adjustedPeriods).toEqual(['2026-08']);

    // Cancelling the request rolls the adjustment back.
    request.status = 'cancelled';
    await db.save('leaveRequests', request);
    LeaveModule.state.records = [request];
    await LeaveModule.reconcileAdjustments();
    const rolledBack = db.snapshot('payslips')[0];
    expect(rolledBack.leaveAdjustments).toHaveLength(0);
    expect(rolledBack.leaveDeductions).toBe(0);
    expect(db.snapshot('attendance').filter((row: any) => String(row.id).startsWith('att-leave-'))).toHaveLength(0);
  });
});
