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
    <span className={`rounded-full px-3 py-1 font-mono text-[11px] tracking-[0.07em] font-bold ${s.className}`}>
      {s.text}
    </span>
  );
}

function OrderCard({ id, eta, progress = 0.5, onTrack }) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div className="cursor-pointer rounded-[1.5rem] border border-[#E2DDD4] bg-white p-6 transition-all hover:-translate-y-[2px] hover:border-[#B89B6A] hover:shadow-[0_8px_28px_rgba(26,26,24,0.06)]">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm font-bold text-[#1A1A18] tracking-wide">訂單編號 #{id}</span>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <span className="text-[#8C8880] bg-[#F5F0E8] p-3 rounded-full">
          <IconClock className="h-5 w-5" />
        </span>

        <div>
          <div className="text-xs font-bold tracking-wider text-[#8C8880] mb-1">預計將抵達日期</div>
          {/* 🟢 換回系統統一的 font-serif 高級襯線字體 */}
          <div className="font-serif font-bold text-2xl leading-tight text-[#1A1A18]">{eta}</div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTrack?.();
          }}
          className="ml-auto whitespace-nowrap rounded-full bg-[#1A1A18] px-6 py-3 text-sm font-bold text-[#F5F0E8] transition-colors hover:bg-[#C8522A] shadow-sm"
        >
          追蹤訂單
        </button>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-[#F5F0E8]">
        <div className="h-full rounded-full bg-[#C8522A] transition-[width] duration-500" style={{ width: `${pct}%` }} />
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
    <div className="rounded-[1.5rem] border border-[#E2DDD4] bg-white p-6 transition-shadow hover:shadow-[0_8px_28px_rgba(26,26,24,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-bold text-[#1A1A18] tracking-wide">
          {order.title || `訂單編號 #${order.id}`}
        </span>
        {order.status && <StatusBadge status={order.status} />}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-5 text-sm font-medium text-[#8C8880]">
        <div className="flex items-center gap-2">
          <IconCalendar className="h-4 w-4" />
          {order.date}
        </div>
        <div className="flex items-center gap-2">
          <IconClock className="h-4 w-4" />
          {order.time}
        </div>
      </div>

      {/* items */}
      <div className="mb-6">
        {shownItems.map((it, idx) => (
          <div
            key={`${it.name}-${idx}`}
            className={`flex items-center gap-4 py-3 ${idx !== shownItems.length - 1 ? "border-b border-[#E2DDD4]" : ""}`}
          >
            <span className="min-w-6 text-center font-mono text-sm font-bold text-[#1A1A18] bg-[#F5F0E8] rounded-md py-1">
              {it.qty}
            </span>
            <span className="text-sm font-bold text-[#1A1A18]">{it.name}</span>
          </div>
        ))}
      </div>

      {/* more toggle */}
      {extraCount > 0 && (
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="mb-6 flex w-full items-center justify-between border-t border-[#E2DDD4] pt-4 text-sm font-bold text-[#8C8880] transition-colors hover:text-[#C8522A]"
        >
          <span>{extraCount} 更多項目</span>
          <IconChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
          />
        </button>
      )}

      {/* actions */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => {
            onOpenDetail?.(order.id);
            setDetailOpen((v) => !v);
          }}
          className="rounded-full bg-[#1A1A18] px-6 py-3 text-sm font-bold text-[#F5F0E8] transition-colors hover:bg-[#C8522A] shadow-sm"
        >
          {detailOpen ? "收起細節" : "訂單細節"}
        </button>

        <button
          type="button"
          className="rounded-full border border-[#E2DDD4] bg-white px-6 py-3 text-sm font-bold text-[#8C8880] transition-all hover:border-[#1A1A18] hover:text-[#1A1A18]"
        >
          幫助
        </button>
      </div>

      {/* expandable detail panel */}
      {order.detail && (
        <div className={`mt-6 border-t border-[#E2DDD4] pt-6 ${detailOpen ? "block" : "hidden"}`}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 bg-[#F8F9FA] p-6 rounded-2xl">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8C8880]">送貨地址</div>
              <p className="text-sm font-bold text-[#1A1A18] leading-relaxed">{order.detail.address}</p>
            </div>
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8C8880]">付款方式</div>
              <p className="text-sm font-bold text-[#1A1A18] leading-relaxed">{order.detail.payment}</p>
            </div>
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8C8880]">訂單金額</div>
              <p className="text-sm font-bold text-[#C8522A] leading-relaxed">{order.detail.amount}</p>
            </div>
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8C8880]">
                {order.detail.reason ? "取消原因" : "配送方式"}
              </div>
              <p className="text-sm font-bold text-[#1A1A18] leading-relaxed">
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
  onTrackOrder, 
  onOpenOrderDetail, 
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
        date: "九月 16, 2026",
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
        date: "八月 29, 2026",
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
    ],
    []
  );

  return (
    // 🟢 加上統一大寬度的 max-w-5xl
    <div className="max-w-5xl animate-in fade-in duration-500 space-y-12">
      
      {/* Active orders */}
      <section>
        <h2 className="text-[28px] font-serif font-bold text-[#1A1A18] mb-8">購買清單</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
        <h2 className="text-[28px] font-serif font-bold text-[#1A1A18] mb-8 mt-4">訂購記錄</h2>

        <div className="flex flex-col gap-6">
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