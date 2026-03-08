import { TrendingUp, Users, FileText, Percent } from 'lucide-react'
import { StatCard, Card, Badge, ProgressBar, Avatar } from '@/components/ui'
import { campaigns, kocs, monthlyGmv } from '@/data/mock'
import { formatCurrency, formatNumber, formatPct, budgetUsedPct } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-ink text-white text-xs rounded-lg px-3 py-2 shadow-lift">
      <div className="text-white/60 mb-0.5">{label}</div>
      <div className="font-mono font-semibold">{formatCurrency(payload[0].value)}</div>
    </div>
  )
}

export default function Overview() {
  const topKocs = [...kocs].filter(k => k.gmv > 0).sort((a, b) => b.gmv - a.gmv).slice(0, 5)
  const activeCampaigns = campaigns.filter(c => c.status === 'active')

  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="本月 GMV"
          value={formatCurrency(246800)}
          sub="+18.4% vs 上月"
          trend="up"
          icon={TrendingUp}
          accent="text-brand"
          delay={0}
        />
        <StatCard
          label="活躍 KOC"
          value="24"
          sub="+3 本週新增"
          trend="up"
          icon={Users}
          accent="text-blue-500"
          delay={80}
        />
        <StatCard
          label="累計貼文"
          value="186"
          sub="+22 本週"
          trend="up"
          icon={FileText}
          accent="text-violet-500"
          delay={160}
        />
        <StatCard
          label="平均轉換率"
          value="16.8%"
          sub="-0.3% vs 上月"
          trend="down"
          icon={Percent}
          accent="text-emerald-500"
          delay={240}
        />
      </div>

      {/* Charts + activity row */}
      <div className="grid grid-cols-5 gap-6">
        {/* GMV Area Chart */}
        <Card className="col-span-3 p-6 animate-fadeUp animate-delay-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="font-display font-bold text-ink">GMV 月趨勢</div>
              <div className="text-xs text-ink-faint mt-0.5">近 6 個月</div>
            </div>
            <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">+128% YoY</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthlyGmv} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D97706" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#D97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#A8A5A0' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A8A5A0' }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#D97706', strokeWidth: 1, strokeDasharray: '4 2' }} />
              <Area
                type="monotone"
                dataKey="gmv"
                stroke="#D97706"
                strokeWidth={2}
                fill="url(#gmvGrad)"
                dot={{ fill: '#D97706', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#D97706', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Top KOC ranking */}
        <Card className="col-span-2 p-6 animate-fadeUp animate-delay-300">
          <div className="font-display font-bold text-ink mb-5">KOC 績效排行</div>
          <div className="space-y-4">
            {topKocs.map((k, i) => (
              <div key={k.id} className="flex items-center gap-3">
                <span className="text-xs font-mono text-ink-faint w-4 text-center">{i + 1}</span>
                <Avatar name={k.avatar} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{k.name}</div>
                  <div className="text-xs text-ink-faint">{k.posts} 篇貼文</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold text-ink">{formatCurrency(k.gmv)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Active campaigns */}
      <Card className="p-6 animate-fadeUp animate-delay-400">
        <div className="flex items-center justify-between mb-5">
          <div className="font-display font-bold text-ink">進行中的活動</div>
          <a href="/campaigns" className="text-xs text-brand font-semibold hover:underline">查看全部 →</a>
        </div>
        <div className="divide-y divide-surface-200">
          {activeCampaigns.map(c => (
            <div key={c.id} className="flex items-center gap-6 py-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink">{c.name}</div>
                <div className="text-xs text-ink-faint mt-0.5">截止 {c.endDate} · {c.kocCount} KOC · {c.orders} 訂單</div>
              </div>
              <div className="w-32 hidden md:block">
                <div className="flex justify-between text-xs text-ink-faint mb-1.5">
                  <span>預算</span>
                  <span>{budgetUsedPct(c.spent, c.budget)}%</span>
                </div>
                <ProgressBar value={budgetUsedPct(c.spent, c.budget)} />
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-sm font-mono font-semibold text-ink">{formatCurrency(c.gmv)}</div>
                <div className="text-xs text-ink-faint">GMV</div>
              </div>
              <Badge status={c.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
