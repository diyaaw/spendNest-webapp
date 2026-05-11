'use client';
import SubscriptionTracker from '@/components/dashboard/SubscriptionTracker';
import ClientOnly from '@/components/ClientOnly';

export default function SubscriptionsPage() {
  return (
    <ClientOnly fallback={<div className="p-10 h-96 animate-pulse bg-slate-50 rounded-3xl m-10" />}>
      <div className="max-w-4xl mx-auto py-10 px-6 space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bill &amp; Subscription Tracker</h1>
          <p className="text-slate-500 mt-1">AI detects recurring payments from your transaction history</p>
        </div>
        <SubscriptionTracker />
      </div>
    </ClientOnly>
  );
}
