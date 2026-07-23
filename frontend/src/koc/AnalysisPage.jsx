import React, { useState, useEffect } from 'react';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import api from '../api/index';

const user_id = localStorage.getItem('userId'); // 登入後存於 localStorage

export default function AnalysisPage({ onBack, onViewData }) {
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
    <div className="flex items-center justify-center py-20 text-[#8C8880] font-bold">
      載入中...
    </div>
  );

  return (
    <div className="max-w-5xl animate-in fade-in duration-500">
      
      <button 
        onClick={onBack} 
        className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回任務管理
      </button>

      <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">成效分析</h2>

      {analytics.length === 0 ? (
        <div className="py-20 text-center text-[#8C8880] font-bold">
          目前沒有成效資料
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {analytics.map((item, i) => (
            <div 
              key={i} 
              className="group bg-white rounded-[2rem] overflow-hidden shadow-sm border border-[#E2DDD4] flex flex-col transition-all hover:shadow-[0_16px_40px_rgba(26,26,24,0.06)] hover:border-[#B89B6A]"
            >
              {/* 圖片區 */}
              <div className="bg-gradient-to-br from-[#F5F0E8] to-[#E2DDD4] h-64 flex items-center justify-center border-b border-[#E2DDD4] overflow-hidden">
                {item.campaign_image ? (
                  <img
                    src={item.campaign_image}
                    alt={item.campaign_name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <ImageIcon size={80} className="text-white/80 transition-transform duration-500 group-hover:scale-110" />
                )}
              </div>
              
              {/* 資訊與按鈕 */}
              <div className="p-8 flex flex-col gap-4">
                <span className="text-2xl font-bold text-[#1A1A18] group-hover:text-[#C8522A] transition-colors">
                  {item.campaign_name}
                </span>
                <span className="text-[#8C8880] font-medium text-sm">
                  優惠碼使用次數：<span className="font-bold text-[#1A1A18]">{item.usage_count}</span>
                </span>
                
                <button 
                  onClick={() => onViewData({
                    KOCMission_id: item.KOCMission_id,
                    campaign_name: item.campaign_name,
                    campaign_image: item.campaign_image,
                    usage_count: item.usage_count,
                  })}
                  className="mt-4 bg-[#1A1A18] text-[#F5F0E8] py-3.5 px-8 rounded-full font-bold text-sm w-fit hover:bg-[#C8522A] transition-all active:scale-95 shadow-sm"
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