import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer;

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        // Handle subscription requests
        if (data.type === 'subscribe' && data.scanId) {
          ws.send(JSON.stringify({ type: 'subscribed', scanId: data.scanId }));
        }
      } catch {
        // Ignore invalid messages
      }
    });
    
    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
    });
  });
  
  console.log('[WebSocket] Server initialized on /ws');
}

export function broadcast(data: any) {
  if (!wss) return;
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function broadcastScanUpdate(scanId: string, status: string, findingCount: number) {
  broadcast({
    type: 'scanUpdate',
    scanId,
    status,
    findingCount,
    timestamp: new Date().toISOString(),
  });
}
