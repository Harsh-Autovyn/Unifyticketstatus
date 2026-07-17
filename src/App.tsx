import { useState, useEffect } from 'react';
import { getDashboardData, type DashboardData } from './data/ticketService';
import { TicketList } from './components/TicketList';
import { Login } from './components/Login';
import {
  Calendar, RefreshCw, AlertCircle, LayoutDashboard, Mail, CheckCircle2, Clock, Shield, AlertTriangle, RefreshCcw, GraduationCap
} from 'lucide-react';

function fmtDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[Number(m) - 1]} ${y}`;
}

// Helper to get top categories
function getTopCategories(tickets: any[], getLabel: (t: any) => string, limit = 5) {
  const counts: Record<string, { total: number; resolved: number }> = {};
  tickets.forEach(t => {
    const cat = getLabel(t) || 'Uncategorized';
    if (!counts[cat]) counts[cat] = { total: 0, resolved: 0 };
    counts[cat].total += 1;
    if (t.Status === 'Resolved') counts[cat].resolved += 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit)
    .map(([name, data]) => ({ name, ...data }));
}

function CategoryListCard({ title, subtitle, total, data, colorClass, barColorClass }: { title: string, subtitle?: string, total: number, data: any[], colorClass: string, barColorClass: string }) {
  const max = data.length > 0 ? data[0].total : 1;
  return (
    <div className={`bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex flex-col`}>
      <div className={`px-4 py-3 border-b ${colorClass} bg-opacity-50 flex items-start justify-between`}>
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-800 leading-tight">{title}</h3>
          {subtitle && <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-xl font-black text-slate-900 tracking-tight leading-none">{total}</div>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-3">
        {data.length === 0 && <p className="text-xs text-slate-500 text-center py-2 font-medium">No data available</p>}
        {data.map((item, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 truncate max-w-[200px]" title={item.name}>{item.name}</span>
              <span className="text-slate-900 font-black">{item.total}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${barColorClass} rounded-full transition-all duration-1000`} style={{ width: `${(item.total / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('unify_authenticated') === 'true';
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardData();
      setData(res);
      const dates = Array.from(new Set(res.tickets.map(t => t.Date))).filter(Boolean).sort();
      setAvailableDates(dates);
      if (dates.length > 0) {
        setStartDate(dates[0]);
        setEndDate(dates[dates.length - 1]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
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
      <div className="flex h-screen w-full items-center justify-center bg-white text-black">
        <div className="text-sm flex flex-col items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
          <span className="text-slate-500 font-bold tracking-wide uppercase text-xs">Loading Workspace...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-white text-black">
        <AlertCircle className="w-8 h-8 mb-4 text-rose-500" />
        <p className="text-slate-600 font-medium">{error || 'Failed to load data'}</p>
        <button onClick={fetchData} className="mt-4 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">
          Retry Connection
        </button>
      </div>
    );
  }

  const filteredTickets = data.tickets.filter(t => {
    if (!t.Date) return false;
    if (startDate && t.Date < startDate) return false;
    if (endDate && t.Date > endDate) return false;
    return true;
  });

  const total = filteredTickets.length;

  // Specific Logic Mappings
  const srTickets = filteredTickets.filter(t => (t['Category'] || '').trim().toLowerCase().includes('service request'));
  const srPending = srTickets.filter(t => t.Status !== 'Resolved').length;
  const srResolved = srTickets.filter(t => t.Status === 'Resolved').length;

  const appIssueTickets = filteredTickets.filter(t => (t['Category'] || '').trim().toLowerCase() === 'dealer crm application issue');
  const thirdPartyTickets = filteredTickets.filter(t => (t['Category'] || '').trim().toLowerCase() === 'third party dependency');
  const l1Tickets = filteredTickets.filter(t => (t['Category'] || '').trim().toLowerCase() === 'revert back to l1');
  const userGuidanceTickets = filteredTickets.filter(t => (t['Category'] || '').trim().toLowerCase() === 'user guidance');

  // Overall Resolved (Includes SR)
  const totalResolved = filteredTickets.filter(t => t.Status === 'Resolved').length;
  // Pending (EXCLUDES SR entirely for calculation, but we'll map them explicitly now)
  const nonSrPending = filteredTickets.filter(t => t.Status !== 'Resolved' && !(t['Category'] || '').trim().toLowerCase().includes('service request')).length;
  const nonSrResolved = filteredTickets.filter(t => t.Status === 'Resolved' && !(t['Category'] || '').trim().toLowerCase().includes('service request')).length;

  const totalPending = total - totalResolved;
  const resolutionRate = total > 0 ? ((totalResolved / total) * 100).toFixed(1) : '0';

  // Internal Tickets (excluding Third Party and SR)
  const internalTickets = filteredTickets.filter(t => {
    const cat = (t['Category'] || '').trim().toLowerCase();
    return !cat.includes('third party') && !cat.includes('service request');
  });

  // Top 5 calculations
  const topInternal = getTopCategories(internalTickets, t => (t['Category'] || t['Sub Category'] || '').trim());
  const topThirdParty = getTopCategories(thirdPartyTickets, t => (t['Sub Category'] || '').trim());
  const topAppIssues = getTopCategories(appIssueTickets, t => {
    const code = (t['Resolution Code'] || '').trim();
    return code ? code : 'Unspecified';
  }, 20);

  // Donut chart logic
  const donutResolvedCore = nonSrResolved;
  const donutResolvedSr = srResolved;
  const donutPending = totalPending;

  const pctResolvedCore = (donutResolvedCore / total) * 100 || 0;
  const pctResolvedSr = (donutResolvedSr / total) * 100 || 0;
  const pctPending = (donutPending / total) * 100 || 0;

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-slate-900 font-sans pb-12 selection:bg-indigo-100 selection:text-indigo-900">
      {/* HEADER */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-white/50 px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-50 shadow-sm shadow-slate-200/20">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            Unify Executive
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-700 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-sm shadow-slate-200/50 font-semibold backdrop-blur-md transition-all hover:bg-white hover:shadow-md cursor-pointer">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <select value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
              {availableDates.map(d => <option key={d} value={d}>{fmtDate(d)}</option>)}
            </select>
            <span className="text-slate-300 mx-1">to</span>
            <select value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
              {availableDates.map(d => <option key={d} value={d}>{fmtDate(d)}</option>)}
            </select>
          </div>
          <button onClick={() => { sessionStorage.removeItem('unify_authenticated'); setIsAuthenticated(false); }} className="text-slate-500 hover:text-indigo-600 text-sm font-bold transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50">
            Logout
          </button>
        </div>
      </header>

      {/* DASHBOARD CONTENT */}
      <main className="w-full px-6 py-4 max-w-[1800px] mx-auto">

        {/* DETAILED BREAKDOWN & CATEGORIES GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 mb-4">

          {/* MASTER BREAKDOWN TREE (Span 7 cols) */}
          <div className="col-span-1 lg:col-span-7 bg-slate-900 rounded-[2rem] p-6 flex flex-col shadow-2xl shadow-indigo-900/20 relative overflow-hidden group">
            {/* Ambient Background Orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 opacity-[0.02] transform group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
              <Mail className="w-72 h-72" />
            </div>

            {/* Top Total Header */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h3 className="text-indigo-300 font-bold tracking-widest text-[10px] uppercase mb-1">Total Received Tickets</h3>
                <div className="text-6xl font-black tracking-tighter leading-none text-white drop-shadow-md">{total}</div>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-xl shadow-xl flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Live Pipeline</span>
              </div>
            </div>

            {/* Detailed Breakdown Branches */}
            <div className="relative z-10 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* RESOLVED BRANCH */}
              <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 transition-all duration-500 rounded-2xl p-5 backdrop-blur-xl shadow-2xl shadow-black/10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]">
                    <CheckCircle2 className="text-emerald-400 w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-white font-black text-2xl leading-none">{totalResolved}</h4>
                    <p className="text-emerald-400 text-[9px] uppercase font-bold tracking-widest mt-1">Total Resolved</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs bg-black/20 hover:bg-black/30 transition-colors p-3 rounded-xl border border-white/5">
                    <span className="text-slate-300 font-medium">Core Issues</span>
                    <span className="font-bold text-white text-base">{nonSrResolved}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs bg-black/20 hover:bg-black/30 transition-colors p-3 rounded-xl border border-white/5">
                    <span className="text-slate-300 font-medium">Service Requests</span>
                    <span className="font-bold text-white text-base">{srResolved}</span>
                  </div>
                </div>
              </div>

              {/* PENDING BRANCH */}
              <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-rose-500/30 transition-all duration-500 rounded-2xl p-5 backdrop-blur-xl shadow-2xl shadow-black/10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 bg-rose-500/10 rounded-2xl shadow-[inset_0_0_20px_rgba(244,63,94,0.1)]">
                    <Clock className="text-rose-400 w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-white font-black text-2xl leading-none">{totalPending}</h4>
                    <p className="text-rose-400 text-[9px] uppercase font-bold tracking-widest mt-1">Total Pending</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs bg-black/20 hover:bg-black/30 transition-colors p-3 rounded-xl border border-white/5">
                    <span className="text-slate-300 font-medium">Core Issues</span>
                    <span className="font-bold text-white text-base">{nonSrPending}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs bg-black/20 hover:bg-black/30 transition-colors p-3 rounded-xl border border-white/5">
                    <span className="text-slate-300 font-medium">Service Requests</span>
                    <span className="font-bold text-white text-base">{srPending}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 4 CATEGORY HIGHLIGHTS (Span 5 cols) */}
          <div className="col-span-1 lg:col-span-5 grid grid-cols-2 grid-rows-2 gap-3 lg:gap-4">
            {/* User Guidance */}
            <div className="bg-white hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/50 border border-slate-200/60 rounded-3xl p-5 flex flex-col justify-center shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden group">
              <div className="absolute -bottom-2 -right-2 opacity-[0.03] transform group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700 pointer-events-none"><GraduationCap className="w-24 h-24 text-indigo-900" /></div>
              <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner border border-indigo-100/50"><GraduationCap className="w-4 h-4" /></div>
                <span className="px-2 py-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg text-[9px] font-black text-white uppercase tracking-widest shadow-md shadow-indigo-500/30">#1 Top</span>
              </div>
              <div className="text-3xl font-black text-slate-800 tracking-tight mt-2 relative z-10">{userGuidanceTickets.length}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 relative z-10">User Guidance</div>
            </div>

            {/* Third Party */}
            <div className="bg-white hover:bg-gradient-to-br hover:from-white hover:to-amber-50/50 border border-slate-200/60 rounded-3xl p-5 flex flex-col justify-center shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden group">
              <div className="absolute -bottom-2 -right-2 opacity-[0.03] transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 pointer-events-none"><AlertTriangle className="w-24 h-24 text-amber-900" /></div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shadow-inner border border-amber-100/50 w-max mb-1 relative z-10"><AlertTriangle className="w-4 h-4" /></div>
              <div className="text-3xl font-black text-slate-800 tracking-tight mt-2 relative z-10">{thirdPartyTickets.length}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 relative z-10">Third Party</div>
            </div>

            {/* App Issues */}
            <div className="bg-white hover:bg-gradient-to-br hover:from-white hover:to-blue-50/50 border border-slate-200/60 rounded-3xl p-5 flex flex-col justify-center shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden group">
              <div className="absolute -bottom-2 -right-2 opacity-[0.03] transform group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700 pointer-events-none"><Shield className="w-24 h-24 text-blue-900" /></div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shadow-inner border border-blue-100/50 w-max mb-1 relative z-10"><Shield className="w-4 h-4" /></div>
              <div className="text-3xl font-black text-slate-800 tracking-tight mt-2 relative z-10">{appIssueTickets.length}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 relative z-10">App Issues</div>
            </div>

            {/* L1 Cognizant */}
            <div className="bg-white hover:bg-gradient-to-br hover:from-white hover:to-emerald-50/50 border border-slate-200/60 rounded-3xl p-5 flex flex-col justify-center shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden group">
              <div className="absolute -bottom-2 -right-2 opacity-[0.03] transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 pointer-events-none"><RefreshCcw className="w-24 h-24 text-emerald-900" /></div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shadow-inner border border-emerald-100/50 w-max mb-1 relative z-10"><RefreshCcw className="w-4 h-4" /></div>
              <div className="text-3xl font-black text-slate-800 tracking-tight mt-2 relative z-10">{l1Tickets.length}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 relative z-10">L1 Support</div>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION - CHARTS AND LISTS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">

          {/* Status Distribution Donut */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-xl shadow-slate-200/30 flex flex-col col-span-1 h-full hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Resolution Status</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Resolved vs Pending</p>
              </div>
              <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100/50 shadow-sm">
                <span className="text-sm font-black">{resolutionRate}%</span>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative my-2">
              <div
                className="w-40 h-40 rounded-full flex items-center justify-center relative shadow-[inset_0_4px_15px_rgba(0,0,0,0.1)] transition-transform duration-700 hover:scale-[1.02]"
                style={{
                  background: `conic-gradient(
                    #10b981 0% ${pctResolvedCore}%, 
                    #8b5cf6 ${pctResolvedCore}% ${pctResolvedCore + pctResolvedSr}%, 
                    #f43f5e ${pctResolvedCore + pctResolvedSr}% 100%
                  )`
                }}
              >
                <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center absolute shadow-[0_0_25px_rgba(0,0,0,0.08)]">
                  <span className="text-4xl font-black text-slate-800 tracking-tight">{total}</span>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">Total Tickets</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-bold text-slate-500 mt-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-sm shadow-emerald-500/30 rounded-md"></div><span className="text-slate-700">Resolved (Core):</span> {donutResolvedCore}</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-gradient-to-br from-purple-400 to-purple-500 shadow-sm shadow-purple-500/30 rounded-md"></div><span className="text-slate-700">Resolved (SR):</span> {donutResolvedSr}</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-gradient-to-br from-rose-400 to-rose-500 shadow-sm shadow-rose-500/30 rounded-md"></div><span className="text-slate-700">Pending:</span> {donutPending}</div>
            </div>
          </div>

          {/* Top 5 Cards */}
          <div className="col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            <CategoryListCard
              title="Top 5 Categories"
              subtitle="Ranked by Internal Ticket Count"
              total={internalTickets.length}
              data={topInternal}
              colorClass="bg-gradient-to-r from-indigo-50/50 to-indigo-100/30 border-indigo-100/50"
              barColorClass="bg-gradient-to-r from-indigo-400 to-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
            />
            <CategoryListCard
              title="Third Party Dependency"
              subtitle="External Resolution Breakdown"
              total={thirdPartyTickets.length}
              data={topThirdParty}
              colorClass="bg-gradient-to-r from-amber-50/50 to-amber-100/30 border-amber-100/50"
              barColorClass="bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
            />
            <CategoryListCard
              title="Application Issues"
              subtitle="Breakdown by Resolution Code"
              total={appIssueTickets.length}
              data={topAppIssues}
              colorClass="bg-gradient-to-r from-blue-50/50 to-blue-100/30 border-blue-100/50"
              barColorClass="bg-gradient-to-r from-blue-400 to-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
            />
          </div>

        </div>

        {/* TICKET LIST */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-2 px-2">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Detailed Ticket Log</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Search, filter, and export all raw ticket data</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-3xl shadow-xl shadow-slate-200/30 overflow-hidden p-3 md:p-4 transition-all hover:shadow-2xl hover:shadow-slate-200/40">
          <TicketList tickets={filteredTickets} />
        </div>
      </main>
    </div>
  );
}

