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
  barcodeLabelSettings: 'barcode_label_settings',
  cnasDeclarations: 'cnas_declarations', cnasPayments: 'cnas_payments',
  casnosDeclarations: 'casnos_declarations', casnosPayments: 'casnos_payments',
  shareholders: 'shareholders', shareholderHistory: 'shareholder_history', companyRegisters: 'company_registers',
  socialAccounts: 'social_accounts', companyMinutes: 'company_minutes', tradeRegisters: 'trade_registers',
  tradeRegisterHistory: 'trade_register_history', commerceRequests: 'commerce_requests'
});

const FOREIGN_TABLES = Object.freeze({
  warehouse_id: 'warehouses', supplier_id: 'suppliers', customer_id: 'customers', product_id: 'products',
  lot_id: 'product_lots', bank_id: 'banks', bank_account_id: 'bank_accounts', vat_rate_id: 'vat_rates',
  tender_id: 'tenders', linked_tender_id: 'tenders', job_posting_id: 'job_postings', employee_id: 'employees',
  assignee_id: 'employees', stage_id: 'task_stages', template_id: 'checklist_templates',
  tax_record_id: 'tax_records', conversation_id: 'conversations', user_id: 'users', sender_user_id: 'users',
  shareholder_id: 'shareholders', trade_register_id: 'trade_registers'
});

const SOURCE_ALIASES = Object.freeze({
  user_name: ['user', 'userName'], user_role: ['role', 'userRole'], is_read: ['isRead'],
  legacy_uid: ['id'], display_order: ['order'], option_value: ['value'], sort_order: ['order', 'sortOrder'], name_json: ['name', 'nameI18n', 'label'], label_json: ['label'], items_json: ['items'],
  document_code: ['documentCode', 'code'], period_key: ['periodKey'], counter_value: ['counterValue', 'value'],
  discount_value: ['discountValue', 'value'], effective_date: ['effectiveDate', 'validFrom'], expiration_date: ['expirationDate', 'validTo'],
  lines_json: ['lines'], documents_json: ['documents'], objectives_json: ['objectives'],
  prerequisites_json: ['prerequisites'], custom_translations_json: ['customTranslations'],
  sub_type_options_json: ['subTypeOptions'], participant_user_ids_json: ['participantUserIds'],
  read_by_user_ids_json: ['readBy', 'readByUserIds'], linked_product_ids_json: ['linkedProductIds'],
  linked_sales_ids_json: ['linkedSalesDocumentIds', 'linkedSalesIds'], client_ids_json: ['clientIds'],
  endpoint_json: ['endpoints'], permissions_json: ['permissions'], overrides_json: ['overrides'],
  metadata_json: ['metadata'], versions_json: ['versions'], elements_json: ['elements'],
  links_json: ['links'], tags_json: ['tags'], attachments_json: ['attachments'],
  employee_entries_json: ['employeeEntries'], shareholder_entries_json: ['shareholderEntries'],
  related_invoice_ids_json: ['relatedInvoiceIds'], register_ids_json: ['registerIds'], participants_json: ['participants'],
  shareholder_ids_json: ['shareholderIds'], resolutions_json: ['resolutions'], snapshot_json: ['snapshot'],
  declaration_uid: ['declarationId'], pv_type: ['pvType'], request_type: ['requestType'],
  template_html: ['templateHtml'], template_html_i18n_json: ['templateHtmlI18n'],
  type: ['type','documentType'], file_name: ['fileName','name'], file_size: ['fileSize','size'], expires_at: ['expiresAt','expirationDate']
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

function relationalSourceValue(table, record, column) {
  let value = sourceValue(record, column);
  if (table === 'sequence_counters') {
    if (column === 'document_code') value = record.documentCode || record.code || String(record.id || '').split(':')[0];
    if (column === 'period_key') value = record.periodKey || String(record.id || '').split(':').slice(1).join(':') || 'all';
    if (column === 'counter_value') value = Number(record.counterValue ?? record.value ?? 0);
  }
  if (table === 'coupons') {
    if (column === 'name_json' && (value === undefined || typeof value === 'string')) {
      const label = value || record.label || record.code || 'Coupon'; value = { fr: label, ar: label, en: label };
    }
    if (column === 'discount_expression' && value === undefined) value = record.discountExpression || (record.discountType === 'percentage' ? `${record.value || 0}%` : String(record.value || 0));
    if (column === 'discount_value') value = Number(record.discountValue ?? record.value ?? 0);
    if (column === 'effective_date') value = record.effectiveDate || record.validFrom || new Date().toISOString().slice(0,10);
    if (column === 'expiration_date') value = record.expirationDate || record.validTo || '2099-12-31';
  }
  if (table === 'roles') {
    if (column === 'code') value = record.code || record.id;
    if (column === 'name') value = record.name || record.code || record.id;
    if (column === 'permissions_json') value = record.permissions || [];
  }
  return value;
}

function databaseValue(value, column) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return value === '' ? null : value;
  if (['json','jsonb'].includes(column.dataType) || column.name.endsWith('_json')) return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function withTimeout(promise, timeoutMs, label = 'Operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`${label} interrompue après ${Math.round(timeoutMs / 1000)} secondes.`);
      error.code = 'ETIMEDOUT';
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function connectionError(error, config = {}) {
  const code = String(error?.code || error?.name || 'CONNECTION_ERROR');
  const messages = {
    ENOTFOUND: 'Hôte introuvable. Vérifiez le nom DNS ou l’adresse du serveur.',
    EAI_AGAIN: 'Résolution DNS temporairement indisponible.',
    ECONNREFUSED: 'Connexion refusée. Vérifiez le port, le pare-feu et que le service est démarré.',
    ETIMEDOUT: 'Délai de connexion dépassé. Vérifiez le réseau, le pare-feu et la liste blanche.',
    ESOCKETTIMEDOUT: 'Délai de connexion dépassé.',
    ER_ACCESS_DENIED_ERROR: 'Identifiant ou mot de passe MySQL incorrect.',
    ER_BAD_DB_ERROR: 'La base MySQL demandée n’existe pas.',
    '28P01': 'Identifiant ou mot de passe PostgreSQL incorrect.',
    '3D000': 'La base PostgreSQL demandée n’existe pas.',
    MongoServerSelectionError: 'Aucun serveur MongoDB joignable dans le délai imparti.',
    MongoServerError: 'MongoDB a refusé la connexion ou l’opération.'
  };
  const detail = messages[code] || error?.message || 'Échec de connexion inconnu.';
  const wrapped = new Error(`${detail}${error?.message && detail !== error.message ? ` Détail: ${error.message}` : ''}`);
  wrapped.code = code;
  wrapped.driver = config.type;
  wrapped.target = config.host ? `${config.host}:${config.port}` : '';
  wrapped.hint = messages[code] || '';
  return wrapped;
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
    this.sessionSecrets = new Map();
    this.diagnostics = [];
    this.diagnosticSequence = 0;
  }

  log(level, event, message, details = {}) {
    const entry = { id: ++this.diagnosticSequence, timestamp: new Date().toISOString(), level, event, message, details };
    this.diagnostics.push(entry);
    if (this.diagnostics.length > 500) this.diagnostics.splice(0, this.diagnostics.length - 500);
    return entry;
  }

  diagnosticLog(since = 0) { return this.diagnostics.filter(entry => entry.id > Number(since || 0)); }
  clearDiagnostics() { this.diagnostics.length = 0; return { cleared: true }; }

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
      password: this.secret('SARI_DB_PASSWORD', (transientSecret ? input.password : '') || this.sessionSecrets.get(type) || ''),
      ssl: input.ssl === undefined ? Boolean(current.ssl || process.env.SARI_DB_SSL === 'true') : Boolean(input.ssl),
      active: input.active === undefined ? Boolean(current.active) : Boolean(input.active),
      poolSize: Number(process.env.SARI_DB_POOL_SIZE || input.poolSize || current.poolSize || 10),
      updatedAt: new Date().toISOString()
    };
    if (!config.host || !config.database) throw Error('Database host and name are required');
    if (config.active && !config.password && (type !== 'mongodb' || config.username)) {
      throw Error('Un mot de passe est requis pour activer cette connexion. Saisissez-le ou définissez SARI_DB_PASSWORD; il ne sera jamais écrit dans .runtime.');
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
      ssl: Boolean(c.ssl || process.env.SARI_DB_SSL === 'true'), poolSize: Number(c.poolSize || process.env.SARI_DB_POOL_SIZE || 10),
      active: Boolean(c.active || process.env.SARI_DB_ACTIVE === 'true'),
      hasPassword: Boolean(process.env.SARI_DB_PASSWORD || this.sessionSecrets.get(c.type)),
      secretsSource: process.env.SARI_DB_PASSWORD ? 'environment' : this.sessionSecrets.get(c.type) ? 'server-memory' : 'none',
      pooled: true, normalized: true,
      readReplicaConfigured: Boolean(process.env.SARI_DB_REPLICA_HOST), updatedAt: c.updatedAt || null
    };
  }

  async test(input = {}) {
    const config = this.effectiveConfig(input, { transientSecret: true });
    const started = Date.now(), target = `${config.host}:${config.port}/${config.database}`, timeoutMs = Number(process.env.SARI_DB_TEST_TIMEOUT_MS || 12000);
    this.log('info', 'connection.attempt', `Test ${config.type} vers ${target}`, { type: config.type, host: config.host, port: config.port, database: config.database, username: config.username, ssl: config.ssl, timeoutMs });
    try {
      const probe = async () => {
        let serverVersion = '';
        if (config.type === 'mysql') {
          this.log('info', 'connection.step', 'Chargement du pilote MySQL et ouverture du socket.', { target });
          const mysql = require('mysql2/promise');
          const connection = await mysql.createConnection(this.mysqlOptions(config));
          try { const [rows] = await connection.execute('SELECT VERSION() AS version, DATABASE() AS databaseName'); serverVersion = rows[0]?.version || ''; }
          finally { await connection.end().catch(() => {}); }
        } else if (config.type === 'postgresql') {
          this.log('info', 'connection.step', 'Chargement du pilote PostgreSQL et négociation de session.', { target });
          const { Client } = require('pg'), connection = new Client(this.pgOptions(config));
          try { await connection.connect(); const result = await connection.query('SELECT version() AS version, current_database() AS "databaseName"'); serverVersion = result.rows[0]?.version || ''; }
          finally { await connection.end().catch(() => {}); }
        } else {
          this.log('info', 'connection.step', 'Sélection du serveur MongoDB et commande ping.', { target });
          const { MongoClient } = require('mongodb'), client = new MongoClient(this.mongoUri(config), { serverSelectionTimeoutMS: Math.min(timeoutMs - 1000, 10000), connectTimeoutMS: Math.min(timeoutMs - 1000, 10000), socketTimeoutMS: Math.min(timeoutMs - 1000, 10000) });
          try { await client.connect(); await client.db(config.database).command({ ping: 1 }); try { const build = await client.db(config.database).admin().command({ buildInfo: 1 }); serverVersion = build.version || ''; } catch (_) { serverVersion = 'MongoDB (version non autorisée)'; } }
          finally { await client.close().catch(() => {}); }
        }
        return serverVersion;
      };
      const serverVersion = await withTimeout(probe(), timeoutMs, `Test ${config.type}`);
      const result = { success: true, type: config.type, target, database: config.database, latencyMs: Date.now() - started, message: `Connexion ${config.type} réussie`, serverVersion, pooled: true };
      this.log('success', 'connection.success', result.message, { target, latencyMs: result.latencyMs, serverVersion });
      return result;
    } catch (error) {
      const normalized = connectionError(error, config);
      this.log('error', 'connection.failure', normalized.message, { type: config.type, target, code: normalized.code, hint: normalized.hint, latencyMs: Date.now() - started });
      throw normalized;
    }
  }

  async configure(input) {
    const config = this.effectiveConfig(input, { transientSecret: true });
    await this.test(input);
    const { password, ...safe } = config;
    await this.close();
    if (password) this.sessionSecrets.set(config.type, password);
    this.save(safe);
    this.log('success', 'configuration.saved', `Configuration ${config.type} activée pour ${config.host}:${config.port}.`, { type: config.type, active: config.active, secretsSource: password ? 'server-memory' : 'environment' });
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

  async ensurePostgresTable(client, table) {
    const result = await client.query('SELECT column_name AS name, data_type AS "dataType" FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1', [table]);
    if (!result.rows.length) {
      await client.query(`CREATE TABLE IF NOT EXISTS "${table}" (id BIGINT PRIMARY KEY, legacy_uid TEXT UNIQUE, reference_code TEXT, payload_json JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
      this.log('info', 'migration.schema.created', `Table PostgreSQL ${table} créée avec l’enveloppe JSONB par entité.`, { table });
      const refreshed = await client.query('SELECT column_name AS name, data_type AS "dataType" FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1', [table]);
      return refreshed.rows;
    }
    return result.rows;
  }

  async pgColumns(client, table) {
    const key = `postgresql:${table}`;
    if (this.columns.has(key)) return this.columns.get(key);
    const columns = await this.ensurePostgresTable(client, table);
    this.columns.set(key, columns);
    return columns;
  }

  async resolvePostgresForeignId(client, columnName, value) {
    if (value === undefined || value === null || value === '') return value;
    if (Number.isInteger(Number(value)) && String(value).trim() !== '') return Number(value);
    const target = FOREIGN_TABLES[columnName];
    if (!target) return value;
    const columns = await this.pgColumns(client, target);
    const searchable = ['legacy_uid', 'reference_code', 'username', 'code'].filter(name => columns.some(column => column.name === name));
    if (!searchable.length) return null;
    const values = searchable.map(name => target==='users'&&name==='username'?String(value).replace(/^usr-/,''):String(value));
    const query = `SELECT id FROM "${target}" WHERE ${searchable.map((name,index) => `"${name}" = $${index+1}`).join(' OR ')} LIMIT 1`;
    const result = await client.query(query, values);
    return result.rows[0]?.id ?? null;
  }

  async postgresRecord(client, table, record, metadata) {
    const names = [], values = [];
    for (const column of metadata) {
      let value;
      if (column.name === 'id') value = Number(record.numericId);
      else if (column.name === 'payload_json') value = record;
      else value = relationalSourceValue(table, record, column.name);
      if (value === undefined || column.name === 'updated_at') continue;
      if (column.name.endsWith('_id')) value = await this.resolvePostgresForeignId(client, column.name, value);
      value = databaseValue(value, column);
      names.push(column.name); values.push(value);
    }
    if (!Number.isInteger(Number(record.numericId)) || Number(record.numericId) < 1) throw Error('numericId is required for normalized migration');
    const referenceIndex=names.indexOf('reference_code');
    if(referenceIndex>=0&&values[referenceIndex])await client.query(`UPDATE "${table}" SET reference_code='__SARI_RESEQ__'||id::text||'_'||EXTRACT(EPOCH FROM NOW())::bigint::text WHERE reference_code=$1 AND id<>$2`,[values[referenceIndex],Number(record.numericId)]);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
    const updates = names.filter(name => name !== 'id').map(name => `"${name}"=EXCLUDED."${name}"`).join(',');
    await client.query(`INSERT INTO "${table}" (${names.map(name => `"${name}"`).join(',')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updates || 'id=EXCLUDED.id'}`, values);
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
      searchable.map(name => target==='users'&&name==='username'?String(value).replace(/^usr-/,''):String(value))
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
      else value = relationalSourceValue(table, record, column.name);
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
    const referenceIndex=names.indexOf('reference_code');
    if(referenceIndex>=0&&values[referenceIndex])await connection.execute(`UPDATE \`${table}\` SET reference_code=CONCAT('__SARI_RESEQ__',id,'_',UNIX_TIMESTAMP()) WHERE reference_code=? AND id<>?`,[values[referenceIndex],Number(record.numericId)]);
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
          result.migratedIds.push(Number(record.numericId));
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
    const table = this.tableFor(storeName), client = await this.getPgPool(false).connect();
    try {
      await client.query('BEGIN');
      const metadata = await this.pgColumns(client, table);
      for (const record of records) {
        await client.query('SAVEPOINT sari_record');
        try {
          await this.postgresRecord(client, table, record, metadata);
          await client.query('RELEASE SAVEPOINT sari_record');
          result.migrated++;
          result.migratedIds.push(Number(record.numericId));
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
    await collection.createIndex({legacyUid:1},{unique:true,sparse:true,name:'uq_legacy_uid'});
    await collection.createIndex({referenceCode:1},{sparse:true,name:'idx_reference_code'});
    for (const record of records) {
      try {
        await collection.updateOne({ _id: Number(record.numericId) }, { $set: { ...record, legacyUid: record.id, updatedAt: record.updatedAt || new Date().toISOString() }, $setOnInsert: { _id: Number(record.numericId) } }, { upsert: true });
        result.migrated++;
        result.migratedIds.push(Number(record.numericId));
      } catch (error) {
        result.failed.push({ id: record.id, numericId: record.numericId, code: error.code || 'MIGRATION_ERROR', reason: error.message });
      }
    }
  }

  async verifyMigratedIds(type, table, ids) {
    if (!ids.length) return 0;
    if (type === 'mysql') {
      const placeholders=ids.map(()=>'?').join(','),[rows]=await this.getMySqlPool(false).execute(`SELECT COUNT(*) AS count FROM \`${table}\` WHERE id IN (${placeholders})`,ids);
      return Number(rows[0]?.count||0);
    }
    if (type === 'postgresql') {
      const result=await this.getPgPool(false).query(`SELECT COUNT(*)::int AS count FROM "${table}" WHERE id = ANY($1::bigint[])`,[ids]);
      return Number(result.rows[0]?.count||0);
    }
    const client=await this.getMongo();
    return client.db(this.effectiveConfig().database).collection(table).countDocuments({_id:{$in:ids}});
  }

  async migrationPreflight() {
    const saved=this.publicConfig();
    if(!['mysql','postgresql','mongodb'].includes(saved.type)){
      const error=new Error('Aucune base externe n’est enregistrée. Un test réussi ne sauvegarde pas la cible : sélectionnez « Backend actif : Oui », puis cliquez sur « Tester & enregistrer ».');
      error.code='DB_NOT_CONFIGURED';error.hint='Enregistrez et activez MySQL, PostgreSQL ou MongoDB avant la prévalidation.';throw error;
    }
    if(!saved.active){const error=new Error(`La cible ${saved.type} est enregistrée mais inactive.`);error.code='DB_NOT_ACTIVE';error.hint='Sélectionnez « Backend actif : Oui », puis enregistrez la configuration.';throw error;}
    const config=this.effectiveConfig(),target=`${config.host}:${config.port}/${config.database}`;
    this.log('info','migration.preflight',`Prévalidation ${config.type} vers ${target}.`,{type:config.type,target,mappings:Object.keys(STORE_TABLES).length});
    await this.test({ ...config, password: config.password, active: config.active });
    let missing=[],missingMigrations=[];
    if(config.type==='mysql'){
      const pool=this.getMySqlPool(false),placeholders=Object.values(STORE_TABLES).map(()=>'?').join(','),[rows]=await pool.execute(`SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${placeholders})`,Object.values(STORE_TABLES));
      const existing=new Set(rows.map(row=>row.name));missing=[...new Set(Object.values(STORE_TABLES))].filter(table=>!existing.has(table));
      const required=['002_normalized_domains.sql','003_fiscal_management.sql','004_migration_reference_integrity.sql','005_reference_order_sequence.sql','006_identity_ged_extensions.sql','007_social_trade_governance.sql'];
      try{const[migrations]=await pool.execute('SELECT name FROM schema_migrations');const applied=new Set(migrations.map(row=>row.name));missingMigrations=required.filter(name=>!applied.has(name));}catch(_){missingMigrations=required;}
    }else if(config.type==='postgresql'){
      const result=await this.getPgPool(false).query('SELECT table_name AS name FROM information_schema.tables WHERE table_schema=current_schema()');const existing=new Set(result.rows.map(row=>row.name));missing=[...new Set(Object.values(STORE_TABLES))].filter(table=>!existing.has(table));
    }
    const ready=config.type!=='mysql'||(missing.length===0&&missingMigrations.length===0),result={ready,type:config.type,target,mappedStores:Object.keys(STORE_TABLES).length,missingTables:missing,missingMigrations,autoCreateCollections:config.type==='mongodb',autoCreateEntityTables:config.type==='postgresql',message:ready?'Cible prête pour la migration.':`${missing.length} table(s) et ${missingMigrations.length} migration(s) MySQL manquante(s). Exécutez npm run db:migrate, puis prévalidez à nouveau.`};
    this.log(ready?'success':'warning','migration.preflight.result',result.message,result);
    return result;
  }

  async migrateBatch(storeName, records) {
    if (!this.publicConfig().active) throw Error('External database is not active');
    if (!Array.isArray(records)) throw Error('records must be an array');
    const ids=records.map(record=>Number(record.numericId)),uniqueIds=new Set(ids);
    if(ids.some(id=>!Number.isInteger(id)||id<1)||uniqueIds.size!==ids.length){const error=new Error(`Le lot ${storeName} contient des numericId absents ou dupliqués. Rechargez l’application pour réparer les identifiants locaux, puis relancez la migration.`);error.code='DUPLICATE_NUMERIC_ID';throw error;}
    const startedAt = new Date(), table=this.tableFor(storeName),type=this.effectiveConfig().type;
    const result = { runId: `migration-${startedAt.getTime()}-${storeName}`, store: storeName, table, type, attempted: records.length, migrated: 0, verified: 0, failed: [], migratedIds: [], startedAt: startedAt.toISOString() };
    this.log('info','migration.batch.start',`Migration de ${records.length} enregistrement(s) ${storeName} vers ${type}.${table}.`,{runId:result.runId,store:storeName,table,type,attempted:records.length});
    try {
      if (type === 'mysql') await this.migrateMySql(storeName, records, result);
      else if (type === 'postgresql') await this.migratePostgres(storeName, records, result);
      else await this.migrateMongo(storeName, records, result);
      for(const failure of result.failed)this.log('error','migration.record.failure',`${storeName}/${failure.id}: ${failure.reason}`,{runId:result.runId,store:storeName,table,...failure});
      result.verified=await this.verifyMigratedIds(type,table,result.migratedIds);
      if(result.verified!==result.migrated)result.failed.push({id:'batch-verification',code:'VERIFY_MISMATCH',reason:`${result.migrated} écriture(s), mais ${result.verified} vérifiée(s) dans la cible.`,table});
    } catch(error) {
      const normalized=connectionError(error,this.effectiveConfig());
      this.log('error','migration.batch.failure',normalized.message,{runId:result.runId,store:storeName,table,type,code:normalized.code});
      throw normalized;
    }
    result.completedAt = new Date().toISOString();
    result.durationMs = Date.now() - startedAt.getTime();
    result.success = result.failed.length === 0 && result.verified===result.migrated;
    delete result.migratedIds;
    this.log(result.success?'success':'warning','migration.batch.complete',`${storeName}: ${result.migrated}/${result.attempted} migré(s), ${result.verified} vérifié(s), ${result.failed.length} échec(s).`,{...result});
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

module.exports = { ExternalDatabaseManager, STORE_TABLES, snakeToCamel, sourceValue, relationalSourceValue, databaseValue, connectionError, withTimeout };
