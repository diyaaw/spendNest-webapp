'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ILLUSTRATIONS: Record<number, React.ReactElement> = {

  1: (
    // Step 1 — Account Setup: Abstract shield/lock with orbiting dots
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="s1bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s1shield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="100" fill="url(#s1bg)" />
      {/* Shield */}
      <path d="M120 40 L160 60 L160 115 C160 145 140 165 120 175 C100 165 80 145 80 115 L80 60 Z"
        fill="url(#s1shield)" opacity="0.9" />
      <path d="M120 60 L148 76 L148 115 C148 135 134 151 120 158 C106 151 92 135 92 115 L92 76 Z"
        fill="white" opacity="0.1" />
      {/* Lock icon inside */}
      <rect x="108" y="112" width="24" height="18" rx="3" fill="white" opacity="0.9" />
      <path d="M112 112 L112 107 C112 101.5 128 101.5 128 107 L128 112" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <circle cx="120" cy="121" r="2.5" fill="#4F46E5" />
      {/* Orbiting dots */}
      <circle cx="55" cy="80" r="5" fill="#818CF8" opacity="0.6" />
      <circle cx="185" cy="95" r="7" fill="#A5B4FC" opacity="0.5" />
      <circle cx="170" cy="165" r="4" fill="#6366F1" opacity="0.7" />
      <circle cx="70" cy="155" r="6" fill="#818CF8" opacity="0.4" />
      <circle cx="145" cy="45" r="3" fill="#C7D2FE" opacity="0.8" />
      {/* Rings */}
      <circle cx="120" cy="120" r="85" stroke="#6366F1" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="4 6" />
      <circle cx="120" cy="120" r="60" stroke="#818CF8" strokeOpacity="0.08" strokeWidth="1" />
    </svg>
  ),

  2: (
    // Step 2 — Work Profile: Abstract graph/network of nodes
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="s2bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="100" fill="url(#s2bg)" />
      {/* Network lines */}
      <line x1="120" y1="75" x2="165" y2="110" stroke="#7C3AED" strokeOpacity="0.4" strokeWidth="1.5" />
      <line x1="120" y1="75" x2="75" y2="110" stroke="#7C3AED" strokeOpacity="0.4" strokeWidth="1.5" />
      <line x1="165" y1="110" x2="155" y2="160" stroke="#7C3AED" strokeOpacity="0.3" strokeWidth="1.5" />
      <line x1="75" y1="110" x2="85" y2="160" stroke="#7C3AED" strokeOpacity="0.3" strokeWidth="1.5" />
      <line x1="155" y1="160" x2="120" y2="175" stroke="#7C3AED" strokeOpacity="0.35" strokeWidth="1.5" />
      <line x1="85" y1="160" x2="120" y2="175" stroke="#7C3AED" strokeOpacity="0.35" strokeWidth="1.5" />
      <line x1="165" y1="110" x2="85" y2="160" stroke="#A78BFA" strokeOpacity="0.15" strokeWidth="1" />
      {/* Nodes */}
      <circle cx="120" cy="75" r="14" fill="#7C3AED" opacity="0.9" />
      <circle cx="120" cy="75" r="8" fill="white" opacity="0.2" />
      <circle cx="165" cy="110" r="11" fill="#8B5CF6" opacity="0.85" />
      <circle cx="75" cy="110" r="10" fill="#9333EA" opacity="0.8" />
      <circle cx="155" cy="160" r="9" fill="#A78BFA" opacity="0.75" />
      <circle cx="85" cy="160" r="8" fill="#7C3AED" opacity="0.7" />
      <circle cx="120" cy="175" r="12" fill="#6D28D9" opacity="0.9" />
      {/* Mini bar chart bottom-right */}
      <rect x="170" y="50" width="8" height="20" rx="2" fill="#A78BFA" opacity="0.6" />
      <rect x="182" y="40" width="8" height="30" rx="2" fill="#8B5CF6" opacity="0.7" />
      <rect x="194" y="55" width="8" height="15" rx="2" fill="#7C3AED" opacity="0.6" />
    </svg>
  ),

  3: (
    // Step 3 — Tax Config: Receipt/document with sparkle
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="s3bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s3card" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#047857" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="100" fill="url(#s3bg)" />
      {/* Document */}
      <rect x="75" y="55" width="90" height="120" rx="10" fill="url(#s3card)" />
      <rect x="75" y="55" width="90" height="120" rx="10" stroke="#34D399" strokeOpacity="0.3" strokeWidth="1" />
      {/* Lines on doc */}
      <rect x="90" y="80" width="60" height="4" rx="2" fill="white" opacity="0.5" />
      <rect x="90" y="92" width="45" height="3" rx="2" fill="white" opacity="0.3" />
      <rect x="90" y="110" width="60" height="3" rx="2" fill="white" opacity="0.3" />
      <rect x="90" y="120" width="50" height="3" rx="2" fill="white" opacity="0.25" />
      <rect x="90" y="130" width="55" height="3" rx="2" fill="white" opacity="0.25" />
      {/* Percentage badge */}
      <circle cx="150" cy="155" r="22" fill="#064E3B" />
      <circle cx="150" cy="155" r="22" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.5" />
      <text x="150" y="161" textAnchor="middle" fontSize="16" fontWeight="700" fill="#34D399">%</text>
      {/* Sparkles */}
      <circle cx="65" cy="65" r="4" fill="#34D399" opacity="0.7" />
      <circle cx="185" cy="75" r="3" fill="#6EE7B7" opacity="0.6" />
      <circle cx="180" cy="170" r="5" fill="#10B981" opacity="0.5" />
      <path d="M58 120 L62 128 L70 124 L62 120 Z" fill="#34D399" opacity="0.4" />
    </svg>
  ),

  4: (
    // Step 4 — Expenses & Safety: Piggy bank / savings jar
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="s4bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s4jar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#D97706" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="100" fill="url(#s4bg)" />
      {/* Jar body */}
      <ellipse cx="120" cy="165" rx="50" ry="18" fill="#92400E" opacity="0.3" />
      <path d="M75 100 Q72 170 120 178 Q168 170 165 100 Z" fill="url(#s4jar)" />
      {/* Jar highlight */}
      <path d="M85 105 Q83 155 100 168" stroke="white" strokeOpacity="0.2" strokeWidth="6" strokeLinecap="round" />
      {/* Jar lid */}
      <rect x="88" y="88" width="64" height="16" rx="8" fill="#D97706" opacity="0.9" />
      <rect x="100" y="82" width="40" height="10" rx="5" fill="#F59E0B" opacity="0.8" />
      {/* Coin slot */}
      <rect x="113" y="85" width="14" height="3" rx="1.5" fill="#1C1917" opacity="0.5" />
      {/* Fill level */}
      <path d="M76 138 Q78 152 120 156 Q162 152 164 138 Z" fill="#FCD34D" opacity="0.3" />
      {/* Coins */}
      <circle cx="155" cy="75" r="12" fill="#FBBF24" opacity="0.9" />
      <circle cx="155" cy="75" r="8" fill="#F59E0B" />
      <text x="155" y="79" textAnchor="middle" fontSize="10" fontWeight="800" fill="#92400E">₹</text>
      <circle cx="78" cy="72" r="9" fill="#FBBF24" opacity="0.7" />
      <text x="78" y="76" textAnchor="middle" fontSize="8" fontWeight="800" fill="#92400E">₹</text>
      {/* Sparkles */}
      <circle cx="172" cy="130" r="4" fill="#FCD34D" opacity="0.6" />
      <circle cx="60" cy="140" r="3" fill="#F59E0B" opacity="0.5" />
    </svg>
  ),

  5: (
    // Step 5 — Data Import: Upload cloud / CSV rows
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="s5bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s5cloud" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0891B2" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#0E7490" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="100" fill="url(#s5bg)" />
      {/* Cloud */}
      <path d="M85 115 Q75 115 75 105 Q75 90 90 90 Q92 78 105 78 Q115 72 125 80 Q132 70 145 75 Q160 78 160 93 Q172 95 170 110 Q170 120 158 120 Z"
        fill="url(#s5cloud)" />
      {/* Upload arrow */}
      <path d="M120 145 L120 115" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M110 123 L120 113 L130 123" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* CSV rows */}
      <rect x="72" y="155" width="96" height="6" rx="3" fill="#22D3EE" opacity="0.5" />
      <rect x="72" y="165" width="75" height="5" rx="2.5" fill="#67E8F9" opacity="0.35" />
      <rect x="72" y="174" width="85" height="5" rx="2.5" fill="#A5F3FC" opacity="0.3" />
      {/* Grid lines on CSV */}
      <line x1="104" y1="155" x2="104" y2="179" stroke="#0E7490" strokeOpacity="0.3" strokeWidth="1" />
      <line x1="135" y1="155" x2="135" y2="179" stroke="#0E7490" strokeOpacity="0.3" strokeWidth="1" />
      {/* Sparkles */}
      <circle cx="62" cy="95" r="5" fill="#22D3EE" opacity="0.6" />
      <circle cx="185" cy="110" r="4" fill="#67E8F9" opacity="0.5" />
      <circle cx="170" cy="170" r="6" fill="#06B6D4" opacity="0.4" />
      <path d="M58 140 L62 148 L70 144 L62 140 Z" fill="#22D3EE" opacity="0.4" />
    </svg>
  ),
};

const STEP_COPY: Record<number, { heading: string; sub: string; tag: string }> = {
  1: {
    tag: 'Step 1 of 5',
    heading: 'Welcome to\nFlowShield',
    sub: 'Your AI co-pilot for freelance finances. Takes 3 minutes, saves hours of stress.',
  },
  2: {
    tag: 'Step 2 of 5',
    heading: 'Tell us about\nyour work',
    sub: 'We personalise your income forecast, budget targets, and tax estimates to your exact work style.',
  },
  3: {
    tag: 'Step 3 of 5',
    heading: 'Tax setup,\nmade simple',
    sub: 'Never be caught off-guard by a tax bill again. We calculate and remind — you focus on work.',
  },
  4: {
    tag: 'Step 4 of 5',
    heading: 'Build your\nsafety net',
    sub: 'Income smoothing and expense buffers designed around your unique cash-flow rhythm.',
  },
  5: {
    tag: 'Step 5 of 5',
    heading: 'Import your\nfinancial data',
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
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="12" r="7" fill="currentColor" className="text-indigo-400/80" />
            <circle cx="15" cy="12" r="7" fill="currentColor" className="text-blue-300/70" />
          </svg>
        </div>
        <span className="text-white font-bold tracking-tight text-lg">FlowShield</span>
      </div>

      {/* Illustration */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -12 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-64 h-64 mx-auto"
        >
          {ILLUSTRATIONS[step] ?? ILLUSTRATIONS[1]}
        </motion.div>
      </AnimatePresence>

      {/* Copy */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`copy-${step}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <span className="inline-block text-xs font-semibold text-indigo-400 tracking-widest uppercase mb-3">
            {copy.tag}
          </span>
          <h2 className="text-2xl font-black text-white leading-tight mb-3 whitespace-pre-line">
            {copy.heading}
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">{copy.sub}</p>
        </motion.div>
      </AnimatePresence>

      {/* Trust badges */}
      <div className="flex items-center gap-4 mt-6">
        {['🔒 Bank-grade encryption', '🇮🇳 India-first tax engine', '⚡ AI-powered'].map((badge) => (
          <span key={badge} className="text-[10px] text-white/30 font-medium">{badge}</span>
        ))}
      </div>
    </div>
  );
}
