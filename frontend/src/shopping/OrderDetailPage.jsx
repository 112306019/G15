import React, { useState, useEffect } from "react";
import { ArrowLeft, FileText, Box, Truck, Heart, Smartphone } from "lucide-react";

export default function OrderDetailPage({ onBack, orderId }) {
  const [step, setStep] = useState(1);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    const fetchOrder = async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/consumer/order/view?Order_id=${orderId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setOrderData(data[0]);
          // 根據出貨狀態決定進度
          const s = data[0].shipping_status;
          if (s === "unshipped") setStep(0);
          else if (s === "shipped") setStep(2);
          else if (s === "delivered") setStep(3);
          else setStep(1);
        }
      } catch (err) {
        console.error("訂單詳情載入失敗", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const fillWidth = ["0%", "33%", "66%", "100%"][step] ?? "33%";

  const steps = [
    { label: "已確認訂單", icon: FileText },
    { label: "廠商出貨中", icon: Box },
    { label: "運送中", icon: Truck },
    { label: "抵達", icon: Heart },
  ];

  const totalAmount = orderData?.total_amount ?? 0;
  const createdAt = orderData?.created_at
    ? new Date(orderData.created_at)
    : new Date();
  const createdDate = createdAt.toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });
  const createdTime = createdAt.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });

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
        <div className="py-20 text-center text-[#8C8880]">訂單載入中...</div>
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
        <div className="py-20 text-center text-[#8C8880]">找不到訂單資料，請返回訂單列表重新查看</div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl">

      {/* 返回按鈕 */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回訂單列表
      </button>

      <h2 className="text-[28px] font-serif font-bold text-[#1A1A18] mb-8">訂單細節</h2>

      {/* 訂單摘要卡片 */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between rounded-[2.5rem] border border-[#E2DDD4] bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
        <div>
          <div className="mb-2 font-mono text-2xl font-bold text-[#1A1A18]">#{orderData.Order_id}</div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-[#8C8880]">
            <span>訂購於 {createdDate}</span>
            <span>•</span>
            <span>{createdTime}</span>
          </div>
        </div>
        <div className="mt-4 md:mt-0 font-mono text-4xl font-black text-[#C8522A]">
          NTD$ {totalAmount}
        </div>
      </div>

      <p className="mb-10 text-sm font-bold text-[#8C8880]">
        訂單狀態：<strong className="text-[#1A1A18] tracking-wider">
          {orderData?.order_status === "pending" ? "處理中"
            : orderData?.order_status === "completed" ? "已完成"
              : orderData?.order_status === "cancelled" ? "已取消"
                : "處理中"}
        </strong>
      </p>

      {/* 物流進度條 */}
      <div className="relative mb-16 px-4">
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
              <div key={s.label} className="flex flex-col items-center gap-4 w-24 group">
                <div
                  className={`grid h-12 w-12 place-items-center rounded-full border-4 transition-all duration-500 bg-white ${isDone
                    ? "border-[#C8522A] bg-[#C8522A] text-white shadow-[0_0_15px_rgba(200,82,42,0.3)]"
                    : isActive
                      ? "border-[#C8522A] text-[#C8522A] shadow-sm"
                      : "border-[#E2DDD4] text-[#8C8880]"
                    }`}
                >
                  <DotIcon size={20} className={isDone ? "text-white" : ""} />
                </div>
                <div className={`text-sm text-center font-bold transition-colors ${i <= step ? "text-[#1A1A18]" : "text-[#8C8880]"}`}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 訂單動態 */}
      <div className="mb-8 rounded-[2rem] border border-[#E2DDD4] bg-white p-8 shadow-sm">
        <h3 className="mb-8 text-lg font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block"></span>
          訂單詳情
        </h3>
        <div className="flex flex-col ml-4">
          {[
            {
              status: orderData?.shipping_status === "shipped" ? "包裹配送中" : "已收到訂單",
              date: createdDate + " at " + createdTime,
              active: true,
            },
            {
              status: "已確認訂單",
              date: createdDate,
              active: step >= 1,
            },
            {
              status: "已收到訂單，廠商將於確認後安排出貨",
              date: createdDate,
              active: false,
            },
          ].map((item, idx, arr) => (
            <div key={idx} className="relative flex gap-6 pb-8 last:pb-0">
              {idx !== arr.length - 1 && (
                <div className="absolute left-[11px] top-8 h-full w-[2px] bg-[#E2DDD4]" />
              )}
              <div
                className={`mt-1 h-6 w-6 rounded-full border-4 flex-shrink-0 z-10 bg-white transition-colors ${item.active ? "border-[#C8522A]" : "border-[#E2DDD4]"
                  }`}
              />
              <div>
                <div className={`mb-1 text-base font-bold ${item.active ? "text-[#1A1A18]" : "text-[#8C8880]"}`}>
                  {item.status}
                </div>
                <div className="text-sm font-medium text-[#8C8880]/70">{item.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 商品目錄 */}
      <div className="mb-8 rounded-[2rem] border border-[#E2DDD4] bg-white p-8 shadow-sm overflow-hidden">
        <h3 className="mb-6 text-lg font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#1A1A18] rounded-full inline-block"></span>
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
              {(orderData?.items || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#8C8880]">無商品資料</td>
                </tr>
              ) : (orderData?.items || []).map((item, idx) => (
                <tr key={idx} className="border-b border-[#F5F0E8] last:border-0 hover:bg-[#F8F9FA] transition-colors">
                  <td className="py-6 pr-4">
                    <div className="flex items-center gap-5">
                      <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-[#F5F0E8] flex items-center justify-center border border-[#E2DDD4]">
                        <Smartphone size={24} className="text-[#8C8880]" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#1A1A18] max-w-sm leading-relaxed">
                          {item.product_name || `商品 ${item.Product_id}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-4 text-center font-mono text-sm font-bold text-[#8C8880]">
                    NTD$ {item.Unit_price}
                  </td>
                  <td className="py-6 px-4 text-center font-mono text-sm font-bold text-[#8C8880]">
                    x{item.quantity}
                  </td>
                  <td className="py-6 pl-4 text-right font-mono text-base font-black text-[#C8522A]">
                    NTD$ {item.subtotal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 收件資訊 */}
      <div className="rounded-[2rem] border border-[#E2DDD4] bg-[#F8F9FA] p-8 shadow-sm">
        <h3 className="mb-6 text-lg font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#8C8880] rounded-full inline-block"></span>
          收件資訊
        </h3>
        <div className="space-y-4 text-sm font-medium">
          <div className="flex">
            <span className="w-24 text-[#8C8880]">地址編號</span>
            <span className="text-[#1A1A18] font-bold">{orderData?.Address_id || "未填寫"}</span>
          </div>
          <div className="flex">
            <span className="w-24 text-[#8C8880]">付款狀態</span>
            <span className="text-[#1A1A18] font-bold">
              {orderData?.payment_status === "paid" ? "已付款" : "未付款"}
            </span>
          </div>
          <div className="flex">
            <span className="w-24 text-[#8C8880]">出貨狀態</span>
            <span className="text-[#1A1A18] font-bold">
              {orderData?.shipping_status === "shipped" ? "已出貨"
                : orderData?.shipping_status === "delivered" ? "已送達"
                  : "待出貨"}
            </span>
          </div>
          {orderData?.promotion_code && (
            <div className="flex">
              <span className="w-24 text-[#8C8880]">優惠碼</span>
              <span className="text-[#1A1A18] font-bold">{orderData.promotion_code}</span>
            </div>
          )}
        </div>
      </div>

      {orderData?.shipping_status === 'delivered' && orderData?.order_status !== 'completed' && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={async () => {
              try {
                await fetch("http://127.0.0.1:8000/api/consumer/order/update", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    Order_id: orderId,
                    order_status: "completed",
                  }),
                });
                setOrderData((prev) => ({ ...prev, order_status: "completed" }));
              } catch (err) {
                console.error("確認收貨失敗", err);
              }
            }}
            className="bg-[#1A1A18] text-[#F5F0E8] px-8 py-3.5 rounded-full font-bold text-sm hover:bg-[#C8522A] transition-all hover:-translate-y-0.5"
          >
            確認收貨
          </button>
        </div>
      )}

    </div>
  );
}
