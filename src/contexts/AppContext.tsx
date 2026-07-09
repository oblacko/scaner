import React, { createContext, useContext, useState, useCallback } from 'react';
import type { PageType, ToastItem } from '@/types';

interface AppContextType {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
  isCreateSheetOpen: boolean;
  setIsCreateSheetOpen: (open: boolean) => void;
  editingMonitorId: string | null;
  setEditingMonitorId: (id: string | null) => void;
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  openCreateSheet: () => void;
  openEditSheet: (monitorId: string) => void;
  closeSheet: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [editingMonitorId, setEditingMonitorId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const timestamp = new Date().toISOString();
    setToasts(prev => [...prev.slice(-4), { ...toast, id, timestamp }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const openCreateSheet = useCallback(() => {
    setEditingMonitorId(null);
    setIsCreateSheetOpen(true);
  }, []);

  const openEditSheet = useCallback((monitorId: string) => {
    setEditingMonitorId(monitorId);
    setIsCreateSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setIsCreateSheetOpen(false);
    setEditingMonitorId(null);
  }, []);

  return (
    <AppContext.Provider value={{
      currentPage, setCurrentPage,
      isCreateSheetOpen, setIsCreateSheetOpen,
      editingMonitorId, setEditingMonitorId,
      toasts, addToast, removeToast,
      openCreateSheet, openEditSheet, closeSheet,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
