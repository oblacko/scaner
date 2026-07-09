import { Router } from 'express';
import { db } from '../db/connection.js';
import { scans, findings, monitors } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { runNucleiScan } from '../services/nuclei.js';

const router = Router();

// GET /api/scans — list scans
router.get('/', (_req, res) => {
  const rows = db.select().from(scans).orderBy(desc(scans.startedAt)).all();
  res.json(rows);
});

// GET /api/scans/:id — get scan with findings
router.get('/:id', (req, res) => {
  const scan = db.select().from(scans).where(eq(scans.id, req.params.id)).get();
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  const scanFindings = db.select().from(findings).where(eq(findings.scanId, req.params.id)).all();
  res.json({ ...scan, findings: scanFindings });
});

// GET /api/scans/monitor/:monitorId — get scans for monitor
router.get('/monitor/:monitorId', (req, res) => {
  const rows = db.select().from(scans)
    .where(eq(scans.monitorId, req.params.monitorId))
    .orderBy(desc(scans.startedAt))
    .all();
  res.json(rows);
});

// POST /api/scans — trigger a new scan
router.post('/', async (req, res) => {
  const { monitorId } = req.body;
  const monitor = db.select().from(monitors).where(eq(monitors.id, monitorId)).get();
  if (!monitor) return res.status(404).json({ error: 'Monitor not found' });

  const scanId = `scan-${Date.now()}`;
  
  // Insert scan record
  db.insert(scans).values({
    id: scanId,
    monitorId,
    target: monitor.url,
    templates: monitor.templateMode === 'all' ? 'All Templates' : JSON.parse(monitor.templateCategories).join(', '),
    duration: 0,
    status: 'running',
    startedAt: new Date(),
    terminalOutput: '[INF] Starting scan...\n',
  }).run();

  // Update monitor status
  db.update(monitors).set({ status: 'scanning', updatedAt: new Date() }).where(eq(monitors.id, monitorId)).run();

  // Start scan in background
  runNucleiScan(scanId, monitor).catch(err => {
    console.error('[Scan Error]', err);
    db.update(scans).set({ status: 'failed', terminalOutput: `Error: ${err.message}` }).where(eq(scans.id, scanId)).run();
    db.update(monitors).set({ status: 'error', updatedAt: new Date() }).where(eq(monitors.id, monitorId)).run();
  });

  res.status(201).json({ id: scanId, status: 'running' });
});

export default router;
