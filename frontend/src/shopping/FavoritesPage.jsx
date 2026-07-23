import React, { useState, useEffect } from 'react';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';

const GRADIENTS = [
  "linear-gradient(135deg,#D8D4CC,#C4BDB4)",
  "linear-gradient(135deg,#C4C8D4,#A8AEBB)",
  "linear-gradient(135deg,#C8D4C4,#B0BBA8)",
  "linear-gradient(135deg,#D4C8C4,#BBA8A0)",
];

export default function FavoritesPage({ onNavigate }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  // 載入收藏清單
  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/consumer/wishlist/view?User_id=${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setFavorites(data.map((item, i) => ({
            id: item.Wishlist_id,
            wishlistId: item.Wishlist_id,
            productId: item.Product_id,
            name: item.product_name || `商品 ${item.Product_id}`,
            price: `NTD$ ${item.price || ""}`,
            gradient: GRADIENTS[i % GRADIENTS.length],
          })));
        }
      } catch (err) {
        console.error("收藏清單載入失敗", err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchWishlist();
    else setLoading(false);
  }, [userId]);

  // 移除收藏
  const handleRemoveFavorite = async (id) => {
    const item = favorites.find((f) => f.id === id);
    if (!item) return;
    try {
      await fetch("http://127.0.0.1:8000/api/consumer/wishlist/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          User_id: userId,
          Product_id: item.productId,
        }),
      });
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error("移除收藏失敗", err);
    }
  };

  // 加入購物車
  const handleAddToCart = async (product) => {
    try {
      const cartRes = await fetch("http://127.0.0.1:8000/api/consumer/cart/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ User_id: userId }),
      });
      const cartData = await cartRes.json();
      const cartId = cartData.Cart_id;

      await fetch("http://127.0.0.1:8000/api/consumer/cart/item/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Cart_id: cartId,
          Product_id: product.productId,
          Quantity: 1,
        }),
      });
    } catch (err) {
      console.error("加入購物車失敗", err);
    }
  };

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500 max-w-6xl pb-24 text-[#1A1A18]">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-[28px] font-serif font-bold text-[#1A1A18]">我的收藏</h2>
        </div>
        <div className="py-20 text-center text-[#8C8880]">載入中...</div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl pb-24 text-[#1A1A18]">

      {/* 標題區塊 */}
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-[28px] font-serif font-bold text-[#1A1A18]">我的收藏</h2>
        <span className="text-[#8C8880] font-bold text-sm bg-white px-4 py-2 rounded-full shadow-sm border border-[#E2DDD4]">
          共 {favorites.length} 件商品
        </span>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-[#E2DDD4] p-16 flex flex-col items-center justify-center text-center shadow-sm mt-8">
          <div className="w-24 h-24 bg-[#F5F0E8] rounded-full flex items-center justify-center mb-6 text-[#C8522A]">
            <Heart size={40} strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold mb-3">您的收藏清單目前是空的</h2>
          <p className="text-[#8C8880] text-sm mb-8 max-w-sm leading-relaxed">
            看到喜歡的商品時，點擊愛心圖示就能將它們加入收藏，方便日後隨時查看與購買。
          </p>
          <button
            onClick={() => onNavigate?.('shop')}
            className="bg-[#1A1A18] text-white px-8 py-3.5 rounded-full font-bold text-sm transition-all hover:bg-[#C8522A] hover:-translate-y-0.5 shadow-md flex items-center gap-2"
          >
            去逛逛商品 <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favorites.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-3xl border border-[#E2DDD4] p-4 flex flex-col gap-4 transition-all hover:shadow-lg hover:border-[#D8D4CC] group relative"
            >
              {/* 移除收藏按鈕 */}
              <button
                onClick={() => handleRemoveFavorite(product.id)}
                className="absolute top-7 right-7 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-[#C8522A] hover:bg-[#C8522A] hover:text-white transition-colors shadow-sm"
                title="移除收藏"
              >
                <Heart size={16} fill="currentColor" />
              </button>

              {/* 商品圖片 */}
              <div
                onClick={() => onNavigate?.('product_detail', product)}
                className="relative flex aspect-square w-full items-center justify-center rounded-2xl overflow-hidden cursor-pointer"
                style={{ background: product.gradient }}
              >
                <svg className="h-10 w-10 text-black/10 group-hover:scale-110 transition-transform duration-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" />
                </svg>
              </div>

              {/* 商品資訊 */}
              <div className="flex-1 flex flex-col px-1">
                <div
                  className="text-sm font-bold text-[#1A1A18] mb-1 line-clamp-2 cursor-pointer hover:text-[#C8522A] transition-colors"
                  onClick={() => onNavigate?.('product_detail', product)}
                >
                  {product.name}
                </div>
                <div className="font-black text-[#1A1A18] text-lg mt-auto">{product.price}</div>
              </div>

              {/* 加入購物車按鈕 */}
              <button
                onClick={() => handleAddToCart(product)}
                className="w-full py-3 rounded-xl border border-[#1A1A18] text-sm font-bold text-[#1A1A18] flex items-center justify-center gap-2 transition-colors hover:bg-[#1A1A18] hover:text-[#F5F0E8]"
              >
                <ShoppingBag size={16} /> 加入購物車
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}