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
  return <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">{children}</label>;
}

function StyledInput({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div>
      <input
        {...props}
        className={`
          w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-sm placeholder-white/20
          focus:outline-none focus:ring-2 transition-all duration-200
          ${error ? 'border-rose-500/60 focus:ring-rose-500/30' : 'border-white/10 focus:ring-indigo-500/40 focus:border-indigo-500/50 hover:border-white/20'}
        `}
      />
      {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

function StyledSelect({ children, error, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <div>
      <select
        {...props}
        className={`
          w-full bg-[#0D1526] border rounded-xl px-4 py-3 text-white text-sm
          focus:outline-none focus:ring-2 transition-all duration-200 appearance-none cursor-pointer
          ${error ? 'border-rose-500/60 focus:ring-rose-500/30' : 'border-white/10 focus:ring-indigo-500/40 focus:border-indigo-500/50 hover:border-white/20'}
        `}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
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
  const [showPassword, setShowPassword] = useState(false);

  // Auto-fill currency from country
  const handleCountryChange = (code: string) => {
    const found = COUNTRIES.find((c) => c.code === code);
    updateProfile({ country: code, currency: found?.currency ?? profile.currency });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!profile.name.trim()) e.name = 'Full name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) e.email = 'Valid email is required';
    if (!profile.country) e.country = 'Please select a country';
    if (!profile.currency) e.currency = 'Please select a currency';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-black text-white mb-1">Create your account</h1>
        <p className="text-white/40 text-sm">Start your journey to financial clarity.</p>
      </div>

      {/* Google button (UI placeholder) */}
      <button
        type="button"
        id="google-signup-btn"
        className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-white/80 text-sm font-medium transition-all duration-200 hover:border-white/20"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/25 font-medium">or with email</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-1 gap-5">
        <div>
          <FieldLabel>Full Name</FieldLabel>
          <StyledInput
            id="onboarding-name"
            type="text"
            placeholder="Priya Sharma"
            value={profile.name}
            onChange={(e) => updateProfile({ name: e.target.value })}
            error={errors.name}
          />
        </div>

        <div>
          <FieldLabel>Email Address</FieldLabel>
          <StyledInput
            id="onboarding-email"
            type="email"
            placeholder="you@example.com"
            value={profile.email}
            onChange={(e) => updateProfile({ email: e.target.value })}
            error={errors.email}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Country</FieldLabel>
            <StyledSelect
              id="onboarding-country"
              value={profile.country}
              onChange={(e) => handleCountryChange(e.target.value)}
              error={errors.country}
            >
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
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
              ))}
            </StyledSelect>
          </div>
        </div>

        {/* State / Province */}
        <div>
          <FieldLabel>State / Province <span className="text-white/25 normal-case font-normal">(optional)</span></FieldLabel>
          <StyledInput
            id="onboarding-state"
            type="text"
            placeholder="e.g. Maharashtra, California"
            value={profile.state}
            onChange={(e) => updateProfile({ state: e.target.value })}
          />
        </div>
      </div>

      {/* Note about password */}
      <p className="text-xs text-white/30 leading-relaxed">
        🔒 Your password was set during account creation. You can update it later in Settings.
      </p>

      <motion.button
        id="onboarding-step1-next"
        type="button"
        onClick={handleNext}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-900/30 text-sm"
      >
        Continue →
      </motion.button>
    </div>
  );
}
