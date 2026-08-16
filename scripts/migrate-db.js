'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function statements(sql) {
  const withoutComments = sql.replace(/^\s*--.*$/gm, '').trim();
  const result = [];
  let current = '', quote = null, escaped = false;
  for (const character of withoutComments) {
    if (escaped) { current += character; escaped = false; continue; }
    if (character === '\\') { current += character; escaped = true; continue; }
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') { quote = character; current += character; continue; }
    if (character === ';') { if (current.trim()) result.push(current.trim()); current = ''; }
    else current += character;
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

async function applyFile(connection, file, recordMigration = true) {
  const name = path.basename(file);
  if (recordMigration) {
    const [rows] = await connection.execute('SELECT name FROM schema_migrations WHERE name = ?', [name]);
    if (rows.length) { console.log(`[DB] ${name} already applied`); return; }
  }
  console.log(`[DB] Applying ${name}...`);
  for (const statement of statements(fs.readFileSync(file, 'utf8'))) await connection.query(statement);
  if (recordMigration) await connection.execute('INSERT INTO schema_migrations(name) VALUES (?)', [name]);
  console.log(`[DB] Applied ${name}`);
}

async function main() {
  const required = ['SARI_DB_HOST', 'SARI_DB_NAME', 'SARI_DB_USER', 'SARI_DB_PASSWORD'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw Error(`Missing environment variables: ${missing.join(', ')}`);
  const connection = await mysql.createConnection({
    host: process.env.SARI_DB_HOST, port: Number(process.env.SARI_DB_PORT || 3306),
    database: process.env.SARI_DB_NAME, user: process.env.SARI_DB_USER, password: process.env.SARI_DB_PASSWORD,
    ssl: process.env.SARI_DB_SSL === 'true' ? { rejectUnauthorized: process.env.SARI_DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
    charset: 'utf8mb4'
  });
  try {
    const [base] = await connection.execute("SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", ['products']);
    if (!Number(base[0].count)) {
      console.log('[DB] Empty target detected; applying canonical base schema.');
      await applyFile(connection, path.join(__dirname, '..', 'sql', 'schema.sql'), false);
    }
    await connection.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) NOT NULL PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    const directory = path.join(__dirname, '..', 'sql', 'migrations');
    for (const name of fs.readdirSync(directory).filter((name) => name.endsWith('.sql')).sort()) {
      await applyFile(connection, path.join(directory, name));
    }
  } finally { await connection.end(); }
}

if (require.main === module) main().catch((error) => { console.error(`[DB] Migration failed: ${error.message}`); process.exitCode = 1; });
module.exports = { statements };
