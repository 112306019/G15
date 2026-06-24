import React, { useState } from 'react'
import { Plus, Search, LayoutGrid, List, Edit3, Trash2, X, Upload, Package, ShoppingCart, TrendingUp, Archive } from 'lucide-react'
import { products as initial, productCategories } from './mock'
import { formatCurrency, cn } from './lib/utils'

// 🟢 專屬品牌色狀態設定 (配合新商業邏輯)
const statusCfg = {
  active: { label: '推廣中', cls: 'bg-[#FDF0ED] text-[#C8522A]', dot: 'bg-[#C8522A]' }, // 正在某個任務裡
  idle:   { label: '庫存中', cls: 'bg-[#F5F0E8] text-[#1A1A18]', dot: 'bg-[#1A1A18]' }, // 閒置在資料庫
  empty:  { label: '已售完', cls: 'bg-white border border-[#E2DDD4] text-[#8C8880]', dot: 'bg-[#E2DDD4]' },
}

// 🟢 內建客製化 UI 元件
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

function ProductBadge({ status }) {
  const c = statusCfg[status] ?? statusCfg.idle
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

// ─── 簡化版的新增商品 Modal (存入資料庫) ──────────────────────────────────────────
function AddProductModal({ open, onClose, onComplete }) {
  const [form, setForm] = useState({ name: '', sku: '', category: '', price: '', stock: '', thumbnail: '📦' })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  
  function finish() { 
    onComplete({ 
      ...form, 
      id: `p${Date.now()}`, 
      status: 'idle', // 預設狀態是放在庫存中
      sold: 0, 
      createdAt: new Date().toISOString().slice(0,10) 
    })
    setForm({ name: '', sku: '', category: '', price: '', stock: '', thumbnail: '📦' })
    onClose() 
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-[#1A1A18]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-[#E2DDD4] animate-in zoom-in-95 duration-300">
        
        <div className="px-8 pt-8 pb-5 border-b border-[#E2DDD4] bg-[#F8F9FA] flex justify-between items-center">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#1A1A18]">新增至商品庫</h2>
            <p className="text-xs font-bold text-[#8C8880] mt-1">建立基礎資料，未來發佈任務時即可直接選用</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-[#8C8880] hover:bg-[#E2DDD4] hover:text-[#1A1A18] transition-colors"><X size={18}/></button>
        </div>

        <div className="px-8 py-6 max-h-[60vh] overflow-y-auto space-y-5">
          <div className="flex items-center gap-5 p-5 bg-[#F8F9FA] border border-dashed border-[#E2DDD4] rounded-2xl">
            <Thumb emoji={form.thumbnail} size="lg" />
            <button className="inline-flex items-center gap-2 text-xs font-bold text-[#1A1A18] bg-white border border-[#E2DDD4] hover:border-[#1A1A18] px-4 py-2 rounded-full transition-all"><Upload size={14}/>上傳圖片</button>
          </div>
          <Input label="商品名稱 *" value={form.name} onChange={set('name')} placeholder="例：深層保濕精華液" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU" value={form.sku} onChange={set('sku')} placeholder="SKU-XXX-001" />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">類別</label>
              <select value={form.category} onChange={set('category')} className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all appearance-none">
                <option value="">選擇類別</option>
                {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="官方定價 (NT$) *" type="number" value={form.price} onChange={set('price')} placeholder="1200" />
            <Input label="入庫數量 *" type="number" value={form.stock} onChange={set('stock')} placeholder="100" />
          </div>
        </div>

        <div className="px-8 py-5 border-t border-[#E2DDD4] flex gap-4 bg-[#F8F9FA] justify-end">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="brand" onClick={finish} disabled={!form.name || !form.price || !form.stock} className="gap-1.5"><Plus size={14}/> 儲存至商品庫</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Products() {
  // 將 mock 資料中的狀態 mapping 到我們新的邏輯
  const [prods, setProds] = useState(initial.map(p => ({
    ...p,
    status: p.stock === 0 ? 'empty' : (p.status === 'listed' ? 'active' : 'idle')
  })))
  
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [view, setView]         = useState('grid')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = prods.filter(p =>
    (filter === 'all' || p.status === filter) &&
    (!search || p.name.includes(search) || p.sku?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleDelete = id => setProds(prev => prev.filter(p => p.id!==id))
  const handleSave   = up => setProds(prev => [up, ...prev])

  const stats = {
    total:     prods.length,
    active:    prods.filter(p => p.status === 'active').length,
    totalSold: prods.reduce((s,p) => s+p.sold, 0),
    gmv:       prods.reduce((s,p) => s+p.price*p.sold, 0),
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 頂部標題 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block"></span>
          商品庫管理
        </h2>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard label="商品庫總數"  value={stats.total}                 icon={Archive}      />
        <StatCard label="推廣中商品"  value={stats.active}                icon={Package}      />
        <StatCard label="歷史總銷量"  value={stats.totalSold}             icon={ShoppingCart} />
        <StatCard label="歷史總 GMV"  value={formatCurrency(stats.gmv)}   icon={TrendingUp}   />
      </div>

      {/* 操作列 */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* 過濾標籤 */}
        <div className="flex gap-2 p-1 bg-[#E2DDD4]/30 rounded-full">
          {[['all','全部商品'],['active','推廣中'],['idle','庫存中'],['empty','已售完']].map(([v,l]) => (
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

        <Button variant="brand" onClick={() => setModalOpen(true)} className="gap-2 px-6 py-2.5"><Plus size={16}/>新增商品</Button>
      </div>

      {/* 網格視圖 (Grid View) */}
      {view === 'grid' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(p => {
            const soldPct = p.stock+p.sold > 0 ? Math.round(p.sold/(p.stock+p.sold)*100) : 0
            return (
              <Card key={p.id} hoverable className="p-6 flex flex-col gap-4 group relative overflow-hidden">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={() => handleDelete(p.id)} className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-[#E2DDD4] text-[#8C8880] transition-all hover:scale-110 hover:text-[#D93025]"><Trash2 size={14}/></button>
                </div>
                
                <div className="flex items-start gap-4">
                  <Thumb emoji={p.thumbnail}/>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="text-sm font-bold text-[#1A1A18] line-clamp-2 leading-snug mb-1">{p.name}</div>
                    <div className="text-[10px] text-[#8C8880] font-mono tracking-wider">{p.sku || '無 SKU'}</div>
                  </div>
                </div>

                <div className="flex items-end justify-between mt-2">
                  <div>
                    <div className="text-lg font-black text-[#1A1A18]">{formatCurrency(p.price)}</div>
                    <div className="text-[11px] font-bold text-[#8C8880] mt-0.5">{p.category}</div>
                  </div>
                  <ProductBadge status={p.status}/>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between text-[11px] font-bold text-[#8C8880] mb-2">
                    <span>剩餘庫存 {p.stock}</span><span className="text-[#C8522A]">歷史售出 {p.sold}</span>
                  </div>
                  <div className="h-1.5 bg-[#F5F0E8] rounded-full overflow-hidden">
                    <div className="h-full bg-[#C8522A] rounded-full transition-all duration-1000" style={{ width:`${soldPct}%` }}/>
                  </div>
                </div>
              </Card>
            )
          })}
          {filtered.length === 0 && <div className="col-span-full py-20 text-center text-sm font-bold text-[#8C8880]">商品庫中沒有資料</div>}
        </div>
      )}

      {/* 列表視圖 (List View) */}
      {view === 'list' && (
        <div className="bg-white rounded-[2rem] border border-[#E2DDD4] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                  {['商品資訊','類別','官方定價','剩餘庫存','歷史售出','目前狀態','操作'].map(h => (
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
                    <td className="p-5"><ProductBadge status={p.status}/></td>
                    <td className="p-5">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-full bg-white border border-[#E2DDD4] text-[#8C8880] hover:text-[#D93025] hover:border-[#D93025] hover:bg-[#FFF0F0] transition-colors shadow-sm"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                )) : <tr><td colSpan={7} className="py-20 text-center text-sm font-bold text-[#8C8880]">商品庫中沒有資料</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 新增商品彈窗 */}
      <AddProductModal open={modalOpen} onClose={() => setModalOpen(false)} onComplete={handleSave}/>
    </div>
  )
}