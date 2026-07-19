import React from 'react';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';

export default function FavoritesPage({ 
  favorites = [], 
  onRemoveFavorite, 
  onAddToCart, 
  onNavigate 
}) {
  return (
    // 🟢 移除了 bg-[#F5F0E8] 和 min-h-screen，讓它直接融入系統背景
    <div className="animate-in fade-in duration-500 max-w-6xl pb-24 text-[#1A1A18]">
      
      {/* 標題區塊 */}
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-[28px] font-serif font-bold text-[#1A1A18]">我的收藏</h2>
        <span className="text-[#8C8880] font-bold text-sm bg-white px-4 py-2 rounded-full shadow-sm border border-[#E2DDD4]">
          共 {favorites.length} 件商品
        </span>
      </div>

      {/* 判斷是否有收藏商品 */}
      {favorites.length === 0 ? (
        /* 🟢 空狀態 (Empty State) */
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
        /* 🟢 收藏商品列表 (Grid) */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favorites.map((product) => (
            <div 
              key={product.id} 
              className="bg-white rounded-3xl border border-[#E2DDD4] p-4 flex flex-col gap-4 transition-all hover:shadow-lg hover:border-[#D8D4CC] group relative"
            >
              {/* 移除收藏按鈕 */}
              <button 
                onClick={() => onRemoveFavorite?.(product.id)}
                className="absolute top-7 right-7 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-[#C8522A] hover:bg-[#C8522A] hover:text-white transition-colors shadow-sm"
                title="移除收藏"
              >
                <Heart size={16} fill="currentColor" />
              </button>

              {/* 商品圖片 */}
              <div 
                onClick={() => onNavigate?.('product_detail', product)}
                className="relative flex aspect-square w-full items-center justify-center rounded-2xl overflow-hidden cursor-pointer" 
                style={{ background: product.gradient || "linear-gradient(135deg,#D8D4CC,#C4BDB4)" }}
              >
                <svg className="h-10 w-10 text-black/10 group-hover:scale-110 transition-transform duration-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" />
                </svg>
              </div>

              {/* 商品資訊 */}
              <div className="flex-1 flex flex-col px-1">
                <div className="text-sm font-bold text-[#1A1A18] mb-1 line-clamp-2 cursor-pointer hover:text-[#C8522A] transition-colors" onClick={() => onNavigate?.('product_detail', product)}>
                  {product.name}
                </div>
                <div className="font-black text-[#1A1A18] text-lg mt-auto">{product.price}</div>
              </div>

              {/* 加入購物車按鈕 */}
              <button 
                onClick={() => onAddToCart?.(product)}
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