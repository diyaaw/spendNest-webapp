'use client';

import { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useSpendNestStore } from '@/store/useSpendNestStore';

import { estimateTax } from '@/lib/taxEngine';

// Redesigned Components
import RedesignedKpiCard from '@/components/dashboard/redesign/RedesignedKpiCard';
import RedesignedHealthScore from '@/components/dashboard/redesign/RedesignedHealthScore';
import RedesignedSubscriptionTracker from '@/components/dashboard/redesign/RedesignedSubscriptionTracker';
import FinancialForecastChart from '@/components/dashboard/redesign/FinancialForecastChart';
import SpendingDNAChart from '@/components/dashboard/redesign/SpendingDNAChart';
import NetWorthProjection from '@/components/dashboard/redesign/NetWorthProjection';
import { 
  RedesignedProgressCard, 
  RedesignedTaxEstimator 
} from '@/components/dashboard/redesign/RedesignedFinanceTools';
import { RedesignedAiAdvisor } from '@/components/dashboard/redesign/RedesignedAiAdvisor';
import { RedesignedTransactionTable } from '@/components/dashboard/redesign/RedesignedTransactionTable';
import BudgetTracker from '@/components/dashboard/BudgetTracker';
import EmergencyFundTracker from '@/components/dashboard/EmergencyFundTracker';
import UploadZone from '@/components/dashboard/UploadZone';
import ClientOnly from '@/components/ClientOnly';

// Icons
import { 
  Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, 
  ShieldCheck, BrainCircuit, RefreshCcw, FileText, PieChart
} from 'lucide-react';

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-8 animate-pulse">
      <div className="h-12 w-48 bg-slate-200 rounded-2xl" />
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-1 h-64 bg-slate-200 rounded-[2rem]" />
        <div className="col-span-2 h-64 bg-slate-200 rounded-[2rem]" />
      </div>
      <div className="grid grid-cols-4 gap-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-[2rem]" />)}
      </div>
    </div>
  );
}

function RedesignedDashboardContent() {
  const { data, isHydrating, clearDashboardData } = useSpendNestStore();
  const [taxData, setTaxData] = useState<any>(null);

  // Compute health score synchronously from local data
  const income = data?.summary?.total_income || 0;
  const expenses = data?.summary?.total_expenses || 0;
  const localSavingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  
  let localHealthScore = 0;
  if (income > 0) {
    if (localSavingsRate >= 30) localHealthScore = 90;
    else if (localSavingsRate >= 20) localHealthScore = 75;
    else if (localSavingsRate >= 10) localHealthScore = 55;
    else if (localSavingsRate >= 0) localHealthScore = 30;
    else localHealthScore = 10;
  }

  useEffect(() => {
    if (!data) return;
    
    // Always calculate real estimate from local data as primary or fallback
    let annualIncome = data.summary?.total_income ? data.summary.total_income : 0;
    
    // If summary income is missing, try using forecast
    if (annualIncome === 0 && data.forecast?.predicted_income) {
      annualIncome = data.forecast.predicted_income * 12;
    }

    const realEstimate = estimateTax(annualIncome, 'new');
    setTaxData(realEstimate);
  }, [data?.summary?.total_income]);

  if (isHydrating) return <DashboardSkeleton />;

  if (!data) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col items-center justify-center p-8">
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 max-w-2xl"
        >
          <h1 className="text-4xl font-black tracking-tighter mb-4 text-slate-900 uppercase">
            Master <span className="text-blue-600">Your</span> Finances
          </h1>
          <p className="text-slate-500 text-lg">
            Upload your bank statement and let our AI engine decode your spending DNA.
          </p>
        </m.div>
        <div className="w-full max-w-xl">
          <UploadZone />
        </div>
      </div>
    );
  }

  const { summary, monthly, category, forecast, filename, transactions } = data;
  const cm = summary?.current_month;
  const latestBalance = summary?.latest_balance ?? 0;
  const isOverdraft = latestBalance < 0;
  const cmIncome = cm?.income ?? 0;
  const cmExpenses = cm?.expenses ?? 0;
  const cmSavings = cm?.savings ?? (cmIncome - cmExpenses);
  const savingsRate = cmIncome > 0 ? Math.round((cmSavings / cmIncome) * 100) : 0;

  /**
   * getDatasetMonthLabel — single source of truth for the month label.
   * ALWAYS reads from the backend-provided dataset label.
   * NEVER generates a label from new Date() or browser clock.
   * Fallback: "No Dataset Month" (never a system date).
   */
  const cmLabel: string = summary?.current_month?.label ?? 'No Dataset Month';

  // Deficit state: net savings negative OR safe_to_spend clamped to 0 while expenses exist
  const safeToSpend = data.recommendation?.safe_to_spend ?? 0;
  const isDeficit = safeToSpend === 0 && (latestBalance <= 0 || cmSavings < 0 || (data.recommendation?.status === 'low_balance'));

  // Suspicious balance: backend flagged balance > 1.5× total income
  const balanceSuspicious: boolean = (summary as any)?.balance_suspicious ?? false;

  // 1. Map Forecast Data
  const forecastChartPoints = [
    ...(forecast?.historical_income || []).map(h => ({ month: h.month, actual: h.income, predicted: null })),
    { 
      month: forecast?.predicted_month || 'Next', 
      actual: null, 
      predicted: forecast?.predicted_income || 0 
    }
  ];

  // 2. Map Spending DNA (Using Landing Page Colors)
  const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];
  const spendingDNAPoints = (category || []).map((c, i) => ({
    name: c.name,
    value: c.value,
    color: colors[i % colors.length]
  }));

  // 3. Net Worth Projection — cumulative savings, forward chronological order
  // Starts from 0 at the beginning of the CSV period and accumulates net savings per month.
  let cumulativeNet = 0;
  const netWorthPoints = (monthly || []).map((m) => {
    cumulativeNet += (m.income - m.expenses);
    return { month: m.month, netWorth: Math.round(cumulativeNet * 100) / 100 };
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 overflow-x-hidden">
      
      {/* ── 1. GLOBAL HEADER ───────────────────────── */}
      <header className="w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-full shadow-sm">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {summary?.total_transactions ?? 0} Transactions Analyzed
            </span>
          </div>
          {filename && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-full shadow-sm hidden md:flex">
              <FileText size={12} className="text-blue-600" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[150px]">
                {filename}
              </span>
            </div>
          )}
        </div>
        
        <button 
          onClick={clearDashboardData}
          className="group flex items-center gap-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-2xl transition-all shadow-sm"
        >
          <RefreshCcw size={14} className="text-rose-600 group-hover:rotate-180 transition-all duration-500" />
          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Reset Analysis</span>
        </button>
      </header>

      <main className="w-full max-w-7xl mx-auto px-6 space-y-6">
        
        {/* ── 2. HERO SECTION ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-2">
            <RedesignedKpiCard 
              title="Net Period Balance"
              amount={(summary?.total_income ?? 0) - (summary?.total_expenses ?? 0)}
              isOverdraft={((summary?.total_income ?? 0) - (summary?.total_expenses ?? 0)) < 0}
              subtext={
                ((summary?.total_income ?? 0) - (summary?.total_expenses ?? 0)) < 0
                  ? "Account Overdrawn"
                  : "Income − Expenses"
              }
              icon={<Wallet size={20} />}
            />
            {/* Suspicious balance warning badge */}
            {balanceSuspicious && !isOverdraft && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <span className="text-amber-500 text-sm mt-0.5 flex-shrink-0">⚠️</span>
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                  <span className="font-black uppercase tracking-wide">Unverified Balance</span><br />
                  This figure exceeds 1.5× your total income. It may include an imported opening balance, retained earnings from prior periods, or a data classification issue. Treat with caution.
                </p>
              </div>
            )}
          </div>
          <div className="lg:col-span-2">
            <RedesignedKpiCard 
              title="Safe-to-Spend"
              amount={safeToSpend}
              isHighlight
              isHero
              isDeficit={isDeficit}
              subtext={
                isDeficit
                  ? "Expenses exceed income — no surplus available"
                  : "Optimized limit after covering bills & goals"
              }
              icon={<BrainCircuit size={24} />}
              trend={isDeficit ? undefined : "up"}
              trendLabel="AI Recommendation"
            />
          </div>
        </div>

        {/* ── 3. MONTHLY PERFORMANCE ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <RedesignedKpiCard 
            title={`${cmLabel} · Income`}
            amount={cmIncome}
            icon={<ArrowUpRight size={18} className="text-emerald-500" />}
            subtext="Monthly total income"
          />
          <RedesignedKpiCard 
            title={`${cmLabel} · Expenses`}
            amount={cmExpenses}
            icon={<ArrowDownRight size={18} className="text-rose-500" />}
            subtext="Monthly total expenses"
          />
          <RedesignedKpiCard 
            title={`${cmLabel} · Savings`}
            amount={Math.abs(cmSavings)}
            isNegative={cmSavings < 0}
            trend={cmSavings >= 0 ? "up" : "down"}
            trendLabel={cmSavings >= 0 ? `${savingsRate}% saved` : "Overspending"}
            subtext={cmSavings < 0 ? "Deficit this month" : "Net cash surplus"}
          />
          <RedesignedKpiCard 
            title="AI Forecast"
            amount={forecast?.predicted_income ?? 0}
            icon={<TrendingUp size={18} className="text-blue-500" />}
            subtext={
              forecast?.is_expense_forecast
                ? "Net cash flow forecast (no income data)"
                : ((forecast as any)?.forecast_basis ?? "Predicted next month income")
            }
          />
        </div>

        {/* ── 4. ADVANCED ANALYTICS ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FinancialForecastChart data={forecastChartPoints} />
          </div>
          <div className="lg:col-span-1">
            <SpendingDNAChart data={spendingDNAPoints} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <NetWorthProjection data={netWorthPoints} />
        </div>

        {/* ── 5. FINANCIAL INTELLIGENCE GRID ─────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
             <RedesignedHealthScore score={localHealthScore} />
          </div>
          <div className="lg:col-span-1">
             <RedesignedTaxEstimator annualIncome={taxData?.annualIncome ?? 0} taxData={taxData} />
          </div>
          <div className="lg:col-span-1">
             <EmergencyFundTracker />
          </div>
          <div className="lg:col-span-1">
             <BudgetTracker categories={category} />
          </div>
        </div>

        {/* ── 6. SUBSCRIPTION & BILL TRACKER ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
             <RedesignedSubscriptionTracker />
          </div>
          <div className="lg:col-span-2 space-y-8">
             {/* ── AI Insights — real data from /api/analytics/insights ── */}
             <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-center">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">AI Insights</h3>
                <div className="space-y-5">
                  {data.insights && data.insights.length > 0 ? (
                    data.insights.slice(0, 2).map((insight: any, i: number) => (
                      <div key={i} className="flex gap-4">
                        <div className={`p-3 rounded-2xl h-fit flex-shrink-0 ${
                          insight.type === 'positive' ? 'bg-emerald-50 text-emerald-600'
                          : insight.type === 'warning' ? 'bg-rose-50 text-rose-500'
                          : 'bg-blue-50 text-blue-600'
                        }`}>
                          {insight.type === 'positive' ? <TrendingUp size={18} /> : <BrainCircuit size={18} />}
                        </div>
                        <p className="text-xs text-slate-500 font-bold leading-relaxed">
                          <span className="mr-1">{insight.icon}</span>{insight.message}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 font-bold text-center py-4 opacity-60">
                      No insights available yet.
                    </p>
                  )}
                </div>
             </div>

             {/* ── Top Spending Categories — real data from /api/analytics/categories ── */}
             <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">Top Spending</h3>
                <div className="space-y-5">
                  {category && category.length > 0 ? (() => {
                    const top = category.slice(0, 3);
                    const maxVal = top[0]?.value || 1;
                    return top.map((cat: any) => (
                      <div key={cat.name} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-400 truncate max-w-[130px]">{cat.name}</span>
                          <span className="text-slate-900 font-mono">₹{Math.round(cat.value).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, Math.round((cat.value / maxVal) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ));
                  })() : (
                    <p className="text-xs text-slate-400 font-bold text-center py-4 opacity-60">
                      No spending data yet.
                    </p>
                  )}
                </div>
             </div>
          </div>
        </div>

        {/* ── 7. TRANSACTION TABLE ──────────────────────────── */}
        <div className="w-full">
           <RedesignedTransactionTable transactions={transactions} limit={10} />
        </div>

      </main>

      {/* ── 8. PROACTIVE AI ADVISOR (FAB) ───────────────────── */}
      <RedesignedAiAdvisor />


    </div>
  );
}

export default function RedesignedDashboardPage() {
  return (
    <ClientOnly fallback={<DashboardSkeleton />}>
      <RedesignedDashboardContent />
    </ClientOnly>
  );
}
