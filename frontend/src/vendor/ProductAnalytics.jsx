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
          p-5 flex flex-col
          justify-between
          transition-all
          hover:shadow-md
        `,
        accent
          ? 'border-[#C8522A]/30'
          : ''
      )}
    >
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-bold text-[#8C8880]">
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
          <Icon size={19} />
        </div>
      </div>

      <div>
        <div
          className={cn(
            'text-2xl font-black',
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


function CouponRateBadge({
  value
}) {
  let className =
    'bg-[#F5F0E8] text-[#8C8880]'

  if (value >= 50) {
    className =
      'bg-[#FDF0ED] text-[#C8522A]'
  } else if (value > 0) {
    className =
      'bg-[#FFF8E7] text-[#9A6700]'
  }

  return (
    <span
      className={cn(
        `
          inline-flex items-center
          px-3 py-1.5 rounded-full
          text-[11px] font-bold
        `,
        className
      )}
    >
      {value.toFixed(1)}%
    </span>
  )
}


export default function ProductAnalytics() {
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

      const apiError =
        requestError.response?.data?.err

      setError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : requestError.message ||
              '商品成效載入失敗'
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
            12
              ? `${product.productName.slice(
                  0,
                  12
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
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* 篩選區 */}
      <Card className="p-5">
        <div className="flex flex-col xl:flex-row gap-4 xl:items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-[#8C8880] mb-2">
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
                w-full bg-[#F8F9FA]
                border border-[#E2DDD4]
                rounded-xl px-4 py-3
                text-sm font-bold
                text-[#1A1A18]
                outline-none
                focus:border-[#C8522A]
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


          <div className="flex-1">
            <label className="block text-xs font-bold text-[#8C8880] mb-2">
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
                w-full bg-[#F8F9FA]
                border border-[#E2DDD4]
                rounded-xl px-4 py-3
                text-sm font-bold
                text-[#1A1A18]
                outline-none
                focus:border-[#C8522A]
              "
            />
          </div>


          <div className="flex-1">
            <label className="block text-xs font-bold text-[#8C8880] mb-2">
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
                w-full bg-[#F8F9FA]
                border border-[#E2DDD4]
                rounded-xl px-4 py-3
                text-sm font-bold
                text-[#1A1A18]
                outline-none
                focus:border-[#C8522A]
              "
            />
          </div>


          <button
            type="button"
            onClick={loadPerformance}
            disabled={loading}
            className="
              inline-flex items-center
              justify-center gap-2
              px-6 py-3 rounded-xl
              bg-[#1A1A18] text-white
              text-sm font-bold
              hover:bg-[#C8522A]
              disabled:opacity-50
              transition-colors
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


          <button
            type="button"
            onClick={clearFilters}
            disabled={loading}
            className="
              inline-flex items-center
              justify-center gap-2
              px-5 py-3 rounded-xl
              border border-[#E2DDD4]
              bg-white text-[#8C8880]
              text-sm font-bold
              hover:text-[#1A1A18]
              hover:bg-[#F8F9FA]
              disabled:opacity-50
            "
          >
            <FilterX size={16} />
            清除
          </button>
        </div>
      </Card>


      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm font-bold text-red-600">
          <AlertCircle size={18} />
          {error}
        </div>
      )}


      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-serif font-bold text-[#1A1A18]">
            商品銷售額排行
          </h2>

          <p className="text-xs text-[#8C8880] mt-1">
            依目前查詢條件顯示前十名商品
          </p>
        </div>

        {loading ? (
          <div className="h-[280px] flex flex-col items-center justify-center">
            <Loader2
              size={22}
              className="animate-spin text-[#C8522A]"
            />

            <div className="text-xs font-bold text-[#8C8880] mt-3">
              商品成效載入中...
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-[#8C8880]">
            <ShoppingBag
              size={30}
              className="text-[#E2DDD4] mb-3"
            />

            <div className="text-sm font-bold">
              目前沒有商品銷售資料
            </div>
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={280}
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
                  fontSize: 11,
                  fill: '#8C8880',
                  fontWeight: 'bold'
                }}
                axisLine={false}
                tickLine={false}
                interval={0}
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
                  fill: '#F8F9FA'
                }}
                contentStyle={{
                  borderRadius: 14,
                  border:
                    '1px solid #E2DDD4',
                  boxShadow:
                    '0 8px 24px rgba(26,26,24,0.08)',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />

              <Bar
                dataKey="totalSales"
                fill="#C8522A"
                radius={[8, 8, 0, 0]}
                barSize={42}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>


      {/* 商品明細 */}
      <Card className="overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E2DDD4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#1A1A18]">
              商品成效明細
            </h2>

            <p className="text-xs text-[#8C8880] mt-1">
              共 {filteredProducts.length} 項商品
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#F8F9FA] border border-[#E2DDD4] rounded-full px-4 py-2.5 w-full sm:w-72">
            <Search
              size={15}
              className="text-[#8C8880]"
            />

            <input
              value={search}
              onChange={event =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="搜尋商品名稱或編號…"
              className="w-full bg-transparent outline-none text-sm font-bold text-[#1A1A18] placeholder:text-[#8C8880]/60"
            />
          </div>
        </div>


        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
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
                    className="p-5 text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>


            <tbody className="divide-y divide-[#E2DDD4]">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-20 text-center"
                  >
                    <Loader2
                      size={20}
                      className="animate-spin mx-auto text-[#C8522A]"
                    />

                    <div className="text-sm font-bold text-[#8C8880] mt-3">
                      商品成效載入中...
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-20 text-center text-sm font-bold text-[#8C8880]"
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
                      className="hover:bg-[#F8F9FA] transition-colors"
                    >
                      <td className="p-5">
                        <div className="font-bold text-sm text-[#1A1A18]">
                          {
                            product.productName
                          }
                        </div>

                        <div className="text-[10px] font-mono font-bold text-[#8C8880] mt-1">
                          商品 #
                          {
                            product.productId
                          }
                        </div>
                      </td>

                      <td className="p-5 text-sm font-black text-[#1A1A18]">
                        {
                          product.quantitySold
                        }
                        {' '}
                        件
                      </td>

                      <td className="p-5 text-sm font-bold text-[#1A1A18]">
                        {
                          product.totalOrders
                        }
                      </td>

                      <td className="p-5 text-sm font-black text-[#C8522A]">
                        {formatCurrency(
                          product.totalSales
                        )}
                      </td>

                      <td className="p-5 text-sm font-bold text-[#1A1A18]">
                        {
                          product.couponOrders
                        }
                      </td>

                      <td className="p-5">
                        <CouponRateBadge
                          value={
                            product.couponRate
                          }
                        />
                      </td>

                      <td className="p-5 text-sm font-black text-[#1A1A18]">
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