'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import SelectionCard from '../SelectionCard';

// ── Data ──────────────────────────────────────────────────────────────────────

const FREELANCER_TYPES = [
  { value: 'solo', icon: '🧑‍💻', label: 'Solo Freelancer', desc: 'Independent contractor working alone' },
  { value: 'agency', icon: '🏢', label: 'Agency Owner', desc: 'Managing a team of freelancers' },
  { value: 'part-time', icon: '⏱️', label: 'Part-time', desc: 'Side income alongside a day job' },
  { value: 'creator', icon: '🎨', label: 'Creator / Consultant', desc: 'Content, coaching, or advisory' },
] as const;

const WORK_CATEGORIES = [
  { value: 'developer', icon: '⚡', label: 'Developer' },
  { value: 'designer', icon: '🎨', label: 'Designer' },
  { value: 'writer', icon: '✍️', label: 'Writer' },
  { value: 'marketing', icon: '📈', label: 'Marketing' },
  { value: 'video', icon: '🎬', label: 'Video Editor' },
  { value: 'consultant', icon: '💼', label: 'Consultant' },
  { value: 'other', icon: '🔧', label: 'Other' },
] as const;

const INCOME_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'irregular', label: 'Irregular' },
] as const;

// ── Helper components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">{children}</p>;
}

function CurrencyInput({
  label, id, value, onChange, currencySymbol, placeholder,
}: {
  label: string; id: string; value: number; onChange: (v: number) => void;
  currencySymbol: string; placeholder: string;
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
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Step2Props {
  onNext: () => void;
  onBack: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', GBP: '£', EUR: '€', CAD: 'CA$',
  AUD: 'A$', SGD: 'S$', AED: 'AED', PHP: '₱', NGN: '₦',
};

export default function Step2WorkProfile({ onNext, onBack }: Step2Props) {
  const { profile, updateProfile } = useOnboardingStore();
  const [error, setError] = useState('');
  const currSym = CURRENCY_SYMBOLS[profile.currency] ?? profile.currency;

  const handleNext = () => {
    if (!profile.freelancerType) { setError('Please select your freelancer type.'); return; }
    if (!profile.workCategory) { setError('Please select your work category.'); return; }
    if (!profile.incomeFrequency) { setError('Please select your income frequency.'); return; }
    setError('');
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white mb-1">Your work profile</h1>
        <p className="text-white/40 text-sm">Help us tailor your income forecasts and budget targets.</p>
      </div>

      {/* Freelancer type */}
      <div>
        <SectionLabel>I am a…</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {FREELANCER_TYPES.map((t) => (
            <SelectionCard
              key={t.value}
              id={`freelancer-type-${t.value}`}
              icon={t.icon}
              label={t.label}
              description={t.desc}
              selected={profile.freelancerType === t.value}
              onClick={() => updateProfile({ freelancerType: t.value })}
            />
          ))}
        </div>
      </div>

      {/* Work category */}
      <div>
        <SectionLabel>My main work area</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {WORK_CATEGORIES.map((c) => (
            <motion.button
              key={c.value}
              id={`work-category-${c.value}`}
              type="button"
              onClick={() => updateProfile({ workCategory: c.value })}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`
                flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-center transition-all duration-200
                ${profile.workCategory === c.value
                  ? 'border-indigo-500 bg-indigo-500/10 text-white'
                  : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'}
              `}
            >
              <span className="text-xl">{c.icon}</span>
              <span className="text-[11px] font-semibold">{c.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Income fields */}
      <div className="grid grid-cols-2 gap-4">
        <CurrencyInput
          id="income-target"
          label="Monthly Income Target"
          value={profile.incomeTarget}
          onChange={(v) => updateProfile({ incomeTarget: v })}
          currencySymbol={currSym}
          placeholder="e.g. 150000"
        />
        <CurrencyInput
          id="avg-monthly-income"
          label="Expected Avg. Income"
          value={profile.avgMonthlyIncome}
          onChange={(v) => updateProfile({ avgMonthlyIncome: v })}
          currencySymbol={currSym}
          placeholder="e.g. 120000"
        />
      </div>

      {/* Income frequency */}
      <div>
        <SectionLabel>How often do clients pay you?</SectionLabel>
        <div className="flex gap-2">
          {INCOME_FREQUENCIES.map((f) => (
            <button
              key={f.value}
              id={`income-freq-${f.value}`}
              type="button"
              onClick={() => updateProfile({ incomeFrequency: f.value })}
              className={`
                flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200
                ${profile.incomeFrequency === f.value
                  ? 'border-indigo-500 bg-indigo-500/15 text-indigo-400'
                  : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:text-white/60'}
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-2">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/25 text-sm font-medium transition-all"
        >
          ← Back
        </button>
        <motion.button
          id="onboarding-step2-next"
          type="button"
          onClick={handleNext}
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
