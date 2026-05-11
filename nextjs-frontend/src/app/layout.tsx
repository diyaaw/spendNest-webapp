import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | SpendNest',
    default: 'SpendNest — Smart Personal Finance',
  },
  description:
    'Upload your bank statement and get instant AI-powered insights: income forecasting, spending breakdown, and a smart dual-ledger recommendation.',
  keywords: ['personal finance', 'budget tracker', 'bank statement analyzer', 'spending insights'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>

  );
}
