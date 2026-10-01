import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  ReceiptText,
  XCircle,
} from 'lucide-react'
import {
  getAdminVendorReceivables,
  createVendorReceivablePayout,
  confirmVendorReceivablePayout,
  getSettleableVendors,
  generateVendorSettlement,
  getVendorSettlements,
  confirmVendorSettlementPayment,
  getVendorSettlementInvoices,
  getAdminKocPayouts,
  confirmAdminKocPayout,
  exportKocPayoutTransfers,
} from '../api/platform'

const money = (value) =>
  `NT$ ${Number(value || 0).toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`

const dateText = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const shortId = (value) => {
  if (!value) return '—'
  const text = String(value)
  return text.length > 16 ? `${text.slice(0, 8)}...${text.slice(-5)}` : text
}

const RECEIVABLE_STATUS = {
  pending: ['等待資格', 'bg-white border border-[#E2DDD4] text-[#8C8880]'],
  eligible: ['可撥款', 'bg-[#F5F0E8] text-[#1A1A18]'],
  payout_pending: ['撥款處理中', 'bg-[#FDF0ED] text-[#C8522A]'],
  partially_paid: ['部分已撥', 'bg-[#FDF0ED] text-[#C8522A]'],
  paid: ['已撥款', 'bg-[#EEF7F0] text-[#2F6F45]'],
  refunded: ['已退款', 'bg-[#FFF0F0] text-[#D93025]'],
  cancelled: ['已取消', 'bg-[#F8F9FA] text-[#8C8880]'],
  adjusted: ['已調整', 'bg-[#F8F9FA] border border-[#E2DDD4] text-[#8C8880]'],
}

const SETTLEMENT_STATUS = {
  draft: ['草稿', 'bg-white border border-[#E2DDD4] text-[#8C8880]'],
  awaiting_payment: ['待繳款', 'bg-[#FDF0ED] text-[#C8522A]'],
  partially_paid: ['部分已繳', 'bg-[#FDF0ED] text-[#C8522A]'],
  paid: ['已繳清', 'bg-[#EEF7F0] text-[#2F6F45]'],
  overdue: ['已逾期', 'bg-[#FFF0F0] text-[#D93025]'],
  cancelled: ['已取消', 'bg-[#F8F9FA] text-[#8C8880]'],
}

function StatusBadge({ status, type = 'receivable' }) {
  const map = type === 'settlement' ? SETTLEMENT_STATUS : RECEIVABLE_STATUS
  const [label, style] = map[status] || [status || '未知', 'bg-[#F8F9FA] text-[#8C8880]']
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap ${style}`}>
      {label}
    </span>
  )
}

function SummaryCard({ title, value, hint, icon: Icon, dark = false }) {
  return (
    <div className={`rounded-[1.5rem] border p-5 ${dark ? 'bg-[#1A1A18] border-[#1A1A18]' : 'bg-white border-[#E2DDD4]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[10px] font-bold tracking-wider ${dark ? 'text-[#B8B4AC]' : 'text-[#8C8880]'}`}>{title}</p>
          <p className={`mt-2 text-xl font-black ${dark ? 'text-[#F5F0E8]' : 'text-[#1A1A18]'}`}>{money(value)}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${dark ? 'bg-white/10 text-[#F5F0E8]' : 'bg-[#F5F0E8] text-[#B89B6A]'}`}>
          <Icon size={18} />
        </div>
      </div>
      {hint && <p className={`mt-3 text-[10px] leading-relaxed ${dark ? 'text-[#B8B4AC]' : 'text-[#8C8880]'}`}>{hint}</p>}
    </div>
  )
}

function EmptyState({ children }) {
  return <div className="py-14 text-center text-xs font-bold text-[#8C8880]">{children}</div>
}

function ActionButton({ children, onClick, disabled, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-3 py-2 text-[10px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        danger
          ? 'border border-[#FFD7D2] bg-[#FFF0F0] text-[#D93025] hover:bg-[#D93025] hover:text-white'
          : 'border border-[#E2DDD4] bg-white text-[#1A1A18] hover:bg-[#F5F0E8]'
      }`}
    >
      {children}
    </button>
  )
}

export default function AdminFinance() {
  const adminId = localStorage.getItem('admin_id')
  const [activeTab, setActiveTab] = useState('goods')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [receivables, setReceivables] = useState([])
  const [settleableVendors, setSettleableVendors] = useState([])
  const [settlements, setSettlements] = useState([])
  const [kocPayouts, setKocPayouts] = useState([])
  const [invoices, setInvoices] = useState([])

  const [processingKey, setProcessingKey] = useState('')

  const loadAll = useCallback(async (showMainLoader = true) => {
    if (!adminId) {
      setError('找不到管理員登入資訊，請重新登入。')
      setLoading(false)
      return
    }

    if (showMainLoader) setLoading(true)
    else setRefreshing(true)
    setError('')

    try {
      const [
        receivableRes,
        settleableRes,
        settlementRes,
        kocRes,
        invoiceRes,
      ] = await Promise.all([
        getAdminVendorReceivables({ Admin_id: adminId }),
        getSettleableVendors({ Admin_id: adminId }),
        getVendorSettlements({ Admin_id: adminId }),
        getAdminKocPayouts({ Admin_id: adminId, status: 'pending' }),
        getVendorSettlementInvoices({ Admin_id: adminId }),
      ])

      setReceivables(receivableRes.data?.receivables || [])
      setSettleableVendors(Array.isArray(settleableRes.data) ? settleableRes.data : [])
      setSettlements(Array.isArray(settlementRes.data) ? settlementRes.data : [])
      setKocPayouts(Array.isArray(kocRes.data) ? kocRes.data : [])
      setInvoices(invoiceRes.data?.invoices || [])
    } catch (err) {
      console.error('AdminFinance 載入失敗', err)
      setError(err.response?.data?.err || '財務資料載入失敗，請稍後再試。')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [adminId])

  useEffect(() => {
    loadAll(true)
  }, [loadAll])

  const receivableSummary = useMemo(() => {
    return receivables.reduce(
      (acc, item) => {
        const due = Number(item.Amount_due || 0)
        const paid = Number(item.Amount_paid || 0)
        const outstanding = Number(item.Outstanding_amount || 0)

        acc.totalDue += due
        acc.totalPaid += paid
        acc.outstanding += outstanding
        if (item.Status === 'eligible') acc.eligible += outstanding
        if (item.Status === 'payout_pending') acc.processing += outstanding
        return acc
      },
      { totalDue: 0, totalPaid: 0, outstanding: 0, eligible: 0, processing: 0 }
    )
  }, [receivables])

  const settlementSummary = useMemo(() => {
    return settlements.reduce(
      (acc, item) => {
        acc.amountDue += Number(item.Amount_due || 0)
        acc.amountPaid += Number(item.Amount_paid || 0)
        acc.outstanding += Number(item.Outstanding_amount || 0)
        if (item.Status === 'overdue') acc.overdue += Number(item.Outstanding_amount || 0)
        return acc
      },
      { amountDue: 0, amountPaid: 0, outstanding: 0, overdue: 0 }
    )
  }, [settlements])

  const pendingPayoutCount = useMemo(
    () => receivables.reduce((count, r) => count + (r.Payouts || []).filter((p) => p.Status === 'pending').length, 0),
    [receivables]
  )

  const handleCreateGoodsPayout = async (receivable) => {
    if (!window.confirm(`確定要建立 ${receivable.Vendor_name} 的貨款撥款 ${money(receivable.Outstanding_amount)} 嗎？`)) return

    const key = `create-receivable-${receivable.Receivable_id}`
    setProcessingKey(key)
    try {
      const res = await createVendorReceivablePayout({
        Admin_id: adminId,
        receivable_id: receivable.Receivable_id,
        amount: receivable.Outstanding_amount,
        payout_method: 'bank_transfer',
      })
      if (res.data?.success === false) throw new Error(res.data.err || '建立撥款失敗')
      alert(`已建立貨款撥款 #${res.data.payout_id}，請完成實際匯款後再確認。`)
      await loadAll(false)
    } catch (err) {
      alert(err.response?.data?.err || err.message || '建立貨款撥款失敗')
    } finally {
      setProcessingKey('')
    }
  }

  const handleConfirmGoodsPayout = async (payout, newStatus) => {
    const success = newStatus === 'completed'
    if (!window.confirm(success ? '確定這筆貨款已實際匯給廠商嗎？' : '確定要把這筆貨款撥款標記為失敗嗎？')) return

    const reference = success ? window.prompt('可輸入銀行交易編號／匯款備註（可留空）', '') : ''
    const key = `confirm-goods-${payout.Payout_id}`
    setProcessingKey(key)

    try {
      const res = await confirmVendorReceivablePayout({
        Admin_id: adminId,
        payout_id: payout.Payout_id,
        status: newStatus,
        transaction_reference: reference || '',
      })
      if (res.data?.success === false) throw new Error(res.data.err || '處理失敗')
      await loadAll(false)
    } catch (err) {
      alert(err.response?.data?.err || err.message || '貨款撥款處理失敗')
    } finally {
      setProcessingKey('')
    }
  }

  const handleGenerateSettlement = async (vendor) => {
    if (!window.confirm(`確定要為 ${vendor.Vendor_name} 產生 15% 平台服務費結算單嗎？\n可結算服務費：${money(vendor.Eligible_amount)}`)) return

    const key = `generate-${vendor.Vendor_id}`
    setProcessingKey(key)
    try {
      const res = await generateVendorSettlement({
        Admin_id: adminId,
        vendor_id: vendor.Vendor_id,
      })
      if (res.data?.success === false) throw new Error(res.data.err || '產生結算單失敗')
      alert(`已產生結算單，應繳服務費共 ${money(res.data.total_amount)}。`)
      await loadAll(false)
    } catch (err) {
      alert(err.response?.data?.err || err.message || '產生結算單失敗')
    } finally {
      setProcessingKey('')
    }
  }

  const handleConfirmSettlement = async (settlement) => {
    if (!window.confirm(`確定平台已收到 ${settlement.Vendor_name} 的服務費 ${money(settlement.Outstanding_amount)} 嗎？\n確認後，對應 KOC 分潤才會由 pending 轉為可提領。`)) return

    const referenceNo = window.prompt('可輸入轉帳交易編號／收款備註（可留空）', '')
    const key = `settlement-${settlement.Settlement_id}`
    setProcessingKey(key)
    try {
      const res = await confirmVendorSettlementPayment({
        Admin_id: adminId,
        settlement_id: settlement.Settlement_id,
        status: 'completed',
        amount: settlement.Outstanding_amount,
        payment_method: 'bank_transfer',
        reference_no: referenceNo || '',
      })
      if (res.data?.success === false) throw new Error(res.data.err || '確認服務費失敗')
      alert('已確認收到平台服務費。')
      await loadAll(false)
    } catch (err) {
      alert(err.response?.data?.err || err.message || '確認廠商服務費失敗')
    } finally {
      setProcessingKey('')
    }
  }

  const handleConfirmKocPayout = async (payout, newStatus) => {
    const isComplete = newStatus === 'completed'
    if (!window.confirm(isComplete ? '確定已完成這筆 KOC 匯款嗎？' : '確定要標記這筆 KOC 撥款失敗嗎？金額會退回可提領餘額。')) return

    const key = `koc-${payout.Payout_id}`
    setProcessingKey(key)
    try {
      const res = await confirmAdminKocPayout({
        Admin_id: adminId,
        payout_id: payout.Payout_id,
        status: newStatus,
      })
      if (res.data?.success === false) throw new Error(res.data.err || '處理失敗')
      await loadAll(false)
    } catch (err) {
      alert(err.response?.data?.err || err.message || 'KOC 撥款處理失敗')
    } finally {
      setProcessingKey('')
    }
  }

  const handleExportKoc = async () => {
    try {
      const res = await exportKocPayoutTransfers({
        Admin_id: adminId,
        status: 'pending',
      })
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `koc_payouts_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.response?.data?.err || '匯出 KOC 撥款 CSV 失敗')
    }
  }

  const tabs = [
    { key: 'goods', label: '廠商貨款', icon: ArrowDownToLine },
    { key: 'settlement', label: '服務費', icon: ArrowUpFromLine },
    { key: 'koc', label: 'KOC 撥款', icon: Banknote },
    { key: 'invoice', label: '服務費發票', icon: FileText },
  ]

  if (loading) {
    return (
      <div className="min-h-[520px] flex flex-col items-center justify-center gap-3 text-[#8C8880]">
        <Loader2 size={28} className="animate-spin text-[#C8522A]" />
        <p className="text-sm font-bold">財務資料載入中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-black text-[#1A1A18]">平台財務管理</h1>
          <p className="mt-2 max-w-3xl text-[11px] sm:text-xs leading-relaxed text-[#8C8880]">
            廠商貨款與平台服務費採兩筆獨立金流：ShareBuy 先將貨款全額撥給廠商，廠商再依有效成交額支付 15% 平台服務費。KOC 5% 分潤由 ShareBuy 從平台收入中負擔。
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadAll(false)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2DDD4] bg-white px-4 py-2.5 text-xs font-bold text-[#1A1A18] hover:bg-[#F5F0E8] disabled:opacity-50"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          重新整理
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-[#FFD7D2] bg-[#FFF0F0] p-4 text-xs font-bold text-[#D93025]">
          <AlertCircle size={17} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === key
                ? 'bg-[#1A1A18] text-[#F5F0E8] shadow-sm'
                : 'border border-[#E2DDD4] bg-white text-[#8C8880] hover:text-[#1A1A18]'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'goods' && (
        <section className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryCard title="平台應付貨款" value={receivableSummary.outstanding} hint={`${receivables.length} 筆貨款紀錄`} icon={Banknote} dark />
            <SummaryCard title="目前可撥貨款" value={receivableSummary.eligible} hint="已過退貨風險期且無未解決退貨" icon={CheckCircle2} />
            <SummaryCard title="撥款處理中" value={receivableSummary.processing} hint={`${pendingPayoutCount} 筆待確認匯款`} icon={Clock3} />
            <SummaryCard title="累計已撥貨款" value={receivableSummary.totalPaid} hint="Admin 已確認完成匯款" icon={ArrowDownToLine} />
          </div>

          <div className="rounded-[1.5rem] border border-[#E2DDD4] bg-white overflow-hidden">
            <div className="border-b border-[#E2DDD4] bg-[#F8F9FA] px-5 py-4">
              <h2 className="text-sm font-black text-[#1A1A18]">平台 → 廠商 貨款</h2>
              <p className="mt-1 text-[10px] text-[#8C8880]">這裡只處理平台代收後要全額撥給廠商的貨款，不會扣除 15% 服務費。</p>
            </div>

            {receivables.length === 0 ? (
              <EmptyState>目前沒有廠商貨款紀錄</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px]">
                  <thead className="border-b border-[#E2DDD4]">
                    <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                      <th className="px-5 py-3">廠商</th>
                      <th className="px-5 py-3">訂單</th>
                      <th className="px-5 py-3">應撥貨款</th>
                      <th className="px-5 py-3">已撥</th>
                      <th className="px-5 py-3">待撥</th>
                      <th className="px-5 py-3">收款帳戶</th>
                      <th className="px-5 py-3">狀態</th>
                      <th className="px-5 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD4]">
                    {receivables.map((item) => {
                      const pendingPayouts = (item.Payouts || []).filter((p) => p.Status === 'pending')
                      const canCreate = ['eligible', 'partially_paid', 'adjusted'].includes(item.Status) && Number(item.Outstanding_amount || 0) > 0 && pendingPayouts.length === 0

                      return (
                        <React.Fragment key={item.Receivable_id}>
                          <tr className="hover:bg-[#F8F9FA]/70">
                            <td className="px-5 py-4">
                              <p className="text-xs font-black text-[#1A1A18]">{item.Vendor_name}</p>
                              <p className="mt-1 text-[10px] text-[#8C8880]">{item.Vendor_id}</p>
                            </td>
                            <td className="px-5 py-4 text-[11px] font-bold text-[#1A1A18]">{shortId(item.Order_id)}</td>
                            <td className="px-5 py-4 text-xs font-black text-[#1A1A18]">{money(item.Amount_due)}</td>
                            <td className="px-5 py-4 text-xs font-bold text-[#2F6F45]">{money(item.Amount_paid)}</td>
                            <td className="px-5 py-4 text-xs font-black text-[#C8522A]">{money(item.Outstanding_amount)}</td>
                            <td className="px-5 py-4 text-[10px] text-[#8C8880]">
                              {item.Bank_code ? `${item.Bank_code} ****${item.Bank_account_last4}` : '未設定'}
                              <div className="mt-1">{item.Bank_account_name || '—'}</div>
                            </td>
                            <td className="px-5 py-4"><StatusBadge status={item.Status} /></td>
                            <td className="px-5 py-4">
                              {canCreate ? (
                                <ActionButton
                                  disabled={processingKey === `create-receivable-${item.Receivable_id}` || !item.Bank_code}
                                  onClick={() => handleCreateGoodsPayout(item)}
                                >
                                  {processingKey === `create-receivable-${item.Receivable_id}` ? '建立中...' : '建立撥款'}
                                </ActionButton>
                              ) : item.Status === 'pending' ? (
                                <span className="text-[10px] text-[#8C8880]">{dateText(item.Eligible_at)} 後可處理</span>
                              ) : !item.Bank_code && Number(item.Outstanding_amount || 0) > 0 ? (
                                <span className="text-[10px] font-bold text-[#D93025]">廠商未設銀行帳戶</span>
                              ) : (
                                <span className="text-[10px] text-[#8C8880]">—</span>
                              )}
                            </td>
                          </tr>

                          {pendingPayouts.map((payout) => (
                            <tr key={`payout-${payout.Payout_id}`} className="bg-[#F8F9FA]">
                              <td className="px-5 py-3 text-[10px] font-bold text-[#8C8880]" colSpan={2}>
                                撥款 #{payout.Payout_id}
                              </td>
                              <td className="px-5 py-3 text-xs font-black text-[#1A1A18]">{money(payout.Amount)}</td>
                              <td className="px-5 py-3 text-[10px] text-[#8C8880]" colSpan={2}>
                                建立：{dateText(payout.Created_at)}
                              </td>
                              <td className="px-5 py-3 text-[10px] text-[#8C8880]">
                                {payout.Destination_bank_code} ****{payout.Destination_account_last4}
                              </td>
                              <td className="px-5 py-3"><StatusBadge status="payout_pending" /></td>
                              <td className="px-5 py-3">
                                <div className="flex gap-2">
                                  <ActionButton
                                    disabled={processingKey === `confirm-goods-${payout.Payout_id}`}
                                    onClick={() => handleConfirmGoodsPayout(payout, 'completed')}
                                  >
                                    確認已匯款
                                  </ActionButton>
                                  <ActionButton
                                    danger
                                    disabled={processingKey === `confirm-goods-${payout.Payout_id}`}
                                    onClick={() => handleConfirmGoodsPayout(payout, 'failed')}
                                  >
                                    匯款失敗
                                  </ActionButton>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'settlement' && (
        <section className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryCard title="廠商尚待繳服務費" value={settlementSummary.outstanding} hint="Vendor → ShareBuy 的 15% 服務費" icon={ReceiptText} dark />
            <SummaryCard title="累計已收服務費" value={settlementSummary.amountPaid} hint="平台已確認收款" icon={CheckCircle2} />
            <SummaryCard title="逾期未繳" value={settlementSummary.overdue} hint="需後續追蹤廠商" icon={AlertCircle} />
            <SummaryCard title="待產生結算服務費" value={settleableVendors.reduce((s, v) => s + Number(v.Eligible_amount || 0), 0)} hint={`${settleableVendors.filter((v) => Number(v.Eligible_count || 0) > 0).length} 個廠商可結算`} icon={Clock3} />
          </div>

          <div className="rounded-[1.5rem] border border-[#E2DDD4] bg-white overflow-hidden">
            <div className="border-b border-[#E2DDD4] bg-[#F8F9FA] px-5 py-4">
              <h2 className="text-sm font-black text-[#1A1A18]">可產生服務費結算單</h2>
              <p className="mt-1 text-[10px] text-[#8C8880]">只會把已過退貨風險期、無未解決退款的貨款納入結算。</p>
            </div>

            {settleableVendors.filter((v) => Number(v.Eligible_count || 0) > 0).length === 0 ? (
              <EmptyState>目前沒有可產生結算單的廠商</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="border-b border-[#E2DDD4]">
                    <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                      <th className="px-5 py-3">廠商</th>
                      <th className="px-5 py-3">可結算訂單</th>
                      <th className="px-5 py-3">有效成交額</th>
                      <th className="px-5 py-3">15% 服務費</th>
                      <th className="px-5 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD4]">
                    {settleableVendors
                      .filter((v) => Number(v.Eligible_count || 0) > 0)
                      .map((vendor) => (
                        <tr key={vendor.Vendor_id}>
                          <td className="px-5 py-4">
                            <p className="text-xs font-black text-[#1A1A18]">{vendor.Vendor_name}</p>
                            <p className="mt-1 text-[10px] text-[#8C8880]">{vendor.Vendor_id}</p>
                          </td>
                          <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">{vendor.Eligible_count}</td>
                          <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">{money(vendor.Eligible_sales)}</td>
                          <td className="px-5 py-4 text-xs font-black text-[#C8522A]">{money(vendor.Eligible_amount)}</td>
                          <td className="px-5 py-4">
                            <ActionButton
                              disabled={processingKey === `generate-${vendor.Vendor_id}`}
                              onClick={() => handleGenerateSettlement(vendor)}
                            >
                              {processingKey === `generate-${vendor.Vendor_id}` ? '產生中...' : '產生結算單'}
                            </ActionButton>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-[#E2DDD4] bg-white overflow-hidden">
            <div className="border-b border-[#E2DDD4] bg-[#F8F9FA] px-5 py-4">
              <h2 className="text-sm font-black text-[#1A1A18]">平台服務費結算單</h2>
              <p className="mt-1 text-[10px] text-[#8C8880]">確認平台收到服務費後，系統才會釋放對應 KOC 5% 分潤。</p>
            </div>

            {settlements.length === 0 ? (
              <EmptyState>目前沒有平台服務費結算單</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead className="border-b border-[#E2DDD4]">
                    <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                      <th className="px-5 py-3">結算單</th>
                      <th className="px-5 py-3">廠商</th>
                      <th className="px-5 py-3">有效成交額</th>
                      <th className="px-5 py-3">應繳</th>
                      <th className="px-5 py-3">已繳</th>
                      <th className="px-5 py-3">未繳</th>
                      <th className="px-5 py-3">到期日</th>
                      <th className="px-5 py-3">狀態</th>
                      <th className="px-5 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD4]">
                    {settlements.map((item) => (
                      <tr key={item.Settlement_id}>
                        <td className="px-5 py-4 text-xs font-black text-[#1A1A18]">#{item.Settlement_id}</td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-black text-[#1A1A18]">{item.Vendor_name}</p>
                          <p className="mt-1 text-[10px] text-[#8C8880]">{item.Vendor_id}</p>
                        </td>
                        <td className="px-5 py-4 text-xs font-bold">{money(item.Gross_sales)}</td>
                        <td className="px-5 py-4 text-xs font-black text-[#C8522A]">{money(item.Amount_due)}</td>
                        <td className="px-5 py-4 text-xs font-bold text-[#2F6F45]">{money(item.Amount_paid)}</td>
                        <td className="px-5 py-4 text-xs font-black text-[#C8522A]">{money(item.Outstanding_amount)}</td>
                        <td className="px-5 py-4 text-[10px] text-[#8C8880]">{dateText(item.Due_date)}</td>
                        <td className="px-5 py-4"><StatusBadge type="settlement" status={item.Status} /></td>
                        <td className="px-5 py-4">
                          {item.Status !== 'paid' && Number(item.Outstanding_amount || 0) > 0 ? (
                            <ActionButton
                              disabled={processingKey === `settlement-${item.Settlement_id}`}
                              onClick={() => handleConfirmSettlement(item)}
                            >
                              確認收到款項
                            </ActionButton>
                          ) : (
                            <span className="text-[10px] font-bold text-[#2F6F45]">已完成</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'koc' && (
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 rounded-[1.5rem] border border-[#E2DDD4] bg-white p-5">
            <div>
              <h2 className="text-sm font-black text-[#1A1A18]">KOC 分潤撥款</h2>
              <p className="mt-1 text-[10px] leading-relaxed text-[#8C8880]"> 15% 服務費確認入帳後，對應 KOC Earnings 才會變成可提領。這裡只處理 KOC 已提出的撥款申請。</p>
            </div>
            <button
              type="button"
              onClick={handleExportKoc}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A1A18] px-4 py-2.5 text-xs font-bold text-[#F5F0E8] hover:bg-[#C8522A]"
            >
              <Download size={14} />
              匯出待撥 CSV
            </button>
          </div>

          <div className="rounded-[1.5rem] border border-[#E2DDD4] bg-white overflow-hidden">
            {kocPayouts.length === 0 ? (
              <EmptyState>目前沒有待處理的 KOC 撥款申請</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px]">
                  <thead className="border-b border-[#E2DDD4] bg-[#F8F9FA]">
                    <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                      <th className="px-5 py-3">撥款單</th>
                      <th className="px-5 py-3">KOC</th>
                      <th className="px-5 py-3">銀行帳戶</th>
                      <th className="px-5 py-3">金額</th>
                      <th className="px-5 py-3">申請時間</th>
                      <th className="px-5 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD4]">
                    {kocPayouts.map((payout) => (
                      <tr key={payout.Payout_id}>
                        <td className="px-5 py-4 text-xs font-black text-[#1A1A18]">#{payout.Payout_id}</td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-black text-[#1A1A18]">{payout.Koc_name}</p>
                          <p className="mt-1 text-[10px] text-[#8C8880]">{payout.Koc_user_id}</p>
                        </td>
                        <td className="px-5 py-4 text-[10px] text-[#8C8880]">{payout.Bank_display}</td>
                        <td className="px-5 py-4 text-xs font-black text-[#C8522A]">{money(payout.Amount)}</td>
                        <td className="px-5 py-4 text-[10px] text-[#8C8880]">{dateText(payout.Payout_date)}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <ActionButton disabled={processingKey === `koc-${payout.Payout_id}`} onClick={() => handleConfirmKocPayout(payout, 'completed')}>
                              已完成匯款
                            </ActionButton>
                            <ActionButton danger disabled={processingKey === `koc-${payout.Payout_id}`} onClick={() => handleConfirmKocPayout(payout, 'failed')}>
                              匯款失敗
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'invoice' && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-[#E2DDD4] bg-[#F8F9FA] p-4 text-[10px] sm:text-xs leading-relaxed text-[#8C8880]">
            <p className="font-bold text-[#1A1A18]">服務費發票</p>
            <p className="mt-1">這裡的發票是 ShareBuy 就廠商支付的 15% 平台服務費開立的 B2B 發票，不是消費者購買商品的銷售發票。</p>
          </div>

          <div className="rounded-[1.5rem] border border-[#E2DDD4] bg-white overflow-hidden">
            {invoices.length === 0 ? (
              <EmptyState>目前沒有平台服務費發票紀錄</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead className="border-b border-[#E2DDD4] bg-[#F8F9FA]">
                    <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                      <th className="px-5 py-3">發票紀錄</th>
                      <th className="px-5 py-3">廠商</th>
                      <th className="px-5 py-3">結算單</th>
                      <th className="px-5 py-3">服務費</th>
                      <th className="px-5 py-3">稅額</th>
                      <th className="px-5 py-3">發票總額</th>
                      <th className="px-5 py-3">發票號碼</th>
                      <th className="px-5 py-3">狀態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD4]">
                    {invoices.map((invoice) => (
                      <tr key={invoice.invoice_id}>
                        <td className="px-5 py-4">
                          <p className="text-xs font-black text-[#1A1A18]">#{invoice.invoice_id}</p>
                          <p className="mt-1 text-[10px] text-[#8C8880]">{dateText(invoice.created_at)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-black text-[#1A1A18]">{invoice.vendor_name}</p>
                          <p className="mt-1 text-[10px] text-[#8C8880]">{invoice.vendor_id}</p>
                        </td>
                        <td className="px-5 py-4 text-xs font-bold">{invoice.settlement_id ? `#${invoice.settlement_id}` : '—'}</td>
                        <td className="px-5 py-4 text-xs font-bold">{money(invoice.service_fee)}</td>
                        <td className="px-5 py-4 text-xs font-bold">{money(invoice.tax_amount)}</td>
                        <td className="px-5 py-4 text-xs font-black text-[#C8522A]">{money(invoice.total_amount)}</td>
                        <td className="px-5 py-4 text-[10px] text-[#8C8880]">{invoice.invoice_number || '尚未開立'}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${invoice.status === 'issued' ? 'bg-[#EEF7F0] text-[#2F6F45]' : invoice.status === 'failed' ? 'bg-[#FFF0F0] text-[#D93025]' : 'bg-[#F8F9FA] text-[#8C8880]'}`}>
                            {invoice.status === 'issued' ? '已開立' : invoice.status === 'failed' ? '開立失敗' : '待開立'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
