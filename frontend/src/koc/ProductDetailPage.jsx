import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, ShoppingBag, Star } from 'lucide-react';

export default function ProductDetailPage({
  onBack, onGoCart, onBuyNow, onAddToCart, userRole, onNavigate, product,
  favorites = [], // 🟢 接收全域的收藏清單
  onToggleFavorite // 🟢 接收切換收藏的函式
}) {
  const [toastMsg, setToastMsg] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [isLoading, setIsLoading] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [campaignData, setCampaignData] = useState(null);

  const [productDetail, setProductDetail] = useState({
    id: 1, // 🟢 確保有給 ID，這樣才能判斷收藏狀態
    name: "SanDisk 128GB SDXC Extreme Pro 200MB/s 4K U3 V30 相機記憶卡",
    price: "NTD$ 1470",
    rating: 4.8,
    reviewsCount: 102,
    vendorName: "廠商名稱",
    promoDesc: "使用優惠碼購買享九折優惠",
    gradient: "linear-gradient(135deg,#D8D4CC,#C4BDB4)"
  });

  // 🟢 動態計算當前商品是否在收藏清單內
  const isFavorited = favorites.some(item => item.id === productDetail.id);

  useEffect(() => {
    window.scrollTo(0, 0);

    // 拉所有商品作為推薦
    fetch(`${API_BASE_URL}/api/consumer/products`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // 排除當前商品，取前4筆
          const filtered = data
            .filter(p => p.Product_id !== productDetail.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 4)
            .map((p, i) => ({
              id: p.Product_id,
              name: p.Product_name,
              price: `NTD$ ${p.discounted_price || p.price}`,
              gradient: ["linear-gradient(135deg,#C4C8D4,#A8AEBB)", "linear-gradient(135deg,#C8D4C4,#B0BBA8)", "linear-gradient(135deg,#D4C8C0,#B8ACA4)", "linear-gradient(135deg,#C0C8D4,#A4ACB8)"][i % 4],
              raw: p,
            }));
          setRelatedProducts(filtered);
        }
      })
      .catch(() => { });

    if (product) {
      setProductDetail({
        id: product.Product_id,
        name: product.Product_name,
        price: `NTD$ ${product.discounted_price || product.price}`,
        rating: 4.8,
        description: product.description || "",
        reviewsCount: 0,
        vendorName: product.Vendor_id || "",
        promoDesc: "",
        gradient: product.gradient || "linear-gradient(135deg,#D8D4CC,#C4BDB4)",
        imageUrl: product.image_url || "",
      });
    }
  }, [product]);

  if (product) {
    fetch(`${API_BASE_URL}/api/consumer/product/campaign?Product_id=${product.Product_id}`)
      .then(res => res.json())
      .then(data => {
        if (data.campaign_id) setCampaignData(data);
      })
      .catch(() => { });
  }

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleAddCart = async () => {
    if (userRole === 'guest') {
      showToast("需先登入或註冊才能加入購物車喔！");
      return;
    }

    const userId = localStorage.getItem("userId");

    try {
      const cartRes = await fetch(`${API_BASE_URL}/api/consumer/cart/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ User_id: userId }),
      });
      const cartData = await cartRes.json();
      const cartId = cartData.Cart_id;

      const addRes = await fetch(`${API_BASE_URL}/api/consumer/cart/item/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Cart_id: cartId,
          Product_id: productDetail.id,
          Quantity: 1,
        }),
      });

      if (addRes.ok) {
        if (onAddToCart) onAddToCart();
        showToast("✓ 已成功加入購物車！");
      } else {
        showToast("加入購物車失敗，請再試一次");
      }
    } catch (err) {
      showToast("網路錯誤，請稍後再試");
    }
  };

  const handleBuyNow = () => {
    if (userRole === 'guest') {
      showToast("需先登入或註冊才能直接結帳喔！");
      return;
    }
    if (onBuyNow) onBuyNow();
  };

  const handleRecommendClick = (p) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsLoading(true);

    setTimeout(() => {
      setProductDetail({
        ...productDetail,
        id: p.Product_id,
        name: p.Product_name,
        price: `NTD$ ${p.discounted_price || p.price}`,
        description: p.description || "",
        gradient: productDetail.gradient,
        imageUrl: p.image_url || "",
      });
      setQuantity(1);
      setIsLoading(false);
    }, 400);
  };

  // 🟢 處理愛心點擊事件
  const handleHeartClick = () => {
    if (userRole === 'guest') {
      showToast("需先登入或註冊才能加入收藏清單喔！");
      return;
    }
    onToggleFavorite?.(productDetail);
    showToast(isFavorited ? "已從收藏清單移除" : "✓ 已加入收藏清單");
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] font-sans text-[#1A1A18] pb-24 relative">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <button
          onClick={() => onBack?.()}
          className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#1A1A18] transition-colors font-bold text-sm group w-fit"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          返回商品列表
        </button>
        <div className={`flex flex-col md:flex-row gap-12 lg:gap-16 mb-16 transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>

          <div className="w-full md:w-[45%] aspect-square rounded-3xl flex items-center justify-center shadow-sm relative overflow-hidden transition-all duration-500" style={productDetail.imageUrl ? undefined : { background: productDetail.gradient }}>
            {productDetail.imageUrl ? (
              <img src={productDetail.imageUrl} alt={productDetail.name} className="w-full h-full object-cover" />
            ) : (
              <svg className="h-24 w-24 text-black/10" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" /></svg>
            )}
          </div>

          <div className="w-full md:w-[55%] flex flex-col justify-center">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="font-serif text-2xl md:text-3xl leading-snug">{productDetail.name}</h1>
              {/* 🟢 修改愛心按鈕綁定 */}
              <button
                onClick={handleHeartClick}
                className={`flex-shrink-0 p-2.5 rounded-full border transition-all ${isFavorited ? 'bg-[#FDF0ED] border-[#C8522A] text-[#C8522A]' : 'bg-white border-[#E2DDD4] text-[#8C8880] hover:border-[#1A1A18] hover:text-[#1A1A18]'}`}
              >
                <Heart size={20} fill={isFavorited ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="font-black text-2xl text-[#1A1A18] mb-4">{productDetail.price}</div>

            <div className="mb-8">
              <label className="block text-xs font-bold text-[#8C8880] mb-2 uppercase">數量</label>
              <div className="flex items-center bg-white border border-[#E2DDD4] rounded-full w-fit overflow-hidden h-12">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-full text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors flex items-center justify-center font-bold text-lg">-</button>
                <span className="w-10 text-center font-bold text-[#1A1A18]">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-full text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors flex items-center justify-center font-bold text-lg">+</button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={handleBuyNow} className="flex-1 bg-[#C8522A] text-white py-4 rounded-full font-bold tracking-wide hover:bg-[#A64220] hover:-translate-y-0.5 transition-all shadow-md">立即訂購</button>
              <button onClick={handleAddCart} className="flex-1 bg-white border border-[#1A1A18] text-[#1A1A18] py-4 rounded-full font-bold tracking-wide hover:bg-[#F5F0E8] hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2"><ShoppingBag size={18} /> 加入購物車</button>
            </div>
          </div>
        </div>

        <div className="border-b border-[#E2DDD4] flex gap-8 mb-8">
          <button onClick={() => setActiveTab('description')} className={`pb-3 font-bold transition-colors ${activeTab === 'description' ? 'border-b-2 border-[#1A1A18] text-[#1A1A18]' : 'text-[#8C8880] hover:text-[#1A1A18]'}`}>商品描述</button>
          <button onClick={() => setActiveTab('vendor')} className={`pb-3 font-bold transition-colors ${activeTab === 'vendor' ? 'border-b-2 border-[#1A1A18] text-[#1A1A18]' : 'text-[#8C8880] hover:text-[#1A1A18]'}`}>廠商資訊 (任務)</button>
        </div>

        <div className="bg-white rounded-3xl border border-[#E2DDD4] p-8 mb-16 min-h-[200px]">
          {activeTab === 'vendor' && (
            <div className="text-sm text-[#8C8880] leading-relaxed space-y-4">
              <div>
                <h3 className="font-bold text-[#1A1A18] mb-2">廠商 ID</h3>
                <p>{productDetail.vendorName}</p>
              </div>
              {campaignData ? (
                <>
                  <div>
                    <h3 className="font-bold text-[#1A1A18] mb-2">活動名稱</h3>
                    <p>{campaignData.name}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A18] mb-2">活動描述</h3>
                    <p>{campaignData.description || "暫無描述"}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A18] mb-2">優惠折扣</h3>
                    <p className="text-[#C8522A] font-medium">
                      {campaignData.discount_type === 'percentage'
                        ? `${campaignData.discount_value}% off`
                        : `折 $${campaignData.discount_value}`}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A18] mb-2">活動期間</h3>
                    <p>{new Date(campaignData.start_date).toLocaleDateString("zh-TW")} ~ {new Date(campaignData.end_date).toLocaleDateString("zh-TW")}</p>
                  </div>
                </>
              ) : (
                <p>此商品目前無對應活動</p>
              )}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-serif text-xl text-[#1A1A18] mb-6 font-bold">您可能也會喜歡...</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <div key={p.id} onClick={() => handleRecommendClick(p.raw)} className="group cursor-pointer overflow-hidden flex flex-col gap-3">
                <div className="relative flex aspect-square w-full items-center justify-center rounded-2xl overflow-hidden" style={p.raw?.image_url ? undefined : { background: p.gradient }}>
                  {p.raw?.image_url ? (
                    <img src={p.raw.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="h-8 w-8 text-black/10" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" /></svg>
                  )}
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