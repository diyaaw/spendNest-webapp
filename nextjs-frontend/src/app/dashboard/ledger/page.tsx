'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpendNestStore } from '@/store/useSpendNestStore';
import ClientOnly from '@/components/ClientOnly';

function LedgerContent() {
  const router = useRouter();
  const { data, available, quarantined, message, transferToAvailable, quarantineAmount } = useSpendNestStore();
  const [transferAmt, setTransferAmt] = useState('');
  const [quarantineAmt, setQuarantineAmt] = useState('');

  if (!data) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No Ledger Data</h2>
          <p className="text-slate-500">Upload a bank statement to initialize your ledger.</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">Go to Overview</button>
      </div>
    );
  }

  const handleTransfer = () => {
    const a = parseFloat(transferAmt);
    if (!isNaN(a) && a > 0 && a <= quarantined) { transferToAvailable(a); setTransferAmt(''); }
  };
  const handleQuarantine = () => {
    const a = parseFloat(quarantineAmt);
    if (!isNaN(a) && a > 0 && a <= available) { quarantineAmount(a); setQuarantineAmt(''); }
  };

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dual Ledger</h1>
        <p className="text-slate-500 mt-1">Manage your available and reserved funds dynamically.</p>
      </header>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-2xl text-sm font-medium">
          💡 {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Available */}
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Available to Spend</h3>
          <p className="text-slate-500 text-sm mb-6">Funds that are safe to use for daily expenses.</p>
          <div className="text-4xl font-black text-emerald-600 tracking-tight mb-8">{fmt(available)}</div>
          <div className="mt-auto space-y-3 pt-6 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Move to Quarantined</label>
            <div className="flex gap-3">
              <input type="number" placeholder="Amount" value={quarantineAmt} onChange={(e) => setQuarantineAmt(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 transition-colors" />
              <button onClick={handleQuarantine} disabled={!quarantineAmt || parseFloat(quarantineAmt) <= 0 || parseFloat(quarantineAmt) > available}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                Move
              </button>
            </div>
          </div>
        </div>

        {/* Quarantined */}
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Quarantined (Reserved)</h3>
          <p className="text-slate-500 text-sm mb-6">Funds reserved for safety and large future expenses.</p>
          <div className="text-4xl font-black text-amber-600 tracking-tight mb-8">{fmt(quarantined)}</div>
          <div className="mt-auto space-y-3 pt-6 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Release to Available</label>
            <div className="flex gap-3">
              <input type="number" placeholder="Amount" value={transferAmt} onChange={(e) => setTransferAmt(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 transition-colors" />
              <button onClick={handleTransfer} disabled={!transferAmt || parseFloat(transferAmt) <= 0 || parseFloat(transferAmt) > quarantined}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                Release
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LedgerPage() {
  return <ClientOnly fallback={<div className="p-8 h-[400px] bg-white rounded-3xl border border-slate-100 animate-pulse" />}><LedgerContent /></ClientOnly>;
}
