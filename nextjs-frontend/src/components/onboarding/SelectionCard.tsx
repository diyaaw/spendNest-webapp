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
        relative w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer
        ${selected
          ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
          : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50/50 shadow-sm'
        }
      `}
    >
      {selected && (
        <motion.div
          layoutId="card-check"
          className="absolute top-4 right-4 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}

      <div className="flex items-start gap-4">
        <div className={`
          flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl
          ${selected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-500'}
        `}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className={`font-bold text-base ${selected ? 'text-slate-900' : 'text-slate-700'}`}>
            {label}
          </p>
          {description && (
            <p className={`text-xs mt-1 leading-relaxed ${selected ? 'text-slate-600' : 'text-slate-400'}`}>
              {description}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}
