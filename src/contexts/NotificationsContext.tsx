import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '@/api';
import type { NotificationChannel } from '@/types';

interface NotificationsContextType {
  channels: NotificationChannel[];
  isLoading: boolean;
  updateChannel: (id: string, updates: Partial<NotificationChannel>) => Promise<void>;
  testConnection: (id: string) => Promise<{ success: boolean; message: string }>;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getChannels()
      .then(data => setChannels(data.map((c: any) => ({ ...c, config: typeof c.config === 'string' ? JSON.parse(c.config) : c.config }))))
      .finally(() => setIsLoading(false));
  }, []);

  const updateChannel = useCallback(async (id: string, updates: Partial<NotificationChannel>) => {
    const payload: any = {};
    if (updates.enabled !== undefined) payload.enabled = updates.enabled;
    if (updates.config) payload.config = updates.config;
    if (updates.connected !== undefined) payload.connected = updates.connected;
    
    await api.updateChannel(id, payload);
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, ...updates } : ch));
  }, []);

  const testConnection = useCallback(async (id: string) => {
    const result = await api.testChannel(id);
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, connected: result.success } : ch));
    return result;
  }, []);

  return (
    <NotificationsContext.Provider value={{ channels, isLoading, updateChannel, testConnection }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
