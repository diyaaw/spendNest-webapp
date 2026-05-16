'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSpendNestStore } from '@/store/useSpendNestStore';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  LayoutDashboard, ReceiptText, LineChart, BookOpen, 
  Calculator, HeartPulse, RefreshCw, LogOut, ShieldCheck,
  Settings, HelpCircle, ChevronDown, LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const mainMenu = [
  { href: '/dashboard', exact: true, label: 'Overview', icon: <LayoutGrid size={20} /> },
  { href: '/dashboard/transactions', label: 'Transactions', icon: <ReceiptText size={20} /> },
  { href: '/dashboard/forecast', label: 'Forecast', icon: <LineChart size={20} /> },
  { href: '/dashboard/ledger', label: 'Ledger', icon: <BookOpen size={20} /> },
];

const intelligenceMenu = [
  { href: '/dashboard/tax', label: 'Tax Estimator', icon: <Calculator size={20} /> },
  { href: '/dashboard/health', label: 'Health Score', icon: <HeartPulse size={20} /> },
  { href: '/dashboard/emergency-fund', label: 'Emergency Fund', icon: <ShieldCheck size={20} /> },
];

function NavLink({ item, pathname }: { item: any; pathname: string }) {
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 group relative",
        isActive
          ? "bg-blue-50 text-blue-600 shadow-sm"
          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
      )}
    >
      <span className={cn(
        "transition-colors",
        isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
      )}>
        {item.icon}
      </span>
      {item.label}
      {isActive && (
        <motion.div 
          layoutId="sidebar-pill"
          className="absolute inset-0 bg-blue-500/5 rounded-xl -z-10"
          initial={false}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { clearDashboardData } = useSpendNestStore();

  const handleLogout = async () => {
    clearDashboardData();
    await logout();
    router.replace('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <aside className="hidden md:flex flex-col w-72 h-screen sticky top-0 bg-white border-r border-slate-100">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-8 py-8">
        <div className="w-8 h-8 flex items-center justify-center relative">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="12" r="7" fill="currentColor" className="text-blue-600/80"/>
            <circle cx="15" cy="12" r="7" fill="currentColor" className="text-indigo-400/80"/>
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">SpendNest</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-8 overflow-y-auto scrollbar-hide">
        {/* Main Menu */}
        <div>
          <p className="px-4 mb-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Main Menu</p>
          <div className="space-y-1">
            {mainMenu.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>

        {/* Financial Intelligence */}
        <div>
          <p className="px-4 mb-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Financial Intelligence</p>
          <div className="space-y-1">
            {intelligenceMenu.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 mt-auto border-t border-slate-50">
        <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold overflow-hidden shadow-sm">
              {user?.avatar ? <img src={user.avatar} alt="" /> : initials}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 leading-none mb-1">{user?.name || 'User Account'}</span>
              <span className="text-[11px] font-medium text-slate-400">Pro Member</span>
            </div>
          </div>
          <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
        <button 
          onClick={handleLogout}
          className="mt-2 w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all group"
        >
          <LogOut size={18} className="text-slate-400 group-hover:text-rose-500" /> Logout
        </button>
      </div>
    </aside>
  );
}
