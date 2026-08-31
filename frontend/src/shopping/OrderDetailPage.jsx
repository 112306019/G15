import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  FileText,
  Box,
  Truck,
  Heart,
  Smartphone,
  MapPin,
  Store,
  Home,
  UserRound,
  Phone,
} from "lucide-react";

function formatNTD(amount) {
  const value = Number(amount);
  return `NT$${Number.isFinite(value) ? Math.round(value).toLocaleString("zh-TW") : "0"}`;
}

const isValidImageUrl = (url) =>
  typeof url === "string" && /^https?:\/\//.test(url);

function getDeliveryMethodLabel(shipment) {
  if (!shipment) return "未建立物流資料";

  if (shipment.logistics_type === "CVS") {
    if (shipment.logistics_sub_type === "UNIMARTC2C") {
      return "7-ELEVEN 超商取貨";
    }
    return "超商取貨";
  }

  if (shipment.logistics_type === "HOME") {
    return "宅配";
  }

  return shipment.logistics_type || "未設定";
}

export default function OrderDetailPage({ onBack, orderId }) {
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/consumer/order/view?Order_id=${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const currentOrder = data[0];
          setOrderData(currentOrder);

        }
      } catch (err) {
        console.error("訂單詳情載入失敗", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, token]);

  const openCancelModal = () => {
    setCancelError("");
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      setCancelError("請填寫取消原因");
      return;
    }

    setCancelError("");
    setCancelSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/consumer/order/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
          user_id: orderData.User_id,
          reason: cancelReason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.err || "取消訂單失敗");
      }

      setOrderData((prev) => ({
        ...prev,
        order_status: data.order_status,
        shipping_status: data.shipping_status,
      }));
      setCancelModalOpen(false);
    } catch (err) {
      setCancelError(err.message || "取消訂單失敗，請稍後再試");
    } finally {
      setCancelSubmitting(false);
    }
  };

  const shippingStatus = orderData?.shipping_status || "unshipped";

  const isCancelled =
    shippingStatus === "cancelled" ||
    orderData?.order_status === "cancelled";

  const step =
    shippingStatus === "unshipped"
      ? 0
      : shippingStatus === "preparing"
      ? 1
      : shippingStatus === "shipped" ||
        shippingStatus === "in_transit"
      ? 2
      : shippingStatus === "arrived" ||
        shippingStatus === "delivered" ||
        shippingStatus === "completed"
      ? 3
      : 0;

  const fillWidth =
    ["0%", "33%", "66%", "100%"][step] ?? "0%";

  const steps = [
    { label: "訂單成立", icon: FileText },
    { label: "備貨中", icon: Box },
    { label: "配送中", icon: Truck },
    { label: "已送達", icon: Heart },
  ];

  const totalAmount = orderData?.total_amount ?? 0;
  const shippingFee = orderData?.shipping_fee ?? 0;

  const items = orderData?.items || [];
  const itemsSubtotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const itemsRawTotal = items.reduce(
    (sum, item) => sum + Number(item.Unit_price || 0) * Number(item.quantity || 0),
    0
  );
  const couponDiscount = Math.max(0, itemsRawTotal - itemsSubtotal);

  const createdAt = orderData?.created_at
    ? new Date(orderData.created_at)
    : new Date();

  const createdDate = createdAt.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const createdTime = createdAt.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const shipment = orderData?.shipment;
  const recipient = orderData?.recipient;

  const isCVS = shipment?.logistics_type === "CVS";
  const isHome = shipment?.logistics_type === "HOME";

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500 max-w-5xl">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          返回訂單列表
        </button>

        <div className="py-20 text-center text-[#8C8880]">
          訂單載入中...
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="animate-in fade-in duration-500 max-w-5xl">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          返回訂單列表
        </button>

        <div className="py-20 text-center text-[#8C8880]">
          找不到訂單資料，請返回訂單列表重新查看
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回訂單列表
      </button>

      <h2 className="text-[28px] font-serif font-bold text-[#1A1A18] mb-8">
        訂單細節
      </h2>

      <div className="mb-16 rounded-[2rem] border border-[#E2DDD4] bg-white px-6 py-8 shadow-sm">
        {isCancelled ? (
          <div className="flex flex-col items-center justify-center gap-3 py-2">
            <div className="grid h-12 w-12 place-items-center rounded-full border-4 border-[#C8522A] text-[#C8522A]">
              <Box size={20} />
            </div>
            <div className="text-base font-bold text-[#C8522A]">
              訂單已取消
            </div>
          </div>
        ) : (
          <div className="relative px-4">
            <div className="absolute left-10 right-10 top-[22px] h-1.5 rounded-full bg-[#F5F0E8]" />
            <div
              className="absolute left-10 top-[22px] h-1.5 rounded-full bg-[#C8522A] transition-all duration-700 ease-out"
              style={{ width: `calc(${fillWidth} - 2rem)` }}
            />

            <div className="relative z-10 flex items-start justify-between">
              {steps.map((s, i) => {
                const DotIcon = s.icon;
                const isDone = i < step;
                const isActive = i === step;

                return (
                  <div
                    key={s.label}
                    className="flex w-24 flex-col items-center gap-4"
                  >
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-full border-4 transition-all duration-500 ${
                        isDone
                          ? "border-[#C8522A] bg-[#C8522A] text-white shadow-[0_0_15px_rgba(200,82,42,0.3)]"
                          : isActive
                          ? "border-[#C8522A] bg-white text-[#C8522A] shadow-sm"
                          : "border-[#E2DDD4] bg-white text-[#8C8880]"
                      }`}
                    >
                      <DotIcon
                        size={20}
                        className={isDone ? "text-white" : ""}
                      />
                    </div>

                    <div
                      className={`text-center text-sm font-bold transition-colors ${
                        i <= step
                          ? "text-[#1A1A18]"
                          : "text-[#8C8880]"
                      }`}
                    >
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isCancelled &&
          shippingStatus === "delivered" &&
          orderData.order_status !== "completed" && (
            <div className="mt-8 border-t border-[#E2DDD4] pt-6">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div>
                  <div className="text-sm font-bold text-[#1A1A18]">
                    包裹已送達
                  </div>

                  <div className="mt-1 text-xs text-[#8C8880]">
                    確認收到商品後，即可完成此筆訂單
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `${API_BASE_URL}/api/consumer/order/update`,
                        {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            Order_id: orderId,
                            User_id: orderData.User_id,
                            order_status: "completed",
                          }),
                        }
                      );

                      const data = await res.json();

                      if (!res.ok) {
                        throw new Error(
                          data.err || "確認收貨失敗"
                        );
                      }

                      setOrderData((prev) => ({
                        ...prev,
                        order_status: "completed",
                      }));
                    } catch (err) {
                      console.error(
                        "確認收貨失敗",
                        err
                      );
                    }
                  }}
                  className="rounded-full bg-[#C8522A] px-8 py-3 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#A64220]"
                >
                  確認收貨
                </button>
              </div>
            </div>
          )}

        {!isCancelled &&
          orderData.order_status === "completed" && (
            <div className="mt-8 border-t border-[#E2DDD4] pt-6 text-center">
              <div className="text-sm font-bold text-[#1A1A18]">
                ✓ 訂單已完成
              </div>

              <div className="mt-1 text-xs text-[#8C8880]">
                感謝您確認收貨
              </div>
            </div>
          )}

        {!isCancelled && orderData.order_status === "cancel_requested" && (
          <div className="mt-8 border-t border-[#E2DDD4] pt-6 text-center">
            <div className="text-sm font-bold text-[#9A6700]">
              取消申請審核中
            </div>

            <div className="mt-1 text-xs text-[#8C8880]">
              廠商已開始備貨，正在等待廠商確認是否同意取消
            </div>
          </div>
        )}

        {!isCancelled &&
          orderData.order_status !== "cancel_requested" &&
          orderData.cancel_rejected && (
            <div className="mt-8 border-t border-[#E2DDD4] pt-6 text-center">
              <div className="text-sm font-bold text-[#C8522A]">
                賣家已拒絕取消訂單
              </div>

              <div className="mt-1 text-xs text-[#8C8880]">
                此訂單將依原訂流程繼續處理，無法再次申請取消
              </div>
            </div>
          )}

        {!isCancelled &&
          !orderData.cancel_rejected &&
          orderData.order_status === "pending" &&
          (shippingStatus === "unshipped" || shippingStatus === "preparing") && (
            <div className="mt-8 border-t border-[#E2DDD4] pt-6">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div>
                  <div className="text-sm font-bold text-[#1A1A18]">
                    {shippingStatus === "unshipped" ? "尚未開始備貨，可取消訂單" : "已開始備貨，取消需經廠商同意"}
                  </div>

                  {shippingStatus === "preparing" && (
                    <div className="mt-1 text-xs text-[#8C8880]">
                      送出申請後，需等待廠商核准才會正式取消
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={openCancelModal}
                  className="rounded-full border border-[#C8522A] px-8 py-3 text-sm font-bold text-[#C8522A] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#FDF0ED] disabled:opacity-50"
                >
                  {shippingStatus === "unshipped" ? "取消訂單" : "申請取消訂單"}
                </button>
              </div>
            </div>
          )}
      </div>

      <div className="mb-8 rounded-[2rem] border border-[#E2DDD4] bg-white p-8 shadow-sm">
        <h3 className="mb-6 text-lg font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block" />
          配送資訊
        </h3>

        {!shipment ? (
          <div className="rounded-2xl bg-[#F8F9FA] px-5 py-4 text-sm text-[#8C8880]">
            此訂單目前沒有物流資料。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 text-sm">
            <div className="flex items-start gap-3">
              {isCVS ? (
                <Store size={18} className="mt-0.5 text-[#C8522A]" />
              ) : (
                <Home size={18} className="mt-0.5 text-[#C8522A]" />
              )}

              <div>
                <div className="mb-1 text-xs font-bold tracking-wider text-[#8C8880]">
                  配送方式
                </div>
                <div className="font-bold text-[#1A1A18]">
                  {getDeliveryMethodLabel(shipment)}
                </div>
              </div>
            </div>

            {isCVS && (
              <>
                <div className="flex items-start gap-3">
                  <Store size={18} className="mt-0.5 text-[#8C8880]" />

                  <div>
                    <div className="mb-1 text-xs font-bold tracking-wider text-[#8C8880]">
                      取貨門市
                    </div>
                    <div className="font-bold text-[#1A1A18]">
                      {shipment.store_name || "未提供"}
                    </div>
                    {shipment.store_id && (
                      <div className="mt-1 text-xs text-[#8C8880]">
                        門市代號：{shipment.store_id}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={18} className="mt-0.5 text-[#8C8880]" />

                  <div>
                    <div className="mb-1 text-xs font-bold tracking-wider text-[#8C8880]">
                      門市地址
                    </div>
                    <div className="font-bold leading-relaxed text-[#1A1A18]">
                      {shipment.store_address || "未提供"}
                    </div>
                  </div>
                </div>
              </>
            )}

            {isHome && (
              <div className="flex items-start gap-3 md:col-span-2">
                <MapPin size={18} className="mt-0.5 text-[#8C8880]" />
                <div>
                  <div className="mb-1 text-xs font-bold tracking-wider text-[#8C8880]">
                    配送地址
                  </div>
                  <div className="font-bold leading-relaxed text-[#1A1A18]">
                    {recipient?.detail_address || "未提供"}
                  </div>
                </div>
              </div>
            )}

            {shipment.ecpay_logistics_id && (
              <div className="flex items-start gap-3 md:col-span-2">
                <FileText size={18} className="mt-0.5 text-[#8C8880]" />

                <div>
                  <div className="mb-1 text-xs font-bold tracking-wider text-[#8C8880]">
                    綠界物流編號
                  </div>
                  <div className="font-mono font-bold text-[#1A1A18]">
                    {shipment.ecpay_logistics_id}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-8 rounded-[2rem] border border-[#E2DDD4] bg-white p-8 shadow-sm">
        <h3 className="mb-6 text-lg font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#8C8880] rounded-full inline-block" />
          收件資訊
        </h3>

        <div className="space-y-4 text-sm font-medium">
          <div className="flex items-start">
            <span className="w-28 flex-shrink-0 text-[#8C8880] flex items-center gap-2">
              <UserRound size={15} />
              收件人
            </span>
            <span className="text-[#1A1A18] font-bold">
              {recipient?.recipient_name || "未填寫"}
            </span>
          </div>

          <div className="flex items-start">
            <span className="w-28 flex-shrink-0 text-[#8C8880] flex items-center gap-2">
              <Phone size={15} />
              聯絡電話
            </span>
            <span className="text-[#1A1A18] font-bold">
              {recipient?.phone || "未填寫"}
            </span>
          </div>

          {isHome && (
            <div className="flex items-start">
              <span className="w-28 flex-shrink-0 text-[#8C8880]">
                配送地址
              </span>
              <span className="text-[#1A1A18] font-bold leading-relaxed">
                {recipient?.detail_address || "未填寫"}
              </span>
            </div>
          )}

          <div className="flex">
            <span className="w-28 text-[#8C8880]">付款狀態</span>
            <span className="text-[#1A1A18] font-bold">
              {orderData.payment_status === "paid" ? "已付款" : "未付款"}
            </span>
          </div>

          {orderData.Promotion_code && (
            <div className="flex">
              <span className="w-28 text-[#8C8880]">優惠碼</span>
              <span className="text-[#1A1A18] font-bold">
                {orderData.Promotion_code}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8 rounded-[2rem] border border-[#E2DDD4] bg-white p-8 shadow-sm overflow-hidden">
        <h3 className="mb-6 text-lg font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#1A1A18] rounded-full inline-block" />
          訂單資訊
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-[#E2DDD4]">
              <tr className="text-xs font-bold text-[#8C8880] tracking-wider">
                <th className="pb-4 pr-4">商品名稱</th>
                <th className="pb-4 px-4 text-center">價格</th>
                <th className="pb-4 px-4 text-center">數量</th>
                <th className="pb-4 pl-4 text-right">小計</th>
              </tr>
            </thead>

            <tbody>
              {(orderData.items || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#8C8880]">
                    無商品資料
                  </td>
                </tr>
              ) : (
                (orderData.items || []).map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-[#F5F0E8] last:border-0 hover:bg-[#F8F9FA] transition-colors"
                  >
                    <td className="py-6 pr-4">
                      <div className="flex items-center gap-5">
                        <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-[#F5F0E8] flex items-center justify-center border border-[#E2DDD4] overflow-hidden">
                          {isValidImageUrl(item.image_url) ? (
                            <img
                              src={item.image_url}
                              alt={item.product_name || ""}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Smartphone size={24} className="text-[#8C8880]" />
                          )}
                        </div>

                        <div className="text-sm font-bold text-[#1A1A18] max-w-sm leading-relaxed">
                          {item.product_name || `商品 ${item.Product_id}`}
                        </div>
                      </div>
                    </td>

                    <td className="py-6 px-4 text-center font-mono text-sm font-bold text-[#8C8880]">
                      {formatNTD(item.Unit_price)}
                    </td>

                    <td className="py-6 px-4 text-center font-mono text-sm font-bold text-[#8C8880]">
                      x{item.quantity}
                    </td>

                    <td className="py-6 pl-4 text-right font-mono text-base font-black text-[#C8522A]">
                      {formatNTD(item.subtotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-2 border-t border-[#E2DDD4] pt-6 text-sm font-medium">
          <div className="flex items-center justify-between">
            <span className="text-[#8C8880]">商品小計</span>
            <span className="font-mono font-bold text-[#1A1A18]">
              {formatNTD(itemsRawTotal)}
            </span>
          </div>

          {couponDiscount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[#8C8880]">
                優惠券折抵
                {orderData.Promotion_code ? `（${orderData.Promotion_code}）` : ""}
              </span>
              <span className="font-mono font-bold text-[#C8522A]">
                -{formatNTD(couponDiscount)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[#8C8880]">運費</span>
            <span className="font-mono font-bold text-[#1A1A18]">
              {formatNTD(shippingFee)}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#E2DDD4] pt-4 mt-2">
            <span className="text-base font-bold text-[#1A1A18]">訂單金額：</span>
            <span className="font-mono text-xl font-black text-[#C8522A]">
              {formatNTD(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between rounded-[2rem] border border-[#E2DDD4] bg-white p-6 shadow-sm">
        <div>
          <div className="mb-2 font-mono text-base font-bold text-[#1A1A18]">
            訂單編號：#{orderData.Order_id}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-[#8C8880]">
            <span>訂購於 {createdDate}</span>
            <span>•</span>
            <span>{createdTime}</span>
          </div>
        </div>

        <div className="mt-4 md:mt-0 font-mono text-xl font-black text-[#C8522A]">
          {formatNTD(totalAmount)}
        </div>
      </div>

      {cancelModalOpen && (
        <div
          className="fixed inset-0 bg-[#1A1A18]/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => !cancelSubmitting && setCancelModalOpen(false)}
        >
          <div
            className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-[#E2DDD4]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#1A1A18] mb-1">
              {shippingStatus === "unshipped" ? "取消訂單" : "申請取消訂單"}
            </h3>
            <p className="text-xs font-bold text-[#8C8880] mb-4">
              請告訴我們取消原因，方便我們了解並改善服務
            </p>

            <textarea
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="請輸入取消原因"
              className="w-full resize-none bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none focus:ring-4 focus:ring-[#C8522A]/10 focus:border-[#C8522A] transition-all mb-3"
            />

            {cancelError && (
              <div className="mb-3 text-xs font-bold text-[#C8522A]">
                {cancelError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelSubmitting}
                className="flex-1 rounded-2xl border border-[#E2DDD4] py-3 text-sm font-bold text-[#8C8880] transition-colors hover:bg-[#F8F9FA] disabled:opacity-50"
              >
                返回
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={cancelSubmitting}
                className="flex-1 rounded-2xl bg-[#C8522A] py-3 text-sm font-bold text-white transition-all hover:bg-[#A64220] disabled:opacity-50"
              >
                {cancelSubmitting ? "處理中..." : "確認送出"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}