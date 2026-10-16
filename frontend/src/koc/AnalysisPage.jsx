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
    <div className="flex items-center justify-center py-20 text-muted font-bold">
      載入中...
    </div>
  );

  return (
    <div className="max-w-5xl animate-in fade-in duration-500">
      
      <button 
        onClick={onBack} 
        className="mb-6 flex items-center gap-2 text-muted hover:text-brand transition-colors font-bold text-sm group"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回接案管理
      </button>

      <h2 className="text-[28px] font-display font-bold mb-10 text-ink">合作收益總覽</h2>

      {analytics.length === 0 ? (
        <div className="py-20 text-center text-muted font-bold">
          目前沒有成效資料
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {analytics.map((item, i) => (
            <div 
              key={i} 
              className="group bg-white rounded-[2rem] overflow-hidden shadow-sm border border-edge flex flex-col transition-all hover:shadow-[0_16px_40px_rgba(26,26,24,0.06)] hover:border-gold"
            >
              {/* 圖片區 */}
              <div className="bg-gradient-to-br from-cream to-edge h-64 flex items-center justify-center border-b border-edge overflow-hidden">
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
                <span className="text-2xl font-bold text-ink group-hover:text-brand transition-colors">
                  {item.campaign_name}
                </span>
                <span className="text-muted font-medium text-sm">
                  優惠碼使用次數：<span className="font-bold text-ink">{item.usage_count}</span>
                </span>
                
                <button 
                  onClick={() => onViewData({
                    KOCMission_id: item.KOCMission_id,
                    campaign_name: item.campaign_name,
                    campaign_image: item.campaign_image,
                    usage_count: item.usage_count,
                  })}
                  className="mt-4 bg-brand text-white py-3.5 px-8 rounded-full font-bold text-sm w-fit hover:bg-brand-dark transition-all active:scale-95 shadow-sm"
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