import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, ShoppingBag, Star } from 'lucide-react';

export default function ProductDetailPage({
  onBack, onGoCart, onBuyNow, onAddToCart, userRole, onNavigate, product,
}) {
  const [toastMsg, setToastMsg] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [isLoading, setIsLoading] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [campaignData, setCampaignData] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);

  const [productDetail, setProductDetail] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    // 拉所有商品作為推薦
    fetch(`${API_BASE_URL}/api/consumer/products`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // 排除當前商品，取前4筆
          const filtered = data
            .filter(p => p.Product_id !== productDetail?.id)
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
        rawPrice: Number(product.discounted_price || product.price) || 0,
        stock: Number(product.stock ?? 0),
        rating: 4.8,
        description: product.description || "",
        reviewsCount: 0,
        vendorName: product.Vendor_name || product.Vendor_id || "",
        promoDesc: "",
        gradient: product.gradient || "linear-gradient(135deg,#D8D4CC,#C4BDB4)",
        imageUrl: product.image_url || "",
      });
    }
  }, [product]);

  // 依實際登入的使用者，向後端查詢這個商品是否已在收藏清單內
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userRole === 'guest' || !userId || !productDetail?.id) return;

    let cancelled = false;
    fetch(`http://127.0.0.1:8000/api/consumer/wishlist/view?User_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled || !Array.isArray(data)) return;
        setIsFavorited(data.some(item => item.Product_id === productDetail?.id));
      })
      .catch(() => { });

    return () => { cancelled = true; };
  }, [productDetail?.id, userRole]);

  useEffect(() => {
    if (!product?.Product_id) {
      setCampaignData(null);
      return;
    }

    let cancelled = false;

    const fetchCampaign = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/consumer/product/campaign?Product_id=${product.Product_id}`
        );

        if (!res.ok) {
          throw new Error("取得商品活動失敗");
        }

        const data = await res.json();
        if (!cancelled) {
          setCampaignData(data?.campaign_id ? data : null);
        }
      } catch (err) {
        console.error("取得商品活動失敗：", err);
        if (!cancelled) setCampaignData(null);
      }
    };

    fetchCampaign();

    return () => {
      cancelled = true;
    };
  }, [product?.Product_id]);

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

    const productId = Number(productDetail.id);
    const price = Number(productDetail.rawPrice);
    const qty = Number(quantity) || 1;

    if (!Number.isInteger(productId) || productId <= 0) {
      showToast("找不到商品資料，請重新整理後再試");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      showToast("商品價格異常，暫時無法結帳");
      return;
    }

    onBuyNow?.({
      productId,
      name: productDetail.name,
      price,
      qty,
      imageUrl: productDetail.imageUrl || "",
      buyNow: true,
    });
  };

  const handleRecommendClick = (p) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsLoading(true);

    setTimeout(() => {
      const rawPrice = Number(p.discounted_price ?? p.price) || 0;

      setProductDetail((prev) => ({
        ...prev,
        id: p.Product_id,
        name: p.Product_name,
        price: `NTD$ ${rawPrice}`,
        rawPrice,
        description: p.description || "",
        vendorName: p.Vendor_name || p.Vendor_id || "",
        imageUrl: p.image_url || "",
      }));
      setCampaignData(null);
      setQuantity(1);
      setIsLoading(false);
    }, 400);
  };

  const handleHeartClick = async () => {
    if (userRole === 'guest') {
      showToast("需先登入或註冊才能加入收藏清單喔！");
      return;
    }

    const userId = localStorage.getItem("userId");

    try {
      if (!isFavorited) {
        await fetch("http://127.0.0.1:8000/api/consumer/wishlist/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ User_id: userId, Product_id: productDetail.id }),
        });
        setIsFavorited(true);
        showToast("✓ 已加入收藏清單");
      } else {
        await fetch("http://127.0.0.1:8000/api/consumer/wishlist/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ User_id: userId, Product_id: productDetail.id }),
        });
        setIsFavorited(false);
        showToast("已從收藏清單移除");
      }
    } catch {
      showToast("操作失敗，請稍後再試");
    }
  };

  if (!productDetail) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <p className="text-[#8C8880] font-bold text-sm md:text-base">商品載入中...</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#F5F0E8] font-sans text-[#1A1A18] pb-24 relative">
      <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-12">
        
        <button
          onClick={() => onBack?.()}
          className="mb-4 md:mb-6 flex items-center gap-1.5 md:gap-2 text-[#8C8880] hover:text-[#1A1A18] transition-colors font-bold text-xs md:text-sm group w-fit bg-white md:bg-transparent px-3 md:px-0 py-1.5 md:py-0 rounded-full border border-[#E2DDD4] md:border-transparent shadow-sm md:shadow-none"
        >
          <ArrowLeft size={16} className="md:w-4 md:h-4 transition-transform group-hover:-translate-x-1" />
          返回商品列表
        </button>

        <div className={`flex flex-col md:flex-row gap-5 md:gap-12 lg:gap-16 mb-10 md:mb-16 transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>

          <div className="w-full md:w-[45%] aspect-square rounded-2xl md:rounded-3xl flex items-center justify-center shadow-sm relative overflow-hidden transition-all duration-500" style={productDetail.imageUrl ? undefined : { background: productDetail.gradient }}>
            {productDetail.imageUrl ? (
              <img src={productDetail.imageUrl} alt={productDetail.name} className="w-full h-full object-cover" />
            ) : (
              <svg className="h-16 w-16 md:h-24 md:w-24 text-black/10" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" /></svg>
            )}
          </div>

          <div className="w-full md:w-[55%] flex flex-col justify-center">
            <div className="flex items-start justify-between gap-4 mb-3 md:mb-4">
              <h1 className="font-serif text-xl md:text-3xl leading-snug pr-2">{productDetail.name}</h1>
              <button
                onClick={handleHeartClick}
                className={`flex-shrink-0 p-2 md:p-2.5 rounded-full border transition-all ${isFavorited ? 'bg-[#FDF0ED] border-[#C8522A] text-[#C8522A]' : 'bg-white border-[#E2DDD4] text-[#8C8880] hover:border-[#1A1A18] hover:text-[#1A1A18]'}`}
              >
                <Heart size={18} className="md:w-5 md:h-5" fill={isFavorited ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="font-black text-xl md:text-2xl text-[#1A1A18] mb-4 md:mb-6">{productDetail.price}</div>

            <div className="mb-6 md:mb-8">
              <label className="block text-[11px] md:text-xs font-bold text-[#8C8880] mb-2 uppercase">數量</label>
              <div className="flex items-center bg-white border border-[#E2DDD4] rounded-full w-fit overflow-hidden h-10 md:h-12">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 md:w-12 h-full text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors flex items-center justify-center font-bold text-base md:text-lg">-</button>
                <span className="w-8 md:w-10 text-center font-bold text-[#1A1A18] text-sm md:text-base">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-10 md:w-12 h-full text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors flex items-center justify-center font-bold text-base md:text-lg">+</button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              {productDetail.stock <= 0 ? (
                <div className="flex-1 bg-gray-200 text-gray-500 py-3.5 md:py-4 rounded-xl md:rounded-full font-bold tracking-wide text-center text-sm md:text-base">
                  已售完
                </div>
              ) : (
                <>
                  <button onClick={handleBuyNow} className="flex-1 bg-[#C8522A] text-white py-3.5 md:py-4 rounded-xl md:rounded-full font-bold tracking-wide hover:bg-[#A64220] hover:-translate-y-0.5 transition-all shadow-md text-sm md:text-base">立即訂購</button>
                  <button onClick={handleAddCart} className="flex-1 bg-white border border-[#1A1A18] text-[#1A1A18] py-3.5 md:py-4 rounded-xl md:rounded-full font-bold tracking-wide hover:bg-[#F5F0E8] hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 text-sm md:text-base"><ShoppingBag size={16} className="md:w-[18px] md:h-[18px]" /> 加入購物車</button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-[#E2DDD4] flex gap-6 md:gap-8 mb-6 md:mb-8 overflow-x-auto hide-scrollbar whitespace-nowrap custom-scrollbar">
          <button onClick={() => setActiveTab('description')} className={`pb-2.5 md:pb-3 text-sm md:text-base font-bold transition-colors ${activeTab === 'description' ? 'border-b-2 border-[#1A1A18] text-[#1A1A18]' : 'text-[#8C8880] hover:text-[#1A1A18]'}`}>商品描述</button>
          <button onClick={() => setActiveTab('vendor')} className={`pb-2.5 md:pb-3 text-sm md:text-base font-bold transition-colors ${activeTab === 'vendor' ? 'border-b-2 border-[#1A1A18] text-[#1A1A18]' : 'text-[#8C8880] hover:text-[#1A1A18]'}`}>廠商資訊 (任務)</button>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl border border-[#E2DDD4] p-5 md:p-8 mb-10 md:mb-16 min-h-[150px] md:min-h-[200px]">
          {activeTab === 'vendor' && (
            <div className="text-xs md:text-sm text-[#8C8880] leading-relaxed space-y-4">
              <div>
                <h3 className="font-bold text-[#1A1A18] mb-1 md:mb-2">廠商</h3>
                <p>{productDetail.vendorName}</p>
              </div>
              {campaignData ? (
                <>
                  <div>
                    <h3 className="font-bold text-[#1A1A18] mb-1 md:mb-2">活動名稱</h3>
                    <p>{campaignData.name}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A18] mb-1 md:mb-2">活動描述</h3>
                    <p>{campaignData.description || "暫無描述"}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A18] mb-1 md:mb-2">優惠折扣</h3>
                    <p className="text-[#C8522A] font-medium">
                      {campaignData.discount_type === 'percentage'
                        ? `${campaignData.discount_value}% off`
                        : `折 $${campaignData.discount_value}`}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A18] mb-1 md:mb-2">活動期間</h3>
                    <p>{new Date(campaignData.start_date).toLocaleDateString("zh-TW")} ~ {new Date(campaignData.end_date).toLocaleDateString("zh-TW")}</p>
                  </div>
                </>
              ) : (
                <p>此商品目前無對應活動</p>
              )}
            </div>
          )}
          {activeTab === 'description' && (
            <div className="text-xs md:text-sm text-[#8C8880] leading-relaxed whitespace-pre-line">
              {productDetail.description || "暫無詳細描述"}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-serif text-lg md:text-xl text-[#1A1A18] mb-4 md:mb-6 font-bold">您可能也會喜歡...</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {relatedProducts.map((p) => (
              <div key={p.id} onClick={() => handleRecommendClick(p.raw)} className="group cursor-pointer overflow-hidden flex flex-col gap-2.5 md:gap-3">
                <div className="relative flex aspect-square w-full items-center justify-center rounded-xl md:rounded-2xl overflow-hidden" style={p.raw?.image_url ? undefined : { background: p.gradient }}>
                  {p.raw?.image_url ? (
                    <img src={p.raw.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <svg className="h-8 w-8 text-black/10" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" /></svg>
                  )}
                </div>
                <div className="px-1">
                  <div className="text-xs md:text-sm font-medium text-[#1A1A18] mb-1 line-clamp-2 leading-snug">{p.name}</div>
                  <div className="font-black text-sm md:text-base text-[#1A1A18]">{p.price}</div>
                  <div className="mt-0.5 md:mt-1 flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs text-[#8C8880]">
                    <span className="text-[#B89B6A] tracking-widest text-[8px] md:text-[10px]">★★★★★</span>
                    <span>(120)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Toast */}
      <div className={`fixed bottom-6 md:bottom-10 left-1/2 z-[999] flex w-[92%] sm:w-max max-w-md -translate-x-1/2 items-center justify-between md:justify-center gap-3 md:gap-4 rounded-xl md:rounded-full bg-[#1A1A18] pl-4 md:pl-6 pr-2 py-2 text-[11px] md:text-sm font-bold tracking-wide text-white shadow-xl transition-all duration-300 font-sans ${toastMsg ? "translate-y-0 opacity-100 scale-100" : "pointer-events-none translate-y-10 opacity-0 scale-95"}`}>
        <span className="line-clamp-2 leading-relaxed">{toastMsg}</span>
        {userRole === 'guest' && toastMsg.includes("登入") && (
          <button onClick={() => onNavigate?.('login')} className="flex-shrink-0 whitespace-nowrap rounded-lg md:rounded-full bg-[#C8522A] px-3.5 md:px-5 py-2 md:py-2.5 text-[11px] md:text-xs transition-colors hover:bg-[#A64220]">
            前往登入
          </button>
        )}
      </div>
    </div>
  );
}