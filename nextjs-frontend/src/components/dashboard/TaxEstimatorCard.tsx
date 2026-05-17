'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { estimateTax, compareRegimes, getCurrentAdvanceTaxDue, fmt, type TaxEstimate, type TaxRegime } from '@/lib/taxEngine';
import { Calculator, Shield, Info, ArrowRight, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      className={cn(
        "relative flex items-center gap-4 p-5 rounded-3xl border transition-all",
        isPast
          ? 'border-slate-100 bg-slate-50 opacity-40'
          : isNext
          ? 'border-emerald-100 bg-emerald-50'
          : 'border-slate-100 bg-white shadow-sm'
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-mono text-[10px] font-black tracking-tighter",
        isPast ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'
      )}>
        {percentage}%
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{label}</p>
            <p className={cn("text-[10px] font-bold", isPast ? 'text-slate-400' : 'text-emerald-600')}>Due {dueDate}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-slate-900 font-mono">{fmt(amountDue)}</p>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Cumulative {fmt(cumulative)}</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
          <motion.div
            className={cn("h-full rounded-full", isPast ? 'bg-slate-300' : 'bg-emerald-500')}
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

  useEffect(() => {
    if (annualIncome > 0) setCustomIncome(annualIncome);
  }, [annualIncome]);

  const comparison = compareRegimes(customIncome);
  const estimate: TaxEstimate = comparison[regime];
  const other: TaxEstimate = comparison[regime === 'new' ? 'old' : 'new'];
  const savings = Math.abs(estimate.totalTax - other.totalTax);
  const currentDue = getCurrentAdvanceTaxDue(estimate);

  return (
    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-xl space-y-8">

      {/* Header with Glassmorphic Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 shadow-sm">
            <Calculator size={24} />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Advanced Estimator</h3>
            <p className="text-slate-900 text-xs font-black opacity-60">FY 2024-25 • Sec 44ADA (50% Profit)</p>
          </div>
        </div>

        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
          {(['new', 'old'] as TaxRegime[]).map((r) => (
            <button
              key={r}
              onClick={() => setRegime(r)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                regime === r
                  ? 'bg-white text-blue-600 shadow-md scale-105 border border-slate-100'
                  : 'text-slate-400 hover:text-slate-900'
              )}
            >
              {r === 'new' ? 'New Regime' : 'Old Regime'}
            </button>
          ))}
        </div>
      </div>

      {/* Income Control - Massive White Box */}
      <div className="bg-slate-50 rounded-[2rem] p-6 md:p-8 border border-slate-100 relative overflow-hidden group shadow-inner">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full pointer-events-none" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Taxable Turnover</p>
        <div className="flex items-center gap-4">
          <span className="text-4xl font-light text-slate-300 font-mono">₹</span>
          {isEditingIncome ? (
            <input
              type="number"
              value={customIncome || ''}
              autoFocus
              onChange={(e) => setCustomIncome(Number(e.target.value))}
              onBlur={() => setIsEditingIncome(false)}
              className="flex-1 bg-transparent text-5xl font-black text-slate-900 outline-none border-b-2 border-blue-600/30 font-mono tracking-tighter"
            />
          ) : (
            <button
              onClick={() => setIsEditingIncome(true)}
              className="flex-1 text-left text-4xl md:text-5xl font-black text-slate-900 hover:text-blue-600 transition-all font-mono tracking-tighter leading-none"
            >
              {customIncome > 0 ? Math.round(customIncome).toLocaleString('en-IN') : "0"}
            </button>
          )}
          <button 
            onClick={() => setIsEditingIncome(true)}
            className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:shadow-lg transition-all"
          >
            <Shield size={18} />
          </button>
        </div>
      </div>

      {/* Hero Stats - Modern Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total Tax Liability", val: fmt(estimate.totalTax), icon: Calculator, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
          { label: "Effective Tax Rate", val: pct(estimate.effectiveRate), icon: Info, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          { label: "Monthly Provision", val: fmt(estimate.monthlyReserve), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
        ].map((item, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-3xl p-6 relative overflow-hidden group hover:shadow-xl transition-all">
             <div className={cn("mb-4 p-2.5 w-fit rounded-xl shadow-sm border", item.bg, item.color, item.border)}>
               <item.icon size={18} />
             </div>
             <p className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{item.val}</p>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Dynamic Savings Alert */}
      <AnimatePresence mode="wait">
        {savings > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-slate-900 font-black text-sm">
                  The {regime === 'new' ? 'New' : 'Old'} Regime is your optimal choice
                </p>
                <p className="text-blue-600/70 text-xs font-bold uppercase tracking-tight">
                  Saving you <span className="text-blue-600 font-black">{fmt(savings)}</span> annually.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowComparison(!showComparison)}
              className="p-2.5 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-blue-600 border border-transparent hover:border-blue-100"
            >
              <ChevronDown className={cn("transition-transform duration-500", showComparison && "rotate-180")} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison Detail */}
      <AnimatePresence>
        {showComparison && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-slate-50 rounded-3xl p-6 border border-slate-100 shadow-inner"
          >
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Tax Slab Breakdown</h4>
              {estimate.slabBreakdown.filter((s) => s.taxableInRange > 0).map((slab, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-tight">@ {slab.rate}% on {fmt(slab.taxableInRange)}</span>
                  <span className="text-sm text-slate-900 font-black font-mono">{fmt(slab.taxInSlab)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <span className="text-xs text-slate-400 font-black uppercase tracking-widest">Health & Education Cess (4%)</span>
                <span className="text-sm text-slate-600 font-black font-mono">{fmt(estimate.cess)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advance Tax Timeline */}
      {estimate.totalTax > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compliance Schedule</h4>
             {estimate.gstRequired && (
               <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-100 rounded-full">
                 <AlertTriangle size={10} className="text-rose-600" />
                 <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest">GST Required</span>
               </div>
             )}
          </div>
          <div className="grid grid-cols-1 gap-4">
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
