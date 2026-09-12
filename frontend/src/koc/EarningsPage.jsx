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
    <div className="animate-in fade-in duration-500 font-sans p-4 md:p-0 max-w-5xl mx-auto pb-12">
      
      <h2 className="text-2xl md:text-[28px] font-serif font-bold mb-6 md:mb-10 text-[#1A1A18]">
        我的收益
      </h2>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-[#8C8880] animate-pulse">
          <div className="w-8 h-8 border-2 border-[#C8522A] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-bold tracking-widest text-sm">載入中...</p>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8 max-w-4xl">

          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 sm:p-10 md:p-12 relative overflow-hidden shadow-[0_12px_40px_rgba(26,26,24,0.06)] border border-[#E2DDD4]">
            
            <div className="absolute -right-10 -top-10 md:-right-20 md:-top-20 w-48 md:w-64 h-48 md:h-64 bg-[#F5F0E8] rounded-full blur-[40px] md:blur-[60px] pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#F5F0E8] rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm">
                  <Wallet size={20} className="text-[#C8522A]" />
                </div>
                <span className="text-xs md:text-sm font-bold tracking-widest text-[#8C8880]">可提領餘額</span>
              </div>

              <div className="mb-8 md:mb-10">
                <span className="text-lg md:text-2xl font-bold text-[#8C8880] mr-2">NT$</span>
                <span className="text-4xl sm:text-5xl md:text-6xl font-black text-[#1A1A18] tracking-tight">
                  {withdrawable.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <button
                  onClick={onTaxFormRecords}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#1A1A18] text-[#F5F0E8] px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold tracking-widest hover:bg-[#C8522A] hover:-translate-y-1 transition-all active:translate-y-0 shadow-md"
                >
                  <FileSignature size={16} className="md:w-[18px] md:h-[18px]" />
                  查看勞報單紀錄
                </button>
                <button
                  onClick={onDetail}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border border-[#E2DDD4] text-[#1A1A18] px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold tracking-widest hover:bg-[#F5F0E8] hover:-translate-y-1 transition-all active:translate-y-0 shadow-sm"
                >
                  <FileText size={16} className="md:w-[18px] md:h-[18px]" />
                  查看收益明細
                </button>
              </div>
            </div>
          </div>

          <div 
            onClick={onTrack}
            className="group bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 sm:p-8 md:p-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 md:gap-6 border border-[#E2DDD4] shadow-sm hover:shadow-xl hover:border-[#C8522A]/40 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center gap-4 md:gap-5">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-[#F5F0E8] rounded-xl md:rounded-[1.2rem] flex items-center justify-center text-[#8C8880] group-hover:bg-[#FDF0ED] group-hover:text-[#C8522A] transition-colors shadow-sm">
                <Clock size={24} className="md:w-7 md:h-7" />
              </div>
              <div>
                <h3 className="text-xs md:text-sm font-bold tracking-widest mb-1 md:mb-1.5 text-[#8C8880]">待定收益</h3>
                <p className="text-2xl sm:text-3xl font-black text-[#1A1A18] tracking-tight">
                  <span className="text-sm md:text-lg font-bold text-[#8C8880] mr-1">NT$</span>
                  {pending.toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 text-xs md:text-sm font-bold text-[#1A1A18] group-hover:text-[#C8522A] transition-colors mt-2 md:mt-0 pt-4 md:pt-0 border-t border-[#E2DDD4] sm:border-t-0">
              <span className="sm:hidden text-[#8C8880]">前往查看進度</span>
              <span className="hidden sm:inline">追蹤進度</span>
              <ChevronRight size={18} className="md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 輔助說明小提示 */}
          <p className="text-[10px] md:text-xs font-bold text-[#8C8880] text-left md:text-center mt-6 md:mt-8 px-2">
            ※ 待定收益將在案件完成且優惠碼的推廣期間結束後，自動結算至可提領餘額。
          </p>

        </div>
      )}
    </div>
  );
}