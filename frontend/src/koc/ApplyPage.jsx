import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import api from '../api/index';

export default function ApplyPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [appliedProducts, setAppliedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kocId, setKocId] = useState(null);

  const user_id = localStorage.getItem('userId'); // 每次渲染重新讀取，避免登入前就被凍結

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        const [availableRes, appliedRes, profileRes] = await Promise.all([
          api.get('/koc/application/getAvailableList', {
            params: { user_id },
            signal: controller.signal
          }),
          api.get('/koc/application/getAppliedList', {
            params: { user_id },
            signal: controller.signal
          }),
          api.get('/koc/profile/getProfile', {
            params: { user_id },
            signal: controller.signal
          })
        ]);

        if (profileRes.data.success) {
          setKocId(profileRes.data.koc_id);
        }

        if (availableRes.data.success) {
          setPendingProducts(availableRes.data.campaigns.map(c => ({
            id: c.campaign_id,
            order_id: c.order_id,
            name: c.campaign_name,
            apply_status: c.apply_status,
          })));
        }

        if (appliedRes.data.success) {
          setAppliedProducts(appliedRes.data.campaigns.map(c => ({
            id: c.application_id,
            name: c.campaign_name,
            image: c.campaign_image,
          })));
        }
      } catch (err) {
        if (err.name !== 'CanceledError' && err.name !== 'AxiosError') {
          setError('載入失敗，請稍後再試');
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, []);

  const handleApply = async (product) => {
    if (!kocId) {
      alert('尚未取得 KOC 身份資料，請稍後再試');
      return;
    }
    try {
      const res = await api.post('/koc/application/applyMission', {
        koc_id: kocId,
        campaign_id: product.id,
        order_id: product.order_id,
      });

      if (res.data.success) {
        setCurrentTask(product);
        setPendingProducts(prev => prev.filter(p => p.id !== product.id));
        setAppliedProducts(prev => [
          { ...product, status: '審核中' },
          ...prev
        ]);
        setShowModal(true);
      } else {
        alert(res.data.err || '申請失敗');
      }
    } catch (err) {
      console.error(err);
      alert('申請失敗，請稍後再試');
    }
  };

  const currentList = activeTab === 'pending' ? pendingProducts : appliedProducts;

  if (error) return (
    <div className="flex items-center justify-center py-20 text-red-500 font-bold">
      {error}
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto">
      <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">代言申請區</h2>

      {/* 按鈕組：一開始就渲染，使用者可以自由切換 */}
      <div className="flex gap-4 mb-10">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-8 py-2.5 rounded-full font-bold transition-all shadow-sm ${
            activeTab === 'pending'
              ? 'bg-[#C8522A] text-white'
              : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
          }`}
        >
          待申請
        </button>
        <button
          onClick={() => setActiveTab('applied')}
          className={`px-8 py-2.5 rounded-full font-bold transition-all shadow-sm ${
            activeTab === 'applied'
              ? 'bg-[#C8522A] text-white'
              : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
          }`}
        >
          已申請
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-[#E2DDD4] shadow-sm overflow-hidden">
        <div className="flex justify-between items-center bg-[#F8F9FA] border-b border-[#E2DDD4] px-10 py-4 text-sm font-bold text-[#8C8880]">
          <div>任務</div>
          <div>{activeTab === 'applied' ? '狀態' : '動作'}</div>
        </div>

        <div className="flex flex-col">
          {/* 狀態 1：資料載入中 (顯示骨架屏 Skeleton) */}
          {loading ? (
            [1, 2].map((n) => (
              <div key={n} className="flex items-center justify-between px-10 py-6 border-b border-[#E2DDD4] animate-pulse">
                <div className="flex items-center gap-6 flex-1 pr-8">
                  <div className="w-[88px] h-[64px] bg-[#E2DDD4] rounded-xl flex-shrink-0" />
                  <div className="h-6 bg-[#E2DDD4] rounded-lg w-48" />
                </div>
                <div className="w-[100px] h-9 bg-[#E2DDD4] rounded-2xl flex-shrink-0" />
              </div>
            ))
          ) : currentList.length > 0 ? (
            /* 狀態 2：載入完畢且有資料 */
            currentList.map((product, i) => (
              <div
                key={product.id}
                className={`flex items-center justify-between px-10 py-6 hover:bg-[#F8F9FA] transition-colors ${
                  i !== currentList.length - 1 ? 'border-b border-[#E2DDD4]' : ''
                }`}
              >
                <div className="flex items-center gap-6 flex-1 pr-8">
                  <div className="w-[88px] h-[64px] bg-[#F5F0E8] rounded-xl flex-shrink-0 flex items-center justify-center border border-[#E2DDD4]">
                    <ImageIcon className="text-[#8C8880]/50" size={24} />
                  </div>
                  <div className="font-bold text-[#1A1A18] leading-snug">
                    {product.name}
                  </div>
                </div>

                <div className="flex-shrink-0 w-[120px] text-right">
                  {activeTab === 'pending' ? (
                    <button
                      onClick={() => handleApply(product)}
                      className="bg-[#1A1A18] text-[#F5F0E8] px-8 py-3 rounded-2xl text-sm font-bold hover:bg-[#C8522A] transition-all active:scale-95 shadow-sm"
                    >
                      申請任務
                    </button>
                  ) : (
                    <span className="text-sm font-bold text-[#C8522A] bg-[#FDF0ED] px-6 py-2 rounded-xl">
                      已申請
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            /* 狀態 3：載入完畢且確實「沒有資料」才顯示 */
            <div className="px-10 py-16 text-center text-[#8C8880] font-bold">
              目前沒有相關紀錄
            </div>
          )}
        </div>
      </div>

      {showModal && currentTask && (
        <div className="fixed inset-0 bg-[#1A1A18]/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-12 max-w-md w-full shadow-2xl text-center animate-in zoom-in-95 duration-300 border border-[#E2DDD4]">
            <div className="mb-6 flex justify-center">
              <CheckCircle2 size={64} className="text-[#C8522A]" />
            </div>
            <h4 className="text-2xl font-black text-[#1A1A18] mb-8 leading-snug">
              {currentTask.name}<br />已申請成功
            </h4>
            <button
              onClick={() => setShowModal(false)}
              className="bg-[#1A1A18] text-[#F5F0E8] w-full py-4 rounded-2xl font-bold text-lg hover:bg-[#C8522A] transition-all active:scale-95 shadow-lg"
            >
              確認
            </button>
          </div>
        </div>
      )}
    </div>
  );
}