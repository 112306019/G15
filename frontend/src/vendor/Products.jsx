import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, LayoutGrid, List, Eye, EyeOff, Edit3, Trash2, X, ChevronRight, ChevronLeft, Check, Upload, Tag, Package, ShoppingCart, TrendingUp } from 'lucide-react'
import { products as initial, productCategories, campaigns } from './mock'
import { formatCurrency, cn } from './lib/utils'

// 🟢 專屬品牌色狀態設定
const statusCfg = {
  listed:   { label: '已上架', cls: 'bg-[#F5F0E8] text-[#1A1A18]', dot: 'bg-[#1A1A18]' },
  draft:    { label: '草稿',   cls: 'bg-[#FDF0ED] text-[#C8522A]', dot: 'bg-[#C8522A]' },
  unlisted: { label: '已下架', cls: 'bg-white border border-[#E2DDD4] text-[#8C8880]', dot: 'bg-[#E2DDD4]' },
}

// 🟢 內建客製化 UI 元件 (確保 100% 呈現品牌色)
function Card({ children, className = "", hoverable }) {
  return <div className={cn(`bg-white rounded-[1.5rem] border border-[#E2DDD4] shadow-sm ${hoverable ? 'hover:border-[#B89B6A] hover:shadow-[0_8px_28px_rgba(26,26,24,0.06)] transition-all' : ''}`, className)}>{children}</div>
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <Card className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-[#8C8880] tracking-wide">{label}</span>
        <div className="text-[#8C8880]">
          <Icon size={20} strokeWidth={2.5} />
        </div>
      </div>
      <div className="text-2xl font-black text-[#1A1A18] font-sans">{value}</div>
    </Card>
  )
}

function Button({ variant = 'default', className, children, ...props }) {
  const variants = {
    brand: 'bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A] shadow-sm',
    outline: 'border border-[#E2DDD4] bg-white text-[#8C8880] hover:text-[#1A1A18] hover:border-[#1A1A18]',
    ghost: 'text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F8F9FA]',
    default: 'bg-[#F5F0E8] text-[#1A1A18] hover:bg-[#E2DDD4]'
  }
  return (
    <button className={cn('inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed', variants[variant], className)} {...props}>
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

function ProductBadge({ status }) {
  const c = statusCfg[status] ?? statusCfg.draft
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider', c.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />{c.label}
    </span>
  )
}

function Thumb({ emoji, size = 'md' }) {
  const s = { sm: 'w-11 h-11 text-xl rounded-lg', md: 'w-14 h-14 text-3xl rounded-xl', lg: 'w-20 h-20 text-4xl rounded-2xl' }[size]
  return <div className={cn('bg-[#F5F0E8] border border-[#E2DDD4] flex items-center justify-center shrink-0', s)}>{emoji}</div>
}

const STEPS = ['基本資訊','定價庫存','KOC 設定','確認']

// ─── 上架精靈 (Wizard) ──────────────────────────────────────────────────────────
function Wizard({ open, onClose, onComplete }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ thumbnail:'📦', campaigns:[], tags:[], status:'draft' })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  function finish(status) { onComplete({ ...form, status, id:`p${Date.now()}`, sold:0, createdAt: new Date().toISOString().slice(0,10) }); setStep(0); setForm({ thumbnail:'📦', campaigns:[], tags:[], status:'draft' }); onClose() }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-[#1A1A18]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-[#E2DDD4] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-[#E2DDD4] bg-[#F8F9FA]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl font-bold text-[#1A1A18]">上架新商品</h2>
            <button onClick={onClose} className="p-2 rounded-full text-[#8C8880] hover:bg-[#E2DDD4] hover:text-[#1A1A18] transition-colors"><X size={18}/></button>
          </div>
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all',
                  i < step ? 'bg-[#C8522A] text-white' : i === step ? 'bg-[#1A1A18] text-white' : 'bg-[#E2DDD4] text-[#8C8880]')}>
                  {i < step ? <Check size={12}/> : i+1}
                </div>
                <span className={cn('text-[11px] font-bold ml-2 hidden sm:block tracking-wider', i <= step ? 'text-[#1A1A18]' : 'text-[#8C8880]')}>{s}</span>
                {i < STEPS.length-1 && <div className={cn('flex-1 h-0.5 mx-3 rounded-full', i < step ? 'bg-[#C8522A]' : 'bg-[#E2DDD4]')}/>}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-8 py-6 max-h-[60vh] overflow-y-auto space-y-5">
          {step === 0 && <>
            <div className="flex items-center gap-5 p-5 bg-[#F8F9FA] border border-dashed border-[#E2DDD4] rounded-2xl">
              <Thumb emoji={form.thumbnail} size="lg" />
              <button className="inline-flex items-center gap-2 text-xs font-bold text-[#1A1A18] bg-white border border-[#E2DDD4] hover:border-[#1A1A18] px-4 py-2 rounded-full transition-all"><Upload size={14}/>上傳圖片</button>
            </div>
            <Input label="商品名稱 *" value={form.name??''} onChange={set('name')} placeholder="例：深層保濕精華液" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="SKU" value={form.sku??''} onChange={set('sku')} placeholder="SKU-XXX-001" />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">類別</label>
                <select value={form.category??''} onChange={set('category')} className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all appearance-none">
                  <option value="">選擇類別</option>
                  {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </>}
          {step === 1 && <>
            <div className="grid grid-cols-2 gap-4">
              <Input label="售價 (NT$) *" type="number" value={form.price??''} onChange={set('price')} placeholder="1200" />
              <Input label="原價 (NT$)"   type="number" value={form.originalPrice??''} onChange={set('originalPrice')} placeholder="1500" />
            </div>
            <Input label="初始庫存 *" type="number" value={form.stock??''} onChange={set('stock')} placeholder="100" />
            {form.price && form.originalPrice && Number(form.originalPrice) > Number(form.price) && (
              <div className="flex items-center gap-3 bg-[#FDF0ED] border border-[#FDF0ED] rounded-xl px-5 py-4 mt-2">
                <Tag size={16} className="text-[#C8522A]"/>
                <span className="text-sm text-[#C8522A] font-bold">折扣 {Math.round((1-form.price/form.originalPrice)*100)}%</span>
              </div>
            )}
          </>}
          {step === 2 && <>
            <div className="bg-[#F5F0E8] border border-[#E2DDD4] rounded-xl px-5 py-4 text-xs text-[#8C8880] font-bold leading-relaxed mb-2">
              KOC 購買商品後取得專屬優惠碼，推薦消費者使用享折扣。
            </div>
            <Input label="KOC 折扣 (%) *" type="number" value={form.kocDiscount??''} onChange={set('kocDiscount')} placeholder="15" />
          </>}
          {step === 3 && (
            <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-[#E2DDD4]">
                <Thumb emoji={form.thumbnail} size="md" />
                <div>
                  <div className="font-bold text-[#1A1A18] text-lg mb-1">{form.name||'（未命名）'}</div>
                  <div className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">{form.sku} · {form.category}</div>
                </div>
              </div>
              {[['售價', form.price ? formatCurrency(form.price) : '—'], ['庫存', form.stock??'—'], ['KOC 折扣', form.kocDiscount ? `${form.kocDiscount}%` : '—']].map(([l,v]) => (
                <div key={l} className="flex justify-between items-center text-sm">
                  <span className="text-[#8C8880] font-bold">{l}</span><span className="font-black text-[#1A1A18]">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-[#E2DDD4] flex gap-4 bg-[#F8F9FA]">
          <Button variant="ghost" onClick={() => step > 0 ? setStep(s=>s-1) : (onClose())} className="gap-1.5 px-6">
            <ChevronLeft size={14}/>{step === 0 ? '取消' : '上一步'}
          </Button>
          <div className="flex-1"/>
          {step < STEPS.length-1
            ? <Button variant="brand" onClick={() => setStep(s=>s+1)} className="gap-1.5 px-8">下一步<ChevronRight size={14}/></Button>
            : <>
                <Button variant="outline" onClick={() => finish('draft')}>儲存草稿</Button>
                <Button variant="brand" onClick={() => finish('listed')} disabled={!form.name||!form.price||!form.stock} className="gap-1.5 px-8"><Eye size={14}/>立即上架</Button>
              </>
          }
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Products() {
  const [prods, setProds]       = useState(initial)
  const navigate = useNavigate()
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [view, setView]         = useState('grid')
  const [wizard, setWizard]     = useState(false)

  const filtered = prods.filter(p =>
    (filter === 'all' || p.status === filter) &&
    (!search || p.name.includes(search) || p.sku?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleToggle = id => setProds(prev => prev.map(p => p.id!==id ? p : { ...p, status: p.status==='listed' ? 'unlisted' : 'listed' }))
  const handleDelete = id => setProds(prev => prev.filter(p => p.id!==id))
  const handleSave   = up => setProds(prev => prev.find(p => p.id===up.id) ? prev.map(p => p.id===up.id ? {...p,...up} : p) : [...prev, up])

  const stats = {
    listed:    prods.filter(p => p.status==='listed').length,
    draft:     prods.filter(p => p.status==='draft').length,
    totalSold: prods.reduce((s,p) => s+p.sold, 0),
    gmv:       prods.reduce((s,p) => s+p.price*p.sold, 0),
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* KPI 卡片 */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard label="已上架商品"  value={stats.listed}                icon={Eye}          />
        <StatCard label="草稿商品"    value={stats.draft}                 icon={Package}      />
        <StatCard label="累計銷售量"  value={stats.totalSold}             icon={ShoppingCart} />
        <StatCard label="商品總 GMV"  value={formatCurrency(stats.gmv)}   icon={TrendingUp}   />
      </div>

      {/* 操作列 */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* 過濾標籤 */}
        <div className="flex gap-2 p-1 bg-[#E2DDD4]/30 rounded-full">
          {[['all','全部'],['listed','已上架'],['draft','草稿'],['unlisted','已下架']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)} className={cn('px-5 py-2 rounded-full text-sm font-bold transition-all',
              filter===v ? 'bg-[#1A1A18] text-white shadow-sm' : 'text-[#8C8880] hover:text-[#1A1A18]')}>{l}</button>
          ))}
        </div>
        
        {/* 搜尋框 */}
        <div className="flex items-center gap-3 bg-white border border-[#E2DDD4] rounded-full px-5 py-2.5 w-64 ml-auto focus-within:border-[#C8522A] transition-colors shadow-sm">
          <Search size={16} className="text-[#8C8880]"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋商品…"
            className="bg-transparent text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none w-full font-bold"/>
        </div>

        {/* 視圖切換 */}
        <div className="flex bg-white border border-[#E2DDD4] rounded-full overflow-hidden shadow-sm p-1">
          <button onClick={() => setView('grid')} className={cn('p-2 rounded-full transition-colors', view==='grid' ? 'bg-[#F5F0E8] text-[#1A1A18]' : 'text-[#8C8880] hover:text-[#1A1A18]')}><LayoutGrid size={16}/></button>
          <button onClick={() => setView('list')} className={cn('p-2 rounded-full transition-colors', view==='list' ? 'bg-[#F5F0E8] text-[#1A1A18]' : 'text-[#8C8880] hover:text-[#1A1A18]')}><List size={16}/></button>
        </div>

        <Button variant="brand" onClick={() => setWizard(true)} className="gap-2 px-6 py-2.5"><Plus size={16}/>上架新商品</Button>
      </div>

      {/* 網格視圖 (Grid View) */}
      {view === 'grid' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(p => {
            const soldPct = p.stock+p.sold > 0 ? Math.round(p.sold/(p.stock+p.sold)*100) : 0
            return (
              <Card key={p.id} hoverable className="p-6 flex flex-col gap-4 group relative overflow-hidden">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {[
                    { icon: p.status==='listed' ? EyeOff : Eye, fn: () => handleToggle(p.id), cls: 'hover:text-[#1A1A18]' },
                    { icon: Trash2,                fn: () => handleDelete(p.id),   cls: 'hover:text-[#D93025]'  },
                  ].map(({ icon: Icon, fn, cls }, i) => (
                    <button key={i} onClick={fn} className={cn('p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-[#E2DDD4] text-[#8C8880] transition-all hover:scale-110', cls)}><Icon size={14}/></button>
                  ))}
                </div>
                
                <div className="flex items-start gap-4">
                  <Thumb emoji={p.thumbnail}/>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="text-sm font-bold text-[#1A1A18] line-clamp-2 leading-snug mb-1">{p.name}</div>
                    <div className="text-[10px] text-[#8C8880] font-mono tracking-wider">{p.sku}</div>
                  </div>
                </div>

                <div className="flex items-end justify-between mt-2">
                  <div>
                    <div className="text-lg font-black text-[#1A1A18]">{formatCurrency(p.price)}</div>
                    {p.originalPrice > p.price && <div className="text-[11px] font-bold text-[#8C8880] line-through mt-0.5">{formatCurrency(p.originalPrice)}</div>}
                  </div>
                  <ProductBadge status={p.status}/>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between text-[11px] font-bold text-[#8C8880] mb-2">
                    <span>庫存 {p.stock}</span><span className="text-[#C8522A]">已售 {p.sold} ({soldPct}%)</span>
                  </div>
                  <div className="h-1.5 bg-[#F5F0E8] rounded-full overflow-hidden">
                    <div className="h-full bg-[#C8522A] rounded-full transition-all duration-1000" style={{ width:`${soldPct}%` }}/>
                  </div>
                </div>
              </Card>
            )
          })}
          {filtered.length === 0 && <div className="col-span-full py-20 text-center text-sm font-bold text-[#8C8880]">找不到符合條件的商品</div>}
        </div>
      )}

      {/* 列表視圖 (List View) */}
      {view === 'list' && (
        <div className="bg-white rounded-[2rem] border border-[#E2DDD4] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                  {['商品','類別','售價','庫存','已售','KOC 折扣','狀態','操作'].map(h => (
                    <th key={h} className="p-5 text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {filtered.length > 0 ? filtered.map(p => (
                  <tr key={p.id} className="hover:bg-[#F8F9FA] transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-4"><Thumb emoji={p.thumbnail} size="sm"/>
                        <div><div className="text-sm font-bold text-[#1A1A18] mb-1">{p.name}</div><div className="text-[10px] font-bold text-[#8C8880] font-mono tracking-wider">{p.sku}</div></div>
                      </div>
                    </td>
                    <td className="p-5 text-xs font-bold text-[#8C8880]">{p.category}</td>
                    <td className="p-5"><div className="text-sm font-black text-[#1A1A18]">{formatCurrency(p.price)}</div></td>
                    <td className="p-5 text-sm font-bold text-[#8C8880]">{p.stock}</td>
                    <td className="p-5 text-sm font-black text-[#C8522A]">{p.sold}</td>
                    <td className="p-5 text-xs font-black text-[#C8522A]">{p.kocDiscount}%</td>
                    <td className="p-5"><ProductBadge status={p.status}/></td>
                    <td className="p-5">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleToggle(p.id)} className="p-2 rounded-full bg-white border border-[#E2DDD4] text-[#8C8880] hover:text-[#1A1A18] hover:border-[#1A1A18] transition-colors shadow-sm">{p.status==='listed' ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-full bg-white border border-[#E2DDD4] text-[#8C8880] hover:text-[#D93025] hover:border-[#D93025] hover:bg-[#FFF0F0] transition-colors shadow-sm"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                )) : <tr><td colSpan={8} className="py-20 text-center text-sm font-bold text-[#8C8880]">找不到符合條件的商品</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 上架精靈彈窗 */}
      <Wizard open={wizard} onClose={() => setWizard(false)} onComplete={handleSave}/>
    </div>
  )
}