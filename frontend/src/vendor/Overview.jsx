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
  Loader2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Receipt
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
          bg-white rounded-[1.5rem] sm:rounded-2xl
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
          p-4 sm:p-5 flex flex-col justify-between
          hover:shadow-md transition-all
        `,
        accent
          ? 'border-[#C8522A]/30'
          : ''
      )}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-5">
        <span className="text-[11px] sm:text-sm font-bold text-[#8C8880] tracking-wide truncate pr-2">
          {label}
        </span>

        <div
          className={cn(
            'p-2 sm:p-2.5 rounded-xl shrink-0',
            accent
              ? 'bg-[#FDF0ED] text-[#C8522A]'
              : 'bg-[#F5F0E8] text-[#1A1A18]'
          )}
        >
          <Icon
            size={16}
            className="sm:w-[19px] sm:h-[19px]"
            strokeWidth={2.5}
          />
        </div>
      </div>

      <div>
        <div
          className={cn(
            `
              text-lg sm:text-2xl font-black
              font-sans tracking-tight truncate
            `,
            accent
              ? 'text-[#C8522A]'
              : 'text-[#1A1A18]'
          )}
        >
          {value}
        </div>

        {sub && (
          <div className="text-[10px] sm:text-xs font-bold text-[#8C8880] mt-1 sm:mt-2 leading-snug break-words">
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
    <div className="flex items-center justify-between gap-3 sm:gap-5 py-3 sm:py-4 border-b border-[#E2DDD4] last:border-b-0">
      <div>
        <div className="text-[13px] sm:text-sm font-bold text-[#1A1A18]">
          {label}
        </div>

        <div className="text-[10px] sm:text-xs text-[#8C8880] mt-0.5 sm:mt-1 pr-2">
          {description}
        </div>
      </div>

      <div className="text-base sm:text-lg font-black text-[#C8522A] shrink-0">
        {value}
      </div>
    </div>
  )
}


function formatRoas(roas) {
  return roas === null || roas === undefined
    ? '—'
    : `${Number(roas).toFixed(2)}x`
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
          ),

        // KOC 合作成效
        kocGmv:
          Number(
            data.koc_performance?.gmv || 0
          ),

        kocNetSales:
          Number(
            data.koc_performance?.net_sales || 0
          ),

        kocOrderCount:
          Number(
            data.koc_performance?.order_count || 0
          ),

        kocCommission:
          Number(
            data.koc_performance?.commission || 0
          ),

        kocPlatformFee:
          Number(
            data.koc_performance?.platform_fee || 0
          ),

        // null 代表分母為 0（還沒有任何分潤與平台費），畫面顯示「—」
        kocRoas:
          data.koc_performance?.roas ?? null,

        platformFeeRate:
          Number(
            data.koc_performance?.platform_fee_rate || 0
          ),

        campaignBreakdown:
          Array.isArray(data.campaign_breakdown)
            ? data.campaign_breakdown
            : []
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
      <Card className="py-16 px-4 sm:px-6 text-center m-4 sm:m-0">
        <AlertCircle
          size={28}
          className="mx-auto text-red-500 mb-4"
        />

        <div className="text-[13px] sm:text-sm font-bold text-red-600">
          {error}
        </div>

        <button
          type="button"
          onClick={loadAnalytics}
          className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-full bg-[#1A1A18] text-white text-xs sm:text-sm font-bold hover:bg-[#C8522A] transition-colors"
        >
          <RefreshCw size={15} />
          重新載入
        </button>
      </Card>
    )
  }


  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 p-4 sm:p-0">

      {/* 主要營收 KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          label="總帶貨 GMV"
          value={formatCurrency(
            analytics?.kocGmv || 0
          )}
          icon={DollarSign}
        />

        <StatCard
          label="淨營業額"
          value={formatCurrency(
            analytics?.kocNetSales || 0
          )}
          icon={Receipt}
          accent
        />

        <StatCard
          label="總訂單數"
          value={(
            analytics?.totalOrders || 0
          ).toLocaleString()}
          icon={ShoppingBag}
        />

        <StatCard
          label="優惠碼使用次數"
          value={(
            analytics?.totalCouponUsage || 0
          ).toLocaleString()}
          icon={Ticket}
        />

        <div className="col-span-2 lg:col-span-1">
          <StatCard
            label="網紅合作 ROAS"
            value={formatRoas(analytics?.kocRoas)}
            icon={TrendingUp}
            accent={analytics?.kocRoas !== null && analytics?.kocRoas >= 1}
          />
        </div>
      </div>


      {/* 各活動合作成效 */}
      <Card className="p-4 sm:p-6">
        <div className="mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-serif font-bold text-[#1A1A18]">
            各活動合作成效
          </h2>

          <p className="text-[10px] sm:text-xs text-[#8C8880] mt-1">
            ROAS 大於 1 代表這檔合作帶來的淨營業額高於分潤與平台費（未計入商品成本）
          </p>
        </div>

        {analytics?.campaignBreakdown.length === 0 ? (
          <div className="py-8 text-center text-[12px] sm:text-sm text-[#8C8880]">
            目前還沒有 KOC 優惠碼帶出的訂單
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[640px] text-[12px] sm:text-sm">
              <thead>
                <tr className="text-left text-[10px] sm:text-xs font-bold text-[#8C8880] border-b border-[#E2DDD4]">
                  <th className="py-2.5 px-4 sm:px-2">活動</th>
                  <th className="py-2.5 px-2 text-right">GMV</th>
                  <th className="py-2.5 px-2 text-right">淨營業額</th>
                  <th className="py-2.5 px-2 text-right">分潤</th>
                  <th className="py-2.5 px-2 text-right">平台費</th>
                  <th className="py-2.5 px-4 sm:px-2 text-right">ROAS</th>
                </tr>
              </thead>

              <tbody>
                {analytics?.campaignBreakdown.map((row) => (
                  <tr
                    key={row.campaign_id}
                    className="border-b border-[#E2DDD4] last:border-b-0"
                  >
                    <td className="py-3 px-4 sm:px-2 font-bold text-[#1A1A18] max-w-[220px] truncate">
                      {row.campaign_name || '（未命名活動）'}
                      <div className="text-[10px] font-medium text-[#8C8880] mt-0.5">
                        {row.order_count} 單，淨 {row.net_order_count} 單
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-[#1A1A18]">
                      {formatCurrency(row.gmv)}
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-[#1A1A18]">
                      {formatCurrency(row.net_sales)}
                    </td>
                    <td className="py-3 px-2 text-right text-[#8C8880]">
                      {formatCurrency(row.commission)}
                    </td>
                    <td className="py-3 px-2 text-right text-[#8C8880]">
                      {formatCurrency(row.platform_fee)}
                    </td>
                    <td
                      className={cn(
                        'py-3 px-4 sm:px-2 text-right font-black',
                        row.roas === null
                          ? 'text-[#8C8880]'
                          : row.roas >= 1
                            ? 'text-[#C8522A]'
                            : 'text-red-600'
                      )}
                    >
                      {formatRoas(row.roas)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>


      {/* 活動與 KOC 流程 KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
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

        <div className="col-span-2 sm:col-span-1">
          <StatCard
            label="投稿數"
            value={(
              analytics?.totalSubmissions || 0
            ).toLocaleString()}
            sub="包含文案與發布連結"
            icon={FileText}
          />
        </div>
      </div>


      {/* 衍生成效 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <Card className="p-4 sm:p-6">
          <div className="mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#1A1A18]">
              成效摘要
            </h2>

            <p className="text-[10px] sm:text-xs text-[#8C8880] mt-1">
              由目前累積資料計算
            </p>
          </div>

          <MetricRow
            label="平均訂單金額"
            value={formatCurrency(
              derivedMetrics.averageOrderValue
            )}
            description="所有已付款訂單的商品銷售額 ÷ 總訂單數"
          />

          <MetricRow
            label="報名投稿比例"
            value={`${derivedMetrics.submissionRate.toFixed(1)}%`}
            description="投稿數 ÷ KOC 報名數"
          />

          <MetricRow
            label="平均優惠碼使用"
            value={`${derivedMetrics.averageCouponUsage.toFixed(1)} 次`}
            description="優惠碼使用次數 ÷ 活動數"
          />
        </Card>


        <Card className="p-4 sm:p-6">
          <div className="mb-4 sm:mb-5">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#1A1A18]">
              資料計算方式
            </h2>

            <p className="text-[10px] sm:text-xs text-[#8C8880] mt-1">
              目前後端採用的統計來源
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4 text-[13px] sm:text-sm">
            <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-3 sm:p-4">
              <div className="font-bold text-[#1A1A18]">
                總帶貨 GMV / 淨營業額
              </div>

              <div className="text-[11px] sm:text-xs text-[#8C8880] mt-1">
                GMV 加總使用 KOC 優惠碼、曾付款成功的訂單中屬於該活動商品的 subtotal（含之後退貨/取消）；淨營業額再扣除已取消與已退款的訂單
              </div>

              <div className="text-[11px] sm:text-xs font-bold text-[#1A1A18] mt-2">
                目前共 {(analytics?.kocOrderCount || 0).toLocaleString()} 張 KOC 訂單，退貨/取消扣除 {formatCurrency(
                  Math.max(0, (analytics?.kocGmv || 0) - (analytics?.kocNetSales || 0))
                )}
              </div>
            </div>

            <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-3 sm:p-4">
              <div className="font-bold text-[#1A1A18]">
                訂單數
              </div>

              <div className="text-[11px] sm:text-xs text-[#8C8880] mt-1">
                計算包含廠商商品且已付款(paid/completed)的不重複訂單
              </div>
            </div>

            <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-3 sm:p-4">
              <div className="font-bold text-[#1A1A18]">
                優惠碼使用次數
              </div>

              <div className="text-[11px] sm:text-xs text-[#8C8880] mt-1">
                加總所有 KOC 優惠碼的累計使用次數（訂單完成並產生分潤時才計入）
              </div>
            </div>

            <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-3 sm:p-4">
              <div className="font-bold text-[#1A1A18]">
                網紅合作 ROAS
              </div>

              <div className="text-[11px] sm:text-xs text-[#8C8880] mt-1">
                淨營業額 ÷（KOC 分潤 + 平台費）。分潤排除退貨後被收回的部分；平台費 = 淨營業額 × 目前費率 {analytics?.platformFeeRate || 0}%
              </div>

              <div className="text-[11px] sm:text-xs font-bold text-[#1A1A18] mt-2">
                目前分潤 {formatCurrency(analytics?.kocCommission || 0)} + 平台費 {formatCurrency(analytics?.kocPlatformFee || 0)}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}