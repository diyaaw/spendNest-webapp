'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchBudgets, setBudgetCategoryLimit } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Target, Zap, AlertCircle, CheckCircle2, ChevronRight, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Budget {
  category: string;
  budgetLimit: number;
  spent: number;
  status: 'safe' | 'warning' | 'exceeded';
}

export default function BudgetTracker({ categories }: { categories: { name: string; value: number }[] }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState('');

  useEffect(() => {
    fetchBudgets().then(setBudgets).catch(() => {});
  }, []);

  const handleSetLimit = async (category: string) => {
    const limit = parseFloat(newLimit);
    if (isNaN(limit)) return;

    try {
      const res = await setBudgetCategoryLimit(category.toLowerCase(), limit);
      setBudgets(prev => {
        const index = prev.findIndex(b => b.category.toLowerCase() === category.toLowerCase());
        if (index > -1) {
          const next = [...prev];
          next[index] = res;
          return next;
        }
        return [...prev, res];
      });
      setEditingCategory(null);
      setNewLimit('');
    } catch (err) {
      console.error(err);
    }
  };

  const sortedCategories = [...categories].sort((a, b) => b.value - a.value).slice(0, 5);

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-6 md:p-8 h-full flex flex-col shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all duration-500 shadow-sm">
            <Target size={18} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-0.5 leading-none">Budget Guard</h3>
            <p className="text-slate-900 text-sm font-black tracking-tight leading-none">Controls</p>
          </div>
        </div>
        <div className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5 shadow-sm">
           <Zap size={10} fill="currentColor" className="text-emerald-500" />
           <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em]">Active</span>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-1 scrollbar-hide">
        {sortedCategories.map((cat, index) => {
          const budget = budgets.find(b => b.category.toLowerCase() === cat.name.toLowerCase());
          const spent = cat.value;
          const limit = budget?.budgetLimit || 0;
          const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
          const isWarning = pct >= 80 && pct < 100;
          const isExceeded = pct >= 100;

          return (
            <motion.div 
              key={cat.name} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0, transition: { delay: index * 0.05 } }}
              className="group/item relative"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.15em] group-hover/item:text-blue-600 transition-colors block">
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isExceeded ? (
                      <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                        Breach
                      </span>
                    ) : isWarning ? (
                      <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                        Warning
                      </span>
                    ) : (
                      <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        Safe
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-right space-y-0.5">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-sm font-black text-slate-900 font-mono tracking-tighter">₹{Math.round(spent).toLocaleString()}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">/ {limit > 0 ? limit.toLocaleString() : '---'}</span>
                  </div>
                  <button 
                    onClick={() => { setEditingCategory(cat.name); setNewLimit(limit > 0 ? String(limit) : ''); }}
                    className="text-[8px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-[0.2em] transition-all flex items-center gap-1 ml-auto"
                  >
                    <Settings2 size={8} /> Edit
                  </button>
                </div>
              </div>

              {editingCategory === cat.name ? (
                <div className="flex gap-2 mb-4 bg-slate-900 p-4 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200">
                  <input
                    type="number"
                    autoFocus
                    placeholder="Goal"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 font-black font-mono tracking-tight"
                  />
                  <button onClick={() => handleSetLimit(cat.name)} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all">OK</button>
                </div>
              ) : (
                <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct || (limit === 0 ? 0 : 3)}%` }}
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      isExceeded ? 'bg-rose-500' : 
                      isWarning ? 'bg-orange-500' : 
                      'bg-blue-600'
                    )}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <button className="w-full mt-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white hover:border-blue-200 hover:shadow-lg transition-all group">
        Manage Goals
        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
