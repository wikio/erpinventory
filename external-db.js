'use strict';

const fs = require('fs');
const path = require('path');

const STORE_TABLES = Object.freeze({
  products: 'products', warehouses: 'warehouses', suppliers: 'suppliers', shipments: 'shipments',
  tenders: 'tenders', customers: 'customers', orders: 'orders', notifications: 'notifications',
  settings: 'app_settings', auditLogs: 'audit_logs', checklistItems: 'checklist_items',
  checklistTemplates: 'checklist_templates', documents: 'ged_documents', employees: 'employees',
  missions: 'missions', jobPostings: 'job_postings', candidates: 'candidates', tasks: 'tasks',
  taskStages: 'task_stages', roles: 'roles', documentTemplates: 'document_templates',
  vatRates: 'vat_rates', documentCodes: 'document_codes', sequenceCounters: 'sequence_counters',
  conversations: 'conversations', messages: 'messages', careerRecords: 'career_records',
  purchaseDocuments: 'purchase_documents', documentLinks: 'document_links',
  paymentMethods: 'payment_methods', banks: 'banks', bankAccounts: 'bank_accounts', coupons: 'coupons',
  referrals: 'referrals', taxRecords: 'tax_records', g50Payments: 'g50_payments', attendance: 'attendance',
  performanceRecords: 'performance_records', salaryHistory: 'salary_history', taskHistory: 'task_history',
  clientTypes: 'client_types', supplierTypes: 'supplier_types', bankTypes: 'bank_types',
  countries: 'countries', productCategories: 'product_categories', salesStages: 'sales_stages',
  productLots: 'product_lots', stockMovements: 'stock_movements', inventoryCounts: 'inventory_counts',
  importProfiles: 'import_profiles', apiTokens: 'api_tokens', apiEndpoints: 'api_endpoints',
  logisticsStatuses: 'logistics_statuses', incoterms: 'incoterms',
  paymentTransactions: 'payment_transactions', reportAnnotations: 'report_annotations',
  entityTranslations: 'entity_translations', translationTexts: 'translation_texts',
  gedCategories: 'ged_categories', gedModules: 'ged_modules', gedTags: 'ged_tags', gedTypes: 'ged_types',
  configurableOptions: 'configurable_options', userProfiles: 'user_profiles',
  barcodeLabelSettings: 'barcode_label_settings'
});

const FOREIGN_TABLES = Object.freeze({
  warehouse_id: 'warehouses', supplier_id: 'suppliers', customer_id: 'customers', product_id: 'products',
  lot_id: 'product_lots', bank_id: 'banks', bank_account_id: 'bank_accounts', vat_rate_id: 'vat_rates',
  tender_id: 'tenders', linked_tender_id: 'tenders', job_posting_id: 'job_postings', employee_id: 'employees',
  assignee_id: 'employees', stage_id: 'task_stages', template_id: 'checklist_templates',
  tax_record_id: 'tax_records', conversation_id: 'conversations', user_id: 'users', sender_user_id: 'users'
});

const SOURCE_ALIASES = Object.freeze({
  user_name: ['user', 'userName'], user_role: ['role', 'userRole'], is_read: ['isRead'],
  legacy_uid: ['id'], option_value: ['value'], sort_order: ['order', 'sortOrder'], name_json: ['name'], label_json: ['label'], items_json: ['items'],
  lines_json: ['lines'], documents_json: ['documents'], objectives_json: ['objectives'],
  prerequisites_json: ['prerequisites'], custom_translations_json: ['customTranslations'],
  sub_type_options_json: ['subTypeOptions'], participant_user_ids_json: ['participantUserIds'],
  read_by_user_ids_json: ['readBy', 'readByUserIds'], linked_product_ids_json: ['linkedProductIds'],
  linked_sales_ids_json: ['linkedSalesDocumentIds', 'linkedSalesIds'], client_ids_json: ['clientIds'],
  endpoint_json: ['endpoints'], permissions_json: ['permissions'], overrides_json: ['overrides'],
  metadata_json: ['metadata'], versions_json: ['versions'], elements_json: ['elements'],
  links_json: ['links'], tags_json: ['tags'], attachments_json: ['attachments']
});

function snakeToCamel(value) {
  return value.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

function sourceValue(record, column) {
  for (const key of SOURCE_ALIASES[column] || []) if (record[key] !== undefined) return record[key];
  const direct = snakeToCamel(column);
  if (record[direct] !== undefined) return record[direct];
  if (column.endsWith('_json')) {
    const base = snakeToCamel(column.slice(0, -5));
    if (record[base] !== undefined) return record[base];
  }
  return undefined;
}

function databaseValue(value, column) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return value === '' ? null : value;
  if (column.dataType === 'json' || column.name.endsWith('_json')) return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

class ExternalDatabaseManager {
  constructor(root) {
    this.root = root;
    this.runtime = path.join(root, '.runtime');
    this.configFile = path.join(this.runtime, 'external-db.json');
    this.config = this.load();
    this.mysqlPools = new Map();
    this.pgPools = new Map();
    this.mongoClient = null;
    this.columns = new Map();
  }

  load() {
    try {
      const value = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      delete value.password;
      return value;
    } catch (_) {
      return { type: process.env.SARI_DB_TYPE || 'indexeddb', active: process.env.SARI_DB_ACTIVE === 'true' };
    }
  }

  save(config) {
    fs.mkdirSync(this.runtime, { recursive: true });
    const safe = { ...config };
    delete safe.password;
    fs.writeFileSync(this.configFile, JSON.stringify(safe, null, 2), { mode: 0o600 });
    this.config = safe;
  }

  secret(name, fallback = '') {
    return String(process.env[name] || fallback);
  }

  effectiveConfig(input = {}, { transientSecret = false } = {}) {
    const current = this.config || {};
    const type = String(input.type || process.env.SARI_DB_TYPE || current.type || '').toLowerCase();
    const ports = { mysql: 3306, postgresql: 5432, mongodb: 27017 };
    if (!['mysql', 'postgresql', 'mongodb'].includes(type)) throw Error('Unsupported database type');
    const config = {
      type,
      host: String(input.host || process.env.SARI_DB_HOST || current.host || '').trim(),
      port: Number(input.port || process.env.SARI_DB_PORT || current.port || ports[type]),
      database: String(input.database || process.env.SARI_DB_NAME || current.database || '').trim(),
      username: String(input.username || process.env.SARI_DB_USER || current.username || '').trim(),
      password: this.secret('SARI_DB_PASSWORD', transientSecret ? input.password : ''),
      ssl: input.ssl === undefined ? Boolean(current.ssl || process.env.SARI_DB_SSL === 'true') : Boolean(input.ssl),
      active: input.active === undefined ? Boolean(current.active) : Boolean(input.active),
      poolSize: Number(process.env.SARI_DB_POOL_SIZE || input.poolSize || current.poolSize || 10),
      updatedAt: new Date().toISOString()
    };
    if (!config.host || !config.database) throw Error('Database host and name are required');
    if (config.active && !config.password && type !== 'mongodb') {
      throw Error('Set SARI_DB_PASSWORD in the server environment before activating external persistence. Secrets are never stored in .runtime.');
    }
    return config;
  }

  publicConfig() {
    const c = this.config || {};
    return {
      configured: Boolean((c.host || process.env.SARI_DB_HOST) && (c.database || process.env.SARI_DB_NAME)),
      type: c.type || process.env.SARI_DB_TYPE || 'indexeddb',
      host: c.host || process.env.SARI_DB_HOST || '', port: c.port || process.env.SARI_DB_PORT || '',
      database: c.database || process.env.SARI_DB_NAME || '', username: c.username || process.env.SARI_DB_USER || '',
      active: Boolean(c.active || process.env.SARI_DB_ACTIVE === 'true'),
      hasPassword: Boolean(process.env.SARI_DB_PASSWORD), secretsSource: 'environment',
      pooled: true, normalized: true,
      readReplicaConfigured: Boolean(process.env.SARI_DB_REPLICA_HOST), updatedAt: c.updatedAt || null
    };
  }

  async test(input) {
    const config = this.effectiveConfig(input, { transientSecret: true });
    const started = Date.now();
    if (config.type === 'mysql') {
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection(this.mysqlOptions(config));
      try { await connection.execute('SELECT 1'); } finally { await connection.end(); }
    } else if (config.type === 'postgresql') {
      const { Client } = require('pg');
      const connection = new Client(this.pgOptions(config));
      await connection.connect();
      try { await connection.query('SELECT $1::int AS healthy', [1]); } finally { await connection.end(); }
    } else {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(this.mongoUri(config), { serverSelectionTimeoutMS: 7000 });
      await client.connect();
      try { await client.db(config.database).command({ ping: 1 }); } finally { await client.close(); }
    }
    return { success: true, latencyMs: Date.now() - started, message: `Connexion ${config.type} réussie`, pooled: true };
  }

  async configure(input) {
    const config = this.effectiveConfig(input, { transientSecret: true });
    await this.test(input);
    if (config.active && !process.env.SARI_DB_PASSWORD && config.type !== 'mongodb') {
      throw Error('Connection test succeeded, but activation requires SARI_DB_PASSWORD in the server environment.');
    }
    const { password, ...safe } = config;
    await this.close();
    this.save(safe);
    return this.publicConfig();
  }

  mysqlOptions(config, replica = false) {
    const prefix = replica ? 'SARI_DB_REPLICA_' : 'SARI_DB_';
    return {
      host: this.secret(`${prefix}HOST`, config.host), port: Number(this.secret(`${prefix}PORT`, config.port)),
      database: this.secret(`${prefix}NAME`, config.database), user: this.secret(`${prefix}USER`, config.username),
      password: this.secret(`${prefix}PASSWORD`, config.password),
      ssl: config.ssl ? { rejectUnauthorized: process.env.SARI_DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
      connectTimeout: 7000, enableKeepAlive: true, keepAliveInitialDelay: 0,
      charset: 'utf8mb4', timezone: 'Z'
    };
  }

  pgOptions(config, replica = false) {
    const prefix = replica ? 'SARI_DB_REPLICA_' : 'SARI_DB_';
    return {
      host: this.secret(`${prefix}HOST`, config.host), port: Number(this.secret(`${prefix}PORT`, config.port)),
      database: this.secret(`${prefix}NAME`, config.database), user: this.secret(`${prefix}USER`, config.username),
      password: this.secret(`${prefix}PASSWORD`, config.password),
      ssl: config.ssl ? { rejectUnauthorized: process.env.SARI_DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : false,
      connectionTimeoutMillis: 7000, max: config.poolSize, idleTimeoutMillis: 30000
    };
  }

  mongoUri(config) {
    const auth = config.username ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@` : '';
    return `mongodb://${auth}${config.host}:${config.port}/${encodeURIComponent(config.database)}`;
  }

  getMySqlPool(readOnly = false) {
    const config = this.effectiveConfig();
    const replica = readOnly && Boolean(process.env.SARI_DB_REPLICA_HOST);
    const key = replica ? 'replica' : 'primary';
    if (!this.mysqlPools.has(key)) {
      const mysql = require('mysql2/promise');
      this.mysqlPools.set(key, mysql.createPool({
        ...this.mysqlOptions(config, replica), waitForConnections: true,
        connectionLimit: config.poolSize, maxIdle: config.poolSize, idleTimeout: 60000, queueLimit: 0
      }));
    }
    return this.mysqlPools.get(key);
  }

  getPgPool(readOnly = false) {
    const config = this.effectiveConfig();
    const replica = readOnly && Boolean(process.env.SARI_DB_REPLICA_HOST);
    const key = replica ? 'replica' : 'primary';
    if (!this.pgPools.has(key)) {
      const { Pool } = require('pg');
      this.pgPools.set(key, new Pool(this.pgOptions(config, replica)));
    }
    return this.pgPools.get(key);
  }

  async getMongo() {
    if (!this.mongoClient) {
      const config = this.effectiveConfig();
      const { MongoClient } = require('mongodb');
      this.mongoClient = new MongoClient(this.mongoUri(config), { maxPoolSize: config.poolSize, minPoolSize: 1 });
      await this.mongoClient.connect();
    }
    return this.mongoClient;
  }

  tableFor(storeName) {
    const table = STORE_TABLES[storeName];
    if (!table) throw Error(`Store "${storeName}" has no normalized repository mapping`);
    return table;
  }

  async mysqlColumns(connection, table) {
    const key = `mysql:${table}`;
    if (this.columns.has(key)) return this.columns.get(key);
    const [rows] = await connection.execute(
      'SELECT COLUMN_NAME AS name, DATA_TYPE AS dataType, IS_NULLABLE AS nullable, COLUMN_DEFAULT AS defaultValue FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      [table]
    );
    if (!rows.length) throw Error(`Normalized table "${table}" is missing. Run npm run db:migrate before importing IndexedDB data.`);
    this.columns.set(key, rows);
    return rows;
  }

  async resolveMySqlForeignId(connection, columnName, value) {
    if (value === undefined || value === null || value === '') return value;
    if (Number.isInteger(Number(value)) && String(value).trim() !== '') return Number(value);
    const target = FOREIGN_TABLES[columnName];
    if (!target) return value;
    const columns = await this.mysqlColumns(connection, target);
    const searchable = ['legacy_uid', 'reference_code', 'username', 'code'].filter((name) => columns.some((column) => column.name === name));
    if (!searchable.length) return null;
    const [rows] = await connection.execute(
      `SELECT id FROM \`${target}\` WHERE ${searchable.map((name) => `\`${name}\` = ?`).join(' OR ')} LIMIT 1`,
      searchable.map(() => String(value))
    );
    return rows[0]?.id ?? null;
  }

  async mysqlRecord(connection, table, record) {
    const available = await this.mysqlColumns(connection, table);
    const names = [];
    const values = [];
    for (const column of available) {
      let value;
      if (column.name === 'id') value = Number(record.numericId);
      else value = sourceValue(record, column.name);
      if (value === undefined || column.name === 'updated_at') continue;
      if (column.name.endsWith('_id')) value = await this.resolveMySqlForeignId(connection, column.name, value);
      value = databaseValue(value, column);
      if (value === undefined) continue;
      names.push(column.name);
      values.push(value);
    }
    if (!Number.isInteger(values[names.indexOf('id')]) || values[names.indexOf('id')] < 1) throw Error('numericId is required for normalized migration');
    const quoted = names.map((name) => `\`${name}\``).join(',');
    const updates = names.filter((name) => name !== 'id').map((name) => `\`${name}\`=VALUES(\`${name}\`)`).join(',');
    const sql = `INSERT INTO \`${table}\` (${quoted}) VALUES (${names.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE ${updates || '`id`=VALUES(`id`)'} `;
    await connection.execute(sql, values);
    if (table === 'orders' && Array.isArray(record.items)) await this.syncOrderItems(connection, record);
    if (table === 'purchase_documents' && Array.isArray(record.items)) await this.syncPurchaseItems(connection, record);
  }

  async syncOrderItems(connection, record) {
    const orderId = Number(record.numericId);
    await connection.execute('DELETE FROM `order_items` WHERE `order_id` = ?', [orderId]);
    for (const item of record.items) {
      const productId = await this.resolveMySqlForeignId(connection, 'product_id', item.productId);
      if (!productId) throw Error(`Order item product not found: ${item.productId || item.name}`);
      await connection.execute(
        'INSERT INTO `order_items` (`order_id`,`product_id`,`product_name`,`qty`,`unit_price`,`total`) VALUES (?,?,?,?,?,?)',
        [orderId, productId, String(item.name || ''), Number(item.qty || 1), Number(item.unitPrice || 0), Number(item.total || Number(item.qty || 1) * Number(item.unitPrice || 0))]
      );
    }
  }

  async syncPurchaseItems(connection, record) {
    const documentId = Number(record.numericId);
    await connection.execute('DELETE FROM `purchase_document_items` WHERE `purchase_document_id` = ?', [documentId]);
    for (const item of record.items) {
      const productId = item.productId ? await this.resolveMySqlForeignId(connection, 'product_id', item.productId) : null;
      await connection.execute(
        'INSERT INTO `purchase_document_items` (`purchase_document_id`,`product_id`,`product_name`,`description`,`qty`,`unit_price`,`discount_percent`,`vat_rate`,`line_total`) VALUES (?,?,?,?,?,?,?,?,?)',
        [documentId, productId, String(item.name || ''), item.description || null, Number(item.qty || 1), Number(item.unitPrice || 0), Number(item.discountPercent || 0), Number(item.vatRate ?? 0.19), Number(item.total || Number(item.qty || 1) * Number(item.unitPrice || 0))]
      );
    }
  }

  async migrateMySql(storeName, records, result) {
    const table = this.tableFor(storeName);
    const connection = await this.getMySqlPool(false).getConnection();
    try {
      await connection.beginTransaction();
      for (const record of records) {
        await connection.query('SAVEPOINT sari_record');
        try {
          await this.mysqlRecord(connection, table, record);
          await connection.query('RELEASE SAVEPOINT sari_record');
          result.migrated++;
        } catch (error) {
          await connection.query('ROLLBACK TO SAVEPOINT sari_record');
          result.failed.push({ id: record.id, numericId: record.numericId, code: error.code || 'MIGRATION_ERROR', reason: error.message, table });
        }
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async migratePostgres(storeName, records, result) {
    const table = this.tableFor(storeName);
    const client = await this.getPgPool(false).connect();
    try {
      await client.query('BEGIN');
      const metadata = await client.query(
        'SELECT column_name AS name, data_type AS "dataType" FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1', [table]
      );
      if (!metadata.rows.length) throw Error(`Normalized table "${table}" is missing`);
      for (const record of records) {
        await client.query('SAVEPOINT sari_record');
        try {
          const names = [], values = [];
          for (const column of metadata.rows) {
            const value = column.name === 'id' ? Number(record.numericId) : databaseValue(sourceValue(record, column.name), column);
            if (value !== undefined && column.name !== 'updated_at') { names.push(column.name); values.push(value); }
          }
          const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
          const updates = names.filter((name) => name !== 'id').map((name) => `"${name}"=EXCLUDED."${name}"`).join(',');
          await client.query(`INSERT INTO "${table}" (${names.map((name) => `"${name}"`).join(',')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updates || 'id=EXCLUDED.id'}`, values);
          await client.query('RELEASE SAVEPOINT sari_record');
          result.migrated++;
        } catch (error) {
          await client.query('ROLLBACK TO SAVEPOINT sari_record');
          result.failed.push({ id: record.id, numericId: record.numericId, code: error.code || 'MIGRATION_ERROR', reason: error.message, table });
        }
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async migrateMongo(storeName, records, result) {
    const client = await this.getMongo();
    const config = this.effectiveConfig();
    const collection = client.db(config.database).collection(this.tableFor(storeName));
    for (const record of records) {
      try {
        await collection.updateOne({ _id: Number(record.numericId) }, { $set: { ...record, _id: Number(record.numericId), legacyUid: record.id } }, { upsert: true });
        result.migrated++;
      } catch (error) {
        result.failed.push({ id: record.id, numericId: record.numericId, code: error.code || 'MIGRATION_ERROR', reason: error.message });
      }
    }
  }

  async migrateBatch(storeName, records) {
    if (!this.publicConfig().active) throw Error('External database is not active');
    if (!Array.isArray(records)) throw Error('records must be an array');
    const startedAt = new Date();
    const result = { runId: `migration-${startedAt.getTime()}`, store: storeName, table: this.tableFor(storeName), attempted: records.length, migrated: 0, failed: [], startedAt: startedAt.toISOString() };
    const type = this.effectiveConfig().type;
    if (type === 'mysql') await this.migrateMySql(storeName, records, result);
    else if (type === 'postgresql') await this.migratePostgres(storeName, records, result);
    else await this.migrateMongo(storeName, records, result);
    result.completedAt = new Date().toISOString();
    result.durationMs = Date.now() - startedAt.getTime();
    result.success = result.failed.length === 0;
    return result;
  }

  async deleteRecord(storeName, numericId) {
    if (!this.publicConfig().active) throw Error('External database is not active');
    const table = this.tableFor(storeName);
    const id = Number(numericId);
    if (!Number.isInteger(id) || id < 1) throw Error('A positive numericId is required');
    const type = this.effectiveConfig().type;
    if (type === 'mysql') await this.getMySqlPool(false).execute(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
    else if (type === 'postgresql') await this.getPgPool(false).query(`DELETE FROM "${table}" WHERE id = $1`, [id]);
    else {
      const client = await this.getMongo();
      await client.db(this.effectiveConfig().database).collection(table).deleteOne({ _id: id });
    }
    return { deleted: true, store: storeName, table, numericId: id };
  }

  async reportingQuery(sql, params = []) {
    if (this.effectiveConfig().type !== 'mysql') throw Error('Reporting query is currently available for MySQL repositories');
    if (!/^\s*SELECT\b/i.test(sql) || /;\s*\S/.test(sql)) throw Error('Reporting repository accepts a single SELECT statement only');
    const [rows] = await this.getMySqlPool(true).execute(sql, params);
    return rows;
  }

  async close() {
    await Promise.all([...this.mysqlPools.values()].map((pool) => pool.end()).concat([...this.pgPools.values()].map((pool) => pool.end())));
    this.mysqlPools.clear(); this.pgPools.clear(); this.columns.clear();
    if (this.mongoClient) { await this.mongoClient.close(); this.mongoClient = null; }
  }
}

module.exports = { ExternalDatabaseManager, STORE_TABLES, snakeToCamel, sourceValue, databaseValue };
