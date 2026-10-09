import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, Package, CalendarDays, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { formatApiError } from '../errorMessage';
import { ProductCard, formatNTD } from './ShopPage';
import { addProductToCart } from './cartApi';

const SORT_OPTIONS = [
  { value: 'latest', label: '最新上架' },
  { value: 'price_asc', label: '價格：低到高' },
  { value: 'price_desc', label: '價格：高到低' },
];

const priceOf = (p) => Number(p.discounted_price || p.price) || 0;

// 載入中的商品卡片佔位
function ProductSkeleton() {
  return (
    <div className="flex flex-col gap-2 md:gap-3 animate-pulse">
      <div className="aspect-square w-full rounded-xl md:rounded-2xl bg-[#E2DDD4]/60" />
      <div className="h-3.5 w-4/5 rounded-full bg-[#E2DDD4]/60" />
      <div className="h-3.5 w-1/3 rounded-full bg-[#E2DDD4]/60" />
    </div>
  );
}

// 廠商商店頁：從商品頁點廠商名稱進來，列出該廠商在商城上架中的所有商品
export default function VendorStorePage({ userRole, onAddToCart }) {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/consumer/vendor/store?Vendor_id=${encodeURIComponent(vendorId)}`
        );
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.success) {
          setError(formatApiError(data?.err) || '找不到這個廠商');
          return;
        }
        setVendor(data.vendor);
        setProducts(data.products || []);
      } catch {
        if (!cancelled) setError('網路連線異常，請稍後再試');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  // 店內搜尋與排序（後端已依最新上架排序）
  const visibleProducts = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const filtered = kw
      ? products.filter((p) => (p.Product_name || '').toLowerCase().includes(kw))
      : products;
    if (sortBy === 'price_asc') return [...filtered].sort((a, b) => priceOf(a) - priceOf(b));
    if (sortBy === 'price_desc') return [...filtered].sort((a, b) => priceOf(b) - priceOf(a));
    return filtered;
  }, [products, keyword, sortBy]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleAdd = async (productId) => {
    if (userRole === 'guest') {
      showToast('需先登入或註冊才能加入購物車喔！');
      return;
    }
    try {
      if (await addProductToCart(productId)) {
        showToast('✓ 已成功加入購物車！');
        onAddToCart?.();
      } else {
        showToast('加入購物車失敗，請再試一次');
      }
    } catch {
      showToast('網路錯誤，請稍後再試');
    }
  };

  const openProduct = (product) => {
    localStorage.setItem('lastProductId', product.Product_id);
    navigate(`/product/${product.Product_id}`, { state: { product } });
  };

  const joinedYear = vendor?.joined_at ? new Date(vendor.joined_at).getFullYear() : null;
  const initial = vendor?.Vendor_name?.trim()?.charAt(0) || '店';

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18] font-sans pb-24 animate-in fade-in duration-500">
      <div className="mx-auto max-w-6xl px-4 md:px-6 pt-5 md:pt-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 md:mb-6 flex items-center gap-1.5 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-xs md:text-sm group w-fit"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          返回
        </button>

        {error ? (
          <div className="py-24 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-white border border-[#E2DDD4] flex items-center justify-center text-[#8C8880]">
              <Package size={26} />
            </div>
            <p className="text-sm md:text-base font-bold text-[#1A1A18]">{error}</p>
            <button
              onClick={() => navigate('/shop')}
              className="bg-[#1A1A18] text-[#F5F0E8] px-6 py-3 rounded-full text-sm font-bold hover:bg-[#C8522A] transition-all shadow-md"
            >
              回到商城
            </button>
          </div>
        ) : (
          <>
            {/* 品牌主視覺 */}
            <div className="relative overflow-hidden rounded-2xl md:rounded-[2.5rem] bg-[#1A1A18] p-6 md:p-12 shadow-2xl mb-10 md:mb-14">
              <div className="absolute -right-10 -top-10 md:-right-20 md:-top-20 w-48 h-48 md:w-72 md:h-72 bg-[#C8522A] rounded-full blur-[60px] md:blur-[90px] opacity-30" />
              <div className="absolute -left-10 -bottom-12 md:-bottom-20 w-36 h-36 md:w-56 md:h-56 bg-[#B89B6A] rounded-full blur-[50px] md:blur-[70px] opacity-20" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-[#F5F0E8] text-[#1A1A18] flex items-center justify-center font-serif text-2xl md:text-4xl font-black shadow-lg ring-4 ring-white/10 shrink-0">
                  {loading ? '' : initial}
                </div>
                <div className="min-w-0 text-[#F5F0E8]">
                  <div className="text-[#C8522A] font-bold text-[10px] md:text-xs tracking-[0.2em] mb-2 md:mb-3 uppercase">Official Store</div>
                  {loading ? (
                    <div className="h-8 md:h-10 w-48 md:w-72 rounded-full bg-white/10 animate-pulse" />
                  ) : (
                    <h1 className="font-serif text-2xl md:text-4xl font-black leading-tight break-words">{vendor.Vendor_name}</h1>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] md:text-xs font-bold text-[#F5F0E8]/90">
                      <Package size={13} /> {loading ? '—' : products.length} 件上架商品
                    </span>
                    {joinedYear && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] md:text-xs font-bold text-[#F5F0E8]/90">
                        <CalendarDays size={13} /> {joinedYear} 年加入平台
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C8522A]/20 px-3 py-1 text-[11px] md:text-xs font-bold text-[#E8A27F]">
                      <Sparkles size={13} /> KOC 推廣中商品
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 商品區 */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
              <h2 className="font-serif text-xl md:text-3xl font-bold text-[#1A1A18] flex flex-col gap-2">
                全部商品
                <span className="h-1 w-8 md:w-10 rounded-full bg-[#C8522A]" />
              </h2>
              <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                <div className="flex-1 md:w-64 flex items-center gap-2 bg-white border border-[#E2DDD4] rounded-full px-4 py-2 md:py-2.5 focus-within:border-[#1A1A18] transition-all">
                  <Search size={15} className="text-[#8C8880] shrink-0" />
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜尋店內商品"
                    className="w-full bg-transparent text-xs md:text-sm outline-none placeholder:text-[#8C8880]"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-[#E2DDD4] rounded-full px-4 py-2 md:py-2.5 text-xs md:text-sm font-bold text-[#1A1A18] outline-none cursor-pointer focus:border-[#1A1A18]"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-6 md:gap-x-6 md:gap-y-10">
                {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-white border border-[#E2DDD4] flex items-center justify-center text-[#8C8880]">
                  <Package size={22} />
                </div>
                <p className="text-sm md:text-base font-bold text-[#1A1A18]">
                  {keyword.trim() ? '找不到符合的商品' : '這個廠商目前沒有上架中的商品'}
                </p>
                {keyword.trim() && (
                  <button onClick={() => setKeyword('')} className="text-xs md:text-sm font-bold text-[#C8522A] hover:underline">
                    清除搜尋
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-6 md:gap-x-6 md:gap-y-10">
                {visibleProducts.map((p) => (
                  <ProductCard
                    key={p.Product_id}
                    name={p.Product_name}
                    price={formatNTD(p.discounted_price || p.price)}
                    stock={p.stock}
                    imageUrl={p.image_url}
                    onAdd={() => handleAdd(p.Product_id)}
                    onClick={() => openProduct(p)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className={`fixed bottom-6 md:bottom-10 left-1/2 z-[999] -translate-x-1/2 rounded-xl md:rounded-full bg-[#1A1A18] px-5 md:px-6 py-3 text-xs md:text-sm font-bold tracking-wide text-white shadow-xl transition-all duration-300 ${toastMsg ? 'translate-y-0 opacity-100 scale-100' : 'pointer-events-none translate-y-10 opacity-0 scale-95'}`}>
        {toastMsg}
      </div>
    </div>
  );
}
