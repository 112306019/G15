import { useState } from 'react'
import { orders } from './mock'
import { Card, Badge } from './components/ui'
import { formatCurrency, cn } from './lib/utils'

const statusFilters = ['全部', 'paid', 'processing', 'refunded']
const statusLabels = { 全部: '全部', paid: '已付款', processing: '處理中', refunded: '已退款' }

export default function Orders() {
  const [filter, setFilter] = useState('全部')
  const filtered = filter === '全部' ? orders : orders.filter(o => o.status === filter)

  const total = filtered.reduce((s, o) => s + o.amount, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {statusFilters.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={cn(
              'px-4 py-1.5 rounded-xl text-sm font-semibold transition-all',
              filter === s ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-slate-800',
            )}>{statusLabels[s]}</button>
          ))}
        </div>
        <div className="ml-auto text-sm font-bold text-slate-800">
          共 {filtered.length} 筆 · {formatCurrency(total)}
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['訂單編號', 'KOC', '優惠碼', '商品', '金額', '日期', '狀態'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">{o.id}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">{o.kocName}</td>
                  <td className="px-4 py-3 text-xs font-mono text-amber-600 font-semibold">{o.code}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{o.product}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-800">{formatCurrency(o.amount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{o.date}</td>
                  <td className="px-4 py-3"><Badge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
