'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { useAuthStore } from '@/store/useAuthStore';
import { useSpendNestStore } from '@/store/useSpendNestStore';
import { fetchDashboardData } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, fetchMe } = useAuthStore();
  const { setDashboardData, setHydrating } = useSpendNestStore();
  const [authReady, setAuthReady] = useState(!!user); // skip spinner if already persisted

  useEffect(() => {
    (async () => {
      // If user is already in persisted store, skip fetchMe spinner
      if (!user) {
        await fetchMe();
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          router.replace('/login');
          return;
        }
      }

      // Hydrate dashboard from MongoDB — restores all historical user data
      setHydrating(true);
      try {
        const data = await fetchDashboardData(); // no uploadId → all user data
        if (data && data.summary) {
          setDashboardData(data);
        }
      } catch {
        // No data yet — new user, empty state is correct
      } finally {
        setHydrating(false);
      }

      setAuthReady(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show spinner only when there is no persisted user session at all
  if (!authReady && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="text-sm text-slate-400">Loading your financial data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar — persistent across all dashboard routes */}
      <Sidebar />

      {/* Main content — pb-20 prevents overlap with mobile nav */}
      <main className="flex-1 min-w-0 overflow-auto pb-20 md:pb-0">
        <div className="px-6 pt-6 md:px-0 md:pt-0">
          <Breadcrumb />
        </div>
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}
