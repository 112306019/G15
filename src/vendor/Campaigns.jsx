import { useState } from 'react'
import { Plus, Calendar, Users, TrendingUp } from 'lucide-react'
import { campaigns as initial } from './mock'
import { Card, Badge, Button, Modal, Input, Select, ProgressBar } from './components/ui'
import { formatCurrency, budgetUsedPct, cn } from './lib/utils'

export default function Campaigns() {
  const [items, setItems] = useState(initial)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', budget: '', discount: '', startDate: '', endDate: '', description: '' })

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  function handleCreate() {
    setItems(prev => [...prev, { ...form, id: `c${Date.now()}`, status: 'active', spent: 0, kocCount: 0, orders: 0, gmv: 0, conversion: 0 }])
    setModal(false)
    setForm({ name: '', budget: '', discount: '', startDate: '', endDate: '', description: '' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button variant="brand" onClick={() => setModal(true)}><Plus size={15} />建立活動</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {items.map(c => {
          const pct = budgetUsedPct(c.spent, c.budget)
          return (
            <Card key={c.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{c.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>
                </div>
                <Badge status={c.status} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'GMV', value: formatCurrency(c.gmv) },
                  { label: '訂單', value: c.orders },
                  { label: 'KOC 數', value: c.kocCount },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-400 mb-1">{label}</div>
                    <div className="font-bold text-sm text-slate-800">{value}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
                  <span>預算使用 {pct}%</span>
                  <span>{formatCurrency(c.spent)} / {formatCurrency(c.budget)}</span>
                </div>
                <ProgressBar value={pct} />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <Calendar size={10} /> {c.startDate} – {c.endDate}
              </div>
            </Card>
          )
        })}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="建立新活動">
        <div className="space-y-4">
          <Input label="活動名稱" value={form.name} onChange={set('name')} placeholder="例：夏季保養活動" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="總預算 (NT$)" type="number" value={form.budget} onChange={set('budget')} placeholder="50000" />
            <Input label="KOC 折扣 (%)" type="number" value={form.discount} onChange={set('discount')} placeholder="15" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="開始日期" type="date" value={form.startDate} onChange={set('startDate')} />
            <Input label="結束日期" type="date" value={form.endDate} onChange={set('endDate')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">活動說明</label>
            <textarea rows={3} value={form.description} onChange={set('description')} placeholder="描述活動目標與推廣商品..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setModal(false)} className="flex-1">取消</Button>
            <Button variant="brand" onClick={handleCreate} className="flex-1">建立活動</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
