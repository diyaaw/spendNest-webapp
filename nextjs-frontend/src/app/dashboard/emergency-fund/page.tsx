'use client';
import EmergencyFundTracker from '@/components/dashboard/EmergencyFundTracker';
import ClientOnly from '@/components/ClientOnly';

export default function EmergencyFundPage() {
  return (
    <ClientOnly fallback={<div className="p-10 h-96 animate-pulse bg-slate-50 rounded-3xl m-10" />}>
      <div className="max-w-2xl mx-auto py-10 px-6 space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Emergency Fund Tracker</h1>
          <p className="text-slate-500 mt-1">Know exactly how long you can survive without income</p>
        </div>
        <EmergencyFundTracker />
      </div>
    </ClientOnly>
  );
}
