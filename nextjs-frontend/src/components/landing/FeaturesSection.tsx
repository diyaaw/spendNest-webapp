'use client';
import RevealOnScroll from './RevealOnScroll';

const mainFeatures = [
  { title:'Smart Categorization', description:'Our engine automatically tags transactions (Food, Travel, Salary) using intelligent keyword matching.', icon:'🏷️',
    mockup:<div className="flex flex-col gap-4 w-full px-2">
      <div className="flex justify-between items-center px-4 py-3 rounded-lg border border-slate-100 shadow-sm w-full"><span className="text-[11px] font-medium text-slate-700">Uber Ride</span><span className="text-[9px] font-bold bg-blue-100 text-blue-600 px-3 py-1 rounded-md">Travel</span></div>
      <div className="flex justify-between items-center px-4 py-3 rounded-lg border border-slate-100 shadow-sm w-full"><span className="text-[11px] font-medium text-slate-700">Salary</span><span className="text-[9px] font-bold bg-emerald-100 text-emerald-600 px-3 py-1 rounded-md">Income</span></div>
    </div>},
  { title:'Monthly Analytics', description:'Visualize your spending habits with stunning, interactive charts. Spot trends easily.', icon:'📊',
    mockup:<div className="h-full w-full flex items-end gap-[2px] px-6 pt-8 pb-4">{[25,50,20,45,40,70].map((h,i)=><div key={i} className="flex-1 bg-blue-400 rounded-t-sm" style={{height:`${h}%`}}/>)}</div>},
  { title:'Income Forecasting', description:"Utilize Simple Moving Averages to predict your upcoming month's cash flow with high accuracy.", icon:'📈',
    mockup:<div className="h-full w-full flex items-center justify-center px-6"><svg className="w-full h-16 stroke-blue-500 fill-none" viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M0,25 Q20,15 40,25 T70,10 T85,30 T100,5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>},
];

const secondaryFeatures = [
  { title:'CSV Upload', description:'Instantly ingest unstructured bank statements. We handle the formatting mess.', icon:<svg className="w-5 h-5 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg> },
  { title:'Savings Recommendation', description:'Get dynamic, tailored advice on how much you should be saving based on history.', icon:<svg className="w-5 h-5 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg> },
  { title:'Safe-to-Spend Balance', description:"Know exactly what you can spend guilt-free today without risking tomorrow.", icon:<svg className="w-5 h-5 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-[#F8FAFC]">
      <div className="max-w-[1000px] mx-auto px-6">
        <RevealOnScroll className="text-center mb-16 max-w-2xl mx-auto">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-blue-500 mb-4">Product</p>
          <h2 className="text-[34px] md:text-[40px] font-extrabold text-[#0B1B3D] tracking-tight mb-4 leading-[1.15]">A robust set of features for <br className="hidden md:block"/>financial clarity</h2>
          <p className="text-slate-500 text-[14px] leading-relaxed max-w-lg mx-auto">SpendNest replaces messy spreadsheets with a sleek, automated dashboard.<br className="hidden md:block"/> We do the heavy lifting so you can focus on building wealth.</p>
        </RevealOnScroll>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {mainFeatures.map((feat, idx) => (
            <RevealOnScroll key={idx} delay={(idx+1)*100} className="flex flex-col">
              <div className="h-[180px] bg-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-center items-center overflow-hidden mb-6 interactive-card">{feat.mockup}</div>
              <div className="px-1">
                <div className="flex items-center gap-2 mb-2"><span className="text-sm">{feat.icon}</span><h3 className="text-[15px] font-bold text-[#0B1B3D]">{feat.title}</h3></div>
                <p className="text-[13px] text-slate-500 leading-[1.6]">{feat.description}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
        <div className="w-full h-px bg-slate-200 mb-16"/>
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-blue-500 mb-4">Features</p>
              <h2 className="text-[28px] md:text-[32px] font-extrabold text-[#0B1B3D] tracking-tight leading-[1.2]">More features to power-up <br className="hidden md:block"/>your dashboard</h2>
            </div>
            <RevealOnScroll delay={200} className="flex gap-3 pb-2">
              <button className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm interactive-btn"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg></button>
              <button className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm interactive-btn"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg></button>
            </RevealOnScroll>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {secondaryFeatures.map((feat, idx) => (
              <div key={idx} className="flex flex-col pr-4">{feat.icon}<h3 className="text-[14px] font-bold text-[#0B1B3D] mb-2">{feat.title}</h3><p className="text-[13px] text-slate-500 leading-[1.6]">{feat.description}</p></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
