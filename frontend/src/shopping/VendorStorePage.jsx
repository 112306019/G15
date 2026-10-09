import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Store, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { formatApiError } from '../errorMessage';
import { ProductCard, formatNTD } from './ShopPage';
import { addProductToCart } from './cartApi';

// 廠商商店頁：從商品頁點廠商名稱進來，列出該廠商在商城上架中的所有商品
export default function VendorStorePage({ userRole, onAddToCart }) {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

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

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0 pb-12 md:pb-16 animate-in fade-in duration-300">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 md:mb-6 flex items-center gap-1.5 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-xs md:text-sm group w-fit"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回
      </button>

      {loading ? (
        <div className="py-24 flex items-center justify-center gap-2 text-[#8C8880] font-bold text-sm">
          <Loader2 size={18} className="animate-spin" /> 載入中...
        </div>
      ) : error ? (
        <div className="py-24 flex flex-col items-center gap-4 text-[#8C8880] font-bold text-sm">
          <p>{error}</p>
          <button
            onClick={() => navigate('/shop')}
            className="bg-[#1A1A18] text-[#F5F0E8] px-6 py-3 rounded-2xl text-sm font-bold hover:bg-[#C8522A] transition-all"
          >
            回到商城
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white border border-[#E2DDD4] rounded-2xl md:rounded-3xl p-5 md:p-8 mb-6 md:mb-10 flex items-center gap-4 md:gap-6 shadow-sm">
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-[#F5F0E8] text-[#C8522A] flex items-center justify-center shrink-0">
              <Store size={28} className="md:w-9 md:h-9" />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-xl md:text-3xl font-bold text-[#1A1A18] truncate">{vendor.Vendor_name}</h1>
              <p className="text-xs md:text-sm text-[#8C8880] mt-1">
                {products.length} 件上架商品
                {joinedYear && `・${joinedYear} 年加入平台`}
              </p>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="py-20 text-center text-sm font-bold text-[#8C8880]">這個廠商目前沒有上架中的商品</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-6 md:gap-x-6 md:gap-y-10">
              {products.map((p) => (
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

      <div className={`fixed bottom-6 md:bottom-10 left-1/2 z-[999] -translate-x-1/2 rounded-xl md:rounded-full bg-[#1A1A18] px-5 py-3 text-xs md:text-sm font-bold text-white shadow-xl transition-all duration-300 ${toastMsg ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-10 opacity-0'}`}>
        {toastMsg}
      </div>
    </div>
  );
}
