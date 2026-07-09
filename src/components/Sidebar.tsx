import {
  LayoutDashboard, Target, Clock, Bell, Settings,
  ChevronRight, LogOut
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { api, auth } from '@/api';
import type { PageType } from '@/types';

const NAV_ITEMS: { page: PageType; label: string; icon: React.ReactNode }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { page: 'monitors', label: 'Monitors', icon: <Target size={16} /> },
  { page: 'history', label: 'Scan History', icon: <Clock size={16} /> },
  { page: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { page: 'settings', label: 'Settings', icon: <Settings size={16} /> },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage } = useApp();

  return (
    <aside
      className="fixed left-0 top-0 h-full w-[240px] flex flex-col border-r"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-14 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <img src="/sentinel-logo.png" alt="Sentinel" className="w-7 h-7" />
        <span
          className="font-mono text-[15px] font-bold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          Sentinel
        </span>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
        >
          v1.0
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const isActive = currentPage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => setCurrentPage(item.page)}
              className="w-full flex items-center gap-3 h-9 px-3 rounded-md transition-all duration-150 focus-ring"
              style={{
                backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                borderLeft: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {item.icon}
              <span className="text-[13px] font-medium">{item.label}</span>
              {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
            </button>
          );
        })}
      </nav>

      {/* User Card */}
      <div
        className="mx-3 mb-4 p-3 rounded-lg flex items-center gap-3"
        style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
          style={{ backgroundColor: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
        >
          A
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>Admin</div>
          <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>Security Team</div>
        </div>
        <button
          title="Sign out"
          onClick={async () => { await api.logout(); auth.token = null; window.location.reload(); }}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors focus-ring"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
