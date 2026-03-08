import { clsx } from 'clsx'

export function cn(...inputs) {
  return clsx(inputs)
}

export function formatCurrency(n) {
  return `NT$${Number(n).toLocaleString('zh-TW')}`
}

export function formatNumber(n) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}萬`
  return n.toLocaleString('zh-TW')
}

export function formatPct(n) {
  return `${Number(n).toFixed(1)}%`
}

export function budgetUsedPct(spent, budget) {
  if (!budget) return 0
  return Math.min(100, Math.round((spent / budget) * 100))
}
