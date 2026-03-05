import { Card, StatCard } from '@/components/ui'
import { monthlyGmv, platformDist, kocs } from '@/data/mock'
import { formatCurrency, formatPct, formatNumber } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, Tag, Users } from 'lucide-react'

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-ink text-white text-xs rounded-lg px-3 py-2 shadow-lift">
      <div className="text-white/60 mb-0.5">{label}</div>
      <div className="font-mono font-semibold">{formatCurrency(payload[0].value)}</div>
    </div>
  )
}

export default function Analytics() {
  const topKocs = [...kocs].sort((a, b) => b.gmv - a.gmv).slice(0, 5)

  const codeUsageData = kocs.map(k => ({
    name: k.name,
    orders: k.posts * 3 + Math.floor(Math.random() * 5),
    gmv: k.gmv,
  }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="累計 GMV"     value={formatCurrency(789800)} sub="+128% YoY" trend="up" icon={TrendingUp} accent="text-brand" />
        <StatCard label="優惠碼使用率" value="73.4%"                  sub="+5.2% vs 上月" trend="up" icon={Tag} accent="text-violet-500" />
        <StatCard label="KOC 留存率"   value="81.2%"                  sub="+2.1% vs 上月" trend="up" icon={Users} accent="text-blue-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-5 gap-6">
        {/* GMV Bar Chart */}
        <Card className="col-span-3 p-6">
          <div className="font-display font-bold text-ink mb-1">GMV 月趨勢</div>
          <div className="text-xs text-ink-faint mb-6">近 6 個月</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyGmv} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#A8A5A0' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A8A5A0' }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f5f4f0' }} />
              <Bar dataKey="gmv" fill="#D97706" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Platform Pie */}
        <Card className="col-span-2 p-6">
          <div className="font-display font-bold text-ink mb-1">平台分佈</div>
          <div className="text-xs text-ink-faint mb-4">KOC 平台比例</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={platformDist}
                dataKey="pct"
                nameKey="platform"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={76}
                paddingAngle={3}
              >
                {platformDist.map(p => <Cell key={p.platform} fill={p.color} />)}
              </Pie>
              <Tooltip formatter={v => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {platformDist.map(p => (
              <div key={p.platform} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <span className="text-ink-muted">{p.platform}</span>
                </div>
                <span className="font-mono font-semibold text-ink">{p.pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* KOC GMV ranking table */}
      <Card className="p-6">
        <div className="font-display font-bold text-ink mb-5">KOC GMV 排行</div>
        <div className="space-y-3">
          {topKocs.map((k, i) => {
            const maxGmv = topKocs[0].gmv
            const pct = maxGmv ? (k.gmv / maxGmv) * 100 : 0
            return (
              <div key={k.id} className="flex items-center gap-4">
                <span className="text-xs font-mono text-ink-faint w-4">{i + 1}</span>
                <div className="w-28 text-sm font-semibold text-ink truncate">{k.name}</div>
                <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm font-mono font-semibold text-ink w-28 text-right">{formatCurrency(k.gmv)}</span>
                <span className="text-xs text-ink-faint w-16 text-right">{formatNumber(k.followers)} 粉絲</span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
