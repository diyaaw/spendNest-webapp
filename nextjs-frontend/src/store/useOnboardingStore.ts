'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { updateOnboardingProfile } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OnboardingProfile {
  // Step 1 — Account
  name: string;
  email: string;
  country: string;
  state: string;
  currency: string;

  // Step 2 — Work Profile
  freelancerType: 'solo' | 'agency' | 'part-time' | 'creator' | '';
  workCategory: 'developer' | 'designer' | 'writer' | 'marketing' | 'video' | 'consultant' | 'other' | '';
  incomeFrequency: 'weekly' | 'biweekly' | 'monthly' | 'irregular' | '';
  incomeTarget: number;
  avgMonthlyIncome: number;

  // Step 3 — Tax Config
  taxFilingStatus: 'individual' | 'sole-proprietor' | 'llp' | 'agency' | '';
  gstRegistered: boolean;
  taxBracket: number;
  autoTaxEstimation: boolean;

  // Step 4 — Expenses & Safety
  avgMonthlyExpenses: number;
  emergencyFundTarget: number;
  safetyBufferMonths: 1 | 3 | 6 | 12;
  savingsGoalPct: number;
  optimizeFor: string[];
}

interface OnboardingStore {
  currentStep: number;
  profile: OnboardingProfile;
  isSaving: boolean;

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateProfile: (data: Partial<OnboardingProfile>) => void;
  saveToBackend: (fields: Partial<OnboardingProfile & { onboardingStep: number; onboardingCompleted: boolean }>) => Promise<void>;
  reset: () => void;
}

// ── Defaults ───────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: OnboardingProfile = {
  name: '',
  email: '',
  country: 'IN',
  state: '',
  currency: 'INR',
  freelancerType: '',
  workCategory: '',
  incomeFrequency: '',
  incomeTarget: 0,
  avgMonthlyIncome: 0,
  taxFilingStatus: '',
  gstRegistered: false,
  taxBracket: 5,
  autoTaxEstimation: true,
  avgMonthlyExpenses: 0,
  emergencyFundTarget: 0,
  safetyBufferMonths: 3,
  savingsGoalPct: 20,
  optimizeFor: [],
};

// ── Store ──────────────────────────────────────────────────────────────────────

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      profile: { ...DEFAULT_PROFILE },
      isSaving: false,

      setStep: (step) => set({ currentStep: step }),

      nextStep: () =>
        set((state) => ({ currentStep: Math.min(state.currentStep + 1, 5) })),

      prevStep: () =>
        set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),

      updateProfile: (data) =>
        set((state) => ({ profile: { ...state.profile, ...data } })),

      saveToBackend: async (fields) => {
        set({ isSaving: true });
        try {
          await updateOnboardingProfile(fields);
        } finally {
          set({ isSaving: false });
        }
      },

      reset: () =>
        set({ currentStep: 1, profile: { ...DEFAULT_PROFILE }, isSaving: false }),
    }),
    {
      name: 'flowshield-onboarding',
      partialize: (state) => ({
        currentStep: state.currentStep,
        profile: state.profile,
      }),
    }
  )
);
