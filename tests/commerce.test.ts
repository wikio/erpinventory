import { describe, expect, it } from 'vitest';
import { filterCommerceDocuments, filterDocumentsByType, lineTotals, localizedPaymentMethod, normalizeSalesDocumentType, salesStatistics } from '../src/core/commerce';
import sariTotal from '../content/templates/sari-total.json';

describe('sales document filtering and localization', () => {
  const documents = [
    { id:'1', referenceCode:'SARI-FAV26-1', documentType:'invoice', status:'paid', total:119, createdAt:'2026-07-01', items:[{name:'A',qty:1,total:100}] },
    { id:'2', referenceCode:'SARI-DVV26-2', documentType:'quote', status:'quoted', total:80, createdAt:'2026-07-02' },
    { id:'3', referenceCode:'SARI-BCV26-3', status:'confirmed', total:50, createdAt:'2026-08-01' },
  ];

  it('normalizes legacy records and really restricts the selected document type', () => {
    expect(normalizeSalesDocumentType(documents[2])).toBe('purchase_order');
    expect(filterDocumentsByType(documents,'invoice').map(document=>document.id)).toEqual(['1']);
    expect(filterDocumentsByType(documents,'quote').map(document=>document.id)).toEqual(['2']);
    expect(filterDocumentsByType(documents,'purchase_order').map(document=>document.id)).toEqual(['3']);
  });

  it('uses the active-language configurable payment label', () => {
    const methods=[{code:'bank_transfer',label:{fr:'Virement bancaire',ar:'تحويل بنكي',en:'Bank transfer'}}];
    expect(localizedPaymentMethod('bank_transfer',methods,'ar')).toBe('تحويل بنكي');
    expect(localizedPaymentMethod('bank_transfer',methods,'en')).toBe('Bank transfer');
  });

  it('filters statistics by date range and business partner', () => {
    const scoped=filterCommerceDocuments([...documents,{id:'4',documentType:'invoice',customerId:'c2',createdAt:'2026-09-01'}],{from:'2026-07-01',to:'2026-08-31',partnerId:'all'});
    expect(scoped.map(document=>document.id)).toEqual(['1','2','3']);
  });

  it('computes recognized sales statistics without counting quotes', () => {
    const stats=salesStatistics(documents);
    expect(stats.count).toBe(1);
    expect(stats.revenue).toBe(119);
    expect(stats.top.name).toBe('A');
  });
});

describe('purchase consultation totals and SARI Total template', () => {
  it('ships the configurable SARI Total columns', () => {
    expect(sariTotal.templateMode).toBe('designer');
    expect(sariTotal.lineItemsColumns).toEqual(expect.arrayContaining(['discountAmount','vat','ht','ttc']));
    expect(sariTotal.elements.some(element=>element.field==='lineItemsConfigurable')).toBe(true);
  });

  it('computes HT, VAT and TTC per line after discount', () => {
    const totals=lineTotals({qty:2,unitPrice:100,discountExpression:'10%',vatRate:.19});
    expect(totals.gross).toBe(200);expect(totals.discount).toBe(20);expect(totals.ht).toBe(180);
    expect(totals.vat).toBeCloseTo(34.2);expect(totals.ttc).toBeCloseTo(214.2);
  });
});
