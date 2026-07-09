import { Router } from 'express';
import { db } from '../db/connection.js';
import { settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/settings — list all settings
router.get('/', (_req, res) => {
  const rows = db.select().from(settings).all();
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  res.json(result);
});

// PATCH /api/settings — update settings (bulk)
router.patch('/', (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    db.insert(settings).values({ key, value: String(value) })
      .onConflictDoUpdate({ target: settings.key, set: { value: String(value) } })
      .run();
  }
  res.json({ updated: true });
});

export default router;
