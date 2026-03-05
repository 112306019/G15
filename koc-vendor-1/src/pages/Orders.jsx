import { useState } from 'react'
import { Search } from 'lucide-react'
import { orders } from '@/data/mock'
import { Badge, Card, StatCard } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { ShoppingBag, TrendingUp, RefreshCw } from 'lucide-react'

const statusFilters = ['all', 'paid', 'processing', 'refunded']
const statusLabels  = { all: '全部', paid: '已付款', processing: '處理中', refunded: '已退款' }

export default function Orders() {
  const [filter, setFilter]   = useState('all')
  const [search, setSearch]   = useState('')

  const filtered = orders.filter(o => {
    const matchStatus = filter === 'all' || o.status === filter
    const matchSearch = !search || o.id.includes(search) || o.kocName.includes(search) || o.code.includes(search.toUpperCase())
    return matchStatus && matchSearch
  })

  const totalGmv    = orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.amount, 0)
  const totalOrders = orders.filter(o => o.status !== 'refunded').length
  const refundCount = orders.filter(o => o.status === 'refunded').length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="有效訂單 GMV" value={formatCurrency(totalGmv)} icon={TrendingUp} accent="text-brand" />
        <StatCard label="總訂單數"     value={totalOrders}               icon={ShoppingBag} accent="text-blue-500" />
        <StatCard label="退款筆數"     value={refundCount}               icon={RefreshCw}   accent="text-red-400" />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {statusFilters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                filter === f
                  ? 'bg-ink text-white'
                  : 'bg-white border border-surface-200 text-ink-muted hover:text-ink'
              }`}
            >
              {statusLabels[f]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-surface-200 rounded-lg px-3 py-2 w-56 focus-within:border-brand transition-colors">
          <Search size={14} className="text-ink-faint" />
          <input
            type="text"
            placeholder="訂單編號 / 優惠碼..."
            className="bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none w-full"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 text-left">
                {['訂單編號', 'KOC', '優惠碼', '商品', '金額', '日期', '狀態'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-ink-faint uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(o => (
                <tr key={o.id} className="border-b border-surface-200 hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-sm text-brand font-semibold">{o.id}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-ink">{o.kocName}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs bg-surface-100 border border-surface-300 rounded-md px-2 py-1 text-ink-muted tracking-wider">
                      {o.code}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-muted max-w-[200px] truncate">{o.product}</td>
                  <td className="px-4 py-3.5 font-mono text-sm font-semibold text-ink">{formatCurrency(o.amount)}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-ink-faint">{o.date}</td>
                  <td className="px-4 py-3.5"><Badge status={o.status} /></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-ink-faint">找不到符合條件的訂單</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
