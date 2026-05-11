'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const EXPRESS = process.env.NEXT_PUBLIC_API_URL!;

function riskStyle(level: string) {
  switch (level) {
    case 'excellent': return { ring: '#10B981', badge: 'bg-emerald-500/15 text-emerald-400', label: 'Excellent', emoji: '🟢' };
    case 'healthy':   return { ring: '#34D399', badge: 'bg-emerald-500/10 text-emerald-300', label: 'Healthy',   emoji: '🟢' };
    case 'moderate':  return { ring: '#F59E0B', badge: 'bg-amber-500/15 text-amber-400',     label: 'Moderate',  emoji: '🟡' };
    case 'low':       return { ring: '#F97316', badge: 'bg-orange-500/15 text-orange-400',   label: 'Low',       emoji: '🟠' };
    default:          return { ring: '#F43F5E', badge: 'bg-rose-500/15 text-rose-400',       label: 'Critical',  emoji: '🔴' };
  }
}

function RunwayGauge({ months, max = 12, color }: { months: number; max?: number; color: string }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, months / max);
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <motion.circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - circ * pct }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="text-3xl font-black text-white leading-none"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          {months}
        </motion.span>
        <span className="text-[10px] text-white/35 font-medium">months</span>
      </div>
    </div>
  );
}

function ScenarioRow({ label, runway, riskLevel, riskColor }: {
  label: string; runway: number; riskLevel: string; riskColor: string;
}) {
  const style = riskStyle(riskLevel);
  return (
    <div className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
      <span className="text-white/40 truncate pr-4">{label}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.badge}`}>{style.emoji} {runway}mo</span>
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
    return (
      <div className="bg-gradient-to-br from-slate-900 to-[#0d1117] rounded-3xl p-6 border border-white/5 shadow-xl animate-pulse">
        <div className="h-4 w-40 bg-white/5 rounded mb-6" />
        <div className="w-36 h-36 bg-white/5 rounded-full mx-auto mb-6" />
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-3 bg-white/5 rounded" />)}</div>
      </div>
    );
  }

  const style = riskStyle(fund?.riskLevel ?? 'critical');

  return (
    <div className="bg-gradient-to-br from-slate-900 to-[#0d1117] rounded-3xl p-6 border border-white/5 shadow-xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Emergency Fund</h3>
          <span className={`inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${style.badge}`}>
            {style.emoji} {style.label}
          </span>
        </div>
        <div className="bg-white/5 rounded-xl px-3 py-2 text-center">
          <p className="text-xs text-white/30">Readiness</p>
          <p className="text-lg font-black text-white">{fund?.readinessScore ?? 0}<span className="text-white/30 text-xs">/100</span></p>
        </div>
      </div>

      {/* Runway gauge */}
      <RunwayGauge months={fund?.runwayMonths ?? 0} max={fund?.targetMonths ?? 6} color={style.ring} />

      {/* Milestone labels */}
      <div className="flex justify-between text-[10px] text-white/25 px-2">
        {['1mo', '3mo', '6mo', '12mo'].map(l => <span key={l}>{l}</span>)}
      </div>

      {/* Current savings input */}
      <div className="bg-white/5 rounded-2xl p-4 border border-white/8">
        <p className="text-xs text-white/40 mb-2 font-medium">Emergency Savings</p>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-lg">₹</span>
          {editingSavings ? (
            <input type="number" value={savingsInput} autoFocus
              onChange={(e) => setSavingsInput(e.target.value)}
              className="flex-1 bg-transparent text-2xl font-black text-white outline-none border-b border-indigo-500/50" />
          ) : (
            <button onClick={() => setEditingSavings(true)}
              className="flex-1 text-left text-2xl font-black text-white hover:text-indigo-300 transition-colors">
              {Number(savingsInput) > 0 ? Number(savingsInput).toLocaleString('en-IN') : <span className="text-white/20">Enter your savings</span>}
            </button>
          )}
          {editingSavings ? (
            <button onClick={saveFund} disabled={saving}
              className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
              {saving ? '…' : 'Save'}
            </button>
          ) : (
            <button onClick={() => setEditingSavings(true)} className="text-white/20 hover:text-white/50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Target months selector */}
      <div>
        <p className="text-xs text-white/35 mb-2 font-medium">Target Coverage</p>
        <div className="flex gap-2">
          {[3, 6, 9, 12].map((m) => (
            <button key={m} onClick={() => setTargetMonths(m)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${targetMonths === m ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/35 hover:bg-white/10'}`}>
              {m}mo
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-white/35">Progress to {targetMonths}-month goal</span>
          <span className="text-white/60 font-bold">{fund?.progressPct ?? 0}%</span>
        </div>
        <div className="h-2 bg-white/8 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ backgroundColor: style.ring }}
            initial={{ width: 0 }}
            animate={{ width: `${fund?.progressPct ?? 0}%` }}
            transition={{ duration: 1, ease: 'easeOut' }} />
        </div>
        <div className="flex justify-between text-[10px] text-white/20 mt-1">
          <span>{fmt(fund?.currentSavings ?? 0)}</span>
          <span>Goal: {fmt(fund?.targetSavings ?? 0)}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-[10px] text-white/30 mb-1">Avg Monthly Burn</p>
          <p className="text-base font-black text-white">{fmt(fund?.avgMonthlyExpenses ?? 0)}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-[10px] text-white/30 mb-1">Monthly Target</p>
          <p className="text-base font-black text-indigo-400">{fmt(fund?.monthlyTargetToGoal ?? 0)}</p>
        </div>
      </div>

      {/* AI Recommendations */}
      {(analysis?.recommendations?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {analysis!.recommendations.map((r) => (
            <div key={r} className="flex items-start gap-2 text-xs text-white/50 leading-relaxed">
              <span className="text-indigo-400 mt-0.5 flex-shrink-0">→</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Scenario simulations */}
      {(analysis?.scenarios?.length ?? 0) > 0 && (
        <>
          <button onClick={() => setShowScenarios((s) => !s)}
            className="w-full bg-white/5 hover:bg-white/8 transition-colors rounded-xl p-3 text-xs text-white/40 text-center">
            {showScenarios ? '▲ Hide' : '▼ Show'} Income Drop & Emergency Simulations
          </button>
          <AnimatePresence>
            {showScenarios && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2">What-If Scenarios</p>
                <div className="bg-white/3 rounded-xl p-3">
                  {analysis!.scenarios.map((s) => (
                    <ScenarioRow key={s.label} label={s.label} runway={s.runway} riskLevel={s.riskLevel} riskColor={s.riskColor} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
