'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ILLUSTRATIONS: Record<number, React.ReactElement> = {

  1: (
    // Step 1 — Account Setup: Abstract shield/lock with orbiting dots
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="s1bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s1shield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="100" fill="url(#s1bg)" />
      {/* Shield */}
      <path d="M120 40 L160 60 L160 115 C160 145 140 165 120 175 C100 165 80 145 80 115 L80 60 Z"
        fill="url(#s1shield)" />
      <path d="M120 60 L148 76 L148 115 C148 135 134 151 120 158 C106 151 92 135 92 115 L92 76 Z"
        fill="white" opacity="0.1" />
      {/* Lock icon inside */}
      <rect x="108" y="112" width="24" height="18" rx="3" fill="white" />
      <path d="M112 112 L112 107 C112 101.5 128 101.5 128 107 L128 112" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="120" cy="121" r="2.5" fill="#4F46E5" />
      {/* Orbiting dots */}
      <circle cx="55" cy="80" r="5" fill="#4F46E5" opacity="0.3" />
      <circle cx="185" cy="95" r="7" fill="#6366F1" opacity="0.2" />
      <circle cx="170" cy="165" r="4" fill="#4338CA" opacity="0.4" />
      <circle cx="70" cy="155" r="6" fill="#4F46E5" opacity="0.1" />
      {/* Rings */}
      <circle cx="120" cy="120" r="85" stroke="#4F46E5" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="4 6" />
      <circle cx="120" cy="120" r="60" stroke="#4F46E5" strokeOpacity="0.05" strokeWidth="1" />
    </svg>
  ),

  2: (
    // Step 2 — Work Profile: Abstract graph/network of nodes
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="s2bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="100" fill="url(#s2bg)" />
      {/* Network lines */}
      <line x1="120" y1="75" x2="165" y2="110" stroke="#4F46E5" strokeOpacity="0.2" strokeWidth="1.5" />
      <line x1="120" y1="75" x2="75" y2="110" stroke="#4F46E5" strokeOpacity="0.2" strokeWidth="1.5" />
      <line x1="165" y1="110" x2="155" y2="160" stroke="#4F46E5" strokeOpacity="0.15" strokeWidth="1.5" />
      <line x1="75" y1="110" x2="85" y2="160" stroke="#4F46E5" strokeOpacity="0.15" strokeWidth="1.5" />
      <line x1="155" y1="160" x2="120" y2="175" stroke="#4F46E5" strokeOpacity="0.2" strokeWidth="1.5" />
      <line x1="85" y1="160" x2="120" y2="175" stroke="#4F46E5" strokeOpacity="0.2" strokeWidth="1.5" />
      {/* Nodes */}
      <circle cx="120" cy="75" r="14" fill="#4F46E5" />
      <circle cx="120" cy="75" r="8" fill="white" opacity="0.2" />
      <circle cx="165" cy="110" r="11" fill="#6366F1" />
      <circle cx="75" cy="110" r="10" fill="#4338CA" />
      <circle cx="155" cy="160" r="9" fill="#818CF8" />
      <circle cx="85" cy="160" r="8" fill="#4F46E5" />
      <circle cx="120" cy="175" r="12" fill="#3730A3" />
    </svg>
  ),

  3: (
    // Step 3 — Tax Config: Receipt/document with sparkle
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="s3bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s3card" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="100" fill="url(#s3bg)" />
      {/* Document */}
      <rect x="75" y="55" width="90" height="120" rx="10" fill="url(#s3card)" />
      {/* Lines on doc */}
      <rect x="90" y="80" width="60" height="4" rx="2" fill="white" opacity="0.5" />
      <rect x="90" y="92" width="45" height="3" rx="2" fill="white" opacity="0.3" />
      <rect x="90" y="110" width="60" height="3" rx="2" fill="white" opacity="0.3" />
      <rect x="90" y="120" width="50" height="3" rx="2" fill="white" opacity="0.25" />
      {/* Percentage badge */}
      <circle cx="150" cy="155" r="22" fill="#064E3B" />
      <text x="150" y="161" textAnchor="middle" fontSize="16" fontWeight="700" fill="#34D399">%</text>
    </svg>
  ),

  4: (
    // Step 4 — Expenses & Safety: Piggy bank / savings jar
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="s4bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s4jar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="100" fill="url(#s4bg)" />
      {/* Jar body */}
      <path d="M75 100 Q72 170 120 178 Q168 170 165 100 Z" fill="url(#s4jar)" />
      {/* Jar highlight */}
      <path d="M85 105 Q83 155 100 168" stroke="white" strokeOpacity="0.2" strokeWidth="6" strokeLinecap="round" />
      {/* Jar lid */}
      <rect x="88" y="88" width="64" height="16" rx="8" fill="#B45309" />
      {/* Coins */}
      <circle cx="155" cy="75" r="12" fill="#D97706" />
      <text x="155" y="79" textAnchor="middle" fontSize="10" fontWeight="800" fill="white">₹</text>
    </svg>
  ),

  5: (
    // Step 5 — Data Import: Upload cloud / CSV rows
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="s5bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s5cloud" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0891B2" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="100" fill="url(#s5bg)" />
      {/* Cloud */}
      <path d="M85 115 Q75 115 75 105 Q75 90 90 90 Q92 78 105 78 Q115 72 125 80 Q132 70 145 75 Q160 78 160 93 Q172 95 170 110 Q170 120 158 120 Z"
        fill="url(#s5cloud)" />
      {/* Upload arrow */}
      <path d="M120 145 L120 115" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M110 123 L120 113 L130 123" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const STEP_COPY: Record<number, { heading: string; sub: string; tag: string }> = {
  1: {
    tag: 'Step 1 of 5',
    heading: 'Welcome to\nFlowShield',
    sub: 'Your AI co-pilot for freelance finances. Designed for Indian freelancers and digital nomads.',
  },
  2: {
    tag: 'Step 2 of 5',
    heading: 'Personalize\nyour profile',
    sub: 'We tailor your income forecast, budget targets, and tax estimates to your exact work style.',
  },
  3: {
    tag: 'Step 3 of 5',
    heading: 'Tax setup,\nmade simple',
    sub: 'Never be caught off-guard by a tax bill again. We calculate and remind — you focus on growth.',
  },
  4: {
    tag: 'Step 4 of 5',
    heading: 'Build your\nsafety net',
    sub: 'Income smoothing and expense buffers designed around your unique cash-flow rhythm.',
  },
  5: {
    tag: 'Step 5 of 5',
    heading: 'Import your\ndata',
    sub: 'Upload a bank statement CSV and watch AI instantly categorize, forecast, and analyse your money.',
  },
};

interface OnboardingIllustrationProps {
  step: number;
}

export default function OnboardingIllustration({ step }: OnboardingIllustrationProps) {

  const copy = STEP_COPY[step] ?? STEP_COPY[1];

  return (
    <div className="flex flex-col justify-between h-full p-10">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="12" r="7" fill="white" fillOpacity="0.9" />
            <circle cx="15" cy="12" r="7" fill="white" fillOpacity="0.6" />
          </svg>
        </div>
        <span className="text-slate-900 font-black tracking-tight text-xl">FlowShield</span>
      </div>

      {/* Illustration */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -15 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-72 h-72 mx-auto"
        >
          {ILLUSTRATIONS[step] ?? ILLUSTRATIONS[1]}
        </motion.div>
      </AnimatePresence>

      {/* Copy */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`copy-${step}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <span className="inline-block text-xs font-black text-indigo-600 tracking-[0.2em] uppercase mb-4">
            {copy.tag}
          </span>
          <h2 className="text-3xl font-black text-slate-900 leading-tight mb-4 whitespace-pre-line">
            {copy.heading}
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-[280px]">{copy.sub}</p>
        </motion.div>
      </AnimatePresence>

      {/* Trust badges */}
      <div className="flex items-center gap-4 mt-8">
        {['🔒 Secure', '🇮🇳 India-First', '⚡ AI-Driven'].map((badge) => (
          <span key={badge} className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{badge}</span>
        ))}
      </div>
    </div>
  );
}
