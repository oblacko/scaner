import { useState } from 'react';
import { Clock, Search, Filter, ExternalLink, Loader2, CheckCircle, XCircle } from 'lucide-react';
import TopBar from '@/components/TopBar';
import SeverityBadge from '@/components/SeverityBadge';
import { useMonitors } from '@/contexts/MonitorsContext';
import { api } from '@/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, subDays } from 'date-fns';
import type { Scan, Finding } from '@/types';

export default function ScanHistory() {
  const { scans, isLoading } = useMonitors();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [selectedFindings, setSelectedFindings] = useState<Finding[]>([]);

  const filtered = scans
    .filter(s => {
      const matchesSearch = !search || s.target.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchesDate = dateRange === 'all' || (() => {
        const d = new Date(s.startedAt);
        if (dateRange === '24h') return d > subDays(new Date(), 1);
        if (dateRange === '7d') return d > subDays(new Date(), 7);
        if (dateRange === '30d') return d > subDays(new Date(), 30);
        return true;
      })();
      return matchesSearch && matchesStatus && matchesDate;
    });

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const severityOrder = ['critical', 'high', 'medium', 'low', 'info'] as const;

  const openScan = async (scan: Scan) => {
    setSelectedScan(scan);
    setSelectedFindings([]);
    try {
      const data = await api.getScan(scan.id);
      setSelectedFindings(data.findings || []);
    } catch {
      // If API fails, use empty findings
      setSelectedFindings([]);
    }
  };

  if (isLoading) {
    return (
      <div>
        <TopBar title="Scan History" />
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin-slow" style={{ color: 'var(--accent-cyan)' }} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Scan History" />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
        <div className="relative flex-1 max-w-[280px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by target URL..."
            className="w-full h-8 pl-9 pr-3 rounded-md text-[12px] focus-ring outline-none"
            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
        </div>
        <div className="flex gap-1">
          {(['24h', '7d', '30d', 'all'] as const).map(range => (
            <button key={range} onClick={() => setDateRange(range)}
              className="h-8 px-3 rounded-md text-[11px] font-medium transition-all border focus-ring"
              style={{ backgroundColor: dateRange === range ? 'rgba(0,212,170,0.1)' : 'var(--bg-tertiary)', borderColor: dateRange === range ? 'var(--accent-cyan)' : 'var(--border-subtle)', color: dateRange === range ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
              {range === 'all' ? 'All' : `Last ${range}`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={12} style={{ color: 'var(--text-muted)' }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="h-8 px-2 rounded-md text-[12px] focus-ring cursor-pointer outline-none"
            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
          {/* Header */}
          <div className="grid grid-cols-[140px_1fr_140px_80px_140px_100px_100px] gap-4 px-4 h-9 items-center text-[11px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-tertiary)' }}>
            <span>Time</span><span>Target</span><span>Templates</span><span>Duration</span><span>Findings</span><span>Status</span><span className="text-right">Actions</span>
          </div>

          {/* Rows */}
          {filtered.map((scan, idx) => {
            const findingCounts = severityOrder.reduce((acc, sev) => {
              acc[sev] = scan.findings?.filter((f: Finding) => f.severity === sev).length || 0;
              return acc;
            }, {} as Record<string, number>);

            return (
              <div key={scan.id}
                className="grid grid-cols-[140px_1fr_140px_80px_140px_100px_100px] gap-4 px-4 h-[52px] items-center transition-colors"
                style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: idx % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)' }}>
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{format(new Date(scan.startedAt), 'MMM dd, HH:mm')}</span>
                <span className="text-[12px] font-mono truncate" style={{ color: 'var(--text-primary)' }} title={scan.target}>{scan.target}</span>
                <span className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>{scan.templates}</span>
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{scan.status === 'running' ? '—' : formatDuration(scan.duration)}</span>
                <div className="flex flex-wrap gap-1">
                  {severityOrder.filter(s => findingCounts[s] > 0).map(sev => <SeverityBadge key={sev} severity={sev} count={findingCounts[sev]} />)}
                  {(!scan.findings || scan.findings.length === 0) && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>None</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  {scan.status === 'running' && <Loader2 size={12} className="animate-spin-slow" style={{ color: 'var(--accent-cyan)' }} />}
                  {scan.status === 'completed' && <CheckCircle size={12} style={{ color: 'var(--severity-low)' }} />}
                  {scan.status === 'failed' && <XCircle size={12} style={{ color: 'var(--severity-high)' }} />}
                  <span className="text-[11px] font-medium capitalize" style={{ color: 'var(--text-secondary)' }}>{scan.status}</span>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => openScan(scan)}
                    className="flex items-center gap-1 h-6 px-2 rounded text-[11px] font-medium transition-colors focus-ring"
                    style={{ color: 'var(--accent-cyan)' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0,212,170,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    <ExternalLink size={11} /> Report
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <Clock size={48} style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-[15px] font-semibold mt-4" style={{ color: 'var(--text-primary)' }}>No scans yet</h3>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>Run a scan from the Monitors page to see results here</p>
        </div>
      )}

      {/* Report Modal */}
      <Dialog open={!!selectedScan} onOpenChange={() => setSelectedScan(null)}>
        <DialogContent className="max-w-[800px] max-h-[85vh] p-0 overflow-hidden border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
          {selectedScan && (
            <>
              <DialogHeader className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-[15px] font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedScan.target}</DialogTitle>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{format(new Date(selectedScan.startedAt), 'MMM dd, yyyy HH:mm:ss')}</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{formatDuration(selectedScan.duration)}</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{selectedScan.templates}</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(0,212,170,0.1)', color: 'var(--accent-cyan)' }}>{selectedFindings.length} findings</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="findings" className="flex flex-col flex-1 overflow-hidden">
                <TabsList className="mx-6 mt-4 h-8 w-auto self-start" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <TabsTrigger value="findings" className="text-[12px] h-6 px-3">Findings</TabsTrigger>
                  <TabsTrigger value="terminal" className="text-[12px] h-6 px-3">Terminal Output</TabsTrigger>
                </TabsList>

                <TabsContent value="findings" className="flex-1 overflow-y-auto sentinel-scrollbar px-6 py-4 m-0">
                  {selectedFindings.length > 0 ? (
                    <div className="space-y-3">
                      {selectedFindings.map((finding, idx) => <FindingCard key={finding.id} finding={finding} index={idx} />)}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <CheckCircle size={32} style={{ color: 'var(--severity-low)' }} className="mx-auto mb-2" />
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>No findings detected</p>
                      <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>This scan completed without discovering any vulnerabilities</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="terminal" className="flex-1 overflow-hidden m-0">
                  <div className="m-6 p-4 rounded-md overflow-auto sentinel-scrollbar font-mono text-[11px] leading-relaxed max-h-[50vh]"
                    style={{ backgroundColor: '#0D0E12', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    {(() => {
                      const raw = selectedScan.terminalOutput as any;
                      const lines = Array.isArray(raw) ? raw : String(raw || '').split('\n');
                      return lines.map((line: string, i: number) => (
                      <div key={i} className="whitespace-pre-wrap break-all">
                        {line.startsWith('[INF]') && <><span style={{ color: 'var(--accent-cyan)' }}>[INF]</span><span style={{ color: 'var(--text-secondary)' }}>{line.slice(5)}</span></>}
                        {line.startsWith('[ERR]') && <><span style={{ color: 'var(--severity-high)' }}>[ERR]</span><span style={{ color: 'var(--text-secondary)' }}>{line.slice(5)}</span></>}
                        {line.match(/^\[\d+\]/) && <><span style={{ color: 'var(--accent-cyan)' }}>{line.match(/^\[\d+\]/)?.[0]}</span><span style={{ color: 'var(--severity-high)' }}>{line.replace(/^\[\d+\]/, '')}</span></>}
                        {!line.match(/^\[(INF|ERR|\d+)\]/) && <span>{line}</span>}
                      </div>
                    ));
                    })()}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const borderColors: Record<string, string> = { critical: '#DC2626', high: '#EF4444', medium: '#F59E0B', low: '#10B981', info: '#3B82F6' };
  return (
    <div className="rounded-md p-4 animate-severity-pop" style={{ backgroundColor: 'var(--bg-tertiary)', borderLeft: `3px solid ${borderColors[finding.severity] || '#6B7280'}`, animationDelay: `${index * 80}ms`, opacity: 0 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-mono" style={{ color: 'var(--accent-blue)' }}>{finding.templateId}</span>
            <SeverityBadge severity={finding.severity} />
            {finding.cve && <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>{finding.cve}</span>}
          </div>
          <h4 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{finding.name}</h4>
          <p className="text-[12px] font-mono mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>{finding.matchedAt}</p>
        </div>
      </div>
      {finding.extracted && <div className="mt-2 p-2 rounded font-mono text-[11px]" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>{finding.extracted}</div>}
      {finding.remediation && <div className="mt-2">
        <button onClick={() => setExpanded(!expanded)} className="text-[11px] font-medium focus-ring rounded px-1 -ml-1" style={{ color: 'var(--accent-cyan)' }}>{expanded ? 'Hide' : 'Show'} Remediation</button>
        {expanded && <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>{finding.remediation}</p>}
      </div>}
    </div>
  );
}
