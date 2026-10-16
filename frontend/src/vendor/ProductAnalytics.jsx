import {
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

import {
  TrendingUp,
  ShoppingBag,
  Package,
  Ticket,
  Wallet,
  Search,
  Loader2,
  RefreshCw,
  AlertCircle,
  FilterX
} from 'lucide-react'

import {
  getVendorCampaigns,
  getVendorProductPerformance
} from '../api/vendor'
import CouponFunnel from './CouponFunnel'

import {
  formatCurrency,
  cn
} from './lib/utils'
import { getErrorMessage } from '../errorMessage'


function Card({
  children,
  className = ''
}) {
  return (
    <div
      className={cn(
        `
          bg-white rounded-[1.5rem] sm:rounded-2xl
          border border-edge
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
  accent = false,
  onDetail
}) {
  return (
    <Card
      className={cn(
        `
          p-4 sm:p-5 flex flex-col
          justify-between
          transition-all
          hover:shadow-md
        `,
        accent
          ? 'border-brand/30'
          : ''
      )}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-5">
        <span className="text-[11px] sm:text-sm font-bold text-muted truncate pr-2">
          {label}
        </span>

        <div
          className={cn(
            'p-2 sm:p-2.5 rounded-xl shrink-0',
            accent
              ? 'bg-brand-soft text-brand'
              : 'bg-cream text-ink'
          )}
        >
          <Icon size={16} className="sm:w-[19px] sm:h-[19px]" />
        </div>
      </div>

      <div>
        <div
          className={cn(
            'text-lg sm:text-2xl font-black truncate',
            accent
              ? 'text-brand'
              : 'text-ink'
          )}
        >
          {value}
        </div>

        {sub && (
          <div className="text-[9px] sm:text-xs font-bold text-muted mt-1 sm:mt-2 truncate">
            {sub}
          </div>
        )}

        {onDetail && (
          <button
            type="button"
            onClick={onDetail}
            className="mt-2 sm:mt-3 text-[10px] sm:text-xs font-bold text-brand hover:underline"
          >
            詳細成效分析 →
          </button>
        )}
      </div>
    </Card>
  )
}


function CouponRateBadge({
  value
}) {
  let className =
    'bg-cream text-muted'

  if (value >= 50) {
    className =
      'bg-brand-soft text-brand'
  } else if (value > 0) {
    className =
      'bg-[#FFF8E7] text-[#9A6700]'
  }

  return (
    <span
      className={cn(
        `
          inline-flex items-center
          px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full
          text-[10px] sm:text-[11px] font-bold whitespace-nowrap
        `,
        className
      )}
    >
      {value.toFixed(1)}%
    </span>
  )
}


export default function ProductAnalytics() {
  const [funnelOpen, setFunnelOpen] = useState(false)

  const vendorId =
    localStorage.getItem('vendor_id')

  const [products, setProducts] =
    useState([])

  const [campaigns, setCampaigns] =
    useState([])

  const [
    selectedCampaign,
    setSelectedCampaign
  ] = useState('')

  const [startDate, setStartDate] =
    useState('')

  const [endDate, setEndDate] =
    useState('')

  const [search, setSearch] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [
    campaignLoading,
    setCampaignLoading
  ] = useState(true)

  const [error, setError] =
    useState('')


  useEffect(() => {
    async function loadCampaigns() {
      if (!vendorId) {
        setCampaignLoading(false)
        return
      }

      try {
        setCampaignLoading(true)

        const response =
          await getVendorCampaigns(
            vendorId
          )

        if (
          response.data?.success ===
          false
        ) {
          throw new Error(
            response.data.err ||
            '活動資料載入失敗'
          )
        }

        setCampaigns(
          (
            response.data?.campaigns ||
            []
          ).map(campaign => ({
            campaignId:
              campaign.campaign_id,

            name:
              campaign.name ||
              '未命名活動',

            status:
              campaign.status
          }))
        )
      } catch (requestError) {
        console.error(
          '活動資料載入失敗：',
          requestError
        )
      } finally {
        setCampaignLoading(false)
      }
    }

    loadCampaigns()
  }, [vendorId])


  async function loadPerformance() {
    if (!vendorId) {
      setError('尚未登入廠商帳號')
      setLoading(false)
      return
    }

    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {
      setError(
        '開始日期不可晚於結束日期'
      )
      return
    }

    try {
      setLoading(true)
      setError('')

      const response =
        await getVendorProductPerformance(
          vendorId,
          selectedCampaign,
          startDate,
          endDate
        )

      if (
        response.data?.success ===
        false
      ) {
        throw new Error(
          response.data.err ||
          '商品成效載入失敗'
        )
      }

      const productData =
        response.data?.products || []

      setProducts(
        productData.map(product => {
          const totalOrders =
            Number(
              product.total_orders || 0
            )

          const couponOrders =
            Number(
              product.coupon_orders || 0
            )

          const couponRate =
            totalOrders > 0
              ? (
                  couponOrders /
                  totalOrders
                ) * 100
              : 0

          return {
            productId:
              product.product_id,

            productName:
              product.product_name ||
              '未命名商品',

            quantitySold:
              Number(
                product.quantity_sold ||
                0
              ),

            totalSales:
              Number(
                product.total_sales ||
                0
              ),

            totalOrders,

            couponOrders,

            couponRate,

            totalCommission:
              Number(
                product.total_commission ||
                0
              )
          }
        })
      )
    } catch (requestError) {
      console.error(
        '商品成效載入失敗：',
        requestError
      )


      setError(
        getErrorMessage(requestError, '商品成效載入失敗')
      )
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    loadPerformance()
  }, [vendorId])


  const filteredProducts =
    useMemo(() => {
      const keyword =
        search.trim().toLowerCase()

      if (!keyword) {
        return products
      }

      return products.filter(
        product =>
          product.productName
            .toLowerCase()
            .includes(keyword) ||
          String(product.productId)
            .toLowerCase()
            .includes(keyword)
      )
    }, [products, search])


  const totals =
    useMemo(() => {
      return filteredProducts.reduce(
        (result, product) => ({
          totalSales:
            result.totalSales +
            product.totalSales,

          quantitySold:
            result.quantitySold +
            product.quantitySold,

          couponOrders:
            result.couponOrders +
            product.couponOrders,

          totalCommission:
            result.totalCommission +
            product.totalCommission
        }),
        {
          totalSales: 0,
          quantitySold: 0,
          couponOrders: 0,
          totalCommission: 0
        }
      )
    }, [filteredProducts])


  const chartData =
    useMemo(() => {
      return [...filteredProducts]
        .sort(
          (left, right) =>
            right.totalSales -
            left.totalSales
        )
        .slice(0, 10)
        .map(product => ({
          productId:
            product.productId,

          name:
            product.productName.length >
            10
              ? `${product.productName.slice(
                  0,
                  10
                )}…`
              : product.productName,

          fullName:
            product.productName,

          totalSales:
            product.totalSales
        }))
    }, [filteredProducts])


  function clearFilters() {
    setSelectedCampaign('')
    setStartDate('')
    setEndDate('')
    setSearch('')

    setTimeout(() => {
      loadPerformance()
    }, 0)
  }


  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 p-4 sm:p-0">

      {/* 優惠碼流量轉換分析（彈窗，由「優惠碼訂單」卡片開啟） */}
      <CouponFunnel
        open={funnelOpen}
        onClose={() => setFunnelOpen(false)}
        campaignId={selectedCampaign}
        campaignName={
          selectedCampaign
            ? campaigns.find(c => String(c.campaignId) === String(selectedCampaign))?.name
            : ''
        }
      />

      {/* 篩選區 */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:items-end">
          <div className="flex-1 w-full">
            <label className="block text-[11px] sm:text-xs font-bold text-muted mb-1.5 sm:mb-2">
              活動
            </label>

            <select
              value={selectedCampaign}
              onChange={event =>
                setSelectedCampaign(
                  event.target.value
                )
              }
              disabled={campaignLoading}
              className="
                w-full bg-mist
                border border-edge
                rounded-xl px-3 sm:px-4 py-2.5 sm:py-3
                text-[13px] sm:text-sm font-bold
                text-ink
                outline-none
                focus:border-brand
                disabled:opacity-50
              "
            >
              <option value="">
                全部活動
              </option>

              {campaigns.map(
                campaign => (
                  <option
                    key={
                      campaign.campaignId
                    }
                    value={
                      campaign.campaignId
                    }
                  >
                    {campaign.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="flex gap-3 w-full lg:w-auto flex-1">
            <div className="flex-1 w-full">
              <label className="block text-[11px] sm:text-xs font-bold text-muted mb-1.5 sm:mb-2">
                開始日期
              </label>

              <input
                type="date"
                value={startDate}
                onChange={event =>
                  setStartDate(
                    event.target.value
                  )
                }
                className="
                  w-full bg-mist
                  border border-edge
                  rounded-xl px-3 sm:px-4 py-2.5 sm:py-3
                  text-[13px] sm:text-sm font-bold
                  text-ink
                  outline-none
                  focus:border-brand
                "
              />
            </div>


            <div className="flex-1 w-full">
              <label className="block text-[11px] sm:text-xs font-bold text-muted mb-1.5 sm:mb-2">
                結束日期
              </label>

              <input
                type="date"
                value={endDate}
                onChange={event =>
                  setEndDate(
                    event.target.value
                  )
                }
                min={startDate || undefined}
                className="
                  w-full bg-mist
                  border border-edge
                  rounded-xl px-3 sm:px-4 py-2.5 sm:py-3
                  text-[13px] sm:text-sm font-bold
                  text-ink
                  outline-none
                  focus:border-brand
                "
              />
            </div>
          </div>


          <div className="flex gap-2 sm:gap-3 w-full lg:w-auto mt-2 lg:mt-0">
            <button
              type="button"
              onClick={clearFilters}
              disabled={loading}
              className="
                flex-1 lg:flex-none
                inline-flex items-center
                justify-center gap-2
                px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl
                border border-edge
                bg-white text-muted
                text-[13px] sm:text-sm font-bold
                hover:text-ink
                hover:bg-mist
                disabled:opacity-50
                whitespace-nowrap
              "
            >
              <FilterX size={16} />
              清除
            </button>

            <button
              type="button"
              onClick={loadPerformance}
              disabled={loading}
              className="
                flex-[2] lg:flex-none
                inline-flex items-center
                justify-center gap-2
                px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl
                bg-brand text-white
                text-[13px] sm:text-sm font-bold
                hover:bg-brand-dark
                disabled:opacity-50
                transition-colors
                whitespace-nowrap
              "
            >
              {loading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw size={16} />
              )}

              查詢成效
            </button>
          </div>
        </div>
      </Card>


      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs sm:text-sm font-bold text-red-600">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}


      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="商品銷售額"
          value={formatCurrency(
            totals.totalSales
          )}
          sub="目前篩選條件累計"
          icon={TrendingUp}
          accent
        />

        <StatCard
          label="累計銷售量"
          value={`${totals.quantitySold.toLocaleString()} 件`}
          sub="所有商品數量加總"
          icon={Package}
        />

        <StatCard
          label="優惠碼訂單"
          value={totals.couponOrders.toLocaleString()}
          sub="使用推廣碼的商品訂單"
          icon={Ticket}
          onDetail={() => setFunnelOpen(true)}
        />

        <StatCard
          label="累積分潤"
          value={formatCurrency(
            totals.totalCommission
          )}
          sub="優惠碼相關分潤"
          icon={Wallet}
        />
      </div>


      {/* 商品銷售排行 */}
      <Card className="p-4 sm:p-6 overflow-hidden">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-display font-bold text-ink">
            商品銷售額排行
          </h2>

          <p className="text-[10px] sm:text-xs text-muted mt-1">
            依目前查詢條件顯示前十名商品
          </p>
        </div>

        {loading ? (
          <div className="h-[240px] sm:h-[280px] flex flex-col items-center justify-center">
            <Loader2
              size={22}
              className="animate-spin text-brand"
            />

            <div className="text-xs font-bold text-muted mt-3">
              商品成效載入中...
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[240px] sm:h-[280px] flex flex-col items-center justify-center text-muted">
            <ShoppingBag
              size={30}
              className="text-edge mb-3"
            />

            <div className="text-xs sm:text-sm font-bold">
              目前沒有商品銷售資料
            </div>
          </div>
        ) : (
          <div className="-ml-4 sm:ml-0">
            <ResponsiveContainer
              width="100%"
              height={260}
            >
              <BarChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 10,
                  bottom: 10
                }}
              >
                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: window.innerWidth < 640 ? 9 : 11,
                    fill: '#6B6780',
                    fontWeight: 'bold'
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={window.innerWidth < 640 ? -45 : 0}
                  textAnchor={window.innerWidth < 640 ? 'end' : 'middle'}
                  height={window.innerWidth < 640 ? 60 : 30}
                />

                <YAxis hide />

                <Tooltip
                  formatter={value => [
                    formatCurrency(value),
                    '銷售額'
                  ]}
                  labelFormatter={(
                    label,
                    payload
                  ) =>
                    payload?.[0]?.payload
                      ?.fullName || label
                  }
                  cursor={{
                    fill: '#F8F8FB'
                  }}
                  contentStyle={{
                    borderRadius: 14,
                    border:
                      '1px solid #E4E2EC',
                    boxShadow:
                      '0 8px 24px rgba(26,26,24,0.08)',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}
                />

                <Bar
                  dataKey="totalSales"
                  fill="#6E64AF"
                  radius={[8, 8, 0, 0]}
                  barSize={window.innerWidth < 640 ? 20 : 42}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>


      {/* 商品明細 */}
      <Card className="overflow-hidden w-full">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-display font-bold text-ink">
              商品成效明細
            </h2>

            <p className="text-[10px] sm:text-xs text-muted mt-1">
              共 {filteredProducts.length} 項商品
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 bg-mist border border-edge rounded-full px-3 sm:px-4 py-2 sm:py-2.5 w-full sm:w-72">
            <Search
              size={15}
              className="text-muted shrink-0"
            />

            <input
              value={search}
              onChange={event =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="搜尋商品名稱或編號…"
              className="w-full bg-transparent outline-none text-[13px] sm:text-sm font-bold text-ink placeholder:text-muted/60"
            />
          </div>
        </div>


        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-mist border-b border-edge">
                {[
                  '商品',
                  '銷售量',
                  '訂單數',
                  '銷售額',
                  '優惠碼訂單',
                  '優惠碼占比',
                  '累積分潤'
                ].map(header => (
                  <th
                    key={header}
                    className="p-4 sm:p-5 text-[11px] sm:text-xs font-bold text-muted tracking-widest whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>


            <tbody className="divide-y divide-edge">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-20 text-center"
                  >
                    <Loader2
                      size={20}
                      className="animate-spin mx-auto text-brand"
                    />

                    <div className="text-[11px] sm:text-sm font-bold text-muted mt-3">
                      商品成效載入中...
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-20 text-center text-[11px] sm:text-sm font-bold text-muted"
                  >
                    目前沒有符合條件的商品成效資料
                  </td>
                </tr>
              ) : (
                [...filteredProducts]
                  .sort(
                    (left, right) =>
                      right.totalSales -
                      left.totalSales
                  )
                  .map(product => (
                    <tr
                      key={
                        product.productId
                      }
                      className="hover:bg-mist transition-colors"
                    >
                      <td className="p-4 sm:p-5">
                        <div className="font-bold text-[13px] sm:text-sm text-ink max-w-[150px] sm:max-w-xs truncate">
                          {
                            product.productName
                          }
                        </div>

                        <div className="text-[9px] sm:text-[10px] font-mono font-bold text-muted mt-1">
                          商品 #
                          {
                            product.productId
                          }
                        </div>
                      </td>

                      <td className="p-4 sm:p-5 text-xs sm:text-sm font-black text-ink whitespace-nowrap">
                        {
                          product.quantitySold
                        }
                        {' '}
                        件
                      </td>

                      <td className="p-4 sm:p-5 text-xs sm:text-sm font-bold text-ink">
                        {
                          product.totalOrders
                        }
                      </td>

                      <td className="p-4 sm:p-5 text-xs sm:text-sm font-black text-brand whitespace-nowrap">
                        {formatCurrency(
                          product.totalSales
                        )}
                      </td>

                      <td className="p-4 sm:p-5 text-xs sm:text-sm font-bold text-ink">
                        {
                          product.couponOrders
                        }
                      </td>

                      <td className="p-4 sm:p-5">
                        <CouponRateBadge
                          value={
                            product.couponRate
                          }
                        />
                      </td>

                      <td className="p-4 sm:p-5 text-xs sm:text-sm font-black text-ink whitespace-nowrap">
                        {formatCurrency(
                          product.totalCommission
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}