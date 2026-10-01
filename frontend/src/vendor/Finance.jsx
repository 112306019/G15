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

  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}


const shortId = value => {
  if (!value) return '—'

  const text = String(value)

  if (text.length <= 14) {
    return text
  }

  return `${text.slice(0, 8)}...${text.slice(-5)}`
}


const RECEIVABLE_STATUS = {
  pending: {
    label: '等待撥款資格',
    style:
      'bg-white border border-[#E2DDD4] text-[#8C8880]',
  },

  eligible: {
    label: '可撥款',
    style:
      'bg-[#F5F0E8] text-[#1A1A18]',
  },

  payout_pending: {
    label: '撥款處理中',
    style:
      'bg-[#FDF0ED] text-[#C8522A]',
  },

  partially_paid: {
    label: '部分已撥',
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
      'bg-[#FFF0F0] text-[#D93025]',
  },

  adjusted: {
    label: '金額已調整',
    style:
      'bg-[#F8F9FA] border border-[#E2DDD4] text-[#8C8880]',
  },
}


const SETTLEMENT_STATUS = {
  draft: {
    label: '草稿',
    style:
      'bg-white border border-[#E2DDD4] text-[#8C8880]',
  },

  awaiting_payment: {
    label: '待付款',
    style:
      'bg-[#FDF0ED] text-[#C8522A]',
  },

  partially_paid: {
    label: '部分付款',
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
  type = 'receivable',
}) {
  const config =
    type === 'settlement'
      ? SETTLEMENT_STATUS[status]
      : RECEIVABLE_STATUS[status]

  const display =
    config || {
      label: status || '未知',
      style:
        'bg-[#F8F9FA] text-[#8C8880]',
    }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-bold whitespace-nowrap ${display.style}`}
    >
      {display.label}
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
      className={`rounded-[1.5rem] border p-5 sm:p-6 ${
        emphasis
          ? 'bg-[#1A1A18] border-[#1A1A18]'
          : 'bg-white border-[#E2DDD4]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">

        <div>
          <p
            className={`text-[10px] sm:text-xs font-bold tracking-wider ${
              emphasis
                ? 'text-[#D8D1C5]'
                : 'text-[#8C8880]'
            }`}
          >
            {label}
          </p>

          <p
            className={`mt-2 text-xl sm:text-2xl font-black ${
              emphasis
                ? 'text-[#F5F0E8]'
                : 'text-[#1A1A18]'
            }`}
          >
            {money(value)}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            emphasis
              ? 'bg-white/10 text-[#F5F0E8]'
              : 'bg-[#F5F0E8] text-[#B89B6A]'
          }`}
        >
          <Icon size={18} />
        </div>

      </div>

      {hint && (
        <p
          className={`mt-3 text-[10px] sm:text-[11px] leading-relaxed ${
            emphasis
              ? 'text-[#B8B4AC]'
              : 'text-[#8C8880]'
          }`}
        >
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
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

      <div className="flex items-start gap-3">

        <div className="h-10 w-10 shrink-0 rounded-xl bg-[#F5F0E8] flex items-center justify-center text-[#C8522A]">
          <Icon size={18} />
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-serif font-black text-[#1A1A18]">
            {title}
          </h2>

          <p className="mt-1 text-[11px] sm:text-xs text-[#8C8880] leading-relaxed">
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
    <div className="py-12 text-center text-xs sm:text-sm font-bold text-[#8C8880]">
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

    pending_count: 0,
    eligible_count: 0,
    payout_pending_count: 0,

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

    awaiting_count: 0,
    overdue_count: 0,

    next_due_date: null,
    settlement_rate: 15,
  })


  const [
    receivables,
    setReceivables,
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
    selectedReceivable,
    setSelectedReceivable,
  ] = useState(null)


  const [
    selectedSettlement,
    setSelectedSettlement,
  ] = useState(null)


  const loadData =
    useCallback(async () => {
      if (!vendorId) {
        return
      }

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
          receivableOverviewRes.data?.success
        ) {
          setReceivableOverview(
            receivableOverviewRes.data
          )
        }


        if (
          receivableListRes.data?.success
        ) {
          setReceivables(
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
          '載入廠商金流資料失敗',
          err
        )

        toast.error(
          err.response?.data?.err ||
          '讀取金流資料失敗，請稍後再試'
        )

      } finally {
        setLoading(false)
      }
    }, [
      vendorId,
      toast,
    ])


  useEffect(() => {
    loadData()
  }, [loadData])


  const receivableTotal =
    useMemo(() => {
      return (
        Number(
          receivableOverview
            .pending_goods_amount || 0
        ) +
        Number(
          receivableOverview
            .eligible_goods_amount || 0
        ) +
        Number(
          receivableOverview
            .payout_pending_amount || 0
        )
      )
    }, [receivableOverview])


  if (!vendorId) {
    return (
      <div className="p-4 sm:p-0">

        <div className="flex items-center gap-2 text-sm font-bold text-[#D93025] bg-[#FFF0F0] rounded-2xl p-4 sm:p-5 border border-[#FFD7D2]">

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
      <div className="min-h-[420px] flex flex-col items-center justify-center gap-3 text-[#8C8880]">

        <Loader2
          size={28}
          className="animate-spin text-[#C8522A]"
        />

        <p className="text-sm font-bold">
          金流資料載入中...
        </p>

      </div>
    )
  }


  return (
    <div className="space-y-8 sm:space-y-10 animate-in fade-in duration-300 p-4 sm:p-0">

      {/* ======================================================
          Page Header
      ====================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">

        <div>

          <h1 className="text-xl sm:text-2xl font-serif font-black text-[#1A1A18]">
            金流管理
          </h1>

          <p className="mt-2 max-w-3xl text-[11px] sm:text-xs text-[#8C8880] leading-relaxed">
            ShareBuy 代收消費者貨款後，
            符合條件的貨款會全額撥付給廠商；
            平台 15% 服務費則另外產生結算單，
            不會直接從貨款中扣除。
          </p>

        </div>


        <div className="rounded-2xl border border-[#E2DDD4] bg-white px-4 py-3">

          <p className="text-[10px] font-bold text-[#8C8880]">
            收款帳戶
          </p>

          <p className="mt-1 text-xs sm:text-sm font-black text-[#1A1A18]">
            {receivableOverview
              .bank_display ||
              '未設定'}
          </p>

          {receivableOverview
            .bank_account_name && (
            <p className="mt-0.5 text-[10px] text-[#8C8880]">
              {
                receivableOverview
                  .bank_account_name
              }
            </p>
          )}

        </div>

      </div>


      {!receivableOverview
        .hasBankAccount && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#F1D2C8] bg-[#FDF0ED] p-4 sm:p-5">

          <AlertCircle
            size={18}
            className="shrink-0 text-[#C8522A] mt-0.5"
          />

          <div>

            <p className="text-xs sm:text-sm font-bold text-[#1A1A18]">
              尚未設定貨款收款帳戶
            </p>

            <p className="mt-1 text-[10px] sm:text-xs text-[#8C8880] leading-relaxed">
              請至設定頁完成銀行帳戶資料。
              平台建立貨款撥款時會使用該帳戶。
            </p>

          </div>

        </div>
      )}


      {/* ======================================================
          A. ShareBuy → Vendor
      ====================================================== */}

      <section className="space-y-5 sm:space-y-6">

        <SectionTitle
          icon={ArrowDownLeft}
          title="貨款"
          description="消費者支付的貨款由 ShareBuy 代收，符合撥款條件後，平台將折扣後貨款成交額全額撥付給您。"
          direction="ShareBuy → Vendor"
        />


        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          <SummaryCard
            label="待進入撥款資格"
            value={
              receivableOverview
                .pending_goods_amount
            }
            hint={`${receivableOverview.pending_count || 0} 筆貨款仍在等待撥款條件`}
            icon={Clock3}
          />

          <SummaryCard
            label="目前可撥貨款"
            value={
              receivableOverview
                .eligible_goods_amount
            }
            hint={`${receivableOverview.eligible_count || 0} 筆已符合平台撥款條件`}
            icon={WalletCards}
            emphasis
          />

          <SummaryCard
            label="撥款處理中"
            value={
              receivableOverview
                .payout_pending_amount
            }
            hint={`${receivableOverview.payout_pending_count || 0} 筆正在處理`}
            icon={CalendarClock}
          />

          <SummaryCard
            label="累計已收貨款"
            value={
              receivableOverview
                .paid_goods_amount
            }
            hint="已由平台確認完成匯款的貨款"
            icon={CheckCircle2}
          />

        </div>


        <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-[#E2DDD4] bg-white overflow-hidden">

          <div className="border-b border-[#E2DDD4] bg-[#F8F9FA] px-4 sm:px-6 py-4">

            <div className="flex items-center justify-between gap-3">

              <div>

                <h3 className="text-sm sm:text-base font-black text-[#1A1A18]">
                  貨款明細
                </h3>

                <p className="mt-1 text-[10px] sm:text-xs text-[#8C8880]">
                  目前待收貨款總額：
                  <span className="font-bold text-[#1A1A18] ml-1">
                    {money(
                      receivableTotal
                    )}
                  </span>
                </p>

              </div>

              <span className="rounded-full border border-[#E2DDD4] bg-white px-3 py-1.5 text-[10px] font-bold text-[#8C8880]">
                {receivables.length} 筆
              </span>

            </div>

          </div>


          {receivables.length === 0 ? (
            <EmptyState text="目前沒有貨款紀錄" />
          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[900px]">

                <thead className="bg-white border-b border-[#E2DDD4]">

                  <tr className="text-left text-[10px] font-bold text-[#8C8880]">

                    <th className="px-5 py-3">
                      訂單
                    </th>

                    <th className="px-5 py-3">
                      貨款
                    </th>

                    <th className="px-5 py-3">
                      已撥
                    </th>

                    <th className="px-5 py-3">
                      尚待撥付
                    </th>

                    <th className="px-5 py-3">
                      可撥時間
                    </th>

                    <th className="px-5 py-3">
                      狀態
                    </th>

                    <th className="px-5 py-3 text-right">
                      操作
                    </th>

                  </tr>

                </thead>


                <tbody className="divide-y divide-[#E2DDD4]">

                  {receivables.map(item => (

                    <tr
                      key={
                        item.receivable_id
                      }
                      className="hover:bg-[#F8F9FA]/70 transition-colors"
                    >

                      <td className="px-5 py-4">

                        <p className="text-xs font-black text-[#1A1A18]">
                          {shortId(
                            item.order_id
                          )}
                        </p>

                        <p className="mt-1 text-[10px] text-[#8C8880]">
                          應收編號 #
                          {
                            item.receivable_id
                          }
                        </p>

                      </td>


                      <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">
                        {money(
                          item.goods_amount
                        )}
                      </td>


                      <td className="px-5 py-4 text-xs font-bold text-[#2F6F45]">
                        {money(
                          item.amount_paid
                        )}
                      </td>


                      <td className="px-5 py-4 text-xs font-black text-[#C8522A]">
                        {money(
                          item.outstanding_amount
                        )}
                      </td>


                      <td className="px-5 py-4 text-[11px] text-[#8C8880]">
                        {dateText(
                          item.eligible_at
                        )}
                      </td>


                      <td className="px-5 py-4">

                        <Badge
                          status={
                            item.status
                          }
                        />

                      </td>


                      <td className="px-5 py-4 text-right">

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedReceivable(
                              item
                            )
                          }
                          className="rounded-xl border border-[#E2DDD4] bg-white px-3 py-2 text-[10px] font-bold text-[#1A1A18] hover:bg-[#F5F0E8] transition-colors"
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

      </section>


      {/* ======================================================
          B. Vendor → ShareBuy
      ====================================================== */}

      <section className="space-y-5 sm:space-y-6">

        <SectionTitle
          icon={ArrowUpRight}
          title="應繳服務費"
          description={`依有效商品成交額計算 ${settlementOverview.settlement_rate || 15}% 平台服務費。KOC 5% 分潤由 ShareBuy 從平台服務費收入中負擔，不會再向廠商額外收取。`}
          direction="Vendor → ShareBuy"
        />


        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          <SummaryCard
            label="待繳平台服務費"
            value={
              settlementOverview
                .outstanding_amount
            }
            hint={`${settlementOverview.awaiting_count || 0} 張結算單尚未繳清`}
            icon={ReceiptText}
            emphasis
          />

          <SummaryCard
            label="待產生結算金額"
            value={
              settlementOverview
                .pending_settlement_amount
            }
            hint="已符合條件、尚未彙整成正式結算單"
            icon={Clock3}
          />

          <SummaryCard
            label="累計已繳服務費"
            value={
              settlementOverview
                .paid_amount
            }
            hint="平台已確認收到的服務費"
            icon={CheckCircle2}
          />

          <SummaryCard
            label="逾期未繳"
            value={
              settlementOverview
                .overdue_amount
            }
            hint={`${settlementOverview.overdue_count || 0} 張逾期結算單`}
            icon={AlertCircle}
          />

        </div>


        <div className="rounded-2xl border border-[#E2DDD4] bg-[#F8F9FA] p-4 sm:p-5">

          <div className="flex items-start gap-3">

            <ReceiptText
              size={18}
              className="shrink-0 text-[#B89B6A] mt-0.5"
            />

            <div>

              <p className="text-xs sm:text-sm font-bold text-[#1A1A18]">
                平台服務費與貨款是兩筆獨立金流
              </p>

              <p className="mt-1 text-[10px] sm:text-xs leading-relaxed text-[#8C8880]">
                ShareBuy 會先將貨款全額撥付給廠商；
                廠商再依結算單另外支付 15% 平台服務費。
                平台不會直接從應撥貨款扣除服務費。
              </p>

              {settlementOverview
                .next_due_date && (

                <p className="mt-2 text-[10px] font-bold text-[#C8522A]">
                  最近付款期限：
                  {' '}
                  {dateText(
                    settlementOverview
                      .next_due_date
                  )}
                </p>

              )}

            </div>

          </div>

        </div>


        <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-[#E2DDD4] bg-white overflow-hidden">

          <div className="border-b border-[#E2DDD4] bg-[#F8F9FA] px-4 sm:px-6 py-4">

            <div className="flex items-center justify-between gap-3">

              <div>

                <h3 className="text-sm sm:text-base font-black text-[#1A1A18]">
                  服務費結算單
                </h3>

                <p className="mt-1 text-[10px] sm:text-xs text-[#8C8880]">
                  每張結算單彙整符合條件的訂單服務費
                </p>

              </div>

              <span className="rounded-full border border-[#E2DDD4] bg-white px-3 py-1.5 text-[10px] font-bold text-[#8C8880]">
                {settlements.length} 張
              </span>

            </div>

          </div>


          {settlements.length === 0 ? (

            <EmptyState text="目前沒有服務費結算單" />

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[980px]">

                <thead className="border-b border-[#E2DDD4]">

                  <tr className="text-left text-[10px] font-bold text-[#8C8880]">

                    <th className="px-5 py-3">
                      結算單
                    </th>

                    <th className="px-5 py-3">
                      結算期間
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

                    <th className="px-5 py-3 text-right">
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
                      className="hover:bg-[#F8F9FA]/70 transition-colors"
                    >

                      <td className="px-5 py-4">

                        <p className="text-xs font-black text-[#1A1A18]">
                          #
                          {
                            settlement.settlement_id
                          }
                        </p>

                      </td>


                      <td className="px-5 py-4 text-[11px] text-[#8C8880]">

                        <p>
                          {dateText(
                            settlement.period_start
                          )}
                        </p>

                        <p className="mt-1">
                          至
                          {' '}
                          {dateText(
                            settlement.period_end
                          )}
                        </p>

                      </td>


                      <td className="px-5 py-4 text-xs font-bold text-[#1A1A18]">
                        {money(
                          settlement.gross_sales
                        )}
                      </td>


                      <td className="px-5 py-4">

                        <p className="text-xs font-black text-[#C8522A]">
                          {money(
                            settlement.amount_due
                          )}
                        </p>

                        <p className="mt-1 text-[10px] text-[#8C8880]">
                          {
                            settlement.settlement_rate ||
                            15
                          }%
                        </p>

                      </td>


                      <td className="px-5 py-4 text-xs font-bold text-[#2F6F45]">
                        {money(
                          settlement.paid_amount
                        )}
                      </td>


                      <td className="px-5 py-4 text-[11px] text-[#8C8880]">
                        {dateText(
                          settlement.due_date
                        )}
                      </td>


                      <td className="px-5 py-4">

                        <Badge
                          type="settlement"
                          status={
                            settlement.status
                          }
                        />

                      </td>


                      <td className="px-5 py-4 text-right">

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSettlement(
                              settlement
                            )
                          }
                          className="rounded-xl border border-[#E2DDD4] bg-white px-3 py-2 text-[10px] font-bold text-[#1A1A18] hover:bg-[#F5F0E8] transition-colors"
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


        {/* 尚未彙整的服務費 */}

        {pendingSettlementItems.length > 0 && (

          <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-[#E2DDD4] bg-white overflow-hidden">

            <div className="border-b border-[#E2DDD4] bg-[#F8F9FA] px-4 sm:px-6 py-4">

              <h3 className="text-sm sm:text-base font-black text-[#1A1A18]">
                尚未產生結算單的訂單
              </h3>

              <p className="mt-1 text-[10px] sm:text-xs text-[#8C8880]">
                這些訂單已建立服務費明細，等待平台彙整成正式結算單
              </p>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full min-w-[720px]">

                <thead className="border-b border-[#E2DDD4]">

                  <tr className="text-left text-[10px] font-bold text-[#8C8880]">

                    <th className="px-5 py-3">
                      訂單
                    </th>

                    <th className="px-5 py-3">
                      有效成交額
                    </th>

                    <th className="px-5 py-3">
                      服務費
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

                      <td className="px-5 py-4 text-xs font-black text-[#1A1A18]">
                        {shortId(
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

                      <td className="px-5 py-4 text-[11px] text-[#8C8880]">
                        {dateText(
                          item.eligible_at
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <Badge
                          type="settlement"
                          status={
                            item.status
                          }
                        />
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        )}

      </section>


      {/* ======================================================
          Receivable Modal
      ====================================================== */}

      {selectedReceivable && (

        <div
          className="fixed inset-0 z-[100] bg-[#1A1A18]/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() =>
            setSelectedReceivable(
              null
            )
          }
        >

          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-[#E2DDD4] bg-white p-6 sm:p-8 shadow-2xl"
            onClick={event =>
              event.stopPropagation()
            }
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-[10px] font-bold tracking-wider text-[#8C8880]">
                  貨款應收明細
                </p>

                <h3 className="mt-1 text-lg font-black text-[#1A1A18]">
                  #
                  {
                    selectedReceivable
                      .receivable_id
                  }
                </h3>

              </div>


              <button
                type="button"
                onClick={() =>
                  setSelectedReceivable(
                    null
                  )
                }
                className="h-9 w-9 rounded-full border border-[#E2DDD4] flex items-center justify-center text-[#8C8880] hover:bg-[#F8F9FA]"
              >
                <X size={17} />
              </button>

            </div>


            <div className="mt-6 grid grid-cols-2 gap-3">

              <DetailItem
                label="折扣後貨款"
                value={money(
                  selectedReceivable
                    .goods_amount
                )}
              />

              <DetailItem
                label="運費"
                value={money(
                  selectedReceivable
                    .shipping_amount
                )}
              />

              <DetailItem
                label="調整金額"
                value={money(
                  selectedReceivable
                    .adjustment_amount
                )}
              />

              <DetailItem
                label="應撥總額"
                value={money(
                  selectedReceivable
                    .amount_due
                )}
                strong
              />

              <DetailItem
                label="已撥金額"
                value={money(
                  selectedReceivable
                    .amount_paid
                )}
              />

              <DetailItem
                label="尚待撥付"
                value={money(
                  selectedReceivable
                    .outstanding_amount
                )}
                strong
              />

            </div>


            <div className="mt-6 rounded-2xl bg-[#F8F9FA] border border-[#E2DDD4] p-4">

              <p className="text-xs font-bold text-[#1A1A18]">
                訂單
              </p>

              <p className="mt-1 break-all text-[11px] text-[#8C8880]">
                {
                  selectedReceivable
                    .order_id
                }
              </p>

              <div className="mt-3">
                <Badge
                  status={
                    selectedReceivable
                      .status
                  }
                />
              </div>

            </div>


            <div className="mt-6">

              <h4 className="text-sm font-black text-[#1A1A18]">
                撥款紀錄
              </h4>


              {(
                selectedReceivable
                  .payouts || []
              ).length === 0 ? (

                <p className="mt-4 rounded-xl bg-[#F8F9FA] py-6 text-center text-xs font-bold text-[#8C8880]">
                  尚無撥款紀錄
                </p>

              ) : (

                <div className="mt-3 space-y-3">

                  {selectedReceivable
                    .payouts.map(
                      payout => (

                    <div
                      key={
                        payout.payout_id
                      }
                      className="rounded-xl border border-[#E2DDD4] p-4"
                    >

                      <div className="flex justify-between gap-3">

                        <div>

                          <p className="text-xs font-black text-[#1A1A18]">
                            {money(
                              payout.amount
                            )}
                          </p>

                          <p className="mt-1 text-[10px] text-[#8C8880]">
                            撥款編號 #
                            {
                              payout.payout_id
                            }
                          </p>

                        </div>

                        <Badge
                          status={
                            payout.status ===
                            'confirmed'
                              ? 'paid'
                              : payout.status ===
                                'pending'
                              ? 'payout_pending'
                              : payout.status
                          }
                        />

                      </div>


                      <div className="mt-3 text-[10px] leading-relaxed text-[#8C8880]">

                        <p>
                          銀行：
                          {
                            payout.destination_bank_code ||
                            '—'
                          }
                          {' '}
                          ****
                          {
                            payout.destination_account_last4 ||
                            '—'
                          }
                        </p>

                        <p>
                          戶名：
                          {
                            payout.destination_account_name ||
                            '—'
                          }
                        </p>

                        <p>
                          交易編號：
                          {
                            payout.transaction_reference ||
                            '—'
                          }
                        </p>

                        <p>
                          撥款時間：
                          {dateText(
                            payout.payout_at
                          )}
                        </p>

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          Settlement Modal
      ====================================================== */}

      {selectedSettlement && (

        <div
          className="fixed inset-0 z-[100] bg-[#1A1A18]/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() =>
            setSelectedSettlement(
              null
            )
          }
        >

          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-[#E2DDD4] bg-white p-6 sm:p-8 shadow-2xl"
            onClick={event =>
              event.stopPropagation()
            }
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-[10px] font-bold tracking-wider text-[#8C8880]">
                  平台服務費結算單
                </p>

                <h3 className="mt-1 text-lg font-black text-[#1A1A18]">
                  #
                  {
                    selectedSettlement
                      .settlement_id
                  }
                </h3>

              </div>


              <button
                type="button"
                onClick={() =>
                  setSelectedSettlement(
                    null
                  )
                }
                className="h-9 w-9 rounded-full border border-[#E2DDD4] flex items-center justify-center text-[#8C8880] hover:bg-[#F8F9FA]"
              >
                <X size={17} />
              </button>

            </div>


            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">

              <DetailItem
                label="有效成交額"
                value={money(
                  selectedSettlement
                    .gross_sales
                )}
              />

              <DetailItem
                label="服務費率"
                value={`${
                  selectedSettlement
                    .settlement_rate ||
                  15
                }%`}
              />

              <DetailItem
                label="應繳服務費"
                value={money(
                  selectedSettlement
                    .amount_due
                )}
                strong
              />

              <DetailItem
                label="已繳金額"
                value={money(
                  selectedSettlement
                    .paid_amount
                )}
              />

              <DetailItem
                label="尚未繳清"
                value={money(
                  selectedSettlement
                    .outstanding_amount
                )}
                strong
              />

              <DetailItem
                label="調整金額"
                value={money(
                  selectedSettlement
                    .adjustment_amount
                )}
              />

            </div>


            <div className="mt-5 rounded-2xl border border-[#E2DDD4] bg-[#F8F9FA] p-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-[#8C8880]">

                <p>
                  結算期間：
                  <span className="font-bold text-[#1A1A18] ml-1">
                    {dateText(
                      selectedSettlement
                        .period_start
                    )}
                    {' ～ '}
                    {dateText(
                      selectedSettlement
                        .period_end
                    )}
                  </span>
                </p>

                <p>
                  到期日：
                  <span className="font-bold text-[#1A1A18] ml-1">
                    {dateText(
                      selectedSettlement
                        .due_date
                    )}
                  </span>
                </p>

              </div>


              <div className="mt-3">
                <Badge
                  type="settlement"
                  status={
                    selectedSettlement
                      .status
                  }
                />
              </div>

            </div>


            {(
              selectedSettlement.items ||
              []
            ).length > 0 && (

              <div className="mt-6">

                <h4 className="text-sm font-black text-[#1A1A18]">
                  結算訂單
                </h4>

                <div className="mt-3 space-y-2">

                  {selectedSettlement
                    .items.map(
                      item => (

                    <div
                      key={
                        item.settlement_item_id ||
                        item.order_id
                      }
                      className="rounded-xl border border-[#E2DDD4] p-3 flex justify-between gap-4"
                    >

                      <div>

                        <p className="text-[11px] font-bold text-[#1A1A18]">
                          {shortId(
                            item.order_id
                          )}
                        </p>

                        <p className="mt-1 text-[10px] text-[#8C8880]">
                          成交額
                          {' '}
                          {money(
                            item.sales_amount
                          )}
                        </p>

                      </div>

                      <p className="text-xs font-black text-[#C8522A]">
                        {money(
                          item.settlement_amount
                        )}
                      </p>

                    </div>

                  ))}

                </div>

              </div>

            )}


            <div className="mt-6">

              <h4 className="text-sm font-black text-[#1A1A18]">
                付款紀錄
              </h4>


              {(
                selectedSettlement
                  .payments || []
              ).length === 0 ? (

                <p className="mt-3 rounded-xl bg-[#F8F9FA] py-6 text-center text-xs font-bold text-[#8C8880]">
                  尚無付款紀錄
                </p>

              ) : (

                <div className="mt-3 space-y-3">

                  {selectedSettlement
                    .payments.map(
                      payment => (

                    <div
                      key={
                        payment.payment_id
                      }
                      className="rounded-xl border border-[#E2DDD4] p-4"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <p className="text-xs font-black text-[#1A1A18]">
                            {money(
                              payment.amount
                            )}
                          </p>

                          <p className="mt-1 text-[10px] text-[#8C8880]">
                            付款紀錄 #
                            {
                              payment.payment_id
                            }
                          </p>

                        </div>

                        <Badge
                          type="settlement"
                          status={
                            payment.status ===
                            'confirmed'
                              ? 'paid'
                              : payment.status ===
                                'pending'
                              ? 'awaiting_payment'
                              : payment.status
                          }
                        />

                      </div>


                      <p className="mt-3 text-[10px] text-[#8C8880]">
                        交易編號：
                        {
                          payment.transaction_reference ||
                          payment.reference_no ||
                          '—'
                        }
                      </p>

                    </div>

                  ))}

                </div>

              )}

            </div>


            <div className="mt-6 rounded-2xl bg-[#F5F0E8] p-4 text-[10px] sm:text-xs leading-relaxed text-[#8C8880]">

              <p className="font-bold text-[#1A1A18]">
                費用說明
              </p>

              <p className="mt-1">
                廠商只需支付本結算單所列的
                {' '}
                {selectedSettlement
                  .settlement_rate ||
                  15}
                % 平台服務費。
                KOC 5% 分潤由 ShareBuy 從平台收入中支付，
                不會再向廠商額外收取。
              </p>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}


function DetailItem({
  label,
  value,
  strong = false,
}) {
  return (
    <div className="rounded-xl border border-[#E2DDD4] bg-[#F8F9FA] p-3">

      <p className="text-[10px] font-bold text-[#8C8880]">
        {label}
      </p>

      <p
        className={`mt-1 text-xs sm:text-sm ${
          strong
            ? 'font-black text-[#C8522A]'
            : 'font-bold text-[#1A1A18]'
        }`}
      >
        {value}
      </p>

    </div>
  )
}