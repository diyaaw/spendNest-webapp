'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Tag, Filter, ReceiptText, ExternalLink, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  id?: string;
  date?: string;
  description?: string;
  amount?: number;
  category?: string;
  status?: 'completed' | 'pending';
  // Fallbacks for various data formats
  Date?: string;
  Merchant?: string;
  Description?: string;
  Amount?: number;
  Category?: string;
  type?: string;
}

export function RedesignedTransactionTable({ transactions = [], limit }: { transactions?: any[], limit?: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  const categories = ['All', ...Array.from(new Set(transactions.map(t => t.Category || t.category || 'General')))];

  const filtered = (transactions || []).filter(t => {
    const desc = (t.Description || t.description || t.Merchant || t.merchant || '').toString().toLowerCase();
    const cat = t.Category || t.category || 'General';
    const amount = t.Amount || t.amount || 0;
    const type = t.type || (amount > 0 ? 'income' : 'expense');

    const matchesSearch = desc.includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || cat === selectedCategory;
    const matchesType = selectedType === 'All' || type === selectedType.toLowerCase();

    return matchesSearch && matchesCategory && matchesType;
  });

  const displayItems = limit ? filtered.slice(0, limit) : filtered;

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all group">
      <div 
        className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-slate-50 transition-all border-b border-slate-50 gap-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-lg group-hover:bg-blue-600 transition-all duration-500">
             <ReceiptText size={18} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-0.5 leading-none">Financial Ledger</h3>
            <p className="text-slate-900 text-sm font-black tracking-tight leading-none">Active Stream</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Live Syncing</span>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="text-slate-400 p-2 bg-slate-50 rounded-lg"
          >
            <ChevronDown size={18} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 md:p-8 space-y-6">
              {/* Actions Bar */}
              <div className="flex flex-col xl:flex-row gap-4">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search entries..." 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 font-bold focus:outline-none focus:border-blue-500/30 focus:bg-white transition-all shadow-inner"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Type:</span>
                    <select 
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="bg-white border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                    >
                      <option>All</option>
                      <option>Income</option>
                      <option>Expense</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Category:</span>
                    <select 
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-white border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 max-w-[150px]"
                    >
                      {categories.map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <button className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-sm">
                    <Download size={12} /> Export
                  </button>
                </div>
              </div>

              {/* Table Body */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400">
                   <div className="col-span-5 lg:col-span-4">Entity</div>
                   <div className="hidden lg:block lg:col-span-2">Category</div>
                   <div className="hidden sm:block sm:col-span-2">Status</div>
                   <div className="col-span-4 sm:col-span-2 text-right">Amount</div>
                   <div className="col-span-3 sm:col-span-2 text-right">Balance</div>
                </div>
                
                {displayItems.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <ReceiptText size={32} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">No transaction records</p>
                       <p className="text-[9px] text-slate-500 font-bold opacity-60">Upload a statement to populate the ledger</p>
                    </div>
                  </div>
                ) : (
                  displayItems.map((t, idx) => {
                    const desc = t.Description || t.description || t.Merchant || t.merchant || 'Unknown';
                    const amount = t.Amount || t.amount || 0;
                    const balance = t.Balance || t.balance || 0;
                    const category = t.Category || t.category || 'General';
                    const date = t.Date || t.date || '---';
                    const status = t.status || 'completed';
                    const type = t.type || (amount > 0 ? 'income' : 'expense');

                    return (
                      <motion.div 
                        key={idx} 
                        whileHover={{ x: 4 }}
                        className="grid grid-cols-12 gap-4 p-4 rounded-xl bg-slate-50/30 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-lg transition-all group cursor-pointer"
                      >
                        <div className="col-span-5 lg:col-span-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center text-[10px] text-slate-900 font-black uppercase group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0">
                            {desc.toString().slice(0, 2)}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
                              {desc}
                              <ExternalLink size={8} className="text-slate-300 group-hover:text-blue-400 opacity-0 group-hover:opacity-100" />
                            </p>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{date}</p>
                          </div>
                        </div>
                        
                        <div className="hidden lg:flex items-center lg:col-span-2">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 py-1.5 rounded-full border border-slate-100 bg-white/50 truncate">
                            {category}
                          </span>
                        </div>

                        <div className="hidden sm:flex items-center sm:col-span-2">
                           <span className={cn(
                             "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                             status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                           )}>
                             {status}
                           </span>
                        </div>

                        <div className="col-span-4 sm:col-span-2 flex items-center justify-end">
                          <span className={cn(
                            "text-sm font-mono font-black tracking-tighter",
                            type === 'income' ? "text-emerald-600" : "text-slate-900"
                          )}>
                            {type === 'income' ? '+' : '-'}£{Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="col-span-3 sm:col-span-2 flex items-center justify-end">
                           <span className="text-sm font-mono font-black tracking-tighter text-slate-400 group-hover:text-slate-900 transition-colors">
                             £{balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                           </span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {limit && filtered.length > limit && (
                <button 
                  onClick={() => window.location.href = '/dashboard/transactions'}
                  className="w-full py-4 text-[10px] font-black text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all bg-slate-50/50 rounded-xl border border-dashed border-slate-100 uppercase tracking-widest"
                >
                  View All {filtered.length} Transactions
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
