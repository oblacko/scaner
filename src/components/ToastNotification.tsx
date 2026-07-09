import { useEffect, useRef, useState } from 'react';
import { X, Info, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { ToastItem } from '@/types';

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const ICONS = {
  info: <Info size={16} style={{ color: 'var(--accent-cyan)' }} />,
  success: <CheckCircle size={16} style={{ color: 'var(--severity-low)' }} />,
  warning: <AlertTriangle size={16} style={{ color: 'var(--severity-medium)' }} />,
  alert: <AlertOctagon size={16} style={{ color: 'var(--severity-high)' }} />,
};

const BORDERS: Record<string, string> = {
  info: 'var(--accent-cyan)',
  success: 'var(--severity-low)',
  warning: 'var(--severity-medium)',
  alert: 'var(--severity-high)',
};

export default function ToastNotification({ toast, onDismiss }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const start = Date.now();
    const duration = 5000;
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onDismiss(toast.id);
      }
    }, 50);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [toast.id, onDismiss]);

  return (
    <div
      className="animate-slide-in-right relative overflow-hidden rounded-lg border shadow-lg min-w-[320px] max-w-[420px]"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: BORDERS[toast.type],
      }}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="mt-0.5 flex-shrink-0">{ICONS[toast.type]}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {toast.title}
          </div>
          <div className="text-[12px] mt-0.5 leading-[18px]" style={{ color: 'var(--text-secondary)' }}>
            {toast.message}
          </div>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <X size={12} />
        </button>
      </div>
      <div
        className="h-0.5 transition-all duration-100"
        style={{
          width: `${progress}%`,
          backgroundColor: BORDERS[toast.type],
        }}
      />
    </div>
  );
}
