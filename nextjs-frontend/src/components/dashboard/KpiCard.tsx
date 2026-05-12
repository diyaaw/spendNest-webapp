import { CURRENCY_SYMBOL } from '@/lib/utils';

interface Props {
  title:        string;
  /**
   * The RAW amount — never Math.abs() before passing here.
   * KpiCard handles negative sign display internally.
   * Exception: for Net Savings with isNegative=true, pass Math.abs(savings)
   * from the calling site so the magnitude is shown in red.
   */
  amount:       number;
  subtext?:     string;
  icon?:        React.ReactNode;
  isHighlight?: boolean;
  /** Explicit overspending/negative state (e.g. Net Savings < 0) */
  isNegative?:  boolean;
  /** Amber caution state (e.g. zero income) */
  isWarning?:   boolean;
  /** Overdraft state — when the actual bank balance is negative */
  isOverdraft?: boolean;
  trend?:       'up' | 'down' | 'neutral';
  trendLabel?:  string;
  size?:        'sm' | 'md' | 'lg';
}

export default function KpiCard({
  title,
  amount,
  subtext,
  icon,
  isHighlight,
  isNegative,
  isWarning,
  isOverdraft,
  trend,
  trendLabel,
  size = 'md',
}: Props) {
  const isLarge = size === 'lg';

  // Auto-detect negative amounts (e.g. negative bank balance passed directly)
  const autoNegative = amount < 0 && !isHighlight;
  const effectiveIsNegative  = isNegative  || false;
  const effectiveIsOverdraft = isOverdraft || autoNegative;

  // ── Colour theme resolution ─────────────────────────────────────────────────
  // Priority: overdraft > overspending > warning > highlight > default
  const theme = (() => {
    if (effectiveIsOverdraft) return {
      card:   'bg-rose-50 border-rose-300 text-rose-900 shadow-[0_8px_30px_rgba(244,63,94,0.14)]',
      label:  'text-rose-500',
      value:  'text-rose-700',
      symbol: 'text-rose-400',
      sub:    'text-rose-400',
      badge:  'bg-rose-100 border-rose-200',
      prefix: '−',
    };
    if (effectiveIsNegative) return {
      card:   'bg-rose-50 border-rose-200 text-rose-900 shadow-[0_8px_30px_rgba(244,63,94,0.10)]',
      label:  'text-rose-400',
      value:  'text-rose-600',
      symbol: 'text-rose-400',
      sub:    'text-rose-400',
      badge:  'bg-rose-100 border-rose-100',
      prefix: '',
    };
    if (isWarning) return {
      card:   'bg-amber-50 border-amber-200 text-amber-900 shadow-[0_8px_30px_rgba(245,158,11,0.10)]',
      label:  'text-amber-500',
      value:  'text-amber-700',
      symbol: 'text-amber-400',
      sub:    'text-amber-500',
      badge:  'bg-amber-100 border-amber-100',
      prefix: '',
    };
    if (isHighlight) return {
      card:   'bg-blue-600 border-blue-500 text-white shadow-[0_12px_40px_rgba(37,99,235,0.25)]',
      label:  'text-blue-100',
      value:  'text-white',
      symbol: 'text-blue-200',
      sub:    'text-blue-100',
      badge:  'bg-white/20',
      prefix: '',
    };
    return {
      card:   'bg-white border-slate-100 text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
      label:  'text-slate-500',
      value:  'text-slate-900',
      symbol: 'text-slate-400',
      sub:    'text-slate-400',
      badge:  'bg-slate-50 border-slate-100',
      prefix: '',
    };
  })();

  // ── Number display ───────────────────────────────────────────────────────────
  // Always show absolute value; negative sign comes from theme.prefix
  const displayValue = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // ── Trend badge ─────────────────────────────────────────────────────────────
  const trendBadge = trend && trend !== 'neutral' ? (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-2
      ${trend === 'up'
        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
        : 'bg-rose-50 text-rose-500 border border-rose-100'
      }`}
    >
      {trend === 'up' ? '↑' : '↓'} {trendLabel}
    </span>
  ) : null;

  // ── State badges ─────────────────────────────────────────────────────────────
  const overdraftBadge = effectiveIsOverdraft ? (
    <div className="mt-2 flex items-center gap-1.5 bg-rose-100 border border-rose-200 rounded-xl px-2.5 py-1">
      <span className="text-[10px]">🔴</span>
      <span className="text-rose-600 text-[10px] font-bold">Overdraft — account in deficit</span>
    </div>
  ) : null;

  const overspendBadge = effectiveIsNegative && !effectiveIsOverdraft ? (
    <div className="mt-2 flex items-center gap-1.5 bg-rose-100 border border-rose-200 rounded-xl px-2.5 py-1">
      <span className="text-[10px]">⚠️</span>
      <span className="text-rose-500 text-[10px] font-bold">Overspending this month</span>
    </div>
  ) : null;

  return (
    <div className={`
      p-6 rounded-3xl border relative overflow-hidden
      transition-all duration-300 hover:shadow-xl hover:-translate-y-1
      ${theme.card}
      ${isLarge ? 'p-8 min-h-[160px] flex flex-col justify-center' : ''}
    `}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className={`font-medium tracking-tight ${isLarge ? 'text-lg mb-1' : 'text-sm'} ${theme.label}`}>
            {title}
          </h3>
          {isLarge && subtext && (
            <p className={`text-xs opacity-80 leading-relaxed max-w-[240px] ${theme.sub}`}>
              {subtext}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl border ${theme.badge} flex-shrink-0`}>
          {icon}
        </div>
      </div>

      {/* Amount */}
      <div className={`${isLarge ? 'text-4xl' : 'text-2xl'} font-black tracking-tighter flex items-baseline gap-0.5`}>
        {/* Negative prefix (−) shown before currency symbol for overdraft */}
        {theme.prefix && (
          <span className={`${isLarge ? 'text-3xl' : 'text-xl'} font-black ${theme.symbol}`}>
            {theme.prefix}
          </span>
        )}
        <span className={`${isLarge ? 'text-2xl' : 'text-xl'} ${theme.symbol}`}>
          {CURRENCY_SYMBOL}
        </span>
        <span className={theme.value}>{displayValue}</span>
      </div>

      {/* State badges */}
      {overdraftBadge}
      {overspendBadge}

      {/* Trend badge */}
      {trendBadge}

      {/* Subtext (non-large cards) */}
      {!isLarge && subtext && (
        <p className={`text-[11px] mt-3 leading-relaxed font-medium ${theme.sub}`}>
          {subtext}
        </p>
      )}

      {/* Decorative glows */}
      {isHighlight && (
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      )}
      {(effectiveIsOverdraft || effectiveIsNegative) && (
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-200/30 rounded-full blur-2xl pointer-events-none" />
      )}
    </div>
  );
}
