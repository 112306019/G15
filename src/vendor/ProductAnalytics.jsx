import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import { products, campaigns } from './mock'
import { Card, StatCard, Badge } from './components/ui'
import { formatCurrency, cn } from './lib/utils'
import { TrendingUp, ShoppingBag, Package, Tag, ArrowUpRight, ArrowDownRight } from 'lucide-react'

// ─── 模擬每月各商品銷售量 ──────────────────────────────────────────────────────
const monthlySales = [
  { month: '10月', p1: 42, p2: 28, p3: 35, p4: 0,  p5: 0, p6: 12 },
  { month: '11月', p1: 55, p2: 31, p3: 48, p4: 0,  p5: 0, p6: 18 },
  { month: '12月', p1: 78, p2: 44, p3: 62, p4: 0,  p5: 0, p6: 22 },
  { month: '1月',  p1: 61, p2: 38, p3: 55, p4: 8,  p5: 0, p6: 14 },
  { month: '2月',  p1: 44, p2: 20, p3: 42, p4: 22, p5: 0, p6: 9  },
  { month: '3月',  p1: 32, p2: 15, p3: 62, p4: 14, p5: 0, p6: 14 },
]

const categoryColors = {
  '保養組合': '#f59e0b',
  '防曬':     '#3b82f6',
  '禮盒':     '#ec4899',
  '精華液':   '#8b5cf6',
  '化妝水':   '#10b981',
}

export default function ProductAnalytics() {
  const [selected, setSelected] = useState(null)

  const listedProducts = products.filter(p => p.status === 'listed')

  // 各商品 GMV
  const productGmv = products.map(p => ({
    name: p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name,
    fullName: p.name,
    gmv: p.price * p.sold,
    sold: p.sold,
    id: p.id,
  })).sort((a, b) => b.gmv - a.gmv)

  // 各類別佔比
  const categoryData = Object.entries(
    products.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.price * p.sold
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  // 總計
  const totalGmv  = products.reduce((s, p) => s + p.price * p.sold, 0)
  const totalSold = products.reduce((s, p) => s + p.sold, 0)
  const avgPrice  = listedProducts.length
    ? Math.round(listedProducts.reduce((s, p) => s + p.price, 0) / listedProducts.length)
    : 0

  const selProduct = selected ? products.find(p => p.id === selected) : null

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="商品總 GMV"   value={formatCurrency(totalGmv)}  icon={TrendingUp}  trend="up" sub="累計" />
        <StatCard label="累計銷售量"   value={`${totalSold} 件`}          icon={ShoppingBag} trend="up" sub="累計" />
        <StatCard label="上架商品數"   value={listedProducts.length}       icon={Package} />
        <StatCard label="平均售價"     value={formatCurrency(avgPrice)}    icon={Tag} />
      </div>

      {/* GMV 排行 + 類別佔比 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-6">
          <h2 className="font-bold text-slate-800 mb-5">商品 GMV 排行</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={productGmv} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v, n, props) => [formatCurrency(v), 'GMV']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
              <Bar dataKey="gmv" radius={[6, 6, 0, 0]}
                fill="#f59e0b"
                onClick={(d) => setSelected(d.id === selected ? null : d.id)}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold text-slate-800 mb-5">類別 GMV 佔比</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={70}
                label={({ name, percent }) => `${Math.round(percent * 100)}%`}
                labelLine={false} fontSize={11}>
                {categoryData.map((e, i) => (
                  <Cell key={i} fill={categoryColors[e.name] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* 月銷售趨勢 */}
      <Card className="p-6">
        <h2 className="font-bold text-slate-800 mb-5">月銷售量趨勢</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlySales} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
            {['p1','p2','p3','p4','p6'].map((key, i) => {
              const colors = ['#f59e0b','#3b82f6','#10b981','#ec4899','#8b5cf6']
              const prod = products.find(p => p.id === key)
              return (
                <Line key={key} type="monotone" dataKey={key} name={prod?.name ?? key}
                  stroke={colors[i]} strokeWidth={2} dot={false} />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* 商品列表 */}
      <Card className="p-6">
        <h2 className="font-bold text-slate-800 mb-4">商品銷售明細</h2>
        <div className="space-y-3">
          {products.map(p => {
            const gmv     = p.price * p.sold
            const soldPct = p.stock + p.sold > 0 ? Math.round(p.sold / (p.stock + p.sold) * 100) : 0
            const isSelected = selected === p.id
            return (
              <div key={p.id}
                onClick={() => setSelected(isSelected ? null : p.id)}
                className={cn(
                  'p-4 rounded-xl border cursor-pointer transition-all',
                  isSelected ? 'border-amber-400 bg-amber-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                )}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl shrink-0">
                    {p.thumbnail}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-800 truncate">{p.name}</span>
                      <Badge status={p.status} />
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${soldPct}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-right shrink-0">
                    {[
                      { label: '售價',   value: formatCurrency(p.price) },
                      { label: '已售',   value: `${p.sold} 件` },
                      { label: 'GMV',    value: formatCurrency(gmv) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div className="text-[10px] text-gray-400">{label}</div>
                        <div className="text-sm font-bold text-slate-800">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 展開明細 */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-amber-200 grid grid-cols-4 gap-4">
                    {[
                      { label: '原價',     value: formatCurrency(p.originalPrice) },
                      { label: '折扣',     value: `${Math.round((1 - p.price / p.originalPrice) * 100)}%` },
                      { label: '剩餘庫存', value: `${p.stock} 件` },
                      { label: 'KOC 折扣', value: `${p.kocDiscount}%` },
                      { label: '類別',     value: p.category },
                      { label: 'SKU',      value: p.sku },
                      { label: '上架日期', value: p.createdAt },
                      { label: '加入活動', value: p.campaigns.length ? `${p.campaigns.length} 個` : '無' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white rounded-xl p-3 border border-amber-100">
                        <div className="text-[10px] text-gray-400 mb-0.5">{label}</div>
                        <div className="text-sm font-bold text-slate-700">{value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}