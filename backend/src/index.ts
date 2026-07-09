import 'dotenv/config';
import { createServer } from 'http';
import app from './server.js';
import { initWebSocket } from './services/websocket.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';
import { seedDefaults } from './db/connection.js';

const PORT = process.env.PORT || 3001;

// Seed database defaults
seedDefaults();

// Start scheduler
startScheduler();

// Create HTTP server (shared for REST API + WebSocket)
const server = createServer(app);

// Initialize WebSocket
initWebSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║     Sentinel Security Monitor API        ║
╠══════════════════════════════════════════╣
║  REST API: http://localhost:${PORT}          ║
║  WebSocket: ws://localhost:${PORT}/ws      ║
║  Health:   http://localhost:${PORT}/api/health ║
╚══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  stopScheduler();
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down...');
  stopScheduler();
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});
