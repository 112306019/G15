import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, Package, CalendarDays, Sparkles, MessageCircle } from 'lucide-react';
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
      <div className="aspect-square w-full rounded-xl md:rounded-2xl bg-edge/60" />
      <div className="h-3.5 w-4/5 rounded-full bg-edge/60" />
      <div className="h-3.5 w-1/3 rounded-full bg-edge/60" />
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

  const contactVendor = () => {
    if (userRole === 'guest') {
      showToast('需先登入或註冊才能傳訊息給廠商喔！');
      return;
    }
    navigate(`/inquiry/${vendorId}`);
  };

  const openProduct = (product) => {
    localStorage.setItem('lastProductId', product.Product_id);
    navigate(`/product/${product.Product_id}`, { state: { product } });
  };

  const joinedYear = vendor?.joined_at ? new Date(vendor.joined_at).getFullYear() : null;
  const initial = vendor?.Vendor_name?.trim()?.charAt(0) || '店';

  return (
    <div className="min-h-screen bg-cream text-ink font-sans pb-24 animate-in fade-in duration-500">
      <div className="mx-auto max-w-6xl px-4 md:px-6 pt-5 md:pt-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 md:mb-6 flex items-center gap-1.5 text-muted hover:text-brand transition-colors font-bold text-xs md:text-sm group w-fit"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          返回
        </button>

        {error ? (
          <div className="py-24 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-white border border-edge flex items-center justify-center text-muted">
              <Package size={26} />
            </div>
            <p className="text-sm md:text-base font-bold text-ink">{error}</p>
            <button
              onClick={() => navigate('/shop')}
              className="bg-brand text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-brand-dark transition-all shadow-md"
            >
              回到商城
            </button>
          </div>
        ) : (
          <>
            {/* 品牌主視覺 */}
            <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem_7.5rem_2.5rem_2.5rem] bg-brand-soft p-6 md:p-12 mb-10 md:mb-14">

              <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
                <button
                  type="button"
                  onClick={contactVendor}
                  disabled={loading}
                  className="order-last md:order-none md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2 inline-flex items-center justify-center gap-2 rounded-full bg-brand text-white px-5 py-2.5 md:py-3 text-xs md:text-sm font-bold hover:bg-brand hover:text-white transition-colors shadow-md disabled:opacity-50 w-full md:w-auto"
                >
                  <MessageCircle size={16} /> 傳訊息給廠商
                </button>
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-white text-brand flex items-center justify-center font-display text-2xl md:text-4xl font-bold ring-4 ring-white/60 shrink-0">
                  {loading ? '' : initial}
                </div>
                <div className="min-w-0 text-brand-dark">
                  <div className="font-mono text-brand font-medium text-[10px] md:text-xs tracking-[0.25em] mb-2 md:mb-3 uppercase">Official Store</div>
                  {loading ? (
                    <div className="h-8 md:h-10 w-48 md:w-72 rounded-full bg-white/60 animate-pulse" />
                  ) : (
                    <h1 className="font-display text-2xl md:text-4xl font-bold leading-tight break-words">{vendor.Vendor_name}</h1>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] md:text-xs font-bold text-brand-dark/80">
                      <Package size={13} /> {loading ? '—' : products.length} 件上架商品
                    </span>
                    {joinedYear && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] md:text-xs font-bold text-brand-dark/80">
                        <CalendarDays size={13} /> {joinedYear} 年加入平台
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-[11px] md:text-xs font-bold text-gold-ink">
                      <Sparkles size={13} /> KOC 推廣中商品
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 商品區 */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
              <h2 className="font-display text-[26px] md:text-[34px] font-bold text-ink">全部商品</h2>
              <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                <div className="flex-1 md:w-64 flex items-center gap-2 bg-white border border-edge rounded-full px-4 py-2 md:py-2.5 focus-within:border-brand transition-all">
                  <Search size={15} className="text-muted shrink-0" />
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜尋店內商品"
                    className="w-full bg-transparent text-xs md:text-sm outline-none placeholder:text-muted"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-edge rounded-full px-4 py-2 md:py-2.5 text-xs md:text-sm font-bold text-ink outline-none cursor-pointer focus:border-ink"
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
                <div className="w-14 h-14 rounded-full bg-white border border-edge flex items-center justify-center text-muted">
                  <Package size={22} />
                </div>
                <p className="text-sm md:text-base font-bold text-ink">
                  {keyword.trim() ? '找不到符合的商品' : '這個廠商目前沒有上架中的商品'}
                </p>
                {keyword.trim() && (
                  <button onClick={() => setKeyword('')} className="text-xs md:text-sm font-bold text-brand hover:underline">
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

      <div className={`fixed bottom-6 md:bottom-10 left-1/2 z-[999] -translate-x-1/2 rounded-xl md:rounded-full bg-ink px-5 md:px-6 py-3 text-xs md:text-sm font-bold tracking-wide text-white shadow-xl transition-all duration-300 ${toastMsg ? 'translate-y-0 opacity-100 scale-100' : 'pointer-events-none translate-y-10 opacity-0 scale-95'}`}>
        {toastMsg}
      </div>
    </div>
  );
}
