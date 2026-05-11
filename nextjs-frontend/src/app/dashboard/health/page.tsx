'use client';
import { useEffect } from 'react';
import HealthScoreCard from '@/components/dashboard/HealthScoreCard';
import { useSpendNestStore } from '@/store/useSpendNestStore';
import { fetchHealthScore } from '@/lib/api';
import ClientOnly from '@/components/ClientOnly';

function HealthContent() {
  const { healthScore, setHealthScore } = useSpendNestStore();

  useEffect(() => {
    if (!healthScore) {
      fetchHealthScore().then(setHealthScore).catch(() => {});
    }
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financial Health Score</h1>
        <p className="text-slate-500 mt-1">AI-computed from your real transaction patterns</p>
      </div>
      <HealthScoreCard score={healthScore} loading={!healthScore} />
    </div>
  );
}

export default function HealthPage() {
  return <ClientOnly fallback={<div className="p-10 h-96 animate-pulse bg-slate-50 rounded-3xl m-10" />}><HealthContent /></ClientOnly>;
}
