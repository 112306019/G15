import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Landmark,
  Loader2,
  ReceiptText,
  WalletCards,
  X,
} from 'lucide-react'

import { useToast } from './components/ui/Toast'

import {
  getVendorReceivableOverview,
  getVendorReceivables,
  getVendorSettlementOverview,
  getVendorSettlements,
  reportVendorSettlementPayment,
} from '../api/vendor'


const money = value =>
  `NT$ ${Number(value || 0).toLocaleString(
    'zh-TW',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`


const dateText = value => {
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


const dateTimeText = value => {
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


const monthLabel = value => {
  if (!value) return '—'

  const [year, month] =
    String(value).split('-')

  if (!year || !month) {
    return String(value)
  }

  return `${year} 年 ${Number(month)} 月`
}


const BATCH_STATUS = {
  draft: {
    label: '月結建立中',
    style:
      'bg-[#F8F9FA] text-[#8C8880]',
  },

  ready: {
    label: '待撥款',
    style:
      'bg-[#F5F0E8] text-[#8A6734]',
  },

  paid: {
    label: '已撥款',
    style:
      'bg-[#EEF7F0] text-[#2F6F45]',
  },

  failed: {
    label: '撥款失敗',
    style:
      'bg-[#FFF0F0] text-[#D93025]',
  },

  cancelled: {
    label: '已取消',
    style:
      'bg-[#F8F9FA] text-[#8C8880]',
  },

  adjusted: {
    label: '已調整',
    style:
      'bg-[#F8F9FA] text-[#8C8880]',
  },
}


const RECEIVABLE_STATUS = {
  pending: {
    label: '等待結算資格',
    style:
      'bg-white border border-[#E2DDD4] text-[#8C8880]',
  },

  eligible: {
    label: '等待月結',
    style:
      'bg-[#F5F0E8] text-[#8A6734]',
  },

  included: {
    label: '已納入月結',
    style:
      'bg-[#FDF0ED] text-[#C8522A]',
  },

  paid: {
    label: '已撥款',
    style:
      'bg-[#EEF7F0] text-[#2F6F45]',
  },

  refunded: {
    label: '已退款',
    style:
      'bg-[#FFF0F0] text-[#D93025]',
  },

  cancelled: {
    label: '已取消',
    style:
      'bg-[#F8F9FA] text-[#8C8880]',
  },

  adjusted: {
    label: '已調整',
    style:
      'bg-[#F8F9FA] text-[#8C8880]',
  },
}


const SETTLEMENT_STATUS = {
  draft: {
    label: '月結建立中',
    style:
      'bg-[#F8F9FA] text-[#8C8880]',
  },

  awaiting_payment: {
    label: '待付款',
    style:
      'bg-[#FDF0ED] text-[#C8522A]',
  },

  partially_paid: {
    label: '部分已繳',
    style:
      'bg-[#FDF0ED] text-[#C8522A]',
  },

  paid: {
    label: '已繳清',
    style:
      'bg-[#EEF7F0] text-[#2F6F45]',
  },

  overdue: {
    label: '已逾期',
    style:
      'bg-[#FFF0F0] text-[#D93025]',
  },

  cancelled: {
    label: '已取消',
    style:
      'bg-[#F8F9FA] text-[#8C8880]',
  },
}


function Badge({
  status,
  type = 'batch',
}) {
  let map = BATCH_STATUS

  if (type === 'receivable') {
    map = RECEIVABLE_STATUS
  }

  if (type === 'settlement') {
    map = SETTLEMENT_STATUS
  }

  const config =
    map[status] || {
      label: status || '未知',
      style:
        'bg-[#F8F9FA] text-[#8C8880]',
    }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap ${config.style}`}
    >
      {config.label}
    </span>
  )
}


function SummaryCard({
  label,
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
          <p className="text-[10px] font-bold tracking-wider text-[#8C8880] sm:text-xs">
            {label}
          </p>

          <p className="mt-2 text-xl font-black text-[#1A1A18] sm:text-2xl">
            {money(value)}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            emphasis
              ? 'bg-white text-[#C8522A]'
              : 'bg-[#F5F0E8] text-[#B89B6A]'
          }`}
        >
          <Icon size={18} />
        </div>
      </div>

      {hint && (
        <p className="mt-3 text-[10px] leading-relaxed text-[#8C8880] sm:text-[11px]">
          {hint}
        </p>
      )}
    </div>
  )
}


function SectionTitle({
  icon: Icon,
  title,
  description,
  direction,
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F0E8] text-[#C8522A]">
          <Icon size={18} />
        </div>

        <div>
          <h2 className="text-base font-serif font-black text-[#1A1A18] sm:text-lg">
            {title}
          </h2>

          <p className="mt-1 text-[11px] leading-relaxed text-[#8C8880] sm:text-xs">
            {description}
          </p>
        </div>
      </div>

      {direction && (
        <span className="inline-flex self-start rounded-full border border-[#E2DDD4] bg-[#F8F9FA] px-3 py-1.5 text-[10px] font-bold text-[#8C8880]">
          {direction}
        </span>
      )}
    </div>
  )
}


function EmptyState({ text }) {
  return (
    <div className="py-12 text-center text-xs font-bold text-[#8C8880] sm:text-sm">
      {text}
    </div>
  )
}


export default function Finance() {
  const { toast } = useToast()

  const vendorId =
    localStorage.getItem('vendor_id')

  const [loading, setLoading] =
    useState(true)

  const [
    receivableOverview,
    setReceivableOverview,
  ] = useState({
    pending_goods_amount: 0,
    eligible_goods_amount: 0,
    payout_pending_amount: 0,
    paid_goods_amount: 0,

    latest_batch_month: null,
    latest_batch_status: null,
    latest_batch_amount: 0,
    latest_scheduled_payout_date: null,

    hasBankAccount: false,
    bank_display: '未設定',
    bank_account_name: '',
  })

  const [
    settlementOverview,
    setSettlementOverview,
  ] = useState({
    outstanding_amount: 0,
    pending_settlement_amount: 0,
    pending_sales_amount: 0,
    paid_amount: 0,
    overdue_amount: 0,

    next_due_date: null,
    settlement_rate: 15,

    latest_settlement_month: null,
    latest_settlement_status: null,
    latest_settlement_amount: 0,
  })

  const [batches, setBatches] =
    useState([])

  const [
    unbatchedReceivables,
    setUnbatchedReceivables,
  ] = useState([])

  const [
    settlements,
    setSettlements,
  ] = useState([])

  const [
    pendingSettlementItems,
    setPendingSettlementItems,
  ] = useState([])

  const [
    selectedBatch,
    setSelectedBatch,
  ] = useState(null)

  const [
    selectedSettlement,
    setSelectedSettlement,
  ] = useState(null)

  const [
    reportingSettlementId,
    setReportingSettlementId,
  ] = useState(null)

  const [reportForm, setReportForm] =
    useState({ account_last5: '', transfer_date: '' })

  const [submittingReport, setSubmittingReport] =
    useState(false)


  const loadData =
    useCallback(async () => {
      if (!vendorId) return

      setLoading(true)

      try {
        const [
          receivableOverviewRes,
          receivableListRes,
          settlementOverviewRes,
          settlementListRes,
        ] = await Promise.all([
          getVendorReceivableOverview(
            vendorId
          ),

          getVendorReceivables(
            vendorId
          ),

          getVendorSettlementOverview(
            vendorId
          ),

          getVendorSettlements(
            vendorId
          ),
        ])

        if (
          receivableOverviewRes.data
            ?.success
        ) {
          setReceivableOverview(
            receivableOverviewRes.data
          )
        }

        if (
          receivableListRes.data
            ?.success
        ) {
          setBatches(
            receivableListRes.data
              .batches || []
          )

          setUnbatchedReceivables(
            receivableListRes.data
              .receivables || []
          )
        }

        if (
          settlementOverviewRes.data
            ?.success
        ) {
          setSettlementOverview(
            settlementOverviewRes.data
          )
        }

        if (
          settlementListRes.data
            ?.success
        ) {
          setSettlements(
            settlementListRes.data
              .settlements || []
          )

          setPendingSettlementItems(
            settlementListRes.data
              .pending_items || []
          )
        }
      } catch (err) {
        console.error(
          '載入廠商財務資料失敗',
          err
        )

        toast.error(
          err.response?.data?.err ||
            '讀取財務資料失敗，請稍後再試'
        )
      } finally {
        setLoading(false)
      }
    }, [vendorId, toast])


  useEffect(() => {
    loadData()
  }, [loadData])


  const openSettlementReportForm = settlement => {
    setReportingSettlementId(settlement.settlement_id)
    setReportForm({ account_last5: '', transfer_date: '' })
  }

  const submitSettlementReport = async settlement => {
    if (!/^\d{5}$/.test(reportForm.account_last5)) {
      toast.error('請輸入匯款帳號後 5 碼（數字）')
      return
    }
    if (!reportForm.transfer_date) {
      toast.error('請選擇匯款日期')
      return
    }

    setSubmittingReport(true)
    try {
      const res = await reportVendorSettlementPayment({
        vendor_id: vendorId,
        settlement_id: settlement.settlement_id,
        amount: settlement.outstanding_amount,
        account_last5: reportForm.account_last5,
        transfer_date: reportForm.transfer_date,
      })
      if (res.data?.success) {
        toast.success('已送出匯款回報，請等待平台確認')
        setReportingSettlementId(null)
        const freshRes = await getVendorSettlements(vendorId)
        if (freshRes.data?.success) {
          const freshSettlements = freshRes.data.settlements || []
          setSettlements(freshSettlements)
          const updated = freshSettlements.find(
            s => s.settlement_id === settlement.settlement_id
          )
          if (updated) setSelectedSettlement(updated)
        }
      } else {
        toast.error(res.data?.err || '送出匯款回報失敗')
      }
    } catch (err) {
      toast.error(
        err.response?.data?.err || '送出匯款回報失敗，請稍後再試'
      )
    } finally {
      setSubmittingReport(false)
    }
  }


  const pendingGoodsTotal =
    useMemo(() => {
      return (
        Number(
          receivableOverview
            .pending_goods_amount || 0
        ) +
        Number(
          receivableOverview
            .eligible_goods_amount || 0
        )
      )
    }, [receivableOverview])


  const currentGoodsBatch =
    useMemo(() => {
      if (!batches.length) {
        return null
      }

      return batches[0]
    }, [batches])


  const currentSettlement =
    useMemo(() => {
      if (!settlements.length) {
        return null
      }

      return settlements[0]
    }, [settlements])


  if (!vendorId) {
    return (
      <div className="p-4 sm:p-0">
        <div className="flex items-center gap-2 rounded-2xl border border-[#FFD7D2] bg-[#FFF0F0] p-4 text-sm font-bold text-[#D93025] sm:p-5">
          <AlertCircle
            size={18}
            className="shrink-0"
          />

          找不到廠商登入資訊，請重新登入後再試一次。
        </div>
      </div>
    )
  }


  if (loading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-[#8C8880]">
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


  return (
    <div className="relative space-y-6 p-4 animate-in fade-in duration-300 sm:space-y-8 sm:p-0">
      {/* Header */}
      <div>
        <h1 className="text-xl font-serif font-black text-[#1A1A18] sm:text-2xl">
          財務中心
        </h1>

        <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-[#8C8880] sm:text-xs">
          貨款與平台服務費採兩筆獨立月結。ShareBuy
          每月依貨款月結單將應撥貨款全額匯入您的收款帳戶；您再依同月份有效成交額支付
          15% 平台服務費。
        </p>
      </div>


      {/* ==================================================
          A. 貨款
      ================================================== */}
      <section className="space-y-5">
        <SectionTitle
          icon={ArrowDownLeft}
          title="貨款"
          description="ShareBuy 依月結單將符合資格的訂單貨款全額撥付給您，不會直接從貨款中扣除 15% 服務費。"
          direction="ShareBuy → 廠商"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="尚待月結貨款"
            value={pendingGoodsTotal}
            hint="包含仍在退貨風險期及已取得資格、等待納入月結的貨款"
            icon={Clock3}
          />

          <SummaryCard
            label="已產生待撥貨款"
            value={
              receivableOverview
                .payout_pending_amount
            }
            hint={
              currentGoodsBatch
                ? `${monthLabel(
                    currentGoodsBatch.month
                  )}目前狀態：${
                    BATCH_STATUS[
                      currentGoodsBatch.status
                    ]?.label ||
                    currentGoodsBatch.status
                  }`
                : '目前尚無待撥月結單'
            }
            icon={WalletCards}
            emphasis
          />

          <SummaryCard
            label="累計已撥貨款"
            value={
              receivableOverview
                .paid_goods_amount
            }
            hint="平台已完成撥付的貨款"
            icon={CheckCircle2}
          />

          <SummaryCard
            label="收款帳戶"
            value={0}
            hint={
              receivableOverview
                .hasBankAccount
                ? `${receivableOverview.bank_display}${
                    receivableOverview
                      .bank_account_name
                      ? `｜${receivableOverview.bank_account_name}`
                      : ''
                  }`
                : '尚未設定收款帳戶，請先至設定頁補充銀行資料'
            }
            icon={Landmark}
          />
        </div>


        {/* 貨款月結列表 */}
        <div className="overflow-hidden rounded-[1.5rem] border border-[#E2DDD4] bg-white">
          <div className="border-b border-[#E2DDD4] bg-[#F8F9FA] px-5 py-4">
            <h3 className="text-sm font-black text-[#1A1A18]">
              貨款月結紀錄
            </h3>

            <p className="mt-1 text-[10px] text-[#8C8880]">
              每個月份會產生一張貨款月結單，點擊「查看明細」可查看本期包含的訂單。
            </p>
          </div>

          {batches.length === 0 ? (
            <EmptyState
              text="目前尚無貨款月結紀錄"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px]">
                <thead className="border-b border-[#E2DDD4]">
                  <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                    <th className="px-5 py-3">
                      月份
                    </th>

                    <th className="px-5 py-3">
                      訂單數
                    </th>

                    <th className="px-5 py-3">
                      本期貨款
                    </th>

                    <th className="px-5 py-3">
                      預計撥款日
                    </th>

                    <th className="px-5 py-3">
                      狀態
                    </th>

                    <th className="px-5 py-3">
                      實際撥款
                    </th>

                    <th className="px-5 py-3">
                      操作
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E2DDD4]">
                  {batches.map(batch => (
                    <tr
                      key={batch.batch_id}
                    >
                      <td className="px-5 py-4 text-xs font-black text-[#1A1A18]">
                        {monthLabel(
                          batch.month
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">
                        {
                          batch.receivable_count
                        }{' '}
                        筆
                      </td>

                      <td className="px-5 py-4 text-xs font-black text-[#C8522A]">
                        {money(
                          batch.amount_due
                        )}
                      </td>

                      <td className="px-5 py-4 text-[10px] text-[#8C8880]">
                        {dateText(
                          batch.scheduled_payout_date
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <Badge
                          status={
                            batch.status
                          }
                        />
                      </td>

                      <td className="px-5 py-4 text-[10px] text-[#8C8880]">
                        {batch.status ===
                        'paid' ? (
                          <>
                            <p>
                              {dateTimeText(
                                batch.paid_at
                              )}
                            </p>

                            {batch.transaction_reference && (
                              <p className="mt-1">
                                交易編號：
                                {
                                  batch.transaction_reference
                                }
                              </p>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedBatch(
                              batch
                            )
                          }
                          className="rounded-xl border border-[#E2DDD4] bg-white px-3 py-2 text-[10px] font-bold text-[#1A1A18] hover:bg-[#F5F0E8]"
                        >
                          查看明細
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>


        {/* 尚未納入月結 */}
        <div className="overflow-hidden rounded-[1.5rem] border border-[#E2DDD4] bg-white">
          <div className="border-b border-[#E2DDD4] bg-[#F8F9FA] px-5 py-4">
            <h3 className="text-sm font-black text-[#1A1A18]">
              尚未納入月結
            </h3>

            <p className="mt-1 text-[10px] text-[#8C8880]">
              這些訂單尚在退貨風險期，或已取得資格、等待下一次月結產生。
            </p>
          </div>

          {unbatchedReceivables.length ===
          0 ? (
            <EmptyState
              text="目前沒有等待月結的貨款"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-[#E2DDD4]">
                  <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                    <th className="px-5 py-3">
                      訂單
                    </th>

                    <th className="px-5 py-3">
                      貨款
                    </th>

                    <th className="px-5 py-3">
                      可結算時間
                    </th>

                    <th className="px-5 py-3">
                      狀態
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E2DDD4]">
                  {unbatchedReceivables.map(
                    item => (
                      <tr
                        key={
                          item.receivable_id
                        }
                      >
                        <td className="px-5 py-4 text-[10px] font-bold text-[#1A1A18]">
                          {String(
                            item.order_id
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs font-black text-[#1A1A18]">
                          {money(
                            item.amount_due
                          )}
                        </td>

                        <td className="px-5 py-4 text-[10px] text-[#8C8880]">
                          {dateTimeText(
                            item.eligible_at
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <Badge
                            status={
                              item.status
                            }
                            type="receivable"
                          />
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


      {/* ==================================================
          B. 服務費
      ================================================== */}
      <section className="space-y-5">
        <SectionTitle
          icon={ArrowUpRight}
          title="平台服務費"
          description="每月依符合結算資格的有效成交額計算 15% 平台服務費。此筆款項與貨款撥付分開處理，不直接從貨款中扣除。"
          direction="廠商 → ShareBuy"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="待繳平台服務費"
            value={
              settlementOverview
                .outstanding_amount
            }
            hint={
              settlementOverview
                .next_due_date
                ? `最近付款期限：${dateText(
                    settlementOverview
                      .next_due_date
                  )}`
                : '目前沒有待付款月結單'
            }
            icon={ReceiptText}
            emphasis
          />

          <SummaryCard
            label="等待產生月結"
            value={
              settlementOverview
                .pending_settlement_amount
            }
            hint={`尚未月結的有效成交額 ${money(
              settlementOverview
                .pending_sales_amount
            )}`}
            icon={Clock3}
          />

          <SummaryCard
            label="累計已繳服務費"
            value={
              settlementOverview
                .paid_amount
            }
            hint="平台已確認收款的服務費"
            icon={CheckCircle2}
          />

          <SummaryCard
            label="逾期未繳"
            value={
              settlementOverview
                .overdue_amount
            }
            hint={
              Number(
                settlementOverview
                  .overdue_amount || 0
              ) > 0
                ? '請儘速完成付款'
                : '目前沒有逾期服務費'
            }
            icon={AlertCircle}
          />
        </div>


        {/* 服務費月結列表 */}
        <div className="overflow-hidden rounded-[1.5rem] border border-[#E2DDD4] bg-white">
          <div className="border-b border-[#E2DDD4] bg-[#F8F9FA] px-5 py-4">
            <h3 className="text-sm font-black text-[#1A1A18]">
              服務費月結紀錄
            </h3>

            <p className="mt-1 text-[10px] text-[#8C8880]">
              每張月結單會列出本期有效成交額、15% 服務費與付款狀態。
            </p>
          </div>

          {settlements.length === 0 ? (
            <EmptyState
              text="目前尚無服務費月結紀錄"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px]">
                <thead className="border-b border-[#E2DDD4]">
                  <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                    <th className="px-5 py-3">
                      月份
                    </th>

                    <th className="px-5 py-3">
                      有效成交額
                    </th>

                    <th className="px-5 py-3">
                      15% 服務費
                    </th>

                    <th className="px-5 py-3">
                      已繳
                    </th>

                    <th className="px-5 py-3">
                      付款期限
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
                    settlement => (
                      <tr
                        key={
                          settlement.settlement_id
                        }
                      >
                        <td className="px-5 py-4 text-xs font-black text-[#1A1A18]">
                          {monthLabel(
                            settlement.month
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">
                          {money(
                            settlement.gross_sales
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs font-black text-[#C8522A]">
                          {money(
                            settlement.amount_due
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">
                          {money(
                            settlement.paid_amount
                          )}
                        </td>

                        <td className="px-5 py-4 text-[10px] text-[#8C8880]">
                          {dateText(
                            settlement.due_date
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <Badge
                            status={
                              settlement.status
                            }
                            type="settlement"
                          />
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSettlement(
                                settlement
                              )
                            }
                            className="rounded-xl border border-[#E2DDD4] bg-white px-3 py-2 text-[10px] font-bold text-[#1A1A18] hover:bg-[#F5F0E8]"
                          >
                            查看明細
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>


        {/* 尚未納入服務費月結 */}
        <div className="overflow-hidden rounded-[1.5rem] border border-[#E2DDD4] bg-white">
          <div className="border-b border-[#E2DDD4] bg-[#F8F9FA] px-5 py-4">
            <h3 className="text-sm font-black text-[#1A1A18]">
              尚未納入服務費月結
            </h3>

            <p className="mt-1 text-[10px] text-[#8C8880]">
              顯示目前尚未被加入月結單的訂單服務費明細。
            </p>
          </div>

          {pendingSettlementItems.length ===
          0 ? (
            <EmptyState
              text="目前沒有等待月結的服務費"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="border-b border-[#E2DDD4]">
                  <tr className="text-left text-[10px] font-bold text-[#8C8880]">
                    <th className="px-5 py-3">
                      訂單
                    </th>

                    <th className="px-5 py-3">
                      有效成交額
                    </th>

                    <th className="px-5 py-3">
                      15% 服務費
                    </th>

                    <th className="px-5 py-3">
                      可結算時間
                    </th>

                    <th className="px-5 py-3">
                      狀態
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E2DDD4]">
                  {pendingSettlementItems.map(
                    item => (
                      <tr
                        key={
                          item.settlement_item_id
                        }
                      >
                        <td className="px-5 py-4 text-[10px] font-bold text-[#1A1A18]">
                          {String(
                            item.order_id
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">
                          {money(
                            item.sales_amount
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs font-black text-[#C8522A]">
                          {money(
                            item.settlement_amount
                          )}
                        </td>

                        <td className="px-5 py-4 text-[10px] text-[#8C8880]">
                          {dateTimeText(
                            item.eligible_at
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <Badge
                            status={
                              item.status
                            }
                            type="receivable"
                          />
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>


        {/* 說明 */}
        <div className="rounded-[1.5rem] border border-[#DED6C8] bg-[#F5F0E8] p-5">
          <div className="flex gap-3">
            <CalendarClock
              size={18}
              className="mt-0.5 shrink-0 text-[#C8522A]"
            />

            <div className="text-[10px] leading-relaxed text-[#6F6A61] sm:text-[11px]">
              <p className="font-black text-[#1A1A18]">
                月結說明
              </p>

              <p className="mt-1">
                貨款與平台服務費皆按月結算，但屬於兩筆獨立金流。平台會依貨款月結單將應撥貨款全額匯給廠商；廠商再依服務費月結單另行支付 15% 平台服務費。
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ==================================================
          貨款月結明細 Modal
      ================================================== */}
      {selectedBatch && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1A18]/50 p-4 backdrop-blur-sm"
          onClick={() =>
            setSelectedBatch(null)
          }
        >
          <div
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] border border-[#E2DDD4] bg-white"
            onClick={event =>
              event.stopPropagation()
            }
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E2DDD4] bg-white px-5 py-4">
              <div>
                <p className="text-[10px] font-bold text-[#8C8880]">
                  貨款月結
                </p>

                <h3 className="mt-1 text-lg font-black text-[#1A1A18]">
                  {monthLabel(
                    selectedBatch.month
                  )}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedBatch(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F8F9FA]"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-[#F8F9FA] p-3">
                  <p className="text-[9px] font-bold text-[#8C8880]">
                    本期貨款
                  </p>

                  <p className="mt-1 text-sm font-black text-[#1A1A18]">
                    {money(
                      selectedBatch.amount_due
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F8F9FA] p-3">
                  <p className="text-[9px] font-bold text-[#8C8880]">
                    訂單數
                  </p>

                  <p className="mt-1 text-sm font-black text-[#1A1A18]">
                    {
                      selectedBatch.receivable_count
                    }{' '}
                    筆
                  </p>
                </div>

                <div className="rounded-xl bg-[#F8F9FA] p-3">
                  <p className="text-[9px] font-bold text-[#8C8880]">
                    預計撥款
                  </p>

                  <p className="mt-1 text-sm font-black text-[#1A1A18]">
                    {dateText(
                      selectedBatch.scheduled_payout_date
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F8F9FA] p-3">
                  <p className="text-[9px] font-bold text-[#8C8880]">
                    狀態
                  </p>

                  <div className="mt-1">
                    <Badge
                      status={
                        selectedBatch.status
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E2DDD4] p-4">
                <p className="text-xs font-black text-[#1A1A18]">
                  收款帳戶
                </p>

                <p className="mt-2 text-[10px] leading-relaxed text-[#8C8880]">
                  {
                    selectedBatch.bank_code ||
                    '—'
                  }{' '}
                  ****
                  {
                    selectedBatch.bank_account_last4 ||
                    '—'
                  }
                  <br />
                  戶名：
                  {
                    selectedBatch.bank_account_name ||
                    '—'
                  }
                </p>
              </div>

              <div>
                <p className="text-xs font-black text-[#1A1A18]">
                  本期訂單明細
                </p>

                {selectedBatch
                  .receivables?.length ? (
                  <div className="mt-3 space-y-2">
                    {selectedBatch.receivables.map(
                      item => (
                        <div
                          key={
                            item.receivable_id
                          }
                          className="flex items-center justify-between gap-4 rounded-xl border border-[#E2DDD4] p-4"
                        >
                          <div>
                            <p className="text-[10px] font-bold text-[#1A1A18]">
                              訂單{' '}
                              {
                                item.order_id
                              }
                            </p>

                            <p className="mt-1 text-[9px] text-[#8C8880]">
                              取得資格：
                              {dateTimeText(
                                item.eligible_at
                              )}
                            </p>
                          </div>

                          <p className="text-xs font-black text-[#1A1A18]">
                            {money(
                              item.amount_due
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-[#F8F9FA] py-6 text-center text-xs font-bold text-[#8C8880]">
                    尚無訂單明細
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ==================================================
          服務費月結明細 Modal
      ================================================== */}
      {selectedSettlement && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1A18]/50 p-4 backdrop-blur-sm"
          onClick={() =>
            setSelectedSettlement(null)
          }
        >
          <div
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] border border-[#E2DDD4] bg-white"
            onClick={event =>
              event.stopPropagation()
            }
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E2DDD4] bg-white px-5 py-4">
              <div>
                <p className="text-[10px] font-bold text-[#8C8880]">
                  平台服務費月結
                </p>

                <h3 className="mt-1 text-lg font-black text-[#1A1A18]">
                  {monthLabel(
                    selectedSettlement.month
                  )}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedSettlement(
                    null
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F8F9FA]"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-[#F8F9FA] p-3">
                  <p className="text-[9px] font-bold text-[#8C8880]">
                    有效成交額
                  </p>

                  <p className="mt-1 text-sm font-black text-[#1A1A18]">
                    {money(
                      selectedSettlement.gross_sales
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F8F9FA] p-3">
                  <p className="text-[9px] font-bold text-[#8C8880]">
                    15% 服務費
                  </p>

                  <p className="mt-1 text-sm font-black text-[#C8522A]">
                    {money(
                      selectedSettlement.amount_due
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F8F9FA] p-3">
                  <p className="text-[9px] font-bold text-[#8C8880]">
                    已繳
                  </p>

                  <p className="mt-1 text-sm font-black text-[#1A1A18]">
                    {money(
                      selectedSettlement.paid_amount
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F8F9FA] p-3">
                  <p className="text-[9px] font-bold text-[#8C8880]">
                    付款期限
                  </p>

                  <p className="mt-1 text-sm font-black text-[#1A1A18]">
                    {dateText(
                      selectedSettlement.due_date
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#E2DDD4] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black text-[#1A1A18]">
                    狀態
                  </p>

                  <Badge
                    status={
                      selectedSettlement.status
                    }
                    type="settlement"
                  />
                </div>

                <p className="mt-3 text-[10px] leading-relaxed text-[#8C8880]">
                  此服務費為 Vendor → ShareBuy
                  的獨立付款，不會直接從貨款中扣除。
                </p>
              </div>

              <div>
                <p className="text-xs font-black text-[#1A1A18]">
                  本期訂單明細
                </p>

                {selectedSettlement
                  .items?.length ? (
                  <div className="mt-3 space-y-2">
                    {selectedSettlement.items.map(
                      item => (
                        <div
                          key={
                            item.settlement_item_id
                          }
                          className="rounded-xl border border-[#E2DDD4] p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[10px] font-bold text-[#1A1A18]">
                              訂單{' '}
                              {
                                item.order_id
                              }
                            </p>

                            <p className="text-xs font-black text-[#C8522A]">
                              {money(
                                item.settlement_amount
                              )}
                            </p>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2 text-[9px] text-[#8C8880]">
                            <p>
                              有效成交額：
                              {money(
                                item.sales_amount
                              )}
                            </p>

                            <p>
                              費率：
                              {
                                item.settlement_rate
                              }
                              %
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-[#F8F9FA] py-6 text-center text-xs font-bold text-[#8C8880]">
                    尚無訂單明細
                  </p>
                )}
              </div>

              {['awaiting_payment', 'partially_paid', 'overdue'].includes(
                selectedSettlement.status
              ) && (
                <div className="rounded-xl border border-[#E2DDD4] p-4">
                  <p className="text-xs font-black text-[#1A1A18]">
                    回報匯款
                  </p>

                  {(() => {
                    const latestPayment = selectedSettlement.payments?.[0]
                    const isPendingReview =
                      latestPayment?.status === 'pending'
                    const rejectReason =
                      latestPayment?.status === 'rejected'
                        ? latestPayment.note
                        : null

                    if (isPendingReview) {
                      return (
                        <p className="mt-3 text-[10px] leading-relaxed text-[#8C8880]">
                          已回報帳號後 5 碼 {latestPayment.reference_no}，
                          匯款日期 {dateText(latestPayment.paid_at)}，
                          請等待平台確認。
                        </p>
                      )
                    }

                    return (
                      <>
                        {rejectReason && (
                          <p className="mt-3 rounded-lg bg-[#FFF0F0] p-3 text-[10px] font-bold text-[#D93025]">
                            退回原因：{rejectReason}
                          </p>
                        )}

                        {reportingSettlementId ===
                        selectedSettlement.settlement_id ? (
                          <div className="mt-3 space-y-3">
                            <div className="flex flex-col gap-3 sm:flex-row">
                              <label className="flex flex-1 flex-col gap-1">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-[#8C8880]">
                                  匯款帳號後 5 碼
                                </span>
                                <input
                                  type="text"
                                  maxLength={5}
                                  value={reportForm.account_last5}
                                  onChange={e =>
                                    setReportForm(f => ({
                                      ...f,
                                      account_last5: e.target.value.replace(
                                        /\D/g,
                                        ''
                                      ),
                                    }))
                                  }
                                  className="rounded-lg border border-[#E2DDD4] px-3 py-2 text-sm font-bold text-[#1A1A18]"
                                  placeholder="12345"
                                />
                              </label>
                              <label className="flex flex-1 flex-col gap-1">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-[#8C8880]">
                                  匯款日期
                                </span>
                                <input
                                  type="date"
                                  value={reportForm.transfer_date}
                                  onChange={e =>
                                    setReportForm(f => ({
                                      ...f,
                                      transfer_date: e.target.value,
                                    }))
                                  }
                                  className="rounded-lg border border-[#E2DDD4] px-3 py-2 text-sm font-bold text-[#1A1A18]"
                                />
                              </label>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={submittingReport}
                                onClick={() =>
                                  submitSettlementReport(selectedSettlement)
                                }
                                className="flex items-center gap-2 rounded-full bg-[#C8522A] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#B04A24] disabled:opacity-60"
                              >
                                {submittingReport && (
                                  <Loader2 size={14} className="animate-spin" />
                                )}
                                送出回報
                              </button>
                              <button
                                type="button"
                                disabled={submittingReport}
                                onClick={() => setReportingSettlementId(null)}
                                className="rounded-full border border-[#E2DDD4] bg-white px-4 py-2 text-xs font-bold text-[#8C8880] transition-colors hover:text-[#1A1A18]"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#E2DDD4] bg-[#F8F9FA] p-3 text-[10px] font-bold text-[#1A1A18]">
                              <Landmark
                                size={14}
                                className="mt-0.5 shrink-0 text-[#C8522A]"
                              />
                              匯款帳戶資訊：請洽財務人員
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                openSettlementReportForm(selectedSettlement)
                              }
                              className="mt-3 rounded-full bg-[#C8522A] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#B04A24]"
                            >
                              回報匯款
                            </button>
                          </>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}

              {selectedSettlement.invoice && (
                <div className="rounded-xl border border-[#E2DDD4] p-4">
                  <p className="text-xs font-black text-[#1A1A18]">
                    服務費發票
                  </p>
                  {selectedSettlement.invoice.status === 'issued' && (
                    <p className="mt-2 text-xs font-bold text-[#1A1A18]">
                      發票號碼：{selectedSettlement.invoice.invoice_number}
                    </p>
                  )}
                  {selectedSettlement.invoice.status === 'failed' && (
                    <p className="mt-2 text-[10px] font-bold text-[#D93025]">
                      開立發票失敗，平台人員將盡快協助處理
                      {selectedSettlement.invoice.error_message
                        ? `：${selectedSettlement.invoice.error_message}`
                        : '。'}
                    </p>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs font-black text-[#1A1A18]">
                  付款紀錄
                </p>

                {selectedSettlement
                  .payments?.length ? (
                  <div className="mt-3 space-y-2">
                    {selectedSettlement.payments.map(
                      payment => (
                        <div
                          key={
                            payment.payment_id
                          }
                          className="rounded-xl border border-[#E2DDD4] p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-black text-[#1A1A18]">
                              {money(
                                payment.amount
                              )}
                            </p>

                            <span className="text-[10px] font-bold text-[#8C8880]">
                              {
                                payment.status
                              }
                            </span>
                          </div>

                          <p className="mt-2 text-[9px] leading-relaxed text-[#8C8880]">
                            交易編號：
                            {
                              payment.reference_no ||
                              '—'
                            }
                            <br />
                            付款時間：
                            {dateTimeText(
                              payment.paid_at
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-[#F8F9FA] py-6 text-center text-xs font-bold text-[#8C8880]">
                    尚無付款紀錄
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
