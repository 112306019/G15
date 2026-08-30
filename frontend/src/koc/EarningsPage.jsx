import React, { useState, useEffect } from 'react';
import api from '../api/index';
import { Wallet, FileText, FileSignature, Clock, ChevronRight } from 'lucide-react';

export default function EarningsPage({ onDetail, onTrack, onTaxFormRecords }) {
  const user_id = localStorage.getItem('userId'); // 每次渲染重新讀取，避免登入前就被凍結
  const [loading, setLoading] = useState(true);
  const [withdrawable, setWithdrawable] = useState(0);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const res = await api.get('/koc/revenue/getTotal', {
          params: { user_id }
        });
        if (res.data.success) {
          setWithdrawable(res.data.withdrawable_amount);
          setPending(res.data.pending_amount);
        }
      } catch (err) {
        console.error('載入收益失敗', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRevenue();
  }, []);

  return (
    <div className="animate-in fade-in duration-500 font-sans">
      
      {/* 🌟 拿掉底線，保持乾淨的標題 */}
      <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">
        我的收益
      </h2>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-[#8C8880] animate-pulse">
          <div className="w-8 h-8 border-2 border-[#C8522A] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-bold tracking-widest text-sm">載入中...</p>
        </div>
      ) : (
        <div className="max-w-3xl space-y-8">

          {/* 🌟 明亮版：可提領區塊 */}
          <div className="bg-white rounded-[2.5rem] p-10 md:p-12 relative overflow-hidden shadow-[0_12px_40px_rgba(26,26,24,0.06)] border border-[#E2DDD4]">
            
            {/* 淡淡的點綴光暈，讓白底不無聊 */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#F5F0E8] rounded-full blur-[60px] pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#F5F0E8] rounded-2xl flex items-center justify-center shadow-sm">
                  <Wallet size={20} className="text-[#C8522A]" />
                </div>
                <span className="text-sm font-bold tracking-widest text-[#8C8880]">可提領餘額</span>
              </div>

              <div className="mb-10">
                <span className="text-xl md:text-2xl font-bold text-[#8C8880] mr-2">NT$</span>
                <span className="text-5xl md:text-6xl font-black text-[#1A1A18] tracking-tight">
                  {withdrawable.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onTaxFormRecords}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#1A1A18] text-[#F5F0E8] px-8 py-4 rounded-2xl text-sm font-bold tracking-widest hover:bg-[#C8522A] hover:-translate-y-1 transition-all active:translate-y-0 shadow-md"
                >
                  <FileSignature size={18} />
                  查看勞報單紀錄
                </button>
                <button
                  onClick={onDetail}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border border-[#E2DDD4] text-[#1A1A18] px-8 py-4 rounded-2xl text-sm font-bold tracking-widest hover:bg-[#F5F0E8] hover:-translate-y-1 transition-all active:translate-y-0 shadow-sm"
                >
                  <FileText size={18} />
                  查看收益明細
                </button>
              </div>
            </div>
          </div>

          {/* 🌟 待定收益區塊：維持明亮乾淨的風格 */}
          <div 
            onClick={onTrack}
            className="group bg-white rounded-[2.5rem] p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-[#E2DDD4] shadow-sm hover:shadow-xl hover:border-[#C8522A]/40 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-[#F5F0E8] rounded-[1.2rem] flex items-center justify-center text-[#8C8880] group-hover:bg-[#FDF0ED] group-hover:text-[#C8522A] transition-colors shadow-sm">
                <Clock size={28} />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-widest mb-1.5 text-[#8C8880]">待定收益</h3>
                <p className="text-3xl font-black text-[#1A1A18] tracking-tight">
                  <span className="text-lg font-bold text-[#8C8880] mr-1">NT$</span>
                  {pending.toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-2 text-sm font-bold text-[#1A1A18] group-hover:text-[#C8522A] transition-colors mt-4 md:mt-0 pt-4 md:pt-0 border-t border-[#E2DDD4] md:border-t-0">
              <span className="md:hidden text-[#8C8880]">前往查看進度</span>
              <span className="hidden md:inline">追蹤進度</span>
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 輔助說明小提示 */}
          <p className="text-xs font-bold text-[#8C8880] text-center mt-8">
            ※ 待定收益將在案件完成且優惠碼的推廣期間結束後，自動結算至可提領餘額。
          </p>

        </div>
      )}
    </div>
  );
}