import { describe, expect, it } from 'vitest';
import { isExternalSyncStore, requireNumericId } from '../src/core/db';
import { externalMutationRequest, retryDelay } from '../src/core/sync';
import { assertSafeTemplateSize, mergeFieldNames, mergeFields, publicDocumentContext } from '../src/core/template-engine';

describe('critical database contracts', () => {
  it('requires stable positive numeric IDs', () => {
    expect(requireNumericId({ id: 'product-a', numericId: 12 })).toBe(12);
    expect(() => requireNumericId({ id: 'product-a', numericId: 0 })).toThrow(/numericId/);
  });

  it('never bridges internal queue stores', () => {
    expect(isExternalSyncStore('products')).toBe(true);
    expect(isExternalSyncStore('syncQueue')).toBe(false);
    expect(isExternalSyncStore('recordSequences')).toBe(false);
  });
});

describe('offline synchronization requests', () => {
  it('builds parameter-only save and delete payloads', () => {
    expect(externalMutationRequest({ storeName: 'products', action: 'save', payload: { id: 'a', numericId: 4 } })).toEqual({
      endpoint: '/api/db/migrate-batch', body: { storeName: 'products', records: [{ id: 'a', numericId: 4 }] },
    });
    expect(externalMutationRequest({ storeName: 'products', action: 'delete', payload: { id: 'a', numericId: 4 } })).toEqual({
      endpoint: '/api/db/delete-record', body: { storeName: 'products', numericId: 4 },
    });
  });

  it('caps exponential retry delays', () => {
    expect(retryDelay(0, 0.5)).toBe(500);
    expect(retryDelay(99, 0.5)).toBeLessThanOrEqual(30_000);
  });
});

describe('template merge engine', () => {
  it('replaces known fields and removes unresolved fields', () => {
    expect(mergeFields('<h1>{{ company.name }}</h1>{{missing}}', { 'company.name': 'SARI' })).toBe('<h1>SARI</h1>');
    expect(mergeFieldNames('{{a}} {{ b }} {{a}}')).toEqual(['a', 'b', 'a']);
  });

  it('removes internal order and technical identifiers from public document contexts', () => {
    const context = publicDocumentContext({
      'document.reference': 'SARI-FAV26-00001',
      'document.internalId': 'order-private-id',
      'document.numericId': 19,
      'document.order': 7,
    });
    expect(context).toEqual({ 'document.reference': 'SARI-FAV26-00001' });
    expect(mergeFields('{{document.reference}}|{{document.internalId}}|{{document.numericId}}|{{document.order}}', context)).toBe('SARI-FAV26-00001|||');
  });

  it('rejects oversized portable templates', () => {
    expect(() => assertSafeTemplateSize('abcd', 3)).toThrow(/size/);
  });
});
