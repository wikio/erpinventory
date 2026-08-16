'use strict';

const { ExternalDatabaseManager } = require('../external-db');

async function main() {
  const argument = process.argv.find(value => value.startsWith('--type='));
  const type = (argument?.split('=')[1] || process.env.SARI_DB_TYPE || '').toLowerCase();
  if (!['mysql','postgresql','mongodb'].includes(type)) throw Error('Use --type=mysql, --type=postgresql or --type=mongodb');
  const config = {
    type, host: process.env.SARI_DB_HOST, port: Number(process.env.SARI_DB_PORT || ({mysql:3306,postgresql:5432,mongodb:27017}[type])),
    database: process.env.SARI_DB_NAME, username: process.env.SARI_DB_USER || '', password: process.env.SARI_DB_PASSWORD || '',
    ssl: process.env.SARI_DB_SSL === 'true', active: true
  };
  if (!config.host || !config.database) throw Error('SARI_DB_HOST and SARI_DB_NAME are required');
  const manager = new ExternalDatabaseManager(process.cwd()), numericId = 9_000_000_000 + Math.floor(Math.random()*100_000);
  try {
    console.log(`[validate] Real ${type} connection test...`);
    console.log(await manager.test(config));
    manager.sessionSecrets.set(type,config.password);
    manager.config={...config,password:undefined};delete manager.config.password;
    console.log('[validate] Migration preflight...');
    const preflight=await manager.migrationPreflight();console.log(preflight);
    if(!preflight.ready)throw Error(preflight.message);
    console.log('[validate] Idempotent fixture migration and target verification...');
    const fixture={id:`connector-validation-${Date.now()}`,numericId,reportTab:'connector-validation',html:`Validated ${type}`,updatedBy:'validation-script',updatedAt:new Date().toISOString()};
    const result=await manager.migrateBatch('reportAnnotations',[fixture]);console.log(result);
    if(!result.success||result.verified!==1)throw Error(`End-to-end verification failed: ${JSON.stringify(result)}`);
    await manager.deleteRecord('reportAnnotations',numericId);
    console.log(`[validate] ${type} connection, migration, verification and cleanup succeeded.`);
  } finally { await manager.close(); }
}

main().catch(error=>{console.error(`[validate] FAILED: ${error.message}`);process.exitCode=1;});
