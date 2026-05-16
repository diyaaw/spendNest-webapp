'use client';

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

const COLORS = ['#2DD4BF', '#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

interface ChartProps {
  data: any[];
}

export function RedesignedTrendChart({ data }: ChartProps) {
  return (
    <div className="bg-[#12161C]/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 h-[400px]">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Cashflow Trends</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
          <XAxis 
            dataKey="label" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#8B9BB4', fontSize: 10, fontWeight: 600 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#8B9BB4', fontSize: 10, fontWeight: 600 }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#12161C', border: '1px solid #ffffff10', borderRadius: '16px', color: '#fff' }}
            itemStyle={{ color: '#fff' }}
            cursor={{ fill: '#ffffff05' }}
          />
          <Bar dataKey="income" fill="#2DD4BF" radius={[4, 4, 0, 0]} barSize={24} />
          <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RedesignedCategoryPie({ data }: ChartProps) {
  return (
    <div className="bg-[#12161C]/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 h-[400px]">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Spending DNA</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={90}
            paddingAngle={8}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#12161C', border: '1px solid #ffffff10', borderRadius: '16px', color: '#fff' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.slice(0, 4).map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RedesignedForecastChart({ data }: ChartProps) {
  return (
    <div className="bg-[#12161C]/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 h-[400px]">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Net Worth Projection</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
          <defs>
            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
          <XAxis 
            dataKey="label" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#8B9BB4', fontSize: 10, fontWeight: 600 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#8B9BB4', fontSize: 10, fontWeight: 600 }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#12161C', border: '1px solid #ffffff10', borderRadius: '16px', color: '#fff' }}
          />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke="#2DD4BF" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorForecast)" 
          />
          <Line 
            type="monotone" 
            dataKey="predicted" 
            stroke="#3B82F6" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
