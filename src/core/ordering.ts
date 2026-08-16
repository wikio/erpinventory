export interface OrderedRecord { id: string; order?: number; numericId?: number; createdAt?: string; [key:string]: unknown; }

export function stableOrder(records: OrderedRecord[]): OrderedRecord[] {
  return [...records].sort((a,b)=>{
    const ao=Number.isInteger(Number(a.order))&&Number(a.order)>0?Number(a.order):Number.MAX_SAFE_INTEGER;
    const bo=Number.isInteger(Number(b.order))&&Number(b.order)>0?Number(b.order):Number.MAX_SAFE_INTEGER;
    if(ao!==bo)return ao-bo;
    const ad=new Date(String(a.createdAt||0)).getTime()||0,bd=new Date(String(b.createdAt||0)).getTime()||0;
    if(ad!==bd)return ad-bd;
    return (Number(a.numericId)||0)-(Number(b.numericId)||0)||String(a.id).localeCompare(String(b.id));
  });
}

/** Full-compaction strategy: remove the edited row, insert at requested 1-based position, then assign contiguous 1..N. */
export function resequenceRecords<T extends OrderedRecord>(records:T[], moving:T, requestedOrder?:number):T[]{
  const others=stableOrder(records.filter(record=>record.id!==moving.id));
  const position=Math.min(others.length+1,Math.max(1,Math.trunc(Number(requestedOrder??moving.order??others.length+1))||others.length+1));
  others.splice(position-1,0,moving);
  return others.map((record,index)=>({...record,order:index+1}) as T);
}

export function hasUniqueContiguousOrders(records:OrderedRecord[]):boolean{
  const values=records.map(record=>Number(record.order)).sort((a,b)=>a-b);
  return values.every((value,index)=>value===index+1);
}
