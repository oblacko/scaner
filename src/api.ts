const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

// Fallback data when API is unavailable
const FALLBACK_MONITORS = [
  { id: 'mon-1', name: 'Company Website', url: 'https://example.com', status: 'active', templateMode: 'categories', templateCategories: ['cve','misconfiguration'], customTemplates: [], schedule: 'daily', notifications: {}, advanced: {}, createdAt: '2026-07-01T10:00:00Z', findingCounts: { info:1, low:2, medium:1, high:0, critical:0 } },
  { id: 'mon-2', name: 'API Gateway', url: 'https://api.example.com', status: 'active', templateMode: 'all', templateCategories: [], customTemplates: [], schedule: 'hourly', notifications: {}, advanced: {}, createdAt: '2026-07-03T14:20:00Z', findingCounts: { info:0, low:0, medium:2, high:1, critical:0 } },
  { id: 'mon-3', name: 'Blog', url: 'https://blog.example.com', status: 'paused', templateMode: 'categories', templateCategories: ['cve'], customTemplates: [], schedule: 'weekly', notifications: {}, advanced: {}, createdAt: '2026-07-05T09:15:00Z', findingCounts: { info:0, low:1, medium:0, high:0, critical:0 } },
];

let apiAvailable: boolean | null = null;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    apiAvailable = true;
    return res.json() as Promise<T>;
  } catch (err) {
    apiAvailable = false;
    throw err;
  }
}

export const api = {
  isAvailable: () => apiAvailable,

  // Monitors
  getMonitors: async () => {
    try { return await request<any[]>('/monitors'); }
    catch { console.warn('[API] Using fallback monitors'); return FALLBACK_MONITORS; }
  },
  getMonitor: (id: string) => request<any>(`/monitors/${id}`),
  createMonitor: (data: any) => request<any>('/monitors', { method: 'POST', body: JSON.stringify(data) }),
  updateMonitor: (id: string, data: any) => request<any>(`/monitors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMonitor: (id: string) => request<any>(`/monitors/${id}`, { method: 'DELETE' }),

  // Scans
  getScans: async () => {
    try { return await request<any[]>('/scans'); }
    catch { return []; }
  },
  getScan: (id: string) => request<any>(`/scans/${id}`),
  triggerScan: (monitorId: string) => request<any>('/scans', { method: 'POST', body: JSON.stringify({ monitorId }) }),

  // Notifications
  getChannels: async () => {
    try { return await request<any[]>('/notifications/channels'); }
    catch {
      return [
        { id:'ch-email', type:'email', name:'Email', enabled:true, config:{address:'admin@example.com'}, connected:true },
        { id:'ch-slack', type:'slack', name:'Slack', enabled:false, config:{webhook:'', channel:''}, connected:false },
        { id:'ch-telegram', type:'telegram', name:'Telegram', enabled:false, config:{botToken:'', chatId:''}, connected:false },
        { id:'ch-discord', type:'discord', name:'Discord', enabled:false, config:{webhook:'', username:'Sentinel'}, connected:false },
        { id:'ch-webhook', type:'webhook', name:'Webhook', enabled:false, config:{url:'', method:'POST'}, connected:false },
      ];
    }
  },
  updateChannel: (id: string, data: any) => request<any>(`/notifications/channels/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  testChannel: (id: string) => request<any>(`/notifications/channels/${id}/test`, { method: 'POST' }),

  // Settings
  getSettings: async () => {
    try { return await request<Record<string, string>>('/settings'); }
    catch {
      return { timezone:'UTC', autoDetectTimezone:'true', dateFormat:'MMM dd, yyyy', defaultRateLimit:'150', defaultTimeout:'30', defaultSeverityThreshold:'low', concurrentScansLimit:'5', templatesPath:'~/.nuclei-templates' };
    }
  },
  updateSettings: (data: any) => request<any>('/settings', { method: 'PATCH', body: JSON.stringify(data) }),

  health: () => request<any>('/health'),
};
