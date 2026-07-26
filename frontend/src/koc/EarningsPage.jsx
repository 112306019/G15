import React, { useState, useEffect } from 'react';
import api from '../api/index';

export default function EarningsPage({ onDetail, onTrack }) {
  const user_id = localStorage.getItem('userId'); // 每次渲染重新讀取，避免登入前就被凍結
  const [loading, setLoading] = useState(true);
  const [withdrawable, setWithdrawable] = useState(0);
  const [pending, setPending] = useState(0);
  const [hasBankAccount, setHasBankAccount] = useState(false);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const res = await api.get('/koc/revenue/getTotal', {
          params: { user_id }
        });
        if (res.data.success) {
          setWithdrawable(res.data.withdrawable_amount);
          setPending(res.data.pending_amount);
          setHasBankAccount(res.data.hasBankAccount);
        }
      } catch (err) {
        console.error('載入收益失敗', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRevenue();
  }, []);

  const handleTransfer = () => {
    if (!hasBankAccount) {
      alert('請先至個人資訊頁面綁定銀行帳戶');
      return;
    }
    if (withdrawable === 0) {
      alert('目前沒有可提領的金額');
      return;
    }
    // TODO: 串接轉帳 API（等綠界金流完成後再補）
    alert('轉帳功能開發中，敬請期待');
  };

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">我的收益</h2>

      {loading ? (
        <div className="py-20 text-center text-[#8C8880] font-bold">載入中...</div>
      ) : (
        <div className="max-w-3xl space-y-10">

          {/* 待提領區塊 */}
          <div className="bg-[#F5F0E8] rounded-[2.5rem] p-12 relative border border-[#E2DDD4] shadow-sm">
            <h3 className="text-xl font-bold mb-6 text-[#8C8880]">待提領:</h3>
            <p className="text-4xl font-bold mb-12 text-[#1A1A18] font-sans tracking-tight">
              NT${withdrawable.toLocaleString()}
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleTransfer}
                className="bg-[#1A1A18] text-[#F5F0E8] px-10 py-3.5 rounded-2xl text-sm font-bold hover:bg-[#C8522A] transition-all active:scale-95 shadow-md"
              >
                轉帳到銀行帳戶
              </button>
              <button
                onClick={onDetail}
                className="bg-white border border-[#E2DDD4] text-[#8C8880] px-10 py-3.5 rounded-2xl text-sm font-bold hover:text-[#1A1A18] hover:bg-[#F8F9FA] transition-all shadow-sm"
              >
                查看明細
              </button>
            </div>
          </div>

          {/* 待定收益區塊 */}
          <div className="bg-white rounded-[2.5rem] p-10 flex justify-between items-center relative overflow-hidden border border-[#E2DDD4] shadow-sm hover:border-[#B89B6A] transition-colors">
            <div>
              <h3 className="text-xl font-bold mb-4 text-[#8C8880]">待定收益:</h3>
              <p className="text-3xl font-bold text-[#C8522A] font-sans tracking-tight">
                NT${pending.toLocaleString()}
              </p>
            </div>
            <button
              onClick={onTrack}
              className="bg-[#1A1A18] text-[#F5F0E8] px-14 py-3 rounded-2xl text-sm font-bold hover:bg-[#C8522A] transition-all active:scale-95 shadow-md"
            >
              追蹤
            </button>
            <div className="absolute bottom-0 left-10 right-10 flex gap-2 h-1.5 mb-2">
              <div className="w-40 bg-[#C8522A] rounded-full"></div>
              <div className="flex-1 bg-[#F5F0E8] rounded-full"></div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}