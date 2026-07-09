import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import { api } from '@/api';
import type { Monitor, Scan } from '@/types';

interface MonitorsContextType {
  monitors: Monitor[];
  scans: Scan[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  createMonitor: (monitor: any) => Promise<void>;
  updateMonitor: (id: string, updates: any) => Promise<void>;
  deleteMonitor: (id: string) => Promise<void>;
  triggerScan: (monitorId: string) => void;
  stopScan: (scanId: string) => Promise<void>;
  getScanById: (scanId: string) => Scan | undefined;
}

const MonitorsContext = createContext<MonitorsContextType | null>(null);

export function MonitorsProvider({ children }: { children: React.ReactNode }) {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useApp();
  const scanningRef = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load data from API
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [m, s] = await Promise.all([api.getMonitors(), api.getScans()]);
      setMonitors(m);
      setScans(s);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('[API Error]', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Poll every 5 seconds for running scans
    pollRef.current = setInterval(loadData, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadData]);

  const createMonitor = useCallback(async (data: any) => {
    try {
      const monitor = await api.createMonitor(data);
      setMonitors(prev => [monitor, ...prev]);
      addToast({ type: 'success', title: 'Monitor Created', message: `${monitor.name} is now active.` });
    } catch (err: any) {
      addToast({ type: 'alert', title: 'Error', message: err.message });
    }
  }, [addToast]);

  const updateMonitor = useCallback(async (id: string, updates: any) => {
    try {
      const monitor = await api.updateMonitor(id, updates);
      setMonitors(prev => prev.map(m => m.id === id ? monitor : m));
    } catch (err: any) {
      addToast({ type: 'alert', title: 'Error', message: err.message });
    }
  }, [addToast]);

  const deleteMonitor = useCallback(async (id: string) => {
    try {
      await api.deleteMonitor(id);
      setMonitors(prev => prev.filter(m => m.id !== id));
      setScans(prev => prev.filter(s => s.monitorId !== id));
      addToast({ type: 'info', title: 'Monitor Deleted', message: 'The monitor has been removed.' });
    } catch (err: any) {
      addToast({ type: 'alert', title: 'Error', message: err.message });
    }
  }, [addToast]);

  const triggerScan = useCallback(async (monitorId: string) => {
    if (scanningRef.current.has(monitorId)) return;
    scanningRef.current.add(monitorId);

    try {
      await api.triggerScan(monitorId);
      addToast({ type: 'info', title: 'Scan Started', message: 'Scan is now running...' });
      // Optimistic update
      setMonitors(prev => prev.map(m => m.id === monitorId ? { ...m, status: 'scanning' as any } : m));
      // Refresh data shortly
      setTimeout(loadData, 500);
    } catch (err: any) {
      addToast({ type: 'alert', title: 'Scan Failed', message: err.message });
    } finally {
      setTimeout(() => scanningRef.current.delete(monitorId), 1000);
    }
  }, [addToast, loadData]);

  const stopScan = useCallback(async (scanId: string) => {
    try {
      await api.stopScan(scanId);
      addToast({ type: 'info', title: 'Scan Stopped', message: 'The scan was cancelled.' });
      setTimeout(loadData, 300);
    } catch (err: any) {
      addToast({ type: 'alert', title: 'Error', message: err.message });
    }
  }, [addToast, loadData]);

  const getScanById = useCallback((scanId: string) => {
    return scans.find(s => s.id === scanId);
  }, [scans]);

  return (
    <MonitorsContext.Provider value={{
      monitors, scans, isLoading, error,
      refresh: loadData,
      createMonitor, updateMonitor, deleteMonitor,
      triggerScan, stopScan, getScanById,
    }}>
      {children}
    </MonitorsContext.Provider>
  );
}

export function useMonitors() {
  const ctx = useContext(MonitorsContext);
  if (!ctx) throw new Error('useMonitors must be used within MonitorsProvider');
  return ctx;
}
