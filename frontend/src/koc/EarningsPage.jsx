import React, { useState, useEffect } from 'react';
import api from '../api/index';
import { Wallet, FileText, FileSignature, Clock, ChevronRight, Loader2, X, AlertCircle } from 'lucide-react';

function extractApiError(err, fallback) {
  const apiError = err.response?.data?.err;
  if (typeof apiError === 'string' && apiError) return apiError;
  if (apiError) return JSON.stringify(apiError);
  return err.message || fallback;
}

function MissingTaxFormModal({ amount, onClose, onGoFill }) {
  return (
    <div
      className="fixed inset-0 bg-[#1A1A18]/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-[#E2DDD4] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-[#1A1A18]">請先完成勞務報酬單</h3>
          <button onClick={onClose} className="text-[#8C8880] hover:text-[#1A1A18] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-xs text-amber-800 leading-relaxed flex gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          您有 <span className="font-bold">NT$ {(amount || 0).toLocaleString()}</span> 的分潤尚未申報勞務報酬單，請先完成提交才能申請提領。
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white border border-[#E2DDD4] text-[#8C8880] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all"
          >
            稍後再說
          </button>
          <button
            onClick={onGoFill}
            className="flex-1 bg-[#1A1A18] text-[#F5F0E8] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#C8522A] transition-all active:scale-95 shadow-md"
          >
            前往申報
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EarningsPage({ onDetail, onTrack, onTaxFormRecords }) {
  const user_id = localStorage.getItem('userId'); // 每次渲染重新讀取，避免登入前就被凍結
  const [loading, setLoading] = useState(true);
  const [withdrawable, setWithdrawable] = useState(0);
  const [pending, setPending] = useState(0);

  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');
  const [missingAmount, setMissingAmount] = useState(null);
  const [minPayoutAmount, setMinPayoutAmount] = useState(16);
  const [transferFee, setTransferFee] = useState(15);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const res = await api.get('/koc/revenue/getTotal', {
          params: { user_id }
        });
        if (res.data.success) {
          setWithdrawable(res.data.withdrawable_amount);
          setPending(res.data.pending_amount);
          if (res.data.min_payout_amount != null) setMinPayoutAmount(res.data.min_payout_amount);
          if (res.data.cross_bank_transfer_fee != null) setTransferFee(res.data.cross_bank_transfer_fee);
        }
      } catch (err) {
        console.error('載入收益失敗', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRevenue();
  }, []);

  const canWithdraw = withdrawable >= minPayoutAmount;

  async function handleWithdrawClick() {
    if (!user_id || !canWithdraw || withdrawing) return;

    setWithdrawing(true);
    setWithdrawError('');
    setWithdrawSuccess('');

    try {
      const checkRes = await api.get('/koc/revenue/getMissingTaxForms', {
        params: { user_id }
      });

      if (checkRes.data.success && checkRes.data.undeclared_amount > 0) {
        setMissingAmount(checkRes.data.undeclared_amount);
        return;
      }

      const payoutRes = await api.post('/koc/revenue/requestPayout', { user_id });

      if (!payoutRes.data.success) {
        // 後端還是會做同樣的勞報單檢查（防止繞過前端直接打 API），
        // 如果剛好卡在這裡，一樣把未申報金額顯示出來
        if (payoutRes.data.undeclared_amount > 0) {
          setMissingAmount(payoutRes.data.undeclared_amount);
          return;
        }
        throw new Error(payoutRes.data.err || '提領失敗');
      }

      setWithdrawable(payoutRes.data.remaining_balance ?? 0);
      setWithdrawSuccess(`已送出提領申請，金額 NT$${(payoutRes.data.amount || 0).toLocaleString()}，平台將盡快撥款至您的銀行帳戶。`);
    } catch (err) {
      setWithdrawError(extractApiError(err, '提領失敗，請稍後再試'));
    } finally {
      setWithdrawing(false);
    }
  }

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

              <div className="mb-8">
                <span className="text-xl md:text-2xl font-bold text-[#8C8880] mr-2">NT$</span>
                <span className="text-5xl md:text-6xl font-black text-[#1A1A18] tracking-tight">
                  {withdrawable.toLocaleString()}
                </span>
              </div>

              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 text-xs text-amber-800 leading-relaxed">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>
                  注意事項：跨行提領需支付 NT$ {transferFee} 手續費，提領金額需達 NT$ {minPayoutAmount} 以上才能申請。
                </span>
              </div>

              <button
                onClick={handleWithdrawClick}
                disabled={!canWithdraw || withdrawing}
                className="w-full mb-4 flex items-center justify-center gap-2 bg-[#C8522A] text-white px-8 py-4 rounded-2xl text-sm font-bold tracking-widest hover:bg-[#1A1A18] hover:-translate-y-1 transition-all active:translate-y-0 shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {withdrawing ? <Loader2 size={18} className="animate-spin" /> : <Wallet size={18} />}
                {withdrawing ? '處理中...' : '提領至銀行帳戶'}
              </button>

              {!canWithdraw && withdrawable > 0 && (
                <p className="text-xs font-bold text-[#8C8880] mb-4 text-center">
                  可提領餘額未達 NT$ {minPayoutAmount}，暫時無法申請提領
                </p>
              )}
              {withdrawError && (
                <p className="text-xs font-bold text-[#C8522A] mb-4 text-center">{withdrawError}</p>
              )}
              {withdrawSuccess && (
                <p className="text-xs font-bold text-green-700 mb-4 text-center">{withdrawSuccess}</p>
              )}

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
            ※ 使用您優惠碼的訂單完成後，分潤會立即結算至可提領餘額，可自行決定何時提領。
          </p>

        </div>
      )}

      {missingAmount != null && (
        <MissingTaxFormModal
          amount={missingAmount}
          onClose={() => setMissingAmount(null)}
          onGoFill={() => {
            setMissingAmount(null);
            onTaxFormRecords?.();
          }}
        />
      )}
    </div>
  );
}
