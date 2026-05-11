'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { CategoryBreakdown } from '@/types';

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#8b5cf6', '#14b8a6'];

export default function CategoryPieChart({ data }: { data: CategoryBreakdown[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full min-h-[26rem] flex items-center justify-center">
        <p className="text-slate-400">No category spending data</p>
      </div>
    );
  }
  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full min-h-[26rem] flex flex-col">
      <div className="mb-4">
        <h3 className="text-xl font-black text-slate-900">Spending Split</h3>
        <p className="text-xs text-slate-500 mt-1">Where your money goes</p>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              data={data} 
              innerRadius={75} 
              outerRadius={105} 
              paddingAngle={4} 
              dataKey="value" 
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontSize: '12px', fontWeight: 700 }}
              formatter={(value) => `$${Number(value).toLocaleString()}`}
            />
            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700, color: '#64748b', paddingTop: '20px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

