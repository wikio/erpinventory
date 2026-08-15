export const EXTERNAL_SYNC_EXCLUDED_STORES = new Set(['syncQueue', 'recordSequences']);

export interface SariRecord {
  id: string;
  numericId?: number;
  referenceCode?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export function isExternalSyncStore(storeName: string): boolean {
  return Boolean(storeName) && !EXTERNAL_SYNC_EXCLUDED_STORES.has(storeName);
}

export function requireNumericId(record: SariRecord): number {
  const id = Number(record.numericId);
  if (!Number.isSafeInteger(id) || id < 1) throw new TypeError('A positive, safe numericId is required');
  return id;
}

export function cloneRecord<T extends SariRecord>(record: T): T {
  return structuredClone(record);
}
