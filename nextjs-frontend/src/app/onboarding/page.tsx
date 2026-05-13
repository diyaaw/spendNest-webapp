'use client';

import dynamic from 'next/dynamic';

// Lazy-load the heavy wizard shell (uses Framer Motion)
const OnboardingShell = dynamic(() => import('@/components/onboarding/OnboardingShell'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function OnboardingPage() {
  return <OnboardingShell />;
}
