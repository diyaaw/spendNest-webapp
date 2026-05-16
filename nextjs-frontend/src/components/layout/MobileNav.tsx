'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, ReceiptText, Calculator, 
  CreditCard, HeartPulse 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNav = [
  { href: '/dashboard', exact: true, label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'History', icon: ReceiptText },
  { href: '/dashboard/tax', label: 'Tax', icon: Calculator },
  { href: '/dashboard/subscriptions', label: 'Bills', icon: CreditCard },
  { href: '/dashboard/health', label: 'Health', icon: HeartPulse },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-6 left-4 right-4 z-50 bg-[#12161C]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-stretch h-16">
        {mobileNav.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 transition-all relative",
                isActive ? "text-[#2DD4BF]" : "text-slate-500"
              )}
            >
              <Icon size={18} className={cn(isActive ? "scale-110" : "")} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-[#2DD4BF] rounded-full shadow-[0_0_10px_#2DD4BF]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
