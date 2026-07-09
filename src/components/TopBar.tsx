import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';

interface TopBarProps {
  title: string;
  showNewMonitor?: boolean;
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  monitors: 'Monitors',
  history: 'Scan History',
  notifications: 'Notifications',
  settings: 'Settings',
};

export default function TopBar({ title, showNewMonitor = false }: TopBarProps) {
  const { openCreateSheet } = useApp();

  return (
    <div className="flex items-center justify-between h-12 mb-6">
      <h1
        className="text-[22px] font-semibold leading-[30px]"
        style={{ color: 'var(--text-primary)' }}
      >
        {title || PAGE_TITLES[title] || title}
      </h1>
      <div className="flex items-center gap-2">
        {showNewMonitor && (
          <Button
            onClick={openCreateSheet}
            className="h-8 px-3 text-[13px] font-semibold gap-1.5"
            style={{ backgroundColor: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--accent-cyan-dim)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--accent-cyan)'; }}
          >
            <Plus size={14} />
            New Monitor
          </Button>
        )}
      </div>
    </div>
  );
}
