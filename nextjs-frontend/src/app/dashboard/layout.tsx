'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import DashboardHeader from '@/components/layout/DashboardHeader';
import MobileNav from '@/components/layout/MobileNav';
import { useAuthStore } from '@/store/useAuthStore';
import { useSpendNestStore } from '@/store/useSpendNestStore';
import { fetchDashboardData } from '@/lib/api';
import { LazyMotion, domAnimation } from 'framer-motion';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, fetchMe } = useAuthStore();
  const { setDashboardData, setHydrating } = useSpendNestStore();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // ── Step 1: Restore access token from the HttpOnly refreshToken cookie ──
      // The access token lives in memory and is lost on every page refresh.
      // We silently call /refresh-token to get a new one before making any
      // authenticated requests. This is invisible to the user.
      const EXPRESS = process.env.NEXT_PUBLIC_API_URL!;
      try {
        const refreshRes = await fetch(`${EXPRESS}/api/auth/refresh-token`, {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshRes.ok) {
          const { accessToken } = await refreshRes.json();
          if (accessToken) {
            useAuthStore.getState().setAccessToken(accessToken);
          }
        } else {
          // Refresh token expired or invalid — send to login
          if (!cancelled) router.replace('/login');
          return;
        }
      } catch {
        if (!cancelled) router.replace('/login');
        return;
      }

      // ── Step 2: Verify/restore user identity with the fresh access token ────
      if (!useAuthStore.getState().user) {
        await fetchMe();
        if (!useAuthStore.getState().user) {
          if (!cancelled) router.replace('/login');
          return;
        }
      }

      // ── Step 3: Hydrate dashboard data ──────────────────────────────────────
      if (!cancelled) setHydrating(true);
      try {
        const data = await fetchDashboardData();
        if (!cancelled && data && data.summary) {
          setDashboardData(data);
        }
      } catch {
        // Non-fatal — dashboard may have no data yet
      } finally {
        if (!cancelled) setHydrating(false);
      }

      if (!cancelled) setAuthReady(true);
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount — token restore must not re-trigger on state changes

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Hydrating Intelligence</p>
        </div>
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-20 md:pb-0">
        <DashboardHeader />
        
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>

        <MobileNav />
      </div>
    </LazyMotion>
  );
}

