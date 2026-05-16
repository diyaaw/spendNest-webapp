'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { Shield, Target, ChevronDown, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const fmt = (n: number) => {
  return '£' + Math.round(n).toLocaleString('en-GB');
};

const EXPRESS = process.env.NEXT_PUBLIC_API_URL!;

function riskStyle(level: string) {
  switch (level) {
    case 'excellent': return { ring: '#10B981', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Excellent', glow: 'shadow-emerald-100' };
    case 'healthy':   return { ring: '#10B981', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Healthy',   glow: 'shadow-emerald-100' };
    case 'moderate':  return { ring: '#F59E0B', badge: 'bg-orange-50 text-orange-600 border-orange-100',   label: 'Moderate',  glow: 'shadow-orange-100' };
    case 'low':       return { ring: '#EF4444', badge: 'bg-rose-50 text-rose-600 border-rose-100',     label: 'Low',       glow: 'shadow-rose-100' };
    default:          return { ring: '#EF4444', badge: 'bg-rose-50 text-rose-600 border-rose-100',     label: 'Critical',  glow: 'shadow-rose-100' };
  }
}

function RunwayGauge({ months, max = 12, color }: { months: number; max?: number; color: string }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, months / max);
  return (
    <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="10" />
        <motion.circle
          cx="60" cy="60" r={r} fill="none" stroke={color || '#2563EB'} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - circ * pct }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
        <motion.span className="text-4xl font-black text-slate-900 tracking-tighter leading-none"
          initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
          {months}
        </motion.span>
        <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Months</span>
      </div>
    </div>
  );
}

function ScenarioRow({ label, runway, riskLevel }: {
  label: string; runway: number; riskLevel: string;
}) {
  const style = riskStyle(riskLevel);
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 group/row px-2 rounded-lg transition-all">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm", style.badge)}>
           {runway}MO
        </span>
      </div>
    </div>
  );
}

interface FundData {
  currentSavings: number;
  targetSavings: number;
  targetMonths: number;
  avgMonthlyExpenses: number;
  runwayMonths: number;
  riskLevel: string;
  readinessScore: number;
  monthlyTargetToGoal: number;
  progressPct: number;
  riskColor: string;
}

interface Analysis {
  currentRunway: number;
  riskLevel: string;
  scenarios: Array<{ label: string; runway: number; riskLevel: string; riskColor: string; remainingSavings: number }>;
  recommendations: string[];
}

export default function EmergencyFundTracker() {
  const [fund, setFund] = useState<FundData | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSavings, setEditingSavings] = useState(false);
  const [savingsInput, setSavingsInput] = useState('');
  const [targetMonths, setTargetMonths] = useState(6);
  const [showScenarios, setShowScenarios] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [fRes, aRes] = await Promise.all([
        fetch(`${EXPRESS}/api/emergency-fund`, { credentials: 'include' }),
        fetch(`${EXPRESS}/api/emergency-fund/analysis`, { credentials: 'include' }),
      ]);
      if (fRes.ok) {
        const data = await fRes.json();
        setFund(data);
        setSavingsInput(String(data.currentSavings ?? 0));
        setTargetMonths(data.targetMonths ?? 6);
      }
      if (aRes.ok) setAnalysis(await aRes.json());
    } catch {/**/} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveFund = async () => {
    setSaving(true);
    try {
      await fetch(`${EXPRESS}/api/emergency-fund/update`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentSavings: Number(savingsInput), targetMonths }),
      });
      setEditingSavings(false);
      await load();
    } catch {/**/} finally { setSaving(false); }
  };

  if (loading) {
    return <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm animate-pulse h-full" />;
  }

  const style = riskStyle(fund?.riskLevel ?? 'critical');

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-6 md:p-8 h-full flex flex-col shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:text-blue-600 transition-colors shadow-sm">
            <Shield size={18} />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5 leading-none">Safety Net</h3>
            <div className={cn("px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest inline-block border", style.badge)}>
              {style.label}
            </div>
          </div>
        </div>
        <div className="bg-slate-900 text-white rounded-xl px-4 py-3 text-center shadow-lg">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Ready</p>
          <p className="text-xl font-black tracking-tighter leading-none">{fund?.readinessScore ?? 0}<span className="text-white/30 text-[10px]">/100</span></p>
        </div>
      </div>

      {/* Runway gauge */}
      <div className="flex-1 flex flex-col justify-center py-2">
        <RunwayGauge months={fund?.runwayMonths ?? 0} max={fund?.targetMonths ?? 12} color={style.ring} />
      </div>

      {/* Reserve Input */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-blue-600/20 transition-all mt-6 shadow-inner">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Liquid Reserves</p>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-light text-slate-300 font-mono">£</span>
          {editingSavings ? (
            <input type="number" value={savingsInput} autoFocus
              onChange={(e) => setSavingsInput(e.target.value)}
              className="flex-1 bg-transparent text-2xl font-black text-slate-900 outline-none border-b-2 border-blue-600 font-mono tracking-tighter" />
          ) : (
            <button onClick={() => setEditingSavings(true)}
              className="flex-1 text-left text-2xl font-black text-slate-900 hover:text-blue-600 transition-all font-mono tracking-tighter leading-none">
              {Number(savingsInput) > 0 ? Math.round(Number(savingsInput)).toLocaleString('en-GB') : "0"}
            </button>
          )}
          <button 
            onClick={editingSavings ? saveFund : () => setEditingSavings(true)} 
            className={cn("p-2.5 rounded-xl transition-all shadow-md", editingSavings ? "bg-slate-900 text-white" : "bg-white text-slate-400 hover:text-blue-600 border border-slate-100")}
          >
            {saving ? <Zap size={14} className="animate-spin" /> : <Target size={14} />}
          </button>
        </div>
      </div>

      {/* Target selector */}
      <div className="flex gap-2 mt-6">
        {[3, 6, 9, 12].map((m) => (
          <button key={m} onClick={() => setTargetMonths(m)}
            className={cn(
              "flex-1 py-3 rounded-xl text-[9px] font-black tracking-widest transition-all border",
              targetMonths === m 
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg' 
                : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-100'
            )}>
            {m}M
          </button>
        ))}
      </div>

      {/* Simulation */}
      <div className="mt-6">
        <button onClick={() => setShowScenarios((s) => !s)}
          className="w-full bg-slate-900 text-white rounded-xl py-4 text-[9px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-blue-600 transition-all">
          {showScenarios ? 'Hide' : 'Simulate'}
          <ChevronDown size={14} className={cn("transition-transform duration-500", showScenarios && "rotate-180")} />
        </button>
        <AnimatePresence>
          {showScenarios && analysis && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-3 bg-slate-50 rounded-2xl p-3 border border-slate-50 space-y-0.5">
                {analysis.scenarios.map((s) => (
                  <ScenarioRow key={s.label} label={s.label} runway={s.runway} riskLevel={s.riskLevel} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
