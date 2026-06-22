import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { monthlyGmv, platformDist, kocs } from './mock'
import { formatCurrency } from './lib/utils'
import { TrendingUp, ShoppingBag } from 'lucide-react'

// 🟢 內建品牌高質感 UI
function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-[2rem] border border-[#E2DDD4] shadow-sm p-8 ${className}`}>{children}</div>
}

function StatCard({ label, value, sub, icon: Icon, trend }) {
  return (
    <Card className="flex flex-col justify-between hover:border-[#B89B6A] transition-colors p-8">
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-bold text-[#8C8880] tracking-wider">{label}</span>
        <div className="p-3 bg-[#F5F0E8] text-[#1A1A18] rounded-2xl">
          <Icon size={20} strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <div className="text-4xl font-black text-[#1A1A18] font-sans tracking-tight">{value}</div>
        {sub && (
          <div className="flex items-center gap-2 mt-3">
            <span className={`text-xs font-bold px-2 py-1 rounded-md ${trend === 'up' ? 'bg-[#FDF0ED] text-[#C8522A]' : 'bg-[#F8F9FA] text-[#8C8880]'}`}>
              {sub}
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}

// 🟢 覆寫原本的五顏六色，改用品牌色系來繪製圓餅圖
const PIE_COLORS = ['#1A1A18', '#C8522A', '#8C8880', '#D8D4CC'];

export default function Analytics() {
  const totalGmv = monthlyGmv.reduce((s, m) => s + m.gmv, 0)
  const totalOrders = monthlyGmv.reduce((s, m) => s + m.orders, 0)

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 🟢 頂部 KPI 卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard label="6 個月總 GMV" value={formatCurrency(totalGmv)} icon={TrendingUp} trend="up" sub="持續成長中" />
        <StatCard label="6 個月總訂單數" value={totalOrders.toLocaleString()} icon={ShoppingBag} trend="up" sub="環比 +18%" />
      </div>

      {/* 🟢 圖表區塊 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 長條圖: 每月訂單數 */}
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-serif font-bold text-[#1A1A18] flex items-center gap-3 mb-8">
            <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block"></span>
            每月訂單數
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyGmv} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#8C8880', fontWeight: 'bold' }} axisLine={false} tickLine={false} dy={10} />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: '#F8F9FA' }}
                contentStyle={{ borderRadius: '16px', border: '1px solid #E2DDD4', boxShadow: '0 8px 30px rgba(26,26,24,0.08)', fontSize: 13, fontWeight: 'bold', color: '#1A1A18' }} 
                itemStyle={{ color: '#C8522A' }}
              />
              <Bar dataKey="orders" fill="#C8522A" radius={[8, 8, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 圓餅圖: 平台分佈 */}
        <Card>
          <h2 className="text-xl font-serif font-bold text-[#1A1A18] flex items-center gap-3 mb-8">
            <span className="w-1.5 h-6 bg-[#1A1A18] rounded-full inline-block"></span>
            平台分佈
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie 
                data={platformDist} 
                dataKey="value" 
                cx="50%" 
                cy="45%" 
                outerRadius={85} 
                innerRadius={50} // 改成環形圖更有質感
                stroke="none"
                label={({ name, value }) => `${value}%`} 
                labelLine={false} 
                fontSize={12}
                fontWeight="bold"
              >
                {platformDist.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend 
                iconType="circle" 
                iconSize={10} 
                wrapperStyle={{ fontSize: 12, fontWeight: 'bold', color: '#8C8880', paddingTop: '20px' }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* 🟢 KOC GMV 排名 */}
      <Card>
        <h2 className="text-xl font-serif font-bold text-[#1A1A18] flex items-center gap-3 mb-8">
          <span className="w-1.5 h-6 bg-[#8C8880] rounded-full inline-block"></span>
          KOC 業績排名
        </h2>
        <div className="space-y-5">
          {[...kocs].sort((a, b) => b.gmv - a.gmv).map((k, i) => {
            const pct = Math.round(k.gmv / kocs[0].gmv * 100)
            return (
              <div key={k.id} className="flex items-center gap-5 p-3 -mx-3 rounded-2xl hover:bg-[#F8F9FA] transition-colors cursor-default">
                {/* 排名數字 (前三名焦糖橘強調) */}
                <span className={`w-8 text-center text-sm font-black ${i < 3 ? 'text-[#C8522A]' : 'text-[#8C8880]'}`}>
                  {i + 1}
                </span>
                
                {/* KOC 資訊 */}
                <div className="w-32 shrink-0">
                  <div className="text-sm font-bold text-[#1A1A18] truncate">{k.name}</div>
                  <div className="text-[11px] font-bold text-[#8C8880] font-mono tracking-wider mt-0.5">{k.platform}</div>
                </div>

                {/* 進度條 */}
                <div className="flex-1 h-2.5 bg-[#F5F0E8] rounded-full overflow-hidden">
                  <div className="h-full bg-[#C8522A] rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                </div>

                {/* 業績金額 */}
                <span className="text-sm font-black text-[#1A1A18] w-28 text-right">
                  {formatCurrency(k.gmv)}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

    </div>
  )
}