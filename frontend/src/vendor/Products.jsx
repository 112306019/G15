import React, { useEffect, useState } from 'react'
import { Plus, Search, LayoutGrid, List, Edit3, Trash2, X, Upload, Package, ShoppingCart, TrendingUp, Archive } from 'lucide-react'
import { productCategories } from './mock'
import { formatCurrency, cn } from './lib/utils'
import { getVendorProducts, createVendorProduct, deleteVendorProduct, updateVendorProduct} from '../api/vendor'

// 🟢 專屬品牌色狀態設定 (配合新商業邏輯)
const statusCfg = {
  active: { label: '推廣中', cls: 'bg-[#FDF0ED] text-[#C8522A]', dot: 'bg-[#C8522A]' }, // 正在某個任務裡
  idle:   { label: '庫存中', cls: 'bg-[#F5F0E8] text-[#1A1A18]', dot: 'bg-[#1A1A18]' }, // 閒置在資料庫
  empty:  { label: '已售完', cls: 'bg-white border border-[#E2DDD4] text-[#8C8880]', dot: 'bg-[#E2DDD4]' },
}

function mapProductFromApi(product) {
  return {
    id: product.product_id,
    name: product.product_name,
    sku: `PRODUCT-${String(product.product_id).padStart(5, '0')}`,
    category: product.category || '未分類',
    price: Number(product.price || 0),
    discountedPrice:
      product.discounted_price === null
        ? null
        : Number(product.discounted_price),
    stock: Number(product.stock || 0),
    sold: Number(product.quantity_sold || 0),
    totalSales: Number(product.total_sales || 0),
    thumbnail: product.image_url || '📦',
    imageUrl: product.image_url || '',
    description: product.description || '',
    apiStatus: product.status,
    status:
      Number(product.stock) === 0
        ? 'empty'
        : product.status === 'active'
          ? 'active'
          : 'idle'
  }
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
function ProductModal({ open, onClose, onComplete, editingProduct}) {
  const emptyForm = {
    name: '',
    sku: '',
    category: '',
    price: '',
    discountedPrice: '',
    stock: '',
    description: '',
    imageUrl: '',
    thumbnail: '📦'
  }
  
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    if (editingProduct) {
      setForm({
        name: editingProduct.name || '',
        sku: editingProduct.sku || '',
        category: editingProduct.category || '',
        price: editingProduct.price || '',
        discountedPrice: editingProduct.discountedPrice || '',
        stock: editingProduct.stock ?? '',
        description: editingProduct.description || '',
        imageUrl: editingProduct.imageUrl || '',
        thumbnail: editingProduct.thumbnail || '📦'
      })
    } else {
      setForm(emptyForm)
    }

    setError('')
  }, [editingProduct, open])

  
  async function finish() {
    try {
      setSaving(true)
      setError('')

      await onComplete(form)

      setForm(emptyForm)
      onClose()
    } catch (err) {
      const apiError = err.response?.data?.err

      setError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : err.message || '商品儲存失敗'
      )
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-[#1A1A18]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-[#E2DDD4] animate-in zoom-in-95 duration-300">
        
        <div className="px-8 pt-8 pb-5 border-b border-[#E2DDD4] bg-[#F8F9FA] flex justify-between items-center">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#1A1A18]">{editingProduct ? '修改商品資料' : '新增至商品庫'}</h2>
            <p className="text-xs font-bold text-[#8C8880] mt-1">
              {editingProduct
                ? '更新商品價格、庫存與基本資訊'
                : '建立基礎商品資料'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-[#8C8880] hover:bg-[#E2DDD4] hover:text-[#1A1A18] transition-colors"><X size={18}/></button>
        </div>

        <div className="px-8 py-6 max-h-[60vh] overflow-y-auto space-y-5">
          <div className="flex items-center gap-5 p-5 bg-[#F8F9FA] border border-dashed border-[#E2DDD4] rounded-2xl">
            <Thumb emoji={form.thumbnail} size="lg" />
            <button className="inline-flex items-center gap-2 text-xs font-bold text-[#1A1A18] bg-white border border-[#E2DDD4] hover:border-[#1A1A18] px-4 py-2 rounded-full transition-all"><Upload size={14}/>上傳圖片</button>
          </div>
          <Input
            label="商品名稱 *"
            value={form.name}
            onChange={set('name')}
            placeholder="例：深層保濕精華液"
          />

          <Input
            label="商品描述"
            value={form.description}
            onChange={set('description')}
            placeholder="輸入商品介紹"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="商品定價 *"
              type="number"
              value={form.price}
              onChange={set('price')}
            />

            <Input
              label="通路折扣價格"
              type="number"
              value={form.discountedPrice}
              onChange={set('discountedPrice')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="庫存數量 *"
              type="number"
              value={form.stock}
              onChange={set('stock')}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">
                類別
              </label>

              <select
                value={form.category}
                onChange={set('category')}
                className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm"
              >
                <option value="">選擇類別</option>

                {productCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="商品圖片網址"
            value={form.imageUrl}
            onChange={set('imageUrl')}
            placeholder="https://..."
          />
        </div>
        
        {error && (
          <p className="text-sm font-bold text-red-600">
            {error}
          </p>
        )}

        <div className="px-8 py-5 border-t border-[#E2DDD4] flex gap-4 bg-[#F8F9FA] justify-end">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button
            variant="brand"
            onClick={finish}
            disabled={saving || !form.name || !form.price || form.stock === ''}
          >
            {saving
              ? '儲存中...'
              : editingProduct
                ? '儲存修改'
                : '新增商品'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Products() {
  // 將 mock 資料中的狀態 mapping 到我們新的邏輯
  const [prods, setProds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingProduct, setEditingProduct] = useState(null)
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [view, setView]         = useState('grid')
  const [modalOpen, setModalOpen] = useState(false)
  
  const vendorId = localStorage.getItem('vendor_id')

  useEffect(() => {
    async function loadProducts() {
      if (!vendorId) {
        setError('尚未登入廠商帳號')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const response = await getVendorProducts(vendorId)

        setProds(
          response.data.products.map(mapProductFromApi)
        )
      } catch (err) {
        setError(
          err.response?.data?.err ||
          err.message ||
          '商品資料載入失敗'
        )
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [vendorId])

  const filtered = prods.filter(p =>
    (filter === 'all' || p.status === filter) &&
    (!search || p.name.includes(search) || p.sku?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleOpenCreate = () => {
    setEditingProduct(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (product) => {
    setEditingProduct(product)
    setModalOpen(true)
  }

  const handleDelete = async product => {
    const confirmed = window.confirm(
      `確定要刪除商品「${product.name}」嗎？`
    )

    if (!confirmed) return

    try {
      setError('')

      const response = await deleteVendorProduct({
        vendor_id: vendorId,
        product_id: product.id
      })

      if (response.data?.success === false) {
        throw new Error(
          response.data.err || '刪除商品失敗'
        )
      }

      setProds(previous =>
        previous.filter(
          item => item.id !== product.id
        )
      )
    } catch (err) {
      console.error('刪除商品失敗：', err)

      const apiError = err.response?.data?.err

      setError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : err.message || '刪除商品失敗'
      )
    }
  }


  const handleSave = async form => {
    if (!vendorId) {
      throw new Error('找不到廠商編號，請重新登入')
    }

    const payload = {
      vendor_id: vendorId,
      product_name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      discounted_price:
        form.discountedPrice === ''
          ? null
          : Number(form.discountedPrice),
      stock: Number(form.stock),
      category: form.category || '',
      image_url: form.imageUrl.trim(),
      status: editingProduct?.apiStatus || 'inactive'
    }

    if (editingProduct) {
      const response = await updateVendorProduct({
        ...payload,
        product_id: editingProduct.id
      })

      setProds(previous =>
        previous.map(product =>
          product.id === editingProduct.id
            ? {
                ...product,
                name: form.name,
                category: form.category || '未分類',
                price: Number(form.price),
                discountedPrice:
                  form.discountedPrice === ''
                    ? null
                    : Number(form.discountedPrice),
                stock: Number(form.stock),
                description: form.description,
                imageUrl: form.imageUrl,
                thumbnail: form.imageUrl || '📦',
                status:
                  Number(form.stock) === 0
                    ? 'empty'
                    : payload.status === 'active'
                      ? 'active'
                      : 'idle'
              }
            : product
        )
      )

      return response
    }

    const response = await createVendorProduct(payload)

    const newProduct = {
      id: response.data.product_id,
      name: form.name,
      sku: form.sku ||
        `PRODUCT-${String(response.data.product_id).padStart(5, '0')}`,
      category: form.category || '未分類',
      price: Number(form.price),
      discountedPrice:
        form.discountedPrice === ''
          ? null
          : Number(form.discountedPrice),
      stock: Number(form.stock),
      sold: 0,
      totalSales: 0,
      thumbnail: form.imageUrl || '📦',
      imageUrl: form.imageUrl,
      description: form.description,
      apiStatus: 'inactive',
      status: Number(form.stock) === 0 ? 'empty' : 'inactive'
    }

    setProds(previous => [newProduct, ...previous])
  }

  const handleToggleStatus = async product => {
    if (!vendorId) {
      setError('找不到廠商編號，請重新登入')
      return
    }

    const nextStatus =
      product.apiStatus === 'active'
        ? 'inactive'
        : 'active'

    try {
      setError('')

      await updateVendorProduct({
        vendor_id: vendorId,
        product_id: product.id,
        product_name: product.name,
        description: product.description || '',
        price: product.price,
        discounted_price: product.discountedPrice,
        stock: product.stock,
        category:
          product.category === '未分類'
            ? ''
            : product.category,
        image_url: product.imageUrl || '',
        status: nextStatus
      })

      setProds(previous =>
        previous.map(item =>
          item.id === product.id
            ? {
                ...item,
                apiStatus: nextStatus,
                status:
                  item.stock === 0
                    ? 'empty'
                    : nextStatus === 'active'
                      ? 'active'
                      : 'inactive'
              }
            : item
        )
      )
    } catch (err) {
      setError(
        err.response?.data?.err ||
        err.message ||
        '商品狀態更新失敗'
      )
    }
  }


  const stats = {
    total:     prods.length,
    active:    prods.filter(p => p.status === 'active').length,
    totalSold: prods.reduce((s,p) => s+p.sold, 0),
    gmv:       prods.reduce((s,p) => s+(p.totalSales || 0), 0),
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-sm font-bold text-[#8C8880]">
        商品資料載入中...
      </div>
    )
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

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {String(error)}
        </div>
      )}

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

        <Button
          variant="brand"
          onClick={handleOpenCreate}
          className="gap-2 px-6 py-2.5"
        >
          <Plus size={16} />
          新增商品
        </Button>
      </div>

      {/* 網格視圖 (Grid View) */}
      {view === 'grid' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(p => {
            const soldPct = p.stock+p.sold > 0 ? Math.round(p.sold/(p.stock+p.sold)*100) : 0
            return (
              <Card key={p.id} hoverable className="p-6 flex flex-col gap-4 group relative overflow-hidden">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={() => handleToggleStatus(p)}
                    disabled={p.stock === 0}
                    className="px-3 py-2 bg-white/90 rounded-full shadow-sm border border-[#E2DDD4] text-xs font-bold text-[#8C8880] hover:text-[#C8522A] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {p.apiStatus === 'active' ? '下架' : '上架'}
                  </button>
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-2 bg-white/90 rounded-full shadow-sm border border-[#E2DDD4] text-[#8C8880] hover:text-[#C8522A]"
                  >
                    <Edit3 size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={event => {
                      event.preventDefault()
                      event.stopPropagation()
                      handleDelete(p)
                    }}
                    className="p-2 bg-white/90 rounded-full shadow-sm border border-[#E2DDD4] text-[#8C8880] hover:text-[#D93025]"
                    title="刪除商品"
                  >
                    <Trash2 size={14} />
                  </button>
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
                    <div className="flex items-baseline gap-2">
                      <div className={cn(
                        'text-lg font-black',
                        p.discountedPrice !== null && p.discountedPrice < p.price
                          ? 'text-[#8C8880] line-through text-sm'
                          : 'text-[#1A1A18]'
                      )}>
                        {formatCurrency(p.price)}
                      </div>
                      {p.discountedPrice !== null && p.discountedPrice < p.price && (
                        <div className="text-lg font-black text-[#C8522A]">
                          {formatCurrency(p.discountedPrice)}
                        </div>
                      )}
                    </div>
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
                    <td className="p-5">
                      <div className={cn(
                        'text-sm font-black',
                        p.discountedPrice !== null && p.discountedPrice < p.price
                          ? 'text-[#8C8880] line-through'
                          : 'text-[#1A1A18]'
                      )}>
                        {formatCurrency(p.price)}
                      </div>
                      {p.discountedPrice !== null && p.discountedPrice < p.price && (
                        <div className="text-sm font-black text-[#C8522A]">
                          {formatCurrency(p.discountedPrice)}
                        </div>
                      )}
                    </td>
                    <td className="p-5 text-sm font-bold text-[#8C8880]">{p.stock}</td>
                    <td className="p-5 text-sm font-black text-[#C8522A]">{p.sold}</td>
                    <td className="p-5"><ProductBadge status={p.status}/></td>
                    <td className="p-5">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(p)} className="p-2 rounded-full bg-white border border-[#E2DDD4] text-[#8C8880] hover:text-[#C8522A] hover:border-[#C8522A] hover:bg-[#FFF0F0] transition-colors shadow-sm"><Edit3 size={14}/></button>
                        <button
                          type="button"
                          onClick={event => {
                            event.preventDefault()
                            event.stopPropagation()
                            handleDelete(p)
                          }}
                          className="p-2 rounded-full bg-white border border-[#E2DDD4] text-[#8C8880] hover:text-[#D93025] hover:border-[#D93025] hover:bg-[#FFF0F0] transition-colors shadow-sm"
                          title="刪除商品"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          disabled={p.stock === 0}
                          className="px-3 py-2 rounded-full bg-white border border-[#E2DDD4] text-xs font-bold text-[#8C8880] hover:text-[#C8522A] disabled:opacity-40"
                        >
                          {p.apiStatus === 'active' ? '下架' : '上架'}
                        </button>
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
      <ProductModal
        open={modalOpen}
        editingProduct={editingProduct}
        onClose={() => {
          setModalOpen(false)
          setEditingProduct(null)
        }}
        onComplete={handleSave}
      />
    </div>
  )
}