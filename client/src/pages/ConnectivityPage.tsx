import { useState, useEffect } from 'react';
import axios from 'axios';
import { fyers as fyersApi, dhan as dhanApi } from '../services/api';
import Spinner from '../components/ui/Spinner';

type TestStatus = 'idle' | 'testing' | 'live' | 'error';

interface BrokerCardProps {
  logo: string;
  name: string;
  configured: boolean;
  status: TestStatus;
  message: string;
  onTest: () => void;
}

function BrokerCard({ logo, name, configured, status, message, onTest }: BrokerCardProps) {
  const dotColor = {
    idle:    'bg-surface-400',
    testing: 'bg-yellow-400 animate-pulse',
    live:    'bg-profit shadow-[0_0_8px_#3fb950]',
    error:   'bg-loss',
  }[status];

  const badgeStyle = {
    idle:    'bg-surface-300 text-muted border-surface-400',
    testing: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    live:    'bg-profit/15 text-profit border-profit/30',
    error:   'bg-loss/15 text-loss border-loss/30',
  }[status];

  const badgeLabel = {
    idle:    '○ Idle',
    testing: '◌ Testing',
    live:    '● Live',
    error:   '✕ Failed',
  }[status];

  return (
    <div className={`card flex flex-col gap-4 transition-colors ${
      status === 'live'  ? 'border-profit/30' :
      status === 'error' ? 'border-loss/30'   : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-surface-300 flex items-center justify-center text-xl font-bold text-accent">
            {logo}
          </div>
          <div>
            <div className="font-semibold text-primary text-base">{name}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
              <span className="text-xs text-muted">
                {status === 'idle' ? (configured ? 'Configured' : 'Not configured') :
                 status === 'testing' ? 'Testing…' :
                 status === 'live' ? 'Live' : 'Error'}
              </span>
            </div>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badgeStyle}`}>
          {badgeLabel}
        </span>
      </div>

      {/* Message */}
      {message && (
        <div className={`text-xs px-3 py-2 rounded-md ${
          status === 'error' ? 'bg-loss/10 text-loss' : 'bg-profit/10 text-profit'
        }`}>
          {message}
        </div>
      )}

      {/* Test button */}
      <button
        onClick={onTest}
        disabled={status === 'testing' || !configured}
        className="btn-primary flex items-center justify-center gap-2 w-full"
      >
        {status === 'testing' ? (
          <><Spinner size="sm" /> Testing…</>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
            Test Connection
          </>
        )}
      </button>
    </div>
  );
}

function PlaceholderCard({ name, logo }: { name: string; logo: string }) {
  return (
    <div className="card flex flex-col gap-4 opacity-40 pointer-events-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-surface-300 flex items-center justify-center text-xl font-bold text-muted">
            {logo}
          </div>
          <div>
            <div className="font-semibold text-muted">{name}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-block h-2 w-2 rounded-full bg-surface-400" />
              <span className="text-xs text-muted">Coming soon</span>
            </div>
          </div>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-surface-300 text-muted border-surface-400">
          Planned
        </span>
      </div>
      <button disabled className="btn-ghost w-full opacity-50 cursor-not-allowed">
        Test Connection
      </button>
    </div>
  );
}

export default function ConnectivityPage() {
  const [fyersConfigured, setFyersConfigured] = useState(false);
  const [dhanConfigured,  setDhanConfigured]  = useState(false);

  const [fyersStatus, setFyersStatus] = useState<TestStatus>('idle');
  const [fyersMsg,    setFyersMsg]    = useState('');
  const [dhanStatus,  setDhanStatus]  = useState<TestStatus>('idle');
  const [dhanMsg,     setDhanMsg]     = useState('');

  useEffect(() => {
    axios.get('/api/fyers/status').then(r => setFyersConfigured(r.data.token_set)).catch(() => {});
    axios.get('/api/dhan/status').then(r  => setDhanConfigured(r.data.token_set)).catch(() => {});
  }, []);

  async function testFyers() {
    setFyersStatus('testing');
    setFyersMsg('');
    try {
      const res = await fyersApi.ping();
      const name = res.data?.data?.name || res.data?.name || '';
      setFyersStatus('live');
      setFyersMsg(`Connected${name ? ` — ${name}` : ''}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setFyersStatus('error');
      setFyersMsg(e?.response?.data?.detail || e?.message || 'Connection failed');
    }
  }

  async function testDhan() {
    setDhanStatus('testing');
    setDhanMsg('');
    try {
      await dhanApi.ping();
      setDhanStatus('live');
      setDhanMsg('Connected — Dhan');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setDhanStatus('error');
      setDhanMsg(e?.response?.data?.detail || e?.message || 'Connection failed');
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">Connectivity</h1>
        <p className="text-sm text-muted mt-1">
          Test broker API connections. Credentials are managed via <span className="font-mono text-accent">backend/.env</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BrokerCard logo="F" name="Fyers"
          configured={fyersConfigured}
          status={fyersStatus} message={fyersMsg}
          onTest={testFyers}
        />
        <BrokerCard logo="D" name="Dhan"
          configured={dhanConfigured}
          status={dhanStatus} message={dhanMsg}
          onTest={testDhan}
        />
        <PlaceholderCard name="Zerodha / Kite" logo="Z" />
        <PlaceholderCard name="Upstox"         logo="U" />
        <PlaceholderCard name="Angel One"      logo="A" />
        <PlaceholderCard name="ICICI Direct"   logo="I" />
      </div>
    </div>
  );
}
