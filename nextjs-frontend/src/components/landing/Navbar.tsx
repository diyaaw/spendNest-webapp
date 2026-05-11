'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar({ onStartApp }: { onStartApp: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
      <header className={`w-full max-w-5xl flex items-center justify-between px-6 py-3 rounded-full transition-all duration-300 ${scrolled ? 'glass-panel' : 'bg-white/40 backdrop-blur-sm border border-slate-200/30'}`}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-8 h-8 flex items-center justify-center relative">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="12" r="7" fill="currentColor" className="text-blue-600/80"/><circle cx="15" cy="12" r="7" fill="currentColor" className="text-indigo-400/80"/></svg>
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">FlowShield</span>
        </div>
        <nav className="hidden md:flex gap-6 items-center">
          {[['features','Features'],['how-it-works','How It Works'],['pricing','Pricing'],['about','About']].map(([id,label]) => (
            <button key={id} onClick={() => scrollTo(id)} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">{label}</button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors px-2">
            Sign In
          </Link>
          <button onClick={onStartApp} className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-slate-800 shadow-sm interactive-btn">Go to Dashboard</button>
        </div>
      </header>
    </div>
  );
}

