import { CURRENCY_SYMBOL } from '@/lib/utils';

interface Props {
  title: string;
  amount: number;
  subtext?: string;
  icon?: React.ReactNode;
  isHighlight?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function KpiCard({ title, amount, subtext, icon, isHighlight, size = 'md' }: Props) {
  const isLarge = size === 'lg';

  return (
    <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1
      ${isHighlight
        ? 'bg-blue-600 border-blue-500 text-white shadow-[0_12px_40px_rgba(37,99,235,0.25)]'
        : 'bg-white border-slate-100 text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'}
      ${isLarge ? 'p-8 min-h-[160px] flex flex-col justify-center' : ''}
    `}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={`font-medium tracking-tight ${isLarge ? 'text-lg mb-1' : 'text-sm'} ${isHighlight ? 'text-blue-100' : 'text-slate-500'}`}>
            {title}
          </h3>
          {isLarge && subtext && (
             <p className={`text-xs opacity-80 leading-relaxed max-w-[240px] ${isHighlight ? 'text-blue-100' : 'text-slate-400'}`}>
               {subtext}
             </p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${isHighlight ? 'bg-white/20' : 'bg-slate-50 border border-slate-100'}`}>
          {icon}
        </div>
      </div>
      
      <div className={`${isLarge ? 'text-4xl' : 'text-2xl'} font-black tracking-tighter flex items-baseline gap-1`}>
        <span className={isHighlight ? 'text-blue-200 text-2xl' : 'text-slate-400 text-xl'}>{CURRENCY_SYMBOL}</span>
        {amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>


      {!isLarge && subtext && (
        <p className={`text-[11px] mt-4 leading-relaxed font-medium ${isHighlight ? 'text-blue-100' : 'text-slate-400'}`}>
          {subtext}
        </p>
      )}
      
      {isHighlight && (
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      )}
    </div>
  );
}

