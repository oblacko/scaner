import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Monitors table
export const monitors = sqliteTable('monitors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  status: text('status', { enum: ['active', 'paused', 'error', 'scanning'] }).notNull().default('active'),
  templateMode: text('template_mode', { enum: ['all', 'categories', 'custom'] }).notNull().default('all'),
  templateCategories: text('template_categories').notNull().default('[]'),
  customTemplates: text('custom_templates').notNull().default('[]'),
  schedule: text('schedule', { enum: ['hourly', 'daily', 'weekly', 'monthly', 'custom'] }).notNull().default('daily'),
  cronExpression: text('cron_expression'),
  notifications: text('notifications').notNull().default('{}'),
  advanced: text('advanced').notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Scans table
export const scans = sqliteTable('scans', {
  id: text('id').primaryKey(),
  monitorId: text('monitor_id').notNull(),
  target: text('target').notNull(),
  templates: text('templates').notNull(),
  duration: integer('duration').notNull().default(0),
  status: text('status', { enum: ['completed', 'failed', 'running'] }).notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  terminalOutput: text('terminal_output').notNull().default(''),
});

// Findings table
export const findings = sqliteTable('findings', {
  id: text('id').primaryKey(),
  scanId: text('scan_id').notNull(),
  templateId: text('template_id').notNull(),
  name: text('name').notNull(),
  severity: text('severity', { enum: ['info', 'low', 'medium', 'high', 'critical'] }).notNull(),
  host: text('host').notNull(),
  matchedAt: text('matched_at').notNull(),
  extracted: text('extracted'),
  cve: text('cve'),
  remediation: text('remediation'),
});

// Notification channels table
export const channels = sqliteTable('channels', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['email', 'slack', 'telegram', 'discord', 'webhook'] }).notNull(),
  name: text('name').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  config: text('config').notNull().default('{}'),
  connected: integer('connected', { mode: 'boolean' }).notNull().default(false),
});

// Settings table
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
});

// Types
export type Monitor = typeof monitors.$inferSelect;
export type NewMonitor = typeof monitors.$inferInsert;
export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
export type Finding = typeof findings.$inferSelect;
export type NewFinding = typeof findings.$inferInsert;
export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
export type Setting = typeof settings.$inferSelect;
