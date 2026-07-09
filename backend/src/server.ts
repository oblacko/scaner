import express from 'express';
import cors from 'cors';
import monitorsRouter from './routers/monitors.js';
import scansRouter from './routers/scans.js';
import notificationsRouter from './routers/notifications.js';
import settingsRouter from './routers/settings.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/monitors', monitorsRouter);
app.use('/api/scans', scansRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/settings', settingsRouter);

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
