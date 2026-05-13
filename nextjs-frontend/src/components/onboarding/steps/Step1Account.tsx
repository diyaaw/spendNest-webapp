'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/useOnboardingStore';

// ── Data ──────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'IN', flag: '🇮🇳', name: 'India', currency: 'INR' },
  { code: 'US', flag: '🇺🇸', name: 'United States', currency: 'USD' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', currency: 'GBP' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada', currency: 'CAD' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia', currency: 'AUD' },
  { code: 'SG', flag: '🇸🇬', name: 'Singapore', currency: 'SGD' },
  { code: 'AE', flag: '🇦🇪', name: 'UAE', currency: 'AED' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany', currency: 'EUR' },
  { code: 'FR', flag: '🇫🇷', name: 'France', currency: 'EUR' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands', currency: 'EUR' },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines', currency: 'PHP' },
  { code: 'PK', flag: '🇵🇰', name: 'Pakistan', currency: 'PKR' },
  { code: 'BD', flag: '🇧🇩', name: 'Bangladesh', currency: 'BDT' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria', currency: 'NGN' },
  { code: 'KE', flag: '🇰🇪', name: 'Kenya', currency: 'KES' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil', currency: 'BRL' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico', currency: 'MXN' },
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia', currency: 'IDR' },
  { code: 'MY', flag: '🇲🇾', name: 'Malaysia', currency: 'MYR' },
  { code: 'NZ', flag: '🇳🇿', name: 'New Zealand', currency: 'NZD' },
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
];

// ── Field wrappers ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{children}</label>;
}

function StyledInput({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div>
      <input
        {...props}
        className={`
          w-full bg-white border rounded-2xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400
          focus:outline-none focus:ring-4 transition-all duration-200
          ${error ? 'border-rose-300 focus:ring-rose-500/10' : 'border-slate-200 focus:ring-indigo-500/10 focus:border-indigo-500 hover:border-slate-300'}
        `}
      />
      {error && <p className="mt-1.5 text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
}

function StyledSelect({ children, error, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <div>
      <select
        {...props}
        className={`
          w-full bg-white border rounded-2xl px-4 py-3 text-slate-900 text-sm
          focus:outline-none focus:ring-4 transition-all duration-200 appearance-none cursor-pointer
          ${error ? 'border-rose-300 focus:ring-rose-500/10' : 'border-slate-200 focus:ring-indigo-500/10 focus:border-indigo-500 hover:border-slate-300'}
        `}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Step1Props {
  onNext: () => void;
}

export default function Step1Account({ onNext }: Step1Props) {
  const { profile, updateProfile } = useOnboardingStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fill currency from country
  const handleCountryChange = (code: string) => {
    const found = COUNTRIES.find((c) => c.code === code);
    updateProfile({ country: code, currency: found?.currency ?? profile.currency });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!profile.country) e.country = 'Please select a country';
    if (!profile.currency) e.currency = 'Please select a currency';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Financial Profile</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Welcome <span className="font-bold text-indigo-600">{profile.name}</span>! Let's customize FlowShield for your region.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Read-only account info */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
           <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
             {profile.name?.[0]?.toUpperCase() || '?'}
           </div>
           <div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Confirmed</p>
             <p className="text-sm font-semibold text-slate-700">{profile.email}</p>
           </div>
           <div className="ml-auto">
             <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-lg uppercase">Active</span>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <FieldLabel>Country</FieldLabel>
            <StyledSelect
              id="onboarding-country"
              value={profile.country}
              onChange={(e) => handleCountryChange(e.target.value)}
              error={errors.country}
            >
              <option value="">Select country</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </StyledSelect>
          </div>
          <div>
            <FieldLabel>Currency</FieldLabel>
            <StyledSelect
              id="onboarding-currency"
              value={profile.currency}
              onChange={(e) => updateProfile({ currency: e.target.value })}
              error={errors.currency}
            >
               <option value="">Select currency</option>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
              ))}
            </StyledSelect>
          </div>
        </div>

        {/* State / Province */}
        <div>
          <FieldLabel>State / Province <span className="text-slate-400 normal-case font-normal">(optional)</span></FieldLabel>
          <StyledInput
            id="onboarding-state"
            type="text"
            placeholder="e.g. Maharashtra, California"
            value={profile.state}
            onChange={(e) => updateProfile({ state: e.target.value })}
          />
          <p className="mt-2 text-[10px] text-slate-400">Used for regional tax calculations and financial regulations.</p>
        </div>
      </div>

      <div className="pt-2">
        <motion.button
          id="onboarding-step1-next"
          type="button"
          onClick={handleNext}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-all duration-200 shadow-xl shadow-slate-200 text-sm flex items-center justify-center gap-2"
        >
          Confirm & Continue
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}
