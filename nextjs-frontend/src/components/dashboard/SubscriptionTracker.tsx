'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const EXPRESS = process.env.NEXT_PUBLIC_API_URL!;

const CATEGORY_META: Record<string, { icon: string; color: string; bg: string }> = {
  streaming:  { icon: '🎬', color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  saas:       { icon: '⚡', color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  cloud:      { icon: '☁️', color: 'text-sky-400',     bg: 'bg-sky-500/10' },
  utilities:  { icon: '💡', color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
  rent:       { icon: '🏠', color: 'text-orange-400',  bg: 'bg-orange-500/10' },
  emi:        { icon: '🏦', color: 'text-rose-400',    bg: 'bg-rose-500/10' },
  insurance:  { icon: '🛡️', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  fitness:    { icon: '💪', color: 'text-pink-400',    bg: 'bg-pink-500/10' },
  other:      { icon: '📦', color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
};

function daysUntil(d?: string | null) {
  if (!d) return null;
  return Math.round((new Date(d).getTime() - Date.now()) / 86400000);
}

interface Sub {
  _id: string; merchantName: string; amount: number; frequency: string;
  category: string; nextBillingDate?: string; yearlyCost: number;
  confidenceScore: number; priceIncreased?: boolean; occurrenceCount: number;
}

interface SubData { subscriptions: Sub[]; totalMonthly: number; totalYearly: number; upcomingCount: number; upcoming: Sub[]; }

function SubCard({ sub, onRemove }: { sub: Sub; onRemove: (id: string) => void }) {
  const meta = CATEGORY_META[sub.category] ?? CATEGORY_META.other;
  const days = daysUntil(sub.nextBillingDate);
  const urgency = days !== null && days <= 3 ? 'bg-rose-500/20 text-rose-400'
    : days !== null && days <= 7 ? 'bg-amber-500/20 text-amber-400'
    : 'bg-white/5 text-white/30';

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/4 hover:bg-white/7 border border-white/5 transition-all group">
      <div className={`w-10 h-10 ${meta.bg} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>{meta.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white/85 truncate">{sub.merchantName}</p>
          {sub.priceIncreased && <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full font-bold">↑ PRICE</span>}
        </div>
        <p className="text-[11px] text-white/30 capitalize mt-0.5">{sub.frequency} · {sub.occurrenceCount}× detected</p>
      </div>
      {days !== null && <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${urgency}`}>In {days}d</span>}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-black text-white">{fmt(sub.amount)}</p>
        <p className="text-[10px] text-white/25">{fmt(sub.yearlyCost)}/yr</p>
      </div>
      <button onClick={() => onRemove(sub._id)}
        className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-rose-400 transition-all ml-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}

export default function SubscriptionTracker() {
  const [data, setData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${EXPRESS}/api/subscriptions`, { credentials: 'include' });
      if (res.ok) setData(await res.json());
    } catch {/**/} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const detect = async () => {
    setDetecting(true);
    try {
      const res = await fetch(`${EXPRESS}/api/subscriptions/detect`, { method: 'POST', credentials: 'include' });
      const result = await res.json();
      setAlert(`✅ Found ${result.detected} recurring subscriptions.`);
      await load();
    } catch { setAlert('❌ Detection failed. Upload transaction data first.'); }
    finally { setDetecting(false); }
  };

  const remove = async (id: string) => {
    await fetch(`${EXPRESS}/api/subscriptions/${id}`, { method: 'DELETE', credentials: 'include' });
    setData((p) => p ? { ...p, subscriptions: p.subscriptions.filter((s) => s._id !== id) } : p);
  };

  const subs = data?.subscriptions ?? [];
  const categories = ['all', ...Array.from(new Set(subs.map((s) => s.category)))];
  const filtered = activeCategory === 'all' ? subs : subs.filter((s) => s.category === activeCategory);
  const priceIncreased = subs.filter((s) => s.priceIncreased);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-[#0d1117] rounded-3xl p-6 border border-white/5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Bill & Subscription Tracker</h3>
          <p className="text-white/25 text-xs mt-0.5">AI-detected from your transactions</p>
        </div>
        <button onClick={detect} disabled={detecting}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">
          {detecting ? <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />Detecting…</> : <>🔍 Detect</>}
        </button>
      </div>

      <AnimatePresence>
        {alert && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/60">
            <span>{alert}</span>
            <button onClick={() => setAlert(null)} className="text-white/25 hover:text-white ml-4">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart alerts */}
      <div className="space-y-2">
        {(data?.upcomingCount ?? 0) > 0 && <div className="flex gap-2 text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2"><span>⚠️</span><span>{data!.upcomingCount} subscription{data!.upcomingCount > 1 ? 's' : ''} renewing within 7 days.</span></div>}
        {priceIncreased.length > 0 && <div className="flex gap-2 text-xs text-rose-400/80 bg-rose-500/5 border border-rose-500/15 rounded-xl px-3 py-2"><span>📈</span><span>Price increase detected: {priceIncreased.map((s) => s.merchantName).join(', ')}.</span></div>}
        {(data?.totalYearly ?? 0) > 50000 && <div className="flex gap-2 text-xs text-white/50 bg-white/5 border border-white/8 rounded-xl px-3 py-2"><span>💸</span><span>You spend {fmt(data!.totalYearly)} per year on subscriptions.</span></div>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[{ label: 'Active', val: subs.length, cls: 'text-white' }, { label: 'Monthly', val: fmt(data?.totalMonthly ?? 0), cls: 'text-rose-400' }, { label: 'Yearly', val: fmt(data?.totalYearly ?? 0), cls: 'text-amber-400' }].map((k) => (
          <div key={k.label} className="bg-white/5 rounded-2xl p-3 text-center">
            <p className={`text-xl font-black ${k.cls}`}>{k.val}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-full capitalize transition-all ${activeCategory === cat ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/40 hover:text-white/70'}`}>
              {cat === 'all' ? 'All' : `${CATEGORY_META[cat]?.icon ?? ''} ${cat}`}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-white/4 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-white/30 text-sm">No subscriptions detected yet.</p>
          <p className="text-white/20 text-xs mt-1">Click Detect to scan your transactions.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {filtered.map((sub) => <SubCard key={sub._id} sub={sub} onRemove={remove} />)}
          </AnimatePresence>
        </div>
      )}

      {/* Upcoming renewals */}
      {(data?.upcoming?.length ?? 0) > 0 && (
        <div>
          <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2">🔔 Upcoming Renewals</p>
          <div className="space-y-1.5">
            {data!.upcoming.map((s) => (
              <div key={s._id} className="flex items-center justify-between text-xs px-3 py-2 bg-amber-500/8 border border-amber-500/15 rounded-xl">
                <span className="text-white/60">{s.merchantName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-amber-400 font-bold">{fmt(s.amount)}</span>
                  <span className="text-white/30">in {daysUntil(s.nextBillingDate)}d</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
