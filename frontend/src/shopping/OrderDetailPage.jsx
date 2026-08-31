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
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
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


function getFullRecipientAddress(recipient) {
  if (!recipient) return "未提供";

  const parts = [
    recipient.city,
    recipient.district,
    recipient.detail_address,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join("") : "未提供";
}


const RETURN_REASON_OPTIONS = [
  { value: "defective", label: "商品瑕疵" },
  { value: "mismatched", label: "商品與描述不符" },
  { value: "wrong_size", label: "尺寸不合" },
  { value: "no_longer_needed", label: "不符合需求" },
  { value: "other", label: "其他" },
];

const RETURN_STATUS_LABELS = {
  requested: "退貨申請審核中",
  approved: "廠商已同意退貨",
  rejected: "廠商拒絕退貨",
  disputed: "平台爭議審核中",
  returning: "商品退回中",
  received: "廠商已收到退貨",
  refunding: "退款處理中",
  refunded: "退款完成",
  cancelled: "退貨申請已取消",
};

export default function OrderDetailPage({ onBack, orderId }) {
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returnRequests, setReturnRequests] = useState([]);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState("defective");
  const [returnDescription, setReturnDescription] = useState("");
  const [completingOrder, setCompletingOrder] = useState(false);

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


  const userId = localStorage.getItem("userId");

  const fetchReturnRequests = async () => {
    if (!orderId || !userId) return;
    try {
      setReturnLoading(true);
      const res = await fetch(
        `${API_BASE_URL}/api/consumer/order/return/list?Order_id=${orderId}&User_id=${userId}`
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setReturnRequests(data);
      }
    } catch (err) {
      console.error("退貨退款資料載入失敗", err);
    } finally {
      setReturnLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, userId]);

  const latestReturn = returnRequests[0] || null;
  const hasOpenReturn = latestReturn && !["rejected", "refunded", "cancelled"].includes(latestReturn.status);

  const canCreateReturn =
    orderData?.shipping_status === "delivered" &&
    ["paid", "completed"].includes(orderData?.payment_status) &&
    orderData?.payment_status !== "refunded" &&
    !hasOpenReturn &&
    !latestReturn;

  const handleCreateReturn = async () => {
    if (!userId || !orderId || returnSubmitting) return;
    try {
      setReturnSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/consumer/order/return/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Order_id: orderId,
          User_id: userId,
          reason: returnReason,
          description: returnDescription.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.err || "申請退貨退款失敗");
      }
      setShowReturnModal(false);
      setReturnDescription("");
      await fetchReturnRequests();
    } catch (err) {
      alert(err.message || "申請退貨退款失敗");
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (!latestReturn || latestReturn.status !== "rejected") return;
    const extra = window.prompt("若不接受廠商拒絕結果，可補充爭議說明：", "");
    if (extra === null) return;

    try {
      setReturnSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/consumer/order/return/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Return_id: latestReturn.return_id,
          User_id: userId,
          description: extra,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.err || "提出爭議失敗");
      }
      await fetchReturnRequests();
    } catch (err) {
      alert(err.message || "提出爭議失敗");
    } finally {
      setReturnSubmitting(false);
    }
  };


  const handleCompleteOrder = async () => {
    if (!orderId || !orderData || completingOrder) return;

    try {
      setCompletingOrder(true);

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

      if (!res.ok || data.success === false) {
        throw new Error(data.err || "完成訂單失敗");
      }

      setOrderData((prev) => ({
        ...prev,
        order_status: "completed",
        completed_at: data.completed_at || prev?.completed_at,
      }));
    } catch (err) {
      console.error("完成訂單失敗", err);
      alert(err.message || "完成訂單失敗");
    } finally {
      setCompletingOrder(false);
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

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between rounded-[2.5rem] border border-[#E2DDD4] bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
        <div>
          <div className="mb-2 font-mono text-2xl font-bold text-[#1A1A18]">
            #{orderData.Order_id}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-[#8C8880]">
            <span>訂購於 {createdDate}</span>
            <span>•</span>
            <span>{createdTime}</span>
          </div>
        </div>

        <div className="mt-4 md:mt-0 font-mono text-4xl font-black text-[#C8522A]">
          {formatNTD(totalAmount)}
        </div>
      </div>

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

      </div>


      <div className="mb-8 rounded-[2rem] border border-[#E2DDD4] bg-white p-8 shadow-sm">
        <h3 className="mb-5 text-lg font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block" />
          訂單操作
        </h3>

        {shippingStatus !== "delivered" ? (
          <div className="text-sm text-[#8C8880]">
            商品送達後，可在這裡確認完成訂單或申請退貨退款。
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#E2DDD4] bg-[#F8F9FA] p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-[#1A1A18]">
                    {orderData.order_status === "completed" ? "✓ 訂單已完成" : "商品已送達"}
                  </div>

                  <div className="mt-1 text-xs leading-relaxed text-[#8C8880]">
                    {orderData.order_status === "completed"
                      ? "你已確認收到商品；若仍在退貨申請期限內，仍可依規則提出退貨退款。完成訂單後，對應商品的代言任務也會開放申請。"
                      : "確認收到商品後可完成訂單，完成後即可解鎖對應商品的代言任務。若商品有問題，也可在期限內申請退貨退款。"}
                  </div>
                </div>

                {orderData.order_status !== "completed" && (
                  <button
                    type="button"
                    onClick={handleCompleteOrder}
                    disabled={completingOrder || Boolean(hasOpenReturn)}
                    className="shrink-0 rounded-full bg-[#C8522A] px-7 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#A64220] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {completingOrder ? "處理中..." : "完成訂單"}
                  </button>
                )}
              </div>

              {hasOpenReturn && orderData.order_status !== "completed" && (
                <div className="mt-3 text-xs font-bold text-[#C8522A]">
                  此訂單目前有退貨退款申請處理中，暫不開放完成訂單。
                </div>
              )}
            </div>

            <div className="border-t border-[#E2DDD4] pt-5">
              <div className="mb-3 text-sm font-bold text-[#1A1A18]">退貨退款</div>

              {returnLoading ? (
                <div className="text-sm text-[#8C8880]">退貨退款資料載入中...</div>
              ) : latestReturn ? (
                <div className="rounded-2xl bg-[#F8F9FA] border border-[#E2DDD4] p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {latestReturn.status === "refunded" ? (
                          <CheckCircle2 size={18} className="text-green-600" />
                        ) : latestReturn.status === "rejected" ? (
                          <AlertTriangle size={18} className="text-[#C8522A]" />
                        ) : (
                          <RotateCcw size={18} className="text-[#C8522A]" />
                        )}
                        <span className="font-bold text-[#1A1A18]">
                          {RETURN_STATUS_LABELS[latestReturn.status] || latestReturn.status}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-[#8C8880] space-y-1">
                        <div>申請退款金額：{formatNTD(latestReturn.requested_amount)}</div>
                        {latestReturn.refunded_amount != null && (
                          <div>實際退款金額：{formatNTD(latestReturn.refunded_amount)}</div>
                        )}
                        {latestReturn.vendor_note && <div>廠商說明：{latestReturn.vendor_note}</div>}
                        {latestReturn.admin_note && <div>平台說明：{latestReturn.admin_note}</div>}
                      </div>
                    </div>

                    {latestReturn.status === "rejected" && (
                      <button
                        type="button"
                        onClick={handleDispute}
                        disabled={returnSubmitting}
                        className="rounded-full border border-[#C8522A] px-6 py-3 text-sm font-bold text-[#C8522A] hover:bg-[#FDF0ED] disabled:opacity-50"
                      >
                        提出爭議
                      </button>
                    )}
                  </div>
                </div>
              ) : canCreateReturn ? (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="text-sm text-[#8C8880]">
                    若商品有問題，可在平台允許的退貨期限內申請整張訂單全額退款。
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReturnModal(true)}
                    className="shrink-0 rounded-full border border-[#1A1A18] bg-white px-7 py-3 text-sm font-bold text-[#1A1A18] transition-colors hover:bg-[#1A1A18] hover:text-white"
                  >
                    申請退貨退款
                  </button>
                </div>
              ) : orderData.payment_status === "refunded" ? (
                <div className="text-sm font-bold text-green-700">此訂單已完成退款。</div>
              ) : (
                <div className="text-sm text-[#8C8880]">
                  此訂單目前沒有可操作的退貨退款申請。
                </div>
              )}
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
                    {getFullRecipientAddress(recipient)}
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

      <div className="mb-8 rounded-[2rem] border border-[#E2DDD4] bg-white p-8 shadow-sm overflow-hidden">
        <h3 className="mb-6 text-lg font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#1A1A18] rounded-full inline-block" />
          商品目錄
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
      </div>

      <div className="rounded-[2rem] border border-[#E2DDD4] bg-[#F8F9FA] p-8 shadow-sm">
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
                {getFullRecipientAddress(recipient) === "未提供" ? "未填寫" : getFullRecipientAddress(recipient)}
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


      {showReturnModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1A1A18]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl">
            <h3 className="text-xl font-serif font-black text-[#1A1A18]">申請整張訂單退貨退款</h3>
            <p className="mt-2 text-sm text-[#8C8880]">
              此版本僅支援整張訂單全額退款，退款金額由後端依訂單總額計算。
            </p>

            <label className="mt-6 block text-sm font-bold text-[#1A1A18]">退貨原因</label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#E2DDD4] bg-[#F8F9FA] px-4 py-3 text-sm outline-none focus:border-[#C8522A]"
            >
              {RETURN_REASON_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>

            <label className="mt-5 block text-sm font-bold text-[#1A1A18]">補充說明</label>
            <textarea
              value={returnDescription}
              onChange={(e) => setReturnDescription(e.target.value)}
              rows={4}
              placeholder="可補充商品狀況或退貨原因..."
              className="mt-2 w-full resize-none rounded-xl border border-[#E2DDD4] bg-[#F8F9FA] px-4 py-3 text-sm outline-none focus:border-[#C8522A]"
            />

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                disabled={returnSubmitting}
                className="flex-1 rounded-xl border border-[#E2DDD4] py-3 text-sm font-bold text-[#8C8880]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateReturn}
                disabled={returnSubmitting}
                className="flex-[2] rounded-xl bg-[#1A1A18] py-3 text-sm font-bold text-white hover:bg-[#C8522A] disabled:opacity-50"
              >
                {returnSubmitting ? "送出中..." : `確認申請 ${formatNTD(orderData.total_amount)}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}