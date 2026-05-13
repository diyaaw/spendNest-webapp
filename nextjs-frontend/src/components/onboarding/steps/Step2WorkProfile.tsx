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
  return <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{children}</p>;
}

function CurrencyInput({
  label, id, value, onChange, currencySymbol, placeholder,
}: {
  label: string; id: string; value: number; onChange: (v: number) => void;
  currencySymbol: string; placeholder: string;
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Work Profile</h1>
        <p className="text-slate-500 text-sm leading-relaxed">Help us tailor your income forecasts and tax estimations.</p>
      </div>

      {/* Freelancer type */}
      <div>
        <SectionLabel>I am a…</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Work area */}
      <div>
        <SectionLabel>Main Work Area</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {WORK_CATEGORIES.map((c) => (
            <motion.button
              key={c.value}
              id={`work-category-${c.value}`}
              type="button"
              onClick={() => updateProfile({ workCategory: c.value })}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`
                flex items-center gap-2 py-2.5 px-4 rounded-xl border-2 font-bold transition-all duration-200
                ${profile.workCategory === c.value
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}
              `}
            >
              <span className="text-lg">{c.icon}</span>
              <span className="text-xs uppercase tracking-tight">{c.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Income targets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
        <CurrencyInput
          id="income-target"
          label="Monthly Goal"
          value={profile.incomeTarget}
          onChange={(v) => updateProfile({ incomeTarget: v })}
          currencySymbol={currSym}
          placeholder="e.g. 150000"
        />
        <CurrencyInput
          id="avg-monthly-income"
          label="Avg. Expected"
          value={profile.avgMonthlyIncome}
          onChange={(v) => updateProfile({ avgMonthlyIncome: v })}
          currencySymbol={currSym}
          placeholder="e.g. 120000"
        />
      </div>

      {/* Income frequency */}
      <div>
        <SectionLabel>Payment Frequency</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {INCOME_FREQUENCIES.map((f) => (
            <button
              key={f.value}
              id={`income-freq-${f.value}`}
              type="button"
              onClick={() => updateProfile({ incomeFrequency: f.value })}
              className={`
                py-3 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all duration-200
                ${profile.incomeFrequency === f.value
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold flex items-center gap-2">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
           </svg>
           {error}
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-slate-600 hover:border-slate-200 text-sm font-bold transition-all"
        >
          Back
        </button>
        <motion.button
          id="onboarding-step2-next"
          type="button"
          onClick={handleNext}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-all duration-200 shadow-xl shadow-slate-200 text-sm flex items-center justify-center gap-2"
        >
          Save & Continue
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}
