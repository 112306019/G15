import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/index';
import { Wallet, FileText, FileSignature, Receipt, CheckCircle2, Loader2 } from 'lucide-react';
import TaxFormModal from './TaxFormModal';

export default function EarningsPage({ onDetail, onTaxFormRecords, onPayoutRecords }) {
  const user_id = localStorage.getItem('userId'); // 每次渲染重新讀取，避免登入前就被凍結
  const [loading, setLoading] = useState(true);
  // 分潤依申報/審核進度分三類；確定撥款金額才是平台下次撥款作業會真的匯出去的錢。
  const [confirmedAmount, setConfirmedAmount] = useState(0);
  const [undeclaredAmount, setUndeclaredAmount] = useState(0);
  const [unapprovedAmount, setUnapprovedAmount] = useState(0);
  // 目前「進行中」的勞報單（審核中，或被退回還沒重新送出），跟 koc.py 的
  // _get_open_form 邏輯一致：同時間最多一張，不是 approved 就算進行中。
  const [openForm, setOpenForm] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitNotice, setSubmitNotice] = useState('');

  const fetchRevenue = useCallback(async () => {
    try {
      const [totalRes, formsRes] = await Promise.all([
        api.get('/koc/revenue/getTotal', { params: { user_id } }),
        api.get('/koc/revenue/getRemunerationForms', { params: { user_id } }),
      ]);
      if (totalRes.data.success) {
        setConfirmedAmount(totalRes.data.confirmed_amount || 0);
        setUndeclaredAmount(totalRes.data.undeclared_amount || 0);
        setUnapprovedAmount(totalRes.data.unapproved_amount || 0);
      }
      if (formsRes.data.success) {
        const forms = formsRes.data.forms || [];
        setOpenForm(forms.find((f) => f.status !== 'approved') || null);
      }
    } catch (err) {
      console.error('載入收益失敗', err);
    } finally {
      setLoading(false);
    }
  }, [user_id]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const isReviewing = openForm?.status === 'pending_review';
  const isResubmit = openForm?.status === 'rejected';
  const canDeclare = !isReviewing && (isResubmit || undeclaredAmount > 0);
  // 重新提交會把期間新累積的未申報金額一起併進這張單，所以預覽金額要是合計後的總額。
  const modalAmount = isResubmit ? openForm.amount + undeclaredAmount : undeclaredAmount;
  const mergeAmount = isResubmit ? undeclaredAmount : 0;

  return (
    <div className="animate-in fade-in duration-500 font-sans p-4 md:p-0 max-w-5xl mx-auto pb-12">

      <h2 className="text-2xl md:text-[28px] font-display font-bold mb-6 md:mb-10 text-ink">
        我的收益
      </h2>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-muted animate-pulse">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-bold tracking-widest text-sm">載入中...</p>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8 max-w-4xl">

          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 sm:p-10 md:p-12 relative overflow-hidden shadow-[0_12px_40px_rgba(26,26,24,0.06)] border border-edge">

            {/* 淡淡的點綴光暈，讓白底不無聊 */}
            <div className="absolute -right-10 -top-10 md:-right-20 md:-top-20 w-48 md:w-64 h-48 md:h-64 bg-cream rounded-full blur-[40px] md:blur-[60px] pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-cream rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm">
                  <Wallet size={20} className="text-brand" />
                </div>
                <span className="text-xs md:text-sm font-bold tracking-widest text-muted">我的分潤</span>
              </div>

              {/* 分潤依申報/審核進度分三類，避免 KOC 以為所有分潤都已經確定撥款 */}
              <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
                <div className="bg-mist border border-edge rounded-xl md:rounded-2xl px-2 py-3 md:px-4 md:py-5 text-center">
                  <p className="text-[9px] md:text-xs font-bold text-muted mb-1 md:mb-2">未申報金額</p>
                  <p className="text-sm md:text-xl font-black text-ink">NT$ {undeclaredAmount.toLocaleString()}</p>
                  <p className="text-[8px] md:text-[10px] text-muted leading-relaxed mt-1 md:mt-2">尚未填寫勞報單</p>
                </div>
                <div className="bg-mist border border-edge rounded-xl md:rounded-2xl px-2 py-3 md:px-4 md:py-5 text-center">
                  <p className="text-[9px] md:text-xs font-bold text-muted mb-1 md:mb-2">已申報待確認</p>
                  <p className="text-sm md:text-xl font-black text-ink">NT$ {unapprovedAmount.toLocaleString()}</p>
                  <p className="text-[8px] md:text-[10px] text-muted leading-relaxed mt-1 md:mt-2">已填寫，平台尚未審核通過</p>
                </div>
                <div className="bg-brand-soft border border-brand/20 rounded-xl md:rounded-2xl px-2 py-3 md:px-4 md:py-5 text-center">
                  <p className="text-[9px] md:text-xs font-bold text-brand mb-1 md:mb-2">確定撥款金額</p>
                  <p className="text-sm md:text-xl font-black text-brand">NT$ {confirmedAmount.toLocaleString()}</p>
                  <p className="text-[8px] md:text-[10px] text-brand leading-relaxed mt-1 md:mt-2">審核通過，將於下次撥款作業撥入您的銀行帳戶</p>
                </div>
              </div>

              {isReviewing ? (
                <div className="w-full mb-2 flex items-center justify-center gap-2 bg-cream text-muted px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold tracking-widest">
                  <Loader2 size={16} className="animate-spin" />
                  有一張勞報單審核中，請等候結果
                </div>
              ) : (
                <button
                  onClick={() => canDeclare && setModalOpen(true)}
                  disabled={!canDeclare}
                  className="w-full mb-2 flex items-center justify-center gap-2 bg-brand text-white px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold tracking-widest hover:bg-brand-dark hover:-translate-y-1 transition-all active:translate-y-0 shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <FileSignature size={16} className="md:w-[18px] md:h-[18px]" />
                  {isResubmit ? '重新提交勞務報酬單' : canDeclare ? '填寫勞務報酬單' : '目前沒有可申報的分潤'}
                </button>
              )}
              {isResubmit && openForm.reject_reason && (
                <p className="text-xs font-bold text-brand mb-4">上一張勞報單被退回：{openForm.reject_reason}</p>
              )}
              {submitNotice && (
                <div className="flex items-start justify-between gap-2 bg-brand-soft border border-brand/20 rounded-xl md:rounded-2xl px-4 py-3 mb-4 text-xs text-brand leading-relaxed">
                  <span>{submitNotice}</span>
                  <button onClick={() => setSubmitNotice('')} className="shrink-0 font-bold hover:opacity-70">✕</button>
                </div>
              )}

              <div className="flex items-start gap-2 bg-cream rounded-xl md:rounded-2xl px-4 py-3 mb-6 mt-4 text-xs text-ink leading-relaxed">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-brand" />
                <span>
                  請先完成勞務報酬單申報，審核通過後將於平台下次撥款作業（每兩週一次）撥入您指定的帳戶。
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <button
                  onClick={onTaxFormRecords}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand text-white px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold tracking-widest hover:bg-brand-dark hover:-translate-y-1 transition-all active:translate-y-0 shadow-md"
                >
                  <FileSignature size={16} className="md:w-[18px] md:h-[18px]" />
                  查看勞報單紀錄
                </button>
                <button
                  onClick={onPayoutRecords}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border border-edge text-ink px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold tracking-widest hover:bg-cream hover:-translate-y-1 transition-all active:translate-y-0 shadow-sm"
                >
                  <Receipt size={16} className="md:w-[18px] md:h-[18px]" />
                  查看撥款紀錄
                </button>
                <button
                  onClick={onDetail}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border border-edge text-ink px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold tracking-widest hover:bg-cream hover:-translate-y-1 transition-all active:translate-y-0 shadow-sm"
                >
                  <FileText size={16} className="md:w-[18px] md:h-[18px]" />
                  查看分潤詳情
                </button>
              </div>
            </div>
          </div>

          {/* 輔助說明小提示 */}
          <p className="text-[10px] md:text-xs font-bold text-muted text-left md:text-center mt-6 md:mt-8 px-2">
            ※ 使用您優惠碼的訂單完成後，分潤會立即入帳；請記得申報勞務報酬單，審核通過後會於下次撥款作業自動撥款，不需要自行申請提領。
          </p>

        </div>
      )}

      {modalOpen && (
        <TaxFormModal
          amount={modalAmount}
          isResubmit={isResubmit}
          rejectReason={openForm?.reject_reason}
          mergeAmount={mergeAmount}
          userId={user_id}
          onClose={() => setModalOpen(false)}
          onSubmitted={(data) => {
            fetchRevenue();
            setSubmitNotice(
              data?.amount_changed
                ? `申報金額因為併入新累積的分潤而變成 NT$ ${(data.amount || 0).toLocaleString()}，請重新列印、簽署勞務報酬單後再上傳連結。`
                : '已成功送出，請等候審核。'
            );
          }}
        />
      )}
    </div>
  );
}
