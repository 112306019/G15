import React, { useState, useEffect } from 'react';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import api from '../api/index';

export default function AnalysisPage({ onBack, onViewData }) {
  const user_id = localStorage.getItem('userId'); // 每次渲染重新讀取，避免登入前就被凍結
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await api.get('/koc/analytics/getList', {
          params: { user_id }
        });
        if (res.data.success) {
          setAnalytics(res.data.analytics);
        }
      } catch (err) {
        console.error('載入成效分析失敗', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-[#8C8880] font-bold text-sm md:text-base">
      載入中...
    </div>
  );

  return (
    <div className="max-w-5xl animate-in fade-in duration-500 p-4 md:p-0 mx-auto pb-12">
      
      <button 
        onClick={onBack} 
        className="mb-4 md:mb-6 flex items-center gap-1.5 md:gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-xs md:text-sm group w-fit bg-white md:bg-transparent px-3 md:px-0 py-1.5 md:py-0 rounded-full border border-[#E2DDD4] md:border-transparent shadow-sm md:shadow-none"
      >
        <ArrowLeft size={16} className="md:w-4 md:h-4 transition-transform group-hover:-translate-x-1" />
        返回接案管理
      </button>

      <h2 className="text-2xl md:text-[28px] font-serif font-bold mb-6 md:mb-10 text-[#1A1A18]">合作收益總覽</h2>

      {analytics.length === 0 ? (
        <div className="py-20 text-center text-[#8C8880] font-bold text-sm md:text-base">
          目前沒有成效資料
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
          {analytics.map((item, i) => (
            <div 
              key={i} 
              className="group bg-white rounded-2xl md:rounded-[2rem] overflow-hidden shadow-sm border border-[#E2DDD4] flex flex-col transition-all hover:shadow-[0_16px_40px_rgba(26,26,24,0.06)] hover:border-[#B89B6A]"
            >
              {/* 圖片區 */}
              <div className="bg-gradient-to-br from-[#F5F0E8] to-[#E2DDD4] h-48 md:h-64 flex items-center justify-center border-b border-[#E2DDD4] overflow-hidden">
                {item.campaign_image ? (
                  <img
                    src={item.campaign_image}
                    alt={item.campaign_name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <ImageIcon size={64} className="md:w-20 md:h-20 text-white/80 transition-transform duration-500 group-hover:scale-110" />
                )}
              </div>
              
              {/* 資訊與按鈕 */}
              <div className="p-5 md:p-8 flex flex-col gap-3 md:gap-4 flex-1">
                <span className="text-lg md:text-2xl font-bold text-[#1A1A18] group-hover:text-[#C8522A] transition-colors line-clamp-2">
                  {item.campaign_name}
                </span>
                <span className="text-[#8C8880] font-medium text-xs md:text-sm">
                  優惠碼使用次數：<span className="font-bold text-[#1A1A18]">{item.usage_count}</span>
                </span>
                
                <button 
                  onClick={() => onViewData({
                    KOCMission_id: item.KOCMission_id,
                    campaign_name: item.campaign_name,
                    campaign_image: item.campaign_image,
                    usage_count: item.usage_count,
                  })}
                  className="mt-auto bg-[#1A1A18] text-[#F5F0E8] py-3 md:py-3.5 px-6 md:px-8 rounded-xl md:rounded-full font-bold text-xs md:text-sm w-full md:w-fit hover:bg-[#C8522A] transition-all active:scale-95 shadow-sm text-center"
                >
                  查看數據
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}