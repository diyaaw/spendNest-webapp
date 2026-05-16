'use client';

import { useRouter } from 'next/navigation';
import { useSpendNestStore } from '@/store/useSpendNestStore';
import { RedesignedTransactionTable } from '@/components/dashboard/redesign/RedesignedTransactionTable';
import ClientOnly from '@/components/ClientOnly';
import { LayoutGrid, Download, ReceiptText, ArrowLeft } from 'lucide-react';

function TransactionsContent() {
  const router = useRouter();
  const { data } = useSpendNestStore();

  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[calc(100vh-4rem)] bg-slate-50/50">
        <div className="text-center mb-12 max-w-md">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
             <ReceiptText size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">No History Yet</h2>
          <p className="text-slate-500 text-lg leading-relaxed font-medium">Your transaction ledger is empty. Upload a CSV to start tracking your financial journey with AI-driven insights.</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard')} 
          className="bg-slate-900 hover:bg-blue-600 text-white px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center gap-3"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>
    );
  }

  const transactions = data.allTransactions ?? (data as any).transactions ?? [];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-100">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest">
             <LayoutGrid size={10} /> Transaction Intelligence
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">Transactions</h1>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">A comprehensive, searchable record of every transaction processed by SpendNest AI, synchronized with your banking DNA.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Total Entries</span>
              <span className="text-slate-900 font-black text-xl font-mono tracking-tighter text-center">{transactions.length}</span>
           </div>
           <button className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 group">
              <Download size={18} className="group-hover:scale-110 transition-transform" />
           </button>
        </div>
      </header>

      <div className="space-y-6">
        <RedesignedTransactionTable transactions={transactions} />
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <ClientOnly fallback={<div className="p-10 h-[800px] bg-white rounded-[2.5rem] border border-slate-100 animate-pulse m-10 shadow-sm" />}>
      <TransactionsContent />
    </ClientOnly>
  );
}
