'use client';

import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/useOnboardingStore';

// ── Data ──────────────────────────────────────────────────────────────────────

const SAFETY_BUFFERS = [
  { value: 1, label: '1 Mo', desc: 'Minimum' },
  { value: 3, label: '3 Mos', desc: 'Baseline' },
  { value: 6, label: '6 Mos', desc: 'Comfort' },
  { value: 12, label: '12 Mos', desc: 'Secure' },
] as const;

const OPTIMIZE_OPTIONS = [
  { value: 'stability', icon: '🛡️', label: 'Stability' },
  { value: 'growth', icon: '📈', label: 'Growth' },
  { value: 'tax-savings', icon: '💰', label: 'Tax Savings' },
  { value: 'budgeting', icon: '📊', label: 'Budgeting' },
  { value: 'less-anxiety', icon: '🧘', label: 'Peace of Mind' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', GBP: '£', EUR: '€', CAD: 'CA$',
  AUD: 'A$', SGD: 'S$', AED: 'AED', PHP: '₱', NGN: '₦',
};

function CurrencyInput({
  label, id, value, onChange, currencySymbol, placeholder, hint,
}: {
  label: string; id: string; value: number; onChange: (v: number) => void;
  currencySymbol: string; placeholder: string; hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">{currencySymbol}</span>
        <input
          id={id}
          type="number"
          min={0}
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3.5 text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 hover:border-slate-300 transition-all"
        />
      </div>
      {hint && <p className="mt-2 text-[10px] text-slate-400 font-medium">{hint}</p>}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Step4Props {
  onNext: () => void;
  onBack: () => void;
}

export default function Step4Expenses({ onNext, onBack }: Step4Props) {
  const { profile, updateProfile } = useOnboardingStore();
  const currSym = CURRENCY_SYMBOLS[profile.currency] ?? profile.currency;

  const toggleOptimize = (value: string) => {
    const current = profile.optimizeFor;
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateProfile({ optimizeFor: updated });
  };

  const savingsPct = profile.savingsGoalPct;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Expenses & Safety</h1>
        <p className="text-slate-500 text-sm leading-relaxed">Build your financial safety net tailored to your income rhythm.</p>
      </div>

      {/* Expense inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
        <CurrencyInput
          id="avg-monthly-expenses"
          label="Monthly Expenses"
          value={profile.avgMonthlyExpenses}
          onChange={(v) => updateProfile({ avgMonthlyExpenses: v })}
          currencySymbol={currSym}
          placeholder="e.g. 40000"
          hint="Rent, food, subscriptions, etc."
        />
        <CurrencyInput
          id="emergency-fund-target"
          label="Safety Net Goal"
          value={profile.emergencyFundTarget}
          onChange={(v) => updateProfile({ emergencyFundTarget: v })}
          currencySymbol={currSym}
          placeholder="e.g. 300000"
          hint="Target total emergency fund"
        />
      </div>

      {/* Safety buffer */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Income Safety Buffer
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SAFETY_BUFFERS.map((b) => (
            <motion.button
              key={b.value}
              id={`safety-buffer-${b.value}`}
              type="button"
              onClick={() => updateProfile({ safetyBufferMonths: b.value })}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`
                flex flex-col items-center py-4 px-2 rounded-2xl border-2 transition-all duration-200 text-center
                ${profile.safetyBufferMonths === b.value
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}
              `}
            >
              <span className={`font-black text-sm ${profile.safetyBufferMonths === b.value ? 'text-white' : 'text-slate-900'}`}>{b.label}</span>
              <span className={`text-[10px] font-bold mt-1 ${profile.safetyBufferMonths === b.value ? 'text-indigo-100' : 'text-slate-400'}`}>{b.desc}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Savings goal slider */}
      <div className="p-6 bg-white rounded-2xl border-2 border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Savings Target</p>
          <span className="text-indigo-600 font-black text-2xl">{savingsPct}%</span>
        </div>
        <input
          id="savings-goal-slider"
          type="range"
          min={0}
          max={80}
          step={5}
          value={savingsPct}
          onChange={(e) => updateProfile({ savingsGoalPct: Number(e.target.value) })}
          className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest">
          <span>Min 0%</span>
          <span className="text-indigo-600">20% is ideal</span>
          <span>Max 80%</span>
        </div>
      </div>

      {/* Optimization goals */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          What are you optimizing for? <span className="normal-case font-normal text-slate-400">(pick all that apply)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {OPTIMIZE_OPTIONS.map((o) => {
            const active = profile.optimizeFor.includes(o.value);
            return (
              <motion.button
                key={o.value}
                id={`optimize-${o.value}`}
                type="button"
                onClick={() => toggleOptimize(o.value)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-full border-2 text-xs font-bold transition-all duration-200
                  ${active
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}
                `}
              >
                <span className="text-base">{o.icon}</span>
                <span className="uppercase tracking-tight">{o.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-slate-600 hover:border-slate-200 text-sm font-bold transition-all"
        >
          Back
        </button>
        <motion.button
          id="onboarding-step4-next"
          type="button"
          onClick={onNext}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-all duration-200 shadow-xl shadow-slate-200 text-sm flex items-center justify-center gap-2"
        >
          Continue
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}
