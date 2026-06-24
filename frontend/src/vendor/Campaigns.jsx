import React, { useState } from 'react'
import { Plus, Calendar, Users, TrendingUp, Check, ChevronRight, ChevronLeft, Upload, Package, X, Eye, FileText, ArrowRight, Instagram, CheckCircle2, Clock } from 'lucide-react'
import { campaigns as initialCampaigns, products as initialProducts } from './mock'
import { formatCurrency, budgetUsedPct, cn } from './lib/utils'

// 🟢 內建客製化 UI 元件
function Card({ children, className = "", hoverable, onClick }) {
  return <div onClick={onClick} className={cn(`bg-white rounded-[1.5rem] border border-[#E2DDD4] shadow-sm ${hoverable ? 'hover:border-[#B89B6A] hover:shadow-[0_8px_28px_rgba(26,26,24,0.06)] transition-all cursor-pointer' : ''}`, className)}>{children}</div>
}

function Badge({ status }) {
  const cfg = {
    active: { label: '招募中', cls: 'bg-[#FDF0ED] text-[#C8522A]', dot: 'bg-[#C8522A]' },
    promo:  { label: '推廣中', cls: 'bg-[#F5F0E8] text-[#1A1A18]', dot: 'bg-[#1A1A18]' },
    closed: { label: '已結案 (已下架)', cls: 'bg-white border border-[#E2DDD4] text-[#8C8880]', dot: 'bg-[#E2DDD4]' },
  }[status] || { label: status, cls: 'bg-gray-100 text-gray-500', dot: 'bg-gray-500' }
  
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider', cfg.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />{cfg.label}
    </span>
  )
}

function Button({ variant = 'default', className, disabled, children, ...props }) {
  const variants = {
    brand: 'bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A] shadow-sm',
    outline: 'border border-[#E2DDD4] bg-white text-[#8C8880] hover:text-[#1A1A18] hover:border-[#1A1A18]',
    ghost: 'text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F8F9FA]',
    default: 'bg-[#F5F0E8] text-[#1A1A18] hover:bg-[#E2DDD4]'
  }
  return (
    <button disabled={disabled} className={cn('inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed', variants[variant], className)} {...props}>
      {children}
    </button>
  )
}

function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">{label}</label>
      <input className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all placeholder:text-[#8C8880]/50" {...props} />
    </div>
  )
}

function Thumb({ emoji, size = 'md' }) {
  const s = { sm: 'w-11 h-11 text-xl rounded-lg', md: 'w-14 h-14 text-3xl rounded-xl', lg: 'w-20 h-20 text-4xl rounded-2xl' }[size]
  return <div className={cn('bg-[#F5F0E8] border border-[#E2DDD4] flex items-center justify-center shrink-0', s)}>{emoji}</div>
}

function ProgressBar({ value }) {
  return (
    <div className="h-1.5 bg-[#F5F0E8] rounded-full overflow-hidden">
      <div className="h-full bg-[#C8522A] rounded-full transition-all duration-1000" style={{ width: `${value}%` }} />
    </div>
  )
}

// 🟢 修正後的共用 Modal 結構 (支援內部滾動與自訂標題列)
function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-[#1A1A18]/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-[#E2DDD4] animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]", maxWidth)}>
        {/* 如果有傳入 title，才渲染預設標題列 */}
        {title && (
          <div className="px-8 pt-8 pb-5 border-b border-[#E2DDD4] bg-[#F8F9FA] flex justify-between items-center shrink-0">
            <h2 className="font-serif text-2xl font-bold text-[#1A1A18]">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-full text-[#8C8880] hover:bg-[#E2DDD4] hover:text-[#1A1A18] transition-colors"><X size={18}/></button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

const STEPS = ['任務與時程', '推廣商品', '分潤與折扣', '確認發佈']

// ─── 發佈任務精靈 ────────────────────────────────────────────────────────
function CampaignWizard({ open, onClose, onComplete }) {
  const [step, setStep] = useState(0)
  const [prodMode, setProdMode] = useState('existing')
  
  const [form, setForm] = useState({ 
    name: '', budget: '', recruitEndDate: '', promoDays: '7', 
    prodId: '', prodName: '', prodPrice: '', prodStock: '', thumbnail: '📦',
    kocDiscount: ''
  })
  
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const existingProducts = [
    { id: 'p1', name: '極致保濕修護精華', price: 1200, stock: 50, thumbnail: '✨' },
    { id: 'p2', name: '夏季控油防曬乳 SPF50+', price: 850, stock: 120, thumbnail: '🌞' },
  ]

  const handleSelectProduct = (e) => {
    const selected = existingProducts.find(p => p.id === e.target.value)
    if (selected) {
      setForm(f => ({ ...f, prodId: selected.id, prodName: selected.name, prodPrice: selected.price, prodStock: selected.stock, thumbnail: selected.thumbnail }))
    } else {
      setForm(f => ({ ...f, prodId: '', prodName: '', prodPrice: '', prodStock: '', thumbnail: '📦' }))
    }
  }
  
  function finish() { 
    onComplete({ 
      ...form, 
      id: `c${Date.now()}`, 
      status: 'active', 
      spent: 0, kocCount: 0, orders: 0, gmv: 0,
      startDate: new Date().toISOString().slice(0,10),
      endDate: form.recruitEndDate || '待定'
    })
    setStep(0); setProdMode('existing');
    setForm({ name: '', budget: '', recruitEndDate: '', promoDays: '7', prodId: '', prodName: '', prodPrice: '', prodStock: '', thumbnail: '📦', kocDiscount: '' })
    onClose() 
  }

  if (!open) return null
  return (
    // 移除 Modal 預設 title，並將 maxWidth 加寬至 xl
    <Modal open={open} onClose={onClose} maxWidth="max-w-xl">
      
      {/* 🌟 客製化 Header：將標題與步驟條完美融合 */}
      <div className="px-8 pt-8 pb-5 border-b border-[#E2DDD4] bg-[#F8F9FA] shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-bold text-[#1A1A18]">發佈 KOC 專屬任務</h2>
          <button onClick={onClose} className="p-2 rounded-full text-[#8C8880] hover:bg-[#E2DDD4] hover:text-[#1A1A18] transition-colors"><X size={18}/></button>
        </div>
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all',
                i < step ? 'bg-[#C8522A] text-white' : i === step ? 'bg-[#1A1A18] text-white' : 'bg-[#E2DDD4] text-[#8C8880]')}>
                {i < step ? <Check size={12}/> : i+1}
              </div>
              <span className={cn('text-[11px] font-bold ml-2 hidden sm:block tracking-wider whitespace-nowrap', i <= step ? 'text-[#1A1A18]' : 'text-[#8C8880]')}>{s}</span>
              {i < STEPS.length-1 && <div className={cn('flex-1 h-0.5 mx-3 rounded-full', i < step ? 'bg-[#C8522A]' : 'bg-[#E2DDD4]')}/>}
            </div>
          ))}
        </div>
      </div>

      {/* 步驟內容區 (支援內部滾動) */}
      <div className="px-8 py-6 overflow-y-auto flex-1 space-y-5">
        
        {step === 0 && <>
          <Input label="任務名稱 *" value={form.name} onChange={set('name')} placeholder="例：夏季防曬大作戰" />
          <Input label="總預算 (NT$) *" type="number" value={form.budget} onChange={set('budget')} placeholder="50000" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="接案截止日期 *" type="date" value={form.recruitEndDate} onChange={set('recruitEndDate')} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">接案後推廣天數 *</label>
              <select value={form.promoDays} onChange={set('promoDays')} className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all appearance-none">
                {[...Array(8).keys()].map(d => <option key={d} value={d}>{d} 天 (自動下架)</option>)}
              </select>
            </div>
          </div>
        </>}

        {step === 1 && <>
          <div className="flex bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-1 mb-4">
            <button onClick={() => setProdMode('existing')} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", prodMode === 'existing' ? "bg-white text-[#1A1A18] shadow-sm" : "text-[#8C8880] hover:text-[#1A1A18]")}>選擇庫存商品</button>
            <button onClick={() => setProdMode('new')} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", prodMode === 'new' ? "bg-white text-[#1A1A18] shadow-sm" : "text-[#8C8880] hover:text-[#1A1A18]")}>建立新商品</button>
          </div>

          {prodMode === 'existing' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">從商品庫選擇 *</label>
              <select value={form.prodId} onChange={handleSelectProduct} className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all appearance-none">
                <option value="">請選擇要推廣的商品...</option>
                {existingProducts.map(p => <option key={p.id} value={p.id}>{p.name} (庫存: {p.stock})</option>)}
              </select>
              
              {form.prodName && (
                <div className="mt-4 flex items-center gap-4 p-4 border border-[#E2DDD4] rounded-xl bg-white">
                   <Thumb emoji={form.thumbnail} size="sm" />
                   <div>
                     <div className="font-bold text-sm text-[#1A1A18]">{form.prodName}</div>
                     <div className="text-xs text-[#8C8880] font-mono mt-0.5">售價: {formatCurrency(form.prodPrice)}</div>
                   </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-5 p-5 bg-[#F8F9FA] border border-dashed border-[#E2DDD4] rounded-2xl">
                <Thumb emoji={form.thumbnail} size="lg" />
                <button className="inline-flex items-center gap-2 text-xs font-bold text-[#1A1A18] bg-white border border-[#E2DDD4] hover:border-[#1A1A18] px-4 py-2 rounded-full transition-all"><Upload size={14}/>上傳新圖片</button>
              </div>
              <Input label="新商品名稱 *" value={form.prodName} onChange={set('prodName')} placeholder="例：極致防曬乳 SPF50+" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="商品售價 (NT$) *" type="number" value={form.prodPrice} onChange={set('prodPrice')} placeholder="1200" />
                <Input label="提供庫存 *" type="number" value={form.prodStock} onChange={set('prodStock')} placeholder="100" />
              </div>
            </>
          )}
        </>}

        {step === 2 && <>
          <Input label="粉絲專屬折扣碼優惠 (%) *" type="number" value={form.kocDiscount} onChange={set('kocDiscount')} placeholder="15" />
          <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-5 mt-4">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-[#8C8880] font-bold">粉絲結帳預估價</span>
                <span className="font-black text-[#1A1A18] text-lg">
                  {form.prodPrice && form.kocDiscount ? formatCurrency(form.prodPrice * (1 - form.kocDiscount/100)) : '—'}
                </span>
              </div>
          </div>
        </>}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-[#FDF0ED] border border-[#C8522A]/20 rounded-2xl p-5">
              <h4 className="text-xs font-black text-[#C8522A] uppercase tracking-wider mb-3 flex items-center gap-2"><Calendar size={14}/> 任務生命週期</h4>
              <div className="space-y-3 relative before:absolute before:inset-y-2 before:left-[7px] before:w-0.5 before:bg-[#C8522A]/20">
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-4 h-4 rounded-full bg-[#C8522A] border-4 border-[#FDF0ED] shrink-0 mt-0.5" />
                  <div><div className="text-sm font-bold text-[#1A1A18]">今日起</div><div className="text-xs text-[#8C8880]">開放 KOC 申請接案</div></div>
                </div>
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-4 h-4 rounded-full bg-[#C8522A] border-4 border-[#FDF0ED] shrink-0 mt-0.5" />
                  <div><div className="text-sm font-bold text-[#1A1A18]">{form.recruitEndDate || '未設定'}</div><div className="text-xs text-[#8C8880]">停止招募，開始 {form.promoDays} 天推廣期</div></div>
                </div>
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-4 h-4 rounded-full bg-[#1A1A18] border-4 border-[#FDF0ED] shrink-0 mt-0.5" />
                  <div><div className="text-sm font-black text-[#1A1A18]">推廣期結束後</div><div className="text-xs font-bold text-[#C8522A]">商品退回草稿狀態，優惠碼失效</div></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer 區塊固定在底部 */}
      <div className="px-8 py-5 border-t border-[#E2DDD4] flex gap-4 bg-[#F8F9FA] shrink-0">
        <Button variant="ghost" onClick={() => step > 0 ? setStep(s=>s-1) : onClose()} className="gap-1.5 px-6">
          <ChevronLeft size={14}/>{step === 0 ? '取消' : '上一步'}
        </Button>
        <div className="flex-1"/>
        {step < STEPS.length-1
          ? <Button variant="brand" onClick={() => setStep(s=>s+1)} disabled={step === 1 && !form.prodName} className="gap-1.5 px-8">下一步<ChevronRight size={14}/></Button>
          : <Button variant="brand" onClick={finish} className="gap-2 px-8"><Plus size={14}/>確認發佈任務</Button>
        }
      </div>
    </Modal>
  )
}

// ─── 假資料：KOC 申請名單 ──────────────────────────────────────────────────
const mockKocList = [
  { id: 1, name: '林小美', handle: '@xiaomei_beauty', platform: 'Instagram', followers: '45K', status: 'approved', orders: 12, gmv: 14400, avatar: '👩🏻' },
  { id: 2, name: '陳大頭', handle: '@bighead_chen', platform: 'TikTok', followers: '120K', status: 'pending', orders: 0, gmv: 0, avatar: '👦🏽' },
  { id: 3, name: 'Alice Wu', handle: '@alice_wuwu', platform: 'Instagram', followers: '88K', status: 'approved', orders: 35, gmv: 42000, avatar: '👱🏻‍♀️' },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Campaigns() {
  const [items, setItems] = useState(initialCampaigns)
  const [wizardOpen, setWizardOpen] = useState(false)
  
  const [selectedTask, setSelectedTask] = useState(null)
  const [showKocList, setShowKocList] = useState(false)

  const handleCreate = (newTask) => setItems(prev => [newTask, ...prev])

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block"></span>
          任務與商品總覽
        </h2>
        <Button variant="brand" onClick={() => setWizardOpen(true)} className="gap-2 px-6">
          <Plus size={16} /> 發佈 KOC 任務
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map(c => {
          const pct = budgetUsedPct(c.spent, c.budget)
          return (
            <Card key={c.id} hoverable onClick={() => setSelectedTask(c)} className="p-8 flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg text-[#1A1A18] mb-1">{c.name}</h3>
                  <div className="text-xs font-bold text-[#8C8880] flex items-center gap-2">
                    <Package size={14} /> 綁定：{c.prodName || '預設活動商品'}
                  </div>
                </div>
                <Badge status={c.status || 'active'} />
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-[#8C8880] mb-1.5 uppercase tracking-widest">GMV</div>
                  <div className="font-black text-sm text-[#1A1A18]">{formatCurrency(c.gmv)}</div>
                </div>
                <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-[#8C8880] mb-1.5 uppercase tracking-widest">訂單</div>
                  <div className="font-black text-sm text-[#1A1A18]">{c.orders}</div>
                </div>
                <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-[#8C8880] mb-1.5 uppercase tracking-widest">進度</div>
                  <div className="font-black text-sm text-[#C8522A]">{pct}%</div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <CampaignWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onComplete={handleCreate} />

      {/* 任務詳細資料 Modal */}
      {selectedTask && !showKocList && (
        <Modal open={!!selectedTask} onClose={() => setSelectedTask(null)} title="任務詳細資訊" maxWidth="max-w-2xl">
          <div className="px-8 py-6 space-y-6 overflow-y-auto flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-[#1A1A18] mb-2">{selectedTask.name}</h3>
                <div className="flex items-center gap-3 text-xs font-bold text-[#8C8880]">
                   <span className="flex items-center gap-1.5"><Calendar size={14}/> {selectedTask.startDate} ~ {selectedTask.endDate}</span>
                </div>
              </div>
              <Badge status={selectedTask.status || 'active'} />
            </div>

            <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-5">
              <div className="text-xs font-bold text-[#8C8880] uppercase tracking-widest mb-4">推廣商品資訊</div>
              <div className="flex items-center gap-4">
                <Thumb emoji={selectedTask.thumbnail || '📦'} size="md" />
                <div className="flex-1">
                  <div className="font-bold text-[#1A1A18] mb-1">{selectedTask.prodName || '預設活動商品'}</div>
                  <div className="flex gap-4 text-xs font-bold text-[#8C8880]">
                    <span>售價 {formatCurrency(selectedTask.prodPrice || 0)}</span>
                    <span className="text-[#C8522A]">KOC 折扣 {selectedTask.kocDiscount || 0}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-[#E2DDD4] rounded-2xl p-5">
                <div className="text-xs font-bold text-[#8C8880] uppercase tracking-widest mb-2">預算使用狀況</div>
                <div className="text-2xl font-black text-[#1A1A18] mb-2">{formatCurrency(selectedTask.spent)}</div>
                <ProgressBar value={budgetUsedPct(selectedTask.spent, selectedTask.budget)} />
                <div className="text-xs text-[#8C8880] font-bold mt-2 text-right">總預算 {formatCurrency(selectedTask.budget)}</div>
              </div>
              <div className="border border-[#E2DDD4] rounded-2xl p-5">
                <div className="text-xs font-bold text-[#8C8880] uppercase tracking-widest mb-2">已參與 KOC</div>
                <div className="text-2xl font-black text-[#1A1A18] mb-2">{selectedTask.kocCount || 0} <span className="text-sm text-[#8C8880]">人</span></div>
                <button onClick={() => setShowKocList(true)} className="text-xs font-bold text-[#C8522A] hover:underline flex items-center gap-1 transition-all">
                  查看完整名單 <ArrowRight size={12}/>
                </button>
              </div>
            </div>
          </div>
          <div className="px-8 py-5 border-t border-[#E2DDD4] bg-[#F8F9FA] flex justify-end shrink-0">
            <Button variant="outline" onClick={() => setSelectedTask(null)}>關閉</Button>
          </div>
        </Modal>
      )}

      {/* KOC 參與名單 Modal */}
      {showKocList && (
        <Modal open={showKocList} onClose={() => setShowKocList(false)} title={`${selectedTask?.name} - 參與名單`} maxWidth="max-w-3xl">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4] sticky top-0 z-10">
                  {['KOC 資訊', '平台與粉絲數', '審核狀態', '帶來訂單', '創造 GMV'].map(h => (
                    <th key={h} className="p-5 text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {mockKocList.map(koc => (
                  <tr key={koc.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#F5F0E8] border border-[#E2DDD4] rounded-full flex items-center justify-center text-lg">{koc.avatar}</div>
                        <div>
                          <div className="text-sm font-bold text-[#1A1A18]">{koc.name}</div>
                          <div className="text-[11px] font-bold text-[#8C8880]">{koc.handle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-[#1A1A18]">
                        <Instagram size={14} className="text-[#C8522A]"/> {koc.platform}
                      </div>
                      <div className="text-[11px] font-bold text-[#8C8880] mt-0.5">{koc.followers} 粉絲</div>
                    </td>
                    <td className="p-5">
                      {koc.status === 'approved' 
                        ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5F0E8] text-[#1A1A18] text-[11px] font-bold"><CheckCircle2 size={12}/> 合作中</span>
                        : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FDF0ED] text-[#C8522A] text-[11px] font-bold"><Clock size={12}/> 待審核</span>
                      }
                    </td>
                    <td className="p-5 text-sm font-black text-[#1A1A18]">{koc.orders}</td>
                    <td className="p-5 text-sm font-black text-[#C8522A]">{formatCurrency(koc.gmv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-8 py-5 border-t border-[#E2DDD4] bg-[#F8F9FA] flex justify-between items-center shrink-0">
            <Button variant="ghost" onClick={() => setShowKocList(false)} className="gap-1.5 px-6">
              <ChevronLeft size={14}/> 返回任務詳情
            </Button>
          </div>
        </Modal>
      )}

    </div>
  )
}