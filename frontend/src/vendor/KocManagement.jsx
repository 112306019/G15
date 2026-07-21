import React, {
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  Search,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Ticket,
  Users,
  ShoppingBag,
  Wallet,
  Loader2,
  Power,
  PowerOff
} from 'lucide-react'

import {
  getVendorCouponUsage,
  updateVendorCouponStatus
} from '../api/vendor'

import { Avatar } from './components/ui'
import {
  formatCurrency,
  cn
} from './lib/utils'


const couponStatusFilters = [
  'all',
  'active',
  'inactive',
  'disabled'
]


const couponStatusLabels = {
  all: '全部',
  active: '啟用中',
  inactive: '尚未啟用',
  disabled: '已停用'
}


const missionStageLabels = {
  pending: '等待開始',
  writing: '撰寫文案',
  reviewing: '文案審核中',
  publishing: '等待發布',
  completed: '任務完成'
}


function CouponBadge({
  status
}) {
  const config = {
    active: {
      label: '啟用中',
      cls:
        'bg-[#FDF0ED] text-[#C8522A]',
      dot:
        'bg-[#C8522A]'
    },

    inactive: {
      label: '尚未啟用',
      cls:
        'bg-[#F5F0E8] text-[#8C8880]',
      dot:
        'bg-[#8C8880]'
    },

    disabled: {
      label: '已停用',
      cls:
        'bg-red-50 text-red-600',
      dot:
        'bg-red-500'
    }
  }

  const current =
    config[status] || {
      label: status || '未知',
      cls:
        'bg-gray-100 text-gray-500',
      dot:
        'bg-gray-400'
    }

  return (
    <span
      className={cn(
        `
          inline-flex items-center gap-1.5
          px-3 py-1.5 rounded-full
          text-[11px] font-bold
        `,
        current.cls
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          current.dot
        )}
      />

      {current.label}
    </span>
  )
}


function MissionStageBadge({
  stage
}) {
  const config = {
    pending:
      'bg-[#F8F9FA] text-[#8C8880]',

    writing:
      'bg-[#FFF8E7] text-[#9A6700]',

    reviewing:
      'bg-[#FDF0ED] text-[#C8522A]',

    publishing:
      'bg-[#F5F0E8] text-[#1A1A18]',

    completed:
      'bg-green-50 text-green-700'
  }

  return (
    <span
      className={cn(
        `
          inline-flex px-2.5 py-1
          rounded-md text-[10px]
          font-bold tracking-wider
        `,
        config[stage] ||
          'bg-gray-100 text-gray-500'
      )}
    >
      {missionStageLabels[stage] ||
        stage ||
        '未知'}
    </span>
  )
}


function SummaryCard({
  icon: Icon,
  label,
  value
}) {
  return (
    <div className="bg-white border border-[#E2DDD4] rounded-2xl px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold text-[#8C8880] mb-2">
        <Icon size={15} />
        {label}
      </div>

      <div className="text-2xl font-black text-[#1A1A18]">
        {value}
      </div>
    </div>
  )
}


function CouponDetailModal({
  coupon,
  updating,
  onClose,
  onUpdateStatus,
  onCopy,
  copied
}) {
  if (!coupon) return null

  const canActivate =
    coupon.status !== 'active'

  const canDisable =
    coupon.status !== 'disabled'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#1A1A18]/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-[2rem] border border-[#E2DDD4] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between px-8 py-6 bg-[#F8F9FA] border-b border-[#E2DDD4]">
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#1A1A18]">
              優惠碼詳細資訊
            </h2>

            <div className="text-sm font-bold text-[#8C8880] mt-1">
              {coupon.campaignName}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[#8C8880] hover:bg-[#E2DDD4] hover:text-[#1A1A18]"
          >
            <X size={19} />
          </button>
        </div>


        <div className="p-8 space-y-6">
          <div className="bg-[#FDF0ED] border border-[#C8522A]/20 rounded-2xl p-6">
            <div className="text-xs font-bold text-[#C8522A] uppercase tracking-widest mb-3">
              優惠碼
            </div>

            <button
              type="button"
              onClick={() =>
                onCopy(
                  coupon.promotionCode
                )
              }
              className="flex items-center justify-between gap-4 w-full bg-white border border-[#E2DDD4] hover:border-[#C8522A] rounded-xl px-5 py-4 transition-colors"
            >
              <span className="text-xl font-mono font-black text-[#1A1A18]">
                {coupon.promotionCode}
              </span>

              {copied ===
              coupon.promotionCode ? (
                <Check
                  size={18}
                  className="text-[#C8522A]"
                />
              ) : (
                <Copy
                  size={18}
                  className="text-[#8C8880]"
                />
              )}
            </button>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#E2DDD4] rounded-2xl p-5">
              <div className="text-xs font-bold text-[#8C8880] mb-2">
                KOC
              </div>

              <div className="font-bold text-[#1A1A18]">
                {coupon.kocId}
              </div>
            </div>

            <div className="border border-[#E2DDD4] rounded-2xl p-5">
              <div className="text-xs font-bold text-[#8C8880] mb-2">
                活動
              </div>

              <div className="font-bold text-[#1A1A18]">
                {coupon.campaignName}
              </div>
            </div>

            <div className="border border-[#E2DDD4] rounded-2xl p-5">
              <div className="text-xs font-bold text-[#8C8880] mb-2">
                優惠碼狀態
              </div>

              <CouponBadge
                status={coupon.status}
              />
            </div>

            <div className="border border-[#E2DDD4] rounded-2xl p-5">
              <div className="text-xs font-bold text-[#8C8880] mb-2">
                任務階段
              </div>

              <MissionStageBadge
                stage={coupon.stage}
              />
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              icon={Ticket}
              label="折扣值"
              value={
                coupon.discountValue
                  ? `${coupon.discountValue}`
                  : '0'
              }
            />

            <SummaryCard
              icon={ShoppingBag}
              label="使用次數"
              value={coupon.usageCount}
            />

            <SummaryCard
              icon={Wallet}
              label="累積分潤"
              value={formatCurrency(
                coupon.totalCommission
              )}
            />
          </div>


          <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-5 text-xs font-bold text-[#8C8880]">
            優惠碼在文案審核通過前應維持「尚未啟用」；文案通過後，系統會自動將優惠碼設為啟用。
          </div>
        </div>


        <div className="px-8 py-5 border-t border-[#E2DDD4] bg-[#F8F9FA] flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-[#E2DDD4] bg-white text-sm font-bold text-[#1A1A18] hover:bg-[#F5F0E8]"
          >
            關閉
          </button>

          {canDisable && (
            <button
              type="button"
              disabled={updating}
              onClick={() =>
                onUpdateStatus(
                  coupon,
                  'disabled'
                )
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-red-200 bg-red-50 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
            >
              <PowerOff size={15} />
              停用優惠碼
            </button>
          )}

          {canActivate && (
            <button
              type="button"
              disabled={updating}
              onClick={() =>
                onUpdateStatus(
                  coupon,
                  'active'
                )
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A18] text-white text-sm font-bold hover:bg-[#C8522A] disabled:opacity-50"
            >
              {updating ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <Power size={15} />
              )}

              啟用優惠碼
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


export default function KocManagement() {
  const vendorId =
    localStorage.getItem('vendor_id')

  const [coupons, setCoupons] =
    useState([])

  const [search, setSearch] =
    useState('')

  const [
    statusFilter,
    setStatusFilter
  ] = useState('all')

  const [expanded, setExpanded] =
    useState({})

  const [copied, setCopied] =
    useState(null)

  const [
    selectedCoupon,
    setSelectedCoupon
  ] = useState(null)

  const [loading, setLoading] =
    useState(true)

  const [updating, setUpdating] =
    useState(false)

  const [error, setError] =
    useState('')


  useEffect(() => {
    async function loadCoupons() {
      if (!vendorId) {
        setError('尚未登入廠商帳號')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const response =
          await getVendorCouponUsage(
            vendorId,
            '',
            statusFilter === 'all'
              ? ''
              : statusFilter
          )

        if (
          response.data?.success ===
          false
        ) {
          throw new Error(
            response.data.err ||
            '優惠碼資料載入失敗'
          )
        }

        setCoupons(
          (
            response.data?.coupons ||
            []
          ).map(coupon => ({
            couponId:
              coupon.coupon_id,

            promotionCode:
              coupon.promotion_code,

            discountValue:
              Number(
                coupon.discount_value ||
                0
              ),

            status:
              coupon.status,

            usageCount:
              Number(
                coupon.usage_count || 0
              ),

            totalCommission:
              Number(
                coupon.total_commission ||
                0
              ),

            kocMissionId:
              coupon.kocmission_id,

            kocId:
              coupon.koc_id,

            stage:
              coupon.stage,

            applicationId:
              coupon.application_id,

            campaignId:
              coupon.campaign_id,

            campaignName:
              coupon.campaign_name ||
              '未命名活動'
          }))
        )
      } catch (error) {
        console.error(
          '優惠碼資料載入失敗：',
          error
        )

        const apiError =
          error.response?.data?.err

        setError(
          typeof apiError === 'string'
            ? apiError
            : apiError
              ? JSON.stringify(apiError)
              : error.message ||
                '優惠碼資料載入失敗'
        )
      } finally {
        setLoading(false)
      }
    }

    loadCoupons()
  }, [vendorId, statusFilter])


  const groupedKocs =
    useMemo(() => {
      const groupMap = {}

      coupons.forEach(coupon => {
        const kocId =
          coupon.kocId ||
          '未知 KOC'

        if (!groupMap[kocId]) {
          groupMap[kocId] = {
            kocId,
            name: kocId,
            coupons: [],
            totalUsage: 0,
            totalCommission: 0,
            activeCouponCount: 0
          }
        }

        groupMap[kocId].coupons.push(
          coupon
        )

        groupMap[kocId].totalUsage +=
          coupon.usageCount

        groupMap[
          kocId
        ].totalCommission +=
          coupon.totalCommission

        if (
          coupon.status === 'active'
        ) {
          groupMap[
            kocId
          ].activeCouponCount += 1
        }
      })

      return Object.values(
        groupMap
      ).filter(koc => {
        const keyword =
          search.trim().toLowerCase()

        if (!keyword) return true

        const matchesKoc =
          koc.kocId
            .toLowerCase()
            .includes(keyword)

        const matchesCoupon =
          koc.coupons.some(
            coupon =>
              coupon.promotionCode
                ?.toLowerCase()
                .includes(keyword) ||
              coupon.campaignName
                ?.toLowerCase()
                .includes(keyword)
          )

        return (
          matchesKoc ||
          matchesCoupon
        )
      })
    }, [coupons, search])


  const totals =
    useMemo(
      () => ({
        kocs:
          groupedKocs.length,

        coupons:
          coupons.length,

        usage:
          coupons.reduce(
            (sum, coupon) =>
              sum +
              coupon.usageCount,
            0
          ),

        commission:
          coupons.reduce(
            (sum, coupon) =>
              sum +
              coupon.totalCommission,
            0
          )
      }),
      [coupons, groupedKocs]
    )


  function toggleExpand(kocId) {
    setExpanded(previous => ({
      ...previous,
      [kocId]:
        !previous[kocId]
    }))
  }


  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(
        code
      )
    } catch {
      // 瀏覽器不支援時不阻擋操作
    }

    setCopied(code)

    setTimeout(() => {
      setCopied(null)
    }, 1500)
  }


  async function handleUpdateStatus(
    coupon,
    nextStatus
  ) {
    const actionLabel =
      nextStatus === 'active'
        ? '啟用'
        : nextStatus === 'disabled'
          ? '停用'
          : '設為尚未啟用'

    const confirmed =
      window.confirm(
        `確定要${actionLabel}優惠碼「${coupon.promotionCode}」嗎？`
      )

    if (!confirmed) return

    try {
      setUpdating(true)
      setError('')

      const response =
        await updateVendorCouponStatus({
          vendor_id:
            vendorId,

          coupon_id:
            coupon.couponId,

          status:
            nextStatus
        })

      if (
        response.data?.success ===
        false
      ) {
        throw new Error(
          response.data.err ||
          '優惠碼狀態更新失敗'
        )
      }

      const updatedStatus =
        response.data?.status ||
        nextStatus

      setCoupons(previous =>
        previous.map(item =>
          item.couponId ===
          coupon.couponId
            ? {
                ...item,
                status:
                  updatedStatus
              }
            : item
        )
      )

      setSelectedCoupon(previous =>
        previous &&
        previous.couponId ===
          coupon.couponId
          ? {
              ...previous,
              status:
                updatedStatus
            }
          : previous
      )

      alert(
        `優惠碼已${actionLabel}`
      )
    } catch (error) {
      const apiError =
        error.response?.data?.err

      alert(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : error.message ||
              '優惠碼狀態更新失敗'
      )
    } finally {
      setUpdating(false)
    }
  }


  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-flex items-center gap-2 text-sm font-bold text-[#8C8880]">
          <Loader2
            size={18}
            className="animate-spin"
          />

          KOC 與優惠碼資料載入中...
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Users}
          label="KOC 數量"
          value={totals.kocs}
        />

        <SummaryCard
          icon={Ticket}
          label="優惠碼數量"
          value={totals.coupons}
        />

        <SummaryCard
          icon={ShoppingBag}
          label="使用次數"
          value={totals.usage}
        />

        <SummaryCard
          icon={Wallet}
          label="累積分潤"
          value={formatCurrency(
            totals.commission
          )}
        />
      </div>


      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2 p-1 bg-[#E2DDD4]/30 rounded-full overflow-x-auto">
          {couponStatusFilters.map(
            status => (
              <button
                key={status}
                type="button"
                onClick={() =>
                  setStatusFilter(
                    status
                  )
                }
                className={cn(
                  `
                    px-5 py-2 rounded-full
                    text-sm font-bold
                    whitespace-nowrap
                    transition-all
                  `,
                  statusFilter ===
                    status
                    ? 'bg-[#1A1A18] text-white shadow-sm'
                    : 'text-[#8C8880] hover:text-[#1A1A18]'
                )}
              >
                {
                  couponStatusLabels[
                    status
                  ]
                }
              </button>
            )
          )}
        </div>


        <div className="flex items-center gap-3 bg-white border border-[#E2DDD4] rounded-full px-5 py-2.5 w-full sm:w-72 sm:ml-auto focus-within:border-[#C8522A] shadow-sm">
          <Search
            size={16}
            className="text-[#8C8880]"
          />

          <input
            value={search}
            onChange={event =>
              setSearch(
                event.target.value
              )
            }
            placeholder="搜尋 KOC、活動或優惠碼…"
            className="bg-transparent text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none w-full font-bold"
          />
        </div>
      </div>


      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm font-bold text-red-600">
          {error}
        </div>
      )}


      <div className="bg-white rounded-[2rem] border border-[#E2DDD4] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                {[
                  'KOC',
                  '參與任務',
                  '優惠碼',
                  '總使用次數',
                  '累積分潤',
                  '推廣狀態',
                  ''
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
              {groupedKocs.length >
              0 ? (
                groupedKocs.map(koc => {
                  const isExpanded =
                    expanded[koc.kocId]

                  return (
                    <React.Fragment
                      key={koc.kocId}
                    >
                      <tr
                        onClick={() =>
                          toggleExpand(
                            koc.kocId
                          )
                        }
                        className={cn(
                          `
                            cursor-pointer
                            transition-colors
                            hover:bg-[#F8F9FA]
                          `,
                          isExpanded
                            ? 'bg-[#F5F0E8]/50'
                            : ''
                        )}
                      >
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <Avatar
                              name={koc.name}
                              size="sm"
                            />

                            <div>
                              <div className="text-sm font-bold text-[#1A1A18]">
                                {koc.name}
                              </div>

                              <div className="text-[10px] font-bold text-[#8C8880] font-mono mt-1">
                                {koc.kocId}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-5">
                          <span className="px-3 py-1.5 rounded-md font-bold text-xs bg-[#FDF0ED] text-[#C8522A]">
                            {
                              koc.coupons
                                .length
                            }
                            {' '}
                            個任務
                          </span>
                        </td>

                        <td className="p-5 text-sm font-black text-[#1A1A18]">
                          {
                            koc.coupons
                              .length
                          }
                        </td>

                        <td className="p-5 text-sm font-black text-[#1A1A18]">
                          {
                            koc.totalUsage
                          }
                        </td>

                        <td className="p-5 text-sm font-black text-[#C8522A]">
                          {formatCurrency(
                            koc.totalCommission
                          )}
                        </td>

                        <td className="p-5">
                          <span
                            className={cn(
                              `
                                inline-flex items-center
                                px-3 py-1.5
                                rounded-full
                                text-[11px] font-bold
                              `,
                              koc.activeCouponCount >
                                0
                                ? 'bg-[#FDF0ED] text-[#C8522A]'
                                : 'bg-[#F5F0E8] text-[#8C8880]'
                            )}
                          >
                            {koc.activeCouponCount >
                            0
                              ? '推廣中'
                              : '未推廣'}
                          </span>
                        </td>

                        <td className="p-5 text-[#8C8880]">
                          <div className="p-1.5 rounded-full w-fit hover:bg-[#E2DDD4]">
                            {isExpanded ? (
                              <ChevronUp
                                size={16}
                              />
                            ) : (
                              <ChevronDown
                                size={16}
                              />
                            )}
                          </div>
                        </td>
                      </tr>


                      {isExpanded &&
                        koc.coupons.map(
                          coupon => (
                            <tr
                              key={
                                coupon.couponId
                              }
                              className="bg-[#F8F9FA]/80"
                            >
                              <td className="p-4 pl-20">
                                <div className="text-xs font-bold text-[#1A1A18]">
                                  {
                                    coupon.campaignName
                                  }
                                </div>

                                <div className="text-[10px] font-mono text-[#8C8880] mt-1">
                                  任務 #
                                  {
                                    coupon.kocMissionId
                                  }
                                </div>
                              </td>

                              <td className="p-4">
                                <MissionStageBadge
                                  stage={
                                    coupon.stage
                                  }
                                />
                              </td>

                              <td className="p-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedCoupon(
                                      coupon
                                    )
                                  }
                                  className="flex items-center justify-between gap-3 bg-white border border-[#E2DDD4] hover:border-[#C8522A] rounded-xl px-4 py-2 text-xs font-mono font-bold text-[#1A1A18] transition-all shadow-sm"
                                >
                                  <span>
                                    {
                                      coupon.promotionCode
                                    }
                                  </span>

                                  <Ticket
                                    size={14}
                                    className="text-[#C8522A]"
                                  />
                                </button>
                              </td>

                              <td className="p-4 text-sm font-bold text-[#1A1A18]">
                                {
                                  coupon.usageCount
                                }
                              </td>

                              <td className="p-4 text-sm font-black text-[#C8522A]">
                                {formatCurrency(
                                  coupon.totalCommission
                                )}
                              </td>

                              <td className="p-4">
                                <CouponBadge
                                  status={
                                    coupon.status
                                  }
                                />
                              </td>

                              <td className="p-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedCoupon(
                                      coupon
                                    )
                                  }
                                  className="text-xs font-bold text-[#C8522A] hover:underline"
                                >
                                  查看詳情
                                </button>
                              </td>
                            </tr>
                          )
                        )}
                    </React.Fragment>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="py-20 text-center text-sm font-bold text-[#8C8880]"
                  >
                    目前沒有符合條件的 KOC 或優惠碼資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      <CouponDetailModal
        coupon={selectedCoupon}
        updating={updating}
        copied={copied}
        onCopy={copyCode}
        onClose={() =>
          setSelectedCoupon(null)
        }
        onUpdateStatus={
          handleUpdateStatus
        }
      />
    </div>
  )
}