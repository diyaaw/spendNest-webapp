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
        className="w-4 h-4 rounded-full bg-white/10 text-white/40 text-[10px] flex items-center justify-center hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors"
      >
        ?
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-slate-800 text-white text-[11px] rounded-xl p-3 shadow-xl z-50 leading-relaxed border border-white/10">
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
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-indigo-500' : 'bg-white/10'}`}
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white mb-1">Tax configuration</h1>
        <p className="text-white/40 text-sm">We'll handle the math — you just need to answer a few quick questions.</p>
      </div>

      {/* Indian tax note */}
      {isIndian && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4"
        >
          <span className="text-xl mt-0.5">🇮🇳</span>
          <div>
            <p className="text-emerald-400 font-semibold text-sm">India-first tax engine enabled</p>
            <p className="text-emerald-400/60 text-xs mt-0.5 leading-relaxed">
              We'll automatically remind you of GST deadlines, advance tax due dates (Mar, Jun, Sep, Dec), and help you set aside the right amount each month.
            </p>
          </div>
        </motion.div>
      )}

      {/* Filing status */}
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Tax filing status
          <Tooltip text="This determines which ITR form you file and which tax rules apply to your income." />
        </p>
        <div className="grid grid-cols-2 gap-3">
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
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Applicable tax bracket
          <Tooltip text="Approximate bracket based on your annual taxable income. We'll refine this as we learn more about your earnings." />
        </p>
        <div className="grid grid-cols-4 gap-2">
          {TAX_BRACKETS.map((b) => (
            <motion.button
              key={b.value}
              id={`tax-bracket-${b.value}`}
              type="button"
              onClick={() => updateProfile({ taxBracket: b.value })}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`
                flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all duration-200
                ${profile.taxBracket === b.value
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20'}
              `}
            >
              <span className={`text-lg font-black ${profile.taxBracket === b.value ? 'text-emerald-400' : 'text-white/60'}`}>{b.label}</span>
              <span className="text-[10px] mt-0.5">{b.desc}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        {/* GST toggle (especially relevant for Indians) */}
        <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
          <div>
            <p className="text-sm font-semibold text-white/80">
              GST Registered
              <Tooltip text="If you're registered under GST, you're required to file GSTR-1 and GSTR-3B every month or quarter." />
            </p>
            <p className="text-xs text-white/35 mt-0.5">Applies if your annual turnover exceeds ₹20L</p>
          </div>
          <Toggle
            id="gst-registered-toggle"
            checked={profile.gstRegistered}
            onChange={(v) => updateProfile({ gstRegistered: v })}
          />
        </div>

        <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
          <div>
            <p className="text-sm font-semibold text-white/80">
              Auto tax estimation
              <Tooltip text="FlowShield will automatically estimate your quarterly tax liability and set aside reserves from each payment received." />
            </p>
            <p className="text-xs text-white/35 mt-0.5">We calculate and reserve your taxes automatically</p>
          </div>
          <Toggle
            id="auto-tax-toggle"
            checked={profile.autoTaxEstimation}
            onChange={(v) => updateProfile({ autoTaxEstimation: v })}
          />
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
          id="onboarding-step3-next"
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
