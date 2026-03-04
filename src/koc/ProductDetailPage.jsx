import React, { useMemo, useState } from "react";

function IconImage(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
function IconHeart(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
function IconBag(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}
function IconHome(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IconTruck(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
function IconClock(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconChevronLeft(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function IconChevronRight(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ProductCard({ name = "Shirt", price = "$20.99", rating = "★★★★★", count = "(120)", onAdd }) {
  return (
    <div className="group overflow-hidden rounded-xl border border-[#E2DDD4] bg-[#FDFAF6] transition-all hover:-translate-y-1 hover:border-[#E8C4B4] hover:shadow-[0_16px_40px_rgba(26,26,24,0.10)]">
      <div className="relative grid aspect-square place-items-center bg-[linear-gradient(135deg,#D8D4CC_0%,#C4BDB4_100%)]">
        <IconImage className="h-9 w-9 text-white/60" />
        <div className="absolute inset-0 bg-[rgba(26,26,24,0)] transition-colors group-hover:bg-[rgba(26,26,24,0.05)]" />
      </div>

      <div className="p-3.5">
        <div className="mb-2 text-[13px] text-[#1A1A18]">{name}</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[15px] font-bold text-[#1A1A18]">{price}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-[#8C8880]">
              <span className="tracking-[-1px] text-[#B89B6A]">{rating}</span>
              <span>{count}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onAdd}
            className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#1A1A18] text-[#F5F0E8] transition-all hover:scale-110 hover:bg-[#C8522A]"
            aria-label="add to cart"
          >
            <IconBag className="h-[15px] w-[15px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage({
  // 你之後要接資料可以用 props 傳入
  title = "商品名稱",
  price = "$20.99",
  description = "商品敘述。這是一件高品質的商品，採用優質材料製成，舒適耐用。適合日常穿著，多種顏色可供選擇，簡約設計百搭各種場合。",
}) {
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [tab, setTab] = useState(0);
  const [activeThumb, setActiveThumb] = useState(0);

  const [cartCount, setCartCount] = useState(2);
  const [badgePop, setBadgePop] = useState(false);

  const thumbs = useMemo(
    () => [
      "bg-[linear-gradient(135deg,#D4D0C8,#B8B4AC)]",
      "bg-[linear-gradient(135deg,#C4C8D0,#A8ACB4)]",
      "bg-[linear-gradient(135deg,#C8D0C4,#ACB4A8)]",
    ],
    []
  );

  const popBadge = () => {
    setBadgePop(true);
    window.setTimeout(() => setBadgePop(false), 180);
  };

  const addToCart = (count = 1) => {
    setCartCount((c) => c + count);
    popBadge();
  };

  const handleCart = () => addToCart(qty);

  const handleBuy = () => {
    // 這裡先做 UI feedback，之後接 API / 導向結帳頁
    // eslint-disable-next-line no-alert
    alert("（示意）進入結帳流程");
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18]">
      {/* ✅ 你說你們有固定抬頭，所以 NAV / FILTERS 整段不在這個頁面放 */}
      {/* 但如果你想顯示右上角購物車數字，也可以保留一個浮動角標： */}
      <div className="pointer-events-none fixed right-6 top-6 z-50">
        <div className="pointer-events-auto relative grid h-10 w-10 place-items-center rounded-full border border-[#E2DDD4] bg-white shadow-sm">
          <IconBag className="h-[18px] w-[18px]" />
          <span
            className={[
              "absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#C8522A] font-mono text-[9px] text-white transition-transform",
              badgePop ? "scale-125" : "scale-100",
            ].join(" ")}
          >
            {cartCount}
          </span>
        </div>
      </div>

      {/* PRODUCT DETAIL */}
      <div className="mx-auto grid max-w-[900px] grid-cols-1 gap-10 px-6 pb-10 pt-12 md:grid-cols-2 md:gap-16">
        {/* Left: Image */}
        <div>
          <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#C8C4BC_0%,#A8A49C_100%)]">
            <IconImage className="h-[72px] w-[72px] text-white/55" />
          </div>

          <div className="mt-3.5 flex gap-2.5">
            {thumbs.map((cls, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveThumb(i)}
                className={[
                  "grid h-[60px] w-[60px] place-items-center rounded-lg border-2 transition-colors",
                  cls,
                  activeThumb === i ? "border-[#1A1A18]" : "border-transparent",
                ].join(" ")}
                aria-label={`thumbnail ${i + 1}`}
              >
                <IconImage className="h-[22px] w-[22px] text-white/50" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Info */}
        <div className="pt-1">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h1 className="font-serif text-[32px] leading-[1.1]">{title}</h1>
            <button
              type="button"
              onClick={() => setWishlisted((v) => !v)}
              className={[
                "grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border bg-white transition-all",
                wishlisted
                  ? "border-[#C8522A] bg-[#E8C4B4] text-[#C8522A]"
                  : "border-[#E2DDD4] text-[#8C8880] hover:border-[#C8522A] hover:text-[#C8522A]",
              ].join(" ")}
              aria-label="wishlist"
            >
              <IconHeart className="h-[18px] w-[18px]" />
            </button>
          </div>

          <div className="mb-4 font-mono text-[28px] font-bold">{price}</div>

          <p className="mb-4 border-b border-[#E2DDD4] pb-4 text-[13px] leading-[1.75] text-[#8C8880]">
            {description}
          </p>

          <div className="mb-6 flex items-center gap-2.5">
            <span className="text-[16px] text-[#B89B6A]">★</span>
            <span className="font-mono text-[14px] font-bold">4.8</span>
            <span className="text-[13px] text-[#8C8880]">(1,873)</span>
          </div>

          {/* Qty */}
          <div className="mb-7">
            <div className="mb-2.5 text-[12px] uppercase tracking-[0.1em] text-[#8C8880]">數量</div>
            <div className="inline-flex overflow-hidden rounded-lg border border-[#E2DDD4] bg-white">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-10 w-10 place-items-center font-mono text-[18px] text-[#1A1A18] transition-colors hover:bg-[#F5F0E8]"
                aria-label="decrease"
              >
                −
              </button>
              <div className="grid h-10 w-12 place-items-center border-x border-[#E2DDD4] font-mono text-[15px] font-bold">
                {qty}
              </div>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="grid h-10 w-10 place-items-center font-mono text-[18px] text-[#1A1A18] transition-colors hover:bg-[#F5F0E8]"
                aria-label="increase"
              >
                +
              </button>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleBuy}
              className="flex-1 rounded-full bg-[#1A1A18] px-6 py-3.5 text-[15px] tracking-[0.05em] text-[#F5F0E8] transition-all hover:-translate-y-0.5 hover:bg-[#C8522A]"
            >
              立即訂購
            </button>

            <button
              type="button"
              onClick={handleCart}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E2DDD4] bg-white px-6 py-3.5 text-[15px] tracking-[0.05em] transition-all hover:bg-[#F5F0E8] hover:border-[#1A1A18]"
            >
              <IconBag className="h-4 w-4" />
              加入購物車
            </button>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="mx-auto max-w-[900px] px-6">
        <div className="flex border-b border-[#E2DDD4]">
          {["商品描述", "商品評價", "廠商資訊（任務）"].map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setTab(i)}
              className={[
                "border-b-2 px-6 py-3.5 text-[13px] tracking-[0.05em] transition-colors -mb-px",
                tab === i ? "border-[#1A1A18] text-[#1A1A18]" : "border-transparent text-[#8C8880] hover:text-[#1A1A18]",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content box */}
        <div className="rounded-b-xl border border-[#E2DDD4] border-t-0 bg-white p-8">
          {tab === 0 && (
            <div className="flex flex-col gap-8 md:flex-row md:gap-12">
              <div className="flex-1">
                <p className="mb-2 text-[13px] text-[#8C8880]">任務內容概覽</p>
                <p className="text-[13px] leading-[1.8] text-[#8C8880]">
                  任務內容概述（發文組鏈等等）
                  <br />
                  <br />
                  這裡可以填入詳細的商品說明，包括材質、尺寸規格、保養方式等資訊。優質棉料，透氣舒適，機洗不變形。
                </p>
              </div>

              <div className="md:w-[220px] md:shrink-0 md:border-l md:border-[#E2DDD4] md:pl-8">
                <div className="mb-4 text-[13px] font-bold tracking-[0.04em] text-[#1A1A18]">廠商資訊</div>
                <div className="mb-3 flex items-center gap-2.5 text-[13px] text-[#8C8880]">
                  <IconHome className="h-4 w-4 text-[#B89B6A]" />
                  廠商名稱
                </div>
                <div className="mb-3 flex items-center gap-2.5 text-[13px] text-[#8C8880]">
                  <IconTruck className="h-4 w-4 text-[#B89B6A]" />
                  提供的優惠項目
                </div>
              </div>
            </div>
          )}

          {tab === 1 && (
            <div className="flex flex-col gap-8 md:flex-row md:gap-12">
              <div className="flex-1">
                <p className="mb-2 text-[13px] text-[#8C8880]">用戶評價</p>
                <p className="mb-5 text-[13px] text-[#8C8880]">4.8 / 5 ・ 共 1,873 則評價</p>

                <div className="flex flex-col gap-4">
                  <div className="rounded-[10px] bg-[#F5F0E8] p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[13px] text-[#B89B6A]">★★★★★</span>
                      <span className="text-[12px] text-[#8C8880]">2024.12.01</span>
                    </div>
                    <p className="text-[13px] leading-[1.7] text-[#1A1A18]">
                      商品品質非常好，穿起來很舒適，顏色也很漂亮，非常滿意！
                    </p>
                  </div>

                  <div className="rounded-[10px] bg-[#F5F0E8] p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[13px] text-[#B89B6A]">★★★★☆</span>
                      <span className="text-[12px] text-[#8C8880]">2024.11.28</span>
                    </div>
                    <p className="text-[13px] leading-[1.7] text-[#1A1A18]">
                      材質很好，尺寸準確，快遞速度也很快，下次還會再購買。
                    </p>
                  </div>
                </div>
              </div>

              <div className="md:w-[220px] md:shrink-0 md:border-l md:border-[#E2DDD4] md:pl-8">
                <div className="mb-4 text-[13px] font-bold tracking-[0.04em] text-[#1A1A18]">評分分佈</div>

                {[
                  { star: "5★", pct: 78, opacity: 1 },
                  { star: "4★", pct: 15, opacity: 0.7 },
                  { star: "3★", pct: 5, opacity: 0.5 },
                  { star: "2★", pct: 1, opacity: 0.4 },
                  { star: "1★", pct: 1, opacity: 0.3 },
                ].map((r) => (
                  <div key={r.star} className="mb-2 flex items-center gap-2 text-[12px] text-[#8C8880]">
                    <span className="w-4">{r.star}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded bg-[#E2DDD4]">
                      <div
                        className="h-full rounded bg-[#B89B6A]"
                        style={{ width: `${r.pct}%`, opacity: r.opacity }}
                      />
                    </div>
                    <span>{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 2 && (
            <div className="flex flex-col gap-8 md:flex-row md:gap-12">
              <div className="flex-1">
                <p className="mb-2 text-[13px] text-[#8C8880]">廠商簡介</p>
                <p className="text-[13px] leading-[1.8] text-[#8C8880]">
                  專注於高品質服裝製造超過 15 年，我們的每一件產品都經過嚴格品質控管，確保消費者獲得最佳體驗。支持可持續發展，所有棉料均來自有機農場。
                </p>
              </div>

              <div className="md:w-[220px] md:shrink-0 md:border-l md:border-[#E2DDD4] md:pl-8">
                <div className="mb-4 text-[13px] font-bold tracking-[0.04em] text-[#1A1A18]">廠商資訊</div>
                <div className="mb-3 flex items-center gap-2.5 text-[13px] text-[#8C8880]">
                  <IconHome className="h-4 w-4 text-[#B89B6A]" />
                  廠商名稱
                </div>
                <div className="mb-3 flex items-center gap-2.5 text-[13px] text-[#8C8880]">
                  <IconTruck className="h-4 w-4 text-[#B89B6A]" />
                  提供的優惠項目
                </div>
                <div className="mb-3 flex items-center gap-2.5 text-[13px] text-[#8C8880]">
                  <IconClock className="h-4 w-4 text-[#B89B6A]" />
                  配送時間 3-5 天
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* YOU MAY ALSO LIKE */}
      <div className="mx-auto max-w-[900px] px-6 pb-12 pt-12">
        <div className="relative inline-block font-serif text-[28px] text-[#1A1A18]">
          您可能也會喜歡...
          <span className="absolute bottom-[-6px] left-0 h-[2px] w-8 rounded bg-[#C8522A]" />
        </div>

        <div className="relative mt-7">
          {/* 這兩顆箭頭目前是 UI；之後你要做 carousel 再接 state */}
          <button
            type="button"
            className="absolute left-1 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[#E2DDD4] bg-white text-[#1A1A18] transition-all hover:bg-[#1A1A18] hover:text-[#F5F0E8] hover:border-[#1A1A18]"
            aria-label="prev"
          >
            <IconChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="absolute right-1 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[#E2DDD4] bg-white text-[#1A1A18] transition-all hover:bg-[#1A1A18] hover:text-[#F5F0E8] hover:border-[#1A1A18]"
            aria-label="next"
          >
            <IconChevronRight className="h-4 w-4" />
          </button>

          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            <ProductCard onAdd={() => addToCart(1)} />
            <ProductCard onAdd={() => addToCart(1)} />
            <ProductCard onAdd={() => addToCart(1)} />
            <ProductCard onAdd={() => addToCart(1)} />
          </div>
        </div>
      </div>
    </div>
  );
}