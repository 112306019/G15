import { useState } from 'react'
import { Plus, Calendar, Users, ShoppingBag, TrendingUp } from 'lucide-react'
import { campaigns as initialCampaigns } from '@/data/mock'
import { Badge, Button, Card, Modal, Input, Select, ProgressBar, StatCard } from '@/components/ui'
import { formatCurrency, formatPct, budgetUsedPct } from '@/lib/utils'

const statusFilters = [
  { value: 'all',    label: '全部' },
  { value: 'active', label: '進行中' },
  { value: 'draft',  label: '草稿' },
  { value: 'ended',  label: '已結束' },
]

function CampaignCard({ c }) {
  const pct = budgetUsedPct(c.spent, c.budget)
  return (
    <Card hoverable className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-ink text-base leading-tight">{c.name}</h3>
          <p className="text-xs text-ink-faint mt-1 line-clamp-2">{c.description}</p>
        </div>
        <Badge status={c.status} className="shrink-0" />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { icon: Users,       val: c.kocCount,             label: 'KOC' },
          { icon: ShoppingBag, val: c.orders,               label: '訂單' },
          { icon: TrendingUp,  val: formatPct(c.conversion), label: '轉換率' },
        ].map(({ icon: Icon, val, label }) => (
          <div key={label} className="bg-surface-100 rounded-lg py-2.5 px-2">
            <div className="text-base font-mono font-semibold text-ink">{val}</div>
            <div className="text-[10px] text-ink-faint mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between text-xs text-ink-muted mb-2">
          <span>預算使用 {formatCurrency(c.spent)} / {formatCurrency(c.budget)}</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <ProgressBar
          value={pct}
          color={pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-amber-500' : 'bg-brand'}
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-xs text-ink-faint">
          <Calendar size={12} />
          <span>{c.startDate} — {c.endDate}</span>
        </div>
        <div className="text-sm font-mono font-semibold text-ink">{formatCurrency(c.gmv)}</div>
      </div>
    </Card>
  )
}

function NewCampaignModal({ open, onClose }) {
  const [form, setForm] = useState({ name: '', budget: '', discount: '', startDate: '', endDate: '', description: '' })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title="建立新活動" size="md">
      <div className="space-y-4">
        <Input label="活動名稱" placeholder="例：夏季新品推廣" value={form.name} onChange={set('name')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="總預算 (NT$)" type="number" placeholder="50000" value={form.budget} onChange={set('budget')} />
          <Input label="KOC 優惠折扣 (%)" type="number" placeholder="15" value={form.discount} onChange={set('discount')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="開始日期" type="date" value={form.startDate} onChange={set('startDate')} />
          <Input label="截止日期" type="date" value={form.endDate} onChange={set('endDate')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">活動描述</label>
          <textarea
            rows={3}
            placeholder="描述這個活動的目標與重點..."
            className="w-full bg-surface-100 border border-surface-300 rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all resize-none"
            value={form.description}
            onChange={set('description')}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button variant="brand" className="flex-[2]" onClick={onClose}>
            <Plus size={15} /> 建立活動
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Campaigns() {
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(false)

  const filtered = filter === 'all'
    ? initialCampaigns
    : initialCampaigns.filter(c => c.status === filter)

  const totalGmv   = initialCampaigns.reduce((s, c) => s + c.gmv, 0)
  const totalOrders = initialCampaigns.reduce((s, c) => s + c.orders, 0)
  const activeCount = initialCampaigns.filter(c => c.status === 'active').length

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="總 GMV" value={formatCurrency(totalGmv)} icon={TrendingUp} accent="text-brand" />
        <StatCard label="活躍活動" value={activeCount} icon={Calendar} accent="text-blue-500" />
        <StatCard label="總訂單數" value={totalOrders} icon={ShoppingBag} accent="text-violet-500" />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                filter === f.value
                  ? 'bg-ink text-white'
                  : 'bg-white border border-surface-200 text-ink-muted hover:text-ink hover:border-surface-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button variant="brand" onClick={() => setModal(true)}>
          <Plus size={15} /> 新增活動
        </Button>
      </div>

      {/* Campaign grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(c => <CampaignCard key={c.id} c={c} />)}
      </div>

      <NewCampaignModal open={modal} onClose={() => setModal(false)} />
    </div>
  )
}
