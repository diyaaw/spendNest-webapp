'use client';

import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface KpiProps {
  title: string;
  amount: number;
  icon?: any;
  trend?: 'up' | 'down';
  trendLabel?: string;
  isNegative?: boolean;
  isHighlight?: boolean;
  isHero?: boolean;
  isOverdraft?: boolean;
  /** Deficit state: expenses > income this period. Shows amber badge, hides trend badge. */
  isDeficit?: boolean;
  subtext?: string;
}

export default function RedesignedKpiCard({
  title,
  amount,
  icon,
  trend,
  trendLabel,
  isNegative,
  isHighlight,
  isHero,
  isOverdraft,
  isDeficit,
  subtext
}: KpiProps) {
  const formattedAmount = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <m.div
      whileHover={{ y: -4 }}
      className={cn(
        "relative overflow-hidden rounded-[2rem] p-6 transition-all duration-500 border",
        isHighlight 
          ? "bg-slate-900 border-slate-800 text-white shadow-2xl shadow-slate-200" 
          : "bg-white border-slate-100 text-slate-900 shadow-sm hover:shadow-xl"
      )}
    >
      {/* Background patterns for premium feel */}
      {isHighlight && (
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, ${isDeficit ? '#f59e0b' : 'white'} 1px, transparent 0)`,
              backgroundSize: '24px 24px'
            }}
          />
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl transition-all duration-500",
              isHighlight ? "bg-white/10 text-blue-400" : "bg-blue-50 text-blue-600"
            )}>
              {icon || <Activity size={18} />}
            </div>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-[0.25em]",
              isHighlight ? "text-slate-400" : "text-slate-400"
            )}>
              {title}
            </span>
          </div>
          {/* Trend badge — hidden in deficit mode */}
          {trend && !isDeficit && (
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
              trend === 'up' 
                ? (isHighlight ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-100")
                : (isHighlight ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-600 border-rose-100")
            )}>
              {trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {trendLabel}
            </div>
          )}
          {/* Deficit badge */}
          {isDeficit && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-amber-500/15 text-amber-400 border-amber-500/25">
              <ArrowDownRight size={10} />
              Deficit Month
            </div>
          )}
        </div>

        <div>
          <div className="flex items-baseline gap-1.5">
            <span className={cn(
              "font-mono font-light",
              isHero ? "text-2xl" : "text-xl",
              isHighlight ? "text-blue-400" : "text-slate-300"
            )}>
              ₹
            </span>
            <span className={cn(
              "font-black tracking-tighter leading-none block",
              isHero ? "text-4xl" : "text-3xl",
              isOverdraft ? "text-rose-500" : (isHighlight ? "text-white" : "text-slate-900")
            )}>
              {isNegative || isOverdraft ? '-' : ''}{formattedAmount}
            </span>
          </div>
          {subtext && (
            <p className={cn(
              "text-[10px] font-bold uppercase tracking-widest mt-2 opacity-60",
              isHighlight ? "text-slate-400" : "text-slate-500"
            )}>
              {subtext}
            </p>
          )}
        </div>
      </div>

      {/* Decorative Glow for highlight cards */}
      {isHighlight && (
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none" />
      )}
    </m.div>
  );
}
