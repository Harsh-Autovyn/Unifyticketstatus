import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface TeamChartProps {
  autovynCount: number;
  thirdPartyBreakdown: { [sub: string]: number };
}

export const TeamChart: React.FC<TeamChartProps> = ({
  autovynCount,
  thirdPartyBreakdown
}) => {
  const total = autovynCount + Object.values(thirdPartyBreakdown).reduce((sum, val) => sum + val, 0);

  // Harmonious theme colors for third party teams
  const colors = ['#d97706', '#0891b2', '#db2777', '#7c3aed', '#059669', '#dc2626', '#2563eb'];

  const data = [
    { name: 'Autovyn (Internal)', value: autovynCount, color: '#4f46e5' }, // Indigo
    ...Object.entries(thirdPartyBreakdown)
      .sort((a, b) => b[1] - a[1]) // Sort third party items descending
      .map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx % colors.length]
      }))
  ].filter(d => d.value > 0);

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Team & Third-Party Split</h3>
          <p className="text-xs text-slate-500">Responsible teams for tickets</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-indigo-600">
            {total > 0 ? ((autovynCount / total) * 100).toFixed(0) : 0}%
          </span>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Autovyn Owned</p>
        </div>
      </div>

      <div className="flex-1 min-h-[220px] flex items-center justify-center">
        {total === 0 ? (
          <div className="text-slate-500 text-sm">No data available for selected range</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#64748b"
                fontSize={10}
                width={125}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: 'rgba(0,0,0,0.1)',
                  borderRadius: '12px',
                  color: '#0f172a'
                }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                {/* Display counts directly on the graph bars */}
                <LabelList dataKey="value" position="right" fill="#0f172a" fontSize={11} fontWeight="600" offset={8} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
