'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Calculator, ArrowUpCircle, Receipt, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { estimateTax, TaxEstimate } from '@/lib/taxEngine';

interface ProgressProps {
  title: string;
  current: number;
  goal: number;
  icon?: any;
  color?: string;
  subtext?: string;
}

export function RedesignedProgressCard({ title, current, goal, icon: Icon, color = "#2563EB", subtext, href }: ProgressProps & { href?: string }) {
  const percentage = Math.min(100, Math.round((current / goal) * 100));

  return (
    <div 
      onClick={() => href && (window.location.href = href)}
      className={cn(
        "bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all h-full flex flex-col group overflow-hidden relative",
        href && "cursor-pointer"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {Icon && <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:text-blue-600 transition-colors shadow-sm"><Icon size={18} /></div>}
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</h3>
        </div>
        <span className="text-xs font-mono font-black text-slate-900">{percentage}%</span>
      </div>
      
      <div className="flex-1 flex flex-col justify-end space-y-3">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.5, ease: "circOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-mono font-black text-slate-900 tracking-tighter">₹{current.toLocaleString()}</span>
          <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider opacity-70">Goal: ₹{goal.toLocaleString()}</span>
        </div>
        {subtext && <p className="text-[9px] text-slate-500 font-bold opacity-60 leading-relaxed">{subtext}</p>}
      </div>
    </div>
  );
}

export function RedesignedTaxEstimator({ annualIncome, taxData }: { annualIncome: number, taxData?: any }) {
  const [isFreelance, setIsFreelance] = useState(true);
  
  const estimate = useMemo(() => {
    if (taxData && taxData.totalLiability !== undefined) return taxData as TaxEstimate;
    return estimateTax(annualIncome || 0, 'new');
  }, [annualIncome, taxData]);

  const displayTax = isFreelance ? estimate.totalLiability : estimate.annualIncome * 0.25;
  const displayIncome = estimate.annualIncome;
  const displayRate = displayIncome > 0 ? (displayTax / displayIncome) * 100 : 0;

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-6 h-full flex flex-col shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 transition-colors shadow-sm"><Calculator size={18} /></div>
          <div>
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Tax Estimator</h3>
            <div className="flex items-center gap-1.5 opacity-60">
              <CheckCircle2 size={8} className="text-emerald-500" />
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Real-time</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        <div className="space-y-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gross Annual</span>
          <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
            ₹{displayIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="pt-6 border-t border-slate-50 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Est. Liability</span>
            <span className="text-2xl font-mono font-black text-blue-600 tracking-tighter">
              ₹{displayTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${displayRate}%` }}
                className="h-full bg-blue-600 rounded-full"
              />
            </div>
            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
              <span className="text-slate-400">Effective Rate</span>
              <span className="text-slate-900">{displayRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setIsFreelance(!isFreelance)}
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
            isFreelance ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-slate-100"
          )}
        >
          <div className="flex items-center gap-3">
            <Shield size={16} className={isFreelance ? "text-blue-600" : "text-slate-400"} />
            <div>
              <span className={cn("text-[9px] font-black uppercase tracking-widest block", isFreelance ? "text-blue-600" : "text-slate-500")}>
                Freelance
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Sec 44ADA</span>
            </div>
          </div>
          <div className={cn("w-8 h-4 rounded-full relative transition-colors p-1", isFreelance ? "bg-blue-600" : "bg-slate-200")}>
             <motion.div 
               animate={{ x: isFreelance ? 16 : 0 }}
               className="w-2 h-2 bg-white rounded-full shadow-md"
             />
          </div>
        </div>
      </div>

      <button 
        onClick={() => window.location.href = '/dashboard/tax'}
        className="w-full mt-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white hover:border-blue-200 hover:shadow-lg transition-all group"
      >
        Detailed Report
        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
