import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  const base = 'inline-flex items-center gap-2 font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm',
    brand: 'bg-amber-600 text-white hover:bg-amber-500 shadow-sm',
    outline: 'bg-white border border-gray-200 text-slate-700 hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-slate-800',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2', lg: 'text-sm px-5 py-2.5' }
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ className, children, hoverable, ...props }) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border border-gray-100 shadow-sm',
      hoverable && 'transition-shadow hover:shadow-md cursor-pointer',
      className,
    )} {...props}>
      {children}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ label, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</label>}
      <input
        className={cn(
          'w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-gray-300',
          'outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all',
          className,
        )}
        {...props}
      />
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ label, options = [], className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</label>}
      <select
        className={cn(
          'w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800',
          'outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all',
          className,
        )}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-white rounded-2xl shadow-2xl border border-gray-100', sizes[size])}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="font-bold text-lg text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-slate-700 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const badgeCfg = {
  active: { label: '進行中', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  ended: { label: '已結束', cls: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200', dot: 'bg-gray-400' },
  draft: { label: '草稿', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  pending: { label: '待審核', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', dot: 'bg-blue-500' },
  inactive: { label: '未活躍', cls: 'bg-red-50 text-red-600 ring-1 ring-red-200', dot: 'bg-red-400' },
  paid: { label: '已付款', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  processing: { label: '處理中', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', dot: 'bg-blue-500' },
  refunded: { label: '已退款', cls: 'bg-red-50 text-red-600 ring-1 ring-red-200', dot: 'bg-red-400' },
  approved: { label: '已核准', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  revision: { label: '需修改', cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', dot: 'bg-orange-500' },
  rejected: { label: '已拒絕', cls: 'bg-red-50 text-red-600 ring-1 ring-red-200', dot: 'bg-red-400' },
  listed: { label: '已上架', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  unlisted: { label: '已下架', cls: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200', dot: 'bg-gray-400' },
}
export function Badge({ status }) {
  const c = badgeCfg[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold', c.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />{c.label}
    </span>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, trend, icon: Icon }) {
  const trendCls = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</span>
        {Icon && <span className="p-2 rounded-xl bg-amber-50 text-amber-600"><Icon size={15} /></span>}
      </div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      {sub && <div className={cn('mt-1 text-xs font-semibold', trendCls)}>{trend === 'up' ? '↑ ' : trend === 'down' ? '↓ ' : ''}{sub}</div>}
    </Card>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const avatarCls = ['bg-amber-100 text-amber-700', 'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700']
export function Avatar({ name = '?', size = 'md' }) {
  const idx = (name.charCodeAt(0) || 0) % avatarCls.length
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm'
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold shrink-0', sz, avatarCls[idx])}>
      {name.slice(0, 1)}
    </div>
  )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, color = 'bg-amber-500', className }) {
  return (
    <div className={cn('h-1.5 bg-gray-100 rounded-full overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && <div className="mb-4 p-4 bg-gray-100 rounded-2xl text-gray-300"><Icon size={28} /></div>}
      <h3 className="font-bold text-base text-slate-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 mb-6 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}
