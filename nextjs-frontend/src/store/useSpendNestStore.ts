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

interface SpendNestStore extends LedgerState {
  data: DashboardData | null;

  // Dashboard actions
  setDashboardData: (data: DashboardData) => void;
  clearDashboardData: () => void;

  // Ledger actions
  setLedger: (rec: Recommendation) => void;
  transferToAvailable: (amount: number) => void;
  quarantineAmount: (amount: number) => void;
  resetLedger: () => void;
}

export const useSpendNestStore = create<SpendNestStore>()((set, get) => ({
  // ── Dashboard ─────────────────────────────────────────────────────────
  data: null,

  setDashboardData: (data) => {
    set({ data });
    if (data.recommendation) {
      get().setLedger(data.recommendation);
    }
  },

  clearDashboardData: () =>
    set({
      data: null,
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
      available: rec.safe_to_spend,
      quarantined: rec.reserved_funds,
      reserveRate: rec.recommended_reserve_rate,
      message: rec.message,
      currentBalance: rec.current_balance,
      predictedIncome: rec.predicted_income,
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
