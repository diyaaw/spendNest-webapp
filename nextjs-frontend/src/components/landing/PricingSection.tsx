'use client';
import RevealOnScroll from './RevealOnScroll';

const plans = [
  { name:'Free Starter', price:'₹0', duration:'/forever', description:'Perfect for students and individuals wanting basic analytics.', features:['Upload up to 500 rows/month','Basic Categorization','Monthly Summaries','Community Support'], isPopular:false, cta:'Start Free' },
  { name:'Pro Shield', price:'₹99', duration:'/month', description:'Advanced analytics and forecasting for personal finance power users.', features:['Unlimited CSV Uploads','Smart Custom Categories','Predictive SMA Forecasting','Safe-to-Spend Recommendations','Priority Support'], isPopular:true, cta:'Get Pro' },
  { name:'Enterprise', price:'₹499', duration:'/month', description:'For small businesses needing advanced custom rules and multi-account sync.', features:['Multi-account Aggregation','Custom Rule Engine','Export Analytics to PDF','API Access','Dedicated Manager'], isPopular:false, cta:'Contact Sales' },
];

export default function PricingSection({ onStartApp }: { onStartApp: () => void }) {
  return (
    <section id="pricing" className="py-24 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <RevealOnScroll className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">Simple pricing. <span className="text-slate-400">No surprises.</span></h2>
          <p className="text-lg text-slate-600">Start for free and upgrade as your financial complexity grows.</p>
        </RevealOnScroll>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-5xl mx-auto">
          {plans.map((plan, idx) => (
            <RevealOnScroll key={idx} delay={(idx+1)*100} className={`relative flex flex-col p-8 rounded-3xl interactive-card ${plan.isPopular ? 'bg-white border-2 border-blue-500 shadow-[0_20px_60px_rgba(37,99,235,0.15)] md:-translate-y-4 z-10' : 'bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'}`}>
              {plan.isPopular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">MOST POPULAR</div>}
              <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <p className="text-sm text-slate-500 mb-6 h-10">{plan.description}</p>
              <div className="mb-8"><span className="text-4xl font-extrabold text-slate-900">{plan.price}</span><span className="text-slate-500 font-medium">{plan.duration}</span></div>
              <ul className="flex-1 space-y-4 mb-8">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className={`w-5 h-5 shrink-0 ${plan.isPopular ? 'text-blue-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    <span className="text-sm text-slate-700">{feat}</span>
                  </li>
                ))}
              </ul>
              <button onClick={onStartApp} className={`w-full py-3 rounded-xl font-semibold interactive-btn ${plan.isPopular ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_14px_rgba(37,99,235,0.39)]' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}>{plan.cta}</button>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
