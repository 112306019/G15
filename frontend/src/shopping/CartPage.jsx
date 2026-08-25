import { API_BASE_URL } from '../config';
import React, { useMemo, useState, useEffect } from "react";

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
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M19 12H5" />
      <path d="M12 5l-7 7 7 7" />
    </svg>
  );
}

const fmt = (n) => {
  const value = Number(n);
  return `NT$${Number.isFinite(value) ? Math.round(value).toLocaleString("zh-TW") : "0"}`;
};

const GRADIENTS = [
  "from-[#C8C4BC] to-[#A8A49C]",
  "from-[#C4C8D4] to-[#A4AABB]",
  "from-[#C8D4C4] to-[#A8B8A4]",
  "from-[#D4C8C4] to-[#BBA8A0]",
];

export default function CartPage({
  onContinueShopping,
  onCheckout,
  couponDiscountRate = 0.05,
  pointsAvailable = 30,
  pointsDiscountAmount = 7.66,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMsg, setCouponMsg] = useState({ show: false, text: "", ok: false });
  const [pointsApplied, setPointsApplied] = useState(false);

  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/consumer/cart/view?User_id=${userId}`,
        );
        const data = await res.json();
        if (data.Cart_id) {
          setItems(
            (data.items || []).map((item, i) => ({
              id: item.Cart_item_id,
              cartItemId: item.Cart_item_id,
              productId: item.Product_id,
              name: item.product_name || `商品 ${item.Product_id}`,
              price: parseFloat(item.Unit_price),
              qty: item.Quantity,
              wish: false,
              removing: false,
              gradient: GRADIENTS[i % GRADIENTS.length],
            }))
          );
          setSelectedIds(new Set((data.items || []).map(item => item.Cart_item_id)));
        }
      } catch (err) {
        console.error("購物車載入失敗", err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchCart();
    else setLoading(false);
  }, [userId]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const count = items.filter((it) => !it.removing).length;

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + (it.removing || !selectedIds.has(it.id) ? 0 : it.price * it.qty), 0),
    [items, selectedIds]
  );

  const couponDiscount = couponApplied ? subtotal * couponDiscountRate : 0;
  const pointsDiscount = pointsApplied ? pointsDiscountAmount : 0;
  const grandTotal = Math.max(0, subtotal - couponDiscount - pointsDiscount);

  const changeQty = async (id, delta) => {
    const item = items.find((it) => it.id === id);
    if (!item) return;
    const newQty = Math.max(1, item.qty + delta);
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, qty: newQty } : it)));
    try {
      await fetch(`${API_BASE_URL}/api/consumer/cart/item/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ Cart_item_id: item.cartItemId, Quantity: newQty }),
      });
    } catch (err) {
      console.error("更新數量失敗", err);
    }
  };

  const toggleWish = async (id) => {
    console.log("toggleWish called", id);
    const item = items.find((it) => it.id === id);
    if (!item) return;

    if (!item.wish) {
      // 加入收藏
      try {
        await fetch(`${API_BASE_URL}/api/consumer/wishlist/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            User_id: userId,
            Product_id: item.productId,
          }),
        });
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, wish: true } : it)));
      } catch (err) {
        console.error("加入收藏失敗", err);
      }
    } else {
      // 移除收藏
      try {
        await fetch(`${API_BASE_URL}/api/consumer/wishlist/delete`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            User_id: userId,
            Product_id: item.productId,
          }),
        });
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, wish: false } : it)));
      } catch (err) {
        console.error("移除收藏失敗", err);
      }
    }
  };

  const removeItem = async (id) => {
    const item = items.find((it) => it.id === id);
    if (!item) return;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, removing: true } : it)));
    try {
      await fetch(`${API_BASE_URL}/api/consumer/cart/item/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ Cart_item_id: item.cartItemId }),
      });
    } catch (err) {
      console.error("刪除失敗", err);
    }
    setTimeout(() => {
      setItems((prev) => prev.filter((it) => it.id !== id));
    }, 300);
  };

  const applyCoupon = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/consumer/coupon/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Promotion_code: coupon.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCouponApplied(true);
        setCouponMsg({ show: true, text: "已獲得優惠！", ok: true });
      } else {
        setCouponApplied(false);
        setCouponMsg({ show: true, text: data.err || "優惠碼無效", ok: false });
      }
    } catch (err) {
      setCouponMsg({ show: true, text: "驗證失敗，請稍後再試", ok: false });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center font-sans text-[#8C8880] animate-pulse">
        <div className="w-8 h-8 border-2 border-[#C8522A] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold tracking-widest text-sm uppercase">Loading</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18] font-sans">
      <div className="mx-auto max-w-[860px] px-6 pb-20 pt-12 animate-in fade-in duration-500">

        {/* 🌟 統一風格的大標題 (移除橘色底線) */}
        <div className="mb-10">
          <div className="flex items-baseline gap-4">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1A18]">購物車</h1>
            <span className="text-sm font-bold text-[#8C8880] tracking-wide">
              {count > 0 ? `共 ${count} 件商品` : ''}
            </span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-24 text-center text-[#8C8880]">
            <p className="text-lg font-bold mb-4 text-[#1A1A18]">購物車是空的</p>
            <p className="text-sm font-medium mb-8">看起來您還沒有挑選任何商品。</p>
            <button 
              onClick={onContinueShopping} 
              className="rounded-full bg-[#1A1A18] px-8 py-3.5 text-sm font-bold tracking-widest text-[#F5F0E8] transition-all hover:bg-[#C8522A] hover:-translate-y-1 shadow-md"
            >
              前往購物
            </button>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="mb-8 overflow-hidden rounded-[2rem] border border-[#E2DDD4] bg-white shadow-sm">
              <div className="grid grid-cols-[1fr_100px_140px_100px_56px] gap-0 border-b border-[#E2DDD4] bg-[#FDFAF6] px-8 py-4">
                <div className="text-[11px] font-bold tracking-widest uppercase text-[#8C8880]">項目</div>
                <div className="text-center text-[11px] font-bold tracking-widest uppercase text-[#8C8880]">價格</div>
                <div className="text-center text-[11px] font-bold tracking-widest uppercase text-[#8C8880]">數量</div>
                <div className="text-right text-[11px] font-bold tracking-widest uppercase text-[#8C8880]">總計</div>
                <div />
              </div>

              {items.map((it) => {
                const rowTotal = it.price * it.qty;
                return (
                  <div
                    key={it.id}
                    className={[
                      "grid grid-cols-[1fr_100px_140px_100px_56px] items-center px-8 py-6 border-b border-[#E2DDD4] transition-colors",
                      "hover:bg-[#FDFAF6]",
                      it.removing ? "opacity-0 translate-x-5 transition-all duration-300 ease-out" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(it.id)}
                        onChange={() => toggleSelect(it.id)}
                        className="h-4 w-4 rounded border-[#E2DDD4] text-[#C8522A] focus:ring-[#C8522A] cursor-pointer"
                      />
                      <div className={`h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br ${it.gradient} flex items-center justify-center text-white/60 shadow-inner`}>
                        <ImgIcon />
                      </div>
                      <span className="text-sm font-bold leading-relaxed">{it.name}</span>
                    </div>

                    <div className="text-center text-sm font-bold text-[#8C8880] tracking-wide">{fmt(it.price)}</div>

                    <div className="flex justify-center">
                      <div className="flex items-center overflow-hidden rounded-full border border-[#E2DDD4] bg-[#F5F0E8]">
                        <button type="button" className="h-8 w-8 text-sm font-bold text-[#1A1A18] transition-colors hover:bg-[#E2DDD4]/60" onClick={() => changeQty(it.id, -1)}>−</button>
                        <span className="min-w-8 px-1 text-center text-sm font-bold">{it.qty}</span>
                        <button type="button" className="h-8 w-8 text-sm font-bold text-[#1A1A18] transition-colors hover:bg-[#E2DDD4]/60" onClick={() => changeQty(it.id, 1)}>+</button>
                      </div>
                    </div>

                    <div className="text-right text-sm font-black tracking-wide text-[#1A1A18]">{fmt(rowTotal)}</div>

                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => toggleWish(it.id)}
                        className={["h-8 w-8 rounded-full transition-all flex items-center justify-center", it.wish ? "text-[#C8522A]" : "text-[#E2DDD4]", "hover:bg-[#F5F0E8] hover:text-[#1A1A18]"].join(" ")}
                        aria-label="wishlist"
                      >
                        <HeartIcon filled={it.wish} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="h-8 w-8 rounded-full text-[#E2DDD4] transition-all hover:bg-[#FEF5F3] hover:text-[#C8522A] flex items-center justify-center"
                        aria-label="remove"
                      >
                        <XIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4">
              <button 
                type="button" 
                onClick={onContinueShopping} 
                className="inline-flex items-center gap-2 text-sm font-bold tracking-wide text-[#8C8880] transition-colors hover:text-[#1A1A18]"
              >
                <BackIcon />
                繼續購物
              </button>
              
              <div className="flex items-center gap-6 bg-white border border-[#E2DDD4] pl-6 pr-2 py-2 rounded-full shadow-sm">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-[#8C8880] tracking-widest uppercase">Total</span>
                  <span className="text-2xl font-black text-[#1A1A18] tracking-tight">{fmt(grandTotal)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onCheckout?.({ subtotal, couponDiscount, pointsDiscount, grandTotal, items: items.filter(it => selectedIds.has(it.id)) })}
                  className="rounded-full bg-[#1A1A18] px-8 py-3.5 text-sm font-bold tracking-widest text-[#F5F0E8] transition-all hover:bg-[#C8522A] hover:-translate-y-1 hover:shadow-md whitespace-nowrap"
                >
                  去結帳
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}