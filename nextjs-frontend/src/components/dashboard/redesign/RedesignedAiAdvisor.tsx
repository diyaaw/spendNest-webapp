'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Sparkles, Send, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RedesignedAiAdvisor() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-24 right-0 w-[380px] bg-white border border-slate-100 rounded-[2.5rem] shadow-[0_20px_60px_rgba(37,99,235,0.15)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 bg-blue-600 border-b border-blue-700/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-xl text-white">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="font-black text-white tracking-tight uppercase text-sm">Financial AI</h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-all">
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-blue-100 font-medium leading-relaxed">
                Proactive intelligence derived from your spending DNA.
              </p>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-8 space-y-6 max-h-[350px] overflow-auto scrollbar-hide">
              <div className="bg-slate-50 p-5 rounded-2xl rounded-tl-none border border-slate-100 text-xs text-slate-600 font-bold leading-relaxed shadow-sm">
                Hi! I noticed your **Utility bills** are 25% higher this month. Should we review your recurring subscriptions?
              </div>
              
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actionable Intelligence</p>
                <div className="flex flex-wrap gap-2">
                  {["Analyze Trends", "Tax Strategy", "Budget Goals"].map(chip => (
                    <button key={chip} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:shadow-md transition-all flex items-center gap-2">
                      {chip} <ArrowRight size={10} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Ask about your finances..."
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-all shadow-sm font-bold"
                />
                <button className="absolute right-2 top-2 p-3 bg-blue-600 text-white rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-blue-200">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05, y: -4 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-6 rounded-[2rem] shadow-2xl transition-all duration-500",
          isOpen ? "bg-slate-900 text-white" : "bg-blue-600 text-white shadow-blue-200"
        )}
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
        </motion.div>
        
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-white shadow-sm"></span>
          </span>
        )}
      </motion.button>
    </div>
  );
}
