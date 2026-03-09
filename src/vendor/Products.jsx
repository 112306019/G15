import { useState } from 'react'
import { Plus, Search, LayoutGrid, List, Eye, EyeOff, Edit3, Trash2, X, ChevronRight, ChevronLeft, Check, Upload, Tag, Package, ShoppingCart, TrendingUp } from 'lucide-react'
import { products as initial, productCategories, campaigns } from './mock.js'
import { Button, Card, Input, Modal, StatCard, Badge, Avatar } from './components/ui'
import { formatCurrency, cn } from './lib/utils'

const statusCfg = {
  listed: { label: '已上架', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  draft: { label: '草稿', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  unlisted: { label: '已下架', cls: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
}

function ProductBadge({ status }) {
  const c = statusCfg[status] ?? statusCfg.draft
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold', c.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />{c.label}
    </span>
  )
}

function Thumb({ emoji, size = 'md' }) {
  const s = { sm: 'w-11 h-11 text-xl', md: 'w-14 h-14 text-3xl', lg: 'w-20 h-20 text-4xl' }[size]
  return <div className={cn('rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0', s)}>{emoji}</div>
}

const STEPS = ['基本資訊', '定價庫存', 'KOC 設定', '確認']

// ─── Listing Wizard ──────────────────────────────────────────────────────────
function Wizard({ open, onClose, onComplete }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ thumbnail: '📦', campaigns: [], tags: [], status: 'draft' })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  function finish(status) { onComplete({ ...form, status, id: `p${Date.now()}`, sold: 0, createdAt: new Date().toISOString().slice(0, 10) }); setStep(0); setForm({ thumbnail: '📦', campaigns: [], tags: [], status: 'draft' }); onClose() }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-slate-800">上架新商品</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
          </div>
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all',
                  i < step ? 'bg-amber-500 text-white' : i === step ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-400')}>
                  {i < step ? <Check size={11} /> : i + 1}
                </div>
                <span className={cn('text-[10px] font-semibold ml-1.5 hidden sm:block', i === step ? 'text-slate-800' : 'text-gray-400')}>{s}</span>
                {i < STEPS.length - 1 && <div className={cn('flex-1 h-px mx-2', i < step ? 'bg-amber-400' : 'bg-gray-100')} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-4">
          {step === 0 && <>
            <div className="flex items-center gap-4 p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
              <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center text-3xl">{form.thumbnail}</div>
              <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"><Upload size={12} />上傳圖片</button>
            </div>
            <Input label="商品名稱 *" value={form.name ?? ''} onChange={set('name')} placeholder="例：深層保濕精華液" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="SKU" value={form.sku ?? ''} onChange={set('sku')} placeholder="SKU-XXX-001" />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">類別</label>
                <select value={form.category ?? ''} onChange={set('category')} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400">
                  <option value="">選擇類別</option>
                  {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">商品描述</label>
              <textarea rows={3} value={form.description ?? ''} onChange={set('description')} placeholder="詳細描述商品特色..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-amber-400/40 resize-none" />
            </div>
          </>}
          {step === 1 && <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="售價 (NT$) *" type="number" value={form.price ?? ''} onChange={set('price')} placeholder="1200" />
              <Input label="原價 (NT$)" type="number" value={form.originalPrice ?? ''} onChange={set('originalPrice')} placeholder="1500" />
            </div>
            <Input label="初始庫存 *" type="number" value={form.stock ?? ''} onChange={set('stock')} placeholder="100" />
            {form.price && form.originalPrice && Number(form.originalPrice) > Number(form.price) && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <Tag size={14} className="text-emerald-600" />
                <span className="text-sm text-emerald-700 font-semibold">折扣 {Math.round((1 - form.price / form.originalPrice) * 100)}%</span>
              </div>
            )}
          </>}
          {step === 2 && <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
              KOC 購買商品後取得專屬優惠碼，推薦消費者使用享折扣。
            </div>
            <Input label="KOC 折扣 (%) *" type="number" value={form.kocDiscount ?? ''} onChange={set('kocDiscount')} placeholder="15" />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">加入活動</label>
              <div className="flex flex-wrap gap-2">
                {campaigns.filter(c => c.status !== 'ended').map(c => {
                  const joined = (form.campaigns ?? []).includes(c.id)
                  return <button key={c.id} onClick={() => setForm(f => ({ ...f, campaigns: joined ? f.campaigns.filter(id => id !== c.id) : [...(f.campaigns ?? []), c.id] }))}
                    className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all', joined ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-gray-50 text-gray-500 border-gray-200')}>
                    {joined && <Check size={10} className="inline mr-1" />}{c.name}
                  </button>
                })}
              </div>
            </div>
          </>}
          {step === 3 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center text-2xl">{form.thumbnail}</div>
                <div>
                  <div className="font-bold text-slate-800">{form.name || '（未命名）'}</div>
                  <div className="text-xs text-gray-400">{form.sku} · {form.category}</div>
                </div>
              </div>
              {[['售價', form.price ? formatCurrency(form.price) : '—'], ['庫存', form.stock ?? '—'], ['KOC 折扣', form.kocDiscount ? `${form.kocDiscount}%` : '—']].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-gray-400">{l}</span><span className="font-bold text-slate-800">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <Button variant="ghost" onClick={() => step > 0 ? setStep(s => s - 1) : (onClose())} className="gap-1.5">
            <ChevronLeft size={14} />{step === 0 ? '取消' : '上一步'}
          </Button>
          <div className="flex-1" />
          {step < STEPS.length - 1
            ? <Button variant="primary" onClick={() => setStep(s => s + 1)} className="gap-1.5">下一步<ChevronRight size={14} /></Button>
            : <>
              <Button variant="outline" onClick={() => finish('draft')} className="border-amber-200 text-amber-700 hover:bg-amber-50">儲存草稿</Button>
              <Button variant="brand" onClick={() => finish('listed')} disabled={!form.name || !form.price || !form.stock}><Eye size={14} />立即上架</Button>
            </>
          }
        </div>
      </div>
    </div>
  )
}

// ─── Edit Drawer ─────────────────────────────────────────────────────────────
function Drawer({ product, open, onClose, onSave }) {
  const [form, setForm] = useState(product ?? {})
  useState(() => { if (product) setForm(product) }, [product])
  if (!open) return null
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-lg text-slate-800">{form.id ? '編輯商品' : '新增商品'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="flex-1 px-6 py-5 space-y-5">
          <div className="flex items-center gap-4 p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
            <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center text-3xl">{form.thumbnail ?? '📦'}</div>
            <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"><Upload size={12} />上傳圖片</button>
          </div>
          <Input label="商品名稱" value={form.name ?? ''} onChange={set('name')} placeholder="商品名稱" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="SKU" value={form.sku ?? ''} onChange={set('sku')} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">類別</label>
              <select value={form.category ?? ''} onChange={set('category')} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400/40">
                <option value="">選擇類別</option>
                {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="售價" type="number" value={form.price ?? ''} onChange={set('price')} />
            <Input label="原價" type="number" value={form.originalPrice ?? ''} onChange={set('originalPrice')} />
            <Input label="庫存" type="number" value={form.stock ?? ''} onChange={set('stock')} />
          </div>
          <Input label="KOC 折扣 (%)" type="number" value={form.kocDiscount ?? ''} onChange={set('kocDiscount')} />
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">取消</Button>
          <Button variant="outline" className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => { onSave({ ...form, status: 'draft' }); onClose() }}>草稿</Button>
          <Button variant="brand" className="flex-[2]" onClick={() => { onSave({ ...form, status: 'listed' }); onClose() }}><Eye size={14} />上架</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Products() {
  const [prods, setProds] = useState(initial)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('grid')
  const [wizard, setWizard] = useState(false)
  const [editing, setEditing] = useState(null)
  const [drawer, setDrawer] = useState(false)

  const filtered = prods.filter(p =>
    (filter === 'all' || p.status === filter) &&
    (!search || p.name.includes(search) || p.sku?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleToggle = id => setProds(prev => prev.map(p => p.id !== id ? p : { ...p, status: p.status === 'listed' ? 'unlisted' : 'listed' }))
  const handleDelete = id => setProds(prev => prev.filter(p => p.id !== id))
  const handleEdit = p => { setEditing(p); setDrawer(true) }
  const handleSave = up => setProds(prev => prev.find(p => p.id === up.id) ? prev.map(p => p.id === up.id ? { ...p, ...up } : p) : [...prev, up])

  const stats = {
    listed: prods.filter(p => p.status === 'listed').length,
    draft: prods.filter(p => p.status === 'draft').length,
    totalSold: prods.reduce((s, p) => s + p.sold, 0),
    gmv: prods.reduce((s, p) => s + p.price * p.sold, 0),
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="已上架商品" value={stats.listed} icon={Eye} />
        <StatCard label="草稿商品" value={stats.draft} icon={Package} />
        <StatCard label="累計銷售量" value={stats.totalSold} icon={ShoppingCart} />
        <StatCard label="商品總 GMV" value={formatCurrency(stats.gmv)} icon={TrendingUp} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {[['all', '全部'], ['listed', '已上架'], ['draft', '草稿'], ['unlisted', '已下架']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={cn('px-4 py-1.5 rounded-xl text-sm font-semibold transition-all',
            filter === v ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-slate-800')}>{l}</button>
        ))}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 w-48 ml-auto focus-within:border-amber-400 transition-colors">
          <Search size={13} className="text-gray-300" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋商品…"
            className="bg-transparent text-sm text-slate-800 placeholder:text-gray-300 outline-none w-full" />
        </div>
        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
          <button onClick={() => setView('grid')} className={cn('p-2 transition-colors', view === 'grid' ? 'bg-slate-900 text-white' : 'bg-white text-gray-400 hover:text-slate-800')}><LayoutGrid size={15} /></button>
          <button onClick={() => setView('list')} className={cn('p-2 transition-colors', view === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-gray-400 hover:text-slate-800')}><List size={15} /></button>
        </div>
        <Button variant="outline" onClick={() => { setEditing({ thumbnail: '📦', campaigns: [], tags: [], status: 'draft' }); setDrawer(true) }} className="gap-1.5"><Edit3 size={14} />快速新增</Button>
        <Button variant="brand" onClick={() => setWizard(true)} className="gap-1.5"><Plus size={15} />上架新商品</Button>
      </div>

      {view === 'grid' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => {
            const soldPct = p.stock + p.sold > 0 ? Math.round(p.sold / (p.stock + p.sold) * 100) : 0
            return (
              <Card key={p.id} hoverable className="p-5 flex flex-col gap-3 group relative overflow-hidden">
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {[
                    { icon: Edit3, fn: () => handleEdit(p), cls: 'hover:text-amber-500' },
                    { icon: p.status === 'listed' ? EyeOff : Eye, fn: () => handleToggle(p.id), cls: 'hover:text-slate-800' },
                    { icon: Trash2, fn: () => handleDelete(p.id), cls: 'hover:text-red-500' },
                  ].map(({ icon: Icon, fn, cls }) => (
                    <button key={cls} onClick={fn} className={cn('p-1.5 bg-white rounded-lg shadow-sm border border-gray-100 text-gray-400 transition-colors', cls)}><Icon size={12} /></button>
                  ))}
                </div>
                <div className="flex items-start gap-3">
                  <Thumb emoji={p.thumbnail} />
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight">{p.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{p.sku}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-bold text-slate-900">{formatCurrency(p.price)}</div>
                    {p.originalPrice > p.price && <div className="text-[10px] text-gray-300 line-through">{formatCurrency(p.originalPrice)}</div>}
                  </div>
                  <ProductBadge status={p.status} />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>庫存 {p.stock}</span><span>已售 {p.sold} ({soldPct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${soldPct}%` }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p.category}</span>
                  {p.tags?.slice(0, 2).map(t => <span key={t} className="text-[10px] bg-gray-50 border border-gray-100 text-gray-400 px-2 py-0.5 rounded-full">#{t}</span>)}
                </div>
              </Card>
            )
          })}
          {filtered.length === 0 && <div className="col-span-full py-16 text-center text-sm text-gray-400">找不到符合條件的商品</div>}
        </div>
      )}

      {view === 'list' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['商品', '類別', '售價', '庫存', '已售', 'KOC 折扣', '狀態', '操作'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3"><Thumb emoji={p.thumbnail} size="sm" />
                        <div><div className="text-sm font-semibold text-slate-800">{p.name}</div><div className="text-[10px] text-gray-400 font-mono">{p.sku}</div></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.category}</td>
                    <td className="px-4 py-3"><div className="text-sm font-bold text-slate-800">{formatCurrency(p.price)}</div></td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-center">{p.stock}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-center">{p.sold}</td>
                    <td className="px-4 py-3 text-center text-xs font-bold text-amber-600">{p.kocDiscount}%</td>
                    <td className="px-4 py-3"><ProductBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"><Edit3 size={14} /></button>
                        <button onClick={() => handleToggle(p.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-slate-800 hover:bg-gray-100 transition-colors">{p.status === 'listed' ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )) : <tr><td colSpan={8} className="py-16 text-center text-sm text-gray-400">找不到商品</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Wizard open={wizard} onClose={() => setWizard(false)} onComplete={handleSave} />
      <Drawer product={editing} open={drawer} onClose={() => setDrawer(false)} onSave={handleSave} />
    </div>
  )
}
