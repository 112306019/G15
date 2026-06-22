export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
export const formatCurrency = (n) => `NT$${Number(n).toLocaleString('zh-TW')}`
export const formatNumber   = (n) => n >= 10000 ? `${(n/10000).toFixed(1)}萬` : String(n)
export const budgetUsedPct  = (spent, budget) => budget ? Math.min(100, Math.round(spent/budget*100)) : 0
