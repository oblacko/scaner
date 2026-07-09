interface StatusDotProps {
  status: 'online' | 'offline' | 'paused' | 'scanning';
  pulse?: boolean;
  size?: number;
}

const COLORS: Record<string, string> = {
  online: 'var(--status-online)',
  offline: 'var(--status-offline)',
  paused: 'var(--status-paused)',
  scanning: 'var(--accent-cyan)',
};

export default function StatusDot({ status, pulse = false, size = 8 }: StatusDotProps) {
  const color = COLORS[status] || COLORS.online;

  return (
    <span className="relative inline-flex">
      <span
        className="inline-block rounded-full"
        style={{ width: size, height: size, backgroundColor: color }}
      />
      {pulse && (
        <span
          className="absolute inset-0 rounded-full animate-pulse-ring"
          style={{ backgroundColor: color }}
        />
      )}
    </span>
  );
}
