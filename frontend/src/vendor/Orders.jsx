import React, { useEffect, useMemo, useState } from 'react'
import {
  X,
  Package,
  CreditCard,
  Truck,
  User,
  Ticket,
  Loader2,
  ChevronRight,
  AlertTriangle
} from 'lucide-react'

import {
  getVendorOrders,
  getVendorOrderDetail,
  updateVendorShipping
} from '../api/vendor'

import {
  formatCurrency,
  cn
} from './lib/utils'

import { useToast } from './components/ui/Toast'
import { useConfirm } from './components/ui/ConfirmDialog'


const shippingFilters = [
  'all',
  'unshipped',
  'preparing',
  'shipped',
  'delivered',
  'cancelled'
]


const shippingLabels = {
  all: '全部',
  unshipped: '待出貨',
  preparing: '備貨中',
  shipped: '已出貨',
  delivered: '已送達',
  cancelled: '已取消'
}


const paymentLabels = {
  pending: '待付款',
  unpaid: '未付款',
  paid: '已付款',
  failed: '付款失敗',
  refunded: '已退款',
  cancelled: '已取消'
}


const orderLabels = {
  pending: '待處理',
  processing: '處理中',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款',
  paid: '已付款'
}


function Card({
  children,
  className = ''
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-[1.5rem] border border-[#E2DDD4] shadow-sm',
        className
      )}
    >
      {children}
    </div>
  )
}


function Button({
  variant = 'default',
  className,
  children,
  ...props
}) {
  const variants = {
    brand:
      'bg-[#1A1A18] text-white hover:bg-[#C8522A]',

    outline:
      'border border-[#E2DDD4] bg-white text-[#1A1A18] hover:bg-[#F8F9FA]',

    danger:
      'border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white',

    default:
      'bg-[#F5F0E8] text-[#1A1A18] hover:bg-[#E2DDD4]'
  }

  return (
    <button
      type="button"
      className={cn(
        `
          inline-flex items-center justify-center
          px-4 py-2 rounded-full
          text-sm font-bold transition-all
          disabled:opacity-50
          disabled:cursor-not-allowed
        `,
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}


function ShippingBadge({
  status
}) {
  const config = {
    unshipped: {
      label: '待出貨',
      cls:
        'bg-[#FDF0ED] text-[#C8522A]',
      dot:
        'bg-[#C8522A]'
    },

    preparing: {
      label: '備貨中',
      cls:
        'bg-[#FFF8E7] text-[#9A6700]',
      dot:
        'bg-[#9A6700]'
    },

    shipped: {
      label: '已出貨',
      cls:
        'bg-[#F5F0E8] text-[#1A1A18]',
      dot:
        'bg-[#1A1A18]'
    },

    delivered: {
      label: '已送達',
      cls:
        'bg-green-50 text-green-700',
      dot:
        'bg-green-600'
    },

    cancelled: {
      label: '已取消',
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


function PaymentBadge({
  status
}) {
  const isPaid =
    status === 'paid'

  return (
    <span
      className={cn(
        `
          inline-flex items-center
          px-2.5 py-1 rounded-full
          text-[11px] font-bold
        `,
        isPaid
          ? 'bg-green-50 text-green-700'
          : 'bg-[#F8F9FA] text-[#8C8880]'
      )}
    >
      {paymentLabels[status] ||
        status ||
        '未知'}
    </span>
  )
}


function OrderDetailModal({
  order,
  open,
  loading,
  updating,
  onClose,
  onUpdateShipping
}) {
  const [
    nextShippingStatus,
    setNextShippingStatus
  ] = useState('')


  useEffect(() => {
    setNextShippingStatus(
      order?.shippingStatus || ''
    )
  }, [order])


  if (!open) return null


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#1A1A18]/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-[2rem] shadow-2xl border border-[#E2DDD4]">
        <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-6 bg-[#F8F9FA] border-b border-[#E2DDD4]">
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#1A1A18]">
              訂單詳細資料
            </h2>

            <div className="text-xs font-mono font-bold text-[#8C8880] mt-1">
              {order?.orderId || '讀取中'}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[#8C8880] hover:bg-[#E2DDD4] hover:text-[#1A1A18]"
          >
            <X size={20} />
          </button>
        </div>


        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-[#8C8880]">
              <Loader2
                size={18}
                className="animate-spin"
              />
              訂單詳細資料載入中...
            </div>
          </div>
        ) : order ? (
          <div className="px-8 py-7 space-y-7">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#8C8880] mb-3">
                  <User size={15} />
                  顧客
                </div>

                <div className="text-sm font-bold text-[#1A1A18]">
                  {order.userId
                    ? `會員 ${order.userId}`
                    : order.guestId
                      ? `訪客 ${order.guestId}`
                      : '一般顧客'}
                </div>
              </Card>


              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#8C8880] mb-3">
                  <CreditCard size={15} />
                  付款狀態
                </div>

                <PaymentBadge
                  status={order.paymentStatus}
                />
              </Card>


              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#8C8880] mb-3">
                  <Truck size={15} />
                  出貨狀態
                </div>

                <ShippingBadge
                  status={order.shippingStatus}
                />
              </Card>
            </div>


            <Card className="overflow-hidden">
              <div className="px-6 py-4 bg-[#F8F9FA] border-b border-[#E2DDD4]">
                <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A18]">
                  <Package size={17} />
                  商品明細
                </div>
              </div>

              <div className="divide-y divide-[#E2DDD4]">
                {(order.items || []).map(
                  item => (
                    <div
                      key={item.orderItemId}
                      className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-5 items-center"
                    >
                      <div>
                        <div className="text-sm font-bold text-[#1A1A18]">
                          {item.productName}
                        </div>

                        <div className="text-xs text-[#8C8880] mt-1">
                          商品編號：
                          {item.productId}
                        </div>
                      </div>

                      <div className="text-sm text-[#8C8880]">
                        {formatCurrency(
                          item.unitPrice
                        )}
                      </div>

                      <div className="text-sm font-bold text-[#1A1A18]">
                        × {item.quantity}
                      </div>

                      <div className="text-sm font-black text-[#C8522A]">
                        {formatCurrency(
                          item.subtotal
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </Card>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card className="p-6">
                <div className="flex items-center gap-2 text-xs font-bold text-[#8C8880] uppercase tracking-wider mb-4">
                  <Ticket size={15} />
                  優惠碼
                </div>

                {order.promotionCode ? (
                  <div>
                    <div className="inline-flex px-3 py-2 rounded-xl bg-[#FDF0ED] text-[#C8522A] font-mono font-bold text-sm">
                      {order.promotionCode}
                    </div>

                    <div className="text-xs text-[#8C8880] mt-3">
                      此訂單透過 KOC
                      或活動優惠碼完成
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-bold text-[#8C8880]">
                    未使用優惠碼
                  </div>
                )}
              </Card>


              <Card className="p-6">
                <div className="text-xs font-bold text-[#8C8880] uppercase tracking-wider mb-4">
                  金額摘要
                </div>

                <div className="flex items-end justify-between">
                  <span className="text-sm font-bold text-[#8C8880]">
                    訂單總金額
                  </span>

                  <span className="text-2xl font-black text-[#C8522A]">
                    {formatCurrency(
                      order.totalAmount
                    )}
                  </span>
                </div>
              </Card>
            </div>


            {order.payment && (
              <Card className="p-6">
                <div className="text-sm font-bold text-[#1A1A18] mb-4">
                  付款資訊
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-xs font-bold text-[#8C8880] mb-1">
                      付款方式
                    </div>

                    <div className="font-bold text-[#1A1A18]">
                      {order.payment.paymentMethod ||
                        '—'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-[#8C8880] mb-1">
                      付款狀態
                    </div>

                    <div className="font-bold text-[#1A1A18]">
                      {paymentLabels[
                        order.payment.paymentStatus
                      ] ||
                        order.payment
                          .paymentStatus ||
                        '—'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-[#8C8880] mb-1">
                      交易編號
                    </div>

                    <div className="font-mono font-bold text-[#1A1A18] break-all">
                      {order.payment
                        .transactionId || '—'}
                    </div>
                  </div>
                </div>
              </Card>
            )}


            <Card className="p-6">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A18] mb-4">
                <Truck size={17} />
                收件資訊
              </div>

              {order.shippingInfo?.address ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs font-bold text-[#8C8880] mb-1">
                      收件人
                    </div>

                    <div className="font-bold text-[#1A1A18]">
                      {order.shippingInfo.recipientName || '—'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-[#8C8880] mb-1">
                      聯絡電話
                    </div>

                    <div className="font-bold text-[#1A1A18]">
                      {order.shippingInfo.recipientPhone || '—'}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-xs font-bold text-[#8C8880] mb-1">
                      收件地址
                    </div>

                    <div className="font-bold text-[#1A1A18]">
                      {order.shippingInfo.address.postalCode && (
                        <span className="font-mono text-[#8C8880] mr-1">
                          {order.shippingInfo.address.postalCode}
                        </span>
                      )}
                      {order.shippingInfo.address.city}
                      {order.shippingInfo.address.district}
                      {order.shippingInfo.address.detailAddress}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-[#FDF0ED] text-[#C8522A] rounded-xl px-4 py-3 text-sm font-bold">
                  此訂單尚未留有收件地址，請先聯繫顧客確認後再安排出貨
                </div>
              )}
            </Card>


            <Card className="p-6">
              <div className="text-sm font-bold text-[#1A1A18] mb-4">
                更新出貨狀態
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <select
                  value={nextShippingStatus}
                  onChange={event =>
                    setNextShippingStatus(
                      event.target.value
                    )
                  }
                  className="flex-1 bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm font-bold text-[#1A1A18] outline-none focus:border-[#C8522A]"
                >
                  <option value="unshipped">
                    待出貨
                  </option>

                  <option value="preparing">
                    備貨中
                  </option>

                  <option value="shipped">
                    已出貨
                  </option>

                  <option value="delivered">
                    已送達
                  </option>

                  <option value="cancelled">
                    已取消
                  </option>
                </select>

                <Button
                  variant="brand"
                  disabled={
                    updating ||
                    !nextShippingStatus ||
                    nextShippingStatus ===
                      order.shippingStatus
                  }
                  onClick={() =>
                    onUpdateShipping(
                      nextShippingStatus
                    )
                  }
                  className="px-7 gap-2"
                >
                  {updating && (
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />
                  )}

                  儲存出貨狀態
                </Button>
              </div>
            </Card>


            <div className="text-xs text-[#8C8880] text-right">
              建立時間：
              {order.createdAt
                ? new Date(
                    order.createdAt
                  ).toLocaleString('zh-TW')
                : '—'}
            </div>
          </div>
        ) : (
          <div className="py-24 text-center text-sm font-bold text-[#8C8880]">
            找不到訂單資料
          </div>
        )}
      </div>
    </div>
  )
}


export default function Orders() {
  const { toast } = useToast()
  const confirm = useConfirm()

  const vendorId =
    localStorage.getItem('vendor_id')

  const [orders, setOrders] =
    useState([])

  const [filter, setFilter] =
    useState('all')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    selectedOrder,
    setSelectedOrder
  ] = useState(null)

  const [
    detailLoading,
    setDetailLoading
  ] = useState(false)

  const [
    shippingUpdating,
    setShippingUpdating
  ] = useState(false)

  const [selectedOrderIds, setSelectedOrderIds] =
    useState([])

  const [bulkStatus, setBulkStatus] =
    useState('preparing')

  const [bulkUpdating, setBulkUpdating] =
    useState(false)


  useEffect(() => {
    async function loadOrders() {
      if (!vendorId) {
        setError('尚未登入廠商帳號')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const response =
          await getVendorOrders(
            vendorId
          )

        if (
          response.data?.success ===
          false
        ) {
          throw new Error(
            response.data.err ||
            '訂單載入失敗'
          )
        }

        const orderData =
          response.data?.orders || []

        setOrders(
          orderData.map(order => ({
            orderId:
              order.order_id,

            userId:
              order.user_id,

            guestId:
              order.guest_id,

            promotionCode:
              order.promotion_code || '',

            totalAmount:
              Number(
                order.total_amount || 0
              ),

            orderStatus:
              order.order_status,

            paymentStatus:
              order.payment_status,

            shippingStatus:
              order.shipping_status,

            hasAddress:
              Boolean(order.has_address),

            createdAt:
              order.created_at,

            items:
              (order.items || []).map(
                item => ({
                  orderItemId:
                    item.order_item_id,

                  productId:
                    item.product_id,

                  productName:
                    item.product_name,

                  quantity:
                    Number(
                      item.quantity || 0
                    ),

                  unitPrice:
                    Number(
                      item.unit_price || 0
                    ),

                  subtotal:
                    Number(
                      item.subtotal || 0
                    ),

                  applyStatus:
                    item.apply_status
                })
              )
          }))
        )
      } catch (error) {
        console.error(
          '訂單載入失敗：',
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
                '訂單載入失敗'
        )
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [vendorId])


  useEffect(() => {
    setSelectedOrderIds([])
  }, [filter])


  const filteredOrders =
    useMemo(() => {
      const base =
        filter === 'all'
          ? orders
          : orders.filter(
              order =>
                order.shippingStatus ===
                filter
            )

      return [...base].sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      )
    }, [orders, filter])


  const totalAmount =
    useMemo(
      () =>
        filteredOrders.reduce(
          (sum, order) =>
            sum +
            Number(
              order.totalAmount || 0
            ),
          0
        ),
      [filteredOrders]
    )


  async function handleOpenOrder(
    order
  ) {
    try {
      setSelectedOrder(order)
      setDetailLoading(true)
      setError('')

      const response =
        await getVendorOrderDetail(
          vendorId,
          order.orderId
        )

      if (
        response.data?.success ===
        false
      ) {
        throw new Error(
          response.data.err ||
          '訂單詳細資料載入失敗'
        )
      }

      const detail =
        response.data.order

      setSelectedOrder({
        orderId:
          detail.order_id,

        userId:
          detail.user_id,

        guestId:
          detail.guest_id,

        promotionCode:
          detail.promotion_code || '',

        totalAmount:
          Number(
            detail.total_amount || 0
          ),

        orderStatus:
          detail.order_status,

        paymentStatus:
          detail.payment_status,

        shippingStatus:
          detail.shipping_status,

        addressId:
          detail.address_id,

        shippingInfo:
          detail.shipping_info
            ? {
                recipientName:
                  detail.shipping_info.recipient_name || '',

                recipientPhone:
                  detail.shipping_info.recipient_phone || '',

                address:
                  detail.shipping_info.address
                    ? {
                        city:
                          detail.shipping_info.address.city || '',

                        district:
                          detail.shipping_info.address.district || '',

                        detailAddress:
                          detail.shipping_info.address.detail_address || '',

                        postalCode:
                          detail.shipping_info.address.postal_code || ''
                      }
                    : null
              }
            : null,

        createdAt:
          detail.created_at,

        items:
          (detail.items || []).map(
            item => ({
              orderItemId:
                item.order_item_id,

              productId:
                item.product_id,

              productName:
                item.product_name,

              quantity:
                Number(
                  item.quantity || 0
                ),

              unitPrice:
                Number(
                  item.unit_price || 0
                ),

              subtotal:
                Number(
                  item.subtotal || 0
                ),

              applyStatus:
                item.apply_status
            })
          ),

        payment:
          detail.payment
            ? {
                paymentId:
                  detail.payment
                    .payment_id,

                paymentMethod:
                  detail.payment
                    .payment_method,

                paymentStatus:
                  detail.payment
                    .payment_status,

                transactionId:
                  detail.payment
                    .transaction_id,

                promotionCode:
                  detail.payment
                    .promotion_code
              }
            : null
      })
    } catch (error) {
      const apiError =
        error.response?.data?.err

      setError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : error.message ||
              '訂單詳細資料載入失敗'
      )

      setSelectedOrder(null)
    } finally {
      setDetailLoading(false)
    }
  }


  async function handleUpdateShipping(
    shippingStatus
  ) {
    if (!selectedOrder) return

    const confirmed = await confirm({
      title: `將出貨狀態改為「${shippingLabels[shippingStatus]}」？`,
      confirmText: '確認更新',
    })

    if (!confirmed) return

    try {
      setShippingUpdating(true)

      const response =
        await updateVendorShipping({
          vendor_id:
            vendorId,

          order_id:
            selectedOrder.orderId,

          shipping_status:
            shippingStatus
        })

      if (
        response.data?.success ===
        false
      ) {
        throw new Error(
          response.data.err ||
          '更新出貨狀態失敗'
        )
      }

      const updatedStatus =
        response.data
          ?.shipping_status ||
        shippingStatus

      setOrders(previous =>
        previous.map(order =>
          order.orderId ===
          selectedOrder.orderId
            ? {
                ...order,
                shippingStatus:
                  updatedStatus
              }
            : order
        )
      )

      setSelectedOrder(previous =>
        previous
          ? {
              ...previous,
              shippingStatus:
                updatedStatus
            }
          : previous
      )

      toast.success('出貨狀態已更新')
    } catch (error) {
      const apiError =
        error.response?.data?.err

      toast.error(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : error.message ||
              '更新出貨狀態失敗'
      )
    } finally {
      setShippingUpdating(false)
    }
  }


  function toggleSelectOrder(orderId) {
    setSelectedOrderIds(previous =>
      previous.includes(orderId)
        ? previous.filter(id => id !== orderId)
        : [...previous, orderId]
    )
  }

  function toggleSelectAll(event) {
    if (event.target.checked) {
      setSelectedOrderIds(
        filteredOrders.map(order => order.orderId)
      )
    } else {
      setSelectedOrderIds([])
    }
  }

  async function handleBulkUpdateShipping() {
    if (selectedOrderIds.length === 0) return

    const confirmed = await confirm({
      title: `批次更新 ${selectedOrderIds.length} 筆訂單？`,
      description: `出貨狀態將改為「${shippingLabels[bulkStatus]}」。`,
      confirmText: '確認更新',
    })

    if (!confirmed) return

    try {
      setBulkUpdating(true)

      const results = await Promise.allSettled(
        selectedOrderIds.map(orderId =>
          updateVendorShipping({
            vendor_id: vendorId,
            order_id: orderId,
            shipping_status: bulkStatus
          })
        )
      )

      const succeededIds = []
      let failedCount = 0

      results.forEach((result, index) => {
        const orderId = selectedOrderIds[index]

        if (
          result.status === 'fulfilled' &&
          result.value?.data?.success !== false
        ) {
          succeededIds.push(orderId)
        } else {
          failedCount += 1
        }
      })

      setOrders(previous =>
        previous.map(order =>
          succeededIds.includes(order.orderId)
            ? { ...order, shippingStatus: bulkStatus }
            : order
        )
      )

      setSelectedOrderIds([])

      if (failedCount === 0) {
        toast.success(`已更新 ${succeededIds.length} 筆訂單的出貨狀態`)
      } else {
        toast.error(`已更新 ${succeededIds.length} 筆，${failedCount} 筆更新失敗，請個別確認`)
      }
    } finally {
      setBulkUpdating(false)
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

          訂單載入中...
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2 p-1 bg-[#E2DDD4]/30 rounded-full overflow-x-auto">
          {shippingFilters.map(
            status => (
              <button
                key={status}
                type="button"
                onClick={() =>
                  setFilter(status)
                }
                className={cn(
                  `
                    px-5 py-2 rounded-full
                    text-sm font-bold
                    whitespace-nowrap
                    transition-all
                  `,
                  filter === status
                    ? 'bg-[#1A1A18] text-white shadow-sm'
                    : 'text-[#8C8880] hover:text-[#1A1A18]'
                )}
              >
                {
                  shippingLabels[
                    status
                  ]
                }
              </button>
            )
          )}
        </div>


        <div className="bg-white border border-[#E2DDD4] px-6 py-2.5 rounded-full shadow-sm text-sm font-bold text-[#8C8880] flex items-center gap-2">
          共
          <span className="text-[#1A1A18]">
            {filteredOrders.length}
          </span>
          筆訂單

          <span className="w-1 h-1 bg-[#E2DDD4] rounded-full mx-2" />

          總計
          <span className="text-[#C8522A] text-lg tracking-tight ml-1">
            {formatCurrency(
              totalAmount
            )}
          </span>
        </div>
      </div>


      {selectedOrderIds.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap bg-[#FDF0ED] border border-[#C8522A]/20 rounded-2xl px-6 py-4">
          <span className="text-sm font-bold text-[#C8522A]">
            已選取 {selectedOrderIds.length} 筆訂單
          </span>

          <select
            value={bulkStatus}
            onChange={event => setBulkStatus(event.target.value)}
            className="bg-white border border-[#E2DDD4] rounded-xl px-4 py-2 text-sm font-bold text-[#1A1A18] outline-none focus:border-[#C8522A]"
          >
            {shippingFilters
              .filter(status => status !== 'all')
              .map(status => (
                <option key={status} value={status}>
                  批次改為「{shippingLabels[status]}」
                </option>
              ))}
          </select>

          <Button
            variant="brand"
            disabled={bulkUpdating}
            onClick={handleBulkUpdateShipping}
            className="gap-2"
          >
            {bulkUpdating && (
              <Loader2 size={15} className="animate-spin" />
            )}
            套用
          </Button>

          <button
            type="button"
            onClick={() => setSelectedOrderIds([])}
            className="text-xs font-bold text-[#8C8880] hover:text-[#1A1A18] ml-auto"
          >
            取消選取
          </button>
        </div>
      )}


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
                <th className="p-5 pl-6 w-10">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={
                      filteredOrders.length > 0 &&
                      selectedOrderIds.length === filteredOrders.length
                    }
                    className="w-4 h-4 rounded border-[#E2DDD4] text-[#C8522A] focus:ring-[#C8522A] cursor-pointer accent-[#C8522A]"
                  />
                </th>

                {[
                  '訂單編號',
                  '顧客',
                  '優惠碼',
                  '商品',
                  '金額',
                  '付款狀態',
                  '出貨狀態',
                  '日期',
                  ''
                ].map(
                  (header, index) => (
                    <th
                      key={`${header}-${index}`}
                      className="p-5 text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap"
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>


            <tbody className="divide-y divide-[#E2DDD4]">
              {filteredOrders.length >
              0 ? (
                filteredOrders.map(
                  order => {
                    const productSummary =
                      order.items
                        .map(
                          item =>
                            item.productName
                        )
                        .join('、')

                    return (
                      <tr
                        key={order.orderId}
                        onClick={() =>
                          handleOpenOrder(
                            order
                          )
                        }
                        className="hover:bg-[#F8F9FA] transition-colors cursor-pointer group"
                      >
                        <td
                          className="p-5 pl-6"
                          onClick={event => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(order.orderId)}
                            onChange={() => toggleSelectOrder(order.orderId)}
                            className="w-4 h-4 rounded border-[#E2DDD4] text-[#C8522A] focus:ring-[#C8522A] cursor-pointer accent-[#C8522A]"
                          />
                        </td>

                        <td className="p-5 text-sm font-mono font-medium text-[#8C8880]">
                          {order.orderId}
                        </td>

                        <td className="p-5 text-sm">
                          {order.userId ? (
                            <div>
                              <div className="font-bold text-[#1A1A18]">
                                會員
                              </div>

                              <div className="text-[10px] text-[#8C8880] font-mono mt-1">
                                {
                                  order.userId
                                }
                              </div>
                            </div>
                          ) : order.guestId ? (
                            <div>
                              <div className="font-bold text-[#1A1A18]">
                                訪客
                              </div>

                              <div className="text-[10px] text-[#8C8880] font-mono mt-1">
                                {
                                  order.guestId
                                }
                              </div>
                            </div>
                          ) : (
                            <span className="font-medium text-[#8C8880] bg-[#F5F0E8] px-2 py-1 rounded-md text-xs">
                              一般顧客
                            </span>
                          )}
                        </td>

                        <td className="p-5">
                          {order.promotionCode ? (
                            <span className="text-xs font-mono font-bold text-[#C8522A] bg-[#FDF0ED] px-3 py-1.5 rounded-lg whitespace-nowrap">
                              {
                                order.promotionCode
                              }
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-[#8C8880]">
                              無
                            </span>
                          )}
                        </td>

                        <td className="p-5 text-sm font-medium text-[#8C8880] max-w-[220px]">
                          <div className="line-clamp-2">
                            {productSummary ||
                              '—'}
                          </div>

                          {order.items.length >
                            1 && (
                            <div className="text-[10px] font-bold text-[#C8522A] mt-1">
                              共
                              {
                                order.items
                                  .length
                              }
                              項商品
                            </div>
                          )}
                        </td>

                        <td className="p-5 text-sm font-black text-[#1A1A18]">
                          {formatCurrency(
                            order.totalAmount
                          )}
                        </td>

                        <td className="p-5">
                          <PaymentBadge
                            status={
                              order.paymentStatus
                            }
                          />
                        </td>

                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <ShippingBadge
                              status={
                                order.shippingStatus
                              }
                            />

                            {!order.hasAddress &&
                              order.shippingStatus !== 'cancelled' && (
                                <span title="尚無收件地址">
                                  <AlertTriangle
                                    size={14}
                                    className="text-[#C8522A]"
                                  />
                                </span>
                              )}
                          </div>
                        </td>

                        <td className="p-5 text-sm font-medium text-[#8C8880] whitespace-nowrap">
                          {order.createdAt
                            ? new Date(
                                order.createdAt
                              ).toLocaleDateString(
                                'zh-TW'
                              )
                            : '—'}
                        </td>

                        <td className="p-5">
                          <ChevronRight
                            size={17}
                            className="text-[#8C8880] group-hover:text-[#C8522A]"
                          />
                        </td>
                      </tr>
                    )
                  }
                )
              ) : (
                <tr>
                  <td
                    colSpan={10}
                    className="py-20 text-center text-sm font-bold text-[#8C8880]"
                  >
                    目前沒有符合狀態的訂單記錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      <OrderDetailModal
        open={Boolean(selectedOrder)}
        order={selectedOrder}
        loading={detailLoading}
        updating={shippingUpdating}
        onClose={() =>
          setSelectedOrder(null)
        }
        onUpdateShipping={
          handleUpdateShipping
        }
      />
    </div>
  )
}