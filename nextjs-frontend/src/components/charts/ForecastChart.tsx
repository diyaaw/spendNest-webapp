'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Forecast } from '@/types';

export default function ForecastChart({ forecastData }: { forecastData: Forecast }) {
  // Only show the error if we have NO prediction at all
  const hasPrediction = forecastData?.predicted_income && forecastData.predicted_income > 0;
  const hasHistory = forecastData?.historical_income && forecastData.historical_income.length > 0;

  if (!forecastData || (!hasPrediction && !hasHistory)) {
    return (
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full min-h-[26rem] flex items-center justify-center text-center">
        <div className="max-w-md">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h4 className="text-lg font-black text-slate-900 mb-2">No Forecast Data</h4>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Upload a bank statement CSV to generate your AI income forecast.
          </p>
        </div>
      </div>
    );
  }

  // Handle explicit AI Error
  if ((forecastData as any).error) {
    return (
      <div className="bg-white p-8 rounded-[32px] border border-red-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full min-h-[26rem] flex items-center justify-center text-center">
        <div className="max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h4 className="text-lg font-black text-slate-900 mb-2">AI Engine Error</h4>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">The forecasting model encountered a technical issue: <code className="text-red-500 bg-red-50 px-2 py-0.5 rounded">{(forecastData as any).error}</code></p>
          <div className="text-xs text-slate-400 border-t border-slate-100 pt-4">
             Try restarting your Python ML service or installing missing dependencies.
          </div>
        </div>
      </div>
    );
  }

  // Only bail out if predicted_month is literally the error string
  if (forecastData.predicted_month === 'Error' || forecastData.predicted_month === 'error') {
    return (
      <div className="bg-white p-8 rounded-[32px] border border-amber-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full min-h-[26rem] flex items-center justify-center text-center">
        <div className="max-w-md">
          <h4 className="text-lg font-black text-slate-900 mb-2">Forecasting Engine Error</h4>
          <p className="text-slate-400 text-sm leading-relaxed">
            The AI model returned an invalid result. Try re-uploading your file.
          </p>
        </div>
      </div>
    );
  }

  const { historical_income, predicted_month, predicted_income, smoothed_income, volatility, bufferRecommendation } = forecastData;

  const chartData = [
    ...(historical_income || []).map((d: any, i: number) => ({ 
      month: d.month || d.date || `Month ${i+1}`,
      income: d.income || d.amount || 0,
      smoothed: smoothed_income?.[i]?.value ?? (d.income || d.amount || 0),
      isForecast: false 
    })),
    { 
      month: predicted_month || 'Next Month', 
      income: predicted_income || 0, 
      isForecast: true 
    }
  ];

  const stabilityScore = volatility?.stabilityScore ?? 100;
  const fluctuationPct = volatility?.fluctuationPct ?? 0;
  const isVolatile = stabilityScore < 50;

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full min-h-[26rem] flex flex-col">
      <header className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
              Income Forecasting Engine
            </h3>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-black text-slate-900">
              ₹{forecastData.predicted_income.toLocaleString('en-IN')}
            </p>
            <span className="text-slate-400 text-sm font-bold mb-1">next month prediction</span>
          </div>
        </div>
        
        <div className="flex gap-3">
          <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 text-right">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Stability Score</p>
             <p className={`font-black text-sm ${stabilityScore > 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
               {stabilityScore}%
             </p>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 text-right">
             <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Model</p>
             <p className="text-blue-700 font-black text-[10px]">WMA (0.5/0.3/0.2)</p>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontSize: '12px', fontWeight: 800 }}
              formatter={(value: any, name: any) => [
                `₹${Number(value).toLocaleString('en-IN')}`, 
                name === 'income' ? 'Actual Income' : 'Smoothed (WMA)'
              ]}
            />
            
            {/* Smoothed trend line */}
            <Area
              type="monotone"
              dataKey="smoothed"
              stroke="#cbd5e1"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="transparent"
              name="smoothed"
            />

            {/* Main income area */}
            <Area
              type="monotone"
              dataKey="income"
              stroke="#3b82f6"
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#colorIncome)"
              animationDuration={1500}
              name="income"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Volatility Analysis</p>
           <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Fluctuation</span>
              <span className="text-sm font-black text-slate-900">{fluctuationPct}%</span>
           </div>
           <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2">
              <div 
                className={`h-full rounded-full ${isVolatile ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                style={{ width: `${Math.min(100, fluctuationPct)}%` }}
              />
           </div>
        </div>
        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
           <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Adaptive Recommendations</p>
           <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-blue-800">
                Safe Savings: <span className="text-blue-600">{bufferRecommendation?.emergencySavingsPct}%</span>
              </p>
              <p className="text-xs font-bold text-blue-800">
                Tax Reserve: <span className="text-blue-600">{bufferRecommendation?.taxReservePct}%</span>
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
