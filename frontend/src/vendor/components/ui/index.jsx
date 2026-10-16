import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-sm'
  
  const variants = {
    // 🟢 替換為品牌主色系
    primary: 'bg-brand text-white hover:bg-brand-dark',
    brand: 'bg-brand text-white hover:bg-brand-dark', 
    outline: 'bg-white border border-edge text-muted hover:border-brand hover:text-brand',
    ghost: 'bg-transparent text-muted hover:bg-mist hover:text-ink',
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
      'bg-white rounded-[2rem] border border-edge shadow-sm',
      hoverable && 'transition-all hover:border-gold hover:shadow-md cursor-pointer duration-300',
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
      {label && <label className="text-xs font-bold text-muted uppercase tracking-widest">{label}</label>}
      <input
        className={cn(
          // 🟢 替換為焦糖橘 Focus 效果
          'w-full bg-mist border border-edge rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-muted/50 font-medium',
          'outline-none focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all',
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
      {label && <label className="text-xs font-bold text-muted uppercase tracking-widest">{label}</label>}
      <select
        className={cn(
          'w-full bg-mist border border-edge rounded-2xl px-4 py-3 text-sm text-ink font-medium appearance-none',
          'outline-none focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all cursor-pointer',
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
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" onClick={onClose} />
      <div className={cn('relative w-full bg-white rounded-[2.5rem] shadow-2xl border border-edge overflow-hidden animate-in zoom-in-95 duration-300', sizes[size])}>
        <div className="flex items-center justify-between px-10 py-8 border-b border-edge">
          <h2 className="font-display font-bold text-2xl text-ink">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full text-muted hover:text-ink hover:bg-mist transition-colors">
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
  active:     { label: '進行中', cls: 'bg-brand-soft text-brand', dot: 'bg-brand' },
  ended:      { label: '已結束', cls: 'bg-white border border-edge text-muted', dot: 'bg-edge' },
  draft:      { label: '草稿',   cls: 'bg-mist text-ink', dot: 'bg-brand' },
  pending:    { label: '待處理', cls: 'bg-cream text-muted', dot: 'bg-muted' },
  inactive:   { label: '未活躍', cls: 'bg-[#FFF0F0] text-[#D93025]', dot: 'bg-[#D93025]' },
  paid:       { label: '已付款', cls: 'bg-cream text-ink', dot: 'bg-brand' },
  processing: { label: '處理中', cls: 'bg-brand-soft text-brand', dot: 'bg-brand' },
  refunded:   { label: '已退款', cls: 'bg-white border border-edge text-muted', dot: 'bg-edge' },
  approved:   { label: '已核准', cls: 'bg-cream text-ink', dot: 'bg-brand' },
  revision:   { label: '需修改', cls: 'bg-[#FFF0F0] text-[#D93025]', dot: 'bg-[#D93025]' },
  rejected:   { label: '已拒絕', cls: 'bg-[#FFF0F0] text-[#D93025]', dot: 'bg-[#D93025]' },
  listed:     { label: '已上架', cls: 'bg-cream text-ink', dot: 'bg-brand' },
  unlisted:   { label: '已下架', cls: 'bg-white border border-edge text-muted', dot: 'bg-edge' },
}

export function Badge({ status }) {
  const c = badgeCfg[status] ?? { label: status, cls: 'bg-mist text-muted', dot: 'bg-edge' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider', c.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />{c.label}
    </span>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, trend, icon: Icon }) {
  const trendCls = trend === 'up' ? 'bg-brand-soft text-brand' : trend === 'down' ? 'bg-[#FFF0F0] text-[#D93025]' : 'bg-mist text-muted'
  return (
    <Card className="p-8 hover:border-gold transition-colors flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-muted uppercase tracking-widest">{label}</span>
        {Icon && <span className="p-2.5 rounded-2xl bg-cream text-ink"><Icon size={20} strokeWidth={2.5} /></span>}
      </div>
      <div>
        <div className="text-3xl font-black text-ink tracking-tight">{value}</div>
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
const avatarCls = ['bg-cream text-ink', 'bg-brand-soft text-brand', 'bg-edge text-ink', 'bg-brand text-white', 'bg-gold text-white'] 
export function Avatar({ name = '?', size = 'md' }) {
  const idx = (name.charCodeAt(0) || 0) % avatarCls.length
  const sz = size === 'sm' ? 'w-10 h-10 text-sm' : size === 'lg' ? 'w-16 h-16 text-xl' : 'w-12 h-12 text-base'
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold shrink-0 border border-edge/50 shadow-sm', sz, avatarCls[idx])}>
      {name.slice(0, 1)}
    </div>
  )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, color = 'bg-brand', className }) {
  return (
    <div className={cn('h-2 bg-cream rounded-full overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all duration-1000', color)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {Icon && <div className="mb-6 p-6 bg-cream rounded-full text-muted"><Icon size={40} strokeWidth={1.5} /></div>}
      <h3 className="font-display font-bold text-2xl text-ink mb-3">{title}</h3>
      {description && <p className="text-sm font-medium text-muted mb-8 max-w-sm leading-relaxed">{description}</p>}
      {action}
    </div>
  )
}