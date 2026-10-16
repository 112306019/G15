import { API_BASE_URL } from '../config';
import { addProductToCart } from './cartApi';
import React, { useMemo, useState, useRef, useEffect } from "react";
import KOCVideo from '../assets/KOC_ad.mp4';
import { getErrorMessage } from '../errorMessage';

// 主打區小標籤用：分類清單還沒載到或對不到時，退回這份中文對照（跟後端 PRODUCT_CATEGORY_CHOICES 一致）
const CATEGORY_LABEL_FALLBACK = {
  clothing: "服飾鞋包與配件",
  beauty: "美妝保健與母嬰",
  food: "飲食",
  household: "生活百貨",
  electronics: "3C 電子與家電",
  custom: "客製化",
  culture: "文創、娛樂與其他",
};

export function formatNTD(amount) {
  const value = Number(amount);
  return `NT$${Number.isFinite(value) ? Math.round(value).toLocaleString("zh-TW") : "0"}`;
}

// === Icons ===
function SearchIcon() {
  return (
    <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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

// 商品卡片
export function ProductCard({ name, price, stock, gradient = "linear-gradient(135deg,#D8D4CC,#C4BDB4)", imageUrl, onAdd, onClick, isBundle = false, bundleItems = [] }) {
  const isSoldOut = Number(stock) <= 0;
  // 組合商品：卡片上顯示「內含 A x2、B x1」
  const bundleSummary = isBundle
    ? bundleItems.map((item) => `${item.Product_name} x${item.quantity}`).join("、")
    : "";

  return (
    <div className="group flex flex-col gap-2 md:gap-3 cursor-pointer bg-white rounded-[1.25rem] md:rounded-[2rem] p-2 md:p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(80,71,133,0.10)]" onClick={onClick}>
      <div className="relative flex aspect-square w-full items-center justify-center rounded-2xl md:rounded-[1.5rem] overflow-hidden bg-brand-softer">
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
          <svg className="h-8 w-8 md:h-10 md:w-10 text-ink/10 relative z-10 transition-transform duration-700 group-hover:scale-105" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" />
          </svg>
        )}

        {isBundle && (
          <span className="absolute top-2 left-2 md:top-3 md:left-3 z-10 rounded-full bg-brand px-2 py-0.5 text-[10px] md:text-[11px] font-bold tracking-wider text-white shadow-sm">
            組合
          </span>
        )}

      </div>

      <div className="flex flex-1 flex-col px-1.5 pb-1 font-sans">
        <h3 className="font-sans text-[13px] md:text-base font-bold text-ink line-clamp-2 leading-snug transition-colors group-hover:text-brand min-h-[36px] md:min-h-[44px]">
          {name}
        </h3>
        {bundleSummary && (
          <div className="text-[10px] md:text-xs text-muted line-clamp-1" title={`內含：${bundleSummary}`}>
            內含：{bundleSummary}
          </div>
        )}
        <div className="mt-1 md:mt-1.5 font-mono text-sm md:text-base font-medium text-ink">
          {isSoldOut ? <span className="text-muted">已售罄</span> : price}
        </div>

        {/* 加入購物車：售罄時不給按 */}
        <button
          onClick={(e) => { e.stopPropagation(); if (!isSoldOut) onAdd(); }}
          disabled={isSoldOut}
          className="mt-2.5 md:mt-3 self-start inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 md:px-5 py-2 md:py-2.5 text-[11px] md:text-xs font-bold tracking-wider text-brand transition-colors hover:bg-brand hover:text-white disabled:bg-edge disabled:text-muted disabled:cursor-not-allowed"
        >
          <ShoppingBagIcon />
          {isSoldOut ? "已售罄" : "加入購物車"}
        </button>
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

// 區塊標題：小的英文標籤 + 襯線中文標題
function SectionHeading({ label, title }) {
  return (
    <div className="mb-6 md:mb-8">
      <p className="font-mono text-brand font-medium text-[10px] md:text-xs tracking-[0.25em] uppercase">{label}</p>
      <h2 className="mt-2 font-display text-[26px] md:text-[38px] font-bold text-ink">{title}</h2>
    </div>
  );
}

// KOC 專屬：個人熱銷爆款榜 + 智慧選品推薦（只有 userRole === "koc" 時顯示）
function KocInsightsSection({ products, categories, onNavigate }) {
  const [top, setTop] = useState(null);
  const [recs, setRecs] = useState(null);
  const [error, setError] = useState("");
  const [showAllTop, setShowAllTop] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setError("找不到登入資訊，請重新登入後再查看帶貨成效");
      return;
    }
    const load = async (path) => {
      const res = await fetch(`${API_BASE_URL}/api/koc/insights/${path}?user_id=${encodeURIComponent(userId)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.err || `載入失敗（HTTP ${res.status}）`);
      }
      return data;
    };
    load("topProducts")
      .then(setTop)
      .catch((err) => setError(getErrorMessage(err, '爆款榜載入失敗')));
    load("recommendations")
      .then(setRecs)
      .catch((err) => setError((prev) => prev || getErrorMessage(err, '選品推薦載入失敗')));
  }, []);

  const categoryLabel = (code) =>
    categories.find((c) => c.id === code)?.label || (code === "other" ? "其他" : code);

  // 跳到商品購買頁。優先用商城清單裡的商品物件；清單還沒載完或沒有這個商品時，
  // 用後端回傳的 item.product（key 跟 /consumer/products 一樣）。
  const goProduct = (item) => {
    const p = products.find((x) => String(x.Product_id) === String(item.product_id));
    const target = p || item.product;
    if (target) onNavigate?.("product_detail", target);
  };

  // 熱銷榜：跳到這個商品最新一筆優惠碼所屬任務的成效分析；
  // 沒有可看成效的任務（例如任務已取消）就退回商品頁。
  const goAnalytics = (item) => {
    if (item.latest_task) onNavigate?.("task_detail", item.latest_task);
    else goProduct(item);
  };

  if (error) {
    return (
      <div className="pb-12 md:pb-16 font-sans">
        <div className="rounded-2xl border border-brand/30 bg-brand-soft px-5 py-4 text-xs md:text-sm font-bold text-brand">
          {error}
        </div>
      </div>
    );
  }

  if (!top || !recs) {
    return (
      <div className="pb-12 md:pb-16 font-sans">
        <div className="h-40 rounded-2xl bg-edge/40 animate-pulse" />
      </div>
    );
  }

  const topList = showAllTop ? top.top_products : top.top_products.slice(0, 5);
  const best = top.best_category;

  return (
    <div className="pb-12 md:pb-16 font-sans grid gap-6 md:gap-8 md:grid-cols-5">
      {/* 個人熱銷爆款榜 */}
      <div className="md:col-span-2 rounded-[1.5rem] md:rounded-[2rem] bg-white p-5 md:p-7">
        <p className="font-mono text-brand font-medium text-[10px] md:text-xs tracking-[0.2em] mb-2 uppercase">Top Converting Products</p>
        <h2 className="font-display text-xl md:text-2xl font-bold text-ink mb-4">你的熱銷榜</h2>

        {best && (
          <div className="mb-5 rounded-2xl bg-brand-soft text-brand-dark px-4 py-3 text-xs md:text-sm leading-relaxed font-bold">
            你的粉絲對「<span className="text-brand">{categoryLabel(best.category)}</span>」的購買力最高
            <span className="text-muted font-medium">
              {best.metric === "conversion_rate"
                ? `（轉化率 ${best.conversion_rate}%，${best.click_count.toLocaleString()} 次點擊帶出 ${best.order_count} 單）`
                : `（平均 ${best.avg_orders_per_mission} 單/任務）`}
            </span>！
          </div>
        )}

        {top.top_products.length === 0 ? (
          <p className="text-xs md:text-sm text-muted leading-relaxed">
            還沒有優惠碼成交紀錄。完成第一檔任務、粉絲用你的優惠碼下單後，這裡就會出現你的爆款榜。
          </p>
        ) : (
          <>
            <ol className="flex flex-col divide-y divide-edge/70">
              {topList.map((p) => (
                <li
                  key={p.product_id}
                  onClick={() => goAnalytics(p)}
                  title={p.latest_task ? "查看最新一筆優惠碼的成效分析" : "查看商品"}
                  className="flex items-center gap-3 py-3 cursor-pointer group"
                >
                  <span className={`w-6 shrink-0 text-center font-display text-lg font-black ${p.rank <= 3 ? "text-brand" : "text-muted"}`}>
                    {p.rank}
                  </span>
                  <div className="h-11 w-11 shrink-0 rounded-lg overflow-hidden bg-edge/50">
                    {p.image_url && <img src={p.image_url} alt={p.product_name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-bold text-ink line-clamp-1 group-hover:text-brand transition-colors">{p.product_name}</p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {categoryLabel(p.category)} · {p.order_count} 單 · {p.units_sold} 件
                      {p.conversion_rate !== null && ` · 轉化率 ${p.conversion_rate}%`}
                    </p>
                    {p.latest_task && (
                      <p className="text-[10px] font-bold text-gold mt-0.5 group-hover:text-brand transition-colors">
                        查看成效分析 →
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-xs md:text-sm font-semibold text-gold">{formatNTD(p.commission)}</p>
                    <p className="text-[10px] text-muted">分潤</p>
                  </div>
                </li>
              ))}
            </ol>
            {top.top_products.length > 5 && (
              <button
                onClick={() => setShowAllTop((v) => !v)}
                className="mt-3 text-xs font-bold text-muted hover:text-ink underline underline-offset-4"
              >
                {showAllTop ? "收合" : `查看全部 ${top.top_products.length} 名`}
              </button>
            )}
          </>
        )}
      </div>

      {/* 智慧選品推薦 */}
      <div className="md:col-span-3 rounded-[1.5rem] md:rounded-[2rem] bg-white p-5 md:p-7">
        <p className="font-mono text-gold font-medium text-[10px] md:text-xs tracking-[0.2em] mb-2 uppercase">Smart Picks For You</p>
        <h2 className="font-display text-xl md:text-2xl font-bold text-ink mb-1">智慧選品推薦</h2>
        <p className="text-[11px] md:text-xs text-muted mb-5">
          {recs.source === "similar"
            ? `根據 ${recs.similar_koc_count} 位跟你粉絲群相似的 KOC，近 ${recs.recent_days} 天的實際分潤`
            : `你的帶貨紀錄還不夠比對相似 KOC，先依全平台近 ${recs.recent_days} 天的實際分潤推薦`}
        </p>

        {recs.recommendations.length === 0 ? (
          <p className="text-xs md:text-sm text-muted leading-relaxed">目前沒有符合條件的進行中活動，之後再回來看看吧！</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {recs.recommendations.map((r) => (
              <div key={r.product_id} className="flex gap-3 rounded-2xl border border-edge p-3 hover:border-brand transition-colors">
                <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-edge/50">
                  {r.image_url && <img src={r.image_url} alt={r.product_name} className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1 flex flex-col">
                  <p className="text-xs md:text-sm font-bold text-ink line-clamp-1">{r.product_name}</p>
                  <p className="text-[11px] text-muted leading-snug mt-1 line-clamp-3">
                    {recs.source === "similar"
                      ? `${r.koc_count} 位相似粉絲群的 KOC 近期推這款，平均賺了 `
                      : `${r.koc_count} 位 KOC 近期推這款，平均賺了 `}
                    <span className="font-bold text-gold">{formatNTD(r.avg_earning)}</span>
                    ，要申請試試看嗎？
                  </p>
                  <button
                    onClick={() => goProduct(r)}
                    className="mt-auto pt-2 self-start text-[11px] md:text-xs font-bold text-ink hover:text-brand transition-colors"
                  >
                    前往購買，購買後即可申請代言 →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShopPage({ onNavigate, userRole = "guest", onAddToCart }) {
  const [toastMsg, setToastMsg] = useState("");
  const [search, setSearch] = useState("");
  const [sortType, setSortType] = useState("default");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([{ id: "all", label: "所有分類" }]);
  const heroCategoryLabel = (code) =>
    categories.find((c) => c.id === code)?.label || CATEGORY_LABEL_FALLBACK[code] || "其他";

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/consumer/product/categories`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setCategories([
            { id: "all", label: "所有分類" },
            ...data.map((c) => ({ id: c.code, label: c.label })),
          ]);
        }
      } catch (err) {
        console.error("商品分類載入失敗", err);
      }
    };
    fetchCategories();
  }, []);

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

    try {
      if (await addProductToCart(productId)) {
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
    <div className="min-h-screen bg-cream text-ink font-sans relative overflow-x-clip animate-in fade-in duration-500">

      {/* 過濾導覽列 */}
      <div className="sticky top-[72px] md:top-[80px] z-30 bg-cream/95 backdrop-blur-md">
        {/* [RWD 優化] 手機版縮小內距 p-3 */}
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-3 md:py-4 flex flex-wrap items-center justify-between gap-3 md:gap-6 font-sans">

          <div className="flex items-center gap-3">
            <div className="relative" ref={categoryMenuRef}>
              <button
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                className={`text-xs md:text-sm font-bold flex items-center gap-1.5 md:gap-2 transition-colors px-3 py-1.5 md:px-4 md:py-2 rounded-full border ${activeCategory !== "all" || isCategoryMenuOpen ? "bg-brand text-white border-brand" : "bg-white text-ink hover:bg-brand-soft border-transparent"}`}
              >
                <FilterIcon />
                {activeCategory === "all" ? "分類" : categories.find((c) => c.id === activeCategory)?.label}
                <ChevronDown className={`h-3 w-3 md:h-4 md:w-4 transition-transform ${isCategoryMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {isCategoryMenuOpen && (
                <div className="absolute top-full left-0 mt-2 md:mt-3 w-36 md:w-40 bg-white border border-edge rounded-xl md:rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setActiveCategory(c.id); setIsCategoryMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 md:px-5 text-xs md:text-sm font-bold transition-colors hover:bg-cream ${activeCategory === c.id ? "text-brand bg-brand-soft" : "text-ink"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={toggleSort} className="text-xs md:text-sm font-bold text-ink flex items-center gap-1 md:gap-1.5 bg-white rounded-full px-3 py-1.5 md:px-4 md:py-2 hover:text-brand transition-colors">
              <span className="hidden sm:inline">{sortLabel}</span>
              <span className="sm:hidden">{sortType === "default" ? "排序" : sortType === "asc" ? "價格 ↑" : "價格 ↓"}</span> 
              <ChevronDown className={`h-3 w-3 md:h-4 md:w-4 transition-transform ${sortType === "desc" ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* 搜尋框 - [RWD 優化] 手機版自動佔滿整列 (w-full order-last) */}
          <div className="w-full md:w-auto md:ml-auto order-last md:order-none flex items-center gap-2 md:gap-3 bg-white border-2 border-transparent rounded-full px-4 py-2 md:px-5 md:py-2.5 focus-within:border-brand transition-all">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-[13px] md:text-sm font-medium outline-none placeholder:text-muted"
              placeholder="搜尋商品名稱..."
            />
            {search.trim() ? (
              <button onClick={() => setSearch("")} className="text-ink hover:text-brand transition-colors p-1 rounded-full">
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
          <div className="py-24 flex flex-col items-center justify-center text-muted animate-pulse font-sans">
            <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold tracking-widest text-xs md:text-sm uppercase">Loading</p>
          </div>
        )}

        {!loading && !isFiltering && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">

            {/* 本期主打 */}
            <section className="py-8 md:py-12 flex flex-col md:flex-row md:items-center gap-8 md:gap-10 lg:gap-12">
              <div className="md:flex-1 min-w-0 text-center md:text-left">
                <p className="font-mono text-brand font-medium text-[10px] md:text-xs tracking-[0.25em] mb-3 md:mb-5 uppercase">Featured Item</p>
                <h1 className="font-display text-[40px] md:text-6xl font-bold leading-[1.2] text-brand-dark">
                  本期主打<br />商品精選
                </h1>
                {products[0] && (
                  <p className="mt-4 md:mt-5 font-wordmark italic text-lg md:text-[22px] text-gold-bright">
                    Latest pick — <span className="font-display not-italic font-semibold text-base md:text-xl">{products[0].Product_name}</span>
                  </p>
                )}
                {products[0] && (
                  <div className="mt-5 md:mt-6 mx-auto md:mx-0 max-w-md rounded-2xl border border-edge bg-white px-5 py-4 text-left">
                    {products[0].Vendor_name && (
                      <p className="font-mono text-[10px] md:text-[11px] tracking-[0.18em] uppercase text-muted">{products[0].Vendor_name}</p>
                    )}
                    {products[0].description && (
                      <p className="mt-1.5 text-sm leading-relaxed text-ink/80 line-clamp-2">{products[0].description}</p>
                    )}
                    <div className="mt-3 flex items-baseline gap-2.5">
                      <span className="font-display text-2xl md:text-[28px] font-bold text-brand-dark">{formatNTD(products[0].discounted_price || products[0].price)}</span>
                      {products[0].discounted_price && Number(products[0].discounted_price) < Number(products[0].price) && (
                        <span className="text-sm text-muted line-through">{formatNTD(products[0].price)}</span>
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-6 md:mt-7 flex flex-col sm:flex-row items-center md:items-center justify-center md:justify-start gap-2 sm:gap-3">
                  <button
                    onClick={() => products[0] && onNavigate?.("product_detail", products[0])}
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-brand px-8 py-3.5 md:py-4 text-sm font-bold tracking-wider text-white transition-colors hover:bg-brand-dark"
                  >
                    探索細節 →
                  </button>
                  <button
                    onClick={() => document.getElementById("all-products")?.scrollIntoView({ behavior: "smooth" })}
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-full px-6 py-3.5 md:py-4 text-sm font-bold text-brand hover:text-brand-dark transition-colors"
                  >
                    看所有商品
                  </button>
                </div>
              </div>

              <div className="relative w-full md:w-[440px] lg:w-[520px] shrink-0">
                <div
                  className="aspect-[5/4] rounded-[2rem] md:rounded-[2.5rem_8rem_2.5rem_2.5rem] bg-brand-soft overflow-hidden flex items-center justify-center cursor-pointer group"
                  onClick={() => products[0] && onNavigate?.("product_detail", products[0])}
                >
                  {products[0]?.image_url ? (
                    <img src={products[0].image_url} alt={products[0].Product_name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <svg className="h-16 w-16 md:h-20 md:w-20 text-brand/20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" />
                    </svg>
                  )}
                </div>
                {products[0]?.category && (
                  <div className="absolute left-3 md:-left-6 bottom-4 md:bottom-7 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_14px_34px_rgba(63,56,112,0.12)] max-w-[75%]">
                    <span className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink font-bold" aria-hidden="true">✦</span>
                    <span className="min-w-0">
                      <span className="block text-[11px] md:text-xs text-muted">商品分類</span>
                      <span className="block text-sm md:text-[15px] font-bold text-ink truncate">{heroCategoryLabel(products[0].category)}</span>
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* KOC 廣告欄：白卡 + 淡紫框 */}
            <section className="pt-4 md:pt-10 font-sans">
              <div
                onClick={handleKocClick}
                className="group relative overflow-hidden cursor-pointer bg-white border-2 border-brand-pale rounded-[2rem] md:rounded-[2.5rem_7.5rem_2.5rem_2.5rem] p-6 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-10 transition-shadow duration-300 hover:shadow-[0_20px_50px_rgba(80,71,133,0.10)]"
              >
                <div className="relative md:flex-1 min-w-0 text-center md:text-left">
                  <div className="font-mono text-brand font-medium text-[10px] md:text-xs tracking-[0.25em] mb-3 md:mb-4 uppercase">KOC Partner Program</div>
                  {userRole === "koc" ? (
                    <>
                      <h2 className="font-display text-[28px] md:text-[38px] font-bold leading-snug text-brand-dark mb-3 md:mb-4">歡迎回來！<br />前往專屬接案大廳</h2>
                      <p className="text-brand-dark/75 text-sm md:text-[15px] leading-relaxed mb-6 md:mb-7 max-w-md mx-auto md:mx-0">查看最新的代言商品、追蹤您的專屬優惠碼成效，並管理您的收益。</p>
                    </>
                  ) : (
                    <>
                      <h2 className="font-display text-[28px] md:text-[38px] font-bold leading-snug text-brand-dark mb-3 md:mb-4">成為專屬 KOC<br />將影響力變現！</h2>
                      <p className="text-brand-dark/75 text-sm md:text-[15px] leading-relaxed mb-6 md:mb-7 max-w-md mx-auto md:mx-0">加入 KOC 行銷接案計畫，領取專屬優惠碼。每一筆使用您優惠碼的訂單都能帶來分潤。</p>
                    </>
                  )}
                  <button onClick={handleKocClick} className="w-full md:w-auto rounded-full bg-brand px-7 md:px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark">
                    {userRole === "koc" ? "進入接案大廳 →" : "了解 KOC 計畫 →"}
                  </button>
                </div>

                <div className="relative w-full md:w-[44%] max-w-[440px] rounded-[1.5rem] md:rounded-[1.9rem] bg-white p-2 md:p-2.5 shadow-[0_18px_40px_rgba(63,56,112,0.14)]">
                  <video src={KOCVideo} autoPlay loop muted playsInline className="block w-full aspect-video object-cover rounded-[1.1rem] md:rounded-[1.4rem] pointer-events-none" />
                  <span className="absolute -right-2 md:-right-4 -top-3 md:-top-4 rotate-3 rounded-full bg-gold-soft px-3 md:px-3.5 py-1.5 md:py-2 text-[11px] md:text-[13px] font-bold text-gold-ink shadow-[0_8px_20px_rgba(122,90,30,0.16)]">
                    ✦ 每筆訂單都有分潤
                  </span>
                </div>
              </div>
            </section>

            {/* KOC 專屬：熱銷爆款榜 + 智慧選品推薦 */}
            {userRole === "koc" && (
              <div className="pt-10 md:pt-14">
                <KocInsightsSection products={products} categories={categories} onNavigate={onNavigate} />
              </div>
            )}

            <div className="h-[3px] rounded-full bg-brand my-12 md:my-16" aria-hidden="true" />

            {/* 推薦商品 */}
            {featured.length > 0 && (
              <section className="pb-10 md:pb-14">
                <SectionHeading label="Recommended" title="推薦商品" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                  {featured.map((p) => (
                    <ProductCard
                      key={p.product_id}
                      name={p.Product_name}
                      price={formatNTD(p.discounted_price || p.price)}
                      stock={p.stock}
                      isBundle={Boolean(p.is_bundle)}
                      bundleItems={p.bundle_items || []}
                      gradient={p.gradient}
                      imageUrl={p.image_url}
                      onAdd={() => handleAdd(p.Product_id)}
                      onClick={() => onNavigate?.("product_detail", p)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 本期最熱賣 */}
            {bestSellers.length > 0 && (
              <section className="pb-10 md:pb-14">
                <SectionHeading label="Best Sellers" title="本期最熱賣" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                  {bestSellers.map((p) => (
                    <ProductCard
                      key={p.product_id}
                      name={p.Product_name}
                      price={formatNTD(p.discounted_price || p.price)}
                      stock={p.stock}
                      isBundle={Boolean(p.is_bundle)}
                      bundleItems={p.bundle_items || []}
                      gradient={p.gradient}
                      imageUrl={p.image_url}
                      onAdd={() => handleAdd(p.Product_id)}
                      onClick={() => onNavigate?.("product_detail", p)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* 所有商品 / 搜尋結果 */}
        {!loading && (
          <section id="all-products" className={`scroll-mt-40 pb-6 md:pb-10 ${isFiltering ? "pt-8 animate-in fade-in duration-500" : ""}`}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 md:gap-4">
              <SectionHeading label={isFiltering ? "Search Results" : "All Products"} title={isFiltering ? "搜尋與篩選結果" : "所有商品"} />
              {isFiltering && (
                <button onClick={clearFilters} className="font-sans text-[13px] md:text-sm font-bold text-muted hover:text-brand transition-colors underline underline-offset-4 mb-6 md:mb-8 self-start sm:self-auto">
                  清除篩選，返回首頁
                </button>
              )}
            </div>

            {displayProducts.length === 0 ? (
              <div className="py-16 md:py-24 flex flex-col items-center text-center font-sans">
                <p className="text-base md:text-lg font-bold text-ink mb-1.5 md:mb-2">找不到相關商品</p>
                <p className="text-xs md:text-sm text-muted">請嘗試更換分類或搜尋關鍵字</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                {displayProducts.map((p) => (
                  <ProductCard
                    key={p.product_id}
                    name={p.Product_name}
                    price={formatNTD(p.discounted_price || p.price)}
                    stock={p.stock}
                    isBundle={Boolean(p.is_bundle)}
                    bundleItems={p.bundle_items || []}
                    gradient={p.gradient}
                    imageUrl={p.image_url}
                    onAdd={() => handleAdd(p.Product_id)}
                    onClick={() => onNavigate?.("product_detail", p)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

      </div>

      {/* Toast */}
      <div className={`fixed bottom-6 md:bottom-10 left-1/2 z-[999] flex w-[92%] sm:w-max max-w-md -translate-x-1/2 items-center justify-between md:justify-center gap-3 md:gap-4 rounded-xl md:rounded-full bg-ink pl-4 md:pl-6 pr-2 py-2 text-[11px] md:text-sm font-bold tracking-wide text-white shadow-xl transition-all duration-300 font-sans ${toastMsg ? "translate-y-0 opacity-100 scale-100" : "pointer-events-none translate-y-10 opacity-0 scale-95"}`}>
        <span className="line-clamp-2 leading-relaxed">{toastMsg}</span>
        {userRole === "guest" && toastMsg.includes("登入") && (
          <button onClick={() => onNavigate?.("login")} className="flex-shrink-0 whitespace-nowrap rounded-lg md:rounded-full bg-brand px-3.5 md:px-5 py-2 md:py-2.5 text-[11px] md:text-xs transition-colors hover:bg-brand-dark">
            前往登入
          </button>
        )}
      </div>
    </div>
  );
}