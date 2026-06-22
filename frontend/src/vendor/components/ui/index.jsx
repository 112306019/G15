import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-sm'
  
  const variants = {
    // 🟢 替換為品牌主色系
    primary: 'bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A]',
    brand: 'bg-[#C8522A] text-white hover:bg-[#A64220]', 
    outline: 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:border-[#1A1A18] hover:text-[#1A1A18]',
    ghost: 'bg-transparent text-[#8C8880] hover:bg-[#F8F9FA] hover:text-[#1A1A18]',
    danger: 'bg-[#FFF0F0] text-[#D93025] hover:bg-[#D93025] hover:text-white border border-[#FFF0F0]',
  }
  
  const sizes = { 
    sm: 'text-xs px-4 py-2', 
    md: 'text-sm px-6 py-2.5', 
    lg: 'text-base px-8 py-3' 
  }
  
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
      // 🟢 升級為拿鐵色邊框與無邊框大圓角
      'bg-white rounded-[2rem] border border-[#E2DDD4] shadow-sm',
      hoverable && 'transition-all hover:border-[#B89B6A] hover:shadow-md cursor-pointer duration-300',
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
      {label && <label className="text-xs font-bold text-[#8C8880] uppercase tracking-widest">{label}</label>}
      <input
        className={cn(
          // 🟢 替換為焦糖橘 Focus 效果
          'w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl px-4 py-3 text-sm text-[#1A1A18] placeholder:text-[#8C8880]/50 font-medium',
          'outline-none focus:bg-white focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all',
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
      {label && <label className="text-xs font-bold text-[#8C8880] uppercase tracking-widest">{label}</label>}
      <select
        className={cn(
          'w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl px-4 py-3 text-sm text-[#1A1A18] font-medium appearance-none',
          'outline-none focus:bg-white focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all cursor-pointer',
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
  
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1A1A18]/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" onClick={onClose} />
      <div className={cn('relative w-full bg-white rounded-[2.5rem] shadow-2xl border border-[#E2DDD4] overflow-hidden animate-in zoom-in-95 duration-300', sizes[size])}>
        <div className="flex items-center justify-between px-10 py-8 border-b border-[#E2DDD4]">
          <h2 className="font-serif font-bold text-2xl text-[#1A1A18]">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F8F9FA] transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-10">{children}</div>
      </div>
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const badgeCfg = {
  active:     { label: '進行中', cls: 'bg-[#FDF0ED] text-[#C8522A]', dot: 'bg-[#C8522A]' },
  ended:      { label: '已結束', cls: 'bg-white border border-[#E2DDD4] text-[#8C8880]', dot: 'bg-[#E2DDD4]' },
  draft:      { label: '草稿',   cls: 'bg-[#F8F9FA] text-[#1A1A18]', dot: 'bg-[#1A1A18]' },
  pending:    { label: '待處理', cls: 'bg-[#F5F0E8] text-[#8C8880]', dot: 'bg-[#8C8880]' },
  inactive:   { label: '未活躍', cls: 'bg-[#FFF0F0] text-[#D93025]', dot: 'bg-[#D93025]' },
  paid:       { label: '已付款', cls: 'bg-[#F5F0E8] text-[#1A1A18]', dot: 'bg-[#1A1A18]' },
  processing: { label: '處理中', cls: 'bg-[#FDF0ED] text-[#C8522A]', dot: 'bg-[#C8522A]' },
  refunded:   { label: '已退款', cls: 'bg-white border border-[#E2DDD4] text-[#8C8880]', dot: 'bg-[#E2DDD4]' },
  approved:   { label: '已核准', cls: 'bg-[#F5F0E8] text-[#1A1A18]', dot: 'bg-[#1A1A18]' },
  revision:   { label: '需修改', cls: 'bg-[#FFF0F0] text-[#D93025]', dot: 'bg-[#D93025]' },
  rejected:   { label: '已拒絕', cls: 'bg-[#FFF0F0] text-[#D93025]', dot: 'bg-[#D93025]' },
  listed:     { label: '已上架', cls: 'bg-[#F5F0E8] text-[#1A1A18]', dot: 'bg-[#1A1A18]' },
  unlisted:   { label: '已下架', cls: 'bg-white border border-[#E2DDD4] text-[#8C8880]', dot: 'bg-[#E2DDD4]' },
}

export function Badge({ status }) {
  const c = badgeCfg[status] ?? { label: status, cls: 'bg-[#F8F9FA] text-[#8C8880]', dot: 'bg-[#E2DDD4]' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider', c.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />{c.label}
    </span>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, trend, icon: Icon }) {
  const trendCls = trend === 'up' ? 'bg-[#FDF0ED] text-[#C8522A]' : trend === 'down' ? 'bg-[#FFF0F0] text-[#D93025]' : 'bg-[#F8F9FA] text-[#8C8880]'
  return (
    <Card className="p-8 hover:border-[#B89B6A] transition-colors flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-[#8C8880] uppercase tracking-widest">{label}</span>
        {Icon && <span className="p-2.5 rounded-2xl bg-[#F5F0E8] text-[#1A1A18]"><Icon size={20} strokeWidth={2.5} /></span>}
      </div>
      <div>
        <div className="text-3xl font-black text-[#1A1A18] tracking-tight">{value}</div>
        {sub && (
          <div className="flex items-center gap-2 mt-3">
             <span className={cn('text-xs font-bold px-2 py-1 rounded-md', trendCls)}>
               {trend === 'up' ? '↑ ' : trend === 'down' ? '↓ ' : ''}{sub}
             </span>
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
// 🟢 替換為溫暖的品牌色系陣列，移除突兀的藍色綠色
const avatarCls = ['bg-[#F5F0E8] text-[#1A1A18]', 'bg-[#FDF0ED] text-[#C8522A]', 'bg-[#E2DDD4] text-[#1A1A18]', 'bg-[#1A1A18] text-[#F5F0E8]', 'bg-[#B89B6A] text-white'] 
export function Avatar({ name = '?', size = 'md' }) {
  const idx = (name.charCodeAt(0) || 0) % avatarCls.length
  const sz = size === 'sm' ? 'w-10 h-10 text-sm' : size === 'lg' ? 'w-16 h-16 text-xl' : 'w-12 h-12 text-base'
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold shrink-0 border border-[#E2DDD4]/50 shadow-sm', sz, avatarCls[idx])}>
      {name.slice(0, 1)}
    </div>
  )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, color = 'bg-[#C8522A]', className }) {
  return (
    <div className={cn('h-2 bg-[#F5F0E8] rounded-full overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all duration-1000', color)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {Icon && <div className="mb-6 p-6 bg-[#F5F0E8] rounded-full text-[#8C8880]"><Icon size={40} strokeWidth={1.5} /></div>}
      <h3 className="font-serif font-bold text-2xl text-[#1A1A18] mb-3">{title}</h3>
      {description && <p className="text-sm font-medium text-[#8C8880] mb-8 max-w-sm leading-relaxed">{description}</p>}
      {action}
    </div>
  )
}