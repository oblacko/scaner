import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { api, auth } from '@/api';

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token } = await api.login(password);
      auth.token = token;
      onSuccess();
    } catch {
      setError('Invalid password');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <form
        onSubmit={submit}
        className="w-[360px] rounded-lg border p-8 flex flex-col items-center"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(0,212,170,0.1)' }}>
          <ShieldCheck size={24} style={{ color: 'var(--accent-cyan)' }} />
        </div>
        <h1 className="text-[18px] font-mono font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Sentinel</h1>
        <p className="text-[12px] mb-6" style={{ color: 'var(--text-muted)' }}>Enter your password to continue</p>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full h-9 px-3 rounded-md text-[13px] focus-ring outline-none mb-3"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: `1px solid ${error ? 'var(--severity-high)' : 'var(--border-subtle)'}`, color: 'var(--text-primary)' }}
        />
        {error && <p className="text-[11px] self-start mb-3" style={{ color: 'var(--severity-high)' }}>{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full h-9 rounded-md text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 focus-ring"
          style={{ backgroundColor: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
        >
          {loading && <Loader2 size={14} className="animate-spin-slow" />}
          Sign In
        </button>
      </form>
    </div>
  );
}
