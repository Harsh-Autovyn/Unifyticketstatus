import React, { useState, useEffect } from 'react';
import { getDashboardData, type DashboardData } from './data/ticketService';
import { StatusChart } from './components/StatusChart';
import { TicketList } from './components/TicketList';
import {
  Inbox,
  CheckCircle2,
  Clock,
  RefreshCw,
  Calendar,
  Database,
  AlertTriangle,
  ShieldCheck,
  X,
  LogOut,
} from 'lucide-react';
import { Login } from './components/Login';

// ── Helper: format date for display ──────────────────────────────────────────
function fmtDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[Number(m) - 1]} ${y}`;
}

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [syncTime, setSyncTime] = useState<string>('');
  const [showBanner, setShowBanner] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('unify_authenticated') === 'true';
  });

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getDashboardData();
      setData(res);
      const dates = Array.from(new Set(res.tickets.map(t => t.Date)))
        .filter(Boolean)
        .sort();
      setAvailableDates(dates);
      if (dates.length > 0) {
        setStartDate(dates[0]);
        setEndDate(dates[dates.length - 1]);
      }

      // Update sync timestamp
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const dateStr = now.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
      setSyncTime(`${dateStr} ${timeStr}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <Inbox className="w-6 h-6 text-indigo-600 absolute" />
        </div>
        <p className="mt-4 text-sm text-slate-500 font-semibold animate-pulse">Loading Unify Dashboard…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="p-4 rounded-full bg-rose-100 text-rose-600 mb-4">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-slate-900">Error Loading Dashboard</h2>
        <p className="text-sm text-slate-500 mb-6 text-center max-w-md">{error || 'Unable to load ticket details.'}</p>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  // ── Filter by date range ──────────────────────────────────────────────────
  const filteredTickets = data.tickets.filter(t => {
    if (!t.Date) return false;
    if (startDate && t.Date < startDate) return false;
    if (endDate && t.Date > endDate) return false;
    return true;
  });

  // ── Core KPIs ─────────────────────────────────────────────────────────────
  const total = filteredTickets.length;
  const resolved = filteredTickets.filter(t => t.Status === 'Resolved').length;
  const pending = filteredTickets.filter(t => t.Status === 'Pending' && t.ownership !== 'Service Request').length;

  // ── Ownership split ───────────────────────────────────────────────────────
  const autovynTickets = filteredTickets.filter(t => t.ownership === 'Autovyn');
  const thirdPartyTickets = filteredTickets.filter(t => t.ownership === 'Third Party');
  const serviceRequestTickets = filteredTickets.filter(t => t.ownership === 'Service Request');

  const autovynResolved = autovynTickets.filter(t => t.Status === 'Resolved').length;
  const thirdPartyResolved = thirdPartyTickets.filter(t => t.Status === 'Resolved').length;
  const serviceRequestResolved = serviceRequestTickets.filter(t => t.Status === 'Resolved').length;

  // ── Custom category groups ────────────────────────────────────────────────
  const dealerCrmTickets = filteredTickets.filter(t => (t['Sub Category'] || '').trim().toLowerCase() === 'dealer crm related');
  const revertL1Tickets = filteredTickets.filter(t => (t['Sub Category'] || '').trim().toLowerCase() === 'revert back to l1');
  const userGuidanceTickets = filteredTickets.filter(t => (t['Sub Category'] || '').trim().toLowerCase() === 'user guidance');

  // ── Sub-category breakdown – AUTOVYN (total + resolved per sub) ───────────
  const autovynBreakdown: Record<string, { total: number; resolved: number }> = {};
  autovynTickets.forEach(t => {
    const sub = t['Sub Category'] || 'Other';
    if (!autovynBreakdown[sub]) autovynBreakdown[sub] = { total: 0, resolved: 0 };
    autovynBreakdown[sub].total += 1;
    if (t.Status === 'Resolved') autovynBreakdown[sub].resolved += 1;
  });

  // ── Sub-category breakdown – THIRD PARTY (total + resolved per sub) ───────
  const thirdPartyBreakdown: Record<string, { total: number; resolved: number }> = {};
  thirdPartyTickets.forEach(t => {
    const sub = t['Sub Category'] || 'Other';
    if (!thirdPartyBreakdown[sub]) thirdPartyBreakdown[sub] = { total: 0, resolved: 0 };
    thirdPartyBreakdown[sub].total += 1;
    if (t.Status === 'Resolved') thirdPartyBreakdown[sub].resolved += 1;
  });

  // ── Sub-category breakdown – SERVICE REQUEST (total + resolved per sub) ───
  const serviceRequestBreakdown: Record<string, { total: number; resolved: number }> = {};
  serviceRequestTickets.forEach(t => {
    const sub = t['Sub Category'] || 'Other';
    if (!serviceRequestBreakdown[sub]) serviceRequestBreakdown[sub] = { total: 0, resolved: 0 };
    serviceRequestBreakdown[sub].total += 1;
    if (t.Status === 'Resolved') serviceRequestBreakdown[sub].resolved += 1;
  });



  return (
    <div className="min-h-screen bg-slate-50 pb-16">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="w-full px-6 md:px-10 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">UNIFY</h1>
              <p className="text-[10px] text-indigo-600 uppercase tracking-widest font-semibold">Ticket Logging Dashboard</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date range */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <select
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                {availableDates.map(d => <option key={`s-${d}`} value={d}>{fmtDate(d)}</option>)}
              </select>
              <span className="text-slate-300 text-xs">→</span>
              <select
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                {availableDates.map(d => <option key={`e-${d}`} value={d}>{fmtDate(d)}</option>)}
              </select>
            </div>

            {/* Sync */}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Syncing…' : 'Sync Sheet'}
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                sessionStorage.removeItem('unify_authenticated');
                setIsAuthenticated(false);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="w-full px-6 md:px-10 mt-6 space-y-6">

        {/* Data-source banner */}
        {showBanner && (
          <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm border ${data.isFallback
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 flex-shrink-0" />
              {data.isFallback
                ? <span><strong>Offline Mode:</strong> Showing local cache — connect to sync live data.</span>
                : <span><strong>Live Mode:</strong> Last Synced: <strong>{syncTime}</strong></span>
              }
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100/50"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── SECTION 1: KPI CARDS ── */}
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Tickets"
            value={total}
            sub="In selected date range"
            color="indigo"
            icon={<Inbox className="w-5 h-5" />}
          />
          <KpiCard
            label="Resolved"
            value={resolved}
            sub={`${total > 0 ? ((resolved / total) * 100).toFixed(0) : 0}% closure rate`}
            color="emerald"
            icon={<CheckCircle2 className="w-5 h-5" />}
          />
          <KpiCard
            label="Pending"
            value={pending}
            sub="Awaiting action"
            color="rose"
            icon={<Clock className="w-5 h-5" />}
          />
          <KpiCard
            label="Service Requests"
            value={serviceRequestTickets.length}
            sub={
              (serviceRequestTickets.length - serviceRequestResolved) > 0 ? (
                <span className="text-rose-600 font-semibold">
                  {serviceRequestTickets.length - serviceRequestResolved} pending SR
                </span>
              ) : (
                "0 pending SR"
              )
            }
            color="violet"
            icon={<Calendar className="w-5 h-5" />}
          />
        </section>

        {/* ── SECTION 1B: PRIMARY CATEGORY BREAKDOWN ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Application Issues"
            value={dealerCrmTickets.length}
            sub="Dealer CRM Related"
            color="indigo"
            icon={<ShieldCheck className="w-5 h-5" />}
          />
          <KpiCard
            label="Third Party"
            value={thirdPartyTickets.length}
            sub="External Dependency"
            color="violet"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          <KpiCard
            label="L1 Dependent (Cognizent)"
            value={revertL1Tickets.length}
            sub="Revert back to L1"
            color="indigo"
            icon={<RefreshCw className="w-5 h-5" />}
          />
          <KpiCard
            label="User Guidance & Training"
            value={userGuidanceTickets.length}
            sub="User Guidance"
            color="violet"
            icon={<CheckCircle2 className="w-5 h-5" />}
          />
        </section>

        {/* ── SECTION 2: SPLIT OVERVIEW ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Donut / Status chart */}
          <div className="lg:col-span-1">
            <StatusChart
              resolved={resolved - serviceRequestResolved}
              pending={pending}
              serviceRequests={serviceRequestTickets.length}
              totalTickets={total}
              totalResolved={resolved}
            />
          </div>

          {/* AUTOVYN OWNED */}
          <div className="lg:col-span-1">
            <OwnershipPanel
              title="TOP 5 CATEGORIES"
              subtitle="RANKED BY TICKET COUNT"
              total={autovynTickets.length}
              resolved={autovynResolved}
              breakdown={autovynBreakdown}
              accentColor="indigo"
            />
          </div>

          {/* THIRD PARTY DEPENDENCY */}
          <div className="lg:col-span-1">
            <OwnershipPanel
              title="THIRD PARTY DEPENDENCY"
              subtitle="External Resolution"
              total={thirdPartyTickets.length}
              resolved={thirdPartyResolved}
              breakdown={thirdPartyBreakdown}
              accentColor="amber"
            />
          </div>
        </section>

        {/* ── SECTION 3: TICKET LOG ── */}
        <section>
          <TicketList tickets={filteredTickets} />
        </section>
      </main>
    </div>
  );
}

// ── KPI CARD ─────────────────────────────────────────────────────────────────
type AccentColor = 'indigo' | 'emerald' | 'rose' | 'violet' | 'amber';

const colorMap: Record<AccentColor, { bg: string; text: string; badge: string; icon: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700', icon: 'text-indigo-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700', icon: 'text-rose-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700', icon: 'text-violet-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-600' },
};

function KpiCard({ label, value, sub, color, icon }: {
  label: string; value: React.ReactNode; sub: React.ReactNode; color: AccentColor; icon: React.ReactNode
}) {
  const c = colorMap[color];
  const renderedValue = (typeof value === 'number' || typeof value === 'string')
    ? <p className={`text-4xl font-extrabold ${c.text}`}>{value.toLocaleString()}</p>
    : value;

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-xl ${c.bg} ${c.icon}`}>{icon}</div>
      </div>
      <div>
        <div className="leading-none">{renderedValue}</div>
        <p className="text-xs text-slate-400 mt-1.5">{sub}</p>
      </div>
    </div>
  );
}



// ── OWNERSHIP PANEL ───────────────────────────────────────────────────────────
function OwnershipPanel({
  title, subtitle, total, resolved, breakdown, accentColor
}: {
  title: string;
  subtitle: string;
  total: number;
  resolved: number;
  breakdown: Record<string, { total: number; resolved: number }>;
  accentColor: AccentColor;
}) {
  const c = colorMap[accentColor];
  const pending = total - resolved;
  const entries = Object.entries(breakdown).sort((a, b) => b[1].total - a[1].total);
  const maxCount = entries.length > 0 ? entries[0][1].total : 1;

  return (
    <div className="glass-panel rounded-2xl p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className={`text-xl font-extrabold tracking-tight ${c.text} leading-none`}>{title}</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-1.5">{subtitle || <span className="opacity-0 select-none">&nbsp;</span>}</p>
        </div>
        {/* Total count and pending badge */}
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          <span className={`text-2xl font-extrabold ${c.text} leading-none`}>{total}</span>
          {pending > 0 && (
            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full whitespace-nowrap leading-none">
              {pending} pending
            </span>
          )}
        </div>
      </div>



      {/* Divider */}
      <div className="h-px mb-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} />

      {/* Breakdown list */}
      <div className="flex flex-col gap-2.5 flex-1">
        {entries.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">No tickets in this range</p>
        )}
        {entries.map(([sub, counts]) => {
          const subPending = counts.total - counts.resolved;
          const barTotalPct = Math.round((counts.total / maxCount) * 100);
          const barResPct = Math.round((counts.resolved / maxCount) * 100);
          return (
            <div key={sub}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-700 font-medium truncate max-w-[160px]" title={sub}>{sub}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* total badge */}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${subPending > 0 ? c.badge : 'bg-emerald-50 text-emerald-600'}`}>{counts.total}</span>
                  {/* pending indicator */}
                  {subPending > 0 && (
                    <>
                      <span className="text-slate-200 text-xs">/</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-500 border border-rose-100">
                        {subPending} pending
                      </span>
                    </>
                  )}
                </div>
              </div>
              {/* Stacked bar: total (faint) + resolved (solid) */}
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden relative">
                {/* total bar (faint) */}
                <div
                  className="h-full rounded-full absolute top-0 left-0"
                  style={{
                    width: `${barTotalPct}%`,
                    background: accentColor === 'indigo' ? '#c7d2fe' : '#fde68a',
                  }}
                />
                {/* resolved bar (solid) */}
                <div
                  className="h-full rounded-full absolute top-0 left-0"
                  style={{
                    width: `${barResPct}%`,
                    background: '#34d399',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
