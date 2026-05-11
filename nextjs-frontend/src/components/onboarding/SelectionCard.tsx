'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SelectionCardProps {
  icon: ReactNode;
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  id?: string;
}

export default function SelectionCard({
  icon, label, description, selected, onClick, id,
}: SelectionCardProps) {
  return (
    <motion.button
      id={id}
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer
        ${selected
          ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.4)]'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
        }
      `}
    >
      {selected && (
        <motion.div
          layoutId="card-check"
          className="absolute top-3 right-3 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}

      <div className="flex items-start gap-3">
        <div className={`
          flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl
          ${selected ? 'bg-indigo-500/20' : 'bg-white/10'}
        `}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className={`font-semibold text-sm ${selected ? 'text-white' : 'text-white/80'}`}>
            {label}
          </p>
          {description && (
            <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    </motion.button>
  );
}
