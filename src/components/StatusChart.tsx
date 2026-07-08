import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface StatusChartProps {
  resolved: number; // non-SR resolved
  pending: number;  // non-SR pending
  serviceRequests: number;
  totalTickets: number;
  totalResolved: number;
}

export const StatusChart: React.FC<StatusChartProps> = ({ 
  resolved, 
  pending, 
  serviceRequests,
  totalTickets,
  totalResolved
}) => {
  const resolvedPct = totalTickets > 0 
    ? (totalResolved === totalTickets ? '100' : ((totalResolved / totalTickets) * 100).toFixed(1)) 
    : '0';
  
  const data = [
    { name: 'Resolved', value: resolved, color: '#10b981' }, // Emerald
    { name: 'Pending', value: pending, color: '#ef4444' }, // Rose
    { name: 'Service Request', value: serviceRequests, color: '#8b5cf6' } // Violet
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Status Distribution</h3>
          <p className="text-xs text-slate-500">Resolved vs Pending Tickets</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-emerald-600">{resolvedPct}%</span>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Resolution Rate</p>
        </div>
      </div>

      <div className="flex-1 min-h-[220px] relative flex items-center justify-center">
        {totalTickets === 0 ? (
          <div className="text-slate-500 text-sm">No data available for selected range</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={totalTickets > 1 ? 4 : 0}
                minAngle={15}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderColor: 'rgba(0,0,0,0.1)',
                  borderRadius: '12px',
                  color: '#0f172a'
                }} 
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                formatter={(value) => {
                  const item = data.find(d => d.name === value);
                  return (
                    <span className="text-slate-700 text-xs font-medium">
                      {value}: <span className="font-bold text-slate-900">{item?.value ?? 0}</span>
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        
        {totalTickets > 0 && (
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold text-slate-900">{totalTickets}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Total Tickets</span>
          </div>
        )}
      </div>
    </div>
  );
};
