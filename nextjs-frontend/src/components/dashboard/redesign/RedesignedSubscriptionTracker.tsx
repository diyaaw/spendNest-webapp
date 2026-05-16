'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Search, AlertCircle, TrendingUp, Calendar, Zap, LayoutGrid, List, Plus, CreditCard } from 'lucide-react';

interface Sub {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  alert?: string;
  logoColor?: string;
}

const MOCK_SUBS: Sub[] = [
  { id: '1', name: 'Netflix', amount: 15.99, date: '20 May 2026', category: 'Streaming', alert: 'Renewing in 3 days', logoColor: 'bg-rose-500' },
  { id: '2', name: 'AWS Cloud', amount: 42.00, date: '18 May 2026', category: 'DevOps', alert: 'Usage spike detected (+£4.00)', logoColor: 'bg-orange-500' },
  { id: '3', name: 'Spotify Premium', amount: 11.99, date: '01 Jun 2026', category: 'Music', logoColor: 'bg-emerald-500' },
  { id: '4', name: 'Claude Pro', amount: 16.50, date: '25 May 2026', category: 'AI Tools', logoColor: 'bg-slate-900' },
  { id: '5', name: 'British Gas', amount: 128.00, date: '19 May 2026', category: 'Utilities', alert: 'Settlement tomorrow', logoColor: 'bg-blue-600' },
];

export default function RedesignedSubscriptionTracker() {
  const [view, setView] = useState<'all' | 'category'>('all');
  const [isDetecting, setIsDetecting] = useState(false);

  const categories = Array.from(new Set(MOCK_SUBS.map(s => s.category)));
  const totalCommitment = MOCK_SUBS.reduce((acc, s) => acc + s.amount, 0);

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-6 md:p-8 h-full flex flex-col shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 transition-all group-hover:bg-blue-600 group-hover:text-white duration-500 shadow-sm">
            <CreditCard size={18} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-0.5 leading-none">Subscriptions</h3>
            <p className="text-slate-900 text-sm font-black tracking-tight leading-none">Commitment</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner">
            <button 
              onClick={() => setView('all')}
              className={cn(
                "p-2 rounded-lg transition-all",
                view === 'all' ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <List size={14} />
            </button>
            <button 
              onClick={() => setView('category')}
              className={cn(
                "p-2 rounded-lg transition-all",
                view === 'category' ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
          
          <button 
            onClick={() => {
              setIsDetecting(true);
              setTimeout(() => setIsDetecting(false), 2000);
            }}
            disabled={isDetecting}
            className="bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-200 disabled:opacity-50"
          >
            <Zap size={12} fill="currentColor" className={cn(isDetecting && "animate-spin")} />
            <span className="text-[9px] font-black uppercase tracking-widest">
              {isDetecting ? "..." : "Sync"}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto pr-1 scrollbar-hide space-y-3 min-h-[250px]">
        <AnimatePresence mode="wait">
          {view === 'all' ? (
            <motion.div 
              key="all-view"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-3"
            >
              {MOCK_SUBS.map((sub, index) => (
                <motion.div 
                  key={sub.id} 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                  className="group/item relative bg-slate-50/50 hover:bg-white border border-slate-50 hover:border-blue-100 p-4 rounded-2xl transition-all cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-[9px] font-black", sub.logoColor)}>
                        {sub.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-slate-900 tracking-tight block truncate">{sub.name}</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{sub.category}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-mono font-black text-slate-900 leading-none block">£{sub.amount.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100/50">
                    <span className="text-[8px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                      <Calendar size={10} className="text-blue-500" /> {sub.date}
                    </span>
                    {sub.alert && (
                      <div className={cn(
                        "flex items-center gap-1 text-[7px] font-black px-2 py-1 rounded-full uppercase tracking-widest border",
                        sub.alert.includes('spike') ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-orange-50 text-orange-600 border-orange-100"
                      )}>
                        <AlertCircle size={8} /> {sub.alert.includes('spike') ? 'Spike' : 'Alert'}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="cat-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {categories.map(cat => {
                const catTotal = MOCK_SUBS.filter(s => s.category === cat).reduce((acc, s) => acc + s.amount, 0);
                const percentage = (catTotal / totalCommitment) * 100;
                return (
                  <div key={cat} className="bg-slate-50/50 border border-slate-50 p-4 rounded-2xl flex flex-col space-y-3 hover:border-blue-100 transition-all hover:bg-white hover:shadow-md group/cat">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black text-blue-600 uppercase tracking-[0.2em]">{cat}</span>
                    </div>
                    <div>
                      <span className="text-xl font-mono font-black text-slate-900 tracking-tighter leading-none block mb-0.5">
                        £{catTotal.toFixed(0)}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                        {MOCK_SUBS.filter(s => s.category === cat).length} Active
                      </span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${percentage}%` }}
                         className="h-full bg-blue-600 rounded-full"
                       />
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary Footer */}
      <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between bg-white relative z-10">
        <div>
           <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">Monthly Exposure</span>
           <p className="text-[9px] text-slate-500 font-bold opacity-60">AI Managed</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-mono font-black text-blue-600 tracking-tighter block leading-none">
            £{totalCommitment.toLocaleString('en-GB', { minimumFractionDigits: 0 })}
          </span>
          <button className="mt-2 text-[8px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest flex items-center gap-1 ml-auto transition-colors">
             Details <Plus size={8} />
          </button>
        </div>
      </div>
    </div>
  );
}
