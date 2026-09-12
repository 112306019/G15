import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, CheckCircle2, PackageCheck, Info } from 'lucide-react';
import api from '../api/index';

export default function ApplyPage() {
  const user_id = localStorage.getItem('userId');
  const koc_id = localStorage.getItem('kocId');
  const [activeTab, setActiveTab] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [appliedProducts, setAppliedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);

      if (!user_id) {
        setError('找不到登入資訊，請重新登入後再試');
        setLoading(false);
        return;
      }

      try {
        const [availableRes, appliedRes] = await Promise.all([
          api.get('/koc/application/getAvailableList', {
            params: { user_id },
            signal: controller.signal
          }),
          api.get('/koc/application/getAppliedList', {
            params: { user_id },
            signal: controller.signal
          })
        ]);

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
  }, [user_id]);

  const handleApply = async (product) => {
    if (!koc_id) {
      alert('找不到 KOC 身分資訊，請重新登入或重新切換 KOC 身分後再試');
      return;
    }

    try {
      const res = await api.post('/koc/application/applyMission', {
        koc_id: koc_id,
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
    <div className="flex items-center justify-center py-20 text-red-500 font-bold text-sm md:text-base">
      {error}
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto p-4 md:p-0 pb-12">
      <h2 className="text-2xl md:text-[28px] font-serif font-bold mb-6 md:mb-10 text-[#1A1A18]">代言申請區</h2>

      {/* 頂部提示卡片 */}
      <div className="mb-6 md:mb-8 rounded-2xl md:rounded-[1.5rem] border border-[#E2DDD4] bg-[#F8F9FA] px-4 md:px-6 py-4 md:py-5 shadow-sm">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="mt-0.5 grid h-8 w-8 md:h-10 md:w-10 shrink-0 place-items-center rounded-full bg-[#FDF0ED] text-[#C8522A]">
            <PackageCheck size={18} className="md:w-5 md:h-5" />
          </div>
          <div>
            <div className="font-bold text-[#1A1A18] text-sm md:text-base">完成訂單後，即可解鎖對應商品的代言任務</div>
            <div className="mt-1 md:mt-1.5 text-xs md:text-sm leading-relaxed text-[#8C8880]">
              商品送達後，請先到「我的訂單」確認收貨並完成訂單；系統確認你已收到商品後，
              該商品目前可申請的代言活動才會出現在「待申請」列表。
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2.5 md:gap-4 mb-6 md:mb-10 w-full sm:w-auto">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 sm:flex-none px-6 md:px-8 py-2 md:py-2.5 rounded-xl md:rounded-full font-bold text-sm transition-all shadow-sm ${
            activeTab === 'pending'
              ? 'bg-[#C8522A] text-white'
              : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
          }`}
        >
          待申請
        </button>
        <button
          onClick={() => setActiveTab('applied')}
          className={`flex-1 sm:flex-none px-6 md:px-8 py-2 md:py-2.5 rounded-xl md:rounded-full font-bold text-sm transition-all shadow-sm ${
            activeTab === 'applied'
              ? 'bg-[#C8522A] text-white'
              : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
          }`}
        >
          已申請
        </button>
      </div>

      {/* 清單區域 */}
      <div className="bg-white rounded-2xl md:rounded-3xl border border-[#E2DDD4] shadow-sm overflow-hidden">
        
        <div className="hidden md:flex justify-between items-center bg-[#F8F9FA] border-b border-[#E2DDD4] px-10 py-4 text-sm font-bold text-[#8C8880]">
          <div>任務</div>
          <div>{activeTab === 'applied' ? '狀態' : '動作'}</div>
        </div>

        <div className="flex flex-col">
          {/* 狀態 1：資料載入中 (顯示骨架屏 Skeleton) */}
          {loading ? (
            [1, 2].map((n) => (
              <div key={n} className="flex flex-col md:flex-row md:items-center justify-between px-5 py-4 md:px-10 md:py-6 border-b border-[#E2DDD4] animate-pulse gap-4 md:gap-0">
                <div className="flex items-center gap-4 md:gap-6 flex-1 pr-0 md:pr-8">
                  <div className="w-[64px] h-[48px] md:w-[88px] md:h-[64px] bg-[#E2DDD4] rounded-xl flex-shrink-0" />
                  <div className="h-4 md:h-6 bg-[#E2DDD4] rounded-lg w-full max-w-[200px]" />
                </div>
                <div className="w-full md:w-[100px] h-9 bg-[#E2DDD4] rounded-xl md:rounded-2xl flex-shrink-0" />
              </div>
            ))
          ) : currentList.length > 0 ? (
            /* 狀態 2：載入完畢且有資料 */
            currentList.map((product, i) => (
              <div
                key={product.id}
                className={`flex flex-col md:flex-row md:items-center justify-between px-5 py-4 md:px-10 md:py-6 hover:bg-[#F8F9FA] transition-colors gap-4 md:gap-0 ${
                  i !== currentList.length - 1 ? 'border-b border-[#E2DDD4]' : ''
                }`}
              >
                {/* 左側：商品圖文 */}
                <div className="flex items-center gap-4 md:gap-6 flex-1 pr-0 md:pr-8">
                  <div className="w-[64px] h-[48px] md:w-[88px] md:h-[64px] bg-[#F5F0E8] rounded-xl flex-shrink-0 flex items-center justify-center border border-[#E2DDD4]">
                    <ImageIcon className="text-[#8C8880]/50 md:w-6 md:h-6 w-5 h-5" />
                  </div>
                  <div className="font-bold text-[#1A1A18] leading-snug text-sm md:text-base">
                    {product.name}
                  </div>
                </div>

                {/* 右側：按鈕 / 狀態 */}
                <div className="flex-shrink-0 w-full md:w-[120px] text-center md:text-right">
                  {activeTab === 'pending' ? (
                    <button
                      onClick={() => handleApply(product)}
                      className="w-full md:w-auto bg-[#1A1A18] text-[#F5F0E8] px-8 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold hover:bg-[#C8522A] transition-all active:scale-95 shadow-sm"
                    >
                      申請任務
                    </button>
                  ) : (
                    <span className="inline-block w-full md:w-auto text-xs md:text-sm font-bold text-[#C8522A] bg-[#FDF0ED] px-6 py-2.5 md:py-2 rounded-xl text-center">
                      已申請
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            /* 狀態 3：載入完畢且確實「沒有資料」才顯示 */
            <div className="px-6 py-12 md:px-10 md:py-16 text-center">
              {activeTab === 'pending' ? (
                <div className="mx-auto max-w-lg">
                  <Info size={24} className="mx-auto mb-2.5 md:mb-3 text-[#C8522A] md:w-7 md:h-7" />
                  <div className="font-bold text-[#1A1A18] text-sm md:text-base">目前沒有可申請的代言任務</div>
                  <div className="mt-2 text-xs md:text-sm font-medium leading-relaxed text-[#8C8880]">
                    如果你已經購買商品，請確認對應訂單是否已完成。
                    完成訂單後，符合資格且仍在招募期間的代言任務才會出現在這裡。
                  </div>
                  <button
                    type="button"
                    onClick={() => window.location.assign('/orders')}
                    className="mt-4 md:mt-5 w-full sm:w-auto rounded-xl md:rounded-full border border-[#1A1A18] bg-white px-6 py-2.5 text-sm font-bold text-[#1A1A18] transition-colors hover:bg-[#1A1A18] hover:text-white"
                  >
                    前往我的訂單
                  </button>
                </div>
              ) : (
                <div className="font-bold text-[#8C8880] text-sm md:text-base">目前沒有已申請紀錄</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 申請成功彈窗 */}
      {showModal && currentTask && (
        <div className="fixed inset-0 bg-[#1A1A18]/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300 p-4">
          <div className="bg-white rounded-2xl md:rounded-[2rem] p-8 md:p-12 max-w-md w-full shadow-2xl text-center animate-in zoom-in-95 duration-300 border border-[#E2DDD4]">
            <div className="mb-4 md:mb-6 flex justify-center">
              <CheckCircle2 size={48} className="text-[#C8522A] md:w-16 md:h-16" />
            </div>
            <h4 className="text-xl md:text-2xl font-black text-[#1A1A18] mb-6 md:mb-8 leading-snug">
              {currentTask.name}<br />已申請成功
            </h4>
            <button
              onClick={() => setShowModal(false)}
              className="bg-[#1A1A18] text-[#F5F0E8] w-full py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg hover:bg-[#C8522A] transition-all active:scale-95 shadow-lg"
            >
              確認
            </button>
          </div>
        </div>
      )}
    </div>
  );
}