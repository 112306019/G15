import React, { useState, useEffect } from 'react'
import { Plus, Calendar, Users, TrendingUp, Check, ChevronRight, ChevronLeft, Upload, Package, X, Eye, FileText, ArrowRight, Instagram, CheckCircle2, Clock, Save, Loader2, Timer } from 'lucide-react'
import { campaigns as initialCampaigns, products as initialProducts } from './mock'
import { formatCurrency, budgetUsedPct, cn } from './lib/utils'

// 🟢 取得今天的日期字串 (YYYY-MM-DD)，用於防呆與排程判斷
const getTodayString = () => new Date().toISOString().slice(0,10)

// 🟢 內建客製化 UI 元件
function Card({ children, className = "", hoverable, onClick }) {
  return <div onClick={onClick} className={cn(`bg-white rounded-[1.5rem] border border-[#E2DDD4] shadow-sm ${hoverable ? 'hover:border-[#B89B6A] hover:shadow-[0_8px_28px_rgba(26,26,24,0.06)] transition-all cursor-pointer' : ''}`, className)}>{children}</div>
}

function Badge({ status }) {
  const cfg = {
    active: { label: '招募中', cls: 'bg-[#FDF0ED] text-[#C8522A]', dot: 'bg-[#C8522A]' },
    // 🌟 新增：排程中的視覺樣式
    scheduled: { label: '排程中', cls: 'bg-[#F8F9FA] border border-[#E2DDD4] text-[#1A1A18]', dot: 'bg-[#B89B6A]' },
    promo:  { label: '推廣中', cls: 'bg-[#F5F0E8] text-[#1A1A18]', dot: 'bg-[#1A1A18]' },
    closed: { label: '已結案 (已失效)', cls: 'bg-white border border-[#E2DDD4] text-[#8C8880]', dot: 'bg-[#E2DDD4]' },
    draft:  { label: '草稿', cls: 'bg-white border border-[#E2DDD4] text-[#8C8880]', dot: 'bg-[#8C8880]' },
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
    outline: 'border border-[#E2DDD4] bg-white text-[#1A1A18] hover:bg-[#F8F9FA]',
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
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">{label}</label>
      <input className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all placeholder:text-[#8C8880]/50 disabled:opacity-60 disabled:cursor-not-allowed" {...props} />
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

// 🟢 共用 Modal 結構
function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-[#1A1A18]/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-[#E2DDD4] animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]", maxWidth)}>
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
function CampaignWizard({ open, onClose, onComplete, initialData }) {
  const [step, setStep] = useState(0)
  const [prodMode, setProdMode] = useState('existing')
  const [isSaving, setIsSaving] = useState(false)
  
  // 🌟 修改：加入 startDate，作為排程發佈日期
  const defaultForm = { 
    id: '', name: '', budget: '', startDate: getTodayString(), recruitEndDate: '', promoDays: '7', 
    prodId: '', prodName: '', prodPrice: '', prodStock: '', thumbnail: '📦', kocDiscount: ''
  }
  const [form, setForm] = useState(defaultForm)
  
  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm(initialData)
        setProdMode(initialData.prodId ? 'existing' : (initialData.prodName ? 'new' : 'existing'))
      } else {
        setForm(defaultForm)
        setProdMode('existing')
      }
      setStep(0)
    }
  }, [open, initialData])

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

  const handleSaveDraft = async () => {
    setIsSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800)) 
      onComplete({ 
        ...form, 
        id: form.id || `draft_${Date.now()}`, 
        status: 'draft', 
        spent: form.spent || 0, kocCount: form.kocCount || 0, orders: form.orders || 0, gmv: form.gmv || 0
      })
      onClose()
    } catch (error) {
      alert("儲存草稿失敗")
    } finally {
      setIsSaving(false)
    }
  }
  
  const finish = async () => { 
    setIsSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      onComplete({ 
        ...form, 
        id: form.id && form.id.startsWith('draft_') ? `c${Date.now()}` : (form.id || `c${Date.now()}`), 
        status: 'active', // 後續在列表中會根據 startDate 判斷是否為排程中
        spent: form.spent || 0, kocCount: form.kocCount || 0, orders: form.orders || 0, gmv: form.gmv || 0
      })
      onClose() 
    } finally {
      setIsSaving(false)
    }
  }

  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-xl">
      <div className="px-8 pt-8 pb-5 border-b border-[#E2DDD4] bg-[#F8F9FA] shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-bold text-[#1A1A18]">
            {initialData && initialData.status === 'draft' ? '編輯任務草稿' : '發佈 KOC 專屬任務'}
          </h2>
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

      <div className="px-8 py-6 overflow-y-auto flex-1 space-y-5">
        
        {step === 0 && <>
          <Input label="任務名稱 *" value={form.name} onChange={set('name')} placeholder="例：夏季防曬大作戰" />
          <Input label="總預算 (NT$) *" type="number" value={form.budget} onChange={set('budget')} placeholder="50000" />
          
          {/* 🌟 修改：排程發佈日期與截止日期 */}
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="排程發佈日期 *" 
              type="date" 
              value={form.startDate} 
              onChange={set('startDate')} 
              min={getTodayString()} // 防呆：不能選過去的時間
            />
            <Input 
              label="申請截止日期 *" 
              type="date" 
              value={form.recruitEndDate} 
              onChange={set('recruitEndDate')} 
              min={form.startDate || getTodayString()} // 防呆：截止日不能早於發佈日
              disabled={!form.startDate} // 防呆：必須先選發佈日
            />
          </div>

          <div className="flex flex-col gap-1.5 pt-2">
            <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">優惠碼有效天數 (接案截止後) *</label>
            <select 
              value={form.promoDays} 
              onChange={set('promoDays')} 
              className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all appearance-none"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <option key={d} value={d}>{d} 天 (到期自動失效)</option>
              ))}
            </select>
            <p className="text-[10px] text-[#8C8880] mt-0.5 ml-1">接案任務截止後，消費者仍可使用該折扣碼下單的天數</p>
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
              <h4 className="text-xs font-black text-[#C8522A] uppercase tracking-wider mb-3 flex items-center gap-2"><Calendar size={14}/> 任務週期預覽</h4>
              <div className="space-y-4 relative before:absolute before:inset-y-2 before:left-[7px] before:w-0.5 before:bg-[#C8522A]/20">
                
                {/* 🌟 修改：根據設定的開始日期顯示動態文字 */}
                <div className="flex items-start gap-3 relative z-10">
                  <div className={cn("w-4 h-4 rounded-full border-4 border-[#FDF0ED] shrink-0 mt-0.5", form.startDate > getTodayString() ? "bg-[#B89B6A]" : "bg-[#C8522A]")} />
                  <div>
                    <div className="text-sm font-bold text-[#1A1A18] flex items-center gap-2">
                      {form.startDate === getTodayString() ? '今日起' : form.startDate}
                      {form.startDate > getTodayString() && <span className="bg-[#F5F0E8] text-[#1A1A18] px-1.5 py-0.5 rounded text-[10px]"><Timer size={10} className="inline mr-1 mb-0.5"/>排程</span>}
                    </div>
                    <div className="text-xs text-[#8C8880]">任務上架，開放 KOC 申請接案</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-4 h-4 rounded-full bg-[#C8522A] border-4 border-[#FDF0ED] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-[#1A1A18]">{form.recruitEndDate || '未設定'}</div>
                    <div className="text-xs text-[#8C8880]">停止接案申請，優惠碼進入 {form.promoDays} 天最後效期</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-4 h-4 rounded-full bg-[#1A1A18] border-4 border-[#FDF0ED] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-black text-[#1A1A18]">優惠效期結束</div>
                    <div className="text-xs font-bold text-[#C8522A]">任務關閉，商品下架，專屬優惠碼正式失效</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-8 py-5 border-t border-[#E2DDD4] flex justify-between bg-[#F8F9FA] shrink-0">
        <Button variant="ghost" onClick={() => step > 0 ? setStep(s=>s-1) : onClose()} className="gap-1.5 px-6">
          <ChevronLeft size={14}/>{step === 0 ? '取消' : '上一步'}
        </Button>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleSaveDraft} 
            disabled={isSaving || !form.name} 
            className="gap-2 px-6"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
            {isSaving ? '儲存中...' : '儲存草稿'}
          </Button>

          {step < STEPS.length-1
            ? <Button 
                variant="brand" 
                onClick={() => setStep(s=>s+1)} 
                // 🌟 修改：補上完整的防呆，第一關一定要有名字跟日期才能下一步
                disabled={(step === 0 && (!form.name || !form.startDate || !form.recruitEndDate)) || (step === 1 && !form.prodName) || isSaving} 
                className="gap-1.5 px-8"
              >
                下一步<ChevronRight size={14}/>
              </Button>
            : <Button 
                variant="brand" 
                onClick={finish} 
                disabled={isSaving || !form.name} 
                className="gap-2 px-8"
              >
                <Plus size={14}/>確認發佈任務
              </Button>
          }
        </div>
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
  const [editingDraft, setEditingDraft] = useState(null)
  
  const [selectedTask, setSelectedTask] = useState(null)
  const [showKocList, setShowKocList] = useState(false)

  const handleCreateOrUpdate = (taskData) => {
    setItems(prev => {
      const isExisting = prev.find(t => t.id === taskData.id)
      if (isExisting) {
        return prev.map(t => t.id === taskData.id ? taskData : t)
      } else {
        return [taskData, ...prev]
      }
    })
  }

  const handleOpenWizard = () => {
    setEditingDraft(null)
    setWizardOpen(true)
  }

  const handleCardClick = (c) => {
    if (c.status === 'draft') {
      setEditingDraft(c)
      setWizardOpen(true)
    } else {
      setSelectedTask(c)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block"></span>
          任務與商品總覽
        </h2>
        <Button variant="brand" onClick={handleOpenWizard} className="gap-2 px-6">
          <Plus size={16} /> 發佈 KOC 任務
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map(c => {
          const pct = budgetUsedPct(c.spent, c.budget)
          
          // 🌟 核心邏輯：判斷目前任務的真實狀態 (是否為排程中)
          let displayStatus = c.status;
          if (c.status === 'active' && c.startDate > getTodayString()) {
            displayStatus = 'scheduled';
          }

          return (
            <Card key={c.id} hoverable onClick={() => handleCardClick(c)} className="p-8 flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className={cn("font-bold text-lg mb-1", c.status === 'draft' ? "text-[#8C8880]" : "text-[#1A1A18]")}>
                    {c.name || '未命名任務'}
                  </h3>
                  <div className="text-xs font-bold text-[#8C8880] flex items-center gap-2">
                    <Package size={14} /> 綁定：{c.prodName || '尚未選擇商品'}
                  </div>
                </div>
                <Badge status={displayStatus} />
              </div>

              <div className="grid grid-cols-3 gap-4 text-center opacity-90">
                <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-[#8C8880] mb-1.5 uppercase tracking-widest">GMV</div>
                  <div className="font-black text-sm text-[#1A1A18]">{c.status === 'draft' ? '—' : formatCurrency(c.gmv)}</div>
                </div>
                <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-[#8C8880] mb-1.5 uppercase tracking-widest">訂單</div>
                  <div className="font-black text-sm text-[#1A1A18]">{c.status === 'draft' ? '—' : c.orders}</div>
                </div>
                <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-[#8C8880] mb-1.5 uppercase tracking-widest">進度</div>
                  <div className="font-black text-sm text-[#C8522A]">{c.status === 'draft' ? '—' : `${pct}%`}</div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <CampaignWizard 
        open={wizardOpen} 
        onClose={() => { setWizardOpen(false); setEditingDraft(null); }} 
        onComplete={handleCreateOrUpdate} 
        initialData={editingDraft} 
      />

      {/* 任務詳細資料 Modal */}
      {selectedTask && !showKocList && (
        <Modal open={!!selectedTask} onClose={() => setSelectedTask(null)} title="任務詳細資訊" maxWidth="max-w-2xl">
          <div className="px-8 py-6 space-y-6 overflow-y-auto flex-1">
            
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-[#1A1A18] mb-3">{selectedTask.name}</h3>
                
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                   <span className="flex items-center gap-1.5 bg-[#F8F9FA] text-[#8C8880] px-3 py-1.5 rounded-lg border border-[#E2DDD4]">
                     <Calendar size={14}/> 招募期間：{selectedTask.startDate} ~ {selectedTask.endDate}
                   </span>
                   <span className="flex items-center gap-1.5 bg-[#FDF0ED] text-[#C8522A] px-3 py-1.5 rounded-lg border border-[#C8522A]/20">
                     <Clock size={14}/> 截止後優惠碼展延：{selectedTask.promoDays || 7} 天
                   </span>
                </div>
              </div>
              <Badge status={selectedTask.status === 'active' && selectedTask.startDate > getTodayString() ? 'scheduled' : selectedTask.status || 'active'} />
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