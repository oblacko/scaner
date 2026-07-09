import { Router } from 'express';
import { db } from '../db/connection.js';
import { monitors, scans, findings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/monitors — list all monitors
router.get('/', (_req, res) => {
  const rows = db.select().from(monitors).all();
  res.json(rows.map(row => ({
    ...row,
    templateCategories: JSON.parse(row.templateCategories),
    customTemplates: JSON.parse(row.customTemplates),
    notifications: JSON.parse(row.notifications),
    advanced: JSON.parse(row.advanced),
  })));
});

// GET /api/monitors/:id — get single monitor
router.get('/:id', (req, res) => {
  const row = db.select().from(monitors).where(eq(monitors.id, req.params.id)).get();
  if (!row) return res.status(404).json({ error: 'Monitor not found' });
  res.json({
    ...row,
    templateCategories: JSON.parse(row.templateCategories),
    customTemplates: JSON.parse(row.customTemplates),
    notifications: JSON.parse(row.notifications),
    advanced: JSON.parse(row.advanced),
  });
});

// POST /api/monitors — create monitor
router.post('/', (req, res) => {
  const id = `mon-${Date.now()}`;
  const data = {
    id,
    name: req.body.name,
    url: req.body.url,
    status: 'active' as const,
    templateMode: req.body.templateMode || 'all',
    templateCategories: JSON.stringify(req.body.templateCategories || []),
    customTemplates: JSON.stringify(req.body.customTemplates || []),
    schedule: req.body.schedule || 'daily',
    cronExpression: req.body.cronExpression || null,
    notifications: JSON.stringify(req.body.notifications || {}),
    advanced: JSON.stringify(req.body.advanced || {}),
  };
  db.insert(monitors).values(data).run();
  res.status(201).json({ id, ...data, templateCategories: req.body.templateCategories, customTemplates: req.body.customTemplates, notifications: req.body.notifications, advanced: req.body.advanced });
});

// PATCH /api/monitors/:id — update monitor
router.patch('/:id', (req, res) => {
  const update: any = { updatedAt: new Date() };
  if (req.body.name) update.name = req.body.name;
  if (req.body.url) update.url = req.body.url;
  if (req.body.status) update.status = req.body.status;
  if (req.body.templateMode) update.templateMode = req.body.templateMode;
  if (req.body.templateCategories) update.templateCategories = JSON.stringify(req.body.templateCategories);
  if (req.body.customTemplates) update.customTemplates = JSON.stringify(req.body.customTemplates);
  if (req.body.schedule) update.schedule = req.body.schedule;
  if (req.body.cronExpression !== undefined) update.cronExpression = req.body.cronExpression;
  if (req.body.notifications) update.notifications = JSON.stringify(req.body.notifications);
  if (req.body.advanced) update.advanced = JSON.stringify(req.body.advanced);
  
  db.update(monitors).set(update).where(eq(monitors.id, req.params.id)).run();
  res.json({ id: req.params.id, ...update });
});

// DELETE /api/monitors/:id — delete monitor + related scans
router.delete('/:id', (req, res) => {
  // Delete findings first
  const monitorScans = db.select().from(scans).where(eq(scans.monitorId, req.params.id)).all();
  for (const s of monitorScans) {
    db.delete(findings).where(eq(findings.scanId, s.id)).run();
  }
  // Delete scans
  db.delete(scans).where(eq(scans.monitorId, req.params.id)).run();
  // Delete monitor
  db.delete(monitors).where(eq(monitors.id, req.params.id)).run();
  res.json({ deleted: true });
});

export default router;
