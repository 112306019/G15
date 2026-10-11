import { API_BASE_URL } from '../config';
import React, { useState, useEffect, useRef } from 'react'
import { Plus, Calendar, Users, TrendingUp, Check, ChevronRight, ChevronLeft, Upload, Package, X, Eye, FileText, ArrowRight, Instagram, CheckCircle2, Clock, Save, Trash2, Loader2, Timer, Edit3, Lock, LayoutGrid, List, AlertCircle } from 'lucide-react'
import { formatCurrency, budgetUsedPct, cn } from './lib/utils'
import { getVendorProducts, getVendorBundles, createVendorBundle, getVendorCampaigns, createVendorCampaign, updateVendorCampaign, deleteVendorCampaign, getVendorApplications, reviewVendorApplication} from '../api/vendor'
import { useToast } from './components/ui/Toast'
import { useConfirm } from './components/ui/ConfirmDialog'
import { formatApiError, getErrorMessage } from '../errorMessage';


// 取得今天的日期字串 (YYYY-MM-DD)，用於防呆與排程判斷
const getTodayString = () => new Date().toISOString().slice(0,10)

const isValidUuid = value => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  )
}

function Card({ children, className = "", hoverable, onClick }) {
  return <div onClick={onClick} className={cn(`bg-white rounded-[1.5rem] border border-[#E2DDD4] shadow-sm ${hoverable ? 'hover:border-[#B89B6A] hover:shadow-[0_8px_28px_rgba(26,26,24,0.06)] transition-all cursor-pointer' : ''}`, className)}>{children}</div>
}

function Badge({ status }) {
  const cfg = {
    active: { label: '招募中', cls: 'bg-[#FDF0ED] text-[#C8522A]', dot: 'bg-[#C8522A]' },
    scheduled: { label: '排程中', cls: 'bg-[#F8F9FA] border border-[#E2DDD4] text-[#1A1A18]', dot: 'bg-[#B89B6A]' },
    promo:  { label: '推廣中', cls: 'bg-[#F5F0E8] text-[#1A1A18]', dot: 'bg-[#1A1A18]' },
    closed: { label: '已結案 (已失效)', cls: 'bg-white border border-[#E2DDD4] text-[#8C8880]', dot: 'bg-[#E2DDD4]' },
    draft:  { label: '草稿', cls: 'bg-white border border-[#E2DDD4] text-[#8C8880]', dot: 'bg-[#8C8880]' },
  }[status] || { label: status, cls: 'bg-gray-100 text-gray-500', dot: 'bg-gray-500' }
  
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider whitespace-nowrap', cfg.cls)}>
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
    <button disabled={disabled} className={cn('inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap', variants[variant], className)} {...props}>
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
  const sizeMap = {
    sm: { box: 'w-11 h-11 rounded-lg', text: 'text-xl' },
    md: { box: 'w-14 h-14 rounded-xl', text: 'text-3xl' },
    lg: { box: 'w-20 h-20 rounded-2xl', text: 'text-4xl' },
  }
  const { box, text } = sizeMap[size] || sizeMap.md

  const isImageUrl =
    typeof emoji === 'string' && /^https?:\/\//.test(emoji)

  return (
    <div className={cn('bg-[#F5F0E8] border border-[#E2DDD4] flex items-center justify-center shrink-0 overflow-hidden', box)}>
      {isImageUrl ? (
        <img
          src={emoji}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <span className={text}>{emoji}</span>
      )}
    </div>
  )
}

function ProgressBar({ value }) {
  return (
    <div className="h-1.5 bg-[#F5F0E8] rounded-full overflow-hidden w-full">
      <div className="h-full bg-[#C8522A] rounded-full transition-all duration-1000" style={{ width: `${value}%` }} />
    </div>
  )
}

function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-[#1A1A18]/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl overflow-hidden border border-[#E2DDD4] animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] sm:max-h-[90vh]", maxWidth)}>
        {title && (
          <div className="px-4 sm:px-8 pt-5 sm:pt-8 pb-4 sm:pb-5 border-b border-[#E2DDD4] bg-[#F8F9FA] flex justify-between items-center shrink-0">
            <h2 className="font-serif text-lg sm:text-2xl font-bold text-[#1A1A18]">{title}</h2>
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
// 組合內容的一列：商品 + 數量
const newBundleRow = () => ({
  key: `${Date.now()}-${Math.random()}`,
  productId: '',
  quantity: '1'
})

function CampaignWizard({ open, onClose, onComplete, initialData, existingProducts, existingBundles = [], onBundleCreated }) {
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [prodMode, setProdMode] = useState('existing')
  const [isSaving, setIsSaving] = useState(false)
  
  // 加入 startDate，作為排程發佈日期
  const defaultForm = {
    id: '',
    name: '',
    description: '',
    promoCopy: '',
    budget: '',

    startDate: getTodayString(),
    recruitEndDate: '',
    recruitLimit: '',
    promoDays: '7',

    prodId: '',
    prodName: '',
    prodDescription: '',
    prodPrice: '',
    prodDiscountedPrice: '',
    prodStock: '',
    prodCategory: '',
    prodImageUrl: '',
    thumbnail: '📦',

    discountType: 'percentage',
    discountValue: '',
    kocCommissionRate: '',

    status: 'draft',
    couponUsed: false,
    spent: 0,
    kocCount: 0,
    orders: 0,
    gmv: 0
  }
  const [form, setForm] = useState(defaultForm)
  // 「組合商品」分頁直接在這裡搭配新組合（不另外開管理頁）
  const [bundleRows, setBundleRows] = useState([newBundleRow(), newBundleRow()])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const copyFileInputRef = useRef(null)

  // 推廣文案：從 .txt 匯入（直接讀檔內容填進文字框，不經過後端）
  const handleImportCopy = event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (file.size > 100 * 1024) {
      toast.error('檔案太大，請上傳 100KB 以內的純文字檔')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '').replace(/\r\n/g, '\n').slice(0, 5000)
      setForm(previous => ({ ...previous, promoCopy: text }))
      toast.success('已匯入推廣文案')
    }
    reader.onerror = () => toast.error('檔案讀取失敗')
    reader.readAsText(file, 'utf-8')
  }
  const [categoryOptions, setCategoryOptions] = useState([])

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/consumer/product/categories`)
        const data = await res.json()
        if (Array.isArray(data)) {
          setCategoryOptions(data)
        }
      } catch (err) {
        console.error('商品分類載入失敗', err)
      }
    }
    loadCategories()
  }, [])

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch(`${API_BASE_URL}/api/vendor/product/upload-image`, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setForm(prev => ({ ...prev, prodImageUrl: data.image_url, thumbnail: data.image_url }))
      } else {
        toast.error(formatApiError(data.err) || "上傳失敗")
      }
    } catch (err) {
      toast.error("上傳失敗，請確認後端是否正常運作")
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm(initialData)
        setProdMode(
          initialData.isBundle
            ? 'bundle'
            : initialData.prodId ? 'existing' : (initialData.prodName ? 'new' : 'existing')
        )
      } else {
        setForm(defaultForm)
        setProdMode('existing')
      }
      setBundleRows([newBundleRow(), newBundleRow()])
      setStep(0)
    }
  }, [open, initialData])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const locked = Boolean(form.couponUsed)

  const isEditingPublished =
    Boolean(initialData) && initialData.status !== 'draft'

  const listPrice = Number(form.prodPrice) || 0

  const channelDiscountedPrice =
    form.prodDiscountedPrice !== '' &&
    form.prodDiscountedPrice !== null &&
    Number(form.prodDiscountedPrice) < listPrice
      ? Number(form.prodDiscountedPrice)
      : null

  // 活動折扣是疊加在「目前實際售價」上——如果商品已經有通路優惠價，
  // 就以優惠價為基準去算折扣後金額，而不是用原價。
  const originalPrice = channelDiscountedPrice ?? listPrice
  const discountValue = Number(form.discountValue) || 0
  const commissionRate = 3 // KOC 分潤比例平台統一固定 3%

  const estimatedPrice =
    form.discountType === 'percentage'
      ? originalPrice * (1 - discountValue / 100)
      : originalPrice - discountValue

  const safeEstimatedPrice = Math.max(estimatedPrice, 0)

  const estimatedCommission =
    safeEstimatedPrice * (commissionRate / 100)

  // ── 同一商品同一時間只能綁一個活動 ──
  // 編輯中的活動本身不算佔用；日期都是 YYYY-MM-DD 字串，可以直接用字串比大小。
  const getOtherBoundCampaigns = product =>
    (product?.bound_campaigns || []).filter(
      bound => bound.campaign_id !== form.id
    )

  const isPeriodOverlapping = bound =>
    Boolean(form.startDate) &&
    Boolean(form.recruitEndDate) &&
    bound.start_date <= form.recruitEndDate &&
    form.startDate <= bound.occupied_until

  // 「選擇庫存商品」與「選擇組合商品」共用同一套選取 / 衝突檢查邏輯，只是清單不同
  const selectableProducts =
    prodMode === 'bundle' ? existingBundles : existingProducts

  const selectedExistingProduct =
    prodMode !== 'new'
      ? selectableProducts.find(
          product => String(product.product_id) === String(form.prodId)
        )
      : null

  const selectedBoundCampaigns = getOtherBoundCampaigns(selectedExistingProduct)

  const conflictingCampaigns =
    selectedBoundCampaigns.filter(isPeriodOverlapping)

  const hasScheduleConflict = conflictingCampaigns.length > 0

  // ── 組合商品：沒選既有組合 = 在這裡搭配新組合 ──
  const isNewBundle = prodMode === 'bundle' && !form.prodId

  const singleProductById = Object.fromEntries(
    existingProducts.map(product => [String(product.product_id), product])
  )

  const filledBundleRows = bundleRows.filter(row => row.productId)

  const bundleItemsTotal = filledBundleRows.reduce((sum, row) => {
    const product = singleProductById[row.productId]
    return sum + (product ? product.price * (Number(row.quantity) || 0) : 0)
  }, 0)

  const bundleAvailableSets = filledBundleRows.length === 0
    ? 0
    : Math.min(...filledBundleRows.map(row => {
        const product = singleProductById[row.productId]
        const quantity = Number(row.quantity) || 0
        if (!product || quantity <= 0 || product.status !== 'active') return 0
        return Math.floor(product.stock / quantity)
      }))

  // 規則與後端 VendorBundleSaveSerializer 相同
  const bundleError = (() => {
    if (!isNewBundle) return ''
    if (bundleRows.length === 0) return '請至少加入一個商品'
    if (bundleRows.some(row => !row.productId)) return '還有商品欄位沒選'
    if (bundleRows.some(row => !(Number(row.quantity) >= 1))) return '每個商品數量至少 1 個'
    const ids = bundleRows.map(row => row.productId)
    if (new Set(ids).size !== ids.length) return '同一個商品請合併成一列，用數量表示'
    if (bundleRows.length === 1 && Number(bundleRows[0].quantity) < 2) return '組合至少要有兩種商品，或單一商品數量 2 個以上'
    if (!form.prodName.trim()) return '請輸入組合名稱'
    if (!(Number(form.prodPrice) > 0)) return '請輸入組合售價'
    return ''
  })()

  const bundleFallbackImage = filledBundleRows
    .map(row => singleProductById[row.productId]?.image_url)
    .find(Boolean) || ''

  const bundleImageUrl = form.prodImageUrl || bundleFallbackImage

  const updateBundleRow = (key, patch) =>
    setBundleRows(rows => rows.map(row => (row.key === key ? { ...row, ...patch } : row)))

  // 新組合在送出活動前才真正建立；建立後把 id 記回表單，重送時不會重複建立。
  // 組合內容不完整時回傳 null，呼叫端直接中止。
  const ensureBundleProductId = async () => {
    if (!isNewBundle) return form.prodId

    if (bundleError) {
      toast.error(bundleError)
      return null
    }


    const response = await createVendorBundle({
      vendor_id: localStorage.getItem('vendor_id'),
      product_name: form.prodName.trim(),
      price: Number(form.prodPrice),
      description: form.prodDescription.trim(),
      category: '',
      // 有另外上傳就用上傳的，沒有就用第一個有圖的組成商品
      image_url: bundleImageUrl,
      items: bundleRows.map(row => ({
        product_id: Number(row.productId),
        quantity: Number(row.quantity)
      }))
    })

    const bundleId = response.data.bundle_id
    setForm(previous => ({ ...previous, prodId: bundleId }))
    onBundleCreated?.()
    return bundleId
  }

  const clearSelectedProduct = () => {
    setForm(previous => ({
      ...previous,
      prodId: '',
      prodName: '',
      prodDescription: '',
      prodPrice: '',
      prodDiscountedPrice: '',
      prodStock: '',
      prodCategory: '',
      prodImageUrl: '',
      thumbnail: '📦'
    }))
  }

  // 進出「組合商品」分頁時清掉已選商品，避免單品 id 被當成組合送出（反之亦然）
  const switchProdMode = mode => {
    if (mode === prodMode) return
    if (mode === 'bundle' || prodMode === 'bundle') {
      clearSelectedProduct()
    }
    setProdMode(mode)
  }

  const handleSelectProduct = event => {
    const selected = selectableProducts.find(
      product =>
        String(product.product_id) === event.target.value
    )

    if (!selected) {
      setForm(previous => ({
        ...previous,
        prodId: '',
        prodName: '',
        prodDescription: '',
        prodPrice: '',
        prodDiscountedPrice: '',
        prodStock: '',
        prodCategory: '',
        prodImageUrl: '',
        thumbnail: '📦'
      }))

      return
    }

    setForm(previous => ({
      ...previous,
      prodId: selected.product_id,
      prodName: selected.product_name,
      prodDescription: selected.description || '',
      prodPrice: selected.price,
      prodDiscountedPrice:
        selected.discounted_price ?? '',
      prodStock: selected.stock,
      prodCategory: selected.category || '',
      prodImageUrl: selected.image_url || '',
      thumbnail: selected.image_url || '📦'
    }))
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)

    try {
      const productId = await ensureBundleProductId()
      if (productId === null) return
      const payload = buildPayload('draft', productId)

      let response

      if (isValidUuid(form.id)) {
        // 已存在的草稿：更新原本資料
        response = await updateVendorCampaign({
          ...payload,
          campaign_id: form.id
        })
      } else {
        // 第一次儲存：建立新草稿
        response = await createVendorCampaign(payload)
      }

      const savedCampaignId =
        response.data?.campaign_id ||
        response.campaign_id ||
        form.id

      const savedProductId =
        response.data?.product_id ||
        response.product_id ||
        form.prodId

      onComplete({
        ...form,
        id: savedCampaignId,
        prodId: savedProductId,
        isBundle: prodMode === 'bundle',
        status: 'draft',
        spent: form.spent || 0,
        kocCount: form.kocCount || 0,
        orders: form.orders || 0,
        gmv: form.gmv || 0
      })

      onClose()
    } catch (error) {
      toast.error(
        getErrorMessage(error, '儲存草稿失敗')
      )
    } finally {
      setIsSaving(false)
    }
  }

  
  const finish = async () => {
    try {
      setIsSaving(true)

      const productId = await ensureBundleProductId()
      if (productId === null) return
      const payload = buildPayload(
        isEditingPublished ? form.status : 'active',
        productId
      )

      let response

      if (isValidUuid(form.id)) {
        response = await updateVendorCampaign({
          ...payload,
          campaign_id: form.id
        })
      } else {
        response = await createVendorCampaign(payload)
      }

      onComplete({
        ...form,
        id: response.data.campaign_id,
        prodId:
          response.data.product_id || productId || form.prodId,
        isBundle: prodMode === 'bundle',
        status: isEditingPublished ? form.status : 'active',
        spent: form.spent || 0,
        kocCount: form.kocCount || 0,
        orders: form.orders || 0,
        gmv: form.gmv || 0
      })

      onClose()
    } catch (error) {
      toast.error(
        getErrorMessage(error, '任務發佈失敗')
      )
    } finally {
      setIsSaving(false)
    }
  }

  

  const buildPayload = (campaignStatus, productId = form.prodId) => {
    const basePayload = {
      vendor_id: localStorage.getItem('vendor_id'),
      name: form.name.trim(),
      description: form.description.trim(),
      promo_copy: form.promoCopy.trim(),
      budget: Number(form.budget),
      reward_type: 'commission',

      discount_type: form.discountType,
      discount_value: Number(form.discountValue),
      // KOC 分潤比例由平台統一固定為 3%，不再送廠商輸入的值
      koc_commission_rate: 3,

      promo_days: Number(form.promoDays),
      start_date: form.startDate,
      end_date: form.recruitEndDate,
      recruit_limit: form.recruitLimit ? Number(form.recruitLimit) : null,
      status: campaignStatus
    }

    // 組合商品本身也是一筆 Product，綁活動時跟既有商品一樣只送 product_id
    if (prodMode === 'existing' || prodMode === 'bundle') {
      return {
        ...basePayload,
        product_id: Number(productId),
        // 商品簡介寫回該商品（與商城商品頁共用）
        product_description: form.prodDescription.trim()
      }
    }

    return {
      ...basePayload,
      product: {
        product_name: form.prodName.trim(),
        description: form.prodDescription.trim(),
        price: Number(form.prodPrice),
        discounted_price:
          form.prodDiscountedPrice === ''
            ? null
            : Number(form.prodDiscountedPrice),
        stock: Number(form.prodStock),
        category: form.prodCategory.trim(),
        image_url: form.prodImageUrl.trim()
      }
    }
  }

  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-xl">
      <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-5 border-b border-[#E2DDD4] bg-[#F8F9FA] shrink-0">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A18]">
            {initialData && initialData.status === 'draft'
              ? '編輯任務草稿'
              : initialData
                ? '編輯任務'
                : '發佈 KOC 專屬任務'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-[#8C8880] hover:bg-[#E2DDD4] hover:text-[#1A1A18] transition-colors"><X size={18}/></button>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none min-w-max">
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all',
                i < step ? 'bg-[#C8522A] text-white' : i === step ? 'bg-[#1A1A18] text-white' : 'bg-[#E2DDD4] text-[#8C8880]')}>
                {i < step ? <Check size={12}/> : i+1}
              </div>
              <span className={cn('text-[11px] font-bold ml-2 tracking-wider whitespace-nowrap', i <= step ? 'text-[#1A1A18]' : 'text-[#8C8880]')}>{s}</span>
              {i < STEPS.length-1 && <div className={cn('flex-1 w-4 sm:w-auto h-0.5 mx-2 sm:mx-3 rounded-full', i < step ? 'bg-[#C8522A]' : 'bg-[#E2DDD4]')}/>}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-4 sm:py-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5">
        
        {step === 0 && <>
          <Input label="任務名稱 *" value={form.name} onChange={set('name')} placeholder="例：夏季防曬大作戰" />
          <Input label="總預算 (NT$) *" type="number" value={form.budget} onChange={set('budget')} placeholder="50000" />
          <Input label="招募人數上限（留空代表不限制）" type="number" min="1" value={form.recruitLimit} onChange={set('recruitLimit')} placeholder="例：10" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="排程發佈日期 *" 
              type="date" 
              value={form.startDate} 
              onChange={set('startDate')} 
              min={getTodayString()}
            />
            <Input 
              label="申請截止日期 *" 
              type="date" 
              value={form.recruitEndDate} 
              onChange={set('recruitEndDate')} 
              min={form.startDate || getTodayString()}
              disabled={!form.startDate}
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
          {selectedBoundCampaigns.length > 0 && (
            <div className={cn(
              'rounded-xl border p-4 text-xs font-bold',
              hasScheduleConflict
                ? 'bg-[#FDF0ED] border-[#C8522A]/30 text-[#C8522A]'
                : 'bg-[#F8F9FA] border-[#E2DDD4] text-[#8C8880]'
            )}>
              <div className="mb-1.5">
                已選商品「{form.prodName}」在以下期間已被其他活動綁定，本活動日期不能與其重疊：
              </div>
              <ul className="space-y-0.5">
                {selectedBoundCampaigns.map(bound => (
                  <li key={bound.campaign_id}>
                    {isPeriodOverlapping(bound) ? '✕' : '✓'}
                    {' '}「{bound.name}」{bound.start_date} ~ {bound.occupied_until}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>}

        {step === 1 && <>
          {locked && (
            <div className="flex items-start gap-2 bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-4 text-xs font-bold text-[#8C8880]">
              <Lock size={14} className="shrink-0 mt-0.5" />
              此活動已有優惠碼被使用，綁定商品無法再變更
            </div>
          )}
          <div className="flex flex-col sm:flex-row bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-1 mb-4 gap-1 sm:gap-0">
            <button disabled={locked} onClick={() => switchProdMode('existing')} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all disabled:opacity-50", prodMode === 'existing' ? "bg-white text-[#1A1A18] shadow-sm" : "text-[#8C8880]")}>選擇庫存商品</button>
            <button disabled={locked} onClick={() => switchProdMode('bundle')} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all disabled:opacity-50", prodMode === 'bundle' ? "bg-white text-[#1A1A18] shadow-sm" : "text-[#8C8880]")}>選擇組合商品</button>
            <button disabled={locked} onClick={() => switchProdMode('new')} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all disabled:opacity-50", prodMode === 'new' ? "bg-white text-[#1A1A18] shadow-sm" : "text-[#8C8880]")}>建立新商品</button>
          </div>

          {prodMode !== 'new' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">
                {prodMode === 'bundle' ? '選擇組合商品 *' : '從商品庫選擇 *'}
              </label>
              <select disabled={locked} value={form.prodId} onChange={handleSelectProduct} className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all appearance-none disabled:opacity-60">
                <option value="">
                  {prodMode === 'bundle' ? '＋ 搭配新組合' : '請選擇要推廣的商品...'}
                </option>
                {selectableProducts.map(product => {
                  const boundList = getOtherBoundCampaigns(product)
                  const overlapping = boundList.filter(isPeriodOverlapping)

                  return (
                    <option
                      key={product.product_id}
                      value={product.product_id}
                    >
                      {product.product_name}
                      {' '}
                      {prodMode === 'bundle'
                        ? `（可售 ${product.stock} 組）`
                        : `（庫存：${product.stock}）`}
                      {overlapping.length > 0
                        ? `［期間衝突：${overlapping[0].name}］`
                        : boundList.length > 0
                          ? `［已排 ${boundList.length} 個活動，日期未衝突］`
                          : ''}
                    </option>
                  )
                })}
              </select>

              {hasScheduleConflict && (
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-[#C8522A]/30 bg-[#FDF0ED] p-3 text-[11px] font-bold text-[#C8522A]">
                  <span className="flex-1">
                    此商品在 {conflictingCampaigns.map(bound => `「${bound.name}」${bound.start_date} ~ ${bound.occupied_until}`).join('、')} 已被綁定，
                    與本活動日期（{form.startDate} ~ {form.recruitEndDate}）重疊。請回上一步調整排程日期，或改選其他商品。
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="shrink-0 rounded-full border border-[#C8522A] px-3 py-1 hover:bg-white transition-colors"
                  >
                    回上一步改日期
                  </button>
                </div>
              )}
              
              {isNewBundle && (
                <div className="mt-3 flex flex-col gap-3 p-4 border border-[#E2DDD4] rounded-xl bg-white">
                  <div className="flex items-center gap-4 p-3 bg-[#F8F9FA] border border-dashed border-[#E2DDD4] rounded-xl">
                    <Thumb emoji={bundleImageUrl || '📦'} size="md" />
                    <div className="flex-1 min-w-0">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={locked || uploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 text-xs font-bold text-[#1A1A18] bg-white border border-[#E2DDD4] hover:border-[#1A1A18] px-4 py-2 rounded-full transition-all disabled:opacity-50"
                        >
                          <Upload size={14} />{uploading ? '上傳中...' : form.prodImageUrl ? '更換組合圖片' : '上傳組合圖片'}
                        </button>
                        {form.prodImageUrl && (
                          <button
                            type="button"
                            disabled={locked || uploading}
                            onClick={() => setForm(previous => ({ ...previous, prodImageUrl: '', thumbnail: '📦' }))}
                            className="text-xs font-bold text-[#8C8880] hover:text-[#C8522A] px-2 py-1 disabled:opacity-50"
                          >
                            移除
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-[#8C8880] mt-1.5">
                        {form.prodImageUrl
                          ? '使用上傳的組合圖片'
                          : bundleFallbackImage
                            ? '目前先用第一個商品的圖片，可另外上傳組合照'
                            : '選填，沒上傳會用第一個商品的圖片'}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">組合內容 *</div>

                  {bundleRows.map(row => {
                    const chosenElsewhere = new Set(
                      bundleRows.filter(other => other.key !== row.key).map(other => other.productId)
                    )
                    const product = singleProductById[row.productId]

                    return (
                      <div key={row.key} className="flex items-center gap-2">
                        <select
                          disabled={locked}
                          value={row.productId}
                          onChange={e => updateBundleRow(row.key, { productId: e.target.value })}
                          className="flex-1 min-w-0 bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-3 py-2.5 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] appearance-none disabled:opacity-60"
                        >
                          <option value="">選擇商品...</option>
                          {existingProducts.map(option => (
                            <option
                              key={option.product_id}
                              value={String(option.product_id)}
                              disabled={chosenElsewhere.has(String(option.product_id))}
                            >
                              {option.product_name}（{formatCurrency(option.price)}・庫存 {option.stock}{option.status !== 'active' ? '・已下架' : ''}）
                            </option>
                          ))}
                        </select>
                        <span className="text-xs font-bold text-[#8C8880]">x</span>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          disabled={locked}
                          value={row.quantity}
                          onChange={e => updateBundleRow(row.key, { quantity: e.target.value })}
                          className="w-14 bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-2 py-2.5 text-sm text-center outline-none focus:border-[#C8522A] disabled:opacity-60"
                        />
                        <span className="w-16 text-right text-[11px] font-mono text-[#8C8880] hidden sm:block">
                          {product ? formatCurrency(product.price * (Number(row.quantity) || 0)) : '—'}
                        </span>
                        <button
                          type="button"
                          disabled={locked || bundleRows.length <= 1}
                          onClick={() => setBundleRows(rows => rows.filter(other => other.key !== row.key))}
                          className="p-1.5 rounded-full text-[#8C8880] hover:text-[#C8522A] hover:bg-[#FDF0ED] transition-colors disabled:opacity-30"
                          title="移除這一列"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )
                  })}

                  <button
                    type="button"
                    disabled={locked || bundleRows.length >= existingProducts.length}
                    onClick={() => setBundleRows(rows => [...rows, newBundleRow()])}
                    className="self-start inline-flex items-center gap-1.5 text-xs font-bold text-[#C8522A] px-3 py-1 rounded-full hover:bg-[#FDF0ED] transition-colors disabled:opacity-40"
                  >
                    <Plus size={13} />再加一個商品
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="組合名稱 *"
                      disabled={locked}
                      value={form.prodName}
                      onChange={set('prodName')}
                      placeholder="例：夏日防曬兩件組"
                    />
                    <Input
                      label="組合售價 (NT$) *"
                      type="number"
                      min="1"
                      disabled={locked}
                      value={form.prodPrice}
                      onChange={set('prodPrice')}
                      placeholder={bundleItemsTotal ? String(bundleItemsTotal) : '例：999'}
                    />
                  </div>

                  <div className="text-[11px] font-bold text-[#8C8880] flex flex-wrap gap-x-4 gap-y-1">
                    <span>單品原價加總 {formatCurrency(bundleItemsTotal)}</span>
                    {Number(form.prodPrice) > 0 && bundleItemsTotal > Number(form.prodPrice) && (
                      <span className="text-[#C8522A]">消費者省 {formatCurrency(bundleItemsTotal - Number(form.prodPrice))}</span>
                    )}
                    <span>目前可售 {bundleAvailableSets} 組</span>
                  </div>
                  <p className="text-[10px] text-[#8C8880] -mt-1">
                    組合不另外記庫存，消費者下單時直接扣各商品庫存。組合會在儲存草稿或發佈任務時一起建立。
                  </p>

                  {bundleError && filledBundleRows.length > 0 && (
                    <p className="text-[11px] font-bold text-[#C8522A]">{bundleError}</p>
                  )}
                </div>
              )}

              {form.prodName && !isNewBundle && (
                <div className="mt-4 flex items-center gap-4 p-4 border border-[#E2DDD4] rounded-xl bg-white">
                   <Thumb emoji={form.thumbnail} size="sm" />
                   <div>
                     <div className="font-bold text-sm text-[#1A1A18]">{form.prodName}</div>
                     <div className="text-xs text-[#8C8880] font-mono mt-0.5 flex flex-wrap gap-2">
                       {channelDiscountedPrice ? (
                         <>
                           <span className="line-through">售價: {formatCurrency(form.prodPrice)}</span>
                           <span className="text-[#C8522A] font-bold">{formatCurrency(channelDiscountedPrice)}</span>
                         </>
                       ) : (
                         <span>售價: {formatCurrency(form.prodPrice)}</span>
                       )}
                     </div>
                     {prodMode === 'bundle' && selectedExistingProduct?.items?.length > 0 && (
                       <div className="text-[11px] text-[#8C8880] font-bold mt-1">
                         內含：{selectedExistingProduct.items.map(item => `${item.product_name} x${item.quantity}`).join('、')}
                       </div>
                     )}
                   </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 p-4 sm:p-5 bg-[#F8F9FA] border border-dashed border-[#E2DDD4] rounded-2xl text-center sm:text-left">
                <Thumb emoji={form.thumbnail} size="lg" />
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    disabled={locked || uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#1A1A18] bg-white border border-[#E2DDD4] hover:border-[#1A1A18] px-4 py-2 rounded-full transition-all disabled:opacity-50"
                  >
                    <Upload size={14}/>{uploading ? "上傳中..." : "上傳新圖片"}
                  </button>
                </div>
              </div>
              <Input label="新商品名稱 *" disabled={locked} value={form.prodName} onChange={set('prodName')} placeholder="例：極致防曬乳 SPF50+" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="商品售價 (NT$) *" type="number" disabled={locked} value={form.prodPrice} onChange={set('prodPrice')} placeholder="1200" />
                <Input label="提供庫存 *" type="number" value={form.prodStock} onChange={set('prodStock')} placeholder="100" />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">商品分類</label>
                <select
                  disabled={locked}
                  value={form.prodCategory}
                  onChange={set('prodCategory')}
                  className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all appearance-none disabled:opacity-60"
                >
                  <option value="">選擇分類</option>
                  {categoryOptions.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
            </>
          )}

          {/* ── 給 KOC 的文案素材 ── */}
          <div className="pt-4 mt-2 border-t border-[#E2DDD4] flex flex-col gap-4">
            <div>
              <div className="text-sm font-bold text-[#1A1A18]">給 KOC 的文案素材</div>
              <p className="text-[11px] text-[#8C8880] mt-0.5">
                KOC 接案後會看到這兩段內容，可以參考或直接引用來發文。
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">商品簡介</label>
                <span className="text-[10px] text-[#8C8880]">{form.prodDescription.length} / 5000</span>
              </div>
              <textarea
                value={form.prodDescription}
                onChange={set('prodDescription')}
                maxLength={5000}
                rows={4}
                placeholder="例：SPF50+ PA++++ 清爽不黏膩，適合夏天通勤、戶外活動，敏感肌可用。"
                className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all resize-y placeholder:text-[#8C8880]/50"
              />
              <p className="text-[10px] text-[#8C8880] ml-1">
                {prodMode === 'new' || isNewBundle
                  ? '會存成這個商品的介紹，商城商品頁也會顯示。'
                  : '選擇商品後會帶入目前的介紹；修改會同步更新商城商品頁。'}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">推廣文案（制式文案）</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".txt,text/plain"
                    ref={copyFileInputRef}
                    onChange={handleImportCopy}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => copyFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1A1A18] bg-white border border-[#E2DDD4] hover:border-[#1A1A18] px-3 py-1 rounded-full transition-all"
                  >
                    <Upload size={12} />匯入 .txt
                  </button>
                  <span className="text-[10px] text-[#8C8880]">{form.promoCopy.length} / 5000</span>
                </div>
              </div>
              <textarea
                value={form.promoCopy}
                onChange={set('promoCopy')}
                maxLength={5000}
                rows={7}
                placeholder={'例：\n☀️ 夏天出門最怕曬黑又黏膩？\n這瓶防曬我已經用了一整個月，清爽到幾乎感覺不到有擦！\n✔ SPF50+ PA++++\n✔ 敏感肌也能用\n👉 用我的專屬折扣碼下單再折 15%'}
                className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all resize-y placeholder:text-[#8C8880]/50 whitespace-pre-wrap"
              />
              <p className="text-[10px] text-[#8C8880] ml-1">
                選填。可直接貼上，或匯入純文字檔；換行與 emoji 都會保留。
              </p>
            </div>
          </div>
        </>}

        {step === 2 && (
          <>
            {locked && (
              <div className="flex items-start gap-2 bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-4 text-xs font-bold text-[#8C8880]">
                <Lock size={14} className="shrink-0 mt-0.5" />
                此活動已有優惠碼被使用，折扣與 KOC 分潤比例無法再修改
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">
                  優惠方式 *
                </label>
                <select
                  disabled={locked}
                  value={form.discountType}
                  onChange={set('discountType')}
                  className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all appearance-none disabled:opacity-60"
                >
                  <option value="percentage">百分比折扣</option>
                  <option value="fixed">直接折價</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Input
                  label={form.discountType === 'percentage' ? '折扣比例 (%) *' : '直接折價金額 (NT$) *'}
                  type="number"
                  min="0.01"
                  max={form.discountType === 'percentage' ? '100' : originalPrice || undefined}
                  step="0.01"
                  disabled={locked}
                  value={form.discountValue}
                  onChange={set('discountValue')}
                  placeholder={form.discountType === 'percentage' ? '例：15' : '例：150'}
                />
                {form.discountValue !== '' && Number(form.discountValue) <= 0 && (
                  <p className="flex items-center gap-1 text-[11px] font-bold text-red-600">
                    <AlertCircle size={12} className="shrink-0" />
                    {form.discountType === 'percentage' ? '折扣比例必須大於 0%' : '直接折價金額必須大於 0 元'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">KOC 分潤比例</label>
              <div className="w-full bg-[#F5F0E8] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm font-bold text-[#1A1A18]">
                3%（平台統一固定比例）
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#8C8880]">KOC 分潤比例由平台統一設定，不開放廠商自訂</p>
            </div>

            <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-4 sm:p-5 mt-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#8C8880] font-bold">商品原價</span>
                <span className={cn('font-bold', channelDiscountedPrice ? 'text-[#8C8880] line-through' : 'text-[#1A1A18]')}>
                  {listPrice > 0 ? formatCurrency(listPrice) : '—'}
                </span>
              </div>
              {channelDiscountedPrice && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#8C8880] font-bold">通路優惠價</span>
                  <span className="font-bold text-[#C8522A]">{formatCurrency(channelDiscountedPrice)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#8C8880] font-bold">優惠結帳預估價</span>
                <span className="font-black text-[#1A1A18] text-lg">
                  {originalPrice > 0 && form.discountValue !== '' ? formatCurrency(safeEstimatedPrice) : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#8C8880] font-bold">每件 KOC 預估分潤</span>
                <span className="font-black text-[#C8522A] text-lg">
                  {originalPrice > 0 && form.discountValue !== '' ? formatCurrency(estimatedCommission) : '—'}
                </span>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-[#FDF0ED] border border-[#C8522A]/20 rounded-2xl p-4 sm:p-5">
              <h4 className="text-xs font-black text-[#C8522A] uppercase tracking-wider mb-3 flex items-center gap-2"><Calendar size={14}/> 任務週期預覽</h4>
              <div className="space-y-4 relative before:absolute before:inset-y-2 before:left-[7px] before:w-0.5 before:bg-[#C8522A]/20">
                
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

      <div className="px-4 sm:px-8 py-4 sm:py-5 border-t border-[#E2DDD4] flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 bg-[#F8F9FA] shrink-0">
        <Button variant="ghost" onClick={() => step > 0 ? setStep(s=>s-1) : onClose()} className="gap-1.5 px-6 w-full sm:w-auto justify-center">
          <ChevronLeft size={14}/>{step === 0 ? '取消' : '上一步'}
        </Button>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {!isEditingPublished && (
            <Button 
              variant="outline" 
              onClick={handleSaveDraft} 
              disabled={isSaving || !form.name} 
              className="gap-2 px-6 w-full sm:w-auto"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
              {isSaving ? '儲存中...' : '儲存草稿'}
            </Button>
          )}

          {step < STEPS.length-1
            ? <Button 
                variant="brand" 
                onClick={() => setStep(s=>s+1)} 
                disabled={
                  (step === 0 && (!form.name || !form.startDate || !form.recruitEndDate)) ||
                  (step === 1 && (!form.prodName || hasScheduleConflict || Boolean(bundleError))) ||
                  (step === 2 && (form.discountValue === '' || Number(form.discountValue) <= 0 || (form.discountType === 'percentage' && Number(form.discountValue) > 100) || (form.discountType === 'fixed' && Number(form.discountValue) > originalPrice))) ||
                  isSaving
                }
                className="gap-1.5 px-8 w-full sm:w-auto"
              >
                下一步<ChevronRight size={14}/>
              </Button>
            : <Button 
                variant="brand" 
                onClick={finish} 
                disabled={isSaving || !form.name} 
                className="gap-2 px-8 w-full sm:w-auto"
              >
                {isEditingPublished
                  ? <><Save size={14}/>儲存修改</>
                  : <><Plus size={14}/>確認發佈任務</>}
              </Button>
          }
        </div>
      </div>
    </Modal>
  )
}


// ─── Main Component ───────────────────────────────────────────────────────────
export default function Campaigns() {
  const { toast } = useToast()
  const confirm = useConfirm()
  const [kocList, setKocList] = useState([])
  const [view, setView] = useState('grid')
  const [kocLoading, setKocLoading] = useState(false)
  const [kocError, setKocError] = useState('')
  const vendorId = localStorage.getItem('vendor_id')
  const [existingProducts, setExistingProducts] = useState([])
  const [existingBundles, setExistingBundles] = useState([])
  const [productsVersion, setProductsVersion] = useState(0)
  const [productLoading, setProductLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [campaignLoading, setCampaignLoading] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingDraft, setEditingDraft] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showKocList, setShowKocList] = useState(false)
  const [reviewingApplicationId, setReviewingApplicationId] = useState(null)

  const handleCreateOrUpdate = (taskData) => {
    // 重新抓商品清單，讓下一次開精靈時商品的已綁定期間是最新的
    setProductsVersion(version => version + 1)
    setItems(prev => {
      const isExisting = prev.find(t => t.id === taskData.id)
      if (isExisting) {
        return prev.map(t => t.id === taskData.id ? taskData : t)
      } else {
        return [taskData, ...prev]
      }
    })
  }

  const handleDeleteDraft = async campaign => {
    const confirmed = await confirm({
      title: `刪除草稿「${campaign.name || '未命名任務'}」？`,
      description: '刪除後草稿內容將無法復原。',
      confirmText: '刪除草稿',
      danger: true,
    })

    if (!confirmed) return

    try {
      await deleteVendorCampaign({
        vendor_id: vendorId,
        campaign_id: campaign.id
      })

      setItems(previous =>
        previous.filter(item => item.id !== campaign.id)
      )

      toast.success('草稿已刪除')
    } catch (error) {
      toast.error(
        getErrorMessage(error, '刪除草稿失敗')
      )
    }
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
      setKocList([])
      loadKocApplications(c)
    }
  }

  const loadKocApplications = async campaign => {
    if (!vendorId || !campaign?.id) return

    try {
      setKocLoading(true)
      setKocError('')

      const response = await getVendorApplications(
        vendorId,
        campaign.id
      )

      setKocList(
        (response.data.applications || []).map(application => ({
          id: application.application_id,
          applicationId: application.application_id,
          kocId: application.koc_id,
          name:
            application.koc_name ||
            application.koc_id ||
            '未命名 KOC',
          campaignId: application.campaign_id,
          campaignName: application.campaign_name,
          status: application.status,
          orderId: application.order_id,

          handle: application.koc_id,
          platform: '尚未提供',
          followers: '—',
          orders: 0,
          gmv: 0,
          avatar: '👤',
          violationCount: application.koc_violation_count || 0,
          avgSalesAmount: application.koc_avg_sales_amount
        }))
      )
    } catch (error) {
      setKocList([])

      setKocError(
        getErrorMessage(error, 'KOC 報名名單載入失敗')
      )
    } finally {
      setKocLoading(false)
    }
  }

  const handleReviewApplication = async (
    application,
    reviewStatus
  ) => {
    const actionText =
      reviewStatus === 'approved'
        ? '通過'
        : '拒絕'

    let rejectReason = ''
    if (reviewStatus === 'rejected') {
      const reason = await confirm({
        title: `拒絕 KOC「${application.name}」的申請？`,
        confirmText: '拒絕申請',
        danger: true,
        requireReason: true,
        reasonLabel: '拒絕原因',
        reasonPlaceholder: '請說明拒絕原因，KOC 會收到這則訊息',
      })
      if (!reason) return // 使用者取消
      rejectReason = reason
    } else {
      const confirmed = await confirm({
        title: `確定要${actionText} KOC「${application.name}」的申請嗎？`,
        description: '通過後系統會建立任務並產生尚未啟用的優惠碼。',
        confirmText: '通過申請',
      })
      if (!confirmed) return
    }

    try {
      setReviewingApplicationId(
        application.applicationId
      )
      setKocError('')

      const response = await reviewVendorApplication({
        vendor_id: vendorId,
        application_id: application.applicationId,
        status: reviewStatus,
        ...(reviewStatus === 'rejected' ? { reject_reason: rejectReason.trim() } : {})
      })

      if (response.data?.success === false) {
        throw new Error(
          response.data.err || '審核失敗'
        )
      }

      setKocList(previous =>
        previous.map(item =>
          item.applicationId === application.applicationId
            ? {
                ...item,
                status: reviewStatus,
                promotionCode:
                  response.data.promotion_code || null,
                kocmissionId:
                  response.data.kocmission_id || null
              }
            : item
        )
      )

      toast.success(
        reviewStatus === 'approved'
          ? '申請已通過，已建立任務與未啟用優惠碼'
          : '申請已拒絕'
      )
    } catch (error) {
      console.error('審核 KOC 申請失敗：', error)


      setKocError(
        getErrorMessage(error, '審核失敗')
      )
    } finally {
      setReviewingApplicationId(null)
    }
  }
  
  function mapCampaignFromApi(campaign) {
    const product = campaign.products?.[0] || {}

    return {
      id: campaign.campaign_id,
      name: campaign.name,
      description: campaign.description || '',
      promoCopy: campaign.promo_copy || '',
      budget: Number(campaign.budget || 0),

      startDate: campaign.start_date || '',
      recruitEndDate: campaign.end_date || '',
      endDate: campaign.end_date || '',
      recruitLimit: campaign.recruit_limit != null ? String(campaign.recruit_limit) : '',
      approvedCount: campaign.approved_count || 0,

      promoDays: String(campaign.promo_days || 7),
      discountType:
        product.discount_type || 'percentage',

      discountValue:
        product.discount_value !== undefined
          ? String(product.discount_value)
          : '',

      kocCommissionRate:
        product.koc_commission_rate !== undefined
          ? String(product.koc_commission_rate)
          : '',

      prodId: product.product_id || '',
      isBundle: Boolean(product.is_bundle),
      prodName: product.product_name || '',
      prodDescription: product.description || '',
      prodPrice: product.price || '',
      prodDiscountedPrice: product.discounted_price ?? '',
      prodStock: product.stock ?? '',
      prodCategory: product.category || '',
      prodImageUrl: product.image_url || '',
      thumbnail: product.image_url || '📦',

      status: campaign.status || 'draft',
      couponUsed: Boolean(campaign.coupon_used),
      spent: 0,
      kocCount: 0,
      orders: 0,
      gmv: 0
    }
  }


  useEffect(() => {
    async function loadCampaigns() {
      if (!vendorId) {
        setError('尚未登入廠商帳號')
        setCampaignLoading(false)
        return
      }

      try {
        setCampaignLoading(true)
        setError('')
        const response = await getVendorCampaigns(vendorId)
        setItems((response.data.campaigns || []).map(mapCampaignFromApi))
      } catch (error) {
        setError(getErrorMessage(error, '任務資料載入失敗'))
      } finally {
        setCampaignLoading(false)
      }
    }
    loadCampaigns()
  }, [vendorId])

  useEffect(() => {
      async function loadProducts() {
        if (!vendorId) {
          setError('尚未登入廠商帳號')
          setProductLoading(false)
          return
        }

        try {
          setProductLoading(true)
          setError('')
          const [response, bundleResponse] = await Promise.all([
            getVendorProducts(vendorId),
            getVendorBundles(vendorId),
          ])
          setExistingProducts(response.data.products || [])
          setExistingBundles(bundleResponse.data.bundles || [])
        } catch (error) {
          setError(getErrorMessage(error, '商品資料載入失敗'))
        } finally {
          setProductLoading(false)
        }
      }
      loadProducts()
    }, [vendorId, productsVersion])

  
  if (campaignLoading) {
    return (
      <div className="py-20 text-center text-sm font-bold text-[#8C8880]">
        活動資料載入中...
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 p-4 sm:p-0">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block"></span>
          推廣活動與商品總覽
        </h2>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* 視圖切換 */}
          <div className="flex bg-white border border-[#E2DDD4] rounded-full overflow-hidden shadow-sm p-1">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={cn('p-2 rounded-full transition-colors', view === 'grid' ? 'bg-[#F5F0E8] text-[#1A1A18]' : 'text-[#8C8880] hover:text-[#1A1A18]')}
              title="網格檢視"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn('p-2 rounded-full transition-colors', view === 'list' ? 'bg-[#F5F0E8] text-[#1A1A18]' : 'text-[#8C8880] hover:text-[#1A1A18]')}
              title="列表檢視"
            >
              <List size={16} />
            </button>
          </div>

          <Button variant="brand" onClick={handleOpenWizard} className="gap-2 px-4 sm:px-6">
            <Plus size={16} /> 發佈 KOC 推廣活動
          </Button>
        </div>
      </div>

      {items.length === 0 && (
        <div className="py-20 text-center text-sm font-bold text-[#8C8880]">
          目前尚無任務，點擊右上角「發佈 KOC 推廣活動」開始你的第一個活動
        </div>
      )}

      {view === 'grid' && items.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {items.map(c => {
          const pct = budgetUsedPct(c.spent, c.budget)
          
          let displayStatus = c.status;
          if (c.status === 'active' && c.startDate > getTodayString()) {
            displayStatus = 'scheduled';
          }

          return (
            <Card key={c.id} hoverable onClick={() => handleCardClick(c)} className="p-6 sm:p-8 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="w-full sm:w-auto">
                  <h3 className={cn("font-bold text-lg mb-1 truncate", c.status === 'draft' ? "text-[#8C8880]" : "text-[#1A1A18]")}>
                    {c.name || '未命名任務'}
                  </h3>
                  <div className="text-xs font-bold text-[#8C8880] flex items-center gap-2">
                    <Package size={14} className="shrink-0" /> <span className="truncate">綁定：{c.prodName || '尚未選擇商品'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start">
                  <Badge status={displayStatus} />

                  {c.status === 'draft' && (
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation()
                        handleDeleteDraft(c)
                      }}
                      className="p-2 rounded-full text-[#8C8880] hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="刪除草稿"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center opacity-90">
                <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-3 sm:p-4">
                  <div className="text-[11px] font-bold text-[#8C8880] mb-1.5 uppercase tracking-widest">GMV</div>
                  <div className="font-black text-xs sm:text-sm text-[#1A1A18] truncate">{c.status === 'draft' ? '—' : formatCurrency(c.gmv)}</div>
                </div>
                <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-3 sm:p-4">
                  <div className="text-[11px] font-bold text-[#8C8880] mb-1.5 uppercase tracking-widest">訂單</div>
                  <div className="font-black text-xs sm:text-sm text-[#1A1A18]">{c.status === 'draft' ? '—' : c.orders}</div>
                </div>
                <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-3 sm:p-4">
                  <div className="text-[11px] font-bold text-[#8C8880] mb-1.5 uppercase tracking-widest">進度</div>
                  <div className="font-black text-xs sm:text-sm text-[#C8522A]">{c.status === 'draft' ? '—' : `${pct}%`}</div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      )}

      {view === 'list' && items.length > 0 && (
        <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-[#E2DDD4] shadow-sm overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                  {['任務名稱', '綁定商品', '狀態', 'GMV', '訂單', '進度', '操作'].map(h => (
                    <th key={h} className="p-4 sm:p-5 text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {items.map(c => {
                  const pct = budgetUsedPct(c.spent, c.budget)

                  let displayStatus = c.status
                  if (c.status === 'active' && c.startDate > getTodayString()) {
                    displayStatus = 'scheduled'
                  }

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleCardClick(c)}
                      className="hover:bg-[#F8F9FA] transition-colors cursor-pointer group"
                    >
                      <td className="p-4 sm:p-5">
                        <div className={cn('text-sm font-bold', c.status === 'draft' ? 'text-[#8C8880]' : 'text-[#1A1A18]')}>
                          {c.name || '未命名任務'}
                        </div>
                      </td>

                      <td className="p-4 sm:p-5">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#8C8880]">
                          <Package size={14} className="shrink-0" /> <span className="truncate max-w-[150px] inline-block">{c.prodName || '尚未選擇商品'}</span>
                        </div>
                      </td>

                      <td className="p-4 sm:p-5">
                        <Badge status={displayStatus} />
                      </td>

                      <td className="p-4 sm:p-5 text-sm font-black text-[#1A1A18]">
                        {c.status === 'draft' ? '—' : formatCurrency(c.gmv)}
                      </td>

                      <td className="p-4 sm:p-5 text-sm font-black text-[#1A1A18]">
                        {c.status === 'draft' ? '—' : c.orders}
                      </td>

                      <td className="p-4 sm:p-5 text-sm font-black text-[#C8522A]">
                        {c.status === 'draft' ? '—' : `${pct}%`}
                      </td>

                      <td className="p-4 sm:p-5">
                        {c.status === 'draft' && (
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation()
                              handleDeleteDraft(c)
                            }}
                            className="p-2 rounded-full bg-white border border-[#E2DDD4] text-[#8C8880] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm sm:opacity-0 group-hover:opacity-100"
                            title="刪除草稿"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CampaignWizard
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false)
          setEditingDraft(null)
        }}
        onComplete={handleCreateOrUpdate}
        initialData={editingDraft}
        existingProducts={existingProducts}
        existingBundles={existingBundles}
        onBundleCreated={() => setProductsVersion(version => version + 1)}
      />

      {/* 任務詳細資料 Modal */}
      {selectedTask && !showKocList && (
        <Modal open={!!selectedTask} onClose={() => setSelectedTask(null)} title="任務詳細資訊" maxWidth="max-w-2xl">
          <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
            
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h3 className="text-xl font-black text-[#1A1A18] mb-3">{selectedTask.name}</h3>
                
                <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-3 text-xs font-bold">
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

            <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-4 sm:p-5">
              <div className="text-xs font-bold text-[#8C8880] uppercase tracking-widest mb-4">推廣商品資訊</div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Thumb emoji={selectedTask.thumbnail || '📦'} size="md" />
                <div className="flex-1 w-full">
                  <div className="font-bold text-[#1A1A18] mb-1">{selectedTask.prodName || '預設活動商品'}</div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs font-bold text-[#8C8880]">
                    <span>
                      {selectedTask.prodDiscountedPrice !== '' &&
                      selectedTask.prodDiscountedPrice !== null &&
                      Number(selectedTask.prodDiscountedPrice) < Number(selectedTask.prodPrice || 0) ? (
                        <>
                          <span className="line-through">售價 {formatCurrency(selectedTask.prodPrice || 0)}</span>
                          {' '}
                          <span className="text-[#C8522A]">{formatCurrency(selectedTask.prodDiscountedPrice)}</span>
                        </>
                      ) : (
                        `售價 ${formatCurrency(selectedTask.prodPrice || 0)}`
                      )}
                    </span>
                    <span className="text-[#C8522A]">
                      {selectedTask.discountType === 'fixed'
                        ? `直接折價 ${formatCurrency(Number(selectedTask.discountValue || 0))}`
                        : `折扣優惠 ${selectedTask.discountValue || 0}%`}
                    </span>
                    <span className="text-[#C8522A]">
                      KOC 分潤 {selectedTask.kocCommissionRate || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-[#E2DDD4] rounded-2xl p-4 sm:p-5">
                <div className="text-xs font-bold text-[#8C8880] uppercase tracking-widest mb-2">預算使用狀況</div>
                <div className="text-2xl font-black text-[#1A1A18] mb-2">{formatCurrency(selectedTask.spent)}</div>
                <ProgressBar value={budgetUsedPct(selectedTask.spent, selectedTask.budget)} />
                <div className="text-xs text-[#8C8880] font-bold mt-2 text-right">總預算 {formatCurrency(selectedTask.budget)}</div>
              </div>
              <div className="border border-[#E2DDD4] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-[#8C8880] uppercase tracking-widest mb-2">已參與 KOC</div>
                  <div className="text-2xl font-black text-[#1A1A18] mb-2">
                    {kocLoading
                      ? '—'
                      : kocList.filter(k => k.status === 'approved').length}
                    {' '}<span className="text-sm text-[#8C8880]">人</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await loadKocApplications(selectedTask)
                    setShowKocList(true)
                  }}
                  className="text-xs font-bold text-[#C8522A] hover:underline flex items-center gap-1 transition-all mt-4 sm:mt-0"
                >
                  查看完整名單
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-t border-[#E2DDD4] bg-[#F8F9FA] flex justify-between items-center shrink-0">
            <Button variant="outline" onClick={() => setSelectedTask(null)} className="px-6">關閉</Button>
            <Button
              variant="brand"
              className="gap-2 px-6"
              onClick={() => {
                const task = selectedTask
                setSelectedTask(null)
                setEditingDraft(task)
                setWizardOpen(true)
              }}
            >
              <Edit3 size={14} /> 編輯任務
            </Button>
          </div>
        </Modal>
      )}

      {/* KOC 參與名單 Modal */}
      {showKocList && (
        <Modal open={showKocList} onClose={() => setShowKocList(false)} title={`${selectedTask?.name} - 參與名單`} maxWidth="max-w-4xl">
          <div className="overflow-x-auto w-full flex-1">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4] sticky top-0 z-10">
                  {['KOC 資訊', '平台與粉絲數', '審核狀態', '歷史違規', '平均接案銷售額', '帶來訂單', '創造 GMV', '審核'].map(h => (
                    <th
                      key={h}
                      className={cn(
                        'p-4 sm:p-5 text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap',
                        h === '歷史違規' && 'relative group cursor-help'
                      )}
                    >
                      {h}
                      {h === '歷史違規' && (
                        <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-[#1A1A18] text-white text-[11px] font-medium normal-case whitespace-normal tracking-normal leading-relaxed rounded-xl px-3 py-2 shadow-lg z-20">
                          包含此 KOC 自行取消任務、以及任務逾期未完成（沒交文案或作品連結）的累計次數
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {kocLoading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm font-bold text-[#8C8880]">
                      KOC 報名名單載入中...
                    </td>
                  </tr>
                ) : kocError ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm font-bold text-red-600">
                      {kocError}
                    </td>
                  </tr>
                ) : kocList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm font-bold text-[#8C8880]">
                      目前尚無 KOC 報名
                    </td>
                  </tr>
                ) : (
                  kocList.map(koc => (
                    <tr key={koc.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="p-4 sm:p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#F5F0E8] border border-[#E2DDD4] rounded-full flex items-center justify-center text-lg shrink-0">
                            {koc.avatar}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-[#1A1A18]">{koc.name}</div>
                            <div className="text-[11px] font-bold text-[#8C8880]">{koc.kocId}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 sm:p-5">
                        <div className="text-sm font-bold text-[#1A1A18]">{koc.platform}</div>
                        <div className="text-[11px] font-bold text-[#8C8880] mt-0.5">{koc.followers}</div>
                      </td>

                      <td className="p-4 sm:p-5">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap',
                            koc.status === 'approved' ? 'bg-green-50 text-green-700' : 
                            koc.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-[#FDF0ED] text-[#C8522A]'
                          )}>
                          {{ pending: '待審核', approved: '已通過', rejected: '已拒絕' }[koc.status] || koc.status}
                        </span>
                      </td>

                      <td className="p-4 sm:p-5">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold',
                            koc.violationCount > 0
                              ? 'bg-[#FDF0ED] text-[#C8522A]'
                              : 'bg-[#F5F0E8] text-[#8C8880]'
                          )}
                        >
                          {koc.violationCount} 次
                        </span>
                      </td>

                      <td className="p-4 sm:p-5 text-sm font-bold text-[#1A1A18]">
                        {koc.avgSalesAmount != null ? formatCurrency(koc.avgSalesAmount) : '—'}
                      </td>

                      <td className="p-4 sm:p-5 text-sm font-black text-[#1A1A18]">{koc.orders}</td>
                      <td className="p-4 sm:p-5 text-sm font-black text-[#C8522A]">{formatCurrency(koc.gmv)}</td>

                      <td className="p-4 sm:p-5">
                        {koc.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={reviewingApplicationId === koc.applicationId}
                              onClick={() => handleReviewApplication(koc, 'approved')}
                              className="px-3 py-1.5 rounded-full bg-[#1A1A18] text-white text-xs font-bold hover:bg-[#C8522A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                            >
                              通過
                            </button>
                            <button
                              type="button"
                              disabled={reviewingApplicationId === koc.applicationId}
                              onClick={() => handleReviewApplication(koc, 'rejected')}
                              className="px-3 py-1.5 rounded-full border border-[#E2DDD4] bg-white text-[#8C8880] text-xs font-bold hover:text-red-600 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                            >
                              拒絕
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-[#8C8880] whitespace-nowrap">
                            已完成審核
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-t border-[#E2DDD4] bg-[#F8F9FA] flex justify-between items-center shrink-0">
            <Button variant="ghost" onClick={() => setShowKocList(false)} className="gap-1.5 px-6">
              <ChevronLeft size={14}/> 返回任務詳情
            </Button>
          </div>
        </Modal>
      )}

    </div>
  )
}