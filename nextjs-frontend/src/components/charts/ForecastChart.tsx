'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { Forecast } from '@/types';

export default function ForecastChart({ forecastData }: { forecastData: Forecast }) {
  const hasPrediction = forecastData?.predicted_income && forecastData.predicted_income > 0;
  const hasHistory    = forecastData?.historical_income && forecastData.historical_income.length > 0;

  // ── Empty state ───────────────────────────────────────────────────────────
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

  // ── Engine error state ────────────────────────────────────────────────────
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
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            The forecasting model encountered a technical issue:{' '}
            <code className="text-red-500 bg-red-50 px-2 py-0.5 rounded">{(forecastData as any).error}</code>
          </p>
          <div className="text-xs text-slate-400 border-t border-slate-100 pt-4">
            Try restarting your Python ML service or installing missing dependencies.
          </div>
        </div>
      </div>
    );
  }

  const {
    historical_income,
    predicted_month,
    predicted_income,
    smoothed_income,
    volatility,
    bufferRecommendation,
    model_used,
    isExpenseForecast,
    stagesAvailable,
  } = forecastData;

  // ── Build chart data ──────────────────────────────────────────────────────
  const chartData = [
    ...(historical_income || []).map((d: any, i: number) => ({
      month:      d.month || d.date || `Month ${i + 1}`,
      income:     d.income || d.amount || 0,
      smoothed:   smoothed_income?.[i]?.value ?? (d.income || d.amount || 0),
      isForecast: false,
    })),
    {
      month:      predicted_month || 'Next Month',
      income:     predicted_income || 0,
      isForecast: true,
    },
  ];

  const stabilityScore  = volatility?.stabilityScore  ?? volatility?.stability_score ?? 100;
  const fluctuationPct  = volatility?.fluctuationPct  ?? volatility?.fluctuation_pct ?? 0;
  const isVolatile      = stabilityScore < 50;

  // ── Stage badge ───────────────────────────────────────────────────────────
  const stageBadge =
    stagesAvailable >= 6
      ? { label: 'ARIMA Stage 3', color: 'bg-purple-100 text-purple-700 border-purple-200' }
      : stagesAvailable >= 3
      ? { label: 'WMA Stage 2', color: 'bg-blue-100 text-blue-700 border-blue-200' }
      : { label: 'SMA Stage 1', color: 'bg-slate-100 text-slate-600 border-slate-200' };

  // ── Mean line (for reference) ─────────────────────────────────────────────
  const historicalValues = (historical_income || []).map((d: any) => d.income || 0);
  const meanIncome = historicalValues.length > 0
    ? historicalValues.reduce((a: number, b: number) => a + b, 0) / historicalValues.length
    : 0;

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full min-h-[26rem] flex flex-col">
      {/* Header */}
      <header className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
              {isExpenseForecast ? 'Net Cash Flow Forecast' : 'Income Forecasting Engine'}
            </h3>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-black text-slate-900">
              ₹{(predicted_income || 0).toLocaleString('en-IN')}
            </p>
            <span className="text-slate-400 text-sm font-bold mb-1">
              {isExpenseForecast ? 'net cash flow prediction' : 'next month prediction'}
            </span>
          </div>
          {isExpenseForecast && (
            <div className="mt-2 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
              <span className="text-amber-600 text-xs font-black">⚠️ No dedicated income source detected.</span>
              <span className="text-amber-500 text-xs">This reflects net cash flow.</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 items-end">
          {/* Stage badge */}
          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${stageBadge.color}`}>
            {stageBadge.label}
          </span>
          <div className="flex gap-2">
            <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Stability</p>
              <p className={`font-black text-sm ${stabilityScore > 70 ? 'text-emerald-500' : stabilityScore > 40 ? 'text-amber-500' : 'text-red-500'}`}>
                {stabilityScore}%
              </p>
            </div>
            <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Months</p>
              <p className="font-black text-sm text-slate-700">{stagesAvailable || 1}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Chart */}
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={isExpenseForecast ? '#f59e0b' : '#3b82f6'} stopOpacity={0.12} />
                <stop offset="95%" stopColor={isExpenseForecast ? '#f59e0b' : '#3b82f6'} stopOpacity={0} />
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
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: 'none',
                borderRadius: '20px',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
              }}
              itemStyle={{ fontSize: '12px', fontWeight: 800 }}
              formatter={(value: any, name: any) => [
                `₹${Number(value).toLocaleString('en-IN')}`,
                name === 'income' ? (isExpenseForecast ? 'Cash Flow' : 'Income') : 'Smoothed (WMA)',
              ]}
            />

            {/* Mean reference line */}
            {meanIncome > 0 && (
              <ReferenceLine
                y={meanIncome}
                stroke="#e2e8f0"
                strokeDasharray="6 3"
                label={{ value: 'avg', position: 'right', fill: '#94a3b8', fontSize: 9 }}
              />
            )}

            {/* Smoothed WMA trend line */}
            <Area
              type="monotone"
              dataKey="smoothed"
              stroke="#cbd5e1"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="transparent"
              name="smoothed"
            />

            {/* Main income/cash flow area */}
            <Area
              type="monotone"
              dataKey="income"
              stroke={isExpenseForecast ? '#f59e0b' : '#3b82f6'}
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#colorIncome)"
              animationDuration={1500}
              name="income"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom info cards */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Volatility Analysis</p>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600">Fluctuation</span>
            <span className="text-sm font-black text-slate-900">{fluctuationPct}%</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full">
            <div
              className={`h-full rounded-full transition-all ${isVolatile ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, fluctuationPct)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            {isVolatile ? 'High volatility — build a larger buffer' : 'Stable income pattern'}
          </p>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Adaptive Reserve</p>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-blue-800">Emergency Savings</p>
              <span className="text-xs font-black text-blue-600">
                {bufferRecommendation?.emergencySavingsPct ?? 20}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-blue-800">Tax Reserve</p>
              <span className="text-xs font-black text-blue-600">
                {bufferRecommendation?.taxReservePct ?? 15}%
              </span>
            </div>
          </div>
          <p className="text-[10px] text-blue-400 mt-2">Based on income volatility</p>
        </div>
      </div>

      {/* Model explanation */}
      <div className="mt-3 bg-slate-50 rounded-2xl px-4 py-2 border border-slate-100">
        <p className="text-[10px] text-slate-400 font-medium">
          🤖 <span className="font-black text-slate-500">Model:</span>{' '}
          {model_used || 'Weighted Moving Average (0.5/0.3/0.2)'}
        </p>
      </div>
    </div>
  );
}
