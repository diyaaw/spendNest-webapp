'use client';
import TaxEstimatorCard from '@/components/dashboard/TaxEstimatorCard';
import { useSpendNestStore } from '@/store/useSpendNestStore';
import ClientOnly from '@/components/ClientOnly';

function TaxContent() {
  const { data } = useSpendNestStore();
  const annualIncome = (data?.summary?.total_income ?? 0) * 12;
  return (
    <div className="max-w-4xl mx-auto py-10 px-6 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tax Estimator</h1>
        <p className="text-slate-500 mt-1">FY 2024-25 · Indian Freelancer · Old &amp; New Regime comparison</p>
      </div>
      <TaxEstimatorCard annualIncome={annualIncome} />
    </div>
  );
}

export default function TaxPage() {
  return <ClientOnly fallback={<div className="p-10 h-96 animate-pulse bg-slate-50 rounded-3xl m-10" />}><TaxContent /></ClientOnly>;
}
