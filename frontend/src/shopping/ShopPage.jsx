import React, { useMemo, useState, useRef, useEffect } from "react";

// --- Icons ---
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

function ProductCard({ name, price, gradient = "linear-gradient(135deg,#D8D4CC,#C4BDB4)", onAdd, onClick }) {
  return (
    <div className="group flex flex-col gap-3 transition-all hover:-translate-y-1 relative">
      <div 
        onClick={onClick}
        className="relative flex aspect-square w-full cursor-pointer items-center justify-center rounded-2xl overflow-hidden shadow-sm"
        style={{ background: gradient }}
      >
        <svg className="h-10 w-10 text-[#1A1A18]/10" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" />
        </svg>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          className="absolute bottom-4 right-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 bg-[#1A1A18] text-[#F5F0E8] p-2.5 rounded-full hover:bg-[#C8522A] shadow-md"
        >
          <ShoppingBagIcon />
        </button>
      </div>

      <div className="flex flex-col px-1" onClick={onClick}>
        <h3 className="text-sm font-medium text-[#1A1A18] line-clamp-2 leading-snug min-h-[40px] cursor-pointer hover:underline">
          {name}
        </h3>
        <div className="mt-2 text-base font-black text-[#1A1A18]">{price}</div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#8C8880]">
          <span className="text-[#B89B6A] tracking-widest text-[10px]">★★★★★</span>
          <span className="font-sans">(120)</span>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function ShopPage({ onNavigate, userRole = "guest", onAddToCart }) {
  const [toastMsg, setToastMsg] = useState("");
  const [search, setSearch] = useState("");
  const [sortType, setSortType] = useState("default");
  
  const [activeCategory, setActiveCategory] = useState("all");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef(null);

  const categories = [
    { id: "all", label: "所有分類" },
    { id: "3c", label: "3C 與配件" },
    { id: "clothing", label: "質感服飾" },
    { id: "lifestyle", label: "生活風格" },
  ];

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

  const handleAdd = () => {
    if (userRole === "guest") {
      setToastMsg("需先登入或註冊才能加入購物車喔！");
      window.clearTimeout(handleAdd._t);
      handleAdd._t = window.setTimeout(() => setToastMsg(""), 3500); 
      return;
    }
    if (onAddToCart) onAddToCart();
    setToastMsg("✓ 已成功加入購物車！");
    window.clearTimeout(handleAdd._t);
    handleAdd._t = window.setTimeout(() => setToastMsg(""), 2000); 
  };

  // 🟢 處理點擊 KOC 廣告 Banner 的邏輯 (根據身分跳轉)
  const handleKocClick = (e) => {
    if (e) e.stopPropagation();
    if (userRole === "guest") {
      setToastMsg("需先登入或註冊才能前往喔！");
      window.clearTimeout(handleAdd._t);
      handleAdd._t = window.setTimeout(() => setToastMsg(""), 3500); 
      return;
    }
    
    // 如果是 KOC 就回首頁(任務大廳)，否則去申請頁面
    if (userRole === 'koc') {
      onNavigate?.('home'); 
    } else {
      onNavigate?.('applyKoc'); 
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSortType("default");
    setActiveCategory("all");
  };

  const products = useMemo(() => [
    { id: 1, name: "SanDisk 128GB SDXC Extreme Pro 相機記憶卡", price: "NTD$ 1470", gradient: "linear-gradient(135deg,#D8D4CC,#C4BDB4)" },
    { id: 2, name: "Transcend 創見 ESD260C 250GB 行動固態硬碟", price: "NTD$ 2700", gradient: "linear-gradient(135deg,#C4C8D4,#A8AEBB)" },
    { id: 3, name: "樂扣樂扣嚼對FUN飲316不鏽鋼掀蓋吸管杯", price: "NTD$ 1399", gradient: "linear-gradient(135deg,#C8D4C4,#B0BBA8)" },
    { id: 4, name: "T-shirt Premium", price: "NTD$ 630", gradient: "linear-gradient(135deg,#D4C8C4,#BBA8A0)" },
  ], []);

  const bestSellers = useMemo(() => [
    { id: 5, name: "Hoodies", price: "NTD$ 890", gradient: "linear-gradient(135deg,#C8BEB4,#A89E94)" },
    { id: 6, name: "Hoodies", price: "NTD$ 890", gradient: "linear-gradient(135deg,#B4C8C4,#94A8A4)" },
    { id: 7, name: "Hoodies", price: "NTD$ 890", gradient: "linear-gradient(135deg,#C8C4B4,#A8A494)" },
    { id: 8, name: "Hoodies", price: "NTD$ 890", gradient: "linear-gradient(135deg,#BEC8C4,#9EA8A4)" },
  ], []);

  const allProducts = useMemo(() => [
    { id: 9, name: "經典舒適純棉素T (多色可選)", price: "NTD$ 590", category: "clothing", gradient: "linear-gradient(135deg,#D4C8C0,#B8ACA4)" },
    { id: 10, name: "Sony 降噪藍牙耳機 WH-1000XM5", price: "NTD$ 11900", category: "3c", gradient: "linear-gradient(135deg,#C0C8D4,#A4ACB8)" },
    { id: 11, name: "Samsung SSD 1TB T7 隨身硬碟", price: "NTD$ 3299", category: "3c", gradient: "linear-gradient(135deg,#C8D4C0,#ACB8A4)" },
    { id: 12, name: "質感無印風 雙層真空保溫瓶 500ml", price: "NTD$ 850", category: "lifestyle", gradient: "linear-gradient(135deg,#D4C0C0,#B8A4A4)" },
    { id: 13, name: "Fujifilm 富士 拍立得底片 (雙入裝)", price: "NTD$ 450", category: "lifestyle", gradient: "linear-gradient(135deg,#D8D4CC,#C4BDB4)" },
    { id: 14, name: "Apple AirTag Pro (保護殼套組)", price: "NTD$ 990", category: "3c", gradient: "linear-gradient(135deg,#C4C8D4,#A8AEBB)" },
    { id: 15, name: "高顏值木質調 藍牙音響", price: "NTD$ 1580", category: "3c", gradient: "linear-gradient(135deg,#C8BEB4,#A89E94)" },
    { id: 16, name: "戶外露營輕量折疊椅", price: "NTD$ 1200", category: "lifestyle", gradient: "linear-gradient(135deg,#B4C8C4,#94A8A4)" },
  ], []);

  const getPriceNum = (priceStr) => parseFloat(priceStr.replace(/[^0-9.]/g, ''));

  const displayAllProducts = useMemo(() => {
    let result = [...allProducts];

    if (activeCategory !== "all") {
      result = result.filter(p => p.category === activeCategory);
    }
    if (search.trim()) {
      result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (sortType === 'asc') {
      result.sort((a, b) => getPriceNum(a.price) - getPriceNum(b.price));
    } else if (sortType === 'desc') {
      result.sort((a, b) => getPriceNum(b.price) - getPriceNum(a.price));
    }

    return result;
  }, [search, sortType, activeCategory, allProducts]);

  const toggleSort = () => setSortType(prev => prev === 'default' ? 'asc' : prev === 'asc' ? 'desc' : 'default');
  const sortLabel = sortType === 'default' ? '價格排序' : sortType === 'asc' ? '價格由低到高 ↑' : '價格由高到低 ↓';

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18] font-sans pb-24 relative animate-in fade-in duration-500">

      {/* 過濾器區塊 */}
      <div className="border-b border-[#E2DDD4] bg-white sticky top-[73px] z-30 shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex flex-wrap items-center gap-6">
          
          <div className="relative" ref={categoryMenuRef}>
            <button 
              onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
              className={`text-sm font-bold flex items-center gap-2 transition-colors ${activeCategory !== 'all' || isCategoryMenuOpen ? 'text-[#C8522A]' : 'text-[#1A1A18] hover:text-[#C8522A]'}`}
            >
              <FilterIcon /> 
              {activeCategory === 'all' ? '產品分類' : categories.find(c => c.id === activeCategory)?.label}
              <ChevronDown className={`h-4 w-4 transition-transform ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCategoryMenuOpen && (
              <div className="absolute top-full left-0 mt-3 w-40 bg-white border border-[#E2DDD4] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCategory(c.id);
                      setIsCategoryMenuOpen(false);
                    }}
                    className={`w-full text-left px-5 py-2.5 text-sm transition-colors hover:bg-[#F5F0E8] ${activeCategory === c.id ? 'text-[#C8522A] font-bold bg-[#FDF0ED]' : 'text-[#1A1A18]'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={toggleSort} className="text-sm font-bold text-[#1A1A18] flex items-center gap-1.5 ml-4 hover:text-[#C8522A] transition-colors">
            {sortLabel} <ChevronDown className={`h-4 w-4 transition-transform ${sortType === 'desc' ? 'rotate-180' : ''}`} />
          </button>
          
          <div className="ml-auto flex items-center gap-3 bg-[#F5F0E8] border border-[#E2DDD4] rounded-full px-5 py-2.5 w-full max-w-xs focus-within:bg-white focus-within:border-[#1A1A18] transition-all">
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#8C8880]" 
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

      <div className="mx-auto max-w-6xl px-6 mt-4">
        
        {!isFiltering && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            {/* 本期主打區塊 */}
            <div className="py-12 md:py-20 flex flex-col md:flex-row items-center gap-12 md:gap-20">
              <div className="flex-1">
                <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-wide leading-tight mb-8 text-[#1A1A18]">
                  本期主打<br/>商品
                </h1>
                <button onClick={() => onNavigate?.('product_detail')} className="inline-flex items-center justify-center rounded-full bg-[#1A1A18] px-8 py-3.5 text-sm font-bold tracking-widest text-[#F5F0E8] transition-transform hover:-translate-y-1 hover:bg-[#C8522A] active:translate-y-0 shadow-lg">
                  商品介紹
                </button>
              </div>
              <div className="w-full md:w-[450px] aspect-[4/3] bg-gradient-to-br from-[#D8D4CC] to-[#C4BDB4] rounded-3xl flex items-center justify-center cursor-pointer hover:shadow-xl transition-shadow" onClick={() => onNavigate?.('product_detail')}>
                <svg className="h-20 w-20 text-[#1A1A18]/10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" />
                </svg>
              </div>
            </div>

            {/* 🟢 KOC 廣告推廣 Banner (根據身分切換介面) */}
            <div className="pb-12 pt-4">
              <div 
                className="bg-[#1A1A18] rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between shadow-2xl relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all" 
                onClick={handleKocClick}
              >
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#C8522A] rounded-full blur-3xl opacity-30 group-hover:scale-110 transition-transform duration-1000"></div>

                <div className="relative z-10 text-[#F5F0E8] max-w-lg mb-8 md:mb-0 pointer-events-none">
                  <div className="text-[#C8522A] font-mono text-sm tracking-widest mb-4">KOC PARTNER PROGRAM</div>
                  
                  {userRole === 'koc' ? (
                    <>
                      <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 leading-tight">
                        歡迎回來！<br/>前往專屬任務大廳
                      </h2>
                      <p className="text-gray-400 text-sm leading-relaxed mb-8">
                        查看最新的代言商品、追蹤您的專屬優惠碼成效，並管理您的收益。馬上挑選下一個想要合作的超值商品吧！
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 leading-tight">
                        成為專屬 KOC<br/>將影響力變現！
                      </h2>
                      <p className="text-gray-400 text-sm leading-relaxed mb-8">
                        喜歡我們的商品嗎？加入 KOC 行銷接案計畫，領取專屬優惠碼。只要有人使用您的優惠碼下單，每一筆都能為您帶來豐厚分潤。零成本、高彈性，即刻開啟斜槓收入！
                      </p>
                    </>
                  )}

                  <button 
                    onClick={handleKocClick}
                    className="bg-[#C8522A] text-white px-8 py-3.5 rounded-full font-bold tracking-wide hover:bg-[#A64220] transition-all shadow-lg pointer-events-auto"
                  >
                    {userRole === 'koc' ? '進入任務大廳' : '了解 KOC 計畫'}
                  </button>
                </div>

                <div className="relative z-10 w-full md:w-[35%] aspect-video bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md pointer-events-none">
                  <svg className="h-16 w-16 text-white/20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* 推薦商品 */}
            <div className="pb-12 pt-4 border-t border-[#E2DDD4]">
              <h2 className="font-serif text-[28px] font-bold mb-8 relative inline-block">
                推薦商品
                <span className="absolute left-0 top-full mt-1 h-0.5 w-8 rounded bg-[#C8522A]" />
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
                {products.map((p) => (
                  <ProductCard key={p.id} name={p.name} price={p.price} gradient={p.gradient} onAdd={handleAdd} onClick={() => onNavigate?.('product_detail')} />
                ))}
              </div>
            </div>

            {/* 本期最熱賣 */}
            <div className="py-12 border-t border-[#E2DDD4]">
              <h2 className="font-serif text-[28px] font-bold mb-8 relative inline-block">
                本期最熱賣
                <span className="absolute left-0 top-full mt-1 h-0.5 w-8 rounded bg-[#B89B6A]" />
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
                {bestSellers.map((p) => (
                  <ProductCard key={p.id} name={p.name} price={p.price} gradient={p.gradient} onAdd={handleAdd} onClick={() => onNavigate?.('product_detail')} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 所有商品區塊 */}
        <div className={`py-12 ${!isFiltering ? 'border-t border-[#E2DDD4]' : 'pt-8 animate-in fade-in duration-500'}`}>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h2 className="font-serif text-[28px] font-bold relative inline-block">
              {isFiltering ? '搜尋與篩選結果' : '所有商品'}
              <span className="absolute left-0 top-full mt-1 h-0.5 w-8 rounded bg-[#C8522A]" />
            </h2>
            
            {isFiltering && (
              <button 
                onClick={clearFilters} 
                className="text-sm font-bold text-[#8C8880] hover:text-[#C8522A] transition-colors underline underline-offset-4"
              >
                清除篩選，返回首頁
              </button>
            )}
          </div>
          
          {displayAllProducts.length === 0 ? (
            <div className="py-20 text-center text-[#8C8880]">
              <p className="text-lg font-bold mb-2">找不到相關商品</p>
              <p className="text-sm">請嘗試更換分類或搜尋關鍵字</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
              {displayAllProducts.map((p) => (
                <ProductCard key={p.id} name={p.name} price={p.price} gradient={p.gradient} onAdd={handleAdd} onClick={() => onNavigate?.('product_detail')} />
              ))}
            </div>
          )}
          
          {(!isFiltering && displayAllProducts.length > 0) && (
            <div className="mt-16 flex justify-center">
              <button className="border-2 border-[#E2DDD4] text-[#1A1A18] font-bold px-10 py-3.5 rounded-full hover:border-[#1A1A18] hover:bg-[#1A1A18] hover:text-[#F5F0E8] transition-all text-sm tracking-widest">
                載入更多 100+
              </button>
            </div>
          )}
        </div>

      </div>

      {/* 彈出提示 (Toast) */}
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