import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, ShoppingBag, Star } from 'lucide-react';

export default function ProductDetailPage({ onBack, onGoCart, onBuyNow, onAddToCart, userRole, onNavigate }) {
  const [toastMsg, setToastMsg] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [quantity, setQuantity] = useState(1); 
  const [activeTab, setActiveTab] = useState('description'); 
  const [isLoading, setIsLoading] = useState(false); // 🟢 載入動畫狀態

  // 🟢 將商品資料變成 State，這樣點推薦商品時才可以「替換」它
  const [productDetail, setProductDetail] = useState({
    id: 1,
    name: "SanDisk 128GB SDXC Extreme Pro 200MB/s 4K U3 V30 相機記憶卡",
    price: "NTD$ 1470",
    rating: 4.8,
    reviewsCount: 102,
    vendorName: "廠商名稱",
    promoDesc: "使用優惠碼購買享九折優惠",
    gradient: "linear-gradient(135deg,#D8D4CC,#C4BDB4)"
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleAddCart = () => {
    if (userRole === 'guest') {
      showToast("需先登入或註冊才能加入購物車喔！");
      return;
    }
    if (onAddToCart) onAddToCart();
    showToast("✓ 已成功加入購物車！");
  };

  const handleBuyNow = () => {
    if (userRole === 'guest') {
      showToast("需先登入或註冊才能直接結帳喔！");
      return;
    }
    if (onBuyNow) onBuyNow();
  };

  // 🟢 當點擊推薦商品時觸發的假跳轉功能
  const handleRecommendClick = (p) => {
    window.scrollTo({ top: 0, behavior: 'smooth' }); // 畫面滑到最上面
    setIsLoading(true); // 開啟載入特效
    
    // 模擬網路延遲 400 毫秒後，替換商品資訊
    setTimeout(() => {
      setProductDetail({
        ...productDetail,
        name: p.name,
        price: p.price,
        gradient: p.gradient
      });
      setQuantity(1); // 數量重置
      setIsLiked(false); // 愛心重置
      setIsLoading(false); // 關閉特效
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] font-sans text-[#1A1A18] pb-24 relative">

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* =========================================
            上半部：商品圖與核心資訊 
            (🟢 加上 isLoading 讓它有切換網頁的透明度動畫)
        ========================================== */}
        <div className={`flex flex-col md:flex-row gap-12 lg:gap-16 mb-16 transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
          
          {/* 左側：商品圖 */}
          <div 
            className="w-full md:w-[45%] aspect-square rounded-3xl flex items-center justify-center shadow-sm relative overflow-hidden transition-all duration-500"
            style={{ background: productDetail.gradient }}
          >
            <svg className="h-24 w-24 text-black/10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" />
            </svg>
          </div>

          {/* 右側：商品資訊 */}
          <div className="w-full md:w-[55%] flex flex-col justify-center">
            
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="font-serif text-2xl md:text-3xl leading-snug">{productDetail.name}</h1>
              <button 
                onClick={() => setIsLiked(!isLiked)}
                className={`flex-shrink-0 p-2.5 rounded-full border transition-all ${isLiked ? 'bg-[#FDF0ED] border-[#C8522A] text-[#C8522A]' : 'bg-white border-[#E2DDD4] text-[#8C8880] hover:border-[#1A1A18] hover:text-[#1A1A18]'}`}
              >
                <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
              </button>
            </div>
            
            <div className="font-black text-2xl text-[#1A1A18] mb-4">{productDetail.price}</div>
            
            <p className="text-[#8C8880] text-sm leading-relaxed mb-4">
              商品敘述：這是一件高品質的商品，採用優質材料製成，舒適耐用。適合日常穿著，多種顏色可供選擇，簡約設計百搭各種場合。
            </p>

            <div className="flex items-center gap-2 mb-8 text-[#8C8880] text-sm font-medium">
              <Star size={16} className="text-[#B89B6A] fill-[#B89B6A]" />
              <span className="text-[#1A1A18] font-bold">{productDetail.rating}</span>
              <span>({productDetail.reviewsCount})</span>
            </div>

            {/* 數量選擇器 */}
            <div className="mb-8">
              <label className="block text-xs font-bold text-[#8C8880] mb-2 uppercase">數量</label>
              <div className="flex items-center bg-white border border-[#E2DDD4] rounded-full w-fit overflow-hidden h-12">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-full text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors flex items-center justify-center font-bold text-lg"
                >-</button>
                <span className="w-10 text-center font-bold text-[#1A1A18]">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-full text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors flex items-center justify-center font-bold text-lg"
                >+</button>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleBuyNow}
                className="flex-1 bg-[#C8522A] text-white py-4 rounded-full font-bold tracking-wide hover:bg-[#A64220] hover:-translate-y-0.5 transition-all shadow-md"
              >
                立即訂購
              </button>
              <button 
                onClick={handleAddCart}
                className="flex-1 bg-white border border-[#1A1A18] text-[#1A1A18] py-4 rounded-full font-bold tracking-wide hover:bg-[#F5F0E8] hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2"
              >
                <ShoppingBag size={18} /> 加入購物車
              </button>
            </div>

          </div>
        </div>

        {/* 中間頁籤區塊保持不變... */}
        <div className="border-b border-[#E2DDD4] flex gap-8 mb-8">
          <button onClick={() => setActiveTab('description')} className={`pb-3 font-bold transition-colors ${activeTab === 'description' ? 'border-b-2 border-[#1A1A18] text-[#1A1A18]' : 'text-[#8C8880] hover:text-[#1A1A18]'}`}>商品描述</button>
          <button onClick={() => setActiveTab('reviews')} className={`pb-3 font-bold transition-colors ${activeTab === 'reviews' ? 'border-b-2 border-[#1A1A18] text-[#1A1A18]' : 'text-[#8C8880] hover:text-[#1A1A18]'}`}>商品評價</button>
          <button onClick={() => setActiveTab('vendor')} className={`pb-3 font-bold transition-colors ${activeTab === 'vendor' ? 'border-b-2 border-[#1A1A18] text-[#1A1A18]' : 'text-[#8C8880] hover:text-[#1A1A18]'}`}>廠商資訊 (任務)</button>
        </div>

        <div className="bg-white rounded-3xl border border-[#E2DDD4] p-8 mb-16 min-h-[200px]">
          {activeTab === 'description' && (<div className="text-[#8C8880] text-sm leading-relaxed">這是商品描述的詳細內容區塊...</div>)}
          {activeTab === 'reviews' && (<div className="text-[#8C8880] text-sm leading-relaxed">這是商品評價的區塊，可以列出其他使用者的留言...</div>)}
          {activeTab === 'vendor' && (
            <div className="flex flex-col gap-6 text-[#1A1A18]">
              <div><h3 className="font-bold mb-2">任務內容概覽</h3><p className="text-sm text-[#8C8880]">任務內容概述（發文細節等等）</p></div>
              <div className="h-px bg-[#E2DDD4] w-full" />
              <div><h3 className="font-bold mb-2">廠商資訊</h3><p className="text-sm text-[#8C8880]">{productDetail.vendorName}</p><p className="text-sm text-[#C8522A] font-medium mt-1">提供的優惠項目：{productDetail.promoDesc}</p></div>
            </div>
          )}
        </div>

        {/* 底部：推薦商品 */}
        <div>
          <h2 className="font-serif text-xl text-[#1A1A18] mb-6 font-bold">您可能也會喜歡...</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Transcend 創見 ESD260C...", price: "NTD$ 2700", gradient: "linear-gradient(135deg,#C4C8D4,#A8AEBB)" },
              { name: "樂扣樂扣嚼對FUN飲...", price: "NTD$ 1399", gradient: "linear-gradient(135deg,#C8D4C4,#B0BBA8)" },
              { name: "Shirt", price: "$20.99", gradient: "linear-gradient(135deg,#D4C8C0,#B8ACA4)" },
              { name: "Shirt", price: "$20.99", gradient: "linear-gradient(135deg,#C0C8D4,#A4ACB8)" }
            ].map((p, idx) => (
              <div 
                key={idx} 
                onClick={() => handleRecommendClick(p)} // 🟢 觸發跳轉動畫與資料替換
                className="group cursor-pointer overflow-hidden flex flex-col gap-3"
              >
                <div className="relative flex aspect-square w-full items-center justify-center rounded-2xl overflow-hidden" style={{ background: p.gradient }}>
                  <svg className="h-8 w-8 text-black/10" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" /></svg>
                </div>
                <div className="px-1">
                  <div className="text-sm font-medium text-[#1A1A18] mb-1 line-clamp-2">{p.name}</div>
                  <div className="font-black text-[#1A1A18]">{p.price}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-[#8C8880]">
                    <span className="text-[#B89B6A] tracking-widest text-[10px]">★★★★★</span>
                    <span>(120)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 🟢 彈出提示 (Toast) */}
      <div className={`fixed bottom-10 left-1/2 z-[999] flex -translate-x-1/2 items-center gap-4 rounded-full bg-[#1A1A18] pl-6 pr-2 py-2 text-sm font-bold tracking-wide text-white shadow-xl transition-all duration-300 ${toastMsg ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-10 opacity-0"}`}>
        <span>{toastMsg}</span>
        {userRole === 'guest' && toastMsg.includes("登入") && (
          <button onClick={() => onNavigate?.('login')} className="rounded-full bg-[#C8522A] px-5 py-2.5 text-xs transition-colors hover:bg-[#A64220]">
            前往登入
          </button>
        )}
      </div>

    </div>
  );
}