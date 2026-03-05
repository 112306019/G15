import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect } from 'react'

// ─── Button ──────────────────────────────────────────────────────────────────
const btnBase = 'inline-flex items-center gap-2 font-semibold rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

const btnVariants = {
  primary:  'bg-ink text-surface-50 hover:bg-ink/90 shadow-card',
  brand:    'bg-brand text-white hover:bg-brand/90 shadow-card',
  outline:  'bg-transparent border border-surface-300 text-ink hover:bg-surface-100',
  ghost:    'bg-transparent text-ink-muted hover:bg-surface-100 hover:text-ink',
  danger:   'bg-danger text-white hover:bg-red-700',
}

const btnSizes = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-sm px-5 py-2.5',
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  return (
    <button
      className={cn(btnBase, btnVariants[variant], btnSizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ className, children, hoverable = false, ...props }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl2 border border-surface-200 shadow-card',
        hoverable && 'transition-shadow duration-200 hover:shadow-lift cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ─── Input ───────────────────────────────────────────────────────────────────
export function Input({ label, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{label}</label>}
      <input
        className={cn(
          'w-full bg-surface-100 border border-surface-300 rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint',
          'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all',
          className,
        )}
        {...props}
      />
    </div>
  )
}

// ─── Select ──────────────────────────────────────────────────────────────────
export function Select({ label, options, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{label}</label>}
      <select
        className={cn(
          'w-full bg-surface-100 border border-surface-300 rounded-lg px-3.5 py-2.5 text-sm text-ink',
          'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all',
          className,
        )}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={cn(
        'relative w-full bg-white rounded-xl3 shadow-modal border border-surface-200 animate-fadeUp',
        sizes[size],
      )}>
        <div className="flex items-center justify-between p-6 border-b border-surface-200">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-surface-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
export function ProgressBar({ value, className, color = 'bg-brand' }) {
  return (
    <div className={cn('h-1.5 bg-surface-200 rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, trend, icon: Icon, accent = 'text-brand', delay = 0 }) {
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-ink-muted'
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''

  return (
    <Card
      className="p-6 animate-fadeUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-semibold text-ink-muted uppercase tracking-widest">{label}</span>
        {Icon && (
          <span className={cn('p-2 rounded-lg bg-surface-100', accent)}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="font-mono text-2xl font-semibold text-ink tracking-tight">{value}</div>
      {sub && (
        <div className={cn('mt-1.5 text-xs font-medium', trendColor)}>
          {trendArrow} {sub}
        </div>
      )}
    </Card>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && (
        <div className="mb-4 p-4 bg-surface-100 rounded-2xl text-ink-faint">
          <Icon size={28} />
        </div>
      )}
      <h3 className="font-display text-base font-bold text-ink mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-muted mb-6 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
const avatarColors = [
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
]

export function Avatar({ name, size = 'md' }) {
  const idx = name.charCodeAt(0) % avatarColors.length
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm'
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-bold shrink-0',
      sizeClass, avatarColors[idx],
    )}>
      {name.slice(0, 1)}
    </div>
  )
}

export { Badge } from './Badge';
