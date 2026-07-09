import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  icon: ReactNode;
  variant?: 'default' | 'accent' | 'alert';
}

export default function StatCard({ label, value, delta, icon, variant = 'default' }: StatCardProps) {
  const valueColor = variant === 'accent' ? 'var(--accent-cyan)' : variant === 'alert' ? 'var(--severity-high)' : 'var(--text-primary)';

  return (
    <div
      className="rounded-lg p-4 border transition-all duration-200 hover:shadow-md"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-[22px] font-bold leading-[30px]" style={{ color: valueColor }}>
          {value}
        </span>
        {delta !== undefined && (
          <span
            className="flex items-center gap-0.5 text-[11px] font-medium mb-1 px-1.5 py-0.5 rounded"
            style={{
              color: delta >= 0 ? 'var(--severity-low)' : 'var(--severity-high)',
              backgroundColor: delta >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            }}
          >
            {delta >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}
