'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpendNestStore } from '@/store/useSpendNestStore';
import { fetchHealthScore, fetchTaxEstimate } from '@/lib/api';
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
  const { data, isHydrating, clearDashboardData, healthScore, setHealthScore } = useSpendNestStore();
  const [taxData, setTaxData] = useState<any>(null);

  useEffect(() => {
    if (!data) return;
    fetchHealthScore().then(setHealthScore).catch(() => {});
    
    // Always calculate real estimate from local data as primary or fallback
    let annualIncome = data.summary?.total_income ? data.summary.total_income : 0;
    
    // If summary income is missing, try using forecast
    if (annualIncome === 0 && data.forecast?.predicted_income) {
      annualIncome = data.forecast.predicted_income * 12;
    }

    const realEstimate = estimateTax(annualIncome, 'new');
    setTaxData(realEstimate);

    // Optionally override with backend if available
    fetchTaxEstimate().then(setTaxData).catch(() => {});
  }, [data, setHealthScore]);

  if (isHydrating) return <DashboardSkeleton />;

  if (!data) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col items-center justify-center p-8">
        <motion.div 
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
        </motion.div>
        <div className="w-full max-w-xl">
          <UploadZone />
        </div>
      </div>
    );
  }

  const { summary, monthly, category, forecast, filename, allTransactions } = data;
  const cm = summary?.current_month;
  const latestBalance = summary?.latest_balance ?? 0;
  const isOverdraft = latestBalance < 0;
  const cmIncome = cm?.income ?? 0;
  const cmExpenses = cm?.expenses ?? 0;
  const cmSavings = cm?.savings ?? (cmIncome - cmExpenses);
  const savingsRate = cmIncome > 0 ? Math.round((cmSavings / cmIncome) * 100) : 0;

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

  // 3. Map Net Worth Projection (Cumulative balance per month)
  let runningBalance = latestBalance;
  const netWorthPoints = [...(monthly || [])].reverse().map((m, i) => {
    const point = { month: m.month, netWorth: runningBalance };
    runningBalance -= (m.income - m.expenses);
    return point;
  }).reverse();

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
          <div className="lg:col-span-1">
            <RedesignedKpiCard 
              title="Available Balance"
              amount={latestBalance}
              isOverdraft={isOverdraft}
              subtext={isOverdraft ? "Account Overdrawn" : "Current Liquidity"}
              icon={<Wallet size={20} />}
            />
          </div>
          <div className="lg:col-span-2">
            <RedesignedKpiCard 
              title="Safe-to-Spend"
              amount={data.recommendation?.safe_to_spend ?? 0}
              isHighlight
              isHero
              subtext="Optimized limit after covering bills & goals"
              icon={<BrainCircuit size={24} />}
              trend="up"
              trendLabel="AI Recommendation"
            />
          </div>
        </div>

        {/* ── 3. MONTHLY PERFORMANCE ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <RedesignedKpiCard 
            title="Income"
            amount={cmIncome}
            icon={<ArrowUpRight size={18} className="text-emerald-500" />}
            subtext={cm?.label || "This Month"}
          />
          <RedesignedKpiCard 
            title="Expenses"
            amount={cmExpenses}
            icon={<ArrowDownRight size={18} className="text-rose-500" />}
            subtext={cm?.label || "This Month"}
          />
          <RedesignedKpiCard 
            title="Net Savings"
            amount={Math.abs(cmSavings)}
            isNegative={cmSavings < 0}
            trend={cmSavings >= 0 ? "up" : "down"}
            trendLabel={cmSavings >= 0 ? `${savingsRate}% saved` : "Overspending"}
            subtext="Cash Surplus"
          />
          <RedesignedKpiCard 
            title="AI Forecast"
            amount={forecast?.predicted_income ?? 0}
            icon={<TrendingUp size={18} className="text-blue-500" />}
            subtext="Predicted next month"
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
             <RedesignedHealthScore score={healthScore} />
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
             <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-center">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">AI Insights</h3>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 h-fit">
                      <BrainCircuit size={18} />
                    </div>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed opacity-80">
                      You've spent <span className="text-slate-900">£{(12400 / 100).toFixed(2)}</span> on Food & Drink this week. That's <span className="text-rose-500">15% higher</span> than your average.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 h-fit">
                      <TrendingUp size={18} />
                    </div>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed opacity-80">
                      Saving an additional <span className="text-slate-900">£50.00</span> this month will complete your <span className="text-emerald-600">Emergency Fund</span> 2 months earlier.
                    </p>
                  </div>
                </div>
             </div>
             
             {/* Dynamic Budget Summary */}
             <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">Budget Health</h3>
                <div className="space-y-6">
                  {['Shopping', 'Housing', 'Travel'].map((item, i) => (
                    <div key={item} className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">{item}</span>
                        <span className="text-slate-900 font-mono">£{(80 + i*5).toLocaleString()} / £100</span>
                      </div>
                      <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${80 + i*5}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>

        {/* ── 7. TRANSACTION TABLE ──────────────────────────── */}
        <div className="w-full">
           <RedesignedTransactionTable transactions={allTransactions} limit={10} />
        </div>

      </main>

      {/* ── 8. PROACTIVE AI ADVISOR (FAB) ───────────────────── */}
      <RedesignedAiAdvisor />

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
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
