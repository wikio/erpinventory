export interface FiscalPayment { taxRecordId?: string; amount?: number; }
export interface FiscalRecord { id: string; amountDue?: number; bilanLines?: Record<string, number>; }

export function paidAmount(recordId: string, payments: FiscalPayment[]): number {
  return payments.filter(payment=>payment.taxRecordId===recordId).reduce((sum,payment)=>sum+Number(payment.amount||0),0);
}

export function remainingBalance(record: FiscalRecord, payments: FiscalPayment[]): number {
  return Math.max(0,Number(record.amountDue||0)-paidAmount(record.id,payments));
}

export function bilanSideTotal(lines: Record<string, number> | undefined, codes: string[]): number {
  return codes.reduce((sum,code)=>sum+Number(lines?.[code]||0),0);
}

export function isBalanced(actif: number, passif: number, tolerance=.01): boolean {
  return Math.abs(actif-passif)<tolerance;
}
