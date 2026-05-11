'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpendNestStore } from '@/store/useSpendNestStore';
import InsightsList from './InsightsList';

// ── Colour mapping ─────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 75) return { ring: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400', label: 'Excellent' };
  if (score >= 50) return { ring: '#6366F1', bg: 'bg-indigo-500/10', text: 'text-indigo-400', badge: 'bg-indigo-500/15 text-indigo-400', label: 'Good' };
  if (score >= 25) return { ring: '#F59E0B', bg: 'bg-amber-500/10', text: 'text-amber-400', badge: 'bg-amber-500/15 text-amber-400', label: 'Fair' };
  return { ring: '#F43F5E', bg: 'bg-rose-500/10', text: 'text-rose-400', badge: 'bg-rose-500/15 text-rose-400', label: 'At Risk' };
}

// ── Animated circular gauge ────────────────────────────────────────────────────

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const progress = (score / 100) * circ;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        {/* Track */}
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        {/* Progress */}
        <motion.circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - progress }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-black text-white leading-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-white/35 font-medium mt-0.5">/100</span>
      </div>
    </div>
  );
}

// ── Sub-score bar ──────────────────────────────────────────────────────────────

function SubScore({ label, score, max, delay }: { label: string; score: number; max: number; delay: number }) {
  // Clamp to 0 — negative sub-scores display as 0 on the bar (data is still accurate underneath)
  const displayScore = Math.max(0, score);
  const pct = max > 0 ? (displayScore / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/50">{label}</span>
        <span className="text-white/70 font-semibold">{displayScore}/{max}</span>
      </div>
      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}


// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  score?: {
    overall: number;
    savingsScore: number;
    spendingScore: number;
    emergencyScore: number;
    taxScore: number;
    incomeScore: number;
    label: string;
    insights?: string[];
    trends?: {
      weekend_vs_weekday_pct?: number;
      rising_categories?: string[];
    };
    meta?: {
      savingsRate: number;
      monthsRunway: number;
    } | null;
  } | null;
  loading?: boolean;
}

export default function HealthScoreCard({ score, loading }: Props) {
  const [showRecs, setShowRecs] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 w-36 bg-slate-200 rounded mb-6" />
        <div className="w-40 h-40 bg-slate-100 rounded-full mx-auto mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-3 bg-slate-100 rounded" />)}
        </div>
      </div>
    );
  }

  if (!score || score.overall === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[320px] text-center">
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <p className="text-white/40 text-sm">Upload a CSV to generate your Financial Health Score</p>
      </div>
    );
  }

  const c = scoreColor(Math.max(0, score.overall));
  const displayOverall = Math.max(0, score.overall);


  return (
    <div className="bg-gradient-to-br from-slate-900 to-[#0d1117] rounded-3xl p-6 border border-white/5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Financial Health</h3>
          <span className={`inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${c.badge}`}>{score.label}</span>
        </div>
        <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center`}>
          <svg className={`w-5 h-5 ${c.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>

      {/* Gauge */}
      <ScoreGauge score={score.overall} color={c.ring} />

      {/* Sub-scores */}
      <div className="mt-6 space-y-3">
        <SubScore label="Savings Rate"     score={score.savingsScore}  max={25} delay={0.1} />
        <SubScore label="Spending Consistency" score={score.spendingScore} max={20} delay={0.2} />
        <SubScore label="Emergency Fund"   score={score.emergencyScore} max={25} delay={0.3} />
        <SubScore label="Tax Readiness"    score={score.taxScore}       max={15} delay={0.4} />
        <SubScore label="Income Stability" score={score.incomeScore}    max={15} delay={0.5} />
      </div>

      {/* Meta stats */}
      {score.meta && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-white">{score.meta.savingsRate}%</p>
            <p className="text-[10px] text-white/35 mt-0.5">Savings Rate</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-white">{score.meta.monthsRunway}mo</p>
            <p className="text-[10px] text-white/35 mt-0.5">Runway</p>
          </div>
        </div>
      )}

      {/* AI Recommendations toggle */}
      <button
        onClick={() => setShowRecs((s) => !s)}
        className="w-full mt-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
      >
        {showRecs ? 'Hide' : 'View'} AI Recommendations ↓
      </button>

      <AnimatePresence>
        {showRecs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              {score.recommendations.map((rec) => (
                <div key={rec} className="flex items-start gap-2 text-xs text-white/50 leading-relaxed">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">→</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Insights & Trends */}
      {(score.insights?.length > 0 || score.trends) && (
        <div className="mt-8 pt-6 border-t border-white/5">
          <InsightsList insights={score.insights || []} trends={score.trends} />
        </div>
      )}
    </div>
  );
}
