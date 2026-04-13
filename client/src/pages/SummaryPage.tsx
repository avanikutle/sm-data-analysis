import { useState, useCallback } from 'react';
import { fyers as fyersApi, dhan as dhanApi } from '../services/api';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';

type Broker = 'fyers' | 'dhan';
type Tab = 'positions' | 'holdings' | 'funds';

function fmt(n: number, decimals = 2) {
  return n?.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) ?? '—';
}

function PnlCell({ value }: { value: number }) {
  const color = value > 0 ? 'text-profit' : value < 0 ? 'text-loss' : 'text-muted';
  return <span className={color}>{value > 0 ? '+' : ''}{fmt(value)}</span>;
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="py-12 text-center text-muted text-sm">{msg}</div>
  );
}

function PositionsTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return <EmptyState msg="No open positions" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-300">
          <tr>
            {['Symbol', 'Qty', 'Avg Price', 'LTP', 'P&L', 'P&L %'].map(h => (
              <th key={h} className="table-header">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const sym = (row.symbol || row.tradingSymbol || row.scrip_name || row.ticker) as string;
            const qty = Number(row.netQty ?? row.quantity ?? row.buyQty ?? 0);
            const avg = Number(row.netAvg ?? row.avgCostPrice ?? row.buy_avg ?? 0);
            const ltp = Number(row.ltp ?? row.lastTradedPrice ?? 0);
            const pnl = Number(row.pl ?? row.unrealizedProfit ?? row.pnl ?? 0);
            const pnlPct = avg > 0 ? ((ltp - avg) / avg) * 100 : 0;
            return (
              <tr key={i} className="hover:bg-surface-300 transition-colors">
                <td className="table-cell font-medium text-accent">{sym}</td>
                <td className="table-cell">{qty}</td>
                <td className="table-cell">{fmt(avg)}</td>
                <td className="table-cell">{fmt(ltp)}</td>
                <td className="table-cell"><PnlCell value={pnl} /></td>
                <td className="table-cell"><PnlCell value={pnlPct} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HoldingsTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return <EmptyState msg="No holdings" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-300">
          <tr>
            {['Symbol', 'Qty', 'Avg Cost', 'LTP', 'Current Value', 'P&L', 'P&L %'].map(h => (
              <th key={h} className="table-header">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const sym = (row.symbol || row.tradingSymbol || row.ticker) as string;
            const qty = Number(row.holdingQty ?? row.quantity ?? row.totalQty ?? 0);
            const avg = Number(row.costPrice ?? row.averageCostPrice ?? row.avg_price ?? 0);
            const ltp = Number(row.ltp ?? row.lastTradedPrice ?? 0);
            const current = qty * ltp;
            const pnl = current - qty * avg;
            const pnlPct = avg > 0 ? ((ltp - avg) / avg) * 100 : 0;
            return (
              <tr key={i} className="hover:bg-surface-300 transition-colors">
                <td className="table-cell font-medium text-accent">{sym}</td>
                <td className="table-cell">{qty}</td>
                <td className="table-cell">{fmt(avg)}</td>
                <td className="table-cell">{fmt(ltp)}</td>
                <td className="table-cell">{fmt(current)}</td>
                <td className="table-cell"><PnlCell value={pnl} /></td>
                <td className="table-cell"><PnlCell value={pnlPct} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FundsView({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <EmptyState msg="No fund data" />;

  const rows: { label: string; value: string }[] = [];
  const add = (label: string, keys: string[]) => {
    for (const k of keys) {
      if (data[k] !== undefined) {
        rows.push({ label, value: `₹ ${fmt(Number(data[k]))}` });
        return;
      }
    }
  };

  add('Available Balance', ['availabelBalance', 'availableBalance', 'fund', 'cash']);
  add('Used Margin', ['utilizedAmount', 'usedMargin', 'utilized']);
  add('Total Balance', ['totalBalance', 'total_balance', 'balance']);
  add('Withdrawable', ['withdrawableBalance', 'withdrawable']);
  add('SPAN Margin', ['span', 'spanMargin']);
  add('Exposure Margin', ['exposure', 'exposureMargin']);

  if (!rows.length) {
    return (
      <pre className="text-xs text-muted overflow-auto p-4">{JSON.stringify(data, null, 2)}</pre>
    );
  }

  return (
    <div className="divide-y divide-surface-300">
      {rows.map(r => (
        <div key={r.label} className="flex justify-between items-center px-4 py-3 text-sm">
          <span className="text-muted">{r.label}</span>
          <span className="font-medium text-primary">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

interface BrokerState {
  positions: Record<string, unknown>[];
  holdings: Record<string, unknown>[];
  funds: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  loaded: boolean;
}

const initState = (): BrokerState => ({
  positions: [], holdings: [], funds: null, loading: false, error: null, loaded: false,
});

export default function SummaryPage() {
  const [fyersState, setFyersState] = useState<BrokerState>(initState);
  const [dhanState, setDhanState] = useState<BrokerState>(initState);
  const [activeBroker, setActiveBroker] = useState<Broker>('fyers');
  const [activeTab, setActiveTab] = useState<Tab>('positions');

  const fetchFyers = useCallback(async () => {
    setFyersState(s => ({ ...s, loading: true, error: null }));
    try {
      const [pos, hold, funds] = await Promise.all([
        fyersApi.positions().catch(() => ({ data: { netPositions: [] } })),
        fyersApi.holdings().catch(() => ({ data: { holdings: [] } })),
        fyersApi.funds().catch(() => ({ data: { fund_limit: {} } })),
      ]);
      const positions = pos.data?.netPositions ?? pos.data?.positions ?? [];
      const holdings = hold.data?.holdings ?? [];
      const fundsData = funds.data?.fund_limit ?? funds.data?.data ?? funds.data ?? null;
      setFyersState({ positions, holdings, funds: fundsData, loading: false, error: null, loaded: true });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setFyersState(s => ({ ...s, loading: false, error: err?.response?.data?.message || err?.message || 'Failed' }));
    }
  }, []);

  const fetchDhan = useCallback(async () => {
    setDhanState(s => ({ ...s, loading: true, error: null }));
    try {
      const [pos, hold, funds] = await Promise.all([
        dhanApi.positions().catch(() => ({ data: [] })),
        dhanApi.holdings().catch(() => ({ data: [] })),
        dhanApi.funds().catch(() => ({ data: {} })),
      ]);
      const positions = Array.isArray(pos.data) ? pos.data : pos.data?.data ?? [];
      const holdings = Array.isArray(hold.data) ? hold.data : hold.data?.data ?? [];
      setDhanState({ positions, holdings, funds: funds.data, loading: false, error: null, loaded: true });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setDhanState(s => ({ ...s, loading: false, error: err?.response?.data?.message || err?.message || 'Failed' }));
    }
  }, []);

  function fetchAll() {
    fetchFyers();
    fetchDhan();
  }

  const state = activeBroker === 'fyers' ? fyersState : dhanState;

  const tabs: Tab[] = ['positions', 'holdings', 'funds'];

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-primary">Summary</h1>
          <p className="text-muted text-sm mt-1">Portfolio overview across brokers</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={fetchAll}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh All
        </button>
      </div>

      {/* Broker selector */}
      <div className="flex gap-2 mb-4">
        {(['fyers', 'dhan'] as Broker[]).map(b => {
          const s = b === 'fyers' ? fyersState : dhanState;
          return (
            <button
              key={b}
              onClick={() => setActiveBroker(b)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                activeBroker === b
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'border-surface-400 text-muted hover:text-primary hover:bg-surface-300'
              }`}
            >
              {b === 'fyers' ? 'Fyers' : 'Dhan'}
              {s.loading && <Spinner size="sm" />}
              {s.loaded && !s.error && <Badge variant="success">OK</Badge>}
              {s.error && <Badge variant="error">Err</Badge>}
            </button>
          );
        })}
      </div>

      {!state.loaded && !state.loading && (
        <div className="card text-center py-16">
          <p className="text-muted text-sm mb-4">Click <strong>Refresh All</strong> to fetch portfolio data.</p>
          <p className="text-xs text-muted">Make sure credentials are configured on the Connectivity page.</p>
        </div>
      )}

      {state.loading && (
        <div className="card flex items-center justify-center py-16 gap-3">
          <Spinner />
          <span className="text-muted text-sm">Fetching data…</span>
        </div>
      )}

      {state.error && (
        <div className="card border-loss/30 bg-loss/10 text-loss text-sm py-4 px-4">
          {state.error}
        </div>
      )}

      {state.loaded && !state.loading && (
        <div className="card p-0 overflow-hidden">
          <div className="flex border-b border-surface-400 bg-surface-300">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${
                  activeTab === t
                    ? 'text-accent border-b-2 border-accent -mb-px'
                    : 'text-muted hover:text-primary'
                }`}
              >
                {t}
                {t === 'positions' && (
                  <span className="ml-2 text-xs bg-surface-400 text-muted rounded-full px-1.5 py-0.5">
                    {state.positions.length}
                  </span>
                )}
                {t === 'holdings' && (
                  <span className="ml-2 text-xs bg-surface-400 text-muted rounded-full px-1.5 py-0.5">
                    {state.holdings.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div>
            {activeTab === 'positions' && <PositionsTable data={state.positions} />}
            {activeTab === 'holdings' && <HoldingsTable data={state.holdings} />}
            {activeTab === 'funds' && <FundsView data={state.funds} />}
          </div>
        </div>
      )}
    </div>
  );
}
