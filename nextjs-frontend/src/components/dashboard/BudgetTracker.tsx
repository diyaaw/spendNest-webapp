'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchBudgets, setBudgetCategoryLimit } from '@/lib/api';
import { CURRENCY_SYMBOL } from '@/lib/utils';

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

  return (
    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Category Budgets</h3>
          <p className="text-xs text-slate-500 mt-1">Set monthly limits and track your burn rate</p>
        </div>
        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
      </div>

      <div className="space-y-6">
        {categories.map((cat) => {
          const budget = budgets.find(b => b.category.toLowerCase() === cat.name.toLowerCase());
          const spent = cat.value;
          const limit = budget?.budgetLimit || 0;
          const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
          const isWarning = pct >= 80 && pct < 100;
          const isExceeded = pct >= 100;

          return (
            <div key={cat.name} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">{cat.name}</span>
                  {isExceeded && <span className="text-[9px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded uppercase">Exceeded</span>}
                  {isWarning && <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded uppercase">Near Limit</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400">
                    {CURRENCY_SYMBOL}{Math.round(spent).toLocaleString()} / 
                    {limit > 0 ? `${CURRENCY_SYMBOL}${limit.toLocaleString()}` : ' No Limit'}
                  </span>
                  <button 
                    onClick={() => { setEditingCategory(cat.name); setNewLimit(limit > 0 ? String(limit) : ''); }}
                    className="opacity-0 group-hover:opacity-100 text-[10px] font-black text-blue-600 uppercase tracking-widest transition-all"
                  >
                    Set Limit
                  </button>
                </div>
              </div>

              {editingCategory === cat.name ? (
                <div className="flex gap-2 mb-4 animate-in fade-in slide-in-from-top-1">
                  <input
                    type="number"
                    autoFocus
                    placeholder="Enter limit..."
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button onClick={() => handleSetLimit(cat.name)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Save</button>
                  <button onClick={() => setEditingCategory(null)} className="bg-slate-100 text-slate-400 px-4 py-2 rounded-xl text-xs font-bold">Cancel</button>
                </div>
              ) : (
                <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    className={`h-full rounded-full ${
                      isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
