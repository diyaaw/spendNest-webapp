'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { Activity, ChevronRight, PieChart as PieIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DNAData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

const COLORS = [
  '#2563EB', '#059669', '#D97706', '#DC2626', 
  '#4F46E5', '#0891B2', '#7C3AED', '#DB2777',
];

export default function SpendingDNAChart({ data }: { data: any[] }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    return data
      .sort((a, b) => b.value - a.value)
      .map((item, index) => ({
        category: item.name,
        amount: item.value,
        percentage: total > 0 ? (item.value / total) * 100 : 0,
        color: COLORS[index % COLORS.length]
      }));
  }, [data]);

  const totalSpend = chartData.reduce((acc, curr) => acc + curr.amount, 0);

  if (chartData.length === 0) return null;

  const totalStr = Math.round(totalSpend).toLocaleString();
  const fontSizeClass = totalStr.length > 8 ? "text-xl" : "text-2xl";

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-6 md:p-8 h-full flex flex-col shadow-sm hover:shadow-xl transition-all group overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 transition-all group-hover:rotate-6 duration-500">
            <PieIcon size={18} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1 leading-none">Spending DNA</h3>
            <p className="text-slate-900 text-sm font-black tracking-tight leading-none">Category Distribution</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row xl:flex-col 2xl:flex-row items-center justify-between gap-8">
        {/* Chart Section */}
        <div className="relative w-56 h-56 flex-shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={4}
                dataKey="amount"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    className="outline-none cursor-pointer hover:opacity-85 transition-opacity duration-300" 
                  />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-2 text-slate-400">{d.category}</p>
                        <p className="text-base font-mono font-black mb-1">{formatCurrency(d.amount)}</p>
                        <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">{d.percentage.toFixed(1)}% Weight</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-8 text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 opacity-60">Total Outflow</span>
            <span className={cn(
              "font-black text-slate-900 tracking-tighter leading-none block",
              fontSizeClass
            )}>
              ₹{totalStr}
            </span>
          </div>
        </div>

        {/* Legend Section */}
        <div className="flex-1 w-full space-y-2">
          {chartData.slice(0, 6).map((item, index) => (
            <motion.div 
              key={item.category} 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0, transition: { delay: index * 0.05 } }}
              whileHover={{ x: 6 }}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-blue-600 transition-all group/item cursor-pointer"
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm border border-white"
                style={{ backgroundColor: item.color }}
              />
              
              <div className="flex-1 flex items-center justify-between min-w-0">
                <div className="space-y-0.5 pr-2">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight group-hover/item:text-blue-600 transition-colors truncate">
                    {item.category}
                  </p>
                  <p className="text-[9px] text-slate-500 font-bold opacity-70">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] font-mono font-black text-slate-900">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <ChevronRight size={10} className="text-slate-300 group-hover/item:text-blue-600 transition-all" />
            </motion.div>
          ))}
        </div>
      </div>
      
      {chartData.length > 6 && (
        <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
             + {chartData.length - 6} Categories
           </p>
           <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1">
              Details <ChevronRight size={10} />
           </button>
        </div>
      )}
    </div>
  );
}
