import React, { useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { getVendorKocHistory } from '../api/vendor'
import { getErrorMessage } from '../errorMessage'
import { formatCurrency, cn } from './lib/utils'

// 每次任務的結果：顯示文字與顏色
const OUTCOME = {
  ongoing: { label: '進行中', cls: 'bg-cream text-ink' },
  completed: { label: '已完成', cls: 'bg-green-50 text-green-700' },
  cancelled: { label: 'KOC 取消', cls: 'bg-red-50 text-red-600' },
  expired: { label: '逾期未完成', cls: 'bg-red-50 text-red-600' },
  admin_closed: { label: '平台終止', cls: 'bg-red-50 text-red-600' },
}

function Stat({ label, value, hint, warn = false }) {
  return (
    <div className={cn('rounded-xl sm:rounded-2xl border p-3 sm:p-4', warn ? 'border-brand-pale bg-brand-soft' : 'border-edge bg-mist')}>
      <div className="text-[10px] sm:text-[11px] font-bold text-muted tracking-wider">{label}</div>
      <div className={cn('mt-1 text-lg sm:text-xl font-black', warn ? 'text-brand' : 'text-ink')}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] font-bold text-muted">{hint}</div>}
    </div>
  )
}

// 廠商審核接案申請時查看 KOC 的過往接案紀錄：違規次數、成效（平均一次接案賣出多少）、每次任務的結果
// 故意不顯示 KOC 的社群帳號：平台希望廠商依帶貨成效決定，而不是依名氣篩選
// koc：{ kocId, name }。不是彈窗，直接嵌在審核名單裡（展開在那位 KOC 的列下方）
export default function KocHistoryPanel({ koc }) {
  const vendorId = localStorage.getItem('vendor_id')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!koc?.kocId) return undefined
    let cancelled = false
    setLoading(true)
    setError('')
    setData(null)
    getVendorKocHistory(vendorId, koc.kocId)
      .then((response) => {
        if (!cancelled) setData(response.data)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, '接案紀錄載入失敗，請稍後再試'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [koc?.kocId, vendorId])

  if (!koc) return null

  const summary = data?.summary
  const missions = data?.missions || []
  // 沒有履行的任務：KOC 自己取消、放到逾期、被平台終止
  const failedCount = summary ? summary.cancelled_count + summary.expired_count + summary.admin_closed_count : 0

  return (
    <div className="rounded-xl sm:rounded-2xl border border-edge bg-white p-4 sm:p-6">
      <div className="mb-4 text-sm font-bold text-ink">
        {koc.name} 的過往接案紀錄
      </div>
      <div className="space-y-5 sm:space-y-6">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 size={22} className="animate-spin text-brand" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm font-bold text-brand">{error}</div>
          ) : (
            <>
              {data.koc.is_suspended && (
                <div className="flex items-start gap-2 rounded-xl border border-brand-pale bg-brand-soft px-4 py-3 text-xs font-bold text-brand">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  這位 KOC 目前因違規次數過多被停權中。
                </div>
              )}

              {/* 違規與履約 */}
              <div>
                <div className="text-xs font-bold text-ink mb-2.5">違規與履約</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <Stat label="累計違規次數" value={`${summary.violation_count} 次`} hint="取消任務、逾期未完成都算" warn={summary.violation_count > 0} />
                  <Stat label="接案總數" value={`${summary.total_missions} 次`} hint={`進行中 ${summary.ongoing_count} 次`} />
                  <Stat label="正常完成" value={`${summary.completed_count} 次`} />
                  <Stat
                    label="未履行"
                    value={`${failedCount} 次`}
                    hint={`取消 ${summary.cancelled_count}・逾期 ${summary.expired_count}・平台終止 ${summary.admin_closed_count}`}
                    warn={failedCount > 0}
                  />
                </div>
              </div>

              {/* 成效分析 */}
              <div>
                <div className="text-xs font-bold text-ink mb-2.5">成效分析</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  <Stat
                    label="平均一次接案賣出"
                    value={summary.avg_sales_amount != null ? formatCurrency(summary.avg_sales_amount) : '—'}
                    hint="只算有進入推廣的任務"
                  />
                  <Stat label="累計銷售額" value={formatCurrency(summary.total_sales_amount)} />
                  <Stat label="累計帶來訂單" value={`${summary.total_orders} 筆`} />
                </div>
              </div>

              {/* 每次任務 */}
              <div>
                <div className="text-xs font-bold text-ink mb-2.5">每次接案</div>
                {missions.length === 0 ? (
                  <div className="rounded-xl border border-edge py-10 text-center text-xs font-bold text-muted">
                    這位 KOC 還沒有接案紀錄，這是第一次申請。
                  </div>
                ) : (
                  <div className="rounded-xl sm:rounded-2xl border border-edge overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[520px]">
                        <thead>
                          <tr className="bg-mist border-b border-edge">
                            {['活動', '活動期間', '結果', '訂單', '銷售額'].map((h) => (
                              <th key={h} className="px-4 py-3 text-[11px] font-bold text-muted tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-edge">
                          {missions.map((m) => {
                            const outcome = OUTCOME[m.outcome] || { label: m.outcome, cls: 'bg-mist text-muted' }
                            return (
                              <tr key={m.kocmission_id}>
                                <td className="px-4 py-3">
                                  <div className={cn('text-sm font-bold', m.is_own_campaign ? 'text-ink' : 'text-muted')}>
                                    {m.campaign_name}
                                  </div>
                                  {m.missed_publishing_deadline && (
                                    <div className="mt-0.5 text-[10px] font-bold text-brand">曾逾期未交貼文連結</div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-xs font-bold text-muted whitespace-nowrap">
                                  {m.start_date || '—'} ~ {m.end_date || '—'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={cn('inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap', outcome.cls)}>
                                    {outcome.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-ink">{m.orders}</td>
                                <td className="px-4 py-3 text-sm font-bold text-ink whitespace-nowrap">{formatCurrency(m.sales_amount)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {data.missions_truncated && (
                  <p className="mt-2 text-[11px] font-bold text-muted">只列出最近 {missions.length} 次，上方的統計數字包含全部紀錄。</p>
                )}
                <p className="mt-2 text-[11px] font-bold text-muted">
                  為保護其他廠商的商業資訊，別家廠商的活動不顯示名稱，只顯示結果與成效。
                </p>
              </div>
            </>
          )}
      </div>
    </div>
  )
}
