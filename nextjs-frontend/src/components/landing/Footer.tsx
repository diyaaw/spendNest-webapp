'use client';
const Logo = () => (
  <div className="flex items-center gap-2 cursor-pointer">
    <div className="w-8 h-8 flex items-center justify-center relative">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="12" r="7" fill="currentColor" className="text-blue-600/80"/><circle cx="15" cy="12" r="7" fill="currentColor" className="text-indigo-400/80"/></svg>
    </div>
    <span className="text-xl font-black tracking-tight text-slate-900">SpendNest</span>
  </div>
);

const socialIcons = [
  <svg key="x" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  <svg key="github" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>,
  <svg key="linkedin" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 pt-20 pb-10 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-20">
          <div className="lg:col-span-2 flex flex-col items-start">
            <Logo/>
            <p className="text-sm text-slate-500 mb-1 mt-4">Intelligent Finance Analytics Engine</p>
            <p className="text-sm text-slate-400 mb-6">Indore, MP</p>
            <div className="flex gap-3 mb-6">
              {socialIcons.map((icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors bg-slate-50">{icon}</a>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"/>
              <span className="text-xs font-semibold text-slate-600">All systems operational</span>
            </div>
          </div>
          {[
            { title:'Product', links:['CSV Engine','Smart Categories','Spending Analytics','Forecasting','Safe-to-Spend','Export Reports'] },
            { title:'Resources', links:['Documentation','Changelog','Blog','Finance Tips','FAQs','Status'] },
            { title:'Company', links:['About Us','Careers','Press','Customers','Privacy','Terms'] },
            { title:'Support', links:['Contact Us','Help Center','Community','Feedback','Report Bug'] },
          ].map(col => (
            <div key={col.title} className="flex flex-col gap-3">
              <h4 className="text-xs font-black tracking-widest text-slate-900 uppercase mb-2">{col.title}</h4>
              {col.links.map(link => <a key={link} href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">{link}</a>)}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-[-10%] left-0 right-0 flex justify-center pointer-events-none select-none overflow-hidden">
        <h1 className="text-[18vw] font-black tracking-tighter text-slate-100 leading-none">SpendNest</h1>
      </div>
    </footer>
  );
}
