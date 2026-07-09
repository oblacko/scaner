import type { Config } from 'drizzle-kit';

// Default: SQLite. To switch to PostgreSQL:
// 1. Change dialect to 'postgresql'
// 2. Update DATABASE_URL in .env
// 3. Install pg: npm install pg
// 4. Update connection.ts

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './data/sentinel.db',
  },
} satisfies Config;
