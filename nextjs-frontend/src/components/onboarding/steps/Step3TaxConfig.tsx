'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import SelectionCard from '../SelectionCard';

// ── Data ──────────────────────────────────────────────────────────────────────

const FILING_STATUSES = [
  { value: 'individual', icon: '👤', label: 'Individual', desc: 'Salaried + freelance income, ITR-2' },
  { value: 'sole-proprietor', icon: '🧾', label: 'Sole Proprietor', desc: 'Business income, ITR-3 or ITR-4' },
  { value: 'llp', icon: '🤝', label: 'LLP', desc: 'Limited liability partnership entity' },
  { value: 'agency', icon: '🏢', label: 'Agency / Company', desc: 'Registered company with GST' },
] as const;

const TAX_BRACKETS = [
  { value: 5, label: '5%', desc: 'Up to ₹5L' },
  { value: 10, label: '10%', desc: '₹5L–₹7.5L' },
  { value: 20, label: '20%', desc: '₹7.5L–₹10L' },
  { value: 30, label: '30%', desc: 'Above ₹10L' },
];

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex ml-1.5">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 text-[10px] flex items-center justify-center hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
      >
        ?
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-slate-900 text-white text-[11px] rounded-xl p-3 shadow-xl z-50 leading-relaxed border border-slate-700">
          {text}
        </span>
      )}
    </span>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
    >
      <span
        className={`inline-block w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 mt-0.5 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Step3Props {
  onNext: () => void;
  onBack: () => void;
  isIndian: boolean;
}

export default function Step3TaxConfig({ onNext, onBack, isIndian }: Step3Props) {
  const { profile, updateProfile } = useOnboardingStore();
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!profile.taxFilingStatus) { setError('Please select your tax filing status.'); return; }
    setError('');
    onNext();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Tax Setup</h1>
        <p className="text-slate-500 text-sm leading-relaxed">We'll handle the math — you just need to answer a few quick questions.</p>
      </div>

      {/* Indian tax note */}
      {isIndian && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm shadow-emerald-50"
        >
          <span className="text-xl mt-0.5">🇮🇳</span>
          <div>
            <p className="text-emerald-900 font-bold text-sm">India-first tax engine enabled</p>
            <p className="text-emerald-700 text-xs mt-1 leading-relaxed">
              We'll automatically remind you of GST deadlines, advance tax due dates (Mar, Jun, Sep, Dec), and help you set aside the right amount each month.
            </p>
          </div>
        </motion.div>
      )}

      {/* Filing status */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center">
          Tax filing status
          <Tooltip text="This determines which ITR form you file and which tax rules apply to your income." />
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FILING_STATUSES.map((s) => (
            <SelectionCard
              key={s.value}
              id={`filing-status-${s.value}`}
              icon={s.icon}
              label={s.label}
              description={s.desc}
              selected={profile.taxFilingStatus === s.value}
              onClick={() => updateProfile({ taxFilingStatus: s.value })}
            />
          ))}
        </div>
      </div>

      {/* Tax bracket */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center">
          Applicable tax bracket
          <Tooltip text="Approximate bracket based on your annual taxable income. We'll refine this as we learn more about your earnings." />
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TAX_BRACKETS.map((b) => (
            <motion.button
              key={b.value}
              id={`tax-bracket-${b.value}`}
              type="button"
              onClick={() => updateProfile({ taxBracket: b.value })}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`
                flex flex-col items-center py-3 px-2 rounded-2xl border-2 transition-all duration-200
                ${profile.taxBracket === b.value
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}
              `}
            >
              <span className={`text-lg font-black ${profile.taxBracket === b.value ? 'text-white' : 'text-slate-900'}`}>{b.label}</span>
              <span className={`text-[10px] font-bold mt-0.5 ${profile.taxBracket === b.value ? 'text-indigo-100' : 'text-slate-400'}`}>{b.desc}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        {/* GST toggle */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-slate-200 transition-colors">
          <div>
            <p className="text-sm font-bold text-slate-900 flex items-center">
              GST Registered
              <Tooltip text="If you're registered under GST, you're required to file GSTR-1 and GSTR-3B every month or quarter." />
            </p>
            <p className="text-xs text-slate-400 mt-1">Applies if your annual turnover exceeds ₹20L</p>
          </div>
          <Toggle
            id="gst-registered-toggle"
            checked={profile.gstRegistered}
            onChange={(v) => updateProfile({ gstRegistered: v })}
          />
        </div>

        <div className="flex items-center justify-between bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-slate-200 transition-colors">
          <div>
            <p className="text-sm font-bold text-slate-900 flex items-center">
              Auto tax estimation
              <Tooltip text="FlowShield will automatically estimate your quarterly tax liability and set aside reserves from each payment received." />
            </p>
            <p className="text-xs text-slate-400 mt-1">We calculate and reserve your taxes automatically</p>
          </div>
          <Toggle
            id="auto-tax-toggle"
            checked={profile.autoTaxEstimation}
            onChange={(v) => updateProfile({ autoTaxEstimation: v })}
          />
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
          id="onboarding-step3-next"
          type="button"
          onClick={handleNext}
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
