import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { monthlyGmv, platformDist, kocs } from './mock'
import { Card, StatCard } from './components/ui'
import { formatCurrency } from './lib/utils'
import { TrendingUp, ShoppingBag } from 'lucide-react'

export default function Analytics() {
  const totalGmv = monthlyGmv.reduce((s, m) => s + m.gmv, 0)
  const totalOrders = monthlyGmv.reduce((s, m) => s + m.orders, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="6 個月總 GMV" value={formatCurrency(totalGmv)} icon={TrendingUp} trend="up" sub="持續成長中" />
        <StatCard label="6 個月總訂單數" value={totalOrders} icon={ShoppingBag} trend="up" sub="環比 +18%" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Bar chart */}
        <Card className="col-span-2 p-6">
          <h2 className="font-bold text-slate-800 mb-5">每月訂單數</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyGmv} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
              <Bar dataKey="orders" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie chart */}
        <Card className="p-6">
          <h2 className="font-bold text-slate-800 mb-5">平台分佈</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={platformDist} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${value}%`} labelLine={false} fontSize={11}>
                {platformDist.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* KOC GMV ranking */}
      <Card className="p-6">
        <h2 className="font-bold text-slate-800 mb-4">KOC GMV 排名</h2>
        <div className="space-y-3">
          {[...kocs].sort((a, b) => b.gmv - a.gmv).map((k, i) => {
            const pct = Math.round(k.gmv / kocs[0].gmv * 100)
            return (
              <div key={k.id} className="flex items-center gap-4">
                <span className="w-5 text-center text-xs font-black text-gray-300">{i + 1}</span>
                <div className="w-24 shrink-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{k.name}</div>
                  <div className="text-[10px] text-gray-400">{k.platform}</div>
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-bold text-slate-700 w-24 text-right">{formatCurrency(k.gmv)}</span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
