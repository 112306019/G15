import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import api from '../api/index';

// Earnings.status 對外的 integer code：0=待轉帳(withdrawable), 1=已轉帳(transferred)
const STATUS_LABEL = { 0: '待轉帳', 1: '已轉帳' };

export default function EarningsDetailPage({ onBack }) {
  const user_id = localStorage.getItem('userId'); // 每次渲染重新讀取，避免登入前就被凍結
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/koc/revenue/getHistory', {
          params: { user_id }
        });
        if (res.data.success) {
          setDetails(res.data.history.map(item => ({
            date: item.date || '-',
            amount: `$${item.amount}`,
            id: item.earnings_no,
            task: item.campaign_name || '-',
            status: STATUS_LABEL[item.status],
          })));
        }
      } catch (err) {
        console.error('載入收益明細失敗', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
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

      <h2 className="text-2xl md:text-[28px] font-serif font-bold mb-6 md:mb-10 text-[#1A1A18]">收益明細</h2>

      <div className="w-full bg-white rounded-2xl md:rounded-3xl border border-[#E2DDD4] shadow-sm overflow-hidden">
        
        <div className="hidden md:grid grid-cols-5 px-10 py-5 bg-[#F8F9FA] border-b border-[#E2DDD4] text-[#8C8880] text-sm font-bold">
          <span>匯款日期</span>
          <span>收款金額</span>
          <span>金流編號</span>
          <span>任務</span>
          <span>狀態</span>
        </div>

        {/* 列表內容 */}
        <div className="flex flex-col">
          {loading ? (
            <div className="py-16 text-center text-[#8C8880] font-bold text-sm md:text-base">載入中...</div>
          ) : details.length === 0 ? (
            <div className="py-16 text-center text-[#8C8880] font-bold text-sm md:text-base">目前沒有收益明細</div>
          ) : (
            details.map((item, index) => (
              <div
                key={index}
                className={`px-5 py-4 md:px-10 md:py-6 transition-colors hover:bg-[#F8F9FA] ${
                  index !== details.length - 1 ? 'border-b border-[#E2DDD4]' : ''
                }`}
              >
                {/* ======== 手機版排版 (卡片式直排) ======== */}
                <div className="md:hidden flex flex-col gap-2.5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="font-bold text-[#1A1A18] text-sm leading-snug line-clamp-2">{item.task}</div>
                    <div className="font-bold text-[#C8522A] whitespace-nowrap text-base">{item.amount}</div>
                  </div>
                  <div className="flex justify-between items-end mt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-[#8C8880] font-medium flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E2DDD4]"></span>
                        {item.date}
                      </span>
                      <span className="text-[10px] text-[#8C8880] font-mono tracking-wide">
                        ID: {item.id}
                      </span>
                    </div>
                    <div className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                      item.status === '待轉帳' ? 'text-[#C8522A] bg-[#FDF0ED]' : 'text-[#8C8880] bg-[#F5F0E8]'
                    }`}>
                      {item.status}
                    </div>
                  </div>
                </div>

                {/* ======== 電腦版排版 (傳統表格橫排) ======== */}
                <div className="hidden md:grid grid-cols-5 items-center text-sm gap-4">
                  <div className="text-[#8C8880] font-medium">{item.date}</div>
                  {/* 金額使用焦糖橘色強調 */}
                  <div className="font-bold text-[#C8522A] text-base">{item.amount}</div>
                  <div className="text-[#8C8880] font-mono">{item.id}</div>
                  <div className="font-bold text-[#1A1A18] truncate pr-4">{item.task}</div>
                  {/* 根據狀態變色 */}
                  <div className={`font-bold ${item.status === '待轉帳' ? 'text-[#C8522A]' : 'text-[#1A1A18]'}`}>
                    {item.status}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}