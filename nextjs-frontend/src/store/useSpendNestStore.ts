'use client';

import { create } from 'zustand';
import type { DashboardData, Recommendation } from '@/types';

interface LedgerState {
  available: number;
  quarantined: number;
  reserveRate: number;
  message: string;
  currentBalance: number;
  predictedIncome: number;
}

interface HealthScore {
  overall: number;
  savingsScore: number;
  spendingScore: number;
  emergencyScore: number;
  taxScore: number;
  incomeScore: number;
  label: string;
  recommendations: string[];
}

interface SpendNestStore extends LedgerState {
  data: DashboardData | null;
  isHydrating: boolean;
  healthScore: HealthScore | null;

  // Dashboard actions
  setDashboardData: (data: DashboardData) => void;
  clearDashboardData: () => void;
  setHydrating: (v: boolean) => void;
  setHealthScore: (score: HealthScore) => void;

  // Ledger actions
  setLedger: (rec: Recommendation) => void;
  transferToAvailable: (amount: number) => void;
  quarantineAmount: (amount: number) => void;
  resetLedger: () => void;
}

export const useSpendNestStore = create<SpendNestStore>()((set, get) => ({
  // ── Dashboard ─────────────────────────────────────────────────────────
  data: null,
  isHydrating: false,
  healthScore: null,

  setHydrating: (v) => set({ isHydrating: v }),

  setHealthScore: (score) => set({ healthScore: score }),

  setDashboardData: (data) => {
    set({ data });
    if (data.recommendation) {
      get().setLedger(data.recommendation);
    }
  },

  clearDashboardData: () =>
    set({
      data: null,
      healthScore: null,
      available: 0,
      quarantined: 0,
      message: '',
      currentBalance: 0,
      predictedIncome: 0,
    }),

  // ── Ledger ─────────────────────────────────────────────────────────────
  available: 0,
  quarantined: 0,
  reserveRate: 0.1,
  message: '',
  currentBalance: 0,
  predictedIncome: 0,

  setLedger: (rec) =>
    set({
      available: rec.safe_to_spend ?? 0,
      quarantined: rec.reserved_funds ?? 0,
      reserveRate: rec.recommended_reserve_rate ?? 0.1,
      message: rec.message ?? '',
      currentBalance: rec.current_balance ?? 0,
      predictedIncome: rec.predicted_income ?? 0,
    }),

  transferToAvailable: (amount) =>
    set((state) => ({
      quarantined: Math.max(0, state.quarantined - amount),
      available: state.available + amount,
    })),

  quarantineAmount: (amount) =>
    set((state) => ({
      available: Math.max(0, state.available - amount),
      quarantined: state.quarantined + amount,
    })),

  resetLedger: () =>
    set({
      available: 0,
      quarantined: 0,
      reserveRate: 0.1,
      message: '',
      currentBalance: 0,
      predictedIncome: 0,
    }),
}));
