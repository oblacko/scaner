const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const cron = require('node-cron');
const db = require('./db');
const { sendNotifications, testChannel } = require('./notifications');

const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

const API_PORT = process.env.API_PORT || 3001;

// ─── HELPERS ───
const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

// ─── MONITORS ───
app.get('/api/monitors', (req, res) => res.json(db.monitors()));

app.get('/api/monitors/:id', (req, res) => {
  const m = db.monitors().find(x => x.id === req.params.id);
  m ? res.json(m) : res.status(404).json({ error: 'Not found' });
});

app.post('/api/monitors', (req, res) => {
  const monitor = {
    id: generateId('mon'),
    status: 'active',
    findingCounts: { info: 0, low: 0, medium: 0, high: 0, critical: 0 },
    createdAt: new Date().toISOString(),
    lastScanAt: null,
    ...req.body,
  };
  db.saveMonitors([...db.monitors(), monitor]);
  scheduleMonitor(monitor);
  res.status(201).json(monitor);
});

app.patch('/api/monitors/:id', (req, res) => {
  const all = db.monitors().map(m => m.id === req.params.id ? { ...m, ...req.body } : m);
  db.saveMonitors(all);
  const updated = all.find(m => m.id === req.params.id);
  scheduleMonitor(updated);
  res.json(updated);
});

app.delete('/api/monitors/:id', (req, res) => {
  db.saveMonitors(db.monitors().filter(m => m.id !== req.params.id));
  db.saveScans(db.scans().filter(s => s.monitorId !== req.params.id));
  unscheduleMonitor(req.params.id);
  res.json({ deleted: true });
});

// ─── SCANS ───
app.get('/api/scans', (req, res) => res.json(db.scans().sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))));

app.get('/api/scans/:id', (req, res) => {
  const scan = db.scans().find(s => s.id === req.params.id);
  if (!scan) return res.status(404).json({ error: 'Not found' });
  const findings = db.findings().filter(f => f.scanId === req.params.id);
  res.json({ ...scan, findings });
});

app.post('/api/scans', (req, res) => {
  const monitor = db.monitors().find(m => m.id === req.body.monitorId);
  if (!monitor) return res.status(404).json({ error: 'Monitor not found' });
  
  const scanId = generateId('scan');
  const scan = {
    id: scanId,
    monitorId: monitor.id,
    target: monitor.url,
    templates: monitor.templateMode === 'all' ? 'All Templates' : (monitor.templateCategories || []).join(', '),
    duration: 0,
    status: 'running',
    startedAt: new Date().toISOString(),
    terminalOutput: `[INF] Starting Nuclei scan of ${monitor.url}\n`,
  };
  db.saveScans([scan, ...db.scans()]);
  db.saveMonitors(db.monitors().map(m => m.id === monitor.id ? { ...m, status: 'scanning' } : m));
  
  runNucleiScan(scanId, monitor);
  res.status(201).json({ id: scanId, status: 'running' });
});

// ─── NOTIFICATIONS ───
app.get('/api/notifications/channels', (req, res) => res.json(db.channels()));

app.patch('/api/notifications/channels/:id', (req, res) => {
  const all = db.channels().map(c => c.id === req.params.id ? { ...c, ...req.body } : c);
  db.saveChannels(all);
  res.json({ updated: true });
});

app.post('/api/notifications/channels/:id/test', async (req, res) => {
  const ch = db.channels().find(c => c.id === req.params.id);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  const config = ch.config || {};

  try {
    const message = await testChannel(ch.type, config);
    res.json({ success: true, message });
  } catch (err) {
    res.json({ success: false, message: err.message || 'Connection failed' });
  }
});

// ─── SETTINGS ───
app.get('/api/settings', (req, res) => res.json(db.settings()));

app.patch('/api/settings', (req, res) => {
  db.saveSettings({ ...db.settings(), ...req.body });
  res.json({ updated: true });
});

// ─── HEALTH ───
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ─── NUCLEI SCANNER ───
const TAG_MAP = {
  cve: 'cve',
  misconfiguration: 'misconfig',
  'exposed-panels': 'panel',
  'subdomain-takeover': 'takeover',
  'ssl-tls': 'ssl',
  technologies: 'tech',
  dns: 'dns',
  headless: 'headless',
};

function runNucleiScan(scanId, monitor) {
  const adv = monitor.advanced || {};
  const args = ['-u', monitor.url, '-rl', String(adv.rateLimit || 150), '-timeout', String(adv.timeout || 30), '-j', '-silent'];
  
  if (monitor.templateMode === 'categories' && monitor.templateCategories?.length) {
    const tags = monitor.templateCategories.map(cat => TAG_MAP[cat] || cat).join(',');
    args.push('-tags', tags);
  }
  if (adv.userAgent) args.push('-H', `User-Agent: ${adv.userAgent}`);
  if (!adv.followRedirects) args.push('-no-redirects');
  
  const lines = [`[INF] nuclei ${args.join(' ')}`, `[INF] Scanning ${monitor.url}...`];
  const start = Date.now();
  
  let isRealNuclei = false;
  const nuclei = spawn('nuclei', args, { shell: false });
  
  nuclei.on('error', (err) => {
    // Nuclei not installed — run mock scan
    if (!isRealNuclei) runMockScan(scanId, monitor, start);
  });
  
  const findings = [];
  nuclei.stdout.on('data', (data) => {
    isRealNuclei = true;
    const text = data.toString();
    text.split('\n').filter(Boolean).forEach(line => {
      try {
        const parsed = JSON.parse(line);
        findings.push({
          id: generateId('f'),
          scanId,
          templateId: parsed.template || parsed['template-id'] || 'unknown',
          name: parsed.info?.name || 'Unknown',
          severity: ['info','low','medium','high','critical'].includes(parsed.info?.severity) ? parsed.info.severity : 'info',
          host: parsed.host || monitor.url,
          matchedAt: parsed['matched-at'] || parsed.host || monitor.url,
          cve: parsed['extracted-results']?.find(r => r.includes('CVE-')) || null,
        });
        lines.push(`[${findings.length}] ${parsed.host} [${parsed.info?.severity || 'info'}] ${parsed.info?.name || ''}`);
      } catch {
        lines.push(line);
      }
    });
  });
  
  nuclei.stderr.on('data', (data) => {
    lines.push(`[ERR] ${data.toString().trim()}`);
  });
  
  nuclei.on('close', (code) => {
    const duration = Date.now() - start;
    lines.push(`[INF] Scan ${code === 0 ? 'completed' : 'failed'} in ${(duration/1000).toFixed(1)}s (${findings.length} findings)`);
    
    finalizeScan(scanId, duration, code === 0 ? 'completed' : 'failed', lines.join('\n'), findings, monitor);
  });
}

// ─── MOCK SCAN (when nuclei not installed) ───
function runMockScan(scanId, monitor, start) {
  const TEMPLATES = [
    { id: 'cve-2024-rce', name: 'Remote Code Execution CVE-2024', severity: 'critical' },
    { id: 'wp-login', name: 'WordPress Login Panel Exposed', severity: 'medium' },
    { id: 'nginx-version', name: 'Nginx Version Disclosure', severity: 'low' },
    { id: 'cors-misconfig', name: 'CORS Misconfiguration', severity: 'medium' },
    { id: 'xss-reflected', name: 'Reflected XSS in Search Parameter', severity: 'high' },
    { id: 'info-leak', name: 'Information Disclosure via Headers', severity: 'info' },
    { id: 'ssl-expired', name: 'SSL Certificate Expired', severity: 'high' },
    { id: 'directory-listing', name: 'Directory Listing Enabled', severity: 'low' },
  ];
  
  const count = Math.floor(Math.random() * 5);
  const picked = [...TEMPLATES].sort(() => 0.5 - Math.random()).slice(0, count);
  const findings = picked.map(t => ({
    id: generateId('f'), scanId,
    templateId: t.id, name: t.name, severity: t.severity,
    host: monitor.url, matchedAt: monitor.url + '/',
    cve: t.severity === 'critical' ? 'CVE-2024-' + Math.floor(1000 + Math.random() * 9000) : null,
  }));
  
  const lines = [
    `[INF] Nuclei Engine v3.11.0 (mock mode — nuclei CLI not found)`,
    `[INF] Using Nuclei Templates v10.1.0`,
    `[INF] Targets loaded: 1`,
    `[INF] Templates loaded: ${monitor.templateMode === 'all' ? '8432' : '124'}`,
    `[INF] Executing workflows...`,
    ...findings.map((f, i) => `[${String(i+1).padStart(3,'0')}] ${monitor.url} [${f.severity}] ${f.name}`),
    `[INF] Scan completed with ${findings.length} findings (mock)`,
  ];
  
  const duration = 2000 + Math.random() * 3000;
  
  // Simulate progressive output
  let progress = 0;
  const interval = setInterval(() => {
    progress++;
    const partial = lines.slice(0, Math.min(lines.length, Math.floor((progress / 10) * lines.length)));
    db.saveScans(db.scans().map(s => s.id === scanId ? { ...s, terminalOutput: partial.join('\n') } : s));
    if (progress >= 10) {
      clearInterval(interval);
      finalizeScan(scanId, duration, 'completed', lines.join('\n'), findings, monitor);
    }
  }, duration / 10);
}

function finalizeScan(scanId, duration, status, terminalOutput, findings, monitor) {
  // Save scan
  db.saveScans(db.scans().map(s => s.id === scanId ? {
    ...s, duration, status, completedAt: new Date().toISOString(), terminalOutput
  } : s));
  
  // Save findings
  if (findings.length) db.saveFindings([...db.findings(), ...findings]);
  
  // Update monitor
  const counts = findings.reduce((acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] || 0) + 1 }), 
    { info: 0, low: 0, medium: 0, high: 0, critical: 0 });
  db.saveMonitors(db.monitors().map(m => m.id === monitor.id ? {
    ...m, status: 'active', lastScanAt: new Date().toISOString(), findingCounts: counts
  } : m));
  
  // Send notifications through enabled channels
  sendNotifications(findings, monitor).catch(err => {
    console.error('[Scan] Notifications failed:', err.message || err);
  });

  console.log(`[Scan] ${scanId} ${status} — ${findings.length} findings for ${monitor.url}`);
}

// ─── SCHEDULER ───
const jobs = new Map();

function scheduleMonitor(monitor) {
  unscheduleMonitor(monitor.id);
  if (monitor.status !== 'active') return;
  
  let expr;
  switch (monitor.schedule) {
    case 'hourly': expr = '0 * * * *'; break;
    case 'daily': expr = '0 0 * * *'; break;
    case 'weekly': expr = '0 0 * * 0'; break;
    case 'monthly': expr = '0 0 1 * *'; break;
    case 'custom': expr = monitor.cronExpression; break;
    default: expr = '0 0 * * *';
  }
  if (!expr || !cron.validate(expr)) return;
  
  const job = cron.schedule(expr, () => {
    console.log(`[Cron] Auto-scan ${monitor.name}`);
    const scanId = generateId('scan');
    const scan = {
      id: scanId, monitorId: monitor.id, target: monitor.url,
      templates: monitor.templateMode === 'all' ? 'All Templates' : (monitor.templateCategories || []).join(', '),
      duration: 0, status: 'running', startedAt: new Date().toISOString(),
      terminalOutput: `[INF] Scheduled scan of ${monitor.url}\n`,
    };
    db.saveScans([scan, ...db.scans()]);
    runNucleiScan(scanId, monitor);
  });
  jobs.set(monitor.id, job);
}

function unscheduleMonitor(id) {
  const job = jobs.get(id);
  if (job) { job.stop(); jobs.delete(id); }
}

// Sync notification channel configs from environment variables
function syncChannelsFromEnv() {
  const envMappings = {
    'ch-email':    { address: process.env.EMAIL_ADDRESS },
    'ch-slack':    { webhook: process.env.SLACK_WEBHOOK },
    'ch-telegram': { botToken: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID },
    'ch-discord':  { webhook: process.env.DISCORD_WEBHOOK },
    'ch-webhook':  { url: process.env.WEBHOOK_URL, method: process.env.WEBHOOK_METHOD || 'POST' },
  };

  let changed = false;
  const updated = db.channels().map(ch => {
    const envConfig = envMappings[ch.id];
    if (!envConfig) return ch;

    const config = { ...(ch.config || {}) };
    let configChanged = false;
    for (const [key, value] of Object.entries(envConfig)) {
      if (value && config[key] !== value) {
        config[key] = value;
        configChanged = true;
      }
    }

    if (configChanged) {
      changed = true;
      return { ...ch, config };
    }
    return ch;
  });

  if (changed) {
    db.saveChannels(updated);
    console.log('[Startup] Synced notification channel configs from environment variables');
  }
}
syncChannelsFromEnv();

// Schedule existing monitors on startup
db.monitors().filter(m => m.status === 'active').forEach(scheduleMonitor);

// SPA fallback — serve index.html for all non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ─── START ───
app.listen(API_PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║  Sentinel API — http://localhost:${API_PORT}       ║
╠══════════════════════════════════════════╣
║  POST /api/monitors          Create      ║
║  GET  /api/monitors          List        ║
║  POST /api/scans             Trigger     ║
║  GET  /api/scans/:id         Results     ║
║  GET  /api/notifications     Channels    ║
║  GET  /api/settings          Settings    ║
╚══════════════════════════════════════════╝
  Monitors: ${db.monitors().length}  |  Scans: ${db.scans().length}
  `);
});
