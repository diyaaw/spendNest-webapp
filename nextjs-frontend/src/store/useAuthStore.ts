'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthStore {
  user: AuthUser | null;
  isLoading: boolean;

  // In-memory only — never persisted (security: no access token in localStorage)
  _accessToken: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clearUser: () => void;

  // Token helpers (used by api.ts)
  setAccessToken: (token: string | null) => void;
  getAccessToken: () => string | null;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      _accessToken: null,

      setAccessToken: (token) => set({ _accessToken: token }),
      getAccessToken: () => get()._accessToken,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          // Lazy import to avoid circular dep (api.ts imports from here indirectly)
          const { login: apiLogin } = await import('@/lib/api');
          const data = await apiLogin(email, password);
          // data = { accessToken, user: { id, name, email } }
          set({ user: data.user, _accessToken: data.accessToken, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const { register: apiRegister } = await import('@/lib/api');
          const data = await apiRegister(name, email, password);
          set({ user: data.user, _accessToken: data.accessToken, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          const { logout: apiLogout } = await import('@/lib/api');
          await apiLogout();
        } catch {
          // Best-effort — clear local state regardless
        }
        set({ user: null, _accessToken: null });
      },

      fetchMe: async () => {
        try {
          const { getMe } = await import('@/lib/api');
          const data = await getMe();
          set({ user: data.user });
        } catch {
          set({ user: null, _accessToken: null });
        }
      },

      clearUser: () => set({ user: null, _accessToken: null }),
    }),
    {
      name: 'flowshield-auth',
      // Only persist the user object — NEVER the access token
      partialize: (state) => ({ user: state.user }),
    }
  )
);
