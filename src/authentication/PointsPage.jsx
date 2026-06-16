import React, { useMemo } from "react";

function IconGift(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
      <path d="M2 7h20v5H2z" />
      <path d="M12 22V7" />
      <path d="M12 7c-1.5 0-4-1-4-3a2 2 0 0 1 4 0" />
      <path d="M12 7c1.5 0 4-1 4-3a2 2 0 0 0-4 0" />
    </svg>
  );
}

export default function PointsPage({
  points = 30,
  expiringPoints = 5,
  history = [
    { orderId: "96459761", delta: +1 },
    { orderId: "71667167", delta: +2 },
    { orderId: "51746385", delta: +1 },
  ],
  onRedeemDetail, // optional: () => setView('redeem') 之類
}) {
  const COLORS = useMemo(
    () => ({
      cream: "#F5F0E8",
      ink: "#1A1A18",
      warm: "#8C8880",
      border: "#E2DDD4",
      accent: "#C8522A",
      gold: "#B89B6A",
      cardHover: "#FDFAF6",
    }),
    []
  );

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">我的點數</h1>

      {/* Current points */}
      <section className="rounded-[14px] border border-[#E2DDD4] bg-white px-7 py-6">
        <div className="mb-4 text-[15px] font-bold text-[#1A1A18]">目前擁有點數</div>

        <div className="font-mono text-[28px] font-bold text-[#1A1A18]">{points}點</div>
        <div className="mt-1 text-xs text-[#8C8880]">30天內即將到期點數：{expiringPoints}點</div>

        <div className="my-5 h-px bg-[#E2DDD4]" />

        <div className="flex items-center justify-between">
          <span className="text-sm text-[#1A1A18]">兌換禮品</span>

          <button
            type="button"
            onClick={onRedeemDetail}
            className="rounded-full border-[1.5px] border-[#E2DDD4] bg-transparent px-5 py-2 text-[13px] text-[#1A1A18] transition-all hover:border-[#1A1A18] hover:bg-[#F5F0E8]"
          >
            詳細頁面
          </button>
        </div>
      </section>

      {/* Points history */}
      <section className="overflow-hidden rounded-[14px] border border-[#E2DDD4] bg-white">
        <div className="px-7 pb-0 pt-5">
          <div className="text-[15px] font-bold text-[#1A1A18]">點數明細</div>
        </div>

        <div className="mt-4">
          {history.map((h, idx) => {
            const positive = h.delta >= 0;
            return (
              <div
                key={`${h.orderId}-${idx}`}
                className="flex items-center justify-between border-t border-[#E2DDD4] px-7 py-[18px] transition-colors hover:bg-[#FDFAF6]"
              >
                <span className="text-sm text-[#1A1A18]">訂單 #{h.orderId}</span>

                <span
                  className={[
                    "whitespace-nowrap rounded-full border-[1.5px] px-4 py-1 font-mono text-xs",
                    positive
                      ? "border-[#B89B6A] bg-[#FBF6EE] text-[#B89B6A]"
                      : "border-[#E2DDD4] bg-[#F5F0E8] text-[#1A1A18]",
                  ].join(" ")}
                >
                  {positive ? `獲得 ${h.delta} 點` : `使用 ${Math.abs(h.delta)} 點`}
                </span>
              </div>
            );
          })}

          {history.length === 0 && (
            <div className="border-t border-[#E2DDD4] px-7 py-10 text-center text-sm text-[#8C8880]">
              目前沒有點數異動紀錄
            </div>
          )}
        </div>
      </section>

      {/* Optional tiny helper (你不想要可以刪) */}
      <div className="flex items-center gap-2 text-xs text-[#8C8880]">
        <IconGift className="h-4 w-4" />
        點數可用於兌換禮品／折抵（依平台規則）
      </div>
    </div>
  );
}