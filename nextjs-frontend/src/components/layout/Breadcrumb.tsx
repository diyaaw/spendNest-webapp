'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LABELS: Record<string, string> = {
  dashboard: 'Overview',
  transactions: 'Transactions',
  forecast: 'Forecast',
  ledger: 'Ledger',
  tax: 'Tax Estimator',
  health: 'Health Score',
  subscriptions: 'Subscriptions',
  'emergency-fund': 'Emergency Fund',
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean); // ['dashboard', 'transactions']

  if (segments.length <= 1) return null; // hide on root /dashboard

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label = LABELS[seg] ?? seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 px-1">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300">/</span>}
          {crumb.isLast ? (
            <span className="text-slate-700 font-semibold">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-slate-700 transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
