import { describe, expect, it } from 'vitest';
import { calculateMonthlyIrg, calculatePayslip, progressiveAnnualIrg } from '../src/core/payroll';

describe('Algerian payslip calculations',()=>{
  it('totals gross earnings, CNAS, IRG, deductions and net payable',()=>{const result=calculatePayslip({baseSalary:100000,seniorityAllowance:5000,performanceBonus:10000,transportAllowance:3000,cnasEmployee:10620,cnasEmployer:30680,advances:2000});expect(result.grossSalary).toBe(118000);expect(result.cnasEmployee).toBe(10620);expect(result.cnasEmployer).toBe(30680);expect(result.irgAmount).toBeGreaterThan(0);expect(result.netPayable).toBeCloseTo(118000-10620-result.irgAmount-2000,2);});
  it('applies default CNAS employee and employer rates when no declaration overrides them',()=>{const result=calculatePayslip({baseSalary:100000});expect(result.cnasEmployee).toBe(9000);expect(result.cnasEmployer).toBe(26000);});
  it('uses a progressive IRG scale with a monthly abatement',()=>{expect(progressiveAnnualIrg(200000)).toBe(0);expect(calculateMonthlyIrg(20000)).toBe(0);expect(calculateMonthlyIrg(120000)).toBeGreaterThan(calculateMonthlyIrg(60000));});
});
