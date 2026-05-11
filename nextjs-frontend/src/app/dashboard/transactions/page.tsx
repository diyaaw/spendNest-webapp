'use client';

import { useRouter } from 'next/navigation';
import { useSpendNestStore } from '@/store/useSpendNestStore';
import TransactionTable from '@/components/dashboard/TransactionTable';
import ClientOnly from '@/components/ClientOnly';

function TransactionsContent() {
  const router = useRouter();
  const { data } = useSpendNestStore();

  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[calc(100vh-4rem)] bg-slate-50/50">
        <div className="text-center mb-12 max-w-md">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-sm">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
             </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">No History Yet</h2>
          <p className="text-slate-500 text-lg leading-relaxed">Your transaction ledger is empty. Upload a CSV to start tracking your financial journey.</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard')} 
          className="bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-[20px] font-bold transition-all shadow-xl shadow-slate-200 active:scale-95"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const transactions = data.allTransactions ?? (data as any).transactions ?? [];

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest mb-4">
             Transaction Ledger
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">Master History</h1>
          <p className="text-slate-500 text-lg mt-2">A comprehensive, searchable record of every transaction processed by SpendNest AI.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Entries</p>
              <p className="text-slate-900 font-black text-xl">{transactions.length}</p>
           </div>
        </div>
      </header>

      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <TransactionTable transactions={transactions} />
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <ClientOnly fallback={<div className="p-10 h-[800px] bg-white rounded-[32px] border border-slate-100 animate-pulse m-10" />}>
      <TransactionsContent />
    </ClientOnly>
  );
}
