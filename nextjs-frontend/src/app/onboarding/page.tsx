'use client';

import dynamic from 'next/dynamic';

// Lazy-load the heavy wizard shell (uses Framer Motion)
const OnboardingShell = dynamic(() => import('@/components/onboarding/OnboardingShell'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function OnboardingPage() {
  return <OnboardingShell />;
}
