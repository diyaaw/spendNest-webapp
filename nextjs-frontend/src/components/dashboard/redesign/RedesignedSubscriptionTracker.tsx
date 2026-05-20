'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AlertCircle, Calendar, Zap, LayoutGrid, List, Plus, CreditCard, RefreshCcw } from 'lucide-react';
import { fetchSubscriptions, detectSubscriptions } from '@/lib/api';

// Colour assigned per-index so real descriptions still get a colour
const LOGO_COLORS = [
  'bg-rose-500', 'bg-orange-500', 'bg-emerald-500',
  'bg-blue-600', 'bg-violet-500', 'bg-amber-500', 'bg-slate-700',
];

interface Sub {
  id?: string;
  description: string;
  amount: number;
  frequency: string;
  monthly_cost: number;
  yearly_cost: number;
  occurrences: number;
  last_seen?: string;
  first_seen?: string;
  is_confirmed?: boolean;
  avg_gap_days?: number;
}

export default function RedesignedSubscriptionTracker() {
  const [view, setView]           = useState<'all' | 'category'>('all');
  const [subs, setSubs]           = useState<Sub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Fetch subscriptions on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchSubscriptions()
      .then((data: any) => {
        if (cancelled) return;
        // Backend returns either an array or { subscriptions: [] }
        const list: Sub[] = Array.isArray(data) ? data : (data?.subscriptions ?? []);
        setSubs(list);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load subscriptions.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Sync button — runs ML detection and refreshes the list
  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      await detectSubscriptions();
      const data: any = await fetchSubscriptions();
      const list: Sub[] = Array.isArray(data) ? data : (data?.subscriptions ?? []);
      setSubs(list);
    } catch {
      setError('Sync failed. Make sure a bank statement is uploaded.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Derived values
  const totalMonthly = subs.reduce((acc, s) => acc + (s.monthly_cost ?? s.amount ?? 0), 0);

  // Group by frequency for category view
  const byFrequency = subs.reduce<Record<string, Sub[]>>((acc, s) => {
    const key = s.frequency ?? 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

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
            <p className="text-slate-900 text-sm font-black tracking-tight leading-none">Recurring Payments</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner">
            <button
              onClick={() => setView('all')}
              className={cn(
                'p-2 rounded-lg transition-all',
                view === 'all' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setView('category')}
              className={cn(
                'p-2 rounded-lg transition-all',
                view === 'category' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-200 disabled:opacity-50"
          >
            {isSyncing
              ? <RefreshCcw size={12} className="animate-spin" />
              : <Zap size={12} fill="currentColor" />
            }
            <span className="text-[9px] font-black uppercase tracking-widest">
              {isSyncing ? 'Syncing…' : 'Sync'}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto pr-1 scrollbar-hide space-y-3 min-h-[250px]">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center h-full py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading…</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-100 rounded-2xl">
            <AlertCircle size={14} className="text-rose-500 flex-shrink-0" />
            <p className="text-xs font-bold text-rose-600">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && subs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-10 text-center">
            <div className="p-4 bg-slate-50 rounded-2xl mb-4">
              <CreditCard size={24} className="text-slate-300" />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">No Recurring Payments Detected</p>
            <p className="text-[10px] text-slate-400 font-medium max-w-[200px] leading-relaxed">
              Upload a bank statement and press Sync to detect subscriptions.
            </p>
          </div>
        )}

        {/* Data — List view */}
        {!isLoading && !error && subs.length > 0 && (
          <AnimatePresence mode="wait">
            {view === 'all' ? (
              <m.div
                key="all-view"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                {subs.map((sub, index) => (
                  <m.div
                    key={sub.id ?? `${sub.description}-${index}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: index * 0.04 } }}
                    className="group/item bg-slate-50/50 hover:bg-white border border-slate-50 hover:border-blue-100 p-4 rounded-2xl transition-all cursor-pointer hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-white text-[9px] font-black flex-shrink-0',
                          LOGO_COLORS[index % LOGO_COLORS.length]
                        )}>
                          {sub.description?.slice(0, 1).toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-900 tracking-tight block truncate">{sub.description}</span>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest capitalize">{sub.frequency}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className="text-sm font-mono font-black text-slate-900 leading-none block">
                          ₹{(sub.monthly_cost ?? sub.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[8px] text-slate-400 font-bold">/mo</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100/50">
                      {sub.last_seen ? (
                        <span className="text-[8px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                          <Calendar size={10} className="text-blue-500" />
                          Last: {sub.last_seen}
                        </span>
                      ) : (
                        <span className="text-[8px] text-slate-400">
                          {sub.occurrences} occurrence{sub.occurrences !== 1 ? 's' : ''}
                        </span>
                      )}
                      {sub.is_confirmed && (
                        <div className="flex items-center gap-1 text-[7px] font-black px-2 py-1 rounded-full uppercase tracking-widest border bg-emerald-50 text-emerald-600 border-emerald-100">
                          Confirmed
                        </div>
                      )}
                    </div>
                  </m.div>
                ))}
              </m.div>
            ) : (
              /* Category / frequency view */
              <m.div
                key="cat-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {Object.entries(byFrequency).map(([freq, items]) => {
                  const groupTotal = items.reduce((acc, s) => acc + (s.monthly_cost ?? s.amount ?? 0), 0);
                  const pct = totalMonthly > 0 ? (groupTotal / totalMonthly) * 100 : 0;
                  return (
                    <div key={freq} className="bg-slate-50/50 border border-slate-50 p-4 rounded-2xl flex flex-col space-y-3 hover:border-blue-100 transition-all hover:bg-white hover:shadow-md">
                      <span className="text-[8px] font-black text-blue-600 uppercase tracking-[0.2em] capitalize">{freq}</span>
                      <div>
                        <span className="text-xl font-mono font-black text-slate-900 tracking-tighter leading-none block mb-0.5">
                          ₹{Math.round(groupTotal).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                          {items.length} Active · /mo equiv.
                        </span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <m.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round(pct)}%` }}
                          className="h-full bg-blue-600 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </m.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between bg-white relative z-10">
        <div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">Monthly Exposure</span>
          <p className="text-[9px] text-slate-500 font-bold opacity-60">{subs.length} recurring payment{subs.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-mono font-black text-blue-600 tracking-tighter block leading-none">
            ₹{Math.round(totalMonthly).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">/month</span>
        </div>
      </div>
    </div>
  );
}
