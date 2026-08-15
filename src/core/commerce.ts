export type LocalizedLabel = { fr?: string; ar?: string; en?: string };
export interface CommerceLine { productId?: string; name?: string; qty?: number; unitPrice?: number; total?: number; vatRate?: number; discountPercent?: number; discountAmount?: number; discountExpression?: string; }
export interface CommerceDocument { id?: string; referenceCode?: string; documentType?: string; status?: string; total?: number; createdAt?: string; items?: CommerceLine[]; }

const SALES_TYPES = new Set(['invoice', 'quote', 'purchase_order', 'delivery_note']);

export function normalizeSalesDocumentType(document: CommerceDocument): string {
  if (document.documentType && SALES_TYPES.has(document.documentType)) return document.documentType;
  const reference = String(document.referenceCode || '').toUpperCase();
  if (reference.includes('DVV')) return 'quote';
  if (reference.includes('LIV')) return 'delivery_note';
  if (reference.includes('FAV') || document.status === 'invoiced') return 'invoice';
  return 'purchase_order';
}

export function parseDiscount(expression: string | undefined, base: number): number {
  const value=String(expression||'0').trim().replace(',','.');
  if(value.endsWith('%'))return Math.min(base,Math.max(0,base*Number(value.slice(0,-1)||0)/100));
  return Math.min(base,Math.max(0,Number(value)||0));
}

export function lineTotals(line: CommerceLine) {
  const gross=Number(line.qty||0)*Number(line.unitPrice||0);
  const discount=line.discountAmount??parseDiscount(line.discountExpression??(line.discountPercent?`${line.discountPercent}%`:'0'),gross);
  const ht=Number.isFinite(Number(line.total))?Number(line.total):gross-discount;
  const vat=ht*Number(line.vatRate??.19);
  return { gross, discount, ht, vat, ttc: ht+vat };
}

export function filterDocumentsByType<T extends CommerceDocument>(documents: T[], type: string): T[] {
  return type === 'all' ? documents : documents.filter(document => normalizeSalesDocumentType(document) === type);
}

export function localizedPaymentMethod(code: string, methods: Array<{id?:string;code?:string;label?:LocalizedLabel}>, language: keyof LocalizedLabel): string {
  const method=methods.find(item=>item.code===code||item.id===code);
  return method?.label?.[language]||method?.label?.fr||code;
}

export function salesStatistics(documents: CommerceDocument[]) {
  const recognized=documents.filter(document=>normalizeSalesDocumentType(document)==='invoice'||['invoiced','paid','closed'].includes(document.status||''));
  const revenue=recognized.reduce((sum,document)=>sum+Number(document.total||0),0),products=new Map<string,{name:string;qty:number;revenue:number}>(),months=new Map<string,number>();
  for(const document of recognized){const month=String(document.createdAt||'').slice(0,7)||'—';months.set(month,(months.get(month)||0)+Number(document.total||0));for(const line of document.items||[]){const key=line.productId||line.name||'unknown',current=products.get(key)||{name:line.name||'—',qty:0,revenue:0};current.qty+=Number(line.qty||0);current.revenue+=Number(line.total||0);products.set(key,current);}}
  return { revenue, count:recognized.length, average:recognized.length?revenue/recognized.length:0, top:[...products.values()].sort((a,b)=>b.revenue-a.revenue)[0]||{name:'—',qty:0,revenue:0}, trend:[...months].sort(([a],[b])=>a.localeCompare(b)).slice(-6) };
}
