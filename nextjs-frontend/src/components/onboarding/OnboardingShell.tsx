'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useAuthStore } from '@/store/useAuthStore';

import ProgressDots from './ProgressDots';
import StepTransition from './StepTransition';
import OnboardingIllustration from './OnboardingIllustration';
import Step1Account from './steps/Step1Account';
import Step2WorkProfile from './steps/Step2WorkProfile';
import Step3TaxConfig from './steps/Step3TaxConfig';
import Step4Expenses from './steps/Step4Expenses';
import Step5DataImport from './steps/Step5DataImport';

const STEP_LABELS = ['Account', 'Work', 'Tax', 'Safety', 'Import'];

export default function OnboardingShell() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentStep, setStep, nextStep, prevStep, updateProfile, saveToBackend, profile } = useOnboardingStore();
  const [direction, setDirection] = useState<1 | -1>(1);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  // Pre-fill name/email from auth store on mount
  useEffect(() => {
    if (user) {
      updateProfile({ name: user.name, email: user.email });
    }
  }, [user]);

  const isIndian = profile.country === 'IN';

  const goNext = async () => {
    setDirection(1);
    // Save progress to backend silently on each step advance
    try {
      await saveToBackend({ ...profile, onboardingStep: currentStep });
    } catch {
      // Non-blocking — user can still advance
    }
    nextStep();
  };

  const goBack = () => {
    setDirection(-1);
    prevStep();
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      setDirection(-1);
      setStep(step);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-stretch">
      {/* ── Left panel — illustration ──────────────────────────── */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 relative overflow-hidden">
        {/* Background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          }}
        />
        {/* Subtle noise overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
        />
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/6 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col w-full h-full">
          <OnboardingIllustration step={currentStep} />
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="12" r="7" fill="#818CF8" fillOpacity="0.8" />
              <circle cx="15" cy="12" r="7" fill="#93C5FD" fillOpacity="0.7" />
            </svg>
            <span className="text-white font-bold text-base">FlowShield</span>
          </div>
          <div className="hidden lg:block" />

          {/* Progress dots — desktop */}
          <div className="hidden md:flex items-center gap-1">
            <ProgressDots
              total={5}
              current={currentStep}
              labels={STEP_LABELS}
            />
          </div>

          {/* Step counter — mobile */}
          <div className="md:hidden text-xs text-white/40 font-medium">
            Step {currentStep} of 5
          </div>

          {/* Exit */}
          <button
            type="button"
            onClick={() => router.replace('/dashboard')}

            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Exit setup
          </button>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-start justify-center p-6 md:p-10 overflow-y-auto">
          <div className="w-full max-w-[560px]">
            {/* Mobile progress */}
            <div className="md:hidden mb-8">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-indigo-400">{STEP_LABELS[currentStep - 1]}</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
                  animate={{ width: `${(currentStep / 5) * 100}%` }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
              </div>
            </div>

            {/* Step form with animated transition */}
            <StepTransition stepKey={currentStep} direction={direction}>
              {currentStep === 1 && <Step1Account onNext={goNext} />}
              {currentStep === 2 && <Step2WorkProfile onNext={goNext} onBack={goBack} />}
              {currentStep === 3 && <Step3TaxConfig onNext={goNext} onBack={goBack} isIndian={isIndian} />}
              {currentStep === 4 && <Step4Expenses onNext={goNext} onBack={goBack} />}
              {currentStep === 5 && <Step5DataImport onBack={goBack} />}
            </StepTransition>
          </div>
        </div>

        {/* Bottom footer */}
        <div className="px-8 py-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-[11px] text-white/20">
            © {new Date().getFullYear()} FlowShield · All rights reserved
          </p>
          <p className="text-[11px] text-white/20">
            🔒 256-bit encrypted · SOC 2 compliant
          </p>
        </div>
      </div>
    </div>
  );
}
