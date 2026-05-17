'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Bell, LayoutGrid, Calendar, ShieldCheck } from 'lucide-react';

const LABELS: Record<string, string> = {
  dashboard: 'Overview',
  transactions: 'Transactions',
  subscriptions: 'Subscriptions',
  forecast: 'Predictive',
  ledger: 'Accounts',
  tax: 'Tax Intelligence',
  health: 'Financial Health',
  'emergency-fund': 'Safety Net',
};

export default function DashboardHeader() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const segments = pathname.split('/').filter(Boolean);
  const currentLabel = LABELS[segments[segments.length - 1]] || 'Overview';

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  // Use native Intl for date formatting
  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date());

  return (
    <header className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-xl border-b border-slate-100 px-10 py-5 flex items-center justify-between">
      {/* Left Section: Contextual Identity */}
      <div className="flex items-center gap-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-100">
               <ShieldCheck size={10} className="text-white fill-white" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Financial DNA</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
              Dashboard
            </h1>
            <span className="text-2xl font-light text-slate-200">/</span>
            <h1 className="text-2xl font-black text-blue-600/90 tracking-tighter leading-none">
              {currentLabel}
            </h1>
          </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-3 px-5 py-2.5 bg-slate-50/50 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-sm group">
          <Calendar size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
          <span className="text-[11px] font-bold text-slate-500">
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Right Section: Premium Actions & Identity */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <button className="relative w-11 h-11 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all group">
            <Bell size={20} className="group-hover:scale-110 transition-transform" />
            <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white shadow-sm" />
          </button>
          
          <button className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all group">
            <LayoutGrid size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>
        
        <div className="flex items-center gap-4 group cursor-pointer pl-8 border-l border-slate-100">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">
              {user?.name || 'User Account'}
            </p>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
               <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Active Node</p>
            </div>
          </div>
          <div className="relative">
             <div className="w-12 h-12 rounded-[1.25rem] bg-slate-900 border-4 border-white shadow-2xl flex items-center justify-center text-white text-xs font-black overflow-hidden group-hover:bg-blue-600 transition-all duration-300">
                {initials}
             </div>
             <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
             </div>
          </div>
        </div>
      </div>
    </header>
  );
}
