import { useState } from 'react';
import { Mail, Send, MessageCircle, Link, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import TopBar from '@/components/TopBar';
import { Switch } from '@/components/ui/switch';
import { useNotifications } from '@/contexts/NotificationsContext';
import type { NotificationChannel } from '@/types';

const CHANNEL_META: Record<string, { icon: React.ReactNode; description: string }> = {
  email: { icon: <Mail size={20} />, description: 'Receive email alerts for scan findings' },
  slack: { icon: <SlackIcon />, description: 'Send notifications to a Slack channel' },
  telegram: { icon: <Send size={20} />, description: 'Get alerts via Telegram bot' },
  discord: { icon: <MessageCircle size={20} />, description: 'Post findings to Discord' },
  webhook: { icon: <Link size={20} />, description: 'Call a custom HTTP endpoint' },
};

function SlackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H17.5V9H14.5V2Z" />
      <path d="M14.5 13H17.5V22H14.5V13Z" />
      <path d="M2 9.5H9V12.5H2V9.5Z" />
      <path d="M13 9.5H22V12.5H13V9.5Z" />
      <path d="M9.5 14H12.5V17H9.5V14Z" />
      <path d="M9.5 2H12.5V6H9.5V2Z" />
      <path d="M6 14H9V22H6V14Z" />
      <path d="M6 6H9V9H6V6Z" />
    </svg>
  );
}

export default function Notifications() {
  const { channels, updateChannel, testConnection } = useNotifications();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    const result = await testConnection(id);
    setTestingId(null);
    setTestResult({ id, success: result.success });
    setTimeout(() => setTestResult(null), 3000);
  };

  return (
    <div>
      <TopBar title="Notifications" />

      <div className="grid grid-cols-2 gap-4">
        {channels.map(channel => {
          const meta = CHANNEL_META[channel.type];
          const isExpanded = expandedId === channel.id;
          const isTesting = testingId === channel.id;
          const lastResult = testResult?.id === channel.id ? testResult : null;

          return (
            <div
              key={channel.id}
              className="rounded-lg border p-5 transition-all duration-200 hover:shadow-md"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span style={{ color: 'var(--text-secondary)' }}>{meta.icon}</span>
                  <div>
                    <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{channel.name}</h3>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{meta.description}</p>
                  </div>
                </div>
                <Switch
                  checked={channel.enabled}
                  onCheckedChange={v => updateChannel(channel.id, { enabled: v })}
                />
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: channel.connected ? 'var(--status-online)' : 'var(--status-offline)' }}
                />
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {channel.connected ? 'Connected' : 'Not configured'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : channel.id)}
                  className="h-7 px-3 rounded-md text-[11px] font-medium transition-colors border focus-ring"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-active)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  {isExpanded ? 'Hide' : 'Configure'}
                </button>
                {channel.enabled && (
                  <button
                    onClick={() => handleTest(channel.id)}
                    disabled={isTesting}
                    className="h-7 px-3 rounded-md text-[11px] font-medium transition-colors border focus-ring flex items-center gap-1"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {isTesting && <Loader2 size={10} className="animate-spin-slow" />}
                    Test
                  </button>
                )}
                {lastResult && (
                  lastResult.success
                    ? <CheckCircle size={14} style={{ color: 'var(--status-online)' }} />
                    : <XCircle size={14} style={{ color: 'var(--status-offline)' }} />
                )}
              </div>

              {/* Expanded Config */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  <ChannelConfigForm channel={channel} onUpdate={updateChannel} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChannelConfigForm({ channel, onUpdate }: { channel: NotificationChannel; onUpdate: (id: string, updates: Partial<NotificationChannel>) => void }) {
  const [config, setConfig] = useState(channel.config);

  const handleChange = (key: string, value: string) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate(channel.id, { config: newConfig });
  };

  return (
    <div className="space-y-3">
      {channel.type === 'email' && (
        <div>
          <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Email Address</label>
          <input
            type="email"
            value={config.address || ''}
            onChange={e => handleChange('address', e.target.value)}
            placeholder="admin@example.com"
            className="w-full h-8 px-3 rounded-md text-[12px] focus-ring outline-none font-mono"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
        </div>
      )}

      {channel.type === 'slack' && (
        <>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Webhook URL</label>
            <input
              type="password"
              value={config.webhook || ''}
              onChange={e => handleChange('webhook', e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full h-8 px-3 rounded-md text-[12px] focus-ring outline-none font-mono"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Channel Override (optional)</label>
            <input
              value={config.channel || ''}
              onChange={e => handleChange('channel', e.target.value)}
              placeholder="#security-alerts"
              className="w-full h-8 px-3 rounded-md text-[12px] focus-ring outline-none font-mono"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>
        </>
      )}

      {channel.type === 'telegram' && (
        <>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Bot Token</label>
            <input
              type="password"
              value={config.botToken || ''}
              onChange={e => handleChange('botToken', e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="w-full h-8 px-3 rounded-md text-[12px] focus-ring outline-none font-mono"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Chat ID</label>
            <input
              value={config.chatId || ''}
              onChange={e => handleChange('chatId', e.target.value)}
              placeholder="-1001234567890"
              className="w-full h-8 px-3 rounded-md text-[12px] focus-ring outline-none font-mono"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>
        </>
      )}

      {channel.type === 'discord' && (
        <>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Webhook URL</label>
            <input
              type="password"
              value={config.webhook || ''}
              onChange={e => handleChange('webhook', e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full h-8 px-3 rounded-md text-[12px] focus-ring outline-none font-mono"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Username Override</label>
            <input
              value={config.username || ''}
              onChange={e => handleChange('username', e.target.value)}
              placeholder="Sentinel"
              className="w-full h-8 px-3 rounded-md text-[12px] focus-ring outline-none"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>
        </>
      )}

      {channel.type === 'webhook' && (
        <>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>URL</label>
            <input
              value={config.url || ''}
              onChange={e => handleChange('url', e.target.value)}
              placeholder="https://your-api.com/webhook"
              className="w-full h-8 px-3 rounded-md text-[12px] focus-ring outline-none font-mono"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Method</label>
            <select
              value={config.method || 'POST'}
              onChange={e => handleChange('method', e.target.value)}
              className="w-full h-8 px-3 rounded-md text-[12px] focus-ring outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}
