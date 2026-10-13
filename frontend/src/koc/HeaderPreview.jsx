import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Package } from 'lucide-react';
import { API_BASE_URL } from '../config';

const PREVIEW_LIMIT = 4;
const CLOSE_DELAY_MS = 150;

const isValidImageUrl = (url) => typeof url === 'string' && /^https?:\/\//.test(url);
const formatPrice = (value) => `NT$${Number(value || 0).toLocaleString('zh-TW')}`;

async function fetchFavorites(userId) {
  const res = await fetch(`${API_BASE_URL}/api/consumer/wishlist/view?User_id=${encodeURIComponent(userId)}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((item) => ({
    key: item.Wishlist_id,
    productId: item.Product_id,
    name: item.product_name || `商品 ${item.Product_id}`,
    imageUrl: item.image_url,
    detail: formatPrice(item.price),
    isDelisted: item.product_status !== 'active',
  }));
}

async function fetchCart(userId) {
  const res = await fetch(`${API_BASE_URL}/api/consumer/cart/view?User_id=${encodeURIComponent(userId)}`);
  const data = await res.json();
  return (data?.items || []).map((item) => ({
    key: item.Cart_item_id,
    productId: item.Product_id,
    name: item.product_name || `商品 ${item.Product_id}`,
    imageUrl: item.image_url,
    detail: `${formatPrice(item.Unit_price)} × ${item.Quantity}`,
    isDelisted: item.product_status !== 'active',
  }));
}

const KINDS = {
  favorites: {
    title: '我的收藏',
    fetchItems: fetchFavorites,
    emptyText: '還沒有收藏的商品',
    guestText: '登入後就能收藏喜歡的商品',
    actionLabel: '查看全部收藏',
  },
  cart: {
    title: '購物車',
    fetchItems: fetchCart,
    emptyText: '購物車是空的',
    guestText: '登入後就能把商品加入購物車',
    actionLabel: '前往購物車',
  },
};

// 右上角愛心／購物車的預覽：滑鼠移上去就顯示最近幾件商品，不用點進去才看得到。
// 只在電腦版（有滑鼠）出現；點圖示本身的行為不變，一樣是跳到完整頁面。
// - kind：'favorites' 或 'cart'
// - onViewAll：按下方按鈕時呼叫（跳到收藏頁／購物車頁）
// - refreshKey：數字變動代表內容可能變了（例如購物車數量），下次打開會重新抓
export default function HeaderPreview({ kind, isGuest = false, onViewAll, refreshKey, children }) {
  const config = KINDS[kind];
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const closeTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // 內容可能變了就丟掉舊的，下次打開重新抓
  useEffect(() => {
    setItems(null);
  }, [refreshKey]);

  const load = async () => {
    const userId = localStorage.getItem('userId');
    if (isGuest || !userId) return;
    try {
      setLoading(true);
      setFailed(false);
      // 後端是照加入順序回傳（舊的在前）：反過來讓新加入的排前面，已下架的一律排到最後
      const fetched = (await config.fetchItems(userId)).reverse();
      setItems([...fetched.filter((item) => !item.isDelisted), ...fetched.filter((item) => item.isDelisted)]);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEnter = () => {
    clearTimeout(closeTimerRef.current);
    if (open) return;
    setOpen(true);
    // 每次打開都重新抓，確保剛加入的商品看得到；抓的期間先顯示上一次的內容
    load();
  };

  const handleLeave = () => {
    // 從圖示移到預覽框中間有一點空隙，延遲一下再關，才不會一移開就消失
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  const close = () => {
    clearTimeout(closeTimerRef.current);
    setOpen(false);
  };

  const visible = (items || []).slice(0, PREVIEW_LIMIT);
  const hiddenCount = (items || []).length - visible.length;

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}

      {open && (
        <div className="hidden md:block absolute right-0 top-full pt-2 z-50">
          <div className="w-80 rounded-2xl border border-[#E2DDD4] bg-white shadow-xl overflow-hidden animate-in fade-in duration-150">
            <div className="px-4 py-3 border-b border-[#E2DDD4] flex items-center justify-between">
              <span className="text-sm font-bold text-[#1A1A18]">{config.title}</span>
              {items && items.length > 0 && (
                <span className="text-xs font-bold text-[#8C8880]">共 {items.length} 件</span>
              )}
            </div>

            {isGuest ? (
              <div className="px-4 py-8 text-center text-xs font-bold text-[#8C8880]">{config.guestText}</div>
            ) : items === null && loading ? (
              <div className="px-4 py-8 flex justify-center">
                <Loader2 size={18} className="animate-spin text-[#C8522A]" />
              </div>
            ) : items === null && failed ? (
              <div className="px-4 py-8 text-center text-xs font-bold text-[#8C8880]">載入失敗，請稍後再試</div>
            ) : visible.length === 0 ? (
              <div className="px-4 py-8 flex flex-col items-center gap-2 text-[#8C8880]">
                <Package size={22} className="text-[#E2DDD4]" />
                <span className="text-xs font-bold">{config.emptyText}</span>
              </div>
            ) : (
              <ul>
                {visible.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        navigate(`/product/${item.productId}`);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#F5F0E8] transition-colors ${item.isDelisted ? 'opacity-50' : ''}`}
                    >
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#F5F0E8] flex items-center justify-center text-[#C4BDB4]">
                        {isValidImageUrl(item.imageUrl) ? (
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package size={16} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#1A1A18] line-clamp-1">{item.name}</div>
                        <div className="text-[11px] font-bold text-[#8C8880] mt-0.5">
                          {item.isDelisted ? '已下架' : item.detail}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
                {hiddenCount > 0 && (
                  <li className="px-4 py-2 text-[11px] font-bold text-[#8C8880] text-center">還有 {hiddenCount} 件商品</li>
                )}
              </ul>
            )}

            {!isGuest && (
              <div className="p-3 border-t border-[#E2DDD4]">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onViewAll?.();
                  }}
                  className="w-full rounded-xl bg-[#1A1A18] py-2.5 text-xs font-bold text-white hover:bg-[#C8522A] transition-colors"
                >
                  {config.actionLabel}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
