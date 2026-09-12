import { API_BASE_URL } from '../config';
import React, { useMemo, useState, useRef, useEffect } from "react";

function formatNTD(amount) {
  const value = Number(amount);
  return `NT$${Number.isFinite(value) ? Math.round(value).toLocaleString("zh-TW") : "0"}`;
}

// === Icons ===
function SearchIcon() {
  return (
    <svg className="h-4 w-4 text-[#8C8880]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function XIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronDown({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ShoppingBagIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

// 🌟 乾淨的商品卡片
function ProductCard({ name, price, stock, gradient = "linear-gradient(135deg,#D8D4CC,#C4BDB4)", imageUrl, onAdd, onClick }) {
  const isSoldOut = Number(stock) <= 0;

  return (
    <div className="group flex flex-col gap-2 md:gap-3 cursor-pointer" onClick={onClick}>
      {/* [RWD 優化] 縮小卡片圓角 rounded-xl */}
      <div className="relative flex aspect-square w-full items-center justify-center rounded-xl md:rounded-2xl overflow-hidden bg-[#E2DDD4]/20 shadow-sm transition-all duration-300 group-hover:shadow-md">
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105"
          style={imageUrl ? undefined : { background: gradient }}
        >
          {imageUrl && (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
          )}
        </div>

        {/* 缺圖時的 Icon */}
        {!imageUrl && (
          <svg className="h-8 w-8 md:h-10 md:w-10 text-[#1A1A18]/10 relative z-10 transition-transform duration-700 group-hover:scale-105" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" />
          </svg>
        )}

        {/* 購物車按鈕：售罄時不給加入購物車 */}
        {!isSoldOut && (
          // [RWD 優化] 手機版縮小按鈕與圖標，且不隱藏(直接顯示)
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            className="absolute bottom-2 right-2 md:bottom-4 md:right-4 md:translate-y-6 md:opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 bg-[#1A1A18]/80 md:bg-[#1A1A18] text-[#F5F0E8] p-2 md:p-2.5 rounded-full hover:bg-[#C8522A] shadow-md backdrop-blur-sm md:backdrop-blur-none"
          >
            <ShoppingBagIcon />
          </button>
        )}
      </div>

      <div className="flex flex-col px-1 pt-1 md:pt-0 font-sans">
        <h3 className="text-xs md:text-sm font-bold text-[#1A1A18] line-clamp-2 leading-snug md:leading-relaxed transition-colors group-hover:text-[#C8522A] min-h-[36px] md:min-h-[40px]">
          {name}
        </h3>
        <div className="mt-0.5 md:mt-1 text-sm md:text-base font-black tracking-wide text-[#8C8880]">
          {isSoldOut ? "已售罄" : price}
        </div>
      </div>
    </div>
  );
}

const GRADIENTS = [
  "linear-gradient(135deg,#D8D4CC,#C4BDB4)",
  "linear-gradient(135deg,#C4C8D4,#A8AEBB)",
  "linear-gradient(135deg,#C8D4C4,#B0BBA8)",
  "linear-gradient(135deg,#D4C8C4,#BBA8A0)",
  "linear-gradient(135deg,#C8BEB4,#A89E94)",
  "linear-gradient(135deg,#B4C8C4,#94A8A4)",
  "linear-gradient(135deg,#C8C4B4,#A8A494)",
  "linear-gradient(135deg,#BEC8C4,#9EA8A4)",
];

export default function ShopPage({ onNavigate, userRole = "guest", onAddToCart }) {
  const [toastMsg, setToastMsg] = useState("");
  const [search, setSearch] = useState("");
  const [sortType, setSortType] = useState("default");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: "all", label: "所有分類" },
    { id: "3c", label: "3C 與配件" },
    { id: "clothing", label: "質感服飾" },
    { id: "lifestyle", label: "生活風格" },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/consumer/products`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setProducts(data.map((p, i) => ({
            ...p,
            gradient: GRADIENTS[i % GRADIENTS.length],
          })));
        }
      } catch (err) {
        console.error("商品載入失敗", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
        setIsCategoryMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isFiltering = search.trim() !== "" || sortType !== "default" || activeCategory !== "all";

  const showToast = (msg) => {
    setToastMsg(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToastMsg(""), 3000);
  };

  const handleAdd = async (productId) => {
    if (userRole === "guest") {
      showToast("需先登入或註冊才能加入購物車喔！");
      return;
    }

    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");

    try {
      const cartRes = await fetch(`${API_BASE_URL}/api/consumer/cart/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ User_id: userId }),
      });
      const cartData = await cartRes.json();
      const cartId = cartData.Cart_id;

      const addRes = await fetch(`${API_BASE_URL}/api/consumer/cart/item/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Cart_id: cartId,
          Product_id: productId,
          Quantity: 1,
        }),
      });

      if (addRes.ok) {
        showToast("✓ 已成功加入購物車！");
        onAddToCart?.();
      } else {
        showToast("加入購物車失敗，請再試一次");
      }
    } catch (err) {
      showToast("網路錯誤，請稍後再試");
    }
  };

  const handleKocClick = (e) => {
    if (e) e.stopPropagation();
    if (userRole === "koc") {
      onNavigate?.("home");
    } else {
      onNavigate?.("kocIntro");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSortType("default");
    setActiveCategory("all");
  };

  const getPriceNum = (p) => parseFloat(p.discounted_price || p.price) || 0;

  const displayProducts = useMemo(() => {
    let result = [...products];
    if (activeCategory !== "all") {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (search.trim()) {
      result = result.filter((p) =>
        (p.Product_name || "").toLowerCase().includes(search.toLowerCase())
      );
    }
    if (sortType === "asc") {
      result.sort((a, b) => getPriceNum(a) - getPriceNum(b));
    } else if (sortType === "desc") {
      result.sort((a, b) => getPriceNum(b) - getPriceNum(a));
    }
    return result;
  }, [products, search, sortType, activeCategory]);

  const featured = products.slice(0, 4);
  const bestSellers = products.slice(4, 8);

  const toggleSort = () =>
    setSortType((prev) => prev === "default" ? "asc" : prev === "asc" ? "desc" : "default");
  const sortLabel =
    sortType === "default" ? "價格排序" : sortType === "asc" ? "價格由低到高 ↑" : "價格由高到低 ↓";

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18] font-sans pb-24 relative animate-in fade-in duration-500">

      {/* 過濾導覽列 */}
      <div className="sticky top-[60px] md:top-[73px] z-30 bg-white/95 backdrop-blur-md border-b border-[#E2DDD4] shadow-sm">
        {/* [RWD 優化] 手機版縮小內距 p-3 */}
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-3 md:py-4 flex flex-wrap items-center justify-between gap-3 md:gap-6 font-sans">

          <div className="flex items-center gap-3">
            <div className="relative" ref={categoryMenuRef}>
              <button
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                className={`text-xs md:text-sm font-bold flex items-center gap-1.5 md:gap-2 transition-colors px-3 py-1.5 md:px-4 md:py-2 rounded-full border ${activeCategory !== "all" || isCategoryMenuOpen ? "bg-[#1A1A18] text-white border-[#1A1A18]" : "bg-[#F5F0E8] text-[#1A1A18] hover:bg-[#E2DDD4]/50 border-transparent"}`}
              >
                <FilterIcon />
                {activeCategory === "all" ? "分類" : categories.find((c) => c.id === activeCategory)?.label}
                <ChevronDown className={`h-3 w-3 md:h-4 md:w-4 transition-transform ${isCategoryMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {isCategoryMenuOpen && (
                <div className="absolute top-full left-0 mt-2 md:mt-3 w-36 md:w-40 bg-white border border-[#E2DDD4] rounded-xl md:rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setActiveCategory(c.id); setIsCategoryMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 md:px-5 text-xs md:text-sm font-bold transition-colors hover:bg-[#F5F0E8] ${activeCategory === c.id ? "text-[#C8522A] bg-[#FDF0ED]" : "text-[#1A1A18]"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={toggleSort} className="text-xs md:text-sm font-bold text-[#1A1A18] flex items-center gap-1 md:gap-1.5 hover:text-[#C8522A] transition-colors">
              <span className="hidden sm:inline">{sortLabel}</span>
              <span className="sm:hidden">{sortType === "default" ? "排序" : sortType === "asc" ? "價格 ↑" : "價格 ↓"}</span> 
              <ChevronDown className={`h-3 w-3 md:h-4 md:w-4 transition-transform ${sortType === "desc" ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* 搜尋框 - [RWD 優化] 手機版自動佔滿整列 (w-full order-last) */}
          <div className="w-full md:w-auto md:ml-auto order-last md:order-none flex items-center gap-2 md:gap-3 bg-[#F5F0E8] border border-transparent rounded-full px-4 py-2 md:px-5 md:py-2.5 focus-within:bg-white focus-within:border-[#1A1A18] transition-all">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-[13px] md:text-sm font-medium outline-none placeholder:text-[#8C8880]"
              placeholder="搜尋商品名稱..."
            />
            {search.trim() ? (
              <button onClick={() => setSearch("")} className="text-[#1A1A18] hover:text-[#C8522A] transition-colors p-1 rounded-full">
                <XIcon />
              </button>
            ) : (
              <SearchIcon />
            )}
          </div>
        </div>
      </div>

      {/* [RWD 優化] 主內容區加上 p-4 */}
      <div className="mx-auto max-w-6xl px-4 md:px-6 mt-2 md:mt-4">

        {loading && (
          <div className="py-24 flex flex-col items-center justify-center text-[#8C8880] animate-pulse font-sans">
            <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-[#C8522A] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold tracking-widest text-xs md:text-sm uppercase">Loading</p>
          </div>
        )}

        {!loading && !isFiltering && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">

            {/* 🌟 本期主打 */}
            {/* [RWD 優化] 手機版改為純垂直疊加，置中對齊 */}
            <div className="py-8 md:py-20 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10">
              
              {/* 1. 左側：大標題與探索按鈕 */}
              <div className="shrink-0 flex flex-col items-center md:items-start text-center md:text-left w-full md:w-auto order-1 md:order-1">
                <p className="font-sans text-[#C8522A] font-bold text-[10px] md:text-xs tracking-[0.2em] mb-3 md:mb-4 uppercase">Featured Item</p>
                <h1 className="font-serif text-[32px] md:text-5xl font-black tracking-wide leading-tight mb-6 md:mb-8 text-[#1A1A18]">
                  本期主打<br className="hidden md:block" />
                  <span className="md:hidden"> </span>商品精選
                </h1>
                <button 
                  onClick={() => products[0] && onNavigate?.("product_detail", products[0])} 
                  className="hidden md:inline-flex font-sans items-center justify-center rounded-full bg-[#1A1A18] px-8 py-3.5 text-sm font-bold tracking-widest text-[#F5F0E8] transition-all hover:-translate-y-1 hover:shadow-lg hover:bg-[#C8522A] active:translate-y-0"
                >
                  探索細節
                </button>
              </div>

              {/* 3. 右側：主打圖片 (手機版移至中間) */}
              <div
                className="w-full md:w-[450px] aspect-square md:aspect-[4/3] shrink-0 rounded-2xl md:rounded-3xl flex items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-500 overflow-hidden group shadow-sm border border-[#E2DDD4]/50 order-2 md:order-3"
                style={products[0]?.image_url ? undefined : { background: "linear-gradient(135deg,#D8D4CC,#C4BDB4)" }}
                onClick={() => products[0] && onNavigate?.("product_detail", products[0])}
              >
                {products[0]?.image_url ? (
                  <img src={products[0].image_url} alt={products[0].Product_name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <svg className="h-16 w-16 md:h-20 md:w-20 text-[#1A1A18]/10 transition-transform duration-700 group-hover:scale-105" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" />
                  </svg>
                )}
              </div>

              {/* 2. 中間：商品名稱 (手機版移至圖片下方) */}
              <div className="w-full md:flex-1 flex justify-center md:justify-end items-center mt-2 md:mt-0 mb-4 md:mb-0 order-3 md:order-2">
                {products[0] && (
                  <div className="flex flex-col items-center md:items-end text-center md:text-right pl-0 md:pl-0 md:pr-8 border-l-0 md:border-r-2 border-[#C8522A]">
                    <p className="font-sans text-[#8C8880] text-[10px] md:text-xs font-bold tracking-[0.1em] mb-1.5 md:mb-2 uppercase">Latest Pick</p>
                    <p className="font-sans text-[#1A1A18] text-base md:text-lg font-bold leading-snug md:max-w-[220px]">
                      {products[0].Product_name}
                    </p>
                  </div>
                )}
              </div>
              
              {/* 手機版的探索按鈕 */}
              <button 
                  onClick={() => products[0] && onNavigate?.("product_detail", products[0])} 
                  className="md:hidden w-full order-4 font-sans inline-flex items-center justify-center rounded-xl bg-[#1A1A18] px-6 py-3.5 text-sm font-bold tracking-widest text-[#F5F0E8] transition-all hover:bg-[#C8522A] shadow-md"
                >
                  探索細節
                </button>
            </div>

            {/* KOC Banner */}
            <div className="pb-12 md:pb-16 pt-2 md:pt-4 font-sans">
              {/* [RWD 優化] 手機版 p-6，圓角縮小 */}
              <div
                className="bg-[#1A1A18] rounded-2xl md:rounded-[2.5rem] p-6 md:p-12 flex flex-col md:flex-row items-center justify-between shadow-2xl relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all duration-300"
                onClick={handleKocClick}
              >
                <div className="absolute -right-10 -top-10 md:-right-20 md:-top-20 w-48 h-48 md:w-64 md:h-64 bg-[#C8522A] rounded-full blur-[60px] md:blur-[80px] opacity-30 group-hover:scale-110 transition-transform duration-700 ease-out"></div>
                <div className="absolute -left-10 -bottom-10 md:-bottom-20 w-32 h-32 md:w-48 md:h-48 bg-[#B89B6A] rounded-full blur-[40px] md:blur-[60px] opacity-20 group-hover:scale-110 transition-transform duration-700 ease-out"></div>
                
                <div className="relative z-10 text-[#F5F0E8] max-w-lg mb-6 md:mb-0 pointer-events-none text-center md:text-left">
                  <div className="text-[#C8522A] font-bold text-[10px] md:text-xs tracking-[0.2em] mb-3 md:mb-4 uppercase">KOC Partner Program</div>
                  
                  {userRole === "koc" ? (
                    <>
                      <h2 className="font-serif text-2xl md:text-4xl font-black mb-3 md:mb-4 leading-tight">歡迎回來！<br />前往專屬任務大廳</h2>
                      <p className="text-gray-400 text-xs md:text-sm leading-relaxed mb-6 md:mb-8 font-medium">查看最新的代言商品、追蹤您的專屬優惠碼成效，並管理您的收益。</p>
                    </>
                  ) : (
                    <>
                      <h2 className="font-serif text-2xl md:text-4xl font-black mb-3 md:mb-4 leading-tight">成為專屬 KOC<br />將影響力變現！</h2>
                      <p className="text-gray-400 text-xs md:text-sm leading-relaxed mb-6 md:mb-8 font-medium">加入 KOC 行銷接案計畫，領取專屬優惠碼。每一筆使用您優惠碼的訂單都能帶來豐厚分潤。</p>
                    </>
                  )}
                  <button onClick={handleKocClick} className="bg-[#C8522A] text-white w-full md:w-auto px-6 md:px-8 py-3 md:py-3.5 rounded-xl md:rounded-full font-bold tracking-wide hover:bg-[#A64220] transition-all shadow-md pointer-events-auto">
                    {userRole === "koc" ? "進入任務大廳" : "了解 KOC 計畫"}
                  </button>
                </div>
                
                {/* 手機版隱藏圖標 */}
                <div className="hidden md:flex relative z-10 w-full md:w-[35%] aspect-video bg-white/5 border border-white/10 rounded-2xl items-center justify-center backdrop-blur-md pointer-events-none group-hover:rotate-2 transition-transform duration-500">
                  <svg className="h-16 w-16 text-white/20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 推薦商品 */}
            {featured.length > 0 && (
              <div className="pb-8 md:pb-12 border-t border-[#E2DDD4]/60 pt-8 md:pt-12">
                <h2 className="font-serif text-xl md:text-3xl font-bold text-[#1A1A18] flex flex-col gap-2 mb-6 md:mb-8">
                  推薦商品
                  <span className="h-1 w-8 md:w-10 rounded-full bg-[#C8522A]"></span>
                </h2>
                
                {/* [RWD 優化] grid-cols-2 維持不變，但縮小 gap */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-6 md:gap-x-6 md:gap-y-10">
                  {featured.map((p) => (
                    <ProductCard
                      key={p.product_id}
                      name={p.Product_name}
                      price={formatNTD(p.discounted_price || p.price)}
                      stock={p.stock}
                      gradient={p.gradient}
                      imageUrl={p.image_url}
                      onAdd={() => handleAdd(p.Product_id)}
                      onClick={() => onNavigate?.("product_detail", p)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 本期最熱賣 */}
            {bestSellers.length > 0 && (
              <div className="py-8 md:py-12 border-t border-[#E2DDD4]/60">
                <h2 className="font-serif text-xl md:text-3xl font-bold text-[#1A1A18] flex flex-col gap-2 mb-6 md:mb-8">
                  本期最熱賣
                  <span className="h-1 w-8 md:w-10 rounded-full bg-[#B89B6A]"></span>
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-6 md:gap-x-6 md:gap-y-10">
                  {bestSellers.map((p) => (
                    <ProductCard
                      key={p.product_id}
                      name={p.Product_name}
                      price={formatNTD(p.discounted_price || p.price)}
                      stock={p.stock}
                      gradient={p.gradient}
                      imageUrl={p.image_url}
                      onAdd={() => handleAdd(p.Product_id)}
                      onClick={() => onNavigate?.("product_detail", p)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 所有商品 / 搜尋結果 */}
        {!loading && (
          <div className={`py-8 md:py-12 ${!isFiltering ? "border-t border-[#E2DDD4]/60" : "pt-8 animate-in fade-in duration-500"}`}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 md:gap-4 mb-6 md:mb-8">
              
              <h2 className="font-serif text-xl md:text-3xl font-bold text-[#1A1A18] flex flex-col gap-2">
                {isFiltering ? "搜尋與篩選結果" : "所有商品"}
                <span className="h-1 w-8 md:w-10 rounded-full bg-[#C8522A]"></span>
              </h2>

              {isFiltering && (
                <button onClick={clearFilters} className="font-sans text-[13px] md:text-sm font-bold text-[#8C8880] hover:text-[#1A1A18] transition-colors underline underline-offset-4 mb-1 self-start sm:self-auto">
                  清除篩選，返回首頁
                </button>
              )}
            </div>

            {displayProducts.length === 0 ? (
              <div className="py-16 md:py-24 flex flex-col items-center text-center font-sans">
                <SearchIcon className="h-8 w-8 md:h-10 md:w-10 text-[#E2DDD4] mb-4" />
                <p className="text-base md:text-lg font-bold text-[#1A1A18] mb-1.5 md:mb-2">找不到相關商品</p>
                <p className="text-xs md:text-sm text-[#8C8880]">請嘗試更換分類或搜尋關鍵字</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-6 md:gap-x-6 md:gap-y-10">
                {displayProducts.map((p) => (
                  <ProductCard
                    key={p.product_id}
                    name={p.Product_name}
                    price={formatNTD(p.discounted_price || p.price)}
                    stock={p.stock}
                    gradient={p.gradient}
                    imageUrl={p.image_url}
                    onAdd={() => handleAdd(p.Product_id)}
                    onClick={() => onNavigate?.("product_detail", p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Toast */}
      <div className={`fixed bottom-6 md:bottom-10 left-1/2 z-[999] flex w-[92%] sm:w-max max-w-md -translate-x-1/2 items-center justify-between md:justify-center gap-3 md:gap-4 rounded-xl md:rounded-full bg-[#1A1A18] pl-4 md:pl-6 pr-2 py-2 text-[11px] md:text-sm font-bold tracking-wide text-white shadow-xl transition-all duration-300 font-sans ${toastMsg ? "translate-y-0 opacity-100 scale-100" : "pointer-events-none translate-y-10 opacity-0 scale-95"}`}>
        <span className="line-clamp-2 leading-relaxed">{toastMsg}</span>
        {userRole === "guest" && toastMsg.includes("登入") && (
          <button onClick={() => onNavigate?.("login")} className="flex-shrink-0 whitespace-nowrap rounded-lg md:rounded-full bg-[#C8522A] px-3.5 md:px-5 py-2 md:py-2.5 text-[11px] md:text-xs transition-colors hover:bg-[#A64220]">
            前往登入
          </button>
        )}
      </div>
    </div>
  );
}