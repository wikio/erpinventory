import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ExternalDatabaseManager, snakeToCamel, sourceValue } = require('../external-db.js');
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('normalized external repository', () => {
  it('maps only allowlisted stores and rejects identifier injection', () => {
    const root = mkdtempSync(join(tmpdir(), 'sari-db-'));
    temporaryRoots.push(root);
    const repository = new ExternalDatabaseManager(root);
    expect(repository.tableFor('products')).toBe('products');
    expect(() => repository.tableFor('products; DROP TABLE users')).toThrow(/no normalized repository mapping/);
  });

  it('maps camel-case records to normalized and JSON columns', () => {
    expect(snakeToCamel('linked_product_ids_json')).toBe('linkedProductIdsJson');
    const row = { id: 'product-1', linkedProductIds: ['a', 'b'], name: { fr: 'Nom' } };
    expect(sourceValue(row, 'legacy_uid')).toBe('product-1');
    expect(sourceValue(row, 'linked_product_ids_json')).toEqual(['a', 'b']);
    expect(sourceValue(row, 'name_json')).toEqual({ fr: 'Nom' });
    expect(sourceValue({ value:'inspection-est', order:3 }, 'option_value')).toBe('inspection-est');
    expect(sourceValue({ value:'inspection-est', order:3 }, 'sort_order')).toBe(3);
  });

  it('never persists passwords in runtime metadata', () => {
    const root = mkdtempSync(join(tmpdir(), 'sari-db-'));
    temporaryRoots.push(root);
    const repository = new ExternalDatabaseManager(root);
    repository.save({ type: 'mysql', host: 'db', database: 'sari', username: 'erp', password: 'secret', active: false });
    const stored = readFileSync(join(root, '.runtime', 'external-db.json'), 'utf8');
    expect(stored).not.toContain('secret');
    expect(JSON.parse(stored)).not.toHaveProperty('password');
  });
});
