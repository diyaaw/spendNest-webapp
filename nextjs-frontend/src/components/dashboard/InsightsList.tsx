'use client';

import { motion } from 'framer-motion';

interface Props {
  insights: string[];
  trends?: {
    weekend_vs_weekday_pct?: number;
    rising_categories?: string[];
  };
}

export default function InsightsList({ insights, trends }: Props) {
  if (!insights.length && (!trends?.rising_categories?.length)) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">AI Insights & Trends</h3>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          POWERED BY AI
        </span>
      </div>

      <div className="grid gap-3">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
          >
            <div className="mt-0.5 w-5 h-5 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 transition-colors">
              <span className="text-xs">✨</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">{insight}</p>
          </motion.div>
        ))}

        {trends?.weekend_vs_weekday_pct !== undefined && Math.abs(trends.weekend_vs_weekday_pct) > 10 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/20 transition-all group"
          >
            <div className="mt-0.5 w-5 h-5 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
              <span className="text-xs">📅</span>
            </div>
            <div>
              <p className="text-sm text-white/80 leading-relaxed">
                {trends.weekend_vs_weekday_pct > 0 
                  ? `You spend ${trends.weekend_vs_weekday_pct}% more on weekends.` 
                  : `Your weekend spending is ${Math.abs(trends.weekend_vs_weekday_pct)}% lower than weekdays.`
                }
              </p>
              <p className="text-[11px] text-amber-400/60 mt-1 font-medium">Spending Pattern Detected</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
