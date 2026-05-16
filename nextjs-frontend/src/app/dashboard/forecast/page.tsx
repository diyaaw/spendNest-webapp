'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpendNestStore } from '@/store/useSpendNestStore';
import ForecastChart from '@/components/charts/ForecastChart';
import ClientOnly from '@/components/ClientOnly';
import { fetchDashboardData } from '@/lib/api';

function ForecastContent() {
  const router = useRouter();
  const { data: storeData } = useSpendNestStore();
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Always fetch fresh forecast data from the API
  useEffect(() => {
    setLoading(true);
    fetchDashboardData()
      .then((d) => {
        if (d?.forecast) {
          setForecast(d.forecast);
        } else {
          setError('No forecast data found.');
        }
      })
      .catch(() => setError('Failed to load forecast.'))
      .finally(() => setLoading(false));
  }, []);

  if (!storeData && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[calc(100vh-4rem)] bg-slate-50/50">
        <div className="text-center mb-12 max-w-md">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-sm">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
             </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">No Forecast Found</h2>
          <p className="text-slate-500 text-lg leading-relaxed">Upload a bank statement to unlock AI income predictions.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-[20px] font-bold transition-all shadow-xl shadow-slate-200 active:scale-95"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-10 max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-10 w-1/3 bg-slate-100 rounded-2xl" />
        <div className="h-6 w-1/2 bg-slate-100 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[420px] bg-slate-100 rounded-[32px]" />
          <div className="space-y-4">
            <div className="h-[200px] bg-slate-100 rounded-[32px]" />
            <div className="h-[160px] bg-slate-100 rounded-[32px]" />
          </div>
        </div>
      </div>
    );
  }

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const stabilityScore = forecast?.volatility?.stabilityScore ?? 100;
  const fluctuationPct = forecast?.volatility?.fluctuationPct ?? 0;
  const confidenceLevel = Math.round(100 - (fluctuationPct / 2));
  const insights: string[] = forecast?.insights ?? [];

  const stabilityLabel = stabilityScore > 70 ? 'High' : stabilityScore > 40 ? 'Moderate' : 'Low';
  const stabilityColor = stabilityScore > 70 ? 'text-emerald-500' : stabilityScore > 40 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">

      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-50">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest mb-3">
             ✦ AI Intelligence · WMA Model
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Financial Forecast</h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">Predictive analysis of your income and cash flow trends for the upcoming months.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confidence Level</p>
              <p className="text-emerald-500 font-black text-lg">High ({confidenceLevel}%)</p>
           </div>
           <div className="relative w-14 h-14">
             <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
               <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="3" />
               <circle
                 cx="18" cy="18" r="16" fill="none"
                 className="stroke-emerald-500"
                 strokeWidth="3"
                 strokeDasharray={`${confidenceLevel} 100`}
                 strokeLinecap="round"
               />
             </svg>
             <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-900">{confidenceLevel}%</span>
           </div>
        </div>
      </header>

      {/* ── Main Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Chart (takes 2/3) */}
        <div className="lg:col-span-2">
          <ForecastChart forecastData={forecast} />
        </div>

        {/* Side Details */}
        <div className="space-y-6">
          {/* Forecast details card */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
            <h3 className="text-xl font-black text-slate-900">Forecast Details</h3>

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Model Architecture</p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-700 text-sm">
                {forecast?.model_used || 'Weighted Moving Average'}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Period</p>
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 font-black text-blue-600">
                {forecast?.predicted_month}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Projected Revenue</p>
              <div className="p-6 bg-emerald-50 rounded-[24px] border border-emerald-100">
                <p className="text-3xl font-black text-emerald-600">{fmt(forecast?.predicted_income ?? 0)}</p>
                <p className="text-[10px] text-emerald-600/60 font-bold uppercase tracking-tight mt-1">± 5% Variance margin</p>
              </div>
            </div>

            {/* Stability */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Income Stability</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-600">Score</span>
                <span className={`text-sm font-black ${stabilityColor}`}>{stabilityLabel} ({stabilityScore}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${stabilityScore > 70 ? 'bg-emerald-500' : stabilityScore > 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${stabilityScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Insights / Pro Tip */}
          {insights.length > 0 ? (
            <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl space-y-4">
              <h4 className="text-lg font-black flex items-center gap-2">
                <span>✦</span> AI Insights
              </h4>
              {insights.map((msg, i) => (
                <p key={i} className="text-slate-400 text-sm leading-relaxed border-t border-slate-800 pt-3 first:border-0 first:pt-0">
                  {msg}
                </p>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl">
              <h4 className="text-lg font-black mb-2">Pro Tip 💡</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Based on your historical income volatility, your {forecast?.predicted_month} forecast is highly stable. This is a great month to increase your savings goal.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForecastPage() {
  return (
    <ClientOnly fallback={<div className="p-10 h-[600px] bg-white rounded-[32px] border border-slate-100 animate-pulse m-10" />}>
      <ForecastContent />
    </ClientOnly>
  );
}
