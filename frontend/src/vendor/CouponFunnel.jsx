import React, { useEffect, useState } from 'react'
import { Loader2, AlertCircle, X } from 'lucide-react'
import { getVendorAnalyticsFunnel } from '../api/vendor'

const RANGE_OPTIONS = [
  { value: '7daysAgo', label: '近 7 天' },
  { value: '30daysAgo', label: '近 30 天' },
  { value: '90daysAgo', label: '近 90 天' },
]

const fmtNumber = n => Number(n || 0).toLocaleString()
const fmtPercent = n =>
  n === null || n === undefined ? '—' : `${(n * 100).toFixed(1)}%`

function StatCard({ label, value, hint }) {
  return (
    <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-4 sm:p-5">
      <div className="text-xs font-bold text-[#8C8880] mb-2">{label}</div>
      <div className="text-2xl sm:text-3xl font-black text-[#1A1A18]">{value}</div>
      {hint && <div className="text-[11px] text-[#8C8880] mt-1">{hint}</div>}
    </div>
  )
}

export default function CouponFunnel({ open, onClose }) {
  const vendorId = localStorage.getItem('vendor_id')
  const [range, setRange] = useState('30daysAgo')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!vendorId || !open) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await getVendorAnalyticsFunnel(vendorId, {
          start_date: range,
          end_date: 'today',
        })
        if (cancelled) return
        if (response.data?.success === false) {
          throw new Error(response.data.err || '讀取失敗')
        }
        setData(response.data)
      } catch (err) {
        if (cancelled) return
        setError(
          err.response?.data?.err || err.message || '電商漏斗資料讀取失敗'
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [vendorId, range, open])

  const summary = data?.summary

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#1A1A18]/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-[#E2DDD4] rounded-[2rem] shadow-2xl p-5 sm:p-8">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-[#8C8880] hover:text-[#1A1A18] bg-[#F8F9FA] hover:bg-[#E2DDD4] rounded-full transition-colors"
      >
        <X size={18} />
      </button>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pr-12">
        <div>
          <h2 className="text-base sm:text-lg font-serif font-bold text-[#1A1A18]">
            優惠碼流量轉換分析
          </h2>
          <p className="text-xs text-[#8C8880] mt-1">
            追蹤消費者使用 KOC 優惠碼後的結帳表現（資料來源：Google Analytics）
          </p>
        </div>

        <select
          value={range}
          onChange={e => setRange(e.target.value)}
          className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-[#C8522A]"
        >
          {RANGE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center text-[#8C8880] gap-2">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm font-bold">讀取中...</span>
        </div>
      ) : error ? (
        <div className="py-8 flex items-center justify-center text-[#C8522A] gap-2">
          <AlertCircle size={18} />
          <span className="text-sm font-bold">{error}</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <StatCard
              label="優惠碼使用次數（導流點擊）"
              value={fmtNumber(summary.promotion_uses)}
              hint="消費者成功套用優惠碼的次數"
            />
            <StatCard
              label="開始結帳"
              value={fmtNumber(summary.begin_checkout)}
              hint="訂單建立、進入付款的次數"
            />
            <StatCard
              label="完成購買"
              value={fmtNumber(summary.purchases)}
              hint={`營收 NT$ ${fmtNumber(summary.revenue)}`}
            />
            <StatCard
              label="結帳轉換率"
              value={fmtPercent(summary.checkout_cvr)}
              hint="完成購買 ÷ 開始結帳"
            />
            <StatCard
              label="棄單率"
              value={fmtPercent(summary.abandonment_rate)}
              hint="開始結帳但未完成付款的比例"
            />
          </div>

          {data.by_code?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#E2DDD4] text-xs font-bold text-[#8C8880]">
                    <th className="pb-3 pr-4">優惠碼</th>
                    <th className="pb-3 px-4 text-right">使用次數</th>
                    <th className="pb-3 px-4 text-right">開始結帳</th>
                    <th className="pb-3 px-4 text-right">完成購買</th>
                    <th className="pb-3 pl-4 text-right">營收</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DDD4]">
                  {data.by_code.map(row => (
                    <tr key={row.code} className="text-sm">
                      <td className="py-3 pr-4 font-mono font-bold text-[#1A1A18]">
                        {row.code}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {fmtNumber(row.promotion_uses)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {fmtNumber(row.begin_checkout)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {fmtNumber(row.purchases)}
                      </td>
                      <td className="py-3 pl-4 text-right font-black text-[#C8522A]">
                        NT$ {fmtNumber(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-[#8C8880] mt-4">
            Google Analytics 的數據可能有數小時延遲，新事件不會即時顯示。
          </p>
        </>
      )}
      </div>
    </div>
  )
}
