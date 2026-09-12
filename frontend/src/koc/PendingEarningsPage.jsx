import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react'; 
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
    <div className="max-w-5xl animate-in fade-in duration-500 p-4 md:p-0 mx-auto">
      
      <button 
        onClick={onBack} 
        className="mb-4 md:mb-6 flex items-center gap-1.5 md:gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-xs md:text-sm group w-fit bg-white md:bg-transparent px-3 md:px-0 py-1.5 md:py-0 rounded-full border border-[#E2DDD4] md:border-transparent shadow-sm md:shadow-none"
      >
        <ArrowLeft size={16} className="md:w-4 md:h-4 transition-transform group-hover:-translate-x-1" />
        返回我的收益
      </button>

      <h2 className="text-2xl md:text-[28px] font-serif font-bold mb-6 md:mb-10 text-[#1A1A18]">待定收益</h2>

      <div className="w-full bg-white rounded-2xl md:rounded-3xl border border-[#E2DDD4] shadow-sm overflow-hidden">
        
        <div className="hidden md:grid grid-cols-4 px-10 py-5 bg-[#F8F9FA] border-b border-[#E2DDD4] text-[#8C8880] text-sm font-bold">
          <span>編號</span>
          <span>待收金額</span>
          <span>任務</span>
          <span>日期</span>
        </div>

        {/* 列表內容 */}
        <div className="flex flex-col">
          {loading ? (
            <div className="py-16 text-center text-[#8C8880] font-bold text-sm md:text-base">載入中...</div>
          ) : pendingData.length === 0 ? (
            <div className="py-16 text-center text-[#8C8880] font-bold text-sm md:text-base">目前沒有待定收益</div>
          ) : (
            pendingData.map((item, index) => (
              <div
                key={index}
                className={`px-5 py-4 md:px-10 md:py-6 transition-colors hover:bg-[#F8F9FA] ${
                  index !== pendingData.length - 1 ? 'border-b border-[#E2DDD4]' : ''
                }`}
              >
                {/* ======== 手機版排版 (卡片式直排) ======== */}
                <div className="md:hidden flex flex-col gap-2.5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="font-bold text-[#1A1A18] text-sm leading-snug line-clamp-2">{item.task}</div>
                    <div className="font-bold text-[#C8522A] whitespace-nowrap text-base">{item.amount}</div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="text-[10px] text-[#8C8880] font-mono tracking-wide">
                      ID: {item.id}
                    </div>
                    <div className="text-[11px] text-[#8C8880] font-medium flex items-center gap-1.5">
                      {item.date}
                    </div>
                  </div>
                </div>

                {/* ======== 電腦版排版 (傳統表格橫排) ======== */}
                <div className="hidden md:grid grid-cols-4 items-center text-sm gap-4">
                  <div className="text-[#8C8880] font-mono">{item.id}</div>
                  {/* 金額使用焦糖橘色強調 */}
                  <div className="font-bold text-[#C8522A] text-base">{item.amount}</div>
                  <div className="font-bold text-[#1A1A18] truncate pr-4">{item.task}</div>
                  <div className="text-[#8C8880] font-medium">{item.date}</div>
                </div>
              </div>
            ))
          )}
        </div>
        
      </div>
    </div>
  );
}