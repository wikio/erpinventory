import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ExternalDatabaseManager, STORE_TABLES, snakeToCamel, sourceValue, connectionError, withTimeout } = require('../external-db.js');
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

  it('covers every external IndexedDB entity mapping', () => {
    expect(Object.keys(STORE_TABLES)).toHaveLength(65);
    expect(new Set(Object.values(STORE_TABLES)).size).toBeGreaterThan(60);
  });

  it('enforces a hard deadline even when a driver never settles', async () => {
    await expect(withTimeout(new Promise(()=>{}),20,'Test connector')).rejects.toMatchObject({code:'ETIMEDOUT'});
  });

  it('explains that a successful test must still be saved before preflight', async () => {
    const root=mkdtempSync(join(tmpdir(),'sari-db-'));temporaryRoots.push(root);const repository=new ExternalDatabaseManager(root);
    repository.config={type:'indexeddb',active:false};
    await expect(repository.migrationPreflight()).rejects.toMatchObject({code:'DB_NOT_CONFIGURED'});
  });

  it('classifies actionable connection failures', () => {
    expect(connectionError({code:'ECONNREFUSED',message:'connect failed'},{type:'mysql',host:'db',port:3306}).message).toMatch(/Connexion refusée/);
    expect(connectionError({code:'28P01',message:'password authentication failed'},{type:'postgresql'}).message).toMatch(/mot de passe PostgreSQL/);
    expect(connectionError({name:'MongoServerSelectionError',message:'timed out'},{type:'mongodb'}).message).toMatch(/MongoDB/);
  });

  it('keeps live UI secrets in server memory and exposes diagnostics safely', () => {
    const root=mkdtempSync(join(tmpdir(),'sari-db-'));temporaryRoots.push(root);const repository=new ExternalDatabaseManager(root);
    repository.sessionSecrets.set('mysql','memory-only');repository.config={type:'mysql',host:'db',port:3306,database:'sari',username:'erp',active:true};
    expect(repository.effectiveConfig().password).toBe('memory-only');
    repository.log('info','connection.attempt','Testing',{host:'db'});
    expect(repository.diagnosticLog(0)[0]).toMatchObject({event:'connection.attempt',message:'Testing'});
    expect(repository.publicConfig()).toMatchObject({hasPassword:true,secretsSource:'server-memory'});
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
