import type { Severity } from '@/types';

interface SeverityBadgeProps {
  severity: Severity;
  count?: number;
  className?: string;
}

const STYLES: Record<Severity, { bg: string; color: string; fontWeight?: number }> = {
  info: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
  low: { bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
  medium: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
  high: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
  critical: { bg: 'rgba(220,38,38,0.2)', color: '#DC2626', fontWeight: 700 },
};

export default function SeverityBadge({ severity, count, className = '' }: SeverityBadgeProps) {
  const style = STYLES[severity];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${className}`}
      style={{ backgroundColor: style.bg, color: style.color, fontWeight: style.fontWeight || 500 }}
    >
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
      {count !== undefined && <span className="opacity-80">({count})</span>}
    </span>
  );
}
