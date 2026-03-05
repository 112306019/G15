import { useState } from 'react'
import { Search, Copy, Check, ExternalLink } from 'lucide-react'
import { kocs } from '@/data/mock'
import { Badge, Card, Avatar, Button, StatCard } from '@/components/ui'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import { Users, TrendingUp, FileText } from 'lucide-react'

const platformColors = {
  Instagram: { text: 'text-pink-600',  bg: 'bg-pink-50',  dot: 'bg-pink-500' },
  TikTok:    { text: 'text-teal-600',  bg: 'bg-teal-50',  dot: 'bg-teal-500' },
  YouTube:   { text: 'text-red-600',   bg: 'bg-red-50',   dot: 'bg-red-500'  },
}

function CouponCode({ code }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 font-mono text-xs font-semibold bg-surface-100 hover:bg-surface-200 border border-surface-300 rounded-md px-2.5 py-1.5 text-ink-muted hover:text-ink transition-all group"
      title="點擊複製"
    >
      <span className="tracking-wider">{code}</span>
      {copied
        ? <Check size={11} className="text-success" />
        : <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      }
    </button>
  )
}

function KocRow({ k }) {
  const pc = platformColors[k.platform] ?? {}
  return (
    <tr className="border-b border-surface-200 hover:bg-surface-50 transition-colors group">
      {/* KOC info */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <Avatar name={k.avatar} />
          <div>
            <div className="text-sm font-semibold text-ink">{k.name}</div>
            <div className="text-xs text-ink-faint">{k.handle}</div>
          </div>
        </div>
      </td>
      {/* Platform */}
      <td className="py-3.5 px-4">
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md', pc.text, pc.bg)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', pc.dot)} />
          {k.platform}
        </span>
      </td>
      {/* Followers */}
      <td className="py-3.5 px-4 font-mono text-sm text-ink-muted">{formatNumber(k.followers)}</td>
      {/* Posts */}
      <td className="py-3.5 px-4 text-sm text-ink text-center">{k.posts}</td>
      {/* GMV */}
      <td className="py-3.5 px-4 font-mono text-sm font-semibold text-ink">
        {k.gmv > 0 ? formatCurrency(k.gmv) : <span className="text-ink-faint">—</span>}
      </td>
      {/* Coupon */}
      <td className="py-3.5 px-4">
        <CouponCode code={k.code} />
      </td>
      {/* Status */}
      <td className="py-3.5 px-4">
        <Badge status={k.status} />
      </td>
      {/* Actions */}
      <td className="py-3.5 px-4">
        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-ink-faint hover:text-brand hover:bg-brand/5">
          <ExternalLink size={14} />
        </button>
      </td>
    </tr>
  )
}

const statusFilters = ['all', 'active', 'pending', 'inactive']
const statusLabels  = { all: '全部', active: '活躍', pending: '待審核', inactive: '未活躍' }

export default function KocManagement() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = kocs.filter(k => {
    const matchStatus  = filter === 'all' || k.status === filter
    const matchSearch  = !search || k.name.includes(search) || k.handle.includes(search) || k.code.includes(search.toUpperCase())
    return matchStatus && matchSearch
  })

  const totalGmv   = kocs.reduce((s, k) => s + k.gmv, 0)
  const totalPosts = kocs.reduce((s, k) => s + k.posts, 0)
  const activeKocs = kocs.filter(k => k.status === 'active').length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="活躍 KOC" value={activeKocs} icon={Users} accent="text-blue-500" />
        <StatCard label="累計 GMV" value={formatCurrency(totalGmv)} icon={TrendingUp} accent="text-brand" />
        <StatCard label="累計貼文" value={totalPosts} icon={FileText} accent="text-violet-500" />
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
            placeholder="搜尋名稱 / 優惠碼..."
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
                {['KOC', '平台', '粉絲數', '貼文', 'GMV', '優惠碼', '狀態', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-ink-faint uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0
                ? filtered.map(k => <KocRow key={k.id} k={k} />)
                : (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-sm text-ink-faint">找不到符合的 KOC</td>
                  </tr>
                )
              }
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
