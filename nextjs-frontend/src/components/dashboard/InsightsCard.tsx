'use client';

import { useMemo } from 'react';
import type { CategoryBreakdown, Summary } from '@/types';

interface Props {
  summary?: Summary;
  categories: CategoryBreakdown[];
  forecastInsights?: string[];
}

export default function InsightsCard({ summary, categories, forecastInsights = [] }: Props) {
  const insights = useMemo(() => {
    const list: any[] = [];

    // ── 1. AI Forecast Insights (PRIORITY) ──────────────────────────────────
    forecastInsights.forEach(msg => {
      list.push({
        type: 'ai',
        title: 'AI Forecast Insight',
        message: msg,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
        )
      });
    });

    if (!summary || !categories.length) return list;

    // 1. Top Spending Category
    const topCategory = categories.sort((a, b) => b.value - a.value)[0];
    if (topCategory && topCategory.value > 0) {
      list.push({
        type: 'warning',
        title: `Highest Spending: ${topCategory.name}`,
        message: `You spent $${topCategory.value.toLocaleString()} on ${topCategory.name.toLowerCase()} this month.`,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
            <path d="M12 9v4"/><path d="M12 17h.01"/><path d="m4.93 4.93 14.14 14.14"/><path d="M21 3h-6v6"/><path d="M9 21H3v-6"/>
          </svg>
        )
      });
    }

    // 2. Savings Rate
    const income = summary.total_income || 0;
    const expenses = summary.total_expenses || 0;
    if (income > 0) {
      const rate = ((income - expenses) / income) * 100;
      if (rate > 20) {
        list.push({
          type: 'success',
          title: 'Strong Savings Rate',
          message: `You saved ${Math.round(rate)}% of your income this month. That's excellent!`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          )
        });
      } else if (rate < 0) {
        list.push({
          type: 'danger',
          title: 'Spending Exceeded Income',
          message: `You spent more than you earned this month. Consider reviewing your top categories.`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )
        });
      }
    }

    // 3. Low Balance Warning
    const balance = summary.latest_balance || 0;
    if (balance > 0 && expenses > balance) {
      list.push({
        type: 'info',
        title: 'Balance Alert',
        message: 'Your current balance is lower than your monthly expenses. Ensure you have enough for upcoming bills.',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        )
      });
    }

    return list.slice(0, 3); // Top 3 insights
  }, [summary, categories]);

  if (insights.length === 0) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden h-full flex flex-col">
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-lg font-bold text-slate-900">Financial Insights</h3>
        <p className="text-xs text-slate-500 mt-0.5">Automated observations from your data</p>
      </div>
      <div className="p-6 space-y-5 flex-1 overflow-auto">
        {insights.map((insight, idx) => (
          <div key={idx} className="flex gap-4 group">
            <div className="mt-1 flex-shrink-0">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-white transition-colors duration-300">
                {insight.icon}
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors duration-300">{insight.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{insight.message}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-100 mt-auto">
        <button className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
          View all insights
        </button>
      </div>
    </div>
  );
}
