'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { MonthlyStat } from '@/types';

export default function MonthlyChart({ data }: { data: MonthlyStat[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-96 flex items-center justify-center">
        <p className="text-slate-400">Not enough data for monthly chart</p>
      </div>
    );
  }
  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full min-h-[26rem] flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-black text-slate-900">Income vs Expenses</h3>
          <p className="text-xs text-slate-500 mt-1">Cash flow comparison over time</p>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="8 8" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="month" 
              stroke="#cbd5e1" 
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} 
              axisLine={false} 
              tickLine={false} 
              dy={10}
            />
            <YAxis 
              stroke="#cbd5e1" 
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={(v) => `$${v}`} 
            />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontSize: '12px', fontWeight: 700 }}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px', fontSize: '12px', fontWeight: 700, color: '#64748b' }} />
            <Bar dataKey="income" name="Income" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
            <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

