import { describe, expect, it } from 'vitest';
import { bilanSideTotal, isBalanced, paidAmount, remainingBalance } from '../src/core/fiscal';

describe('fiscal payment allocation', () => {
  const payments=[{taxRecordId:'g50-1',amount:300},{taxRecordId:'g50-1',amount:150},{taxRecordId:'ibs-1',amount:80}];
  it('defaults subsequent payments to the remaining declaration balance', () => {
    expect(paidAmount('g50-1',payments)).toBe(450);
    expect(remainingBalance({id:'g50-1',amountDue:1000},payments)).toBe(550);
  });
  it('never proposes a negative remaining balance', () => {
    expect(remainingBalance({id:'g50-1',amountDue:100},payments)).toBe(0);
  });
});

describe('Algerian bilan totals', () => {
  it('aggregates configured fiscal lines and checks Actif/Passif equality', () => {
    const lines={terrains:200,clients:300,capital_emis:400,fournisseurs_comptes_rattaches:100};
    const actif=bilanSideTotal(lines,['terrains','clients']),passif=bilanSideTotal(lines,['capital_emis','fournisseurs_comptes_rattaches']);
    expect(actif).toBe(500);expect(passif).toBe(500);expect(isBalanced(actif,passif)).toBe(true);
  });
});
