export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type MonitorStatus = 'active' | 'paused' | 'error' | 'scanning';
export type TemplateMode = 'all' | 'categories' | 'custom';
export type ScheduleType = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type ScanStatus = 'completed' | 'failed' | 'running';
export type NotificationLevel = 'all' | 'high' | 'never';
export type PageType = 'dashboard' | 'monitors' | 'history' | 'notifications' | 'settings';
export type DateFormatType = ' Jul 08, 2026' | '2026-07-08' | '08/07/2026';

export interface Finding {
  id: string;
  templateId: string;
  name: string;
  severity: Severity;
  host: string;
  matchedAt: string;
  extracted?: string;
  cve?: string;
  remediation?: string;
}

export interface Scan {
  id: string;
  monitorId: string;
  target: string;
  templates: string;
  duration: number;
  findings?: Finding[];
  status: ScanStatus;
  startedAt: string;
  completedAt?: string;
  terminalOutput: string[];
}

export interface Monitor {
  id: string;
  name: string;
  url: string;
  status: MonitorStatus;
  templateMode: TemplateMode;
  templateCategories: string[];
  customTemplates: string[];
  schedule: ScheduleType;
  cronExpression?: string;
  notifications: Record<string, NotificationLevel>;
  advanced: {
    rateLimit: number;
    timeout: number;
    userAgent: string;
    followRedirects: boolean;
    maxRedirects: number;
  };
  createdAt: string;
  lastScanAt?: string;
  findingCounts: Record<Severity, number>;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'telegram' | 'discord' | 'webhook';
  name: string;
  enabled: boolean;
  config: Record<string, string>;
  connected: boolean;
}

export interface AppSettings {
  timezone: string;
  autoDetectTimezone: boolean;
  dateFormat: DateFormatType;
  defaultRateLimit: number;
  defaultTimeout: number;
  defaultSeverityThreshold: Severity;
  concurrentScansLimit: number;
  templatesPath: string;
}

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  title: string;
  message: string;
  timestamp: string;
}
