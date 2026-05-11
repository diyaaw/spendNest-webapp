'use client';

import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/useOnboardingStore';

// ── Data ──────────────────────────────────────────────────────────────────────

const SAFETY_BUFFERS = [
  { value: 1, label: '1 Month', desc: 'Minimum safety net' },
  { value: 3, label: '3 Months', desc: 'Recommended baseline' },
  { value: 6, label: '6 Months', desc: 'Comfortable cushion' },
  { value: 12, label: '12 Months', desc: 'Maximum security' },
] as const;

const OPTIMIZE_OPTIONS = [
  { value: 'stability', icon: '🛡️', label: 'Financial Stability' },
  { value: 'growth', icon: '📈', label: 'Growth' },
  { value: 'tax-savings', icon: '💰', label: 'Tax Savings' },
  { value: 'budgeting', icon: '📊', label: 'Better Budgeting' },
  { value: 'less-anxiety', icon: '🧘', label: 'Less Income Anxiety' },
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
      <label htmlFor={id} className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-medium">{currencySymbol}</span>
        <input
          id={id}
          type="number"
          min={0}
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 hover:border-white/20 transition-all"
        />
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-white/30">{hint}</p>}
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white mb-1">Expenses & safety</h1>
        <p className="text-white/40 text-sm">Build your financial safety net tailored to your income rhythm.</p>
      </div>

      {/* Expense inputs */}
      <div className="grid grid-cols-2 gap-4">
        <CurrencyInput
          id="avg-monthly-expenses"
          label="Avg Monthly Expenses"
          value={profile.avgMonthlyExpenses}
          onChange={(v) => updateProfile({ avgMonthlyExpenses: v })}
          currencySymbol={currSym}
          placeholder="e.g. 40000"
          hint="Rent, food, subscriptions, etc."
        />
        <CurrencyInput
          id="emergency-fund-target"
          label="Emergency Fund Target"
          value={profile.emergencyFundTarget}
          onChange={(v) => updateProfile({ emergencyFundTarget: v })}
          currencySymbol={currSym}
          placeholder="e.g. 300000"
          hint="Total lump sum target amount"
        />
      </div>

      {/* Safety buffer */}
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Desired income safety buffer
        </p>
        <div className="grid grid-cols-4 gap-2">
          {SAFETY_BUFFERS.map((b) => (
            <motion.button
              key={b.value}
              id={`safety-buffer-${b.value}`}
              type="button"
              onClick={() => updateProfile({ safetyBufferMonths: b.value })}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`
                flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all duration-200 text-center
                ${profile.safetyBufferMonths === b.value
                  ? 'border-amber-500 bg-amber-500/10 text-white'
                  : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20'}
              `}
            >
              <span className={`font-black text-sm ${profile.safetyBufferMonths === b.value ? 'text-amber-400' : ''}`}>{b.label}</span>
              <span className="text-[10px] mt-0.5 leading-tight">{b.desc}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Savings goal slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Monthly savings goal</p>
          <span className="text-indigo-400 font-black text-lg">{savingsPct}%</span>
        </div>
        <input
          id="savings-goal-slider"
          type="range"
          min={0}
          max={80}
          step={5}
          value={savingsPct}
          onChange={(e) => updateProfile({ savingsGoalPct: Number(e.target.value) })}
          className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
        />
        <div className="flex justify-between text-[10px] text-white/25 mt-1.5">
          <span>0%</span>
          <span>20% recommended</span>
          <span>80%</span>
        </div>
      </div>

      {/* Optimization goals — multi-select */}
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          What are you optimizing for? <span className="normal-case font-normal text-white/25">(pick all that apply)</span>
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
                  flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all duration-200
                  ${active
                    ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                    : 'border-white/10 bg-white/5 text-white/45 hover:border-white/20 hover:text-white/65'}
                `}
              >
                <span>{o.icon}</span>
                <span>{o.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/25 text-sm font-medium transition-all"
        >
          ← Back
        </button>
        <motion.button
          id="onboarding-step4-next"
          type="button"
          onClick={onNext}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-900/30 text-sm"
        >
          Continue →
        </motion.button>
      </div>
    </div>
  );
}
