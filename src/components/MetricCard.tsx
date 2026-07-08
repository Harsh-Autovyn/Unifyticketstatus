import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  subtext: string;
  icon: LucideIcon;
  colorClass: string;
  bgColorClass: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  colorClass,
  bgColorClass,
  trend
}) => {
  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-full">
      {/* Decorative background glow */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-15 ${bgColorClass}`} />
      
      <div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-500 text-sm font-semibold tracking-wide uppercase">{title}</span>
          <div className={`p-3 rounded-xl ${bgColorClass} ${colorClass}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        
        <div className="flex items-baseline space-x-2">
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">{value}</h2>
          {trend && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
            }`}>
              {trend.value}
            </span>
          )}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
        <span className="text-xs text-slate-500">{subtext}</span>
      </div>
    </div>
  );
};
