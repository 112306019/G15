import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react'; // 🟢 引入 ArrowLeft 圖示
import api from '../api/index';

export default function PendingEarningsPage({ onBack }) {
  const user_id = localStorage.getItem('userId'); // 每次渲染重新讀取，避免登入前就被凍結
  const [loading, setLoading] = useState(true);
  const [pendingData, setPendingData] = useState([]);

  useEffect(() => {
    const fetchPendingEarnings = async () => {
      try {
        const res = await api.get('/koc/revenue/getPendingDetail', {
          params: { user_id }
        });
        if (res.data.success) {
          setPendingData(res.data.pending_earnings.map(item => ({
            id: item.earnings_no,
            amount: `$${item.amount}`,
            task: item.campaign_name || '-',
            date: item.date || '-',
          })));
        }
      } catch (err) {
        console.error('載入待定收益失敗', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPendingEarnings();
  }, []);

  return (
    <div className="max-w-5xl animate-in fade-in duration-500">
      
      {/* 🟢 帶有 Hover 動效的高質感返回按鍵 */}
      <button 
        onClick={onBack} 
        className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回我的收益
      </button>

      <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">待定收益</h2>

      {/* 🟢 表格主體：套用一體成型的高質感圓角卡片設計 */}
      <div className="w-full bg-white rounded-3xl border border-[#E2DDD4] shadow-sm overflow-hidden">
        
        {/* 表頭 (套用拿鐵底色) */}
        <div className="grid grid-cols-4 px-10 py-5 bg-[#F8F9FA] border-b border-[#E2DDD4] text-[#8C8880] text-sm font-bold">
          <span>編號</span>
          <span>待收金額</span>
          <span>任務</span>
          <span>日期</span>
        </div>

        {/* 列表內容 */}
        <div className="flex flex-col">
          {loading ? (
            <div className="py-16 text-center text-[#8C8880] font-bold">載入中...</div>
          ) : pendingData.length === 0 ? (
            <div className="py-16 text-center text-[#8C8880] font-bold">目前沒有待定收益</div>
          ) : (
            pendingData.map((item, index) => (
              <div
                key={index}
                className={`grid grid-cols-4 px-10 py-6 items-center text-sm transition-colors hover:bg-[#F8F9FA] ${
                  index !== pendingData.length - 1 ? 'border-b border-[#E2DDD4]' : ''
                }`}
              >
                <div className="text-[#8C8880] font-mono">{item.id}</div>
                {/* 金額使用焦糖橘色強調 */}
                <div className="font-bold text-[#C8522A]">{item.amount}</div>
                <div className="font-bold text-[#1A1A18]">{item.task}</div>
                <div className="text-[#8C8880] font-medium">{item.date}</div>
              </div>
            ))
          )}
        </div>
        
      </div>
    </div>
  );
}