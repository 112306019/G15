import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  ReceiptText,
  XCircle,
} from 'lucide-react'

import {
  getMonthlyPayoutReadyVendors,
  generateVendorPayoutBatch,
  getVendorPayoutBatches,
  confirmVendorPayoutBatch,

  getSettleableVendors,
  generateVendorSettlement,
  getVendorSettlements,
  confirmVendorSettlementPayment,
  getVendorSettlementInvoices,

  getAdminKocPayouts,
  confirmAdminKocPayout,
  exportKocPayoutTransfers,
} from '../api/platform'


// ======================================================
// 共用工具
// ======================================================

const money = (value) =>
  `NT$ ${Number(value || 0).toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`


const dateText = (value) => {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}


const dateTimeText = (value) => {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}


const previousMonthValue = () => {
  const now = new Date()

  const year = now.getFullYear()
  const month = now.getMonth()

  const previous = new Date(year, month - 1, 1)

  return `${previous.getFullYear()}-${String(
    previous.getMonth() + 1
  ).padStart(2, '0')}`
}


const monthLabel = (value) => {
  if (!value) return '—'

  const [year, month] = value.split('-')

  if (!year || !month) return value

  return `${year} 年 ${Number(month)} 月`
}


const normalizeSettlementList = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.settlements)) return data.settlements
  return []
}


const normalizeKocList = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.payouts)) return data.payouts
  return []
}


// ======================================================
// 狀態
// ======================================================

const PAYOUT_BATCH_STATUS = {
  draft: [
    '月結建立中',
    'bg-[#F8F9FA] text-[#8C8880]',
  ],
  ready: [
    '待撥款',
    'bg-[#F5F0E8] text-[#8A6734]',
  ],
  paid: [
    '已撥款',
    'bg-[#EEF7F0] text-[#2F6F45]',
  ],
  failed: [
    '撥款失敗',
    'bg-[#FFF0F0] text-[#D93025]',
  ],
  cancelled: [
    '已取消',
    'bg-[#F8F9FA] text-[#8C8880]',
  ],
  adjusted: [
    '已調整',
    'bg-[#F8F9FA] text-[#8C8880]',
  ],
}


const SETTLEMENT_STATUS = {
  draft: [
    '月結建立中',
    'bg-[#F8F9FA] text-[#8C8880]',
  ],
  awaiting_payment: [
    '待繳款',
    'bg-[#FDF0ED] text-[#C8522A]',
  ],
  partially_paid: [
    '部分已繳',
    'bg-[#FDF0ED] text-[#C8522A]',
  ],
  paid: [
    '已繳清',
    'bg-[#EEF7F0] text-[#2F6F45]',
  ],
  overdue: [
    '已逾期',
    'bg-[#FFF0F0] text-[#D93025]',
  ],
  cancelled: [
    '已取消',
    'bg-[#F8F9FA] text-[#8C8880]',
  ],
}


const KOC_STATUS = {
  pending: [
    '待撥款',
    'bg-[#F5F0E8] text-[#8A6734]',
  ],
  completed: [
    '已撥款',
    'bg-[#EEF7F0] text-[#2F6F45]',
  ],
  paid: [
    '已撥款',
    'bg-[#EEF7F0] text-[#2F6F45]',
  ],
  failed: [
    '撥款失敗',
    'bg-[#FFF0F0] text-[#D93025]',
  ],
}


function StatusBadge({
  status,
  type = 'batch',
}) {
  let map = PAYOUT_BATCH_STATUS

  if (type === 'settlement') {
    map = SETTLEMENT_STATUS
  }

  if (type === 'koc') {
    map = KOC_STATUS
  }

  const [label, style] =
    map[status] || [
      status || '未知',
      'bg-[#F8F9FA] text-[#8C8880]',
    ]

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap ${style}`}
    >
      {label}
    </span>
  )
}


// ======================================================
// 小元件
// ======================================================

function SummaryCard({
  title,
  value,
  hint,
  icon: Icon,
  emphasis = false,
}) {
  return (
    <div
      className={`rounded-[1.5rem] border p-5 ${
        emphasis
          ? 'border-[#DED6C8] bg-[#F5F0E8]'
          : 'border-[#E2DDD4] bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-wider text-[#8C8880]">
            {title}
          </p>

          <p className="mt-2 text-xl font-black text-[#1A1A18]">
            {money(value)}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            emphasis
              ? 'bg-white text-[#C8522A]'
              : 'bg-[#F5F0E8] text-[#B89B6A]'
          }`}
        >
          <Icon size={18} />
        </div>
      </div>

      {hint && (
        <p className="mt-3 text-[10px] leading-relaxed text-[#8C8880]">
          {hint}
        </p>
      )}
    </div>
  )
}


function EmptyState({ children }) {
  return (
    <div className="py-14 text-center text-xs font-bold text-[#8C8880]">
      {children}
    </div>
  )
}


function ActionButton({
  children,
  onClick,
  disabled,
  danger = false,
  primary = false,
}) {
  let style =
    'border border-[#E2DDD4] bg-white text-[#1A1A18] hover:bg-[#F5F0E8]'

  if (danger) {
    style =
      'border border-[#FFD7D2] bg-[#FFF0F0] text-[#D93025] hover:bg-[#FFE7E7]'
  }

  if (primary) {
    style =
      'border border-[#C8522A] bg-[#C8522A] text-white hover:bg-[#B44825]'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-3 py-2 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${style}`}
    >
      {children}
    </button>
  )
}


// ======================================================
// 主頁
// ======================================================

export default function AdminFinance() {
  const adminId =
    localStorage.getItem('admin_id')

  const [activeTab, setActiveTab] =
    useState('goods')

  const [selectedMonth, setSelectedMonth] =
    useState(previousMonthValue())

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState('')

  const [processingKey, setProcessingKey] =
    useState('')

  const [showInvoices, setShowInvoices] =
    useState(false)

  // 貨款
  const [readyVendors, setReadyVendors] =
    useState([])

  const [payoutBatches, setPayoutBatches] =
    useState([])

  // 服務費
  const [
    settleableVendors,
    setSettleableVendors,
  ] = useState([])

  const [settlements, setSettlements] =
    useState([])

  const [invoices, setInvoices] =
    useState([])

  // KOC
  const [kocPayouts, setKocPayouts] =
    useState([])


  // ======================================================
  // 載入
  // ======================================================

  const loadAll = useCallback(
    async (showMainLoader = true) => {
      if (!adminId) {
        setError(
          '找不到管理員登入資訊，請重新登入。'
        )
        setLoading(false)
        return
      }

      if (showMainLoader) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setError('')

      try {
        const [
          readyRes,
          batchRes,
          settleableRes,
          settlementRes,
          kocRes,
          invoiceRes,
        ] = await Promise.all([
          getMonthlyPayoutReadyVendors({
            Admin_id: adminId,
            month: selectedMonth,
          }),

          getVendorPayoutBatches({
            Admin_id: adminId,
          }),

          getSettleableVendors({
            Admin_id: adminId,
            month: selectedMonth,
          }),

          getVendorSettlements({
            Admin_id: adminId,
          }),

          getAdminKocPayouts({
            Admin_id: adminId,
            status: 'pending',
          }),

          getVendorSettlementInvoices({
            Admin_id: adminId,
          }),
        ])

        setReadyVendors(
          readyRes.data?.vendors || []
        )

        setPayoutBatches(
          batchRes.data?.batches || []
        )

        setSettleableVendors(
          Array.isArray(settleableRes.data)
            ? settleableRes.data
            : settleableRes.data?.vendors || []
        )

        setSettlements(
          normalizeSettlementList(
            settlementRes.data
          )
        )

        setKocPayouts(
          normalizeKocList(kocRes.data)
        )

        setInvoices(
          invoiceRes.data?.invoices || []
        )
      } catch (err) {
        console.error(
          'AdminFinance 載入失敗',
          err
        )

        setError(
          err.response?.data?.err ||
            '財務資料載入失敗，請稍後再試。'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [adminId, selectedMonth]
  )


  useEffect(() => {
    loadAll()
  }, [loadAll])


  // ======================================================
  // 統計
  // ======================================================

  const goodsSummary = useMemo(() => {
    let readyAmount = 0
    let pendingAmount = 0
    let paidAmount = 0
    let failedAmount = 0

    readyVendors.forEach((item) => {
      readyAmount += Number(
        item.Amount_due || 0
      )
    })

    payoutBatches.forEach((batch) => {
      const amount = Number(
        batch.Amount_due || 0
      )

      if (
        batch.Status === 'ready' ||
        batch.Status === 'draft' ||
        batch.Status === 'adjusted'
      ) {
        pendingAmount += amount
      }

      if (batch.Status === 'paid') {
        paidAmount += amount
      }

      if (batch.Status === 'failed') {
        failedAmount += amount
      }
    })

    return {
      readyAmount,
      pendingAmount,
      paidAmount,
      failedAmount,
    }
  }, [readyVendors, payoutBatches])


  const settlementSummary =
    useMemo(() => {
      let outstanding = 0
      let paid = 0
      let overdue = 0
      let waitingToGenerate = 0

      settleableVendors.forEach((item) => {
        waitingToGenerate += Number(
          item.Eligible_amount || 0
        )
      })

      settlements.forEach((item) => {
        const due = Number(
          item.Amount_due ??
            item.amount_due ??
            0
        )

        const paidValue = Number(
          item.Amount_paid ??
            item.amount_paid ??
            0
        )

        const outstandingValue = Number(
          item.Outstanding_amount ??
            item.outstanding_amount ??
            Math.max(0, due - paidValue)
        )

        const status =
          item.Status ?? item.status

        paid += paidValue

        if (
          status === 'awaiting_payment' ||
          status === 'partially_paid' ||
          status === 'overdue'
        ) {
          outstanding += outstandingValue
        }

        if (status === 'overdue') {
          overdue += outstandingValue
        }
      })

      return {
        outstanding,
        paid,
        overdue,
        waitingToGenerate,
      }
    }, [settleableVendors, settlements])


  const pendingKocAmount =
    useMemo(
      () =>
        kocPayouts.reduce(
          (sum, item) =>
            sum +
            Number(
              item.Amount ??
                item.amount ??
                0
            ),
          0
        ),
      [kocPayouts]
    )


  // ======================================================
  // 貨款月結操作
  // ======================================================

  const handleGenerateGoodsBatch =
    async (vendor) => {
      const vendorId =
        vendor.Vendor_id

      const vendorName =
        vendor.Vendor_name

      const amount =
        vendor.Amount_due

      if (
        !window.confirm(
          `確定要產生 ${vendorName} 的 ${monthLabel(
            selectedMonth
          )}貨款月結單嗎？\n\n本期應撥：${money(
            amount
          )}`
        )
      ) {
        return
      }

      const key =
        `goods-generate-${vendorId}`

      setProcessingKey(key)

      try {
        const res =
          await generateVendorPayoutBatch({
            Admin_id: adminId,
            vendor_id: vendorId,
            month: selectedMonth,
          })

        if (
          res.data?.success === false
        ) {
          throw new Error(
            res.data.err ||
              '產生貨款月結單失敗'
          )
        }

        alert(
          `${monthLabel(
            selectedMonth
          )}貨款月結單已產生。`
        )

        await loadAll(false)
      } catch (err) {
        alert(
          err.response?.data?.err ||
            err.message ||
            '產生貨款月結單失敗'
        )
      } finally {
        setProcessingKey('')
      }
    }


  const handleGenerateAllGoods =
    async () => {
      if (
        !window.confirm(
          `確定要產生 ${monthLabel(
            selectedMonth
          )}所有符合資格廠商的貨款月結單嗎？`
        )
      ) {
        return
      }

      const key =
        'goods-generate-all'

      setProcessingKey(key)

      try {
        const res =
          await generateVendorPayoutBatch({
            Admin_id: adminId,
            month: selectedMonth,
          })

        if (
          res.data?.success === false
        ) {
          throw new Error(
            res.data.err ||
              '批次產生貨款月結單失敗'
          )
        }

        const batches =
          res.data?.batches || []

        const successCount =
          batches.filter(
            (item) =>
              !item.skipped &&
              !item.already_existed
          ).length

        alert(
          `已產生 ${successCount} 張貨款月結單。`
        )

        await loadAll(false)
      } catch (err) {
        alert(
          err.response?.data?.err ||
            err.message ||
            '批次產生貨款月結單失敗'
        )
      } finally {
        setProcessingKey('')
      }
    }


  const handleConfirmGoodsBatch =
    async (batch, newStatus) => {
      const batchId =
        batch.Batch_id

      const vendorName =
        batch.Vendor_name

      const amount =
        batch.Amount_due

      const success =
        newStatus === 'completed'

      const message = success
        ? `確定已將 ${money(
            amount
          )} 匯給 ${vendorName} 嗎？`
        : `確定要將 ${vendorName} 的這期貨款標記為撥款失敗嗎？`

      if (!window.confirm(message)) {
        return
      }

      let reference = ''

      if (success) {
        reference =
          window.prompt(
            '可輸入銀行交易編號／匯款備註（可留空）',
            ''
          ) || ''
      }

      const key =
        `goods-confirm-${batchId}`

      setProcessingKey(key)

      try {
        const res =
          await confirmVendorPayoutBatch({
            Admin_id: adminId,
            batch_id: batchId,
            status: newStatus,
            transaction_reference:
              reference,
          })

        if (
          res.data?.success === false
        ) {
          throw new Error(
            res.data.err ||
              '處理貨款月結失敗'
          )
        }

        await loadAll(false)
      } catch (err) {
        alert(
          err.response?.data?.err ||
            err.message ||
            '處理貨款月結失敗'
        )
      } finally {
        setProcessingKey('')
      }
    }


  // ======================================================
  // 服務費月結操作
  // ======================================================

  const handleGenerateSettlement =
    async (vendor) => {
      const vendorId =
        vendor.Vendor_id

      const vendorName =
        vendor.Vendor_name

      const serviceFee =
        vendor.Eligible_amount

      if (
        !window.confirm(
          `確定要產生 ${vendorName} 的 ${monthLabel(
            selectedMonth
          )}服務費月結單嗎？\n\n15% 服務費：${money(
            serviceFee
          )}`
        )
      ) {
        return
      }

      const key =
        `settlement-generate-${vendorId}`

      setProcessingKey(key)

      try {
        const res =
          await generateVendorSettlement({
            Admin_id: adminId,
            vendor_id: vendorId,
            month: selectedMonth,
          })

        if (
          res.data?.success === false
        ) {
          throw new Error(
            res.data.err ||
              '產生服務費月結單失敗'
          )
        }

        alert(
          `${monthLabel(
            selectedMonth
          )}服務費月結單已產生。`
        )

        await loadAll(false)
      } catch (err) {
        alert(
          err.response?.data?.err ||
            err.message ||
            '產生服務費月結單失敗'
        )
      } finally {
        setProcessingKey('')
      }
    }


  const handleGenerateAllSettlements =
    async () => {
      if (
        !window.confirm(
          `確定要產生 ${monthLabel(
            selectedMonth
          )}所有符合資格廠商的服務費月結單嗎？`
        )
      ) {
        return
      }

      const key =
        'settlement-generate-all'

      setProcessingKey(key)

      try {
        const res =
          await generateVendorSettlement({
            Admin_id: adminId,
            month: selectedMonth,
          })

        if (
          res.data?.success === false
        ) {
          throw new Error(
            res.data.err ||
              '批次產生服務費月結單失敗'
          )
        }

        alert(
          `已完成 ${monthLabel(
            selectedMonth
          )}服務費月結。`
        )

        await loadAll(false)
      } catch (err) {
        alert(
          err.response?.data?.err ||
            err.message ||
            '批次產生服務費月結單失敗'
        )
      } finally {
        setProcessingKey('')
      }
    }


  const handleConfirmSettlement =
    async (settlement) => {
      const settlementId =
        settlement.Settlement_id ??
        settlement.settlement_id

      const vendorName =
        settlement.Vendor_name ??
        settlement.vendor_name ??
        '廠商'

      const outstanding =
        settlement.Outstanding_amount ??
        settlement.outstanding_amount ??
        settlement.Amount_due ??
        settlement.amount_due ??
        0

      if (
        !window.confirm(
          `確定平台已收到 ${vendorName} 的服務費 ${money(
            outstanding
          )} 嗎？\n\n確認後，對應 KOC 分潤才會釋放。`
        )
      ) {
        return
      }

      const reference =
        window.prompt(
          '可輸入轉帳交易編號／收款備註（可留空）',
          ''
        ) || ''

      const key =
        `settlement-confirm-${settlementId}`

      setProcessingKey(key)

      try {
        const res =
          await confirmVendorSettlementPayment({
            Admin_id: adminId,
            settlement_id:
              settlementId,
            status: 'completed',
            amount: outstanding,
            payment_method:
              'bank_transfer',
            reference_no: reference,
          })

        if (
          res.data?.success === false
        ) {
          throw new Error(
            res.data.err ||
              '確認服務費失敗'
          )
        }

        alert(
          '已確認收到平台服務費。'
        )

        await loadAll(false)
      } catch (err) {
        alert(
          err.response?.data?.err ||
            err.message ||
            '確認廠商服務費失敗'
        )
      } finally {
        setProcessingKey('')
      }
    }


  // ======================================================
  // KOC
  // ======================================================

  const handleConfirmKocPayout =
    async (payout, newStatus) => {
      const payoutId =
        payout.Payout_id ??
        payout.payout_id

      const amount =
        payout.Amount ??
        payout.amount ??
        0

      const complete =
        newStatus === 'completed'

      if (
        !window.confirm(
          complete
            ? `確定已完成這筆 KOC 匯款 ${money(
                amount
              )} 嗎？`
            : '確定要把這筆 KOC 撥款標記為失敗嗎？'
        )
      ) {
        return
      }

      const key =
        `koc-${payoutId}`

      setProcessingKey(key)

      try {
        const res =
          await confirmAdminKocPayout({
            Admin_id: adminId,
            payout_id: payoutId,
            status: newStatus,
          })

        if (
          res.data?.success === false
        ) {
          throw new Error(
            res.data.err ||
              'KOC 撥款處理失敗'
          )
        }

        await loadAll(false)
      } catch (err) {
        alert(
          err.response?.data?.err ||
            err.message ||
            'KOC 撥款處理失敗'
        )
      } finally {
        setProcessingKey('')
      }
    }


  const handleExportKoc = async () => {
    try {
      const res =
        await exportKocPayoutTransfers({
          Admin_id: adminId,
          status: 'pending',
        })

      const blob =
        new Blob([res.data], {
          type: 'text/csv;charset=utf-8;',
        })

      const url =
        window.URL.createObjectURL(blob)

      const link =
        document.createElement('a')

      link.href = url

      link.download =
        `koc_payouts_${new Date()
          .toISOString()
          .slice(0, 10)}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(
        err.response?.data?.err ||
          '匯出 KOC 撥款 CSV 失敗'
      )
    }
  }


  // ======================================================
  // Tabs
  // ======================================================

  const tabs = [
    {
      key: 'goods',
      label: '廠商貨款',
      icon: ArrowDownToLine,
    },
    {
      key: 'settlement',
      label: '廠商服務費',
      icon: ArrowUpFromLine,
    },
    {
      key: 'koc',
      label: 'KOC 分潤',
      icon: Banknote,
    },
  ]


  // ======================================================
  // Loading
  // ======================================================

  if (loading) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center gap-3 text-[#8C8880]">
        <Loader2
          size={28}
          className="animate-spin text-[#C8522A]"
        />

        <p className="text-sm font-bold">
          財務資料載入中...
        </p>
      </div>
    )
  }


  // ======================================================
  // UI
  // ======================================================

  return (
    <div className="space-y-6 animate-in fade-in duration-300 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-serif font-black text-[#1A1A18] sm:text-2xl">
            平台財務管理
          </h1>

          <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-[#8C8880] sm:text-xs">
            廠商貨款與平台服務費採兩筆獨立月結金流。ShareBuy
            依月結單全額撥付貨款給廠商；廠商另外依有效成交額支付
            15% 平台服務費。KOC 5% 分潤由 ShareBuy
            從平台服務費收入中負擔。
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadAll(false)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2DDD4] bg-white px-4 py-2.5 text-xs font-bold text-[#1A1A18] hover:bg-[#F5F0E8] disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={
              refreshing
                ? 'animate-spin'
                : ''
            }
          />

          更新資料
        </button>
      </div>


      {/* 錯誤 */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#FFD7D2] bg-[#FFF0F0] p-4 text-xs text-[#D93025]">
          <AlertCircle
            size={18}
            className="shrink-0"
          />

          <p className="font-bold">
            {error}
          </p>
        </div>
      )}


      {/* 全站財務摘要 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="待撥廠商貨款"
          value={
            goodsSummary.pendingAmount
          }
          hint="已產生月結單、平台尚未完成撥款"
          icon={ArrowDownToLine}
          emphasis
        />

        <SummaryCard
          title="廠商待繳服務費"
          value={
            settlementSummary.outstanding
          }
          hint="已產生服務費月結單、尚未繳清"
          icon={ReceiptText}
        />

        <SummaryCard
          title="待撥 KOC 分潤"
          value={pendingKocAmount}
          hint={`${kocPayouts.length} 筆待處理`}
          icon={Banknote}
        />

        <SummaryCard
          title="累計已撥廠商貨款"
          value={
            goodsSummary.paidAmount
          }
          hint="平台已完成的貨款月結撥款"
          icon={CheckCircle2}
        />
      </div>


      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#E2DDD4] pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() =>
                setActiveTab(tab.key)
              }
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#F5F0E8] text-[#1A1A18]'
                  : 'text-[#8C8880] hover:bg-[#F8F9FA] hover:text-[#1A1A18]'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>


      {/* ==================================================
          廠商貨款
      ================================================== */}
      {activeTab === 'goods' && (
        <section className="space-y-5">
          {/* 月份工具列 */}
          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[#E2DDD4] bg-white p-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-[#8C8880]">
                月結月份
              </p>

              <input
                type="month"
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(
                    event.target.value
                  )
                }
                className="mt-2 rounded-xl border border-[#E2DDD4] bg-white px-3 py-2 text-sm font-bold text-[#1A1A18] outline-none focus:border-[#B89B6A]"
              />
            </div>

            <div className="text-[10px] leading-relaxed text-[#8C8880] sm:text-right">
              <p>
                本期：
                <span className="font-bold text-[#1A1A18]">
                  {monthLabel(
                    selectedMonth
                  )}
                </span>
              </p>

              <p>
                只納入該月份取得結算資格的訂單。
              </p>
            </div>
          </div>


          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title={`${monthLabel(
                selectedMonth
              )}待產生月結`}
              value={
                goodsSummary.readyAmount
              }
              hint={`${readyVendors.length} 個廠商`}
              icon={Clock3}
            />

            <SummaryCard
              title="已產生待撥貨款"
              value={
                goodsSummary.pendingAmount
              }
              hint="已建立貨款月結單"
              icon={ArrowDownToLine}
              emphasis
            />

            <SummaryCard
              title="累計已撥貨款"
              value={
                goodsSummary.paidAmount
              }
              hint="所有月份累計"
              icon={CheckCircle2}
            />

            <SummaryCard
              title="撥款異常"
              value={
                goodsSummary.failedAmount
              }
              hint="需要重新確認銀行撥款"
              icon={XCircle}
            />
          </div>


          {/* 待產生貨款月結 */}
          <div className="overflow-hidden rounded-[1.5rem] border border-[#E2DDD4] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#E2DDD4] bg-[#F8F9FA] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-black text-[#1A1A18]">
                  待產生貨款月結
                </h2>

                <p className="mt-1 text-[10px] text-[#8C8880]">
                  {monthLabel(
                    selectedMonth
                  )}符合資格、尚未加入月結單的貨款。
                </p>
              </div>

              {readyVendors.length >
                0 && (
                <ActionButton
                  primary
                  disabled={
                    processingKey ===
                    'goods-generate-all'
                  }
                  onClick={
                    handleGenerateAllGoods
                  }
                >
                  {processingKey ===
                  'goods-generate-all'
                    ? '產生中...'
                    : '全部產生月結'}
                </ActionButton>
              )}
            </div>

            {readyVendors.length === 0 ? (
              <EmptyState>
                目前沒有符合此月份貨款月結資格的廠商
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="border-b border-[#E2DDD4] bg-white">
                    <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                      <th className="px-5 py-3">
                        廠商
                      </th>

                      <th className="px-5 py-3">
                        訂單數
                      </th>

                      <th className="px-5 py-3">
                        本期貨款
                      </th>

                      <th className="px-5 py-3">
                        收款帳戶
                      </th>

                      <th className="px-5 py-3">
                        操作
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E2DDD4]">
                    {readyVendors.map(
                      (vendor) => (
                        <tr
                          key={
                            vendor.Vendor_id
                          }
                        >
                          <td className="px-5 py-4">
                            <p className="text-xs font-black text-[#1A1A18]">
                              {
                                vendor.Vendor_name
                              }
                            </p>

                            <p className="mt-1 text-[10px] text-[#8C8880]">
                              {
                                vendor.Vendor_id
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">
                            {
                              vendor.Receivable_count
                            }
                          </td>

                          <td className="px-5 py-4 text-xs font-black text-[#C8522A]">
                            {money(
                              vendor.Amount_due
                            )}
                          </td>

                          <td className="px-5 py-4 text-[10px] text-[#8C8880]">
                            {vendor.Has_bank_account ? (
                              <>
                                <p className="font-bold text-[#1A1A18]">
                                  {
                                    vendor.Bank_code
                                  }{' '}
                                  ****
                                  {
                                    vendor.Bank_account_last4
                                  }
                                </p>

                                <p className="mt-1">
                                  {
                                    vendor.Bank_account_name
                                  }
                                </p>
                              </>
                            ) : (
                              <span className="font-bold text-[#D93025]">
                                尚未設定銀行帳戶
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <ActionButton
                              disabled={
                                !vendor.Has_bank_account ||
                                processingKey ===
                                  `goods-generate-${vendor.Vendor_id}`
                              }
                              onClick={() =>
                                handleGenerateGoodsBatch(
                                  vendor
                                )
                              }
                            >
                              {processingKey ===
                              `goods-generate-${vendor.Vendor_id}`
                                ? '產生中...'
                                : '產生月結單'}
                            </ActionButton>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>


          {/* 已產生貨款月結 */}
          <div className="overflow-hidden rounded-[1.5rem] border border-[#E2DDD4] bg-white">
            <div className="border-b border-[#E2DDD4] bg-[#F8F9FA] px-5 py-4">
              <h2 className="text-sm font-black text-[#1A1A18]">
                貨款月結紀錄
              </h2>

              <p className="mt-1 text-[10px] text-[#8C8880]">
                每個廠商每個月份一張貨款月結單。
              </p>
            </div>

            {payoutBatches.length ===
            0 ? (
              <EmptyState>
                尚無貨款月結紀錄
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead className="border-b border-[#E2DDD4]">
                    <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                      <th className="px-5 py-3">
                        月份
                      </th>

                      <th className="px-5 py-3">
                        廠商
                      </th>

                      <th className="px-5 py-3">
                        訂單數
                      </th>

                      <th className="px-5 py-3">
                        應撥貨款
                      </th>

                      <th className="px-5 py-3">
                        預計撥款日
                      </th>

                      <th className="px-5 py-3">
                        收款帳戶
                      </th>

                      <th className="px-5 py-3">
                        狀態
                      </th>

                      <th className="px-5 py-3">
                        操作
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E2DDD4]">
                    {payoutBatches.map(
                      (batch) => (
                        <tr
                          key={
                            batch.Batch_id
                          }
                        >
                          <td className="px-5 py-4 text-xs font-black text-[#1A1A18]">
                            {monthLabel(
                              batch.Month
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-xs font-black text-[#1A1A18]">
                              {
                                batch.Vendor_name
                              }
                            </p>

                            <p className="mt-1 text-[10px] text-[#8C8880]">
                              {
                                batch.Vendor_id
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">
                            {
                              batch.Receivable_count
                            }
                          </td>

                          <td className="px-5 py-4 text-xs font-black text-[#1A1A18]">
                            {money(
                              batch.Amount_due
                            )}
                          </td>

                          <td className="px-5 py-4 text-[10px] text-[#8C8880]">
                            {dateText(
                              batch.Scheduled_payout_date
                            )}
                          </td>

                          <td className="px-5 py-4 text-[10px] text-[#8C8880]">
                            <p className="font-bold text-[#1A1A18]">
                              {
                                batch.Bank_code
                              }{' '}
                              ****
                              {
                                batch.Bank_account_last4
                              }
                            </p>

                            <p className="mt-1">
                              {
                                batch.Bank_account_name
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                batch.Status
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            {batch.Status ===
                            'ready' ? (
                              <div className="flex flex-wrap gap-2">
                                <ActionButton
                                  primary
                                  disabled={
                                    processingKey ===
                                    `goods-confirm-${batch.Batch_id}`
                                  }
                                  onClick={() =>
                                    handleConfirmGoodsBatch(
                                      batch,
                                      'completed'
                                    )
                                  }
                                >
                                  確認已匯款
                                </ActionButton>

                                <ActionButton
                                  danger
                                  disabled={
                                    processingKey ===
                                    `goods-confirm-${batch.Batch_id}`
                                  }
                                  onClick={() =>
                                    handleConfirmGoodsBatch(
                                      batch,
                                      'failed'
                                    )
                                  }
                                >
                                  匯款失敗
                                </ActionButton>
                              </div>
                            ) : batch.Status ===
                              'failed' ? (
                              <ActionButton
                                primary
                                disabled={
                                  processingKey ===
                                  `goods-confirm-${batch.Batch_id}`
                                }
                                onClick={() =>
                                  handleConfirmGoodsBatch(
                                    batch,
                                    'completed'
                                  )
                                }
                              >
                                重新確認匯款
                              </ActionButton>
                            ) : (
                              <span className="text-[10px] text-[#8C8880]">
                                {batch.Transaction_reference
                                  ? `交易編號：${batch.Transaction_reference}`
                                  : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}


      {/* ==================================================
          廠商服務費
      ================================================== */}
      {activeTab ===
        'settlement' && (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[#E2DDD4] bg-white p-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-[#8C8880]">
                月結月份
              </p>

              <input
                type="month"
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(
                    event.target.value
                  )
                }
                className="mt-2 rounded-xl border border-[#E2DDD4] bg-white px-3 py-2 text-sm font-bold text-[#1A1A18] outline-none focus:border-[#B89B6A]"
              />
            </div>

            <div className="text-[10px] leading-relaxed text-[#8C8880] sm:text-right">
              <p>
                本期：
                <span className="font-bold text-[#1A1A18]">
                  {monthLabel(
                    selectedMonth
                  )}
                </span>
              </p>

              <p>
                平台服務費固定為有效成交額的 15%。
              </p>
            </div>
          </div>


          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="廠商尚待繳服務費"
              value={
                settlementSummary.outstanding
              }
              hint="已產生月結單、尚未繳清"
              icon={ReceiptText}
              emphasis
            />

            <SummaryCard
              title="待產生月結服務費"
              value={
                settlementSummary.waitingToGenerate
              }
              hint={`${settleableVendors.length} 個廠商`}
              icon={Clock3}
            />

            <SummaryCard
              title="累計已收服務費"
              value={
                settlementSummary.paid
              }
              hint="平台已確認收款"
              icon={CheckCircle2}
            />

            <SummaryCard
              title="逾期未繳"
              value={
                settlementSummary.overdue
              }
              hint="需後續追蹤"
              icon={AlertCircle}
            />
          </div>


          {/* 待產生服務費月結 */}
          <div className="overflow-hidden rounded-[1.5rem] border border-[#E2DDD4] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#E2DDD4] bg-[#F8F9FA] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-black text-[#1A1A18]">
                  待產生服務費月結
                </h2>

                <p className="mt-1 text-[10px] text-[#8C8880]">
                  {monthLabel(
                    selectedMonth
                  )}已取得結算資格的 15% 平台服務費。
                </p>
              </div>

              {settleableVendors.length >
                0 && (
                <ActionButton
                  primary
                  disabled={
                    processingKey ===
                    'settlement-generate-all'
                  }
                  onClick={
                    handleGenerateAllSettlements
                  }
                >
                  {processingKey ===
                  'settlement-generate-all'
                    ? '產生中...'
                    : '全部產生月結'}
                </ActionButton>
              )}
            </div>

            {settleableVendors.length ===
            0 ? (
              <EmptyState>
                目前沒有符合此月份服務費月結資格的廠商
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="border-b border-[#E2DDD4]">
                    <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                      <th className="px-5 py-3">
                        廠商
                      </th>

                      <th className="px-5 py-3">
                        訂單數
                      </th>

                      <th className="px-5 py-3">
                        有效成交額
                      </th>

                      <th className="px-5 py-3">
                        15% 服務費
                      </th>

                      <th className="px-5 py-3">
                        操作
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E2DDD4]">
                    {settleableVendors.map(
                      (vendor) => (
                        <tr
                          key={
                            vendor.Vendor_id
                          }
                        >
                          <td className="px-5 py-4">
                            <p className="text-xs font-black text-[#1A1A18]">
                              {
                                vendor.Vendor_name
                              }
                            </p>

                            <p className="mt-1 text-[10px] text-[#8C8880]">
                              {
                                vendor.Vendor_id
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">
                            {
                              vendor.Eligible_count
                            }
                          </td>

                          <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">
                            {money(
                              vendor.Eligible_sales
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs font-black text-[#C8522A]">
                            {money(
                              vendor.Eligible_amount
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <ActionButton
                              disabled={
                                processingKey ===
                                `settlement-generate-${vendor.Vendor_id}`
                              }
                              onClick={() =>
                                handleGenerateSettlement(
                                  vendor
                                )
                              }
                            >
                              {processingKey ===
                              `settlement-generate-${vendor.Vendor_id}`
                                ? '產生中...'
                                : '產生月結單'}
                            </ActionButton>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>


          {/* 服務費月結紀錄 */}
          <div className="overflow-hidden rounded-[1.5rem] border border-[#E2DDD4] bg-white">
            <div className="border-b border-[#E2DDD4] bg-[#F8F9FA] px-5 py-4">
              <h2 className="text-sm font-black text-[#1A1A18]">
                服務費月結紀錄
              </h2>

              <p className="mt-1 text-[10px] text-[#8C8880]">
                Vendor → ShareBuy 的 15% 平台服務費。
              </p>
            </div>

            {settlements.length === 0 ? (
              <EmptyState>
                尚無服務費月結紀錄
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead className="border-b border-[#E2DDD4]">
                    <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                      <th className="px-5 py-3">
                        月份
                      </th>

                      <th className="px-5 py-3">
                        廠商
                      </th>

                      <th className="px-5 py-3">
                        有效成交額
                      </th>

                      <th className="px-5 py-3">
                        應繳服務費
                      </th>

                      <th className="px-5 py-3">
                        已繳
                      </th>

                      <th className="px-5 py-3">
                        到期日
                      </th>

                      <th className="px-5 py-3">
                        狀態
                      </th>

                      <th className="px-5 py-3">
                        操作
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E2DDD4]">
                    {settlements.map(
                      (item) => {
                        const settlementId =
                          item.Settlement_id ??
                          item.settlement_id

                        const status =
                          item.Status ??
                          item.status

                        const vendorName =
                          item.Vendor_name ??
                          item.vendor_name ??
                          '—'

                        const vendorId =
                          item.Vendor_id ??
                          item.vendor_id ??
                          ''

                        const periodStart =
                          item.Period_start ??
                          item.period_start

                        const month =
                          item.Month ??
                          item.month ??
                          (periodStart
                            ? String(
                                periodStart
                              ).slice(0, 7)
                            : '')

                        const grossSales =
                          item.Gross_sales ??
                          item.gross_sales ??
                          0

                        const amountDue =
                          item.Amount_due ??
                          item.amount_due ??
                          0

                        const amountPaid =
                          item.Amount_paid ??
                          item.amount_paid ??
                          0

                        const dueDate =
                          item.Due_date ??
                          item.due_date

                        return (
                          <tr
                            key={
                              settlementId
                            }
                          >
                            <td className="px-5 py-4 text-xs font-black text-[#1A1A18]">
                              {monthLabel(
                                month
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-xs font-black text-[#1A1A18]">
                                {
                                  vendorName
                                }
                              </p>

                              <p className="mt-1 text-[10px] text-[#8C8880]">
                                {
                                  vendorId
                                }
                              </p>
                            </td>

                            <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">
                              {money(
                                grossSales
                              )}
                            </td>

                            <td className="px-5 py-4 text-xs font-black text-[#C8522A]">
                              {money(
                                amountDue
                              )}
                            </td>

                            <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">
                              {money(
                                amountPaid
                              )}
                            </td>

                            <td className="px-5 py-4 text-[10px] text-[#8C8880]">
                              {dateText(
                                dueDate
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge
                                status={
                                  status
                                }
                                type="settlement"
                              />
                            </td>

                            <td className="px-5 py-4">
                              {[
                                'awaiting_payment',
                                'partially_paid',
                                'overdue',
                              ].includes(
                                status
                              ) ? (
                                <ActionButton
                                  primary
                                  disabled={
                                    processingKey ===
                                    `settlement-confirm-${settlementId}`
                                  }
                                  onClick={() =>
                                    handleConfirmSettlement(
                                      item
                                    )
                                  }
                                >
                                  確認已收款
                                </ActionButton>
                              ) : (
                                <span className="text-[10px] text-[#8C8880]">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>


          {/* 服務費發票 */}
          <div className="overflow-hidden rounded-[1.5rem] border border-[#E2DDD4] bg-white">
            <button
              type="button"
              onClick={() =>
                setShowInvoices(
                  (value) => !value
                )
              }
              className="flex w-full items-center justify-between gap-3 bg-[#F8F9FA] px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#B89B6A]">
                  <FileText size={17} />
                </div>

                <div>
                  <p className="text-sm font-black text-[#1A1A18]">
                    服務費發票
                  </p>

                  <p className="mt-1 text-[10px] text-[#8C8880]">
                    ShareBuy 開給 Vendor 的平台服務費發票
                  </p>
                </div>
              </div>

              {showInvoices ? (
                <ChevronUp
                  size={17}
                  className="text-[#8C8880]"
                />
              ) : (
                <ChevronDown
                  size={17}
                  className="text-[#8C8880]"
                />
              )}
            </button>

            {showInvoices && (
              <>
                {invoices.length === 0 ? (
                  <EmptyState>
                    尚無服務費發票紀錄
                  </EmptyState>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px]">
                      <thead className="border-t border-b border-[#E2DDD4]">
                        <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                          <th className="px-5 py-3">
                            廠商
                          </th>

                          <th className="px-5 py-3">
                            結算單
                          </th>

                          <th className="px-5 py-3">
                            未稅服務費
                          </th>

                          <th className="px-5 py-3">
                            稅額
                          </th>

                          <th className="px-5 py-3">
                            發票總額
                          </th>

                          <th className="px-5 py-3">
                            發票號碼
                          </th>

                          <th className="px-5 py-3">
                            狀態
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#E2DDD4]">
                        {invoices.map(
                          (invoice) => (
                            <tr
                              key={
                                invoice.invoice_id
                              }
                            >
                              <td className="px-5 py-4">
                                <p className="text-xs font-black text-[#1A1A18]">
                                  {
                                    invoice.vendor_name
                                  }
                                </p>

                                <p className="mt-1 text-[10px] text-[#8C8880]">
                                  {
                                    invoice.vendor_id
                                  }
                                </p>
                              </td>

                              <td className="px-5 py-4 text-[10px] text-[#8C8880]">
                                {invoice.settlement_id
                                  ? `#${invoice.settlement_id}`
                                  : '—'}
                              </td>

                              <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">
                                {money(
                                  invoice.service_fee
                                )}
                              </td>

                              <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">
                                {money(
                                  invoice.tax_amount
                                )}
                              </td>

                              <td className="px-5 py-4 text-xs font-black text-[#1A1A18]">
                                {money(
                                  invoice.total_amount
                                )}
                              </td>

                              <td className="px-5 py-4 text-[10px] text-[#8C8880]">
                                {
                                  invoice.invoice_number ||
                                  '—'
                                }
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                    invoice.status ===
                                    'issued'
                                      ? 'bg-[#EEF7F0] text-[#2F6F45]'
                                      : invoice.status ===
                                        'failed'
                                      ? 'bg-[#FFF0F0] text-[#D93025]'
                                      : 'bg-[#F5F0E8] text-[#8A6734]'
                                  }`}
                                >
                                  {invoice.status ===
                                  'issued'
                                    ? '已開立'
                                    : invoice.status ===
                                      'failed'
                                    ? '開立失敗'
                                    : '待開立'}
                                </span>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}


      {/* ==================================================
          KOC 分潤
      ================================================== */}
      {activeTab === 'koc' && (
        <section className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryCard
              title="待撥 KOC 分潤"
              value={pendingKocAmount}
              hint={`${kocPayouts.length} 筆待處理`}
              icon={Banknote}
              emphasis
            />

            <SummaryCard
              title="撥款原則"
              value={0}
              hint="Vendor 15% 服務費確認入帳後，對應 KOC 5% 分潤才會進入可撥款流程。"
              icon={CheckCircle2}
            />
          </div>


          <div className="overflow-hidden rounded-[1.5rem] border border-[#E2DDD4] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#E2DDD4] bg-[#F8F9FA] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-black text-[#1A1A18]">
                  KOC 待撥款
                </h2>

                <p className="mt-1 text-[10px] text-[#8C8880]">
                  平台確認服務費入帳後，才能處理對應分潤。
                </p>
              </div>

              <ActionButton
                onClick={handleExportKoc}
                disabled={
                  kocPayouts.length === 0
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  <Download size={13} />
                  匯出 CSV
                </span>
              </ActionButton>
            </div>

            {kocPayouts.length === 0 ? (
              <EmptyState>
                目前沒有待撥的 KOC 分潤
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px]">
                  <thead className="border-b border-[#E2DDD4]">
                    <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                      <th className="px-5 py-3">
                        KOC
                      </th>

                      <th className="px-5 py-3">
                        銀行帳戶
                      </th>

                      <th className="px-5 py-3">
                        撥款金額
                      </th>

                      <th className="px-5 py-3">
                        申請日期
                      </th>

                      <th className="px-5 py-3">
                        狀態
                      </th>

                      <th className="px-5 py-3">
                        操作
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E2DDD4]">
                    {kocPayouts.map(
                      (payout) => {
                        const payoutId =
                          payout.Payout_id ??
                          payout.payout_id

                        const name =
                          payout.Koc_name ??
                          payout.koc_name ??
                          '—'

                        const userId =
                          payout.Koc_user_id ??
                          payout.koc_user_id ??
                          ''

                        const bank =
                          payout.Bank_display ??
                          payout.bank_display ??
                          '—'

                        const amount =
                          payout.Amount ??
                          payout.amount ??
                          0

                        const date =
                          payout.Payout_date ??
                          payout.payout_date

                        const status =
                          payout.Status ??
                          payout.status ??
                          'pending'

                        return (
                          <tr
                            key={payoutId}
                          >
                            <td className="px-5 py-4">
                              <p className="text-xs font-black text-[#1A1A18]">
                                {name}
                              </p>

                              <p className="mt-1 text-[10px] text-[#8C8880]">
                                {userId}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-[10px] text-[#8C8880]">
                              {bank}
                            </td>

                            <td className="px-5 py-4 text-xs font-black text-[#1A1A18]">
                              {money(
                                amount
                              )}
                            </td>

                            <td className="px-5 py-4 text-[10px] text-[#8C8880]">
                              {dateText(
                                date
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge
                                status={
                                  status
                                }
                                type="koc"
                              />
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-2">
                                <ActionButton
                                  primary
                                  disabled={
                                    processingKey ===
                                    `koc-${payoutId}`
                                  }
                                  onClick={() =>
                                    handleConfirmKocPayout(
                                      payout,
                                      'completed'
                                    )
                                  }
                                >
                                  確認已匯款
                                </ActionButton>

                                <ActionButton
                                  danger
                                  disabled={
                                    processingKey ===
                                    `koc-${payoutId}`
                                  }
                                  onClick={() =>
                                    handleConfirmKocPayout(
                                      payout,
                                      'failed'
                                    )
                                  }
                                >
                                  匯款失敗
                                </ActionButton>
                              </div>
                            </td>
                          </tr>
                        )
                      }
                    )}
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
