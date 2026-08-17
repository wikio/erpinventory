export interface PayslipAmounts {
  baseSalary?: number; seniorityAllowance?: number; performanceBonus?: number; otherBonuses?: number;
  transportAllowance?: number; housingAllowance?: number; mealAllowance?: number; overtimeAmount?: number;
  otherAllowances?: number; cnasEmployee?: number; cnasEmployer?: number; irgAmount?: number;
  advances?: number; loans?: number; otherDeductions?: number;
  leaveDeductions?: number; workedHolidayAmount?: number;
}

const amount = (value: unknown): number => Math.max(0, Number(value) || 0);

export function progressiveAnnualIrg(annualTaxable: number): number {
  const taxable=amount(annualTaxable),brackets=[[240000,0],[480000,.23],[960000,.27],[1920000,.30],[3840000,.33],[Infinity,.35]] as const;
  let lower=0,tax=0;
  for(const [upper,rate] of brackets){const slice=Math.max(0,Math.min(taxable,upper)-lower);tax+=slice*rate;if(taxable<=upper)break;lower=upper;}
  return tax;
}

export function calculateMonthlyIrg(monthlyTaxable: number): number {
  const raw=progressiveAnnualIrg(amount(monthlyTaxable)*12)/12;
  if(!raw)return 0;
  const abatement=Math.min(1500,Math.max(1000,raw*.4));
  return Math.max(0,Math.round((raw-abatement)*100)/100);
}

export function calculatePayslip(input: PayslipAmounts) {
  const gross=['baseSalary','seniorityAllowance','performanceBonus','otherBonuses','transportAllowance','housingAllowance','mealAllowance','overtimeAmount','otherAllowances','workedHolidayAmount'].reduce((sum,key)=>sum+amount(input[key as keyof PayslipAmounts]),0);
  const cnasEmployee=input.cnasEmployee===undefined?Math.round(gross*.09*100)/100:amount(input.cnasEmployee);
  const cnasEmployer=input.cnasEmployer===undefined?Math.round(gross*.26*100)/100:amount(input.cnasEmployer);
  const taxable=Math.max(0,gross-cnasEmployee),irg=input.irgAmount===undefined?calculateMonthlyIrg(taxable):amount(input.irgAmount);
  const other=amount(input.advances)+amount(input.loans)+amount(input.otherDeductions)+amount(input.leaveDeductions),deductions=cnasEmployee+irg+other;
  return{grossSalary:gross,cnasEmployee,cnasEmployer,taxableSalary:taxable,irgAmount:irg,totalDeductions:deductions,netPayable:Math.max(0,gross-deductions)};
}
