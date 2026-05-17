'use client';
const bgCards1 = [
  { title: 'INCOME', sub: 'Monthly Salary', color: 'from-blue-100 to-indigo-50' },
  { title: 'FOOD', sub: 'Dining & Groceries', color: 'from-orange-100 to-rose-50' },
  { title: 'TRAVEL', sub: 'Uber & Flights', color: 'from-cyan-100 to-blue-50' },
  { title: 'ENTERTAINMENT', sub: 'Netflix & Movies', color: 'from-purple-100 to-fuchsia-50' },
  { title: 'SHOPPING', sub: 'Amazon & Retail', color: 'from-pink-100 to-rose-50' },
  { title: 'UTILITIES', sub: 'Bills & WiFi', color: 'from-sky-100 to-blue-50' },
  { title: 'HEALTH', sub: 'Pharmacy & Care', color: 'from-emerald-100 to-teal-50' },
];

const bgCards2 = [
  { title: 'SUBSCRIPTIONS', sub: 'Spotify & Netflix', color: 'from-fuchsia-100 to-pink-50' },
  { title: 'INVESTING', sub: 'Stocks & Crypto', color: 'from-emerald-100 to-green-50' },
  { title: 'PETS', sub: 'Vet & Food', color: 'from-amber-100 to-orange-50' },
  { title: 'EDUCATION', sub: 'Courses & Books', color: 'from-blue-100 to-sky-50' },
  { title: 'HOME', sub: 'Rent & Repairs', color: 'from-rose-100 to-red-50' },
  { title: 'GIFTS', sub: 'Presents & Charity', color: 'from-violet-100 to-purple-50' },
  { title: 'BEAUTY', sub: 'Salon & Spa', color: 'from-pink-100 to-rose-50' },
];

export default function HeroSection({ onStartApp }: { onStartApp: () => void }) {
  return (
    <section className="relative pt-44 pb-24 overflow-hidden flex flex-col items-center min-h-screen justify-center">
      <h1 className="text-4xl md:text-6xl lg:text-[5rem] tracking-tight text-center mb-16 text-slate-900 uppercase font-light z-10 px-4 animate-fade-in-up">
        Master <span className="text-slate-400">Your</span> <span className="font-semibold text-blue-600">Finances</span>
      </h1>

      <div className="relative w-full max-w-[1200px] h-[550px] sm:h-[600px] flex justify-center items-center mb-16">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1/4 sm:w-1/3 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent z-10 pointer-events-none"/>
          <div className="absolute right-0 top-0 bottom-0 w-1/4 sm:w-1/3 bg-gradient-to-l from-slate-50 via-slate-50/80 to-transparent z-10 pointer-events-none"/>
          
          <div className="w-full animate-fade-in-up delay-100 flex flex-col items-center gap-6">
            <div className="flex animate-marquee-left gap-4 sm:gap-6 w-max items-center">
              {[...bgCards1, ...bgCards1, ...bgCards1, ...bgCards1].map((card, idx) => (
                <div key={`r1-${idx}`} className={`w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] rounded-2xl bg-gradient-to-br ${card.color} p-4 flex flex-col justify-end relative overflow-hidden interactive-card border border-white shrink-0`}>
                  <div className="relative z-10">
                    <h3 className="text-slate-800 font-bold text-sm sm:text-lg tracking-wider">{card.title}</h3>
                    <p className="text-slate-600 text-xs sm:text-sm font-medium mt-1 truncate">{card.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex animate-marquee-right gap-4 sm:gap-6 w-max items-center">
              {[...bgCards2, ...bgCards2, ...bgCards2, ...bgCards2].map((card, idx) => (
                <div key={`r2-${idx}`} className={`w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] rounded-2xl bg-gradient-to-br ${card.color} p-4 flex flex-col justify-end relative overflow-hidden interactive-card border border-white shrink-0`}>
                  <div className="relative z-10">
                    <h3 className="text-slate-800 font-bold text-sm sm:text-lg tracking-wider">{card.title}</h3>
                    <p className="text-slate-600 text-xs sm:text-sm font-medium mt-1 truncate">{card.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Phone mockup */}
        <div className="relative z-20 w-[280px] sm:w-[320px] h-[580px] bg-white border-[8px] border-slate-100 rounded-[3rem] shadow-[0_20px_60px_rgba(37,99,235,0.15)] flex flex-col overflow-hidden animate-fade-in-up delay-200">
          <div className="absolute top-0 inset-x-0 h-6 flex justify-center"><div className="w-1/3 h-full bg-slate-100 rounded-b-xl"/></div>
          <div className="flex-1 p-5 pt-10 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 flex items-center justify-center relative">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="12" r="7" fill="currentColor" className="text-blue-600/80"/><circle cx="15" cy="12" r="7" fill="currentColor" className="text-indigo-400/80"/></svg>
              </div>
              <span className="text-sm font-bold text-slate-900">SpendNest</span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Safe to Spend</p>
              <h2 className="text-3xl font-black text-slate-900">₹2,450.00</h2>
              <p className="text-[10px] text-blue-600 mt-2 font-medium bg-blue-100 inline-block px-2 py-1 rounded">Looks good until next payday.</p>
            </div>
            <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Activity</h3>
              {[
                { emoji: '🍔', name: 'Swiggy Delivery', cat: 'Food', amount: '-₹18.50', bg: 'bg-orange-100', text: 'text-orange-600', color: 'text-slate-800' },
                { emoji: '🚗', name: 'Uber Ride', cat: 'Travel', amount: '-₹12.00', bg: 'bg-blue-100', text: 'text-blue-600', color: 'text-slate-800' },
                { emoji: '💼', name: 'Salary Inc', cat: 'Income', amount: '+₹3,500.00', bg: 'bg-emerald-100', text: 'text-emerald-600', color: 'text-emerald-600' },
              ].map((tx) => (
                <div key={tx.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${tx.bg} flex items-center justify-center`}><span className={`${tx.text} text-xs`}>{tx.emoji}</span></div>
                    <div><p className="text-xs text-slate-800 font-medium">{tx.name}</p><p className="text-[10px] text-slate-500">{tx.cat}</p></div>
                  </div>
                  <span className={`text-xs font-bold ${tx.color}`}>{tx.amount}</span>
                </div>
              ))}
              <div className="mt-auto h-16 bg-gradient-to-t from-blue-50 to-transparent rounded-xl flex items-end p-2 border-b-2 border-blue-200">
                <div className="w-full flex justify-between items-end px-1 gap-1 h-full">
                  {[30,50,40,80,60,90].map((h,i) => <div key={i} className="w-full bg-blue-400 rounded-t-sm" style={{height:`${h}%`}}/>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-slate-600 max-w-2xl mx-auto mb-10 text-base sm:text-lg leading-relaxed px-6 z-10 animate-fade-in-up delay-300">
        <span className="text-blue-600 font-semibold uppercase tracking-wider text-sm sm:text-base mr-1">SpendNest</span>
        is a personal finance companion for ambitious professionals.<br className="hidden sm:block"/>
        Make better decisions when it matters most with personalized spending guidance.
      </p>
      <button onClick={onStartApp} className="bg-blue-600 text-white font-bold text-lg px-8 py-4 rounded-full shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_12px_25px_rgba(37,99,235,0.4)] interactive-btn animate-fade-in-up delay-400 flex items-center justify-center z-10">
        Go to Dashboard
      </button>
    </section>
  );
}
