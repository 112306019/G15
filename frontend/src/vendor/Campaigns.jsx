import React, { useState } from 'react'
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
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 🟢 頂部標題與操作區 */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block"></span>
          行銷活動管理
        </h2>
        <Button variant="brand" onClick={() => setModal(true)} className="gap-2 px-6">
          <Plus size={16} /> 建立新活動
        </Button>
      </div>

      {/* 🟢 活動卡片網格 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map(c => {
          const pct = budgetUsedPct(c.spent, c.budget)
          return (
            <Card key={c.id} hoverable className="p-8 flex flex-col gap-6">
              
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg text-[#1A1A18] mb-1">{c.name}</h3>
                  <p className="text-xs font-medium text-[#8C8880] leading-relaxed line-clamp-2">{c.description}</p>
                </div>
                <Badge status={c.status} />
              </div>

              {/* 數據統計區塊 */}
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: '累積 GMV', value: formatCurrency(c.gmv) },
                  { label: '帶來訂單', value: c.orders },
                  { label: '參與 KOC', value: c.kocCount },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-4">
                    <div className="text-[11px] font-bold text-[#8C8880] mb-1.5 uppercase tracking-widest">{label}</div>
                    <div className="font-black text-sm text-[#1A1A18]">{value}</div>
                  </div>
                ))}
              </div>

              {/* 預算進度條 */}
              <div>
                <div className="flex justify-between text-[11px] font-bold text-[#8C8880] mb-2">
                  <span>預算使用率 <span className="text-[#C8522A]">{pct}%</span></span>
                  <span className="font-mono">{formatCurrency(c.spent)} / {formatCurrency(c.budget)}</span>
                </div>
                <ProgressBar value={pct} />
              </div>

              {/* 日期標示 */}
              <div className="flex items-center gap-2 text-xs font-bold text-[#8C8880] bg-[#F5F0E8]/50 w-fit px-3 py-1.5 rounded-lg border border-[#E2DDD4]">
                <Calendar size={14} className="text-[#C8522A]" /> 
                {c.startDate} <span className="text-[#E2DDD4] mx-1">|</span> {c.endDate}
              </div>

            </Card>
          )
        })}
      </div>

      {/* 🟢 建立活動彈出視窗 (自動套用 index.jsx 的高級 Modal) */}
      <Modal open={modal} onClose={() => setModal(false)} title="建立行銷活動">
        <div className="space-y-6">
          <Input label="活動名稱 *" value={form.name} onChange={set('name')} placeholder="例：夏季防曬大作戰" />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="總預算 (NT$) *" type="number" value={form.budget} onChange={set('budget')} placeholder="50000" />
            <Input label="預設折扣 (%) *" type="number" value={form.discount} onChange={set('discount')} placeholder="15" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="開始日期 *" type="date" value={form.startDate} onChange={set('startDate')} />
            <Input label="結束日期 *" type="date" value={form.endDate} onChange={set('endDate')} />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#8C8880] uppercase tracking-widest">活動說明</label>
            <textarea rows={4} value={form.description} onChange={set('description')} placeholder="描述活動目標與推廣重點..."
              className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl px-5 py-4 text-sm text-[#1A1A18] placeholder:text-[#8C8880]/50 outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all resize-none font-medium" />
          </div>
          
          <div className="flex gap-4 pt-6 border-t border-[#E2DDD4]">
            <Button variant="outline" onClick={() => setModal(false)} className="flex-1">取消</Button>
            <Button variant="brand" onClick={handleCreate} className="flex-[2]">建立活動</Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}