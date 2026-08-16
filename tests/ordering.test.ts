import { describe, expect, it } from 'vitest';
import { hasUniqueContiguousOrders, resequenceRecords, stableOrder } from '../src/core/ordering';

describe('business reference ordering', () => {
  const records=[{id:'a',numericId:90,order:1},{id:'b',numericId:4,order:2},{id:'c',numericId:7,order:3}];
  it('inserts a historical record and shifts later business orders without changing technical IDs', () => {
    const inserted={id:'old',numericId:200,order:2};
    const result=resequenceRecords(records,inserted,2);
    expect(result.map(record=>[record.id,record.order,record.numericId])).toEqual([['a',1,90],['old',2,200],['b',3,4],['c',4,7]]);
    expect(hasUniqueContiguousOrders(result)).toBe(true);
  });
  it('moves an existing record and compacts the sequence', () => {
    const result=resequenceRecords(records,{...records[2],order:1},1);
    expect(result.map(record=>record.id)).toEqual(['c','a','b']);
    expect(result.map(record=>record.numericId)).toEqual([7,90,4]);
  });
  it('repairs duplicate/missing order values deterministically', () => {
    const sorted=stableOrder([{id:'x',order:1,numericId:8},{id:'y',order:1,numericId:9},{id:'z',numericId:2}]);
    expect(sorted.map(record=>record.id)).toEqual(['x','y','z']);
  });
});
