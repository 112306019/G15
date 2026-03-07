import React, { useMemo, useState } from "react";

function IconArrowLeft(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}
function IconCheck(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconDoc(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}
function IconBoxSearch(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M21 10V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l2-1.14" />
      <path d="M16.5 9.4L7.55 4.24" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
      <circle cx="18.5" cy="15.5" r="2.5" />
      <path d="M20.27 17.27L22 19" />
    </svg>
  );
}
function IconTruck(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
function IconHeart(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
function IconPhone(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}
function IconCase(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
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

export default function OrderDetailPage({
  onBack, // 你可以從 App.jsx 傳：onBack={() => setView('orders')}
}) {
  const COLORS = useMemo(
    () => ({
      cream: "#F5F0E8",
      ink: "#1A1A18",
      warm: "#8C8880",
      border: "#E2DDD4",
      orange: "#E07A3A",
      green: "#5aab5a",
      blue: "#4A7DB5",
      card: "#FDFAF6",
    }),
    []
  );

  // 0:已確認 1:出貨中 2:運送中 3:抵達
  const [step, setStep] = useState(1);

  const [refundDone, setRefundDone] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);

  const [missionDone, setMissionDone] = useState(false);
  const [missionLoading, setMissionLoading] = useState(false);

  const fillWidth = ["0%", "40%", "70%", "100%"][step] ?? "40%";

  const steps = [
    { label: "已確認訂單", icon: IconDoc },
    { label: "廠商出貨中", icon: IconBoxSearch },
    { label: "運送中", icon: IconTruck },
    { label: "抵達", icon: IconHeart },
  ];

  const handleRefund = async () => {
    if (refundLoading || refundDone) return;
    setRefundLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setRefundLoading(false);
    setRefundDone(true);
  };

  const handleMission = async () => {
    if (missionLoading || missionDone) return;
    setMissionLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setMissionLoading(false);
    setMissionDone(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18]">
      {/* ✅ NAV 已移除（你們外層有固定抬頭） */}

      <div className="mx-auto grid max-w-[1060px] grid-cols-1 gap-10 px-6 pb-20 pt-9 md:grid-cols-[220px_1fr]">
        {/* 這裡 Sidebar 你們 App.jsx 已經有統一 Sidebar，就不用再放 */}
        {/* 如果你這頁是在 main 區域顯示，這個檔案只要渲染 content 即可 */}
        {/* ↓↓↓ 內容區（等同你的 .content） */}
        <div className="md:col-start-2">
          {/* Back */}
          <button
            type="button"
            onClick={onBack}
            className="mb-5 inline-flex items-center gap-2 text-sm text-[#8C8880] transition-colors hover:text-[#1A1A18]"
          >
            <IconArrowLeft className="h-[18px] w-[18px]" />
            訂單細節
          </button>

          {/* Summary card */}
          <div className="mb-6 flex items-center justify-between rounded-xl border border-[#E2DDD4] bg-[#F5F0E8] px-6 py-5">
            <div>
              <div className="mb-1.5 font-mono text-[18px] font-bold">#123456</div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#8C8880]">
                <span>2 件商品</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <IconCalendar className="h-3 w-3" />
                  訂購於 17 Jan, 2026
                </span>
                <span>7:32 PM</span>
              </div>
            </div>

            <div className="font-mono text-[28px] font-bold">$1199.00</div>
          </div>

          {/* ETA */}
          <p className="mb-4 text-xs text-[#8C8880]">
            商品預計於 <strong className="text-[#1A1A18]">2026/01/31</strong> 抵達
          </p>

          {/* Tracker */}
          <div className="relative mb-8">
            <div className="absolute left-0 right-0 top-[11px] h-[3px] rounded bg-[#E2DDD4]" />
            <div
              className="absolute left-0 top-[11px] h-[3px] rounded bg-[#E07A3A] transition-all duration-700"
              style={{ width: fillWidth }}
            />

            <div className="relative z-10 flex items-start justify-between">
              {steps.map((s, i) => {
                const DotIcon = s.icon;
                const isDone = i < step;
                const isActive = i === step;
                return (
                  <div key={s.label} className="flex flex-1 flex-col items-center gap-2.5">
                    {/* dot */}
                    <div
                      className={[
                        "grid h-[22px] w-[22px] place-items-center rounded-full border-[2.5px] bg-white transition-all",
                        isDone ? "border-[#E07A3A] bg-[#E07A3A]" : "",
                        isActive ? "border-[#E07A3A]" : "",
                        !isDone && !isActive ? "border-[#E2DDD4]" : "",
                      ].join(" ")}
                      aria-label={`step-${i}`}
                    >
                      {isDone ? <IconCheck className="h-3 w-3 text-white" /> : isActive ? <span className="h-2 w-2 rounded-full bg-[#E07A3A]" /> : null}
                    </div>

                    {/* icon */}
                    <div className="grid h-8 w-8 place-items-center">
                      <DotIcon
                        className={[
                          "h-[22px] w-[22px]",
                          i <= step ? "text-[#E07A3A]" : "text-[#E2DDD4]",
                        ].join(" ")}
                      />
                    </div>

                    <div className={["text-xs text-center whitespace-nowrap", i <= step ? "text-[#1A1A18] font-bold" : "text-[#8C8880]"].join(" ")}>
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 方便 demo：你要的話可刪 */}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="rounded-full border border-[#E2DDD4] bg-white px-4 py-2 text-xs text-[#8C8880] hover:border-[#1A1A18] hover:text-[#1A1A18]"
                onClick={() => setStep((v) => Math.max(0, v - 1))}
              >
                上一步（demo）
              </button>
              <button
                type="button"
                className="rounded-full border border-[#E2DDD4] bg-white px-4 py-2 text-xs text-[#8C8880] hover:border-[#1A1A18] hover:text-[#1A1A18]"
                onClick={() => setStep((v) => Math.min(3, v + 1))}
              >
                下一步（demo）
              </button>
            </div>
          </div>

          {/* Panel: timeline */}
          <div className="mb-4 rounded-[14px] border border-[#E2DDD4] bg-white p-6">
            <div className="mb-5 text-[15px] font-bold">訂單詳情</div>

            <div className="flex flex-col">
              {[
                { kind: "shipping", title: "包裹配送中", date: "21 JAN , 2026 at 5:32 AM" },
                { kind: "confirmed", title: "已確認訂單", date: "20 Jan, 2026 at 7:32 PM" },
                { kind: "received", title: "已收到訂單，廠商將於確認後二次錄出貨", date: "19 Jan, 2026 at 2:61 PM" },
              ].map((t, idx, arr) => {
                const iconClass =
                  t.kind === "shipping"
                    ? "bg-[#EEF4FC] text-[#4A7DB5]"
                    : t.kind === "confirmed"
                    ? "bg-[#EEF8EE] text-[#5aab5a]"
                    : "bg-[#FEF3E8] text-[#E07A3A]";

                const Icon =
                  t.kind === "shipping" ? IconTruck : t.kind === "confirmed" ? IconCheck : IconDoc;

                return (
                  <div key={t.title} className="relative flex gap-4 pb-5 last:pb-0">
                    {idx !== arr.length - 1 && (
                      <div className="absolute left-4 top-[34px] h-[calc(100%-34px)] w-[1.5px] bg-[#E2DDD4]" />
                    )}

                    <div className={["grid h-8 w-8 place-items-center rounded-lg", iconClass].join(" ")}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div>
                      <div className="mb-0.5 text-sm font-bold">{t.title}</div>
                      <div className="text-[11px] text-[#8C8880]">{t.date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel: items table */}
          <div className="mb-4 rounded-[14px] border border-[#E2DDD4] bg-white p-6">
            <div className="mb-5 text-[15px] font-bold">商品目錄(02)</div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="bg-[#F5F0E8] text-left text-[11px] uppercase tracking-[0.09em] text-[#8C8880]">
                    <th className="px-3 py-2">商品名稱</th>
                    <th className="px-3 py-2">價格</th>
                    <th className="px-3 py-2">數量</th>
                    <th className="px-3 py-2 text-right">小計</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      cat: "SMARTPHONE",
                      catColor: "text-[#4A7DB5]",
                      name: "Google Pixel 6 Pro-5G Android Phone- Unlocked Smartphone with Advanced Pixel C...",
                      price: "$899",
                      qty: "x1",
                      sub: "$899",
                      thumb: (
                        <div className="grid h-12 w-12 place-items-center rounded-lg bg-[linear-gradient(135deg,#D0CCC8,#B4B0AC)]">
                          <IconPhone className="h-[22px] w-[22px] text-white/50" />
                        </div>
                      ),
                    },
                    {
                      cat: "ACCESSORIES",
                      catColor: "text-[#E07A3A]",
                      name: "Tech21 Evo Clear for Google Pixel 6 Pro- Crystal Clear Phone Case with 12ft Multi-Dr...",
                      price: "$39",
                      qty: "x1",
                      sub: "$39",
                      thumb: (
                        <div className="grid h-12 w-12 place-items-center rounded-lg bg-[linear-gradient(135deg,#D4D8DC,#B8BCBF)]">
                          <IconCase className="h-[22px] w-[22px] text-white/50" />
                        </div>
                      ),
                    },
                  ].map((row) => (
                    <tr key={row.name} className="border-t border-[#E2DDD4] hover:bg-[#FDFAF6]">
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3.5">
                          {row.thumb}
                          <div>
                            <div className={["mb-1 text-[10px] font-bold tracking-[0.1em]", row.catColor].join(" ")}>
                              {row.cat}
                            </div>
                            <div className="max-w-[340px] text-xs leading-snug">{row.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 font-mono text-[13px] text-[#8C8880]">{row.price}</td>
                      <td className="px-3 py-4 font-mono text-[13px] text-[#8C8880]">{row.qty}</td>
                      <td className="px-3 py-4 text-right font-mono text-[14px] font-bold">{row.sub}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom panels */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Address */}
            <div className="rounded-[14px] border border-[#E2DDD4] bg-white p-5">
              <div className="mb-3.5 text-[13px] font-bold">收件資訊</div>
              <div className="text-xs leading-7 text-[#8C8880]">
                <strong className="block text-[13px] text-[#1A1A18]">姓名</strong>
                地址
                <div className="flex gap-1">
                  <span className="text-[#8C8880]">手機號碼</span> +1-202-555-0118
                </div>
                <div className="flex gap-1">
                  <span className="text-[#8C8880]">郵件:</span> kevin.gilbert@gmail.com
                </div>
              </div>
            </div>

            {/* Refund */}
            <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-[#E2DDD4] bg-white p-5">
              <div className="text-[13px] font-bold">申請退貨</div>
              <button
                type="button"
                onClick={handleRefund}
                disabled={refundLoading || refundDone}
                className={[
                  "rounded-full px-5 py-2 text-[13px] text-white transition-colors",
                  refundDone ? "bg-[#5aab5a]" : refundLoading ? "bg-[#8C8880]" : "bg-[#E07A3A] hover:bg-[#C8522A]",
                ].join(" ")}
              >
                {refundDone ? "已申請退貨" : refundLoading ? "申請中..." : "申請退貨"}
              </button>
            </div>

            {/* Mission */}
            <div className="rounded-[14px] border border-[#E2DDD4] bg-white p-5">
              <div className="mb-3.5 text-[13px] font-bold">接任務</div>

              <button
                type="button"
                className="mb-2.5 w-full rounded-lg border border-[#E2DDD4] bg-[#F5F0E8] px-3.5 py-2.5 text-xs text-[#1A1A18] transition-all hover:border-[#1A1A18]"
              >
                查看任務詳細內容
              </button>

              <button
                type="button"
                onClick={handleMission}
                disabled={missionLoading || missionDone}
                className={[
                  "mb-2 w-full rounded-lg px-3.5 py-2.5 text-[13px] transition-colors",
                  missionDone ? "bg-[#5aab5a] text-white" : missionLoading ? "bg-[#8C8880] text-white" : "bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A]",
                ].join(" ")}
              >
                {missionDone ? "✓ 已申請" : missionLoading ? "申請中..." : "申請任務優惠碼"}
              </button>

              <div className="rounded-lg border border-[#E2DDD4] p-2.5 text-center text-[11px] text-[#8C8880]">
                申請成功，審核後顯示優惠碼
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}