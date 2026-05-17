'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ForecastPoint {
  month: string;
  actual?: number | null;
  predicted?: number | null;
}

interface FinancialForecastChartProps {
  data: ForecastPoint[];
  loading?: boolean;
}

export default function FinancialForecastChart({ data, loading = false }: FinancialForecastChartProps) {
  if (loading || !data || data.length === 0) {
    return <div className="bg-white h-[400px] w-full animate-pulse rounded-[2.5rem] border border-slate-100" />;
  }

  const nextPrediction = data.find(d => d.predicted && !d.actual)?.predicted || 0;
  
  // Calculate fluctuation for warning (simplified)
  const actualPoints = data.filter(d => d.actual !== null && d.actual !== undefined);
  const lastActual = actualPoints.length > 0 ? actualPoints[actualPoints.length - 1].actual || 0 : 0;
  
  const fluctuation = lastActual > 0 ? Math.abs((nextPrediction - lastActual) / lastActual) : 0;
  const showWarning = fluctuation > 0.3;

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 h-full flex flex-col shadow-sm hover:shadow-xl transition-all group overflow-hidden">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Income Momentum</h3>
          <p className="text-slate-900 text-xs font-bold opacity-70">Actual vs AI Prediction</p>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
             <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Actual</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-600 border-dashed" />
             <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Forecast</span>
           </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
              tickFormatter={(value) => `₹${value.toLocaleString()}`} 
            />
            <Tooltip 
              formatter={(value: any) => [`₹${value.toLocaleString()}`, '']}
              contentStyle={{ 
                backgroundColor: '#0F172A', 
                border: 'none', 
                borderRadius: '16px',
                padding: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              labelStyle={{ color: '#F8FAFC', fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}
              itemStyle={{ fontSize: '12px', color: '#F1F5F9', fontWeight: 'bold' }}
              cursor={{ stroke: '#E2E8F0', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="#2563EB" 
              strokeWidth={4} 
              dot={{ r: 5, fill: '#2563EB', strokeWidth: 2, stroke: '#FFFFFF' }}
              activeDot={{ r: 8, strokeWidth: 3, stroke: '#FFFFFF' }}
              name="Actual"
              connectNulls
            />
            <Line 
              type="monotone" 
              dataKey="predicted" 
              stroke="#2563EB" 
              strokeWidth={3} 
              strokeDasharray="8 8" 
              dot={{ r: 5, fill: '#FFFFFF', strokeWidth: 2, stroke: '#2563EB' }}
              activeDot={{ r: 8, strokeWidth: 3, stroke: '#FFFFFF' }}
              name="Forecast"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl group-hover:bg-white group-hover:border-blue-100 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <TrendingUp size={16} />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Next Month</span>
          </div>
          <span className="text-xl font-mono font-black text-slate-900 tracking-tighter">₹{nextPrediction.toLocaleString()}</span>
        </div>

        {showWarning && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 p-5 bg-rose-50 border border-rose-100 rounded-2xl"
          >
            <AlertTriangle size={18} className="text-rose-500" />
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Volatility Alert: High Fluctuation</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
