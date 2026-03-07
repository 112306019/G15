import React, { useMemo, useState } from "react";

function ImgIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function HeartIcon({ filled = false }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5" />
      <path d="M12 5l-7 7 7 7" />
    </svg>
  );
}

const fmt = (n) => `$${n.toFixed(2)}`;

export default function CartPage({
  onContinueShopping,
  onCheckout,
  initialItems,
  pointsAvailable = 30,
  pointsDiscountAmount = 7.66,
  couponCode = "HAPPY",
  couponDiscountRate = 0.05, // 5%
}) {
  const [items, setItems] = useState(
    initialItems ?? [
      {
        id: "row0",
        name: "商品名",
        price: 33.9,
        qty: 1,
        wish: false,
        gradient: "from-[#C8C4BC] to-[#A8A49C]",
        removing: false,
      },
      {
        id: "row1",
        name: "商品名",
        price: 14.9,
        qty: 1,
        wish: false,
        gradient: "from-[#C4C8D4] to-[#A4AABB]",
        removing: false,
      },
      {
        id: "row2",
        name: "商品名",
        price: 16.9,
        qty: 1,
        wish: false,
        gradient: "from-[#C8D4C4] to-[#A8B8A4]",
        removing: false,
      },
    ]
  );

  const [coupon, setCoupon] = useState("HAPPY");
  const [couponApplied, setCouponApplied] = useState(true);
  const [couponMsg, setCouponMsg] = useState({ show: true, text: "已獲得優惠！", ok: true });

  const [pointsApplied, setPointsApplied] = useState(false);

  const count = items.filter((it) => !it.removing).length;

  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.removing ? 0 : it.price * it.qty), 0);
  }, [items]);

  const couponDiscount = couponApplied ? subtotal * couponDiscountRate : 0;
  const pointsDiscount = pointsApplied ? pointsDiscountAmount : 0;
  const grandTotal = Math.max(0, subtotal - couponDiscount - pointsDiscount);

  const changeQty = (id, delta) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, qty: Math.max(1, it.qty + delta) }
          : it
      )
    );
  };

  const toggleWish = (id) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, wish: !it.wish } : it)));
  };

  const removeItem = (id) => {
    // 先加 removing class (動畫)，再真正移除
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, removing: true } : it)));
    setTimeout(() => {
      setItems((prev) => prev.filter((it) => it.id !== id));
    }, 300);
  };

  const applyCoupon = () => {
    const v = coupon.trim().toUpperCase();
    if (v === couponCode) {
      setCouponApplied(true);
      setCouponMsg({ show: true, text: "已獲得優惠！", ok: true });
    } else {
      setCouponApplied(false);
      setCouponMsg({ show: true, text: "優惠碼無效", ok: false });
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18] font-serif">
      <div className="mx-auto max-w-[860px] px-6 pb-20 pt-12">
        {/* Heading */}
        <div className="mb-7 flex items-baseline gap-4">
          <h1 className="font-['DM_Serif_Display'] text-[32px]">購物車</h1>
          <span className="font-mono text-[16px] text-[#8C8880]">{count}</span>
        </div>

        {/* Table */}
        <div className="mb-8 overflow-hidden rounded-[16px] border border-[#E2DDD4] bg-white">
          {/* Head */}
          <div className="grid grid-cols-[1fr_100px_160px_100px_56px] gap-0 border-b border-[#E2DDD4] bg-[#F5F0E8] px-6 py-3.5">
            <div className="text-[12px] tracking-[0.1em] uppercase text-[#8C8880]">項目</div>
            <div className="text-center text-[12px] tracking-[0.1em] uppercase text-[#8C8880]">價格</div>
            <div className="text-center text-[12px] tracking-[0.1em] uppercase text-[#8C8880]">數量</div>
            <div className="text-right text-[12px] tracking-[0.1em] uppercase text-[#8C8880]">總計</div>
            <div />
          </div>

          {/* Rows */}
          {items.map((it) => {
            const rowTotal = it.price * it.qty;
            return (
              <div
                key={it.id}
                className={[
                  "grid grid-cols-[1fr_100px_160px_100px_56px] items-center px-6 py-5 border-b border-[#E2DDD4] transition-colors",
                  "hover:bg-[#FDFAF6]",
                  it.removing ? "opacity-0 translate-x-5 transition-all duration-300 ease-out" : "",
                ].join(" ")}
              >
                {/* Item */}
                <div className="flex items-center gap-4">
                  <div className={`h-14 w-14 shrink-0 rounded-[10px] bg-gradient-to-br ${it.gradient} flex items-center justify-center text-white/60`}>
                    <ImgIcon />
                  </div>
                  <span className="text-[14px]">{it.name}</span>
                </div>

                {/* Price */}
                <div className="text-center font-mono text-[14px]">{fmt(it.price)}</div>

                {/* Qty */}
                <div className="flex justify-center">
                  <div className="flex items-center overflow-hidden rounded-full border-[1.5px] border-[#E2DDD4] bg-[#F5F0E8]">
                    <button
                      type="button"
                      className="h-8 w-8 font-mono text-[16px] text-[#1A1A18] transition-colors hover:bg-[#E2DDD4]"
                      onClick={() => changeQty(it.id, -1)}
                    >
                      −
                    </button>
                    <span className="min-w-7 px-1 text-center font-mono text-[13px]">{it.qty}</span>
                    <button
                      type="button"
                      className="h-8 w-8 font-mono text-[16px] text-[#1A1A18] transition-colors hover:bg-[#E2DDD4]"
                      onClick={() => changeQty(it.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="text-right font-mono text-[14px] font-bold">{fmt(rowTotal)}</div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggleWish(it.id)}
                    className={[
                      "h-7 w-7 rounded-full transition-all flex items-center justify-center",
                      it.wish ? "text-[#C8522A]" : "text-[#E2DDD4]",
                      "hover:bg-[#F5F0E8] hover:text-[#8C8880]",
                      it.wish ? "hover:text-[#C8522A]" : "",
                    ].join(" ")}
                    aria-label="wishlist"
                  >
                    <HeartIcon filled={it.wish} />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="h-7 w-7 rounded-full text-[#E2DDD4] transition-all hover:bg-[#F5F0E8] hover:text-[#8C8880] flex items-center justify-center"
                    aria-label="remove"
                  >
                    <XIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Coupon + Points */}
        <div className="mb-7 flex flex-col gap-5">
          {/* Coupon */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="min-w-12 text-[13px] tracking-[0.03em]">優惠碼</span>

            <div
              className={[
                "flex items-center overflow-hidden rounded-full border-[1.5px] bg-white transition-colors",
                couponApplied ? "border-[#6BBF6B]" : "border-[#E2DDD4]",
                couponMsg.show && !couponMsg.ok ? "border-[#C8522A]" : "",
              ].join(" ")}
            >
              <input
                className="w-[140px] bg-transparent px-4 py-2 font-mono text-[13px] tracking-[0.08em] outline-none"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="輸入優惠碼"
              />
              <button
                type="button"
                onClick={applyCoupon}
                className={[
                  "h-9 w-9 flex items-center justify-center transition-colors",
                  couponApplied ? "text-[#6BBF6B]" : "text-[#8C8880]",
                  couponMsg.show && !couponMsg.ok ? "text-[#C8522A]" : "",
                ].join(" ")}
                aria-label="apply coupon"
              >
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>

            {couponMsg.show && (
              <span className={`text-[13px] font-bold ${couponMsg.ok ? "text-[#6BBF6B]" : "text-[#C8522A]"}`}>
                {couponMsg.text}
              </span>
            )}
          </div>

          {/* Points */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="min-w-[120px] text-[13px]">可抵用點數：{pointsAvailable} 點</span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setPointsApplied((v) => !v)}
                className={[
                  "relative h-[22px] w-10 rounded-full border-none transition-colors",
                  pointsApplied ? "bg-[#1A1A18]" : "bg-[#E2DDD4]",
                ].join(" ")}
                aria-label="toggle points"
              >
                <span
                  className={[
                    "absolute top-[3px] left-[3px] h-4 w-4 rounded-full bg-white transition-transform",
                    pointsApplied ? "translate-x-[18px]" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
              <span className="text-[13px] text-[#8C8880]">抵用點數</span>
            </div>

            <div className="ml-auto flex items-center gap-3 text-[13px] text-[#8C8880]" style={{ opacity: pointsApplied ? 1 : 0.4 }}>
              <span>總共折抵：</span>
              <span className="font-mono text-[14px] font-bold text-[#1A1A18]">{fmt(pointsDiscountAmount)}</span>
            </div>
          </div>
        </div>

        <div className="mb-7 h-px bg-[#E2DDD4]" />

        {/* Footer */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onContinueShopping}
            className="inline-flex items-center gap-2 text-[13px] tracking-[0.03em] text-[#8C8880] transition-colors hover:text-[#1A1A18]"
          >
            <BackIcon />
            繼續購物
          </button>

          <div className="ml-auto flex items-center gap-6">
            <span className="text-[13px] text-[#8C8880]">總付款金額：</span>
            <span className="font-mono text-[22px] font-bold">{fmt(grandTotal)}</span>

            <button
              type="button"
              onClick={() => onCheckout?.({ subtotal, couponDiscount, pointsDiscount, grandTotal, items })}
              className="rounded-full bg-[#1A1A18] px-8 py-3.5 text-[15px] tracking-[0.05em] text-[#F5F0E8] transition-all hover:bg-[#C8522A] hover:-translate-y-[1px] whitespace-nowrap"
            >
              結帳
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}