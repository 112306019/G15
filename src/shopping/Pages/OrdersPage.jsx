import React, { useMemo, useState } from "react";

function IconClock(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconCalendar(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconChevronDown(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function StatusBadge({ status }) {
  const map = {
    complete: { text: "訂單已完成", className: "bg-[#E8F5E8] text-[#4A9B4A]" },
    cancelled: { text: "已取消", className: "bg-[#F5EAE8] text-[#C8522A]" },
    shipping: { text: "運送中", className: "bg-[#E8EEF5] text-[#4A6A9B]" },
  };
  const s = map[status] || { text: "狀態未知", className: "bg-[#F5F0E8] text-[#8C8880]" };
  return (
    <span className={`rounded-full px-3 py-1 font-mono text-[11px] tracking-[0.07em] ${s.className}`}>
      {s.text}
    </span>
  );
}

function OrderCard({ id, eta, progress = 0.5, onTrack }) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div className="cursor-pointer rounded-[14px] border border-[#E2DDD4] bg-white p-5 transition-all hover:-translate-y-[2px] hover:border-[#E8C4B4] hover:shadow-[0_8px_28px_rgba(26,26,24,0.08)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-bold text-[#1A1A18] tracking-[0.02em]">訂單編號 #{id}</span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span className="text-[#8C8880]">
          <IconClock className="h-4 w-4" />
        </span>

        <div>
          <div className="text-[11px] tracking-[0.05em] text-[#8C8880]">預計將抵達日期</div>
          <div className="font-['DM_Serif_Display'] text-[22px] leading-tight text-[#1A1A18]">{eta}</div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTrack?.();
          }}
          className="ml-auto whitespace-nowrap rounded-full bg-[#1A1A18] px-[18px] py-[10px] text-[13px] text-[#F5F0E8] transition-colors hover:bg-[#C8522A]"
        >
          追蹤訂單
        </button>
      </div>

      <div className="h-1 overflow-hidden rounded bg-[#E2DDD4]">
        <div className="h-full rounded bg-[#1A1A18] transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HistoryCard({ order, onOpenDetail }) {
  const [moreOpen, setMoreOpen] = useState(Boolean(order.moreDefaultOpen));
  const [detailOpen, setDetailOpen] = useState(false);

  const shownItems = moreOpen ? order.items : order.items.slice(0, 2);
  const extraCount = Math.max(0, order.items.length - 2);

  return (
    <div className="rounded-[14px] border border-[#E2DDD4] bg-white p-5 transition-shadow hover:shadow-[0_8px_28px_rgba(26,26,24,0.07)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-[#1A1A18] tracking-[0.02em]">
          {order.title || `訂單編號 #${order.id}`}
        </span>
        {order.status && <StatusBadge status={order.status} />}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-5 text-xs text-[#8C8880]">
        <div className="flex items-center gap-2">
          <IconCalendar className="h-[14px] w-[14px]" />
          {order.date}
        </div>
        <div className="flex items-center gap-2">
          <IconClock className="h-[14px] w-[14px]" />
          {order.time}
        </div>
      </div>

      {/* items */}
      <div className="mb-4">
        {shownItems.map((it, idx) => (
          <div
            key={`${it.name}-${idx}`}
            className={`flex items-center gap-3 py-2 ${idx !== shownItems.length - 1 ? "border-b border-[#E2DDD4]" : ""}`}
          >
            <span className="min-w-5 text-center font-mono text-[13px] font-bold text-[#1A1A18]">
              {it.qty}
            </span>
            <span className="text-[13px] text-[#1A1A18]">{it.name}</span>
          </div>
        ))}
      </div>

      {/* more toggle */}
      {extraCount > 0 && (
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="mb-4 flex w-full items-center justify-between border-t border-[#E2DDD4] pt-3 text-[13px] text-[#8C8880] transition-colors hover:text-[#1A1A18]"
        >
          <span>{extraCount} 更多項目</span>
          <IconChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
          />
        </button>
      )}

      {/* actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            // 你可以選擇：在這裡直接切到 order detail page（推薦）
            onOpenDetail?.(order.id);
            // 或保留原本這個卡片內展開
            setDetailOpen((v) => !v);
          }}
          className="rounded-full bg-[#1A1A18] px-5 py-[10px] text-[13px] text-[#F5F0E8] transition-colors hover:bg-[#C8522A]"
        >
          {detailOpen ? "收起細節" : "訂單細節"}
        </button>

        <button
          type="button"
          className="rounded-full border-[1.5px] border-[#E2DDD4] px-5 py-[10px] text-[13px] text-[#8C8880] transition-all hover:border-[#1A1A18] hover:text-[#1A1A18]"
        >
          幫助
        </button>
      </div>

      {/* expandable detail panel */}
      {order.detail && (
        <div className={`mt-5 border-t border-[#E2DDD4] pt-5 ${detailOpen ? "block" : "hidden"}`}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-[0.09em] text-[#8C8880]">送貨地址</div>
              <p className="text-[13px] text-[#1A1A18] leading-relaxed">{order.detail.address}</p>
            </div>
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-[0.09em] text-[#8C8880]">付款方式</div>
              <p className="text-[13px] text-[#1A1A18] leading-relaxed">{order.detail.payment}</p>
            </div>
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-[0.09em] text-[#8C8880]">訂單金額</div>
              <p className="text-[13px] text-[#1A1A18] leading-relaxed">{order.detail.amount}</p>
            </div>
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-[0.09em] text-[#8C8880]">
                {order.detail.reason ? "取消原因" : "配送方式"}
              </div>
              <p className="text-[13px] text-[#1A1A18] leading-relaxed">
                {order.detail.reason || order.detail.shipping}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage({
  onTrackOrder, // () => setView('order_detail') / 或 setView + 帶 id
  onOpenOrderDetail, // (orderId) => ...
}) {
  const activeOrders = useMemo(
    () => [
      { id: "123456", eta: "2026/01/31", progress: 0.65 },
      { id: "11112", eta: "2026/02/17", progress: 0.3 },
    ],
    []
  );

  const historyOrders = useMemo(
    () => [
      {
        id: "14256",
        status: "complete",
        date: "九月 16, 2020",
        time: "11:54 PM",
        items: [
          { qty: 1, name: "茶壺" },
          { qty: 1, name: "茶具" },
        ],
        detail: {
          address: "台中市西區民生路 100 號",
          payment: "信用卡 **** 1234",
          amount: "$48.50",
          shipping: "標準快遞",
        },
      },
      {
        id: "32561",
        status: "cancelled",
        date: "八月 29, 2020",
        time: "12:06 AM",
        items: [
          { qty: 3, name: "衛生紙" },
          { qty: 1, name: "濕紙巾" },
          { qty: 2, name: "紙巾盒" },
        ],
        detail: {
          address: "台中市北區進化路 55 號",
          payment: "轉帳",
          amount: "$22.80",
          reason: "買家申請取消",
        },
      },
      {
        id: "32561-en",
        title: "Order #32561",
        status: "cancelled",
        date: "August 29, 2020",
        time: "12:06 AM",
        moreDefaultOpen: true,
        items: [
          { qty: 3, name: "Blueberry Cupcake" },
          { qty: 1, name: "Tropical Soda" },
          { qty: 1, name: "Mango Smoothie" },
        ],
      },
    ],
    []
  );

  return (
    <div className="space-y-12">
      {/* Active orders */}
      <section>
        <h2 className="relative inline-block font-['DM_Serif_Display'] text-[26px] text-[#1A1A18]">
          購買清單
          <span className="absolute left-0 top-[calc(100%+4px)] h-[2px] w-7 rounded bg-[#C8522A]" />
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {activeOrders.map((o) => (
            <OrderCard
              key={o.id}
              id={o.id}
              eta={o.eta}
              progress={o.progress}
              onTrack={() => onTrackOrder?.(o.id)}
            />
          ))}
        </div>
      </section>

      {/* History */}
      <section>
        <h2 className="relative inline-block font-['DM_Serif_Display'] text-[26px] text-[#1A1A18]">
          訂購記錄
          <span className="absolute left-0 top-[calc(100%+4px)] h-[2px] w-7 rounded bg-[#C8522A]" />
        </h2>

        <div className="mt-5 flex flex-col gap-4">
          {historyOrders.map((order) => (
            <HistoryCard
              key={order.id}
              order={order}
              onOpenDetail={(orderId) => onOpenOrderDetail?.(orderId)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}