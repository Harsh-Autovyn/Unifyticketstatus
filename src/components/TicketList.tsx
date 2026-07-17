import React, { useState } from 'react';
import type { Ticket } from '../types/ticket';
import { Search, ChevronLeft, ChevronRight, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TicketListProps {
  tickets: Ticket[];
}

export const TicketList: React.FC<TicketListProps> = ({ tickets }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Extract unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(tickets.map(t => t.Category).filter(Boolean)));

  // Filter logic
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket['Ticket No.'].toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket['Issue Discription'].toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket['Resolution Code'].toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'All' || ticket.Status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || ticket.Category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getTeamLabelAndColor = (ticket: Ticket) => {
    if (ticket.ownership === 'Third Party') {
      const sub = (ticket['Sub Category'] || '').trim();
      if (sub.toLowerCase().includes('common')) return { label: 'Common', bg: 'bg-amber-50 text-amber-700 border-amber-200/50' };
      if (sub.toLowerCase().includes('tcl')) return { label: 'TCL', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200/50' };
      if (sub.toLowerCase().includes('clear quote')) return { label: 'Clear Quote', bg: 'bg-pink-50 text-pink-700 border-pink-200/50' };
      if (sub.toLowerCase().includes('dps')) return { label: 'DPS Related', bg: 'bg-orange-50 text-orange-700 border-orange-200/50' };
      return { label: sub || 'Third Party', bg: 'bg-purple-50 text-purple-700 border-purple-200/50' };
    }
    if (ticket.ownership === 'Service Request') {
      return { label: 'Service Request', bg: 'bg-violet-50 text-violet-700 border-violet-200/50' };
    }
    return { label: 'Autovyn', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/50' };
  };

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col h-full border border-slate-200/60 bg-white/70">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Tickets Dump Log</h3>
          <p className="text-xs text-slate-500">Search and filter raw ticket logs</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, desc..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 w-[180px] md:w-[220px] shadow-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-sm text-slate-700 focus:outline-none border-none cursor-pointer font-medium"
            >
              <option value="All">All Status</option>
              <option value="Resolved">Resolved</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-sm text-slate-700 focus:outline-none border-none cursor-pointer max-w-[150px] font-medium"
            >
              <option value="All">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-x-auto min-h-[360px]">
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <span>No tickets found matching current filters</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-450 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Ticket No.</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {paginatedTickets.map((ticket, index) => {
                const teamInfo = getTeamLabelAndColor(ticket);
                return (
                  <tr key={ticket['Ticket No.'] || index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{ticket['Ticket No.']}</td>
                    <td className="py-3.5 px-4 text-xs whitespace-nowrap text-slate-500">{ticket.Date}</td>
                    <td className="py-3.5 px-4 max-w-[280px] truncate text-slate-800 font-medium" title={ticket['Issue Discription']}>
                      {ticket['Issue Discription']}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">{ticket.Category}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${teamInfo.bg}`}>
                        {teamInfo.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                        ticket.Status === 'Resolved' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      }`}>
                        {ticket.Status === 'Resolved' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                        )}
                        {ticket.Status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-4">
          <span className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(startIndex + itemsPerPage, filteredTickets.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{filteredTickets.length}</span> tickets
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:hover:text-slate-500 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-xs text-slate-700 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:hover:text-slate-500 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
