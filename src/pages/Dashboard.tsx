import { Target, Activity, AlertTriangle, FileCode } from 'lucide-react';
import TopBar from '@/components/TopBar';
import StatCard from '@/components/StatCard';
import SeverityBadge from '@/components/SeverityBadge';
import { useMonitors } from '@/contexts/MonitorsContext';
import { TEMPLATE_CATEGORIES } from '@/data/templates';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

export default function Dashboard() {
  const { monitors, scans } = useMonitors();

  const activeMonitors = monitors.filter(m => m.status === 'active').length;
  const totalScans7d = scans.filter(s => {
    const d = new Date(s.startedAt);
    return d > subDays(new Date(), 7);
  }).length;

  const totalFindings = monitors.reduce((acc, m) =>
    acc + Object.values(m.findingCounts).reduce((a, b) => a + b, 0), 0
  );

  const totalTemplates = TEMPLATE_CATEGORIES.reduce((acc, c) => acc + c.count, 0);

  // Chart data — last 30 days
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dateStr = format(date, 'MMM dd');
    // Mock realistic data
    const dayScans = scans.filter(s => {
      const sDate = new Date(s.startedAt);
      return format(sDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
    const critical = dayScans.reduce((acc, s) => acc + (s.findings || []).filter(f => f.severity === 'critical').length, 0) || Math.floor(Math.random() * 2);
    const high = dayScans.reduce((acc, s) => acc + (s.findings || []).filter(f => f.severity === 'high').length, 0) || Math.floor(Math.random() * 3);
    const medium = Math.floor(Math.random() * 4);
    const low = Math.floor(Math.random() * 5);
    return { date: dateStr, critical, high, medium, low };
  });

  // Severity distribution
  const severityTotals = monitors.reduce((acc, m) => {
    (['critical', 'high', 'medium', 'low', 'info'] as const).forEach(s => {
      acc[s] = (acc[s] || 0) + m.findingCounts[s];
    });
    return acc;
  }, {} as Record<string, number>);
  const severityGrandTotal = Object.values(severityTotals).reduce((a, b) => a + b, 0);

  const recentMonitors = [...monitors]
    .filter(m => m.lastScanAt)
    .sort((a, b) => new Date(b.lastScanAt!).getTime() - new Date(a.lastScanAt!).getTime())
    .slice(0, 5);

  return (
    <div>
      <TopBar title="Dashboard" showNewMonitor />

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active Monitors"
          value={activeMonitors}
          delta={12}
          icon={<Target size={16} style={{ color: 'var(--text-muted)' }} />}
          variant="accent"
        />
        <StatCard
          label="Total Scans (7d)"
          value={totalScans7d}
          delta={8}
          icon={<Activity size={16} style={{ color: 'var(--text-muted)' }} />}
        />
        <StatCard
          label="Vulnerabilities Found"
          value={totalFindings}
          delta={-3}
          icon={<AlertTriangle size={16} style={{ color: 'var(--text-muted)' }} />}
          variant="alert"
        />
        <StatCard
          label="Templates Available"
          value={`${(totalTemplates / 1000).toFixed(0)}k+`}
          icon={<FileCode size={16} style={{ color: 'var(--text-muted)' }} />}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Chart */}
        <div
          className="col-span-2 rounded-lg border p-5"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
        >
          <h3 className="text-[13px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Findings Trend (30d)
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradMedium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2B35" />
              <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E1F26',
                  border: '1px solid #2A2B35',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                itemStyle={{ fontSize: '11px' }}
              />
              <Area type="monotone" dataKey="low" stackId="1" stroke="#10B981" fill="url(#gradLow)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="medium" stackId="1" stroke="#F59E0B" fill="url(#gradMedium)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="high" stackId="1" stroke="#EF4444" fill="url(#gradHigh)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="critical" stackId="1" stroke="#DC2626" fill="url(#gradCritical)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Severity Distribution */}
          <div
            className="rounded-lg border p-5"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
          >
            <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Severity Distribution
            </h3>
            {severityGrandTotal > 0 ? (
              <div className="space-y-3">
                <div className="flex h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  {(['critical', 'high', 'medium', 'low', 'info'] as const).map(sev => {
                    const count = severityTotals[sev] || 0;
                    if (count === 0) return null;
                    const pct = (count / severityGrandTotal) * 100;
                    return (
                      <div
                        key={sev}
                        className="transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: `var(--severity-${sev})`,
                        }}
                        title={`${sev}: ${count}`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['critical', 'high', 'medium', 'low', 'info'] as const)
                    .filter(s => severityTotals[s] > 0)
                    .map(sev => (
                      <SeverityBadge key={sev} severity={sev} count={severityTotals[sev]} />
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No findings yet</p>
            )}
          </div>

          {/* Recent Activity */}
          <div
            className="rounded-lg border p-5"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
          >
            <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Recent Activity
            </h3>
            {recentMonitors.length > 0 ? (
              <div className="space-y-3">
                {recentMonitors.map(m => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: m.findingCounts.critical > 0 || m.findingCounts.high > 0 ? 'var(--severity-high)' : 'var(--severity-low)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-mono truncate" style={{ color: 'var(--text-primary)' }}>{m.url}</div>
                      <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {Object.values(m.findingCounts).reduce((a, b) => a + b, 0)} findings
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No recent scans</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
