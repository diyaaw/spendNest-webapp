'use client';

import { motion } from 'framer-motion';

interface ProgressDotsProps {
  total: number;
  current: number; // 1-based
  labels?: string[];
}

export default function ProgressDots({ total, current, labels }: ProgressDotsProps) {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isDone = step < current;
        const isActive = step === current;

        return (
          <div key={step} className="flex items-center gap-3">
            <div className="relative flex flex-col items-center">
              <motion.div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  transition-colors duration-300
                  ${isDone ? 'bg-indigo-600 text-white' : ''}
                  ${isActive ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/10' : ''}
                  ${!isDone && !isActive ? 'bg-slate-100 text-slate-400 border border-slate-200' : ''}
                `}
                animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              >
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </motion.div>
              {labels && (
                <span
                  className={`
                    absolute -bottom-6 text-[10px] font-black uppercase tracking-widest
                    ${isActive ? 'text-indigo-600' : 'text-slate-300'}
                  `}
                >
                  {labels[i]}
                </span>
              )}
            </div>

            {/* Connector line */}
            {step < total && (
              <div className="relative w-10 h-0.5 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-indigo-600 rounded-full"
                  animate={{ width: isDone ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
