'use client';

import { useEffect, useState } from 'react';
import { useSpendNestStore } from '@/store/useSpendNestStore';
import { fetchHealthScore, fetchTaxEstimate } from '@/lib/api';
import UploadZone from '@/components/dashboard/UploadZone';
import KpiCard from '@/components/dashboard/KpiCard';
import MonthlyChart from '@/components/charts/MonthlyChart';
import CategoryPieChart from '@/components/charts/CategoryPieChart';
import ForecastChart from '@/components/charts/ForecastChart';
import TransactionTable from '@/components/dashboard/TransactionTable';
import InsightsCard from '@/components/dashboard/InsightsCard';
import HealthScoreCard from '@/components/dashboard/HealthScoreCard';
import TaxEstimatorCard from '@/components/dashboard/TaxEstimatorCard';
import SubscriptionTracker from '@/components/dashboard/SubscriptionTracker';
import EmergencyFundTracker from '@/components/dashboard/EmergencyFundTracker';
import ClientOnly from '@/components/ClientOnly';


// ── Loading skeleton ───────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto animate-pulse pb-12 pt-8 px-4">
      <div className="h-10 w-1/3 bg-slate-200 rounded-xl mb-10" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-2 h-36 bg-white rounded-3xl border border-slate-100 shadow-sm" />
        <div className="h-36 bg-white rounded-3xl border border-slate-100 shadow-sm" />
        <div className="h-36 bg-white rounded-3xl border border-slate-100 shadow-sm" />
        <div className="h-36 bg-white rounded-3xl border border-slate-100 shadow-sm" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 h-96 bg-white rounded-3xl border border-slate-100 shadow-sm" />
        <div className="h-96 bg-white rounded-3xl border border-slate-100 shadow-sm" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-96 bg-white rounded-3xl border border-slate-100 shadow-sm" />
        <div className="lg:col-span-2 h-96 bg-white rounded-3xl border border-slate-100 shadow-sm" />
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

function DashboardContent() {
  const { data, isHydrating, clearDashboardData, healthScore, setHealthScore } = useSpendNestStore();
  const [taxData, setTaxData] = useState<any>(null);

  // Fetch health score and tax estimate once data is loaded
  useEffect(() => {
    if (!data) return;

    // Fetch health score from backend
    fetchHealthScore()
      .then((score) => setHealthScore(score))
      .catch(() => {});

    // Derive annual income from transaction summary for tax card
    const annualIncome = data.summary?.total_income
      ? data.summary.total_income * 12  // approximate annualised
      : 0;
    setTaxData({ annualIncome });
  }, [data]);

  // Show skeleton while hydrating from MongoDB (not the "Upload CSV" empty state)
  if (isHydrating) return <DashboardSkeleton />;

  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[calc(100vh-4rem)]">
        <div className="text-center mb-12 max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-slate-900">
            Let's analyze your finances
          </h1>
          <p className="text-slate-500">
            Upload your bank statement (CSV) to get instant clarity on your spending, savings, and future outlook.
          </p>
        </div>
        <UploadZone />
      </div>
    );
  }

  const { summary, monthly, category, forecast, recommendation, allTransactions, filename } = data;
  const monthlyData = monthly ?? [];
  const categoryData = category ?? [];
  const transactions = allTransactions ?? [];
  const annualIncome = (summary?.total_income ?? 0) * 12;

  return (
    <div className="w-full max-w-7xl mx-auto pb-16 px-6 pt-10 space-y-10">

      {/* ── 1. Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Your Financial Status</h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm text-slate-500">
              Live analysis of <span className="text-slate-900 font-bold">{summary?.total_transactions ?? 0}</span> transactions
              {filename && <> from <span className="text-blue-600 font-medium">{filename}</span></>}.
            </p>
          </div>
        </div>
        <button
          onClick={clearDashboardData}
          className="bg-white text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 px-6 py-3 rounded-2xl border border-slate-200 hover:border-slate-400 transition-all shadow-sm"
        >
          Reset Data
        </button>
      </div>

      {/* ── 2. Hero KPIs ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <KpiCard
            title="Available Balance"
            amount={summary?.latest_balance ?? 0}
            subtext="Total amount reflected in your accounts."
            size="lg"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            }
          />
        </div>
        <div className="lg:col-span-2">
          <KpiCard
            title="You Can Safely Spend"
            amount={recommendation?.safe_to_spend ?? 0}
            subtext={recommendation?.message || 'Estimated amount after covering bills and savings goals.'}
            isHighlight
            size="lg"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-100">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            }
          />
        </div>
      </div>

      {/* ── 3. Monthly KPI grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Income This Month" amount={summary?.total_income ?? 0}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>}
        />
        <KpiCard title="Expenses This Month" amount={summary?.total_expenses ?? 0}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500"><path d="m19 12-7 7-7-7"/><path d="M12 5v14"/></svg>}
        />
        <KpiCard
          title="Net Savings"
          amount={(summary?.total_income ?? 0) - (summary?.total_expenses ?? 0)}
          subtext="Your surplus for this month."
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
        />
        <KpiCard
          title="Forecasted Income"
          amount={forecast?.predicted_income ?? 0}
          subtext={`Expected in ${forecast?.predicted_month || 'next month'}.`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
        />
      </div>

      {/* ── 4. Trends & Insights ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <MonthlyChart data={monthlyData} />
        </div>
        <div className="lg:col-span-1">
          <InsightsCard summary={summary} categories={categoryData} />
        </div>
      </div>

      {/* ── 5. Health Score + Tax Estimator (NEW) ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <HealthScoreCard score={healthScore} />
        </div>
        <div className="lg:col-span-3">
          <TaxEstimatorCard annualIncome={annualIncome} />
        </div>
      </div>

      {/* ── 6. Category & Forecast ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <CategoryPieChart data={categoryData} />
        </div>
        <div className="lg:col-span-2">
          <ForecastChart forecastData={forecast} />
        </div>
      </div>

      {/* ── 7. Recent Transactions ────────────────────────────────────── */}
      <div className="pt-4">
        <TransactionTable transactions={transactions} />
      </div>

      {/* ── 8. Bill Tracker + Emergency Fund (NEW) ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <SubscriptionTracker />
        </div>
        <div className="lg:col-span-2">
          <EmergencyFundTracker />
        </div>
      </div>

    </div>

  );
}

export default function DashboardPage() {
  return (
    <ClientOnly fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </ClientOnly>
  );
}
