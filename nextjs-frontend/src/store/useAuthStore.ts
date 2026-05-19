'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getMe } from '@/lib/api';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthStore {
  user: AuthUser | null;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clearUser: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const data = await apiLogin(email, password);
          // Backend returns { token, user: { id, name, email } }
          set({ user: data.user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const data = await apiRegister(name, email, password);
          set({ user: data.user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await apiLogout();
        } catch {
          // Best-effort — clear local state regardless
        }
        set({ user: null });
      },

      fetchMe: async () => {
        try {
          const data = await getMe();
          set({ user: data.user });
        } catch {
          set({ user: null });
        }
      },

      clearUser: () => set({ user: null }),
    }),
    {
      name: 'flowshield-auth',  // localStorage key
      partialize: (state) => ({ user: state.user }), // only persist user, not isLoading
    }
  )
);
