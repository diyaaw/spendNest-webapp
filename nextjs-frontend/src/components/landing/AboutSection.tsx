'use client';
import RevealOnScroll from './RevealOnScroll';

export default function AboutSection({ onStartApp }: { onStartApp: () => void }) {
  return (
    <section id="about" className="py-24 bg-slate-50 flex flex-col items-center">
      <RevealOnScroll className="w-full max-w-5xl mx-auto px-6 mb-20">
        <div className="relative rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(37,99,235,0.15)] bg-white border border-slate-100 interactive-card">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 via-indigo-50 to-pink-50 opacity-90"/>
          <div className="relative z-10 py-16 px-8 md:px-16 text-center flex flex-col items-center">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">Ready to get started?</h2>
            <p className="text-xl font-medium text-slate-600 mb-10 tracking-tight">Master your finances today.</p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button onClick={onStartApp} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg interactive-btn">Upload CSV</button>
              <button className="bg-white text-slate-700 border border-slate-200 shadow-sm px-8 py-3 rounded-xl font-bold hover:bg-slate-50 interactive-btn">Talk to our sales team</button>
            </div>
          </div>
        </div>
      </RevealOnScroll>
      <RevealOnScroll delay={200} className="text-center pb-8">
        <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2">FOR INDIVIDUALS</p>
        <h3 className="text-lg md:text-xl font-bold text-slate-900">Designed for professionals of all <br className="hidden md:block"/>backgrounds and incomes</h3>
      </RevealOnScroll>
    </section>
  );
}
