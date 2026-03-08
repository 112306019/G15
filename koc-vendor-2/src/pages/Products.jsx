import { useState } from 'react'
import {
  Plus, Search, LayoutGrid, List, Tag, Package,
  TrendingUp, Eye, EyeOff, Edit3, Trash2, X,
  ChevronRight, ChevronLeft, Check, Upload,
  AlertCircle, Star, BarChart2, ShoppingCart,
} from 'lucide-react'
import { products as initialProducts, productCategories, campaigns } from '@/data/mock'
import { Button, Card, Input, Select, Modal, Badge, StatCard } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'

// ─── Status config ────────────────────────────────────────────────────────────
const statusCfg = {
  listed:   { label: '已上架', color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
  draft:    { label: '草稿',   color: 'text-amber-700',   bg: 'bg-amber-50',   ring: 'ring-amber-200',   dot: 'bg-amber-500'   },
  unlisted: { label: '已下架', color: 'text-ink-muted',   bg: 'bg-surface-200', ring: 'ring-surface-300', dot: 'bg-ink-faint'  },
}

function ProductBadge({ status }) {
  const c = statusCfg[status] ?? statusCfg.draft
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset',
      c.color, c.bg, c.ring,
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
      {c.label}
    </span>
  )
}

// ─── Product thumbnail placeholder ───────────────────────────────────────────
function Thumb({ emoji, size = 'md' }) {
  const s = size === 'sm' ? 'w-12 h-12 text-2xl' : size === 'lg' ? 'w-24 h-24 text-5xl' : 'w-16 h-16 text-3xl'
  return (
    <div className={cn('rounded-xl bg-surface-100 flex items-center justify-center shrink-0 border border-surface-200', s)}>
      {emoji}
    </div>
  )
}

// ─── Grid card ────────────────────────────────────────────────────────────────
function ProductGridCard({ p, onEdit, onToggle, onDelete }) {
  const soldPct = p.stock + p.sold > 0 ? Math.round(p.sold / (p.stock + p.sold) * 100) : 0
  return (
    <Card hoverable className="p-5 flex flex-col gap-4 group relative overflow-hidden">
      {/* actions on hover */}
      <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={() => onEdit(p)} className="p-1.5 bg-white rounded-lg shadow-card text-ink-faint hover:text-brand transition-colors border border-surface-200">
          <Edit3 size={13} />
        </button>
        <button onClick={() => onToggle(p.id)} className="p-1.5 bg-white rounded-lg shadow-card text-ink-faint hover:text-ink transition-colors border border-surface-200">
          {p.status === 'listed' ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button onClick={() => onDelete(p.id)} className="p-1.5 bg-white rounded-lg shadow-card text-ink-faint hover:text-danger transition-colors border border-surface-200">
          <Trash2 size={13} />
        </button>
      </div>

      <div className="flex items-start gap-3">
        <Thumb emoji={p.thumbnail} />
        <div className="flex-1 min-w-0 pt-1">
          <div className="text-sm font-bold text-ink leading-tight line-clamp-2">{p.name}</div>
          <div className="text-[10px] text-ink-faint mt-1 font-mono">{p.sku}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-mono font-bold text-ink">{formatCurrency(p.price)}</div>
          {p.originalPrice > p.price && (
            <div className="text-xs text-ink-faint line-through">{formatCurrency(p.originalPrice)}</div>
          )}
        </div>
        <ProductBadge status={p.status} />
      </div>

      {/* Stock bar */}
      <div>
        <div className="flex justify-between text-[10px] text-ink-faint mb-1.5">
          <span>庫存 {p.stock}</span>
          <span>已售 {p.sold} ({soldPct}%)</span>
        </div>
        <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
          <div className="h-full bg-brand rounded-full" style={{ width: `${soldPct}%` }} />
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] font-semibold bg-surface-100 text-ink-muted border border-surface-200 px-2 py-0.5 rounded-full">
          {p.category}
        </span>
        {p.tags.slice(0, 2).map(t => (
          <span key={t} className="text-[10px] font-semibold bg-surface-100 text-ink-faint border border-surface-200 px-2 py-0.5 rounded-full">
            #{t}
          </span>
        ))}
      </div>
    </Card>
  )
}

// ─── List row ─────────────────────────────────────────────────────────────────
function ProductListRow({ p, onEdit, onToggle, onDelete }) {
  return (
    <tr className="border-b border-surface-200 hover:bg-surface-50 transition-colors group">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Thumb emoji={p.thumbnail} size="sm" />
          <div>
            <div className="text-sm font-semibold text-ink">{p.name}</div>
            <div className="text-[10px] text-ink-faint font-mono">{p.sku}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-xs text-ink-muted">{p.category}</td>
      <td className="px-4 py-3.5">
        <div className="font-mono text-sm font-bold text-ink">{formatCurrency(p.price)}</div>
        {p.originalPrice > p.price && (
          <div className="text-[10px] text-ink-faint line-through">{formatCurrency(p.originalPrice)}</div>
        )}
      </td>
      <td className="px-4 py-3.5 text-sm text-ink-muted text-center">{p.stock}</td>
      <td className="px-4 py-3.5 text-sm text-ink-muted text-center">{p.sold}</td>
      <td className="px-4 py-3.5 text-center">
        <span className="text-xs font-semibold text-brand">{p.kocDiscount}%</span>
      </td>
      <td className="px-4 py-3.5"><ProductBadge status={p.status} /></td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(p)} className="p-1.5 rounded-lg text-ink-faint hover:text-brand hover:bg-brand/5 transition-colors">
            <Edit3 size={14} />
          </button>
          <button onClick={() => onToggle(p.id)} className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-surface-100 transition-colors">
            {p.status === 'listed' ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button onClick={() => onDelete(p.id)} className="p-1.5 rounded-lg text-ink-faint hover:text-danger hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Detail / Edit Drawer ─────────────────────────────────────────────────────
function ProductDrawer({ product, open, onClose, onSave }) {
  const [form, setForm] = useState(product ?? {})

  // sync when product changes
  useState(() => { setForm(product ?? {}) }, [product])

  if (!open) return null

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-xl bg-white h-full overflow-y-auto shadow-modal flex flex-col animate-fadeUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-200 sticky top-0 bg-white z-10">
          <h2 className="font-display font-bold text-lg text-ink">
            {form.id ? '編輯商品' : '新增商品'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-surface-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Thumbnail preview */}
          <div className="flex items-center gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200 border-dashed">
            <div className="w-20 h-20 rounded-xl bg-surface-200 flex items-center justify-center text-4xl shrink-0">
              {form.thumbnail ?? '📦'}
            </div>
            <div>
              <div className="text-sm font-semibold text-ink mb-1">商品圖片</div>
              <div className="text-xs text-ink-faint mb-2">建議尺寸 800×800px，JPG / PNG</div>
              <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand bg-brand/10 hover:bg-brand/20 px-3 py-1.5 rounded-lg transition-colors">
                <Upload size={12} /> 上傳圖片
              </button>
            </div>
          </div>

          {/* Basic info */}
          <section>
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">基本資訊</h3>
            <div className="space-y-3">
              <Input label="商品名稱" value={form.name ?? ''} onChange={set('name')} placeholder="例：夏季保養旗艦組 Premium" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="SKU" value={form.sku ?? ''} onChange={set('sku')} placeholder="SKU-XXX-001" />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">類別</label>
                  <select
                    value={form.category ?? ''}
                    onChange={set('category')}
                    className="w-full bg-surface-100 border border-surface-300 rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all"
                  >
                    <option value="">選擇類別</option>
                    {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">商品描述</label>
                <textarea
                  rows={3}
                  value={form.description ?? ''}
                  onChange={set('description')}
                  placeholder="詳細描述商品成分、效果及使用方式..."
                  className="w-full bg-surface-100 border border-surface-300 rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all resize-none"
                />
              </div>
            </div>
          </section>

          {/* Pricing & stock */}
          <section>
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">定價與庫存</h3>
            <div className="grid grid-cols-3 gap-3">
              <Input label="售價 (NT$)"   type="number" value={form.price ?? ''} onChange={set('price')} placeholder="1680" />
              <Input label="原價 (NT$)"   type="number" value={form.originalPrice ?? ''} onChange={set('originalPrice')} placeholder="2100" />
              <Input label="庫存數量"     type="number" value={form.stock ?? ''} onChange={set('stock')} placeholder="100" />
            </div>
          </section>

          {/* KOC settings */}
          <section>
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">KOC 活動設定</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="KOC 優惠折扣 (%)" type="number" value={form.kocDiscount ?? ''} onChange={set('kocDiscount')} placeholder="15" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">加入活動</label>
                <div className="flex flex-wrap gap-2">
                  {campaigns.filter(c => c.status !== 'ended').map(c => {
                    const joined = (form.campaigns ?? []).includes(c.id)
                    return (
                      <button
                        key={c.id}
                        onClick={() => setForm(f => ({
                          ...f,
                          campaigns: joined
                            ? (f.campaigns ?? []).filter(id => id !== c.id)
                            : [...(f.campaigns ?? []), c.id],
                        }))}
                        className={cn(
                          'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all',
                          joined
                            ? 'bg-brand/10 text-brand border-brand/30'
                            : 'bg-surface-100 text-ink-muted border-surface-300 hover:border-surface-400',
                        )}
                      >
                        {joined && <Check size={10} className="inline mr-1" />}
                        {c.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Tags */}
          <section>
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">標籤</h3>
            <Input
              label=""
              value={(form.tags ?? []).join(', ')}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
              placeholder="保養, 夏季, 組合（逗號分隔）"
            />
          </section>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-surface-200 px-6 py-4 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">取消</Button>
          <Button
            variant="outline"
            className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50"
            onClick={() => { onSave({ ...form, status: 'draft' }); onClose() }}
          >
            儲存草稿
          </Button>
          <Button
            variant="brand"
            className="flex-[2]"
            onClick={() => { onSave({ ...form, status: 'listed' }); onClose() }}
          >
            <Eye size={14} /> 上架商品
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Listing Wizard ───────────────────────────────────────────────────────────
const STEPS = ['基本資訊', '定價庫存', 'KOC 設定', '確認上架']

function WizardStep({ step, form, setForm }) {
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  if (step === 0) return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 bg-surface-50 border border-dashed border-surface-300 rounded-xl">
        <div className="w-16 h-16 rounded-xl bg-surface-200 flex items-center justify-center text-3xl">
          {form.thumbnail ?? '📦'}
        </div>
        <div>
          <div className="text-sm font-semibold text-ink mb-1">商品主圖</div>
          <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand bg-brand/10 px-3 py-1.5 rounded-lg hover:bg-brand/20 transition-colors">
            <Upload size={12} /> 上傳圖片
          </button>
        </div>
      </div>
      <Input label="商品名稱 *" value={form.name ?? ''} onChange={set('name')} placeholder="例：深層保濕精華液" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="SKU" value={form.sku ?? ''} onChange={set('sku')} placeholder="SKU-XXX-001" />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">類別 *</label>
          <select value={form.category ?? ''} onChange={set('category')} className="w-full bg-surface-100 border border-surface-300 rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all">
            <option value="">選擇類別</option>
            {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">商品描述</label>
        <textarea rows={3} value={form.description ?? ''} onChange={set('description')} placeholder="詳細描述商品成分、效果及使用方式..."
          className="w-full bg-surface-100 border border-surface-300 rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all resize-none" />
      </div>
      <Input label="標籤（逗號分隔）" value={(form.tags ?? []).join(', ')} onChange={e => setForm(f => ({ ...f, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} placeholder="保養, 精華, 秋冬" />
    </div>
  )

  if (step === 1) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="售價 (NT$) *" type="number" value={form.price ?? ''} onChange={set('price')} placeholder="1200" />
        <Input label="原價 (NT$)" type="number" value={form.originalPrice ?? ''} onChange={set('originalPrice')} placeholder="1500" />
      </div>
      <Input label="初始庫存數量 *" type="number" value={form.stock ?? ''} onChange={set('stock')} placeholder="100" />
      {form.price && form.originalPrice && Number(form.originalPrice) > Number(form.price) && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5">
          <Tag size={14} className="text-emerald-600" />
          <span className="text-sm text-emerald-700 font-semibold">
            折扣 {Math.round((1 - form.price / form.originalPrice) * 100)}%（省 {formatCurrency(form.originalPrice - form.price)}）
          </span>
        </div>
      )}
    </div>
  )

  if (step === 2) return (
    <div className="space-y-4">
      <div className="bg-brand/5 border border-brand/20 rounded-xl p-4">
        <div className="text-xs font-bold text-brand mb-1">什麼是 KOC 優惠碼？</div>
        <div className="text-xs text-ink-muted">KOC 會獲得專屬優惠碼，購買後以此碼向消費者推廣。消費者使用優惠碼結帳可享折扣，KOC 可追蹤帶來的銷售業績。</div>
      </div>
      <Input label="KOC 優惠折扣 (%) *" type="number" value={form.kocDiscount ?? ''} onChange={set('kocDiscount')} placeholder="15" />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">加入活動</label>
        <div className="flex flex-wrap gap-2">
          {campaigns.filter(c => c.status !== 'ended').map(c => {
            const joined = (form.campaigns ?? []).includes(c.id)
            return (
              <button key={c.id} onClick={() => setForm(f => ({
                ...f, campaigns: joined ? (f.campaigns ?? []).filter(id => id !== c.id) : [...(f.campaigns ?? []), c.id]
              }))} className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all', joined ? 'bg-brand/10 text-brand border-brand/30' : 'bg-surface-100 text-ink-muted border-surface-300 hover:border-surface-400')}>
                {joined && <Check size={10} className="inline mr-1" />}{c.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  if (step === 3) return (
    <div className="space-y-4">
      <div className="bg-surface-50 border border-surface-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3 pb-3 border-b border-surface-200">
          <div className="w-14 h-14 rounded-xl bg-surface-200 flex items-center justify-center text-3xl">
            {form.thumbnail ?? '📦'}
          </div>
          <div>
            <div className="font-bold text-ink">{form.name || '（未命名）'}</div>
            <div className="text-xs text-ink-faint">{form.sku} · {form.category}</div>
          </div>
        </div>
        {[
          { label: '售價', value: form.price ? formatCurrency(form.price) : '—' },
          { label: '原價', value: form.originalPrice ? formatCurrency(form.originalPrice) : '—' },
          { label: '庫存', value: form.stock ?? '—' },
          { label: 'KOC 折扣', value: form.kocDiscount ? `${form.kocDiscount}%` : '—' },
          { label: '加入活動', value: (form.campaigns ?? []).map(id => campaigns.find(c => c.id === id)?.name).filter(Boolean).join(', ') || '無' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-ink-muted">{label}</span>
            <span className="font-semibold text-ink">{value}</span>
          </div>
        ))}
      </div>
      {(!form.name || !form.price || !form.stock) && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-3">
          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <span className="text-xs text-amber-700">請確認已填寫商品名稱、售價及庫存數量。</span>
        </div>
      )}
    </div>
  )

  return null
}

function ListingWizard({ open, onClose, onComplete }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ thumbnail: '📦', campaigns: [], tags: [] })

  function reset() { setStep(0); setForm({ thumbnail: '📦', campaigns: [], tags: [] }) }

  function finish(status) {
    onComplete({ ...form, status, id: `p${Date.now()}`, sold: 0, createdAt: new Date().toISOString().slice(0, 10) })
    reset()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => { reset(); onClose() }} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-modal border border-surface-200 overflow-hidden animate-fadeUp">
        {/* Step header */}
        <div className="px-6 pt-6 pb-4 border-b border-surface-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-ink">上架新商品</h2>
            <button onClick={() => { reset(); onClose() }} className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-surface-100 transition-colors">
              <X size={18} />
            </button>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all',
                  i < step ? 'bg-brand text-white' : i === step ? 'bg-ink text-white' : 'bg-surface-200 text-ink-faint',
                )}>
                  {i < step ? <Check size={11} /> : i + 1}
                </div>
                <div className={cn('text-[10px] font-semibold ml-1.5 hidden sm:block', i === step ? 'text-ink' : 'text-ink-faint')}>
                  {s}
                </div>
                {i < STEPS.length - 1 && <div className={cn('flex-1 h-px mx-2', i < step ? 'bg-brand' : 'bg-surface-200')} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          <WizardStep step={step} form={form} setForm={setForm} />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-200 flex gap-3">
          <Button variant="ghost" onClick={() => step > 0 ? setStep(s => s - 1) : (reset(), onClose())} className="gap-1.5">
            <ChevronLeft size={14} /> {step === 0 ? '取消' : '上一步'}
          </Button>
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={() => setStep(s => s + 1)} className="gap-1.5">
              下一步 <ChevronRight size={14} />
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => finish('draft')} className="border-amber-200 text-amber-700 hover:bg-amber-50">
                儲存草稿
              </Button>
              <Button variant="brand" onClick={() => finish('listed')} disabled={!form.name || !form.price || !form.stock}>
                <Eye size={14} /> 立即上架
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
const statusFilters = [
  { value: 'all', label: '全部' },
  { value: 'listed', label: '已上架' },
  { value: 'draft', label: '草稿' },
  { value: 'unlisted', label: '已下架' },
]

export default function Products() {
  const [prods, setProds]       = useState(initialProducts)
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [viewMode, setViewMode] = useState('grid')   // 'grid' | 'list'
  const [wizard, setWizard]     = useState(false)
  const [editing, setEditing]   = useState(null)     // product or null
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filtered = prods.filter(p => {
    const matchStatus = filter === 'all' || p.status === filter
    const matchSearch = !search || p.name.includes(search) || p.sku.toLowerCase().includes(search.toLowerCase()) || p.category.includes(search)
    return matchStatus && matchSearch
  })

  function handleToggle(id) {
    setProds(prev => prev.map(p => p.id !== id ? p : {
      ...p, status: p.status === 'listed' ? 'unlisted' : 'listed',
    }))
  }

  function handleDelete(id) {
    setProds(prev => prev.filter(p => p.id !== id))
  }

  function handleEdit(p) {
    setEditing(p)
    setDrawerOpen(true)
  }

  function handleSave(updated) {
    setProds(prev => {
      const exists = prev.find(p => p.id === updated.id)
      if (exists) return prev.map(p => p.id === updated.id ? { ...p, ...updated } : p)
      return [...prev, updated]
    })
  }

  function handleNew() {
    setEditing({ thumbnail: '📦', campaigns: [], tags: [], status: 'draft' })
    setDrawerOpen(true)
  }

  const listed   = prods.filter(p => p.status === 'listed').length
  const draft    = prods.filter(p => p.status === 'draft').length
  const totalGmv = prods.reduce((s, p) => s + p.price * p.sold, 0)
  const totalSold = prods.reduce((s, p) => s + p.sold, 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="已上架商品"  value={listed}                icon={Eye}          accent="text-brand"     delay={0}   />
        <StatCard label="草稿商品"    value={draft}                 icon={Package}      accent="text-amber-500" delay={80}  />
        <StatCard label="累計銷售量"  value={totalSold}             icon={ShoppingCart} accent="text-blue-500"  delay={160} />
        <StatCard label="商品總 GMV"  value={formatCurrency(totalGmv)} icon={TrendingUp} accent="text-emerald-500" delay={240} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status filters */}
        <div className="flex gap-2">
          {statusFilters.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
              filter === f.value ? 'bg-ink text-white' : 'bg-white border border-surface-200 text-ink-muted hover:text-ink',
            )}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-surface-200 rounded-lg px-3 py-2 w-52 focus-within:border-brand transition-colors ml-auto">
          <Search size={13} className="text-ink-faint" />
          <input type="text" placeholder="搜尋商品名稱 / SKU..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none w-full" />
        </div>

        {/* View toggle */}
        <div className="flex border border-surface-200 rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('grid')} className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-ink text-white' : 'bg-white text-ink-faint hover:text-ink')}>
            <LayoutGrid size={15} />
          </button>
          <button onClick={() => setViewMode('list')} className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-ink text-white' : 'bg-white text-ink-faint hover:text-ink')}>
            <List size={15} />
          </button>
        </div>

        {/* Actions */}
        <Button variant="outline" onClick={handleNew} className="gap-1.5">
          <Edit3 size={14} /> 快速新增
        </Button>
        <Button variant="brand" onClick={() => setWizard(true)} className="gap-1.5">
          <Plus size={15} /> 上架新商品
        </Button>
      </div>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => (
            <ProductGridCard key={p.id} p={p} onEdit={handleEdit} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center text-sm text-ink-faint">找不到符合條件的商品</div>
          )}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 text-left">
                  {['商品', '類別', '售價', '庫存', '已售', 'KOC 折扣', '狀態', '操作'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-ink-faint uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0
                  ? filtered.map(p => <ProductListRow key={p.id} p={p} onEdit={handleEdit} onToggle={handleToggle} onDelete={handleDelete} />)
                  : <tr><td colSpan={8} className="py-16 text-center text-sm text-ink-faint">找不到符合條件的商品</td></tr>
                }
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Listing wizard */}
      <ListingWizard open={wizard} onClose={() => setWizard(false)} onComplete={handleSave} />

      {/* Edit drawer */}
      <ProductDrawer
        product={editing}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
