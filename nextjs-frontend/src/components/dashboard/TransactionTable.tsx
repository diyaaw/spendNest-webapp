'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Transaction } from '@/types';

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    food: 'bg-orange-50 text-orange-700 border-orange-100',
    travel: 'bg-blue-50 text-blue-700 border-blue-100',
    shopping: 'bg-pink-50 text-pink-700 border-pink-100',
    bills: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    salary: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    transfer: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    entertainment: 'bg-purple-50 text-purple-700 border-purple-100',
    healthcare: 'bg-rose-50 text-rose-700 border-rose-100',
    education: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    other: 'bg-slate-50 text-slate-700 border-slate-100',
  };
  return colors[category?.toLowerCase()] || colors.other;
};

export default function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const categories = useMemo(() => {
    if (!transactions) return [];
    const cats = new Set(transactions.map((t) => t.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((tx) => {
      const matchSearch = tx.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'all' || tx.type === filterType;
      const matchCategory = filterCategory === 'all' || tx.category === filterCategory;
      return matchSearch && matchType && matchCategory;
    });
  }, [transactions, searchTerm, filterType, filterCategory]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / rowsPerPage));
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  if (!transactions || transactions.length === 0) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-black text-slate-900">Recent Activity</h3>
            <p className="text-xs text-slate-500 mt-1">Review and filter your transaction history</p>
          </div>
          <div className="flex gap-2">
             <div className="text-right hidden sm:block">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtered Result</p>
               <p className="text-sm font-black text-blue-600">{filteredTransactions.length} items</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search by description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-2xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <svg className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none"
          >
            <option value="all">Every Transaction Type</option>
            <option value="income">Income Only</option>
            <option value="expense">Expenses Only</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer capitalize"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
              <th className="px-8 py-5">Date</th>
              <th className="px-8 py-5">Description</th>
              <th className="px-8 py-5">Category</th>
              <th className="px-8 py-5 text-right">Amount</th>
              <th className="px-8 py-5 text-right">Final Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((tx, idx) => (
                <tr key={idx} className="group hover:bg-slate-50/80 transition-all duration-300">
                  <td className="px-8 py-6 text-sm text-slate-400 whitespace-nowrap font-medium">{tx.date}</td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-900 truncate max-w-[280px]" title={tx.description}>
                    {tx.description}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getCategoryColor(tx.category)}`}>
                      {tx.category || 'Other'}
                    </span>
                  </td>
                  <td className={`px-8 py-6 text-base font-black text-right whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {tx.type === 'income' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-6 text-sm text-slate-400 text-right font-bold whitespace-nowrap">
                    ${(tx.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="px-8 py-20 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <svg className="text-slate-300" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  </div>
                  <p className="text-slate-900 font-bold">No results found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex gap-3">
          <button 
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} 
            disabled={currentPage === 1} 
            className="px-5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            Previous
          </button>
          <button 
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} 
            disabled={currentPage === totalPages || totalPages === 0} 
            className="px-5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

