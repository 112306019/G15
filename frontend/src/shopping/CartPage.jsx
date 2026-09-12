import { API_BASE_URL } from '../config';
import React, { useMemo, useState, useEffect } from "react";

function ImgIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
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

  // 一次只能選同一個廠商的商品結帳，記錄目前選取中的廠商 id（null 代表還沒選任何商品）
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/consumer/cart/view?User_id=${userId}`,
        );
        const data = await res.json();
        if (data.Cart_id) {
          const mapped = (data.items || []).map((item, i) => ({
            id: item.Cart_item_id,
            cartItemId: item.Cart_item_id,
            productId: item.Product_id,
            name: item.product_name || `商品 ${item.Product_id}`,
            price: parseFloat(item.Unit_price),
            qty: item.Quantity,
            wish: false,
            removing: false,
            gradient: GRADIENTS[i % GRADIENTS.length],
            vendorId: item.Vendor_id || "",
            vendorName: item.Vendor_name || item.Vendor_id || "未知廠商",
            isDelisted: item.product_status !== "active",
          }));
          setItems(mapped);
          // 預設只勾選第一個仍上架、屬於第一個廠商的商品，避免一開始就跨廠商全選
          const firstAvailable = mapped.find((it) => !it.isDelisted);
          if (firstAvailable) {
            setSelectedVendorId(firstAvailable.vendorId);
            setSelectedIds(
              new Set(
                mapped
                  .filter((it) => !it.isDelisted && it.vendorId === firstAvailable.vendorId)
                  .map((it) => it.id)
              )
            );
          }
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

  // 依廠商分組，下架商品另外集中放到每個分組的最後面；
  // 分組本身依「組內是否還有上架商品」排序，全部下架的廠商分組整組排到最後。
  const vendorGroups = useMemo(() => {
    const groups = new Map();
    for (const it of items) {
      if (it.removing) continue;
      if (!groups.has(it.vendorId)) {
        groups.set(it.vendorId, { vendorId: it.vendorId, vendorName: it.vendorName, items: [] });
      }
      groups.get(it.vendorId).items.push(it);
    }

    const list = Array.from(groups.values()).map((g) => ({
      ...g,
      items: [...g.items].sort((a, b) => Number(a.isDelisted) - Number(b.isDelisted)),
    }));

    list.sort((a, b) => {
      const aAllDelisted = a.items.every((it) => it.isDelisted);
      const bAllDelisted = b.items.every((it) => it.isDelisted);
      return Number(aAllDelisted) - Number(bAllDelisted);
    });

    return list;
  }, [items]);

  const toggleSelect = (item) => {
    if (item.isDelisted) return; // 下架商品不能選取結帳

    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(item.id)) {
        next.delete(item.id);
        return next;
      }

      // 換到不同廠商的商品時，先清空原本選取（一次只能結帳同一廠商）
      if (selectedVendorId && selectedVendorId !== item.vendorId) {
        setSelectedVendorId(item.vendorId);
        return new Set([item.id]);
      }

      setSelectedVendorId(item.vendorId);
      next.add(item.id);
      return next;
    });
  };

  const selectAllInVendor = (vendorId) => {
    const vendorItems = items.filter((it) => it.vendorId === vendorId && !it.isDelisted && !it.removing);
    setSelectedVendorId(vendorId);
    setSelectedIds(new Set(vendorItems.map((it) => it.id)));
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
    const item = items.find((it) => it.id === id);
    if (!item) return;

    if (!item.wish) {
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
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
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
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18] font-sans pb-32 md:pb-24">
      <div className="mx-auto max-w-[860px] px-4 md:px-6 pt-6 md:pt-12 animate-in fade-in duration-500">

        <div className="mb-6 md:mb-10">
          <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4">
            <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold text-[#1A1A18]">購物車</h1>
            <span className="text-xs md:text-sm font-bold text-[#8C8880] tracking-wide">
              {count > 0 ? `共 ${count} 件商品` : ''}
            </span>
          </div>
          {vendorGroups.length > 1 && (
            <p className="mt-2 md:mt-3 text-[11px] md:text-xs font-bold text-[#8C8880]">
              💡 不同廠商的商品需要分開結帳，一次只能勾選同一個廠商的商品喔。
            </p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-20 md:py-24 text-center text-[#8C8880] bg-white rounded-2xl md:rounded-[2rem] border border-[#E2DDD4]">
            <p className="text-base md:text-lg font-bold mb-3 md:mb-4 text-[#1A1A18]">購物車是空的</p>
            <p className="text-xs md:text-sm font-medium mb-6 md:mb-8 px-4">看起來您還沒有挑選任何商品。</p>
            <button 
              onClick={onContinueShopping} 
              className="rounded-full bg-[#1A1A18] px-6 md:px-8 py-3 md:py-3.5 text-xs md:text-sm font-bold tracking-widest text-[#F5F0E8] transition-all hover:bg-[#C8522A] hover:-translate-y-1 shadow-md"
            >
              前往購物
            </button>
          </div>
        ) : (
          <>
            {vendorGroups.map((group) => {
              const groupAllDelisted = group.items.every((it) => it.isDelisted);
              return (
                <div key={group.vendorId} className="mb-6 md:mb-8 overflow-hidden rounded-2xl md:rounded-[2rem] border border-[#E2DDD4] bg-white shadow-sm">

                  {/* 廠商表頭 */}
                  <div className="flex items-center justify-between border-b border-[#E2DDD4] bg-[#FDFAF6] px-4 py-3 md:px-8 md:py-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-[#8C8880]">廠商</span>
                      <span className="text-xs md:text-sm font-black text-[#1A1A18]">{group.vendorName}</span>
                      {groupAllDelisted && (
                        <span className="rounded-full bg-[#E2DDD4] px-2 py-0.5 md:px-2.5 md:py-0.5 text-[9px] md:text-[10px] font-bold text-[#8C8880] whitespace-nowrap">
                          商品皆已下架
                        </span>
                      )}
                    </div>
                    {!groupAllDelisted && (
                      <button
                        type="button"
                        onClick={() => selectAllInVendor(group.vendorId)}
                        className="text-[11px] md:text-xs font-bold text-[#C8522A] hover:underline whitespace-nowrap ml-2"
                      >
                        全選此廠商
                      </button>
                    )}
                  </div>

                  <div className="hidden md:grid grid-cols-[1fr_100px_140px_100px_56px] gap-0 border-b border-[#E2DDD4] px-8 py-3 bg-white">
                    <div className="text-[11px] font-bold tracking-widest uppercase text-[#8C8880]">項目</div>
                    <div className="text-center text-[11px] font-bold tracking-widest uppercase text-[#8C8880]">價格</div>
                    <div className="text-center text-[11px] font-bold tracking-widest uppercase text-[#8C8880]">數量</div>
                    <div className="text-right text-[11px] font-bold tracking-widest uppercase text-[#8C8880]">總計</div>
                    <div />
                  </div>

                  {/* 商品列 */}
                  {group.items.map((it) => {
                    const rowTotal = it.price * it.qty;
                    return (
                      <div
                        key={it.id}
                        className={[
                          // [RWD 優化] 手機版改為 flex-col
                          "flex flex-col md:grid md:grid-cols-[1fr_100px_140px_100px_56px] md:items-center px-4 py-5 md:px-8 md:py-6 border-b border-[#E2DDD4] last:border-0 transition-colors gap-4 md:gap-0",
                          it.isDelisted ? "bg-[#F8F9FA] opacity-50" : "hover:bg-[#FDFAF6]",
                          it.removing ? "opacity-0 translate-x-5 md:translate-x-10 transition-all duration-300 ease-out" : "",
                        ].join(" ")}
                      >
                        {/* 商品圖文 */}
                        <div className="flex items-start md:items-center gap-3 md:gap-5 w-full">
                          <div className="mt-1 md:mt-0 flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(it.id)}
                              disabled={it.isDelisted}
                              onChange={() => toggleSelect(it)}
                              className="h-4 w-4 md:h-5 md:w-5 rounded border-[#E2DDD4] text-[#C8522A] focus:ring-[#C8522A] cursor-pointer disabled:cursor-not-allowed"
                            />
                          </div>
                          <div className={`h-14 w-14 md:h-16 md:w-16 shrink-0 rounded-xl md:rounded-2xl bg-gradient-to-br ${it.gradient} flex items-center justify-center text-white/60 shadow-inner ${it.isDelisted ? "grayscale" : ""}`}>
                            <ImgIcon />
                          </div>
                          
                          <div className="flex flex-col gap-1 md:gap-0 min-w-0 flex-1">
                            <span className={`text-sm font-bold leading-snug md:leading-relaxed line-clamp-2 md:line-clamp-none ${it.isDelisted ? "text-[#8C8880]" : ""}`}>
                              {it.name}
                            </span>
                            
                            {it.isDelisted ? (
                              <div className="mt-1">
                                <span className="rounded-full bg-[#E2DDD4] px-2 py-0.5 text-[10px] font-bold text-[#8C8880]">
                                  已下架
                                </span>
                              </div>
                            ) : (
                              // 手機版價格顯示在名稱下方
                              <span className="md:hidden text-xs font-bold text-[#8C8880] tracking-wide mt-1">{fmt(it.price)}</span>
                            )}
                          </div>
                        </div>

                        {/* 電腦版價格 (手機隱藏) */}
                        <div className="hidden md:block text-center text-sm font-bold text-[#8C8880] tracking-wide">{fmt(it.price)}</div>

                        {/* 下排操作區 (手機版)：數量 + 總價 + 刪除 */}
                        <div className="flex items-center justify-between pl-8 md:pl-0 w-full md:w-auto mt-1 md:mt-0">
                          
                          <div className="flex justify-center md:mx-auto">
                            <div className="flex items-center overflow-hidden rounded-full border border-[#E2DDD4] bg-[#F5F0E8] h-8 md:h-9">
                              <button type="button" disabled={it.isDelisted} className="h-full w-8 md:w-9 text-sm font-bold text-[#1A1A18] transition-colors hover:bg-[#E2DDD4]/60 disabled:cursor-not-allowed" onClick={() => changeQty(it.id, -1)}>−</button>
                              <span className="min-w-6 md:min-w-8 px-1 text-center text-[13px] md:text-sm font-bold">{it.qty}</span>
                              <button type="button" disabled={it.isDelisted} className="h-full w-8 md:w-9 text-sm font-bold text-[#1A1A18] transition-colors hover:bg-[#E2DDD4]/60 disabled:cursor-not-allowed" onClick={() => changeQty(it.id, 1)}>+</button>
                            </div>
                          </div>

                          <div className="md:hidden text-sm font-black tracking-wide text-[#1A1A18] px-2">{fmt(rowTotal)}</div>

                          <div className="md:hidden flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleWish(it.id)}
                              disabled={it.isDelisted}
                              className={["h-8 w-8 rounded-full transition-all flex items-center justify-center disabled:cursor-not-allowed", it.wish ? "text-[#C8522A]" : "text-[#E2DDD4]", "hover:bg-[#F5F0E8] hover:text-[#1A1A18]"].join(" ")}
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

                        {/* 電腦版總計 (手機隱藏) */}
                        <div className="hidden md:block text-right text-sm font-black tracking-wide text-[#1A1A18]">{fmt(rowTotal)}</div>

                        {/* 電腦版操作區 (手機隱藏) */}
                        <div className="hidden md:flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => toggleWish(it.id)}
                            disabled={it.isDelisted}
                            className={["h-8 w-8 rounded-full transition-all flex items-center justify-center disabled:cursor-not-allowed", it.wish ? "text-[#C8522A]" : "text-[#E2DDD4]", "hover:bg-[#F5F0E8] hover:text-[#1A1A18]"].join(" ")}
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
              );
            })}

            {/* Footer / 結帳列 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-6 pt-2 md:pt-4 md:relative fixed bottom-0 left-0 right-0 bg-[#F5F0E8]/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none p-4 md:p-0 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:shadow-none border-t border-[#E2DDD4] md:border-none">
              
              <button 
                type="button" 
                onClick={onContinueShopping} 
                className="inline-flex items-center justify-center sm:justify-start w-full sm:w-auto gap-2 text-xs md:text-sm font-bold tracking-wide text-[#8C8880] transition-colors hover:text-[#1A1A18]"
              >
                <BackIcon />
                繼續購物
              </button>
              
              <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-6 bg-white border border-[#E2DDD4] pl-5 md:pl-6 pr-1.5 md:pr-2 py-1.5 md:py-2 rounded-[1.25rem] md:rounded-full shadow-sm">
                <div className="flex items-baseline gap-1.5 md:gap-2">
                  <span className="text-[10px] md:text-xs font-bold text-[#8C8880] tracking-widest uppercase">Total</span>
                  <span className="text-xl md:text-2xl font-black text-[#1A1A18] tracking-tight">
                    {selectedIds.size === 0 ? "NT$0" : fmt(grandTotal)}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={() => onCheckout?.({ subtotal, couponDiscount, pointsDiscount, grandTotal, items: items.filter(it => selectedIds.has(it.id)) })}
                  className="rounded-xl md:rounded-full bg-[#1A1A18] px-6 md:px-8 py-3 md:py-3.5 text-xs md:text-sm font-bold tracking-widest text-[#F5F0E8] transition-all hover:bg-[#C8522A] hover:-translate-y-1 hover:shadow-md whitespace-nowrap active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
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