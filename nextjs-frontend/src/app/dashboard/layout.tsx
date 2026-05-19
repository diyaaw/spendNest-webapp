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
  const [authReady, setAuthReady] = useState(!!user);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!user) {
        await fetchMe();
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          if (!cancelled) router.replace('/login');
          return;
        }
      }

      if (!cancelled) setHydrating(true);
      try {
        const data = await fetchDashboardData();
        if (!cancelled && data && data.summary) {
          setDashboardData(data);
        }
      } catch {
        // Fallback or ignore
      } finally {
        if (!cancelled) setHydrating(false);
      }

      if (!cancelled) setAuthReady(true);
    })();

    return () => { cancelled = true; };
  }, [user, fetchMe, router, setHydrating, setDashboardData]);

  if (!authReady && !user) {
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

