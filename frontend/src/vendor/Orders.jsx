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
  AlertTriangle,
  MapPin,
  Store
} from 'lucide-react'

import {
  getVendorOrders,
  getVendorOrderDetail,
  updateVendorShipping,
  createVendorLogistics,
  queryVendorLogistics,
  getVendorReturns,
  reviewVendorReturn,
  confirmVendorReturnReceived,
  processVendorReturnRefund
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
  logisticsCreating,
  logisticsQuerying,
  onClose,
  onUpdateShipping,
  onCreateLogistics,
  onQueryLogistics
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
              <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A18] mb-5">
                <Truck size={17} />
                配送與收件資訊
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                <div>
                  <div className="text-xs font-bold text-[#8C8880] mb-1">
                    收件人
                  </div>

                  <div className="font-bold text-[#1A1A18]">
                    {order.shippingInfo?.recipientName || '—'}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-[#8C8880] mb-1">
                    聯絡電話
                  </div>

                  <div className="font-bold text-[#1A1A18]">
                    {order.shippingInfo?.recipientPhone || '—'}
                  </div>
                </div>

                {order.shipment?.logisticsType === 'CVS' ? (
                  <>
                    <div>
                      <div className="text-xs font-bold text-[#8C8880] mb-1">
                        配送方式
                      </div>

                      <div className="font-bold text-[#1A1A18] flex items-center gap-2">
                        <Store size={15} className="text-[#C8522A]" />
                        {order.shipment.logisticsSubType === 'UNIMARTC2C'
                          ? '7-ELEVEN 超商取貨'
                          : '超商取貨'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-[#8C8880] mb-1">
                        取貨門市
                      </div>

                      <div className="font-bold text-[#1A1A18]">
                        {order.shipment.storeName || '—'}
                        {order.shipment.storeId && (
                          <span className="ml-2 text-xs font-mono text-[#8C8880]">
                            ({order.shipment.storeId})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-xs font-bold text-[#8C8880] mb-1">
                        門市地址
                      </div>

                      <div className="font-bold text-[#1A1A18] flex items-start gap-2">
                        <MapPin size={15} className="mt-0.5 shrink-0 text-[#C8522A]" />
                        {order.shipment.storeAddress || '—'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2">
                    <div className="text-xs font-bold text-[#8C8880] mb-1">
                      宅配地址
                    </div>

                    {order.shippingInfo?.address ? (
                      <div className="font-bold text-[#1A1A18] flex items-start gap-2">
                        <MapPin size={15} className="mt-0.5 shrink-0 text-[#C8522A]" />
                        <span>
                          {order.shippingInfo.address.postalCode && (
                            <span className="font-mono text-[#8C8880] mr-1">
                              {order.shippingInfo.address.postalCode}
                            </span>
                          )}
                          {order.shippingInfo.address.city}
                          {order.shippingInfo.address.district}
                          {order.shippingInfo.address.detailAddress}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#FDF0ED] text-[#C8522A] rounded-xl px-4 py-3 font-bold">
                        此宅配訂單尚未留有配送地址
                      </div>
                    )}
                  </div>
                )}

                {order.shipment?.merchantTradeNo && (
                  <div>
                    <div className="text-xs font-bold text-[#8C8880] mb-1">
                      平台物流交易編號
                    </div>

                    <div className="font-mono font-bold text-[#1A1A18] break-all">
                      {order.shipment.merchantTradeNo}
                    </div>
                  </div>
                )}

                {order.shipment?.ecpayLogisticsId && (
                  <div>
                    <div className="text-xs font-bold text-[#8C8880] mb-1">
                      綠界物流編號
                    </div>

                    <div className="font-mono font-bold text-[#1A1A18]">
                      {order.shipment.ecpayLogisticsId}
                    </div>
                  </div>
                )}

                {order.shipment?.cvsPaymentNo && (
                  <div>
                    <div className="text-xs font-bold text-[#8C8880] mb-1">
                      7-ELEVEN 寄貨編號
                    </div>

                    <div className="font-mono font-bold text-[#1A1A18]">
                      {order.shipment.cvsPaymentNo}
                    </div>
                  </div>
                )}

                {order.shipment?.cvsValidationNo && (
                  <div>
                    <div className="text-xs font-bold text-[#8C8880] mb-1">
                      7-ELEVEN 驗證碼
                    </div>

                    <div className="font-mono font-bold text-[#1A1A18]">
                      {order.shipment.cvsValidationNo}
                    </div>
                  </div>
                )}

                {order.shipment?.cvsPaymentNo &&
                  order.shipment?.cvsValidationNo && (
                    <div className="md:col-span-2">
                      <div className="text-xs font-bold text-[#8C8880] mb-1">
                        7-ELEVEN 交貨便代碼
                      </div>

                      <div className="inline-flex items-center px-4 py-3 rounded-xl bg-[#F5F0E8] font-mono font-black text-[#C8522A] tracking-wider">
                        {order.shipment.cvsPaymentNo}
                        {order.shipment.cvsValidationNo}
                      </div>
                    </div>
                  )}

                {order.shipment?.logisticsType === 'HOME' &&
                  order.shipment?.bookingNote && (
                    <div className="md:col-span-2">
                      <div className="text-xs font-bold text-[#8C8880] mb-1">
                        黑貓宅配託運單號
                      </div>

                      <div className="inline-flex items-center px-4 py-3 rounded-xl bg-[#F5F0E8] font-mono font-black text-[#C8522A] tracking-wider">
                        {order.shipment.bookingNote}
                      </div>
                    </div>
                  )}

                {order.shipment && (
                  <div className="md:col-span-2">
                    <div className="text-xs font-bold text-[#8C8880] mb-1">
                      物流單狀態
                    </div>

                    <div className="font-bold text-[#1A1A18]">
                      {order.shipment.shippingStatus === 'pending'
                        ? '待建立物流單'
                        : order.shipment.shippingStatus === 'created'
                          ? '物流單已建立'
                          : order.shipment.shippingStatus === 'preparing'
                            ? '準備出貨'
                            : order.shipment.shippingStatus === 'shipped'
                              ? '已出貨'
                              : order.shipment.shippingStatus === 'in_transit'
                                ? '運送中'
                                : order.shipment.shippingStatus === 'arrived'
                                  ? '已到店'
                                  : order.shipment.shippingStatus === 'picked_up'
                                    ? '已取貨'
                                    : order.shipment.shippingStatus === 'delivered'
                                      ? '已送達'
                                      : order.shipment.shippingStatus === 'cancelled'
                                        ? '已取消'
                                        : order.shipment.shippingStatus || '—'}
                    </div>
                  </div>
                )}

                {order.shipment &&
                  !order.shipment?.ecpayLogisticsId &&
                  (
                    order.shipment?.logisticsType === 'CVS' ||
                    order.shipment?.logisticsType === 'HOME'
                  ) && (
                    <div className="md:col-span-2 pt-2">
                      <Button
                        variant="brand"
                        disabled={
                          logisticsCreating ||
                          order.paymentStatus !== 'paid'
                        }
                        onClick={onCreateLogistics}
                        className="gap-2"
                      >
                        {logisticsCreating ? (
                          <>
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                            建立物流單中...
                          </>
                        ) : (
                          <>
                            <Truck size={15} />
                            {order.shipment?.logisticsType === 'HOME'
                              ? '建立黑貓宅配物流單'
                              : '建立 7-ELEVEN 物流單'}
                          </>
                        )}
                      </Button>

                      {order.paymentStatus !== 'paid' && (
                        <div className="text-xs font-bold text-[#C8522A] mt-2">
                          訂單需完成付款後才能建立物流單
                        </div>
                      )}
                    </div>
                  )}

                {order.shipment?.logisticsType === 'CVS' &&
                  order.shipment?.ecpayLogisticsId &&
                  !(
                    order.shipment?.cvsPaymentNo &&
                    order.shipment?.cvsValidationNo
                  ) && (
                    <div className="md:col-span-2 pt-2">
                      <Button
                        variant="outline"
                        disabled={logisticsQuerying}
                        onClick={onQueryLogistics}
                        className="gap-2"
                      >
                        {logisticsQuerying ? (
                          <>
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                            查詢寄貨編號中...
                          </>
                        ) : (
                          <>
                            <Store size={15} />
                            取得 7-ELEVEN 寄貨編號
                          </>
                        )}
                      </Button>
                    </div>
                  )}
              </div>
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



const RETURN_STATUS_LABELS = {
  requested: '待審核',
  approved: '已同意退貨',
  rejected: '已拒絕',
  disputed: '平台爭議處理中',
  returning: '商品退回中',
  received: '已收到退貨',
  refunding: '退款處理中',
  refunded: '退款完成',
  cancelled: '已取消',
}

const RETURN_REASON_LABELS = {
  defective: '商品瑕疵',
  mismatched: '商品與描述不符',
  wrong_size: '尺寸不合',
  no_longer_needed: '不符合需求',
  other: '其他',
}


const VENDOR_REJECT_REASON_OPTIONS = [
  {
    value: 'exception',
    label: '商品屬依法排除七日解除權之例外'
  },
  {
    value: 'damaged',
    label: '商品有非必要檢查造成的毀損或變更'
  },
  {
    value: 'invalid_info',
    label: '訂單／退貨申請資料不符'
  },
  {
    value: 'expired',
    label: '已超過平台可申請退貨期限'
  },
  {
    value: 'other',
    label: '其他'
  }
]

function ReturnManagementPanel({ vendorId }) {
  const { toast } = useToast()
  const confirm = useConfirm()
  const [returns, setReturns] = useState([])
  const [loadingReturns, setLoadingReturns] = useState(true)
  const [actingId, setActingId] = useState(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectDescription, setRejectDescription] = useState('')

  const loadReturns = async () => {
    if (!vendorId) return
    try {
      setLoadingReturns(true)
      const response = await getVendorReturns(vendorId)
      if (response.data?.success === false) {
        throw new Error(response.data.err || '退貨申請載入失敗')
      }
      setReturns(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      const apiError = error.response?.data?.err
      toast.error(
        typeof apiError === 'string'
          ? apiError
          : error.message || '退貨申請載入失敗'
      )
    } finally {
      setLoadingReturns(false)
    }
  }

  useEffect(() => {
    loadReturns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId])

  const reviewReturn = async (item, action) => {
    if (action === 'reject') {
      setRejectTarget(item)
      setRejectReason('')
      setRejectDescription('')
      setRejectModalOpen(true)
      return
    }

    const ok = await confirm({
      title: '同意這筆整單退貨？',
      description:
        '同意後，消費者將進入商品退回流程。',
      confirmText: '同意退貨',
    })

    if (!ok) return

    try {
      setActingId(item.return_id)

      const response = await reviewVendorReturn({
        vendor_id: vendorId,
        return_id: item.return_id,
        action: 'approve',
        vendor_note: '',
      })

      if (response.data?.success === false) {
        throw new Error(
          response.data.err || '處理失敗'
        )
      }

      toast.success('已同意退貨申請')
      await loadReturns()
    } catch (error) {
      toast.error(
        error.response?.data?.err ||
        error.message ||
        '處理失敗'
      )
    } finally {
      setActingId(null)
    }
  }

  const closeRejectModal = () => {
    if (actingId) return

    setRejectModalOpen(false)
    setRejectTarget(null)
    setRejectReason('')
    setRejectDescription('')
  }

  const submitRejectReturn = async () => {
    if (!rejectTarget) return

    if (!rejectReason) {
      toast.error('請先選擇拒絕原因')
      return
    }

    if (
      rejectReason === 'other' &&
      !rejectDescription.trim()
    ) {
      toast.error('選擇「其他」時請填寫補充說明')
      return
    }

    const selectedReason =
      VENDOR_REJECT_REASON_OPTIONS.find(
        item => item.value === rejectReason
      )

    const vendorNote = [
      `拒絕原因：${selectedReason?.label || rejectReason}`,
      rejectDescription.trim()
        ? `補充說明：${rejectDescription.trim()}`
        : ''
    ]
      .filter(Boolean)
      .join('\n')

    const ok = await confirm({
      title: '確認提出拒絕？',
      description:
        '拒絕理由會提供給消費者查看；消費者之後仍可提出爭議，由平台管理員判定。',
      confirmText: '確認提出拒絕',
    })

    if (!ok) return

    try {
      setActingId(rejectTarget.return_id)

      const response = await reviewVendorReturn({
        vendor_id: vendorId,
        return_id: rejectTarget.return_id,
        action: 'reject',
        vendor_note: vendorNote,
      })

      if (response.data?.success === false) {
        throw new Error(
          response.data.err || '拒絕退貨失敗'
        )
      }

      toast.success('已提出拒絕')
      setRejectModalOpen(false)
      setRejectTarget(null)
      setRejectReason('')
      setRejectDescription('')
      await loadReturns()
    } catch (error) {
      toast.error(
        error.response?.data?.err ||
        error.message ||
        '拒絕退貨失敗'
      )
    } finally {
      setActingId(null)
    }
  }

  const confirmReceived = async (item) => {
    const ok = await confirm({
      title: '確認已收到退回商品？',
      description: '確認後此案件會進入可執行退款階段。',
      confirmText: '確認收到',
    })
    if (!ok) return

    try {
      setActingId(item.return_id)
      const response = await confirmVendorReturnReceived({
        vendor_id: vendorId,
        return_id: item.return_id,
      })
      if (response.data?.success === false) {
        throw new Error(response.data.err || '確認收貨失敗')
      }
      toast.success('已確認收到退回商品')
      await loadReturns()
    } catch (error) {
      toast.error(error.response?.data?.err || error.message || '確認收貨失敗')
    } finally {
      setActingId(null)
    }
  }

  const processRefund = async (item) => {
    const ok = await confirm({
      title: `執行整張訂單全額退款 NT$ ${Number(item.requested_amount || 0).toLocaleString()}？`,
      description:
        '此版本僅支援整張訂單全額退款。若尚未串接綠界自動退款 API，請先確認外部退款作業，再執行平台內部帳務收回。',
      confirmText: '執行全額退款',
    })
    if (!ok) return

    try {
      setActingId(item.return_id)
      const response = await processVendorReturnRefund({
        vendor_id: vendorId,
        return_id: item.return_id,
      })
      if (response.data?.success === false) {
        throw new Error(response.data.err || '退款處理失敗')
      }
      toast.success('退款帳務已完成')
      await loadReturns()
    } catch (error) {
      toast.error(error.response?.data?.err || error.message || '退款處理失敗')
    } finally {
      setActingId(null)
    }
  }

  const activeReturns = returns.filter(item => item.status !== 'cancelled')

  return (
    <div className="bg-white rounded-[2rem] border border-[#E2DDD4] shadow-sm overflow-hidden">
      <div className="px-7 py-5 bg-[#F8F9FA] border-b border-[#E2DDD4] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif font-black text-[#1A1A18]">退貨退款管理</h2>
          <p className="text-xs text-[#8C8880] font-medium mt-1">
            第一版僅支援單一廠商訂單的整張訂單全額退貨退款
          </p>
        </div>
        <span className="text-xs font-bold bg-white border border-[#E2DDD4] rounded-full px-3 py-1.5 text-[#8C8880]">
          {activeReturns.length} 筆
        </span>
      </div>

      {loadingReturns ? (
        <div className="py-12 text-center text-sm font-bold text-[#8C8880]">
          <Loader2 size={16} className="inline mr-2 animate-spin" />
          退貨申請載入中...
        </div>
      ) : activeReturns.length === 0 ? (
        <div className="py-12 text-center text-sm font-bold text-[#8C8880]">
          目前沒有退貨退款申請
        </div>
      ) : (
        <div className="divide-y divide-[#E2DDD4]">
          {activeReturns.map(item => (
            <div key={item.return_id} className="px-7 py-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-mono font-bold text-[#1A1A18]">
                      訂單 {item.order_id}
                    </span>
                    <span className="text-[11px] font-bold rounded-full bg-[#FDF0ED] text-[#C8522A] px-3 py-1">
                      {RETURN_STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-[#8C8880] space-y-1">
                    <div>
                      原因：{RETURN_REASON_LABELS[item.reason] || item.reason}
                      {item.description ? `｜${item.description}` : ''}
                    </div>
                    <div>
                      申請退款：NT$ {Number(item.requested_amount || 0).toLocaleString()}
                      {item.refunded_amount != null
                        ? `｜已退款 NT$ ${Number(item.refunded_amount).toLocaleString()}`
                        : ''}
                    </div>
                    <div>消費者：{item.user_id || '—'}</div>

                    {item.vendor_note && (
                      <div className="mt-2 rounded-xl bg-[#F8F9FA] border border-[#E2DDD4] px-4 py-3 text-[#1A1A18] whitespace-pre-line">
                        <span className="font-bold">廠商處理說明：</span>
                        {' '}
                        {item.vendor_note}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  {item.status === 'requested' && (
                    <>
                      <Button
                        variant="outline"
                        disabled={actingId === item.return_id}
                        onClick={() => reviewReturn(item, 'reject')}
                      >
                        提出拒絕
                      </Button>
                      <Button
                        variant="brand"
                        disabled={actingId === item.return_id}
                        onClick={() => reviewReturn(item, 'approve')}
                      >
                        同意退貨
                      </Button>
                    </>
                  )}

                  {['approved', 'returning'].includes(item.status) && (
                    <Button
                      variant="brand"
                      disabled={actingId === item.return_id}
                      onClick={() => confirmReceived(item)}
                    >
                      確認收到退貨
                    </Button>
                  )}

                  {item.status === 'received' && (
                    <Button
                      variant="brand"
                      disabled={actingId === item.return_id}
                      onClick={() => processRefund(item)}
                    >
                      執行全額退款
                    </Button>
                  )}

                  {item.status === 'disputed' && (
                    <span className="text-xs font-bold text-[#C8522A] bg-[#FDF0ED] rounded-xl px-4 py-3">
                      等待平台判定
                    </span>
                  )}

                  {item.status === 'refunded' && (
                    <span className="text-xs font-bold text-green-700 bg-green-50 rounded-xl px-4 py-3">
                      退款完成
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {rejectModalOpen && rejectTarget && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#1A1A18]/50 backdrop-blur-sm"
            onClick={closeRejectModal}
          />

          <div className="relative w-full max-w-lg rounded-[2rem] border border-[#E2DDD4] bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-serif font-black text-[#1A1A18]">
                  提出退貨拒絕
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#8C8880]">
                  請提供具體拒絕依據。拒絕後，消費者仍可提出爭議並交由平台審核。
                </p>
              </div>

              <button
                type="button"
                onClick={closeRejectModal}
                disabled={Boolean(actingId)}
                className="shrink-0 rounded-full p-2 text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-[#F8F9FA] px-4 py-3 text-xs font-mono font-bold text-[#8C8880] break-all">
              訂單 {rejectTarget.order_id}
            </div>

            <label className="mt-6 block text-sm font-bold text-[#1A1A18]">
              拒絕原因
              <span className="ml-1 text-[#C8522A]">*</span>
            </label>

            <select
              value={rejectReason}
              onChange={event =>
                setRejectReason(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-[#E2DDD4] bg-[#F8F9FA] px-4 py-3 text-sm font-bold text-[#1A1A18] outline-none focus:border-[#C8522A]"
            >
              <option value="">請選擇拒絕原因</option>

              {VENDOR_REJECT_REASON_OPTIONS.map(
                item => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                )
              )}
            </select>

            <label className="mt-5 block text-sm font-bold text-[#1A1A18]">
              補充說明
              {rejectReason === 'other' && (
                <span className="ml-1 text-[#C8522A]">*</span>
              )}
            </label>

            <textarea
              value={rejectDescription}
              onChange={event =>
                setRejectDescription(
                  event.target.value
                )
              }
              rows={4}
              placeholder="請說明拒絕退貨的具體原因或商品狀況..."
              className="mt-2 w-full resize-none rounded-xl border border-[#E2DDD4] bg-[#F8F9FA] px-4 py-3 text-sm outline-none focus:border-[#C8522A]"
            />

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#FFF8E7] px-4 py-3 text-xs leading-relaxed text-[#9A6700]">
              <AlertTriangle
                size={15}
                className="mt-0.5 shrink-0"
              />
              廠商不應任意拒絕符合退貨資格的申請；此處的理由將保留供消費者與平台後續爭議審核。
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                disabled={Boolean(actingId)}
                onClick={closeRejectModal}
                className="flex-1"
              >
                取消
              </Button>

              <Button
                variant="danger"
                disabled={
                  Boolean(actingId) ||
                  !rejectReason ||
                  (
                    rejectReason === 'other' &&
                    !rejectDescription.trim()
                  )
                }
                onClick={submitRejectReturn}
                className="flex-[2] gap-2"
              >
                {actingId === rejectTarget.return_id && (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                )}
                確認提出拒絕
              </Button>
            </div>
          </div>
        </div>
      )}
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

  const [
    logisticsCreating,
    setLogisticsCreating
  ] = useState(false)

  const [
    logisticsQuerying,
    setLogisticsQuerying
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

            hasShippingInfo:
              Boolean(order.has_shipping_info),

            logisticsType:
              order.logistics_type || '',

            logisticsSubType:
              order.logistics_sub_type || '',

            storeName:
              order.store_name || '',

            shipmentStatus:
              order.shipment_status || '',

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

        shipment:
          detail.shipment
            ? {
                shipmentId:
                  detail.shipment.shipment_id,

                provider:
                  detail.shipment.provider || '',

                logisticsType:
                  detail.shipment.logistics_type || '',

                logisticsSubType:
                  detail.shipment.logistics_sub_type || '',

                storeId:
                  detail.shipment.store_id || '',

                storeName:
                  detail.shipment.store_name || '',

                storeAddress:
                  detail.shipment.store_address || '',

                merchantTradeNo:
                  detail.shipment.merchant_trade_no || '',

                ecpayLogisticsId:
                  detail.shipment.ecpay_logistics_id || '',

                cvsPaymentNo:
                  detail.shipment.cvs_payment_no || '',

                cvsValidationNo:
                  detail.shipment.cvs_validation_no || '',

                bookingNote:
                  detail.shipment.booking_note || '',

                shippingStatus:
                  detail.shipment.shipping_status || ''
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
                updatedStatus,

              shipment:
                previous.shipment
                  ? {
                      ...previous.shipment,
                      shippingStatus:
                        response.data?.shipment_status ||
                        previous.shipment.shippingStatus
                    }
                  : previous.shipment
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



  async function handleCreateLogistics() {
    if (!selectedOrder) return

    const isHome =
      selectedOrder.shipment?.logisticsType === 'HOME'

    const confirmed = await confirm({
      title: isHome
        ? '建立黑貓宅配物流單？'
        : '建立 7-ELEVEN 物流單？',

      description: isHome
        ? '系統將使用廠商寄件資料與此訂單的收件地址，向綠界建立黑貓宅配物流單。'
        : '系統將使用此訂單的超商門市與收件資料，向綠界建立 7-ELEVEN C2C 物流單。',

      confirmText: '建立物流單'
    })

    if (!confirmed) return

    try {
      setLogisticsCreating(true)

      const response =
        await createVendorLogistics({
          vendor_id: vendorId,
          order_id: selectedOrder.orderId
        })

      if (
        response.data?.success === false
      ) {
        throw new Error(
          response.data.err ||
          '建立綠界物流單失敗'
        )
      }

      const logisticsId =
        response.data?.ecpay_logistics_id || ''

      const merchantTradeNo =
        response.data?.merchant_trade_no || ''

      const shipmentStatus =
        response.data?.shipment_status || 'created'

      const bookingNote =
        response.data?.booking_note || ''

      setSelectedOrder(previous =>
        previous
          ? {
              ...previous,
              shipment: previous.shipment
                ? {
                    ...previous.shipment,
                    ecpayLogisticsId:
                      logisticsId,
                    merchantTradeNo:
                      merchantTradeNo,
                    bookingNote:
                      bookingNote,
                    shippingStatus:
                      shipmentStatus
                  }
                : previous.shipment
            }
          : previous
      )

      setOrders(previous =>
        previous.map(order =>
          order.orderId === selectedOrder.orderId
            ? {
                ...order,
                shipmentStatus:
                  shipmentStatus
              }
            : order
        )
      )

      if (response.data?.already_created) {
        toast.info('此訂單已建立過綠界物流單')
      } else if (isHome) {
        toast.success(
          bookingNote
            ? `黑貓物流單建立成功，託運單號：${bookingNote}`
            : logisticsId
              ? `黑貓物流單建立成功，綠界物流編號：${logisticsId}`
              : '黑貓宅配物流單建立成功'
        )
      } else {
        toast.success(
          logisticsId
            ? `7-ELEVEN 物流單建立成功，物流編號：${logisticsId}`
            : '7-ELEVEN 物流單建立成功'
        )
      }
    } catch (error) {
      const apiError =
        error.response?.data?.err

      toast.error(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : error.message ||
              '建立綠界物流單失敗'
      )
    } finally {
      setLogisticsCreating(false)
    }
  }



  async function handleQueryLogistics() {
    if (!selectedOrder) return

    try {
      setLogisticsQuerying(true)

      const response =
        await queryVendorLogistics({
          vendor_id: vendorId,
          order_id: selectedOrder.orderId
        })

      if (
        response.data?.success === false
      ) {
        throw new Error(
          response.data.err ||
          '查詢 7-ELEVEN 寄貨編號失敗'
        )
      }

      const cvsPaymentNo =
        response.data?.cvs_payment_no || ''

      const cvsValidationNo =
        response.data?.cvs_validation_no || ''

      setSelectedOrder(previous =>
        previous
          ? {
              ...previous,
              shipment: previous.shipment
                ? {
                    ...previous.shipment,
                    cvsPaymentNo,
                    cvsValidationNo
                  }
                : previous.shipment
            }
          : previous
      )

      if (cvsPaymentNo && cvsValidationNo) {
        toast.success(
          `已取得交貨便代碼：${cvsPaymentNo}${cvsValidationNo}`
        )
      } else {
        toast.info(
          '物流單已查詢成功，但目前尚未取得完整的 7-ELEVEN 寄貨編號'
        )
      }
    } catch (error) {
      const apiError =
        error.response?.data?.err

      toast.error(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : error.message ||
              '查詢 7-ELEVEN 寄貨編號失敗'
      )
    } finally {
      setLogisticsQuerying(false)
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

      <ReturnManagementPanel vendorId={vendorId} />

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

                            {!order.hasShippingInfo &&
                              order.shippingStatus !== 'cancelled' && (
                                <span title="尚無配送資訊">
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
        logisticsCreating={logisticsCreating}
        logisticsQuerying={logisticsQuerying}
        onClose={() =>
          setSelectedOrder(null)
        }
        onUpdateShipping={
          handleUpdateShipping
        }
        onCreateLogistics={
          handleCreateLogistics
        }
        onQueryLogistics={
          handleQueryLogistics
        }
      />
    </div>
  )
}