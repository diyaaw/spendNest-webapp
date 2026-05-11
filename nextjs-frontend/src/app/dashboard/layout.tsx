'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store/useAuthStore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, fetchMe } = useAuthStore();

  useEffect(() => {
    // On mount: validate the cookie with the backend.
    // If the cookie is invalid/expired, fetchMe clears the user and we redirect.
    fetchMe().then(() => {
      // fetchMe resolves after setting state — re-read from store
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) {
        router.replace('/login');
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // While we haven't confirmed auth, show nothing to avoid flash of protected content
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
