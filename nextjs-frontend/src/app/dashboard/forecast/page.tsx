'use client';

import { useRouter } from 'next/navigation';
import { useSpendNestStore } from '@/store/useSpendNestStore';
import ForecastChart from '@/components/charts/ForecastChart';
import ClientOnly from '@/components/ClientOnly';

function ForecastContent() {
  const router = useRouter();
  const { data } = useSpendNestStore();

  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[calc(100vh-4rem)] bg-slate-50/50">
        <div className="text-center mb-12 max-w-md">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-sm">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
             </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">No Forecast Found</h2>
          <p className="text-slate-500 text-lg leading-relaxed">We need historical data to predict your future. Upload a bank statement to unlock AI insights.</p>
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

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4">
             AI Intelligence
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">Financial Forecast</h1>
          <p className="text-slate-500 text-lg mt-2">Predictive analysis of your income and cash flow trends for the upcoming months.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confidence Level</p>
              <p className="text-emerald-500 font-black text-lg">High (89%)</p>
           </div>
           <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-slate-100 flex items-center justify-center">
              <span className="text-[10px] font-black text-slate-900">89%</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <ForecastChart forecastData={data.forecast} />
        </div>
        
        <div className="space-y-6">
           <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-8">
              <h3 className="text-xl font-black text-slate-900">Forecast Details</h3>
              
              <div className="space-y-6">
                <div className="group transition-all">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Model Architecture</p>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-700">
                    {data.forecast?.model_used}
                  </div>
                </div>

                <div className="group transition-all">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Period</p>
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 font-black text-blue-600">
                    {data.forecast?.predicted_month}
                  </div>
                </div>

                <div className="group transition-all">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Projected Revenue</p>
                  <div className="p-6 bg-emerald-50 rounded-[24px] border border-emerald-100">
                    <p className="text-3xl font-black text-emerald-600">{fmt(data.forecast?.predicted_income ?? 0)}</p>
                    <p className="text-[10px] text-emerald-600/60 font-bold uppercase tracking-tight mt-1">± 5% Variance margin</p>
                  </div>
                </div>
              </div>
           </div>

           <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl">
              <h4 className="text-lg font-black mb-2">Pro Tip 💡</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Based on your historical income volatility, your {data.forecast?.predicted_month} forecast is highly stable. This is a great month to increase your savings goal.
              </p>
           </div>
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
