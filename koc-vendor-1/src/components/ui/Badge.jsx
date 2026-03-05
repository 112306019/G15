import { cn } from '@/lib/utils'

const variants = {
  active:     'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ended:      'bg-surface-200 text-ink-muted ring-surface-300',
  draft:      'bg-amber-50 text-amber-700 ring-amber-200',
  pending:    'bg-blue-50 text-blue-700 ring-blue-200',
  inactive:   'bg-red-50 text-red-600 ring-red-200',
  paid:       'bg-emerald-50 text-emerald-700 ring-emerald-200',
  processing: 'bg-blue-50 text-blue-700 ring-blue-200',
  refunded:   'bg-red-50 text-red-600 ring-red-200',
}

const dots = {
  active:     'bg-emerald-500',
  ended:      'bg-ink-faint',
  draft:      'bg-amber-500',
  pending:    'bg-blue-500',
  inactive:   'bg-red-400',
  paid:       'bg-emerald-500',
  processing: 'bg-blue-500',
  refunded:   'bg-red-400',
}

const labels = {
  active:     '進行中',
  ended:      '已結束',
  draft:      '草稿',
  pending:    '待審核',
  inactive:   '未活躍',
  paid:       '已付款',
  processing: '處理中',
  refunded:   '已退款',
}

export function Badge({ status, className }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset',
      variants[status] ?? 'bg-surface-200 text-ink-muted ring-surface-300',
      className,
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dots[status] ?? 'bg-ink-faint')} />
      {labels[status] ?? status}
    </span>
  )
}
