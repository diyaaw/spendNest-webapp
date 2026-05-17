'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Target, ArrowUpRight } from 'lucide-react';

interface NetWorthPoint {
  month: string;
  netWorth: number;
}

interface NetWorthProjectionProps {
  data: NetWorthPoint[];
  loading?: boolean;
}

export default function NetWorthProjection({ data, loading = false }: NetWorthProjectionProps) {
  if (loading || !data || data.length === 0) {
    return <div className="bg-white h-[400px] w-full animate-pulse rounded-[2.5rem] border border-slate-100" />;
  }

  const latestVal = data[data.length - 1]?.netWorth || 0;
  const firstVal = data[0]?.netWorth || 0;
  const growth = firstVal > 0 ? ((latestVal - firstVal) / firstVal) * 100 : 0;
  
  // Dynamic target: current + 20%
  const targetVal = latestVal * 1.2;

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 h-full flex flex-col shadow-sm hover:shadow-xl transition-all group overflow-hidden">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Net Worth Velocity</h3>
          <p className="text-slate-900 text-xs font-bold opacity-70">Asset Growth Analysis</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Growth</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-600 border-dashed" />
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Target</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis 
              dataKey="month" 
              stroke="#94A3B8" 
              fontSize={10} 
              fontWeight={700}
              axisLine={false}
              tickLine={false}
              dy={15}
            />
            <YAxis 
              stroke="#94A3B8" 
              fontSize={10} 
              fontWeight={700}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `₹${Math.abs(value) >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`} 
            />
            <Tooltip 
              formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Net Worth']}
              contentStyle={{ 
                backgroundColor: '#0F172A', 
                border: 'none', 
                borderRadius: '16px',
                padding: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              labelStyle={{ color: '#F8FAFC', fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}
              itemStyle={{ fontSize: '12px', color: '#F1F5F9', fontWeight: 'bold' }}
            />
            <ReferenceLine 
              y={latestVal} 
              stroke="#64748B" 
              strokeDasharray="3 3" 
              label={{ value: 'CURRENT', fill: '#64748B', fontSize: 8, position: 'right', fontWeight: '900', letterSpacing: '0.1em' }}
            />
            <ReferenceLine 
              y={targetVal} 
              stroke="#2563EB" 
              strokeDasharray="5 5" 
              label={{ value: 'TARGET', fill: '#2563EB', fontSize: 8, position: 'right', fontWeight: '900', letterSpacing: '0.1em' }}
            />
            <Area 
              type="monotone" 
              dataKey="netWorth" 
              stroke="#10B981" 
              strokeWidth={4}
              fill="url(#netWorthGradient)"
              activeDot={{ r: 8, fill: '#10B981', strokeWidth: 3, stroke: '#FFFFFF' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col gap-3 group-hover:bg-white group-hover:border-slate-200 transition-all shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquid Valuation</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-mono font-black text-slate-900 tracking-tighter">₹{latestVal.toLocaleString()}</span>
            <div className={cn(
              "px-3 py-1.5 rounded-xl flex items-center gap-1.5 border shadow-sm",
              growth >= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
            )}>
              <ArrowUpRight size={14} className={growth < 0 ? 'rotate-90' : ''} />
              <span className="text-[11px] font-black">{Math.abs(growth).toFixed(1)}%</span>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col gap-3 group-hover:bg-white group-hover:border-blue-100 transition-all shadow-sm">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-blue-600" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth Objective</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-black text-blue-600 tracking-tighter">₹{targetVal.toLocaleString()}</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">AI Suggested</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
