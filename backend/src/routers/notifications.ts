import { Router } from 'express';
import { db } from '../db/connection.js';
import { channels } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/notifications/channels — list all channels
router.get('/channels', (_req, res) => {
  const rows = db.select().from(channels).all();
  res.json(rows.map(row => ({
    ...row,
    config: JSON.parse(row.config),
  })));
});

// PATCH /api/notifications/channels/:id — update channel
router.patch('/channels/:id', (req, res) => {
  const update: any = {};
  if (req.body.enabled !== undefined) update.enabled = req.body.enabled ? 1 : 0;
  if (req.body.config) update.config = JSON.stringify(req.body.config);
  if (req.body.connected !== undefined) update.connected = req.body.connected ? 1 : 0;
  
  db.update(channels).set(update).where(eq(channels.id, req.params.id)).run();
  res.json({ updated: true });
});

// POST /api/notifications/channels/:id/test — test connection
router.post('/channels/:id/test', (req, res) => {
  const channel = db.select().from(channels).where(eq(channels.id, req.params.id)).get();
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  
  const config = JSON.parse(channel.config);
  let success = false;
  
  switch (channel.type) {
    case 'email':
      success = !!config.address;
      break;
    case 'slack':
      success = !!config.webhook;
      break;
    case 'telegram':
      success = !!(config.botToken && config.chatId);
      break;
    case 'discord':
      success = !!config.webhook;
      break;
    case 'webhook':
      success = !!config.url;
      break;
  }
  
  // Update connected status
  db.update(channels).set({ connected: success ? 1 : 0 }).where(eq(channels.id, req.params.id)).run();
  
  res.json({ success, message: success ? 'Connection OK' : 'Configuration incomplete' });
});

export default router;
