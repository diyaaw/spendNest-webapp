'use client';
import RevealOnScroll from './RevealOnScroll';

const steps = [
  { num:'01', title:'Upload Your Bank CSV', description:'Export a CSV from your bank and drop it into SpendNest. We intentionally avoid risky direct bank connections to prioritize your privacy and security.', bullets:['No bank credentials needed','100% private local processing','Accepts standard bank formats'], numColor:'text-blue-200', iconBg:'bg-blue-500', glowColor:'shadow-[0_0_60px_rgba(59,130,246,0.3)]', bgLight:'bg-blue-50', borderLight:'border-blue-100', arrowColor:'text-blue-200',
    icon:<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>,
    bigIcon:<svg className="w-20 h-20 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
  { num:'02', title:'Instant Parse & Clean', description:'Our Pandas-powered backend instantly normalizes messy data formats, handles missing values, and standardizes transactions across different banking institutions.', bullets:['Lightning-fast Python backend','Automated error handling','Standardized data structuring'], numColor:'text-fuchsia-200', iconBg:'bg-fuchsia-500', glowColor:'shadow-[0_0_60px_rgba(217,70,239,0.3)]', bgLight:'bg-fuchsia-50', borderLight:'border-fuchsia-100', arrowColor:'text-fuchsia-200',
    icon:<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>,
    bigIcon:<svg className="w-20 h-20 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
  { num:'03', title:'Smart Categorization', description:'Transactions are intelligently classified into spending buckets. We calculate monthly totals, balances, and highlight spending outliers so you know where your money goes.', bullets:['Automatic keyword matching','Income & expense separation','Detailed visual breakdown'], numColor:'text-teal-200', iconBg:'bg-teal-500', glowColor:'shadow-[0_0_60px_rgba(20,184,166,0.3)]', bgLight:'bg-teal-50', borderLight:'border-teal-100', arrowColor:'text-teal-200',
    icon:<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>,
    bigIcon:<svg className="w-20 h-20 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> },
  { num:'04', title:'Predictive Forecasting', description:"Using predictive Simple Moving Averages, we forecast your next month's cash flow to generate a reliable Safe-to-Spend limit that you can trust.", bullets:['SMA algorithmic forecasting','Safe-to-Spend calculations','Future trend visualization'], numColor:'text-orange-200', iconBg:'bg-orange-500', glowColor:'shadow-[0_0_60px_rgba(249,115,22,0.3)]', bgLight:'bg-orange-50', borderLight:'border-orange-100', arrowColor:'text-orange-200',
    icon:<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
    bigIcon:<svg className="w-20 h-20 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-blue-50/50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"/>
      <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-fuchsia-50/50 rounded-full blur-3xl translate-x-1/3 -translate-y-1/2 pointer-events-none"/>
      <div className="absolute bottom-0 left-1/4 w-[700px] h-[700px] bg-teal-50/30 rounded-full blur-3xl translate-y-1/3 pointer-events-none"/>
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <RevealOnScroll className="text-center mb-24 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold tracking-widest uppercase mb-4 border border-blue-100">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Simple Process
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">How it works</h2>
          <p className="text-slate-500 text-lg">From raw CSV data to financial clarity in four simple steps</p>
        </RevealOnScroll>
        <div className="flex flex-col gap-12 md:gap-24 relative">
          {steps.map((step, idx) => {
            const isEven = idx % 2 !== 0;
            return (
              <div key={idx}>
                <div className={`flex flex-col ${isEven ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-10 md:gap-20`}>
                  <RevealOnScroll delay={100} className="flex-1 w-full max-w-lg">
                    <h3 className={`text-6xl md:text-7xl font-light ${step.numColor} mb-2 tracking-tighter`}>{step.num}</h3>
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-10 h-10 rounded-xl ${step.iconBg} flex items-center justify-center shadow-md`}>{step.icon}</div>
                      <h4 className="text-2xl font-bold text-slate-900">{step.title}</h4>
                    </div>
                    <p className="text-slate-600 leading-relaxed mb-6">{step.description}</p>
                    <ul className="space-y-3">
                      {step.bullets.map((b, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-slate-500">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </RevealOnScroll>
                  <RevealOnScroll delay={300} className="flex-1 w-full flex justify-center">
                    <div className={`relative w-full max-w-[400px] aspect-[4/3] bg-white rounded-3xl ${step.glowColor} border border-slate-100 flex items-center justify-center p-8 interactive-card`}>
                      <div className={`absolute top-1/4 left-1/4 w-16 h-16 rounded-full ${step.bgLight}`}/>
                      <div className={`absolute bottom-1/4 right-1/4 w-12 h-12 rounded-full ${step.bgLight}`}/>
                      <div className={`relative z-10 w-32 h-32 ${step.bgLight} rounded-2xl flex items-center justify-center border ${step.borderLight}`}>{step.bigIcon}</div>
                    </div>
                  </RevealOnScroll>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden md:flex justify-center my-[-2rem] relative z-20">
                    <svg className={`w-6 h-6 ${step.arrowColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
