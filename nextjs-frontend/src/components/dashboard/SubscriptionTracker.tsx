'use client';

import { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { CURRENCY_SYMBOL } from '@/lib/utils';

const fmt = (n: number) => CURRENCY_SYMBOL + Math.round(n).toLocaleString('en-IN');
const EXPRESS = process.env.NEXT_PUBLIC_API_URL!;

const CATEGORY_META: Record<string, { icon: string; color: string; bg: string }> = {
  streaming:  { icon: '🎬', color: 'text-purple-600',  bg: 'bg-purple-50' },
  saas:       { icon: '⚡', color: 'text-blue-600',    bg: 'bg-blue-50' },
  cloud:      { icon: '☁️', color: 'text-sky-600',     bg: 'bg-sky-50' },
  utilities:  { icon: '💡', color: 'text-amber-600',   bg: 'bg-amber-50' },
  rent:       { icon: '🏠', color: 'text-orange-600',  bg: 'bg-orange-50' },
  emi:        { icon: '🏦', color: 'text-rose-600',    bg: 'bg-rose-50' },
  insurance:  { icon: '🛡️', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  fitness:    { icon: '💪', color: 'text-pink-600',    bg: 'bg-pink-50' },
  other:      { icon: '📦', color: 'text-indigo-600',  bg: 'bg-indigo-50' },
};

function daysUntil(d?: string | null) {
  if (!d) return null;
  const diff = Math.round((new Date(d).getTime() - Date.now()) / 86400000);
  return diff < 0 ? null : diff;
}

// ─── Raw shapes from both DB and ML service ───────────────────────────────────
// DB (MongoDB): { _id, merchantName, amount, frequency, category, yearlyCost, occurrenceCount, ... }
// ML (Python):  { description, amount, frequency, category, yearly_cost, occurrences, ... }
interface RawSub {
  // DB fields
  _id?:              string;
  merchantName?:     string;
  yearlyCost?:       number;
  occurrenceCount?:  number;
  confidenceScore?:  number;
  nextBillingDate?:  string;
  priceIncreased?:   boolean;
  previousAmount?:   number | null;
  isConfirmed?:      boolean;
  // ML service fields
  description?:      string;
  yearly_cost?:      number;
  monthly_cost?:     number;
  occurrences?:      number;
  avg_gap_days?:     number;
  first_seen?:       string;
  last_seen?:        string;
  is_confirmed?:     boolean;
  // Shared fields
  amount:            number;
  frequency:         string;
  category?:         string;
}

// ─── Normalized shape used internally ────────────────────────────────────────
interface Sub {
  uid:            string;   // stable unique key (no duplicate "undefined" keys)
  displayName:    string;
  amount:         number;
  frequency:      string;
  category:       string;
  yearlyCost:     number;
  occurrenceCount: number;
  nextBillingDate?: string;
  priceIncreased?: boolean;
  isConfirmed?:   boolean;
  // kept for delete
  _id?:           string;
}

function normalizeSub(raw: RawSub, index: number): Sub {
  const displayName = raw.merchantName || raw.description || `Subscription ${index + 1}`;
  const yearlyCost  = raw.yearlyCost   ?? raw.yearly_cost   ?? 0;
  const occurrenceCount = raw.occurrenceCount ?? raw.occurrences ?? 0;
  const category    = raw.category || 'other';
  const isConfirmed = raw.isConfirmed ?? raw.is_confirmed ?? false;

  // Build a stable unique key from available identifiers
  const uid = raw._id
    || `${displayName}-${raw.frequency}-${Math.round(raw.amount)}-${index}`;

  return {
    uid,
    displayName,
    amount:    raw.amount,
    frequency: raw.frequency || 'monthly',
    category,
    yearlyCost,
    occurrenceCount,
    nextBillingDate: raw.nextBillingDate || raw.last_seen,
    priceIncreased:  raw.priceIncreased ?? false,
    isConfirmed,
    _id: raw._id,
  };
}

interface SubData {
  subscriptions: RawSub[];
  totalMonthly:  number;
  totalYearly:   number;
  upcomingCount?: number;
  upcoming?:     RawSub[];
  // ML service shape
  detected?: number;
  total_monthly?: number;
  total_yearly?:  number;
}

// ─── Sub Card ─────────────────────────────────────────────────────────────────
function SubCard({ sub, onRemove }: { sub: Sub; onRemove: (uid: string, id?: string) => void }) {
  const meta    = CATEGORY_META[sub.category] ?? CATEGORY_META.other;
  const days    = daysUntil(sub.nextBillingDate);
  const urgency = days !== null && days <= 3 ? 'bg-rose-50 text-rose-600 border border-rose-100'
    : days !== null && days <= 7             ? 'bg-amber-50 text-amber-600 border border-amber-100'
    : 'bg-slate-50 text-slate-400 border border-slate-100';

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 transition-all group shadow-sm"
    >
      <div className={`w-10 h-10 ${meta.bg} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800 truncate">{sub.displayName}</p>
          {sub.priceIncreased && (
            <span className="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full font-bold border border-rose-100">↑ PRICE</span>
          )}
          {sub.isConfirmed && (
            <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold border border-emerald-100">✓ CONFIRMED</span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 capitalize mt-0.5">
          {sub.frequency}
          {sub.occurrenceCount > 0 ? ` · ${sub.occurrenceCount}× detected` : ''}
        </p>
      </div>
      {days !== null && (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${urgency}`}>In {days}d</span>
      )}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-black text-slate-900">{fmt(sub.amount)}</p>
        <p className="text-[10px] text-slate-400">{fmt(sub.yearlyCost)}/yr</p>
      </div>
      <button
        onClick={() => onRemove(sub.uid, sub._id)}
        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all ml-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </m.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SubscriptionTracker() {
  const [data, setData]           = useState<SubData | null>(null);
  const [subs, setSubs]           = useState<Sub[]>([]);
  const [loading, setLoading]     = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [alert, setAlert]         = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${EXPRESS}/api/subscriptions`, { credentials: 'include' });
      if (res.ok) {
        const json: SubData = await res.json();
        setData(json);
        // Normalize all subscriptions to stable shape with unique keys
        setSubs((json.subscriptions ?? []).map((raw, i) => normalizeSub(raw, i)));
      }
    } catch {
      // Network error — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const detect = async () => {
    setDetecting(true);
    try {
      const res    = await fetch(`${EXPRESS}/api/subscriptions/detect`, { method: 'POST', credentials: 'include' });
      const result = await res.json();
      const count  = result.detected ?? result.count ?? 0;
      setAlert(`✅ Found ${count} recurring subscription${count !== 1 ? 's' : ''}.`);
      await load();
    } catch {
      setAlert('❌ Detection failed. Upload transaction data first.');
    } finally {
      setDetecting(false);
    }
  };

  const remove = async (uid: string, id?: string) => {
    if (id) {
      await fetch(`${EXPRESS}/api/subscriptions/${id}`, { method: 'DELETE', credentials: 'include' });
    }
    // Remove from local state by uid regardless of whether DB call succeeded
    setSubs((prev) => prev.filter((s) => s.uid !== uid));
  };

  // Derive totals — support both DB and ML service response shapes
  const totalMonthly = data?.totalMonthly ?? data?.total_monthly ?? 0;
  const totalYearly  = data?.totalYearly  ?? data?.total_yearly  ?? 0;
  const upcomingCount = data?.upcomingCount ?? 0;

  const upcoming: Sub[] = (data?.upcoming ?? []).map((raw, i) => normalizeSub(raw, i));

  const categories = ['all', ...Array.from(new Set(subs.map((s) => s.category).filter(Boolean)))];
  const filtered   = activeCategory === 'all' ? subs : subs.filter((s) => s.category === activeCategory);
  const priceIncreased = subs.filter((s) => s.priceIncreased);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Bill &amp; Subscription Tracker</h3>
          <p className="text-slate-500 text-xs mt-0.5">AI-detected from your transactions</p>
        </div>
        <button
          onClick={detect}
          disabled={detecting}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-100"
        >
          {detecting
            ? <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Detecting…</>
            : <>🔍 Detect</>
          }
        </button>
      </div>

      {/* Alert banner */}
      <AnimatePresence>
        {alert && (
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-700"
          >
            <span>{alert}</span>
            <button onClick={() => setAlert(null)} className="text-indigo-400 hover:text-indigo-600 ml-4">✕</button>
          </m.div>
        )}
      </AnimatePresence>

      {/* Smart alerts */}
      <div className="space-y-2">
        {upcomingCount > 0 && (
          <div className="flex gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            <span>⚠️</span>
            <span>{upcomingCount} subscription{upcomingCount > 1 ? 's' : ''} renewing within 7 days.</span>
          </div>
        )}
        {priceIncreased.length > 0 && (
          <div className="flex gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
            <span>📈</span>
            <span>Price increase detected: {priceIncreased.map((s) => s.displayName).join(', ')}.</span>
          </div>
        )}
        {totalYearly > 50000 && (
          <div className="flex gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
            <span>💸</span>
            <span>You spend {fmt(totalYearly)} per year on subscriptions.</span>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active',   val: subs.length,          cls: 'text-slate-900' },
          { label: 'Monthly',  val: fmt(totalMonthly),    cls: 'text-rose-600' },
          { label: 'Yearly',   val: fmt(totalYearly),     cls: 'text-indigo-600' },
        ].map((k) => (
          <div key={k.label} className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
            <p className={`text-xl font-black ${k.cls}`}>{k.val}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-full capitalize transition-all ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
            >
              {cat === 'all' ? 'All' : `${CATEGORY_META[cat]?.icon ?? ''} ${cat}`}
            </button>
          ))}
        </div>
      )}

      {/* Subscription list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-slate-400 text-sm">No recurring subscriptions detected.</p>
          <p className="text-slate-300 text-xs mt-1">Upload your bank statement and click Detect to scan.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {filtered.map((sub) => (
              <SubCard key={sub.uid} sub={sub} onRemove={remove} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Upcoming renewals */}
      {upcoming.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">🔔 Upcoming Renewals</p>
          <div className="space-y-1.5">
            {upcoming.map((s) => (
              <div
                key={s.uid}
                className="flex items-center justify-between text-xs px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl"
              >
                <span className="text-slate-600">{s.displayName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-amber-700 font-bold">{fmt(s.amount)}</span>
                  {daysUntil(s.nextBillingDate) !== null && (
                    <span className="text-slate-400">in {daysUntil(s.nextBillingDate)}d</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
