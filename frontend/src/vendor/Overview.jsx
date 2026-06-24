import React from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, ShoppingBag, DollarSign } from 'lucide-react'
import { campaigns, kocs, monthlyGmv } from './mock'
import { Avatar } from './components/ui' // 保留你原本的 Avatar 元件
import { formatCurrency } from './lib/utils'

// 🟢 內建乾淨的高質感卡片，不破壞你原本的結構，只換上品牌邊框與陰影
function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-2xl border border-[#E2DDD4] shadow-sm ${className}`}>{children}</div>
}

// 🟢 還原原本極簡的 KPI 卡片排版
function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <Card className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-[#8C8880] tracking-wide">{label}</span>
        <div className="text-[#8C8880]">
          <Icon size={20} strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <div className="text-2xl font-black text-[#1A1A18] font-sans">{value}</div>
        {sub && <div className="text-xs font-bold text-[#8C8880] mt-1">{sub}</div>}
      </div>
    </Card>
  )
}

// 🟢 專屬品牌色的狀態標籤
function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${
      status === 'active' ? 'bg-[#FDF0ED] text-[#C8522A]' : 'bg-[#F5F0E8] text-[#8C8880]'
    }`}>
      {status === 'active' ? '進行中' : '已結束'}
    </span>
  )
}

export default function Overview() {
  const totalGmv = campaigns.reduce((s, c) => s + c.gmv, 0)
  const totalOrders = campaigns.reduce((s, c) => s + c.orders, 0)
  const activeKocs = kocs.filter(k => k.status === 'active').length

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. KPIs (還原為 4 欄直觀排版) */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="總 GMV" value={formatCurrency(totalGmv)} sub="本季累計" icon={DollarSign} />
        <StatCard label="總訂單數" value={totalOrders} sub="本季累計" icon={ShoppingBag} />
        <StatCard label="活躍 KOC" value={activeKocs} sub="共 7 位夥伴" icon={Users} />
        <StatCard label="進行中活動" value={campaigns.filter(c => c.status === 'active').length} sub="個活動" icon={TrendingUp} />
      </div>

      {/* 2. GMV chart + KOC ranking */}
      <div className="grid grid-cols-3 gap-4">
        
        <Card className="col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-[#1A1A18] text-lg">GMV 趨勢</h2>
              <p className="text-xs font-bold text-[#8C8880] mt-0.5">近 6 個月</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyGmv} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C8522A" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#C8522A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8C8880', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip 
                formatter={v => formatCurrency(v)} 
                contentStyle={{ borderRadius: '12px', border: '1px solid #E2DDD4', boxShadow: '0 4px 20px rgba(26,26,24,0.08)', fontSize: 12, fontWeight: 'bold' }} 
                itemStyle={{ color: '#C8522A' }}
              />
              <Area type="monotone" dataKey="gmv" stroke="#C8522A" strokeWidth={2.5} fill="url(#gmvGrad)" dot={false} activeDot={{ r: 5, fill: '#C8522A', stroke: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* KOC ranking (還原緊湊乾淨的列表) */}
        <Card className="p-6">
          <h2 className="font-bold text-[#1A1A18] text-lg mb-5">KOC 業績排名</h2>
          <div className="space-y-4">
            {[...kocs].sort((a, b) => b.gmv - a.gmv).slice(0, 5).map((k, i) => (
              <div key={k.id} className="flex items-center gap-3">
                <span className={`text-xs font-black w-5 text-center ${i < 3 ? 'text-[#C8522A]' : 'text-[#E2DDD4]'}`}>{i + 1}</span>
                <Avatar name={k.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[#1A1A18] truncate">{k.name}</div>
                  <div className="text-[10px] font-bold text-[#8C8880] truncate">{k.platform}</div>
                </div>
                <span className="text-xs font-black text-[#1A1A18]">{formatCurrency(k.gmv)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 3. Active campaigns (還原乾淨的進度條設計) */}
      <Card className="p-6">
        <h2 className="font-bold text-[#1A1A18] text-lg mb-5">進行中活動</h2>
        <div className="space-y-3">
          {campaigns.filter(c => c.status === 'active').map(c => {
            const pct = Math.min(100, Math.round(c.spent / c.budget * 100))
            return (
              <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#F8F9FA] transition-colors border border-transparent hover:border-[#E2DDD4]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-[#1A1A18]">{c.name}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="h-1.5 bg-[#F5F0E8] rounded-full overflow-hidden">
                    <div className="h-full bg-[#C8522A] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-[#1A1A18]">{formatCurrency(c.gmv)}</div>
                  <div className="text-[10px] font-bold text-[#8C8880] mt-0.5">{c.orders} 筆訂單</div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
      
    </div>
  )
}