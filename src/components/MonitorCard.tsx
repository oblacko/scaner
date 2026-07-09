import { Play, ExternalLink, Loader2 } from 'lucide-react';
import StatusDot from './StatusDot';
import SeverityBadge from './SeverityBadge';
import type { Monitor, Severity } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useMonitors } from '@/contexts/MonitorsContext';
import { formatDistanceToNow } from 'date-fns';

interface MonitorCardProps {
  monitor: Monitor;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  error: 'Error',
  scanning: 'Scanning...',
};

export default function MonitorCard({ monitor }: MonitorCardProps) {
  const { openEditSheet } = useApp();
  const { triggerScan } = useMonitors();

  const isScanning = monitor.status === 'scanning';
  const totalFindings = Object.values(monitor.findingCounts).reduce((a, b) => a + b, 0);
  const severities: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
  const barSegments = severities.filter(s => monitor.findingCounts[s] > 0);

  return (
    <div
      className="rounded-lg border p-5 transition-all duration-200 hover:shadow-md"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[13px] font-mono truncate flex-1 mr-3"
          style={{ color: 'var(--text-primary)' }}
          title={monitor.url}
        >
          {monitor.url}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusDot status={monitor.status === 'scanning' ? 'scanning' : monitor.status === 'active' ? 'online' : monitor.status === 'paused' ? 'paused' : 'offline'} pulse={isScanning} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {STATUS_LABELS[monitor.status]}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 mb-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1">
          {monitor.templateMode === 'all' ? 'All templates' : `${monitor.templateCategories.length || monitor.customTemplates.length} categories`}
        </span>
        <span>•</span>
        <span>
          {monitor.lastScanAt
            ? formatDistanceToNow(new Date(monitor.lastScanAt), { addSuffix: true })
            : 'Never scanned'}
        </span>
        <span>•</span>
        <span
          className="px-1.5 py-0.5 rounded font-medium"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          {monitor.schedule}
        </span>
      </div>

      {/* Severity Bar */}
      {totalFindings > 0 && (
        <div className="flex h-1.5 rounded-full overflow-hidden mb-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          {barSegments.map(sev => {
            const pct = (monitor.findingCounts[sev] / totalFindings) * 100;
            return (
              <div
                key={sev}
                className="transition-all duration-600"
                style={{
                  width: `${pct}%`,
                  backgroundColor: `var(--severity-${sev})`,
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                title={`${sev}: ${monitor.findingCounts[sev]}`}
              />
            );
          })}
        </div>
      )}

      {/* Finding Counts */}
      {totalFindings > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {severities.filter(s => monitor.findingCounts[s] > 0).map(sev => (
            <SeverityBadge key={sev} severity={sev} count={monitor.findingCounts[sev]} />
          ))}
        </div>
      )}

      {totalFindings === 0 && (
        <div className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>
          No findings yet
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={() => triggerScan(monitor.id)}
          disabled={isScanning}
          className="flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-medium transition-all disabled:opacity-50 focus-ring"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          onMouseEnter={e => { if (!isScanning) { e.currentTarget.style.borderColor = 'var(--border-active)'; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
        >
          {isScanning ? <Loader2 size={12} className="animate-spin-slow" /> : <Play size={12} />}
          {isScanning ? 'Scanning...' : 'Scan Now'}
        </button>
        <button
          onClick={() => openEditSheet(monitor.id)}
          className="flex items-center gap-1 h-7 px-3 rounded-md text-[12px] font-medium transition-all focus-ring"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <ExternalLink size={12} />
          Details
        </button>
      </div>
    </div>
  );
}
