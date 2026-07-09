import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

// --- Database Connection ---
// 
// DEFAULT: SQLite (zero config, file-based)
// To switch to PostgreSQL:
//   1. npm install pg
//   2. Change DB_DRIVER to 'postgresql'
//   3. Update DATABASE_URL to postgresql://user:pass@host:5432/db
//   4. Import drizzle from 'drizzle-orm/node-postgres' instead
//

const DB_DRIVER = process.env.DB_DRIVER || 'sqlite';
const DATABASE_URL = process.env.DATABASE_URL || './data/sentinel.db';

function createConnection() {
  if (DB_DRIVER === 'sqlite') {
    // Ensure directory exists
    if (DATABASE_URL.startsWith('./') || DATABASE_URL.startsWith('/')) {
      const dir = dirname(DATABASE_URL);
      try { mkdirSync(dir, { recursive: true }); } catch { /* exists */ }
    }
    
    const client = new Database(DATABASE_URL);
    return drizzle(client, { schema });
  }
  
  // PostgreSQL branch — install 'pg' and use:
  // import { Pool } from 'pg';
  // import { drizzle } from 'drizzle-orm/node-postgres';
  // const pool = new Pool({ connectionString: DATABASE_URL });
  // return drizzle(pool, { schema });
  
  throw new Error(`Unsupported DB_DRIVER: ${DB_DRIVER}. Use 'sqlite' or 'postgresql'`);
}

export const db = createConnection();

// Seed default data
export function seedDefaults() {
  // Seed notification channels
  const defaultChannels = [
    { id: 'ch-email', type: 'email' as const, name: 'Email', enabled: true, connected: true, config: JSON.stringify({ address: 'admin@example.com' }) },
    { id: 'ch-slack', type: 'slack' as const, name: 'Slack', enabled: false, connected: false, config: JSON.stringify({ webhook: '', channel: '' }) },
    { id: 'ch-telegram', type: 'telegram' as const, name: 'Telegram', enabled: false, connected: false, config: JSON.stringify({ botToken: '', chatId: '' }) },
    { id: 'ch-discord', type: 'discord' as const, name: 'Discord', enabled: false, connected: false, config: JSON.stringify({ webhook: '', username: 'Sentinel' }) },
    { id: 'ch-webhook', type: 'webhook' as const, name: 'Webhook', enabled: false, connected: false, config: JSON.stringify({ url: '', method: 'POST' }) },
  ];
  
  for (const ch of defaultChannels) {
    db.insert(schema.channels).values(ch).onConflictDoNothing().run();
  }
  
  // Seed default settings
  const defaultSettings = [
    { key: 'timezone', value: Intl.DateTimeFormat().resolvedOptions().timeZone },
    { key: 'autoDetectTimezone', value: 'true' },
    { key: 'dateFormat', value: 'MMM dd, yyyy' },
    { key: 'defaultRateLimit', value: '150' },
    { key: 'defaultTimeout', value: '30' },
    { key: 'defaultSeverityThreshold', value: 'low' },
    { key: 'concurrentScansLimit', value: '5' },
    { key: 'templatesPath', value: '~/.nuclei-templates' },
  ];
  
  for (const s of defaultSettings) {
    db.insert(schema.settings).values(s).onConflictDoNothing().run();
  }
  
  console.log('[DB] Seeded defaults');
}
