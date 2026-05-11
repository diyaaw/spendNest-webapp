'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { estimateTax, compareRegimes, getCurrentAdvanceTaxDue, fmt, type TaxEstimate, type TaxRegime } from '@/lib/taxEngine';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number) { return `${n.toFixed(1)}%`; }

function progressWidth(cumulative: number, total: number) {
  return total > 0 ? `${Math.min(100, (cumulative / total) * 100).toFixed(1)}%` : '0%';
}

// ── Quarterly timeline row ────────────────────────────────────────────────────

function QuarterRow({
  label, dueDate, amountDue, cumulative, totalTax, percentage, delay,
}: {
  label: string; dueDate: string; amountDue: number;
  cumulative: number; totalTax: number; percentage: number; delay: number;
}) {
  const now = new Date();
  const [d, m] = dueDate.split(' ');
  const months: Record<string, number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const due = new Date(now.getFullYear(), months[m] ?? 0, parseInt(d));
  const isPast = due < now;
  const isNext = !isPast && cumulative === totalTax ? false : !isPast;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all ${
        isPast
          ? 'border-white/5 bg-white/3 opacity-50'
          : isNext
          ? 'border-indigo-500/30 bg-indigo-500/5'
          : 'border-white/8 bg-white/3'
      }`}
    >
      {/* Timeline dot */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isPast ? 'bg-white/8 text-white/30' : 'bg-indigo-500/20 text-indigo-400'
      }`}>
        <span className="text-xs font-bold">{percentage}%</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white/80">{label}</p>
            <p className={`text-xs ${isPast ? 'text-white/25' : 'text-indigo-400/70'}`}>Due {dueDate}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-white">{fmt(amountDue)}</p>
            <p className="text-[10px] text-white/30">Cumulative {fmt(cumulative)}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-white/8 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isPast ? 'bg-white/20' : 'bg-indigo-500'}`}
            initial={{ width: 0 }}
            animate={{ width: progressWidth(cumulative, totalTax) }}
            transition={{ duration: 0.8, delay: delay + 0.1 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  annualIncome?: number;
}

export default function TaxEstimatorCard({ annualIncome = 0 }: Props) {
  const [regime, setRegime] = useState<TaxRegime>('new');
  const [customIncome, setCustomIncome] = useState(annualIncome);
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Update local income if prop changes (when dashboard data loads)
  useEffect(() => {
    if (annualIncome > 0) setCustomIncome(annualIncome);
  }, [annualIncome]);

  const comparison = compareRegimes(customIncome);
  const estimate: TaxEstimate = comparison[regime];
  const other: TaxEstimate = comparison[regime === 'new' ? 'old' : 'new'];
  const savings = Math.abs(estimate.totalTax - other.totalTax);
  const currentDue = getCurrentAdvanceTaxDue(estimate);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-[#0d1117] rounded-3xl p-6 border border-white/5 shadow-xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Tax Estimator</h3>
          <p className="text-white/30 text-xs mt-0.5">FY 2024-25 · Indian Freelancer</p>
        </div>
        {/* Regime toggle */}
        <div className="flex rounded-xl bg-white/5 p-0.5">
          {(['new', 'old'] as TaxRegime[]).map((r) => (
            <button
              key={r}
              onClick={() => setRegime(r)}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                regime === r
                  ? 'bg-indigo-500 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {r === 'new' ? 'New Regime' : 'Old Regime'}
            </button>
          ))}
        </div>
      </div>

      {/* Income input */}
      <div className="bg-white/5 rounded-2xl p-4 border border-white/8">
        <p className="text-xs text-white/40 mb-2 font-medium">Annual Gross Income</p>
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-lg">₹</span>
          {isEditingIncome ? (
            <input
              type="number"
              value={customIncome || ''}
              autoFocus
              onChange={(e) => setCustomIncome(Number(e.target.value))}
              onBlur={() => setIsEditingIncome(false)}
              className="flex-1 bg-transparent text-2xl font-black text-white outline-none border-b border-indigo-500/50"
            />
          ) : (
            <button
              onClick={() => setIsEditingIncome(true)}
              className="flex-1 text-left text-2xl font-black text-white hover:text-indigo-300 transition-colors"
            >
              {customIncome > 0 ? customIncome.toLocaleString('en-IN') : <span className="text-white/20">Click to enter income</span>}
            </button>
          )}
          <button onClick={() => setIsEditingIncome(true)} className="text-white/20 hover:text-white/50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Hero tax numbers */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-rose-400">{fmt(estimate.totalTax)}</p>
          <p className="text-[10px] text-white/35 mt-1">Total Tax</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-amber-400">{pct(estimate.effectiveRate)}</p>
          <p className="text-[10px] text-white/35 mt-1">Effective Rate</p>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-indigo-400">{fmt(estimate.monthlyReserve)}</p>
          <p className="text-[10px] text-white/35 mt-1">Reserve/Month</p>
        </div>
      </div>

      {/* "Reserve X this month" callout */}
      {estimate.totalTax > 0 && (
        <motion.div
          key={regime}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4"
        >
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-emerald-400 font-bold text-sm">
              Set aside {fmt(estimate.monthlyReserve)} this month
            </p>
            <p className="text-emerald-400/60 text-xs mt-0.5">
              To stay on track for your {fmt(estimate.totalTax)} annual tax bill.
            </p>
          </div>
        </motion.div>
      )}

      {/* GST warning */}
      {estimate.gstRequired && (
        <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
          <span className="text-xl">⚠️</span>
          <p className="text-orange-400 text-xs leading-relaxed">
            <span className="font-bold">GST Registration Required</span> — Annual income exceeds ₹20L threshold. Register on gstin.gov.in.
          </p>
        </div>
      )}

      {/* Regime savings comparison */}
      {savings > 0 && (
        <button
          onClick={() => setShowComparison((s) => !s)}
          className="w-full bg-white/5 hover:bg-white/8 transition-colors rounded-xl p-3 text-xs text-center"
        >
          <span className="text-white/50">
            {regime === 'new' ? '🟢 New Regime saves you ' : '🟡 Old Regime saves you '}
            <span className="text-indigo-400 font-bold">{fmt(savings)}</span> vs {regime === 'new' ? 'Old' : 'New'} Regime
          </span>
          <span className="text-white/25 ml-2">{showComparison ? '▲' : '▼'}</span>
        </button>
      )}

      {/* Slab breakdown (comparison mode) */}
      <AnimatePresence>
        {showComparison && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Tax Slab Breakdown — {regime === 'new' ? 'New' : 'Old'} Regime</p>
              {estimate.slabBreakdown.filter((s) => s.taxableInRange > 0).map((slab, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-white/40">@ {slab.rate}% on {fmt(slab.taxableInRange)}</span>
                  <span className="text-white/70 font-semibold">{fmt(slab.taxInSlab)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs border-t border-white/8 pt-2">
                <span className="text-white/40">4% Health & Education Cess</span>
                <span className="text-white/70 font-semibold">{fmt(estimate.cess)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advance Tax Timeline */}
      {estimate.totalTax > 0 && (
        <div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Advance Tax Schedule</p>
          <div className="space-y-2">
            {estimate.advanceTax.map((q, i) => (
              <QuarterRow
                key={q.dueDate}
                {...q}
                totalTax={estimate.totalTax}
                delay={i * 0.1}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
