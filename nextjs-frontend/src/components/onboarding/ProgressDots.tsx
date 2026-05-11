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
                  ${isDone ? 'bg-indigo-500 text-white' : ''}
                  ${isActive ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/20' : ''}
                  ${!isDone && !isActive ? 'bg-white/10 text-white/40' : ''}
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
                    absolute -bottom-6 text-[10px] font-medium whitespace-nowrap
                    ${isActive ? 'text-indigo-400' : 'text-white/30'}
                  `}
                >
                  {labels[i]}
                </span>
              )}
            </div>

            {/* Connector line */}
            {step < total && (
              <div className="relative w-10 h-0.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full"
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
