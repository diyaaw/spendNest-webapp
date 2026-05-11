import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Started | FlowShield',
  description: 'Set up your freelancer finance profile in minutes.',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      {children}
    </div>
  );
}
