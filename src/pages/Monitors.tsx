import { useState } from 'react';
import { Target, Search, Filter } from 'lucide-react';
import TopBar from '@/components/TopBar';
import MonitorCard from '@/components/MonitorCard';
import { useMonitors } from '@/contexts/MonitorsContext';
import type { MonitorStatus } from '@/types';

export default function Monitors() {
  const { monitors } = useMonitors();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MonitorStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'lastScan' | 'name' | 'created'>('lastScan');

  const filtered = monitors
    .filter(m => {
      const matchesSearch = !search || m.url.toLowerCase().includes(search.toLowerCase()) || m.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'lastScan') {
        if (!a.lastScanAt) return 1;
        if (!b.lastScanAt) return -1;
        return new Date(b.lastScanAt).getTime() - new Date(a.lastScanAt).getTime();
      }
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div>
      <TopBar title="Monitors" showNewMonitor />

      {/* Filters */}
      <div
        className="flex items-center gap-3 mb-6 p-3 rounded-lg border"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="relative flex-1 max-w-[280px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by URL or name..."
            className="w-full h-8 pl-9 pr-3 rounded-md text-[12px] focus-ring outline-none"
            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter size={12} style={{ color: 'var(--text-muted)' }} />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as MonitorStatus | 'all')}
            className="h-8 px-2 rounded-md text-[12px] focus-ring cursor-pointer outline-none"
            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="error">Error</option>
          </select>
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="h-8 px-2 rounded-md text-[12px] focus-ring cursor-pointer outline-none"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          <option value="lastScan">Last Scan</option>
          <option value="name">Name</option>
          <option value="created">Created</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(monitor => (
            <MonitorCard key={monitor.id} monitor={monitor} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <Target size={48} style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-[15px] font-semibold mt-4" style={{ color: 'var(--text-primary)' }}>
            No monitors found
          </h3>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {search || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first monitor to start scanning for vulnerabilities'}
          </p>
        </div>
      )}
    </div>
  );
}
