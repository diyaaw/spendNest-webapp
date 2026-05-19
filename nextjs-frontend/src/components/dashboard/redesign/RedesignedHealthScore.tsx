'use client';

import { m } from 'framer-motion';
import { ShieldCheck, Info, BrainCircuit, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthProps {
  score: any; // Can be number or object
}

export default function RedesignedHealthScore({ score }: HealthProps) {
  // Extract real score value
  const numericScore = typeof score === 'object' ? (score?.overall || 0) : (score || 0);
  const recommendations = typeof score === 'object' ? (score?.recommendations || []) : [];
  const topInsight = typeof score === 'object' ? (score?.insights?.[0] || 'Increase emergency buffer by 12%') : 'Increase emergency buffer by 12%';

  const getStatus = (s: number) => {
    if (s >= 80) return { label: 'Excellent', color: 'text-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-100', icon: '💎' };
    if (s >= 60) return { label: 'Healthy', color: 'text-blue-500', bg: 'bg-blue-600', border: 'border-blue-100', icon: '✨' };
    if (s >= 40) return { label: 'Moderate', color: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-100', icon: '⚖️' };
    return { label: 'Critical', color: 'text-rose-500', bg: 'bg-rose-500', border: 'border-rose-100', icon: '🚨' };
  };

  const status = getStatus(numericScore);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (numericScore / 100) * circ;

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-6 h-full flex flex-col shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all duration-500 shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-0.5">Financial Audit</h3>
            <p className="text-slate-900 text-sm font-black tracking-tight">Health Intelligence</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-4">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="10" />
            <m.circle
              cx="60" cy="60" r={r} fill="none"
              stroke="url(#healthGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 2, ease: "circOut" }}
            />
            <defs>
              <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={numericScore < 50 ? '#EF4444' : '#2563EB'} />
                <stop offset="100%" stopColor={numericScore < 50 ? '#F59E0B' : '#10B981'} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <m.span 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-4xl font-black text-slate-900 tracking-tighter leading-none"
            >
              {numericScore}
            </m.span>
            <span className={cn("text-[10px] font-black uppercase tracking-widest mt-1", status.color)}>
              {status.label} {status.icon}
            </span>
          </div>
        </div>
      </div>

      {/* Mini Diagnostic Cards */}
      <div className="space-y-3 mt-8">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3 group/item hover:bg-white hover:border-blue-100 transition-all cursor-pointer shadow-sm">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BrainCircuit size={14} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">AI Recommendation</p>
            <p className="text-[10px] text-slate-500 font-bold opacity-80 leading-relaxed truncate max-w-[150px]">
              {recommendations[0] || topInsight}
            </p>
          </div>
        </div>
      </div>

      <button className="w-full mt-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white hover:border-blue-200 hover:shadow-lg transition-all group">
        Full Diagnostic Report
        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
