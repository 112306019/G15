import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, ShoppingBag, DollarSign } from 'lucide-react'
import { campaigns, kocs, monthlyGmv } from './mock'
import { StatCard, Card, Badge, Avatar } from './components/ui'
import { formatCurrency } from './lib/utils'

export default function Overview() {
  const totalGmv = campaigns.reduce((s, c) => s + c.gmv, 0)
  const totalOrders = campaigns.reduce((s, c) => s + c.orders, 0)
  const activeKocs = kocs.filter(k => k.status === 'active').length

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="總 GMV" value={formatCurrency(totalGmv)} sub="本季累計" trend="up" icon={DollarSign} />
        <StatCard label="總訂單數" value={totalOrders} sub="本季累計" trend="up" icon={ShoppingBag} />
        <StatCard label="活躍 KOC" value={activeKocs} sub="共 7 位夥伴" icon={Users} />
        <StatCard label="進行中活動" value={campaigns.filter(c => c.status === 'active').length} sub="個活動" icon={TrendingUp} />
      </div>

      {/* GMV chart + KOC ranking */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-slate-800">GMV 趨勢</h2>
              <p className="text-xs text-gray-400 mt-0.5">近 6 個月</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyGmv} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
              <Area type="monotone" dataKey="gmv" stroke="#f59e0b" strokeWidth={2} fill="url(#gmvGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* KOC ranking */}
        <Card className="p-6">
          <h2 className="font-bold text-slate-800 mb-4">KOC 業績排名</h2>
          <div className="space-y-3">
            {[...kocs].sort((a, b) => b.gmv - a.gmv).slice(0, 5).map((k, i) => (
              <div key={k.id} className="flex items-center gap-3">
                <span className={`text-xs font-black w-5 text-center ${i < 3 ? 'text-amber-500' : 'text-gray-300'}`}>{i + 1}</span>
                <Avatar name={k.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">{k.name}</div>
                  <div className="text-[10px] text-gray-400 truncate">{k.platform}</div>
                </div>
                <span className="text-xs font-bold text-slate-700">{formatCurrency(k.gmv)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Active campaigns */}
      <Card className="p-6">
        <h2 className="font-bold text-slate-800 mb-4">進行中活動</h2>
        <div className="space-y-3">
          {campaigns.filter(c => c.status === 'active').map(c => {
            const pct = Math.min(100, Math.round(c.spent / c.budget * 100))
            return (
              <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                    <Badge status={c.status} />
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-800">{formatCurrency(c.gmv)}</div>
                  <div className="text-[10px] text-gray-400">{c.orders} 筆訂單</div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
