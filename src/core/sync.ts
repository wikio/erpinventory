import { requireNumericId, type SariRecord } from './db';

export type MutationAction = 'save' | 'delete';

export interface QueuedMutation {
  storeName: string;
  action: MutationAction;
  payload: SariRecord;
  numericId?: number;
}

export interface ApiRequest {
  endpoint: '/api/db/migrate-batch' | '/api/db/delete-record';
  body: { storeName: string; records: SariRecord[] } | { storeName: string; numericId: number };
}

export function externalMutationRequest(mutation: QueuedMutation): ApiRequest {
  if (!mutation.storeName) throw new TypeError('storeName is required');
  if (mutation.action === 'delete') {
    return {
      endpoint: '/api/db/delete-record',
      body: { storeName: mutation.storeName, numericId: mutation.numericId ?? requireNumericId(mutation.payload) },
    };
  }
  return {
    endpoint: '/api/db/migrate-batch',
    body: { storeName: mutation.storeName, records: [mutation.payload] },
  };
}

export function retryDelay(attempt: number, random = Math.random()): number {
  const bounded = Math.max(0, Math.min(8, Math.trunc(attempt)));
  return Math.round(Math.min(30_000, 500 * 2 ** bounded) * (0.8 + random * 0.4));
}
