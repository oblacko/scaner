import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { MonitorsProvider } from '@/contexts/MonitorsContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { api, auth, setUnauthorizedHandler } from '@/api';
import Sidebar from '@/components/Sidebar';
import Login from '@/components/Login';
import ToastNotification from '@/components/ToastNotification';
import CreateMonitorSheet from '@/components/CreateMonitorSheet';
import Dashboard from '@/pages/Dashboard';
import Monitors from '@/pages/Monitors';
import ScanHistory from '@/pages/ScanHistory';
import Notifications from '@/pages/Notifications';
import Settings from '@/pages/Settings';

function PageRouter() {
  const { currentPage } = useApp();

  switch (currentPage) {
    case 'dashboard': return <Dashboard />;
    case 'monitors': return <Monitors />;
    case 'history': return <ScanHistory />;
    case 'notifications': return <Notifications />;
    case 'settings': return <Settings />;
    default: return <Dashboard />;
  }
}

function ToastContainer() {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map(toast => (
        <ToastNotification key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}

function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar />
      <main className="flex-1 ml-[240px] overflow-y-auto sentinel-scrollbar">
        <div className="max-w-[1200px] mx-auto px-8 py-2 min-h-full">
          <PageRouter />
        </div>
      </main>
      <CreateMonitorSheet />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <SettingsProvider>
        <NotificationsProvider>
          <MonitorsProvider>
            <AppLayout />
          </MonitorsProvider>
        </NotificationsProvider>
      </SettingsProvider>
    </AppProvider>
  );
}

// Gate the app behind the login screen when the backend requires a password.
function AuthGate() {
  const [state, setState] = useState<'loading' | 'login' | 'ready'>('loading');

  const check = () => {
    api.authStatus()
      .then(({ authRequired }) => {
        if (!authRequired || auth.token) setState('ready');
        else setState('login');
      })
      .catch(() => setState('ready')); // API down — let the app render its own error state
  };

  useEffect(() => {
    setUnauthorizedHandler(() => setState('login'));
    check();
  }, []);

  if (state === 'loading') return <div style={{ backgroundColor: 'var(--bg-primary)' }} className="h-screen w-screen" />;
  if (state === 'login') return <Login onSuccess={() => setState('ready')} />;
  return <App />;
}

export function Root() {
  return <AuthGate />;
}
