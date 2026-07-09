// Simple JSON-file database — zero dependencies, zero config
// Easily swap to PostgreSQL later by replacing read/write calls
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const FILES = {
  monitors: path.join(DATA_DIR, 'monitors.json'),
  scans: path.join(DATA_DIR, 'scans.json'),
  findings: path.join(DATA_DIR, 'findings.json'),
  channels: path.join(DATA_DIR, 'channels.json'),
  settings: path.join(DATA_DIR, 'settings.json'),
};

function read(file) {
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const db = {
  monitors: () => read(FILES.monitors),
  scans: () => read(FILES.scans),
  findings: () => read(FILES.findings),
  channels: () => read(FILES.channels),
  settings: () => read(FILES.settings),

  saveMonitors: (d) => write(FILES.monitors, d),
  saveScans: (d) => write(FILES.scans, d),
  saveFindings: (d) => write(FILES.findings, d),
  saveChannels: (d) => write(FILES.channels, d),
  saveSettings: (d) => write(FILES.settings, d),
};

// Seed defaults if empty
if (db.channels().length === 0) {
  db.saveChannels([
    { id: 'ch-email', type: 'email', name: 'Email', enabled: true, config: { address: 'admin@example.com' }, connected: true },
    { id: 'ch-slack', type: 'slack', name: 'Slack', enabled: false, config: { webhook: '', channel: '' }, connected: false },
    { id: 'ch-telegram', type: 'telegram', name: 'Telegram', enabled: false, config: { botToken: '', chatId: '' }, connected: false },
    { id: 'ch-discord', type: 'discord', name: 'Discord', enabled: false, config: { webhook: '', username: 'Sentinel' }, connected: false },
    { id: 'ch-webhook', type: 'webhook', name: 'Webhook', enabled: false, config: { url: '', method: 'POST' }, connected: false },
  ]);
}

if (Object.keys(db.settings()).length === 0) {
  db.saveSettings({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    autoDetectTimezone: true,
    dateFormat: 'MMM dd, yyyy',
    defaultRateLimit: 150,
    defaultTimeout: 30,
    defaultSeverityThreshold: 'low',
    concurrentScansLimit: 5,
    templatesPath: '~/.nuclei-templates',
  });
}

module.exports = db;
