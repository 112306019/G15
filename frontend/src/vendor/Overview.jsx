import React, {
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  DollarSign,
  ShoppingBag,
  Megaphone,
  Users,
  FileText,
  Ticket,
  Wallet,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

import {
  getVendorAnalyticsOverview
} from '../api/vendor'

import {
  formatCurrency,
  cn
} from './lib/utils'


function Card({
  children,
  className = ''
}) {
  return (
    <div
      className={cn(
        `
          bg-white rounded-2xl
          border border-[#E2DDD4]
          shadow-sm
        `,
        className
      )}
    >
      {children}
    </div>
  )
}


function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = false
}) {
  return (
    <Card
      className={cn(
        `
          p-5 flex flex-col justify-between
          hover:shadow-md transition-all
        `,
        accent
          ? 'border-[#C8522A]/30'
          : ''
      )}
    >
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-bold text-[#8C8880] tracking-wide">
          {label}
        </span>

        <div
          className={cn(
            'p-2.5 rounded-xl',
            accent
              ? 'bg-[#FDF0ED] text-[#C8522A]'
              : 'bg-[#F5F0E8] text-[#1A1A18]'
          )}
        >
          <Icon
            size={19}
            strokeWidth={2.5}
          />
        </div>
      </div>

      <div>
        <div
          className={cn(
            `
              text-2xl font-black
              font-sans tracking-tight
            `,
            accent
              ? 'text-[#C8522A]'
              : 'text-[#1A1A18]'
          )}
        >
          {value}
        </div>

        {sub && (
          <div className="text-xs font-bold text-[#8C8880] mt-2">
            {sub}
          </div>
        )}
      </div>
    </Card>
  )
}


function MetricRow({
  label,
  value,
  description
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-4 border-b border-[#E2DDD4] last:border-b-0">
      <div>
        <div className="text-sm font-bold text-[#1A1A18]">
          {label}
        </div>

        <div className="text-xs text-[#8C8880] mt-1">
          {description}
        </div>
      </div>

      <div className="text-lg font-black text-[#C8522A] shrink-0">
        {value}
      </div>
    </div>
  )
}


export default function Overview() {
  const vendorId =
    localStorage.getItem('vendor_id')

  const [analytics, setAnalytics] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')


  async function loadAnalytics() {
    if (!vendorId) {
      setError('尚未登入廠商帳號')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')

      const response =
        await getVendorAnalyticsOverview(
          vendorId
        )

      if (
        response.data?.success === false
      ) {
        throw new Error(
          response.data.err ||
          '成效總覽載入失敗'
        )
      }

      const data =
        response.data?.analytics || {}

      setAnalytics({
        totalCampaigns:
          Number(
            data.total_campaigns || 0
          ),

        totalApplications:
          Number(
            data.total_applications || 0
          ),

        totalSubmissions:
          Number(
            data.total_submissions || 0
          ),

        totalOrders:
          Number(
            data.total_orders || 0
          ),

        totalRevenue:
          Number(
            data.total_revenue || 0
          ),

        totalCouponUsage:
          Number(
            data.total_coupon_usage || 0
          ),

        totalCommission:
          Number(
            data.total_commission || 0
          )
      })
    } catch (requestError) {
      console.error(
        '成效總覽載入失敗：',
        requestError
      )

      const apiError =
        requestError.response?.data?.err

      setError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : requestError.message ||
              '成效總覽載入失敗'
      )
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    loadAnalytics()
  }, [vendorId])


  const derivedMetrics =
    useMemo(() => {
      if (!analytics) {
        return {
          averageOrderValue: 0,
          submissionRate: 0,
          averageCouponUsage: 0
        }
      }

      const averageOrderValue =
        analytics.totalOrders > 0
          ? (
              analytics.totalRevenue /
              analytics.totalOrders
            )
          : 0

      const submissionRate =
        analytics.totalApplications > 0
          ? (
              analytics.totalSubmissions /
              analytics.totalApplications
            ) * 100
          : 0

      const averageCouponUsage =
        analytics.totalCampaigns > 0
          ? (
              analytics.totalCouponUsage /
              analytics.totalCampaigns
            )
          : 0

      return {
        averageOrderValue,
        submissionRate,
        averageCouponUsage
      }
    }, [analytics])


  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-flex items-center gap-2 text-sm font-bold text-[#8C8880]">
          <Loader2
            size={18}
            className="animate-spin"
          />

          成效資料載入中...
        </div>
      </div>
    )
  }


  if (error) {
    return (
      <Card className="py-16 px-6 text-center">
        <AlertCircle
          size={28}
          className="mx-auto text-red-500 mb-4"
        />

        <div className="text-sm font-bold text-red-600">
          {error}
        </div>

        <button
          type="button"
          onClick={loadAnalytics}
          className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-full bg-[#1A1A18] text-white text-sm font-bold hover:bg-[#C8522A] transition-colors"
        >
          <RefreshCw size={15} />
          重新載入
        </button>
      </Card>
    )
  }


  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* 主要營收 KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="累積銷售額"
          value={formatCurrency(
            analytics?.totalRevenue || 0
          )}
          sub="已付款(paid/completed)訂單的商品銷售小計"
          icon={DollarSign}
          accent
        />

        <StatCard
          label="總訂單數"
          value={(
            analytics?.totalOrders || 0
          ).toLocaleString()}
          sub="含廠商商品且已付款(paid/completed)的不重複訂單"
          icon={ShoppingBag}
        />

        <StatCard
          label="優惠碼使用次數"
          value={(
            analytics?.totalCouponUsage || 0
          ).toLocaleString()}
          sub="所有 KOC 優惠碼累計"
          icon={Ticket}
        />

        <StatCard
          label="累積分潤"
          value={formatCurrency(
            analytics?.totalCommission || 0
          )}
          sub="優惠碼帶來的分潤"
          icon={Wallet}
        />
      </div>


      {/* 活動與 KOC 流程 KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="活動數"
          value={(
            analytics?.totalCampaigns || 0
          ).toLocaleString()}
          sub="建立過的推廣活動"
          icon={Megaphone}
        />

        <StatCard
          label="KOC 報名數"
          value={(
            analytics?.totalApplications || 0
          ).toLocaleString()}
          sub="所有活動申請紀錄"
          icon={Users}
        />

        <StatCard
          label="投稿數"
          value={(
            analytics?.totalSubmissions || 0
          ).toLocaleString()}
          sub="包含文案與發布連結"
          icon={FileText}
        />
      </div>


      {/* 衍生成效 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-serif font-bold text-[#1A1A18]">
              成效摘要
            </h2>

            <p className="text-xs text-[#8C8880] mt-1">
              由目前累積資料計算
            </p>
          </div>

          <MetricRow
            label="平均訂單金額"
            value={formatCurrency(
              derivedMetrics.averageOrderValue
            )}
            description="累積銷售額 ÷ 總訂單數"
          />

          <MetricRow
            label="報名投稿比例"
            value={`${derivedMetrics.submissionRate.toFixed(1)}%`}
            description="投稿數 ÷ KOC 報名數"
          />

          <MetricRow
            label="平均每活動優惠碼使用"
            value={`${derivedMetrics.averageCouponUsage.toFixed(1)} 次`}
            description="優惠碼使用次數 ÷ 活動數"
          />
        </Card>


        <Card className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-serif font-bold text-[#1A1A18]">
              資料計算方式
            </h2>

            <p className="text-xs text-[#8C8880] mt-1">
              目前後端採用的統計來源
            </p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-4">
              <div className="font-bold text-[#1A1A18]">
                銷售額
              </div>

              <div className="text-xs text-[#8C8880] mt-1">
                加總該廠商所有「已付款(paid/completed)」訂單商品的 subtotal（未付款、取消中的訂單不計入）
              </div>
            </div>

            <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-4">
              <div className="font-bold text-[#1A1A18]">
                訂單數
              </div>

              <div className="text-xs text-[#8C8880] mt-1">
                計算包含廠商商品且已付款(paid/completed)的不重複訂單
              </div>
            </div>

            <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-4">
              <div className="font-bold text-[#1A1A18]">
                優惠碼成效
              </div>

              <div className="text-xs text-[#8C8880] mt-1">
                加總 Coupon 的使用次數與累積分潤
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}