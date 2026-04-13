import { useState, useRef } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { fyers as fyersApi, store as storeApi } from '../services/api';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';

// ── Constants ──────────────────────────────────────────────────────────────

const RESOLUTIONS = [
  { label: '1m',  value: '1',  intraday: true,  defaultDays: 1  },
  { label: '5m',  value: '5',  intraday: true,  defaultDays: 3  },
  { label: '15m', value: '15', intraday: true,  defaultDays: 5  },
  { label: '30m', value: '30', intraday: true,  defaultDays: 10 },
  { label: '1h',  value: '60', intraday: true,  defaultDays: 30 },
  { label: '1D',  value: 'D',  intraday: false, defaultDays: 90 },
  { label: '1W',  value: 'W',  intraday: false, defaultDays: 365 },
  { label: '1M',  value: 'M',  intraday: false, defaultDays: 730 },
];

const QUICK_SYMBOLS = [
  { group: 'MCX Gold',    symbols: ['MCX:GOLD26JUNFUT', 'MCX:GOLD26AUGFUT', 'MCX:GOLDM26MAYFUT', 'MCX:GOLDM26JUNFUT'] },
  { group: 'MCX Silver',  symbols: ['MCX:SILVER26MAYFUT', 'MCX:SILVERMIC26MAYFUT'] },
  { group: 'MCX Crude',   symbols: ['MCX:CRUDEOIL26MAYFUT', 'MCX:CRUDEOILM26MAYFUT'] },
  { group: 'NSE Index',   symbols: ['NSE:NIFTY50-INDEX', 'NSE:NIFTYBANK-INDEX'] },
  { group: 'NSE Stocks',  symbols: ['NSE:SBIN-EQ', 'NSE:RELIANCE-EQ', 'NSE:INFY-EQ', 'NSE:TCS-EQ'] },
];

// ── Types ──────────────────────────────────────────────────────────────────

type Candle = [number, number, number, number, number, number];
type ChartPoint = { time: string; open: number; high: number; low: number; close: number; volume: number };

// ── Helpers ────────────────────────────────────────────────────────────────

function dateStr(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function toDateTime(ts: number, resolution: string) {
  const d = new Date(ts * 1000);
  if (['D', 'W', 'M'].includes(resolution))
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
}

const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-300 border border-surface-400 rounded-lg p-3 text-xs space-y-1 shadow-xl">
      <div className="text-muted font-medium mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.dataKey}</span>
          <span className="text-primary font-medium">
            {typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function DataAnalysisPage() {
  const [symbol, setSymbol]     = useState('MCX:GOLD26JUNFUT');
  const [resolution, setResolution] = useState('5');
  const [fromDate, setFromDate] = useState(dateStr(3));
  const [toDate,   setToDate]   = useState(dateStr(0));
  const [showSymbols, setShowSymbols] = useState(false);

  const [data,    setData]    = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const [saveStatus, setSaveStatus] = useState('');
  const [saving,     setSaving]     = useState(false);

  const [livePrice,     setLivePrice]     = useState<{ ltp: number; chg: number; pctChg: number } | null>(null);
  const [livePollActive, setLivePollActive] = useState(false);
  const liveInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-adjust date range when resolution changes
  function changeResolution(res: typeof RESOLUTIONS[0]) {
    setResolution(res.value);
    setFromDate(dateStr(res.defaultDays));
    setToDate(dateStr(0));
  }

  function pickSymbol(sym: string) {
    setSymbol(sym);
    setShowSymbols(false);
  }

  async function fetchHistory() {
    setLoading(true);
    setError('');
    setData([]);
    try {
      const from = Math.floor(new Date(fromDate).getTime() / 1000);
      const to   = Math.floor(new Date(toDate + 'T23:59:59').getTime() / 1000);
      const res  = await fyersApi.history({ symbol, resolution, date_format: 0, range_from: from, range_to: to, cont_flag: 1 });
      const candles: Candle[] = res.data?.candles ?? res.data?.data?.candles ?? [];
      if (!candles.length) {
        setError('No candles returned. Check the symbol format or try a smaller date range.');
        return;
      }
      setData(candles.map(c => ({
        time:   toDateTime(c[0], resolution),
        open:   c[1], high: c[2], low: c[3], close: c[4], volume: c[5],
      })));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } }; message?: string };
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed';
      setError(msg === 'Invalid symbol provided'
        ? `Invalid symbol "${symbol}". Use format MCX:GOLD26JUNFUT · NSE:SBIN-EQ · BSE:SENSEX-INDEX`
        : msg);
    } finally {
      setLoading(false);
    }
  }

  async function pollLive() {
    try {
      const res = await fyersApi.quotes(symbol);
      const q   = res.data?.d?.[0]?.v;
      if (q) setLivePrice({ ltp: q.lp ?? q.ltp ?? 0, chg: q.ch ?? 0, pctChg: q.chp ?? 0 });
    } catch { /* silent */ }
  }

  function toggleLive() {
    if (livePollActive) {
      if (liveInterval.current) clearInterval(liveInterval.current);
      setLivePollActive(false);
    } else {
      pollLive();
      liveInterval.current = setInterval(pollLive, 5000);
      setLivePollActive(true);
    }
  }

  async function saveToDb() {
    setSaving(true);
    setSaveStatus('');
    try {
      const from = Math.floor(new Date(fromDate).getTime() / 1000);
      const to   = Math.floor(new Date(toDate + 'T23:59:59').getTime() / 1000);
      const res  = await storeApi.fetchAndSave({ symbol, resolution, range_from: from, range_to: to });
      setSaveStatus(`Saved ${res.data.saved} new candles (${res.data.total_in_response} in response).`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      setSaveStatus(`Error: ${err?.response?.data?.detail || err?.message}`);
    } finally {
      setSaving(false);
    }
  }

  const activeRes   = RESOLUTIONS.find(r => r.value === resolution)!;
  const priceColor  = livePrice && livePrice.chg >= 0 ? 'text-profit' : 'text-loss';

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">Data Analysis</h1>
        <p className="text-muted text-sm mt-1">Historical and live market data via Fyers API</p>
      </div>

      {/* ── Controls ── */}
      <div className="card mb-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Symbol input + picker toggle */}
          <div className="flex-1 min-w-52 relative">
            <label className="block text-xs text-muted mb-1">Symbol</label>
            <div className="flex gap-1">
              <input
                className="input-field"
                value={symbol}
                onChange={e => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. MCX:GOLD26JUNFUT"
              />
              <button
                onClick={() => setShowSymbols(s => !s)}
                className={`px-3 py-2 rounded-md text-xs border transition-colors ${
                  showSymbols ? 'bg-accent text-surface-100 border-accent' : 'border-surface-400 text-muted hover:text-primary hover:bg-surface-300'
                }`}
                title="Browse common symbols"
              >
                ⊞
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">From</label>
            <input className="input-field w-36" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">To</label>
            <input className="input-field w-36" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-xs text-muted">Resolution</label>
              {activeRes.intraday && (
                <span className="text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
                  Intraday · max 100 days
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {RESOLUTIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => changeResolution(r)}
                  className={`px-2.5 py-1.5 text-xs rounded transition-colors ${
                    resolution === r.value
                      ? 'bg-accent text-surface-100'
                      : 'bg-surface-300 text-muted hover:text-primary hover:bg-surface-400'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary flex items-center gap-2" onClick={fetchHistory} disabled={loading}>
            {loading ? <Spinner size="sm" /> : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" />
              </svg>
            )}
            Fetch
          </button>

          <button className="btn-ghost flex items-center gap-2" onClick={saveToDb} disabled={saving}
            title="Save candles to local database">
            {saving ? <Spinner size="sm" /> : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
            Save to DB
          </button>
        </div>

        {/* ── Symbol quick-pick panel ── */}
        {showSymbols && (
          <div className="border-t border-surface-400 pt-3 space-y-2">
            {QUICK_SYMBOLS.map(group => (
              <div key={group.group} className="flex items-start gap-3">
                <span className="text-xs text-muted w-24 shrink-0 pt-1">{group.group}</span>
                <div className="flex flex-wrap gap-1.5">
                  {group.symbols.map(s => (
                    <button
                      key={s}
                      onClick={() => pickSymbol(s)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        symbol === s
                          ? 'bg-accent/20 border-accent/50 text-accent'
                          : 'bg-surface-300 border-surface-400 text-muted hover:text-primary hover:border-accent/40'
                      }`}
                    >
                      {s.split(':')[1]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted pt-1">
              Format: <span className="font-mono text-primary">EXCHANGE:SYMBOL</span> — e.g.
              <span className="font-mono text-accent"> MCX:GOLD26JUNFUT</span>,
              <span className="font-mono text-accent"> NSE:SBIN-EQ</span>
            </p>
          </div>
        )}
      </div>

      {/* ── Live price strip ── */}
      <div className="card mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-primary">{symbol}</span>
          {livePrice ? (
            <>
              <span className={`text-lg font-bold ${priceColor}`}>
                ₹{livePrice.ltp.toLocaleString('en-IN')}
              </span>
              <span className={`text-sm ${priceColor}`}>
                {livePrice.chg >= 0 ? '+' : ''}{livePrice.chg.toFixed(2)} ({livePrice.pctChg.toFixed(2)}%)
              </span>
            </>
          ) : (
            <span className="text-muted text-sm">—</span>
          )}
          {livePollActive && <Badge variant="success">Live</Badge>}
        </div>
        <button className={livePollActive ? 'btn-ghost' : 'btn-primary'} onClick={toggleLive}>
          {livePollActive ? 'Stop Live' : 'Start Live'}
        </button>
      </div>

      {/* ── Status messages ── */}
      {saveStatus && (
        <div className={`card text-sm py-3 px-4 mb-4 ${saveStatus.startsWith('Error') ? 'border-loss/30 bg-loss/10 text-loss' : 'border-profit/30 bg-profit/10 text-profit'}`}>
          {saveStatus}
        </div>
      )}
      {error && (
        <div className="card border-loss/30 bg-loss/10 text-loss text-sm py-3 px-4 mb-4">
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="card flex items-center justify-center py-16 gap-3">
          <Spinner />
          <span className="text-muted text-sm">Loading candles…</span>
        </div>
      )}

      {/* ── Charts + table ── */}
      {!loading && data.length > 0 && (
        <div className="space-y-4">
          {/* Close price */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted">Close Price</span>
              <span className="text-xs text-muted">{data.length} candles · {resolution} resolution</span>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid stroke="#30363d" strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fill: '#8b949e', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#8b949e', fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={v => `₹${v.toLocaleString('en-IN')}`} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#8b949e' }} />
                <Line type="monotone" dataKey="close" stroke="#58a6ff" dot={false} strokeWidth={1.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Volume */}
          <div className="card p-4">
            <div className="text-sm font-medium text-muted mb-3">Volume</div>
            <ResponsiveContainer width="100%" height={140}>
              <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid stroke="#30363d" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#8b949e', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} tickLine={false} axisLine={false} width={50}
                  tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="volume" fill="#3fb95060" radius={[2, 2, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* OHLC table */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-400 text-sm font-medium text-muted">
              OHLC — {data.length} candles
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-surface-300 sticky top-0">
                  <tr>{['Time','Open','High','Low','Close','Volume'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {[...data].reverse().map((row, i) => (
                    <tr key={i} className="hover:bg-surface-300 transition-colors">
                      <td className="table-cell text-muted">{row.time}</td>
                      <td className="table-cell">{row.open.toFixed(2)}</td>
                      <td className="table-cell text-profit">{row.high.toFixed(2)}</td>
                      <td className="table-cell text-loss">{row.low.toFixed(2)}</td>
                      <td className={`table-cell font-medium ${row.close >= row.open ? 'text-profit' : 'text-loss'}`}>
                        {row.close.toFixed(2)}
                      </td>
                      <td className="table-cell text-muted">{row.volume.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!loading && data.length === 0 && !error && (
        <div className="card text-center py-16 text-muted text-sm space-y-2">
          <div>Select a symbol and click <strong className="text-primary">Fetch</strong></div>
          <div className="text-xs">Click <strong className="text-primary">⊞</strong> next to the symbol box to browse Gold, Silver, Crude & equity symbols</div>
        </div>
      )}
    </div>
  );
}
