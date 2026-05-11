'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Forecast } from '@/types';

export default function ForecastChart({ forecastData }: { forecastData: Forecast }) {
  if (!forecastData || !forecastData.historical_income || (forecastData.historical_income.length === 0 && !(forecastData as any).error)) {
    return (
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full min-h-[26rem] flex items-center justify-center text-center">
        <div className="max-w-md">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h4 className="text-lg font-black text-slate-900 mb-2">Insufficient Income Data</h4>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            The AI couldn't find any transactions categorized as **Income** or **Salary**. Forecasts require at least one month of earnings.
          </p>
          <div className="bg-blue-50/50 p-4 rounded-2xl text-left border border-blue-100/50">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Quick Fixes</p>
            <ul className="text-xs text-blue-700/70 space-y-2">
              <li className="flex gap-2"><span>•</span> Ensure your CSV has a "Credit" or "Deposit" column.</li>
              <li className="flex gap-2"><span>•</span> Check if your salary transactions are present.</li>
              <li className="flex gap-2"><span>•</span> Make sure dates are in a standard format (e.g., DD-MM-YYYY).</li>
            </ul>
          </div>
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

  const { historical_income, predicted_month, predicted_income, model_used } = forecastData;
  
  const chartData = [
    ...historical_income.map(d => ({ ...d, isForecast: false })),
    { month: predicted_month, income: predicted_income, isForecast: true }
  ];

  const isExpenseMode = (forecastData as any).is_expense_forecast;
  const metricLabel = isExpenseMode ? 'Spending' : 'Income';
  const metricColor = isExpenseMode ? '#ef4444' : '#10b981'; // Red for spending, Green for income

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full min-h-[26rem] flex flex-col">
      <header className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${isExpenseMode ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`} />
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
              {isExpenseMode ? 'Projected Spending' : 'Income Forecast'}
            </h3>
          </div>
          <p className="text-2xl font-black text-slate-900">
            ${forecastData.predicted_income.toLocaleString()}
            <span className="text-slate-300 text-sm font-medium ml-2 italic">for {forecastData.predicted_month}</span>
          </p>
        </div>
        <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Model</p>
           <p className="text-slate-600 font-bold text-xs">{forecastData.model_used}</p>
        </div>
      </header>

      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metricColor} stopOpacity={0.15}/>
                <stop offset="95%" stopColor={metricColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} 
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontSize: '12px', fontWeight: 700 }}
              formatter={(value: any, name: any, props: any) => [
                `$${Number(value).toLocaleString()}`, 
                props.payload.isForecast ? `Predicted ${metricLabel}` : `Historical ${metricLabel}`
              ]}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke={metricColor}
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#colorForecast)"
              animationDuration={1500}
              strokeDasharray={(props: any) => props.payload?.isForecast ? "8 5" : "0"}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {isExpenseMode && (
        <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[11px] text-red-700 font-medium leading-tight">
            <strong>Spending Mode:</strong> No income detected. Forecasting your monthly burn rate instead.
          </p>
        </div>
      )}
    </div>
  );
}
