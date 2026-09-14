import React, { useState, useEffect, useCallback } from 'react'
import { X, AlertCircle, Loader2, CalendarClock } from 'lucide-react'
import { useToast } from './components/ui/Toast'
import {
  getVendorFinanceOverview,
  getVendorFinanceTransactions
} from '../api/vendor'

const getStatusBadge = (text, type) => {
  const styles = {
    success: 'bg-[#F5F0E8] text-[#1A1A18]',
    processing: 'bg-[#FDF0ED] text-[#C8522A]',
    pending: 'bg-white border border-[#E2DDD4] text-[#8C8880]',
    frozen: 'bg-white border border-[#E2DDD4] text-[#B8B4AC]',
    error: 'bg-[#FFF0F0] text-[#D93025]'
  }
  const dots = {
    success: 'bg-[#1A1A18]',
    processing: 'bg-[#C8522A]',
    pending: 'bg-[#E2DDD4]',
    frozen: 'bg-[#E2DDD4]',
    error: 'bg-[#D93025]'
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider whitespace-nowrap ${styles[type]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${dots[type]}`}
      />
      {text}
    </span>
  )
}

const fmt = n => `NTD$ ${Number(n || 0).toLocaleString()}`

const mapTxn = t => ({
  id: t.id,
  orderId: t.order_id || '—',
  amount: fmt(t.gross_amount != null ? t.gross_amount : t.amount),
  fee: fmt(t.fee_amount != null ? t.fee_amount : 0),
  netAmount: fmt(t.amount),
  netAmountRaw: Number(t.amount || 0),
  date: t.date,
  dateLabel: t.dateLabel || '日期',
  statusText: t.statusText,
  statusType: t.statusType,
  account: t.account
})

export default function Finance() {
  const { toast } = useToast()
  const vendorId = localStorage.getItem('vendor_id')

  const [txData, setTxData] = useState([]) // 整個表格的資料狀態
  const [selectedTx, setSelectedTx] = useState(null) // 查看單筆明細用

  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState({
    withdrawable_amount: 0,
    pending_amount: 0,
    hasBankAccount: false
  })

  const loadData = useCallback(async () => {
    if (!vendorId) return
    setLoading(true)
    try {
      const [overviewRes, txRes] = await Promise.all([
        getVendorFinanceOverview(vendorId),
        getVendorFinanceTransactions(vendorId)
      ])

      if (overviewRes.data?.success) {
        setOverview(overviewRes.data)
      }

      if (txRes.data?.success) {
        setTxData(txRes.data.transactions.map(mapTxn))
      } else {
        toast.error(txRes.data?.err || '讀取金流明細失敗')
      }
    } catch (err) {
      toast.error('讀取金流資料失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }, [vendorId, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (!vendorId) {
    return (
      <div className="flex items-center gap-2 text-sm font-bold text-[#D93025] bg-[#FFF0F0] rounded-2xl p-4 sm:p-5 border border-[#FFD7D2]">
        <AlertCircle size={18} className="shrink-0" />
        找不到廠商登入資訊，請重新登入後再試一次。
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 relative p-4 sm:p-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block"></span>
          金流明細
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#E2DDD4] p-4 sm:p-5">
          <p className="text-[11px] sm:text-xs font-bold text-[#8C8880] mb-1">
            可提領餘額
          </p>
          <p className="text-xl sm:text-2xl font-black text-[#C8522A]">
            {fmt(overview.withdrawable_amount)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2DDD4] p-4 sm:p-5">
          <p className="text-[11px] sm:text-xs font-bold text-[#8C8880] mb-1">
            鑑賞期凍結中
          </p>
          <p className="text-xl sm:text-2xl font-black text-[#8C8880]">
            {fmt(overview.pending_amount)}
          </p>
        </div>
      </div>

      {/* 撥款已改為月結：不再有「申請撥款」按鈕，可提領餘額會由平台
          於每月固定日期自動撥入，這裡只做狀態說明，不需要廠商操作。 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-[#8C8880] bg-[#F8F9FA] rounded-2xl p-4 border border-[#E2DDD4] mb-6">
        <CalendarClock size={18} className="text-[#C8522A] shrink-0 mt-0.5 sm:mt-0" />
        撥款為每月自動結算，可提領餘額將於每月結算日自動撥入您綁定的銀行帳戶，無需自行申請。
      </div>

      {!overview.hasBankAccount && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-[#C8522A] bg-[#FDF0ED] rounded-2xl p-4 border border-[#F5D5C8] mb-6">
          <AlertCircle size={18} className="shrink-0 mt-0.5 sm:mt-0" />
          尚未綁定撥款銀行帳戶，請至「設定」頁面完成綁定，才能收到每月自動撥款。
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#8C8880] py-20">
          <Loader2 size={18} className="animate-spin" />
          載入金流資料中...
        </div>
      ) : (
        <>
          {/* 明細列表卡片 */}
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-[#E2DDD4] shadow-sm overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                    <th className="p-4 sm:p-5 pl-6 sm:pl-8 text-[11px] sm:text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">
                      金流編號
                    </th>
                    <th className="p-4 sm:p-5 text-[11px] sm:text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">
                      訂單編號
                    </th>
                    <th className="p-4 sm:p-5 text-[11px] sm:text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">
                      訂單金額
                    </th>
                    <th className="p-4 sm:p-5 text-[11px] sm:text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">
                      日期
                    </th>
                    <th className="p-4 sm:p-5 text-[11px] sm:text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">
                      撥款狀態
                    </th>
                    <th className="p-4 sm:p-5 text-[11px] sm:text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap text-center">
                      詳細資料
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E2DDD4]">
                  {txData.map(row => (
                    <tr
                      key={row.id}
                      className="transition-colors group hover:bg-[#F8F9FA]"
                    >
                      <td className="p-4 sm:p-5 pl-6 sm:pl-8 text-[13px] sm:text-sm font-bold text-[#1A1A18] font-mono">
                        {row.id}
                      </td>
                      <td className="p-4 sm:p-5 text-[13px] sm:text-sm font-medium text-[#8C8880] font-mono">
                        {row.orderId}
                      </td>
                      <td className="p-4 sm:p-5 text-[13px] sm:text-sm font-black text-[#C8522A]">
                        {row.amount}
                      </td>
                      <td className="p-4 sm:p-5 text-[13px] sm:text-sm text-[#8C8880]">
                        <div className="font-medium whitespace-nowrap">{row.date}</div>
                        <div className="text-[9px] sm:text-[10px] font-bold text-[#B8B4AC] tracking-wider mt-0.5">
                          {row.dateLabel}
                        </div>
                      </td>
                      <td className="p-4 sm:p-5">
                        {getStatusBadge(row.statusText, row.statusType)}
                      </td>
                      <td
                        className="p-4 sm:p-5 text-center"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setSelectedTx(row)}
                          className="text-xs sm:text-sm font-bold text-[#8C8880] hover:text-[#C8522A] bg-white border border-[#E2DDD4] hover:border-[#C8522A] px-3 sm:px-4 py-1.5 rounded-full transition-all whitespace-nowrap"
                        >
                          查看
                        </button>
                      </td>
                    </tr>
                  ))}
                  {txData.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-10 text-center text-xs sm:text-sm font-bold text-[#8C8880]"
                      >
                        目前沒有任何金流紀錄
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1A18]/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-md p-6 sm:p-8 shadow-2xl border border-[#E2DDD4] animate-in zoom-in-95 duration-300 relative">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-[#8C8880] hover:text-[#1A1A18] bg-[#F8F9FA] hover:bg-[#E2DDD4] rounded-full transition-colors"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
            <div className="mb-6 sm:mb-8">
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1A1A18] mb-2 sm:mb-3">
                金流詳細資料
              </h3>
              {getStatusBadge(selectedTx.statusText, selectedTx.statusType)}
            </div>
            <div className="bg-[#F8F9FA] rounded-xl sm:rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8 border border-[#E2DDD4]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs sm:text-sm font-bold text-[#8C8880]">
                  訂單總額
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#1A1A18]">
                  {selectedTx.amount}
                </span>
              </div>
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#E2DDD4] dashed">
                <span className="text-xs sm:text-sm font-bold text-[#8C8880]">
                  平台手續費
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#D93025]">
                  - {selectedTx.fee}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-xs sm:text-sm font-bold text-[#1A1A18]">
                  實收金額
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#C8522A]">
                  {selectedTx.netAmount}
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#8C8880] uppercase">
                  金流編號
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#1A1A18] font-mono break-all">
                  {selectedTx.id}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#8C8880] uppercase">
                  {selectedTx.dateLabel}
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#1A1A18]">
                  {selectedTx.date}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#8C8880] uppercase">
                  撥款帳戶
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#1A1A18] break-all">
                  {selectedTx.account}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}