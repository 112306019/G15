import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, CheckCircle2, Coins, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from './components/ui/Toast';
import {
  getVendorFinanceOverview,
  getVendorFinanceTransactions,
  requestVendorPayout,
} from '../api/vendor';

const getStatusBadge = (text, type) => {
  const styles = {
    success: 'bg-[#F5F0E8] text-[#1A1A18]', 
    processing: 'bg-[#FDF0ED] text-[#C8522A]', 
    pending: 'bg-white border border-[#E2DDD4] text-[#8C8880]', 
    frozen: 'bg-white border border-[#E2DDD4] text-[#B8B4AC]',
    error: 'bg-[#FFF0F0] text-[#D93025]', 
  };
  const dots = {
    success: 'bg-[#1A1A18]',
    processing: 'bg-[#C8522A]',
    pending: 'bg-[#E2DDD4]',
    frozen: 'bg-[#E2DDD4]',
    error: 'bg-[#D93025]',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider ${styles[type]}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dots[type]}`} />
      {text}
    </span>
  );
};

const fmt = (n) => `NTD$ ${Number(n || 0).toLocaleString()}`;

// 把後端回傳的單筆交易轉成表格要用的顯示格式
const mapTxn = (t) => ({
  id: t.id,
  orderId: t.order_id || '—',
  amount: fmt(t.gross_amount != null ? t.gross_amount : t.amount),
  fee: fmt(t.fee_amount != null ? t.fee_amount : 0),
  netAmount: fmt(t.amount),
  netAmountRaw: Number(t.amount || 0),
  date: t.date,
  statusText: t.statusText,
  statusType: t.statusType,
  account: t.account,
});

export default function Finance() {
  const { toast } = useToast();
  const vendorId = localStorage.getItem('vendor_id');

  const [txData, setTxData] = useState([]); // 整個表格的資料狀態
  const [selectedIds, setSelectedIds] = useState([]); // 紀錄被打勾的項目 ID
  const [selectedTx, setSelectedTx] = useState(null); // 查看單筆明細用

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({ withdrawable_amount: 0, pending_amount: 0, hasBankAccount: false });

  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const [overviewRes, txRes] = await Promise.all([
        getVendorFinanceOverview(vendorId),
        getVendorFinanceTransactions(vendorId),
      ]);

      if (overviewRes.data?.success) {
        setOverview(overviewRes.data);
      }

      if (txRes.data?.success) {
        setTxData(txRes.data.transactions.map(mapTxn));
      } else {
        toast.error(txRes.data?.err || '讀取金流明細失敗');
      }
    } catch (err) {
      toast.error('讀取金流資料失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }, [vendorId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 🟢 處理單一 Checkbox 勾選/取消
  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 🟢 處理「全選」Checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(txData.map(tx => tx.id));
    } else {
      setSelectedIds([]);
    }
  };

  // 🟢 點擊「申請撥款」按鈕的防呆檢查
  const handleOpenPayout = () => {
    if (!overview.hasBankAccount) {
      toast.error("請先至「設定」頁面綁定撥款銀行帳戶");
      return;
    }

    if (selectedIds.length === 0) {
      toast.error("請先勾選您想要申請撥款的項目");
      return;
    }

    // 檢查選中的項目中，是否有不是「待撥款」狀態的（鑑賞期中/處理中/已完成 都不能再選）
    const selectedTxs = txData.filter(tx => selectedIds.includes(tx.id));
    const hasInvalidTx = selectedTxs.some(tx => tx.statusType !== 'pending');

    if (hasInvalidTx) {
      toast.error("勾選的項目中包含「鑑賞期中」或非「待撥款」的款項，請僅勾選狀態為「待撥款」的項目");
      return;
    }

    setIsPayoutModalOpen(true);
  };

  // 🟢 確認申請撥款（實際呼叫後端 API）
  const handleConfirmPayout = async () => {
    setSubmitting(true);
    try {
      const res = await requestVendorPayout({
        vendor_id: vendorId,
        amount: stats.totalNetAmount,
      });

      if (!res.data?.success) {
        toast.error(res.data?.err || '申請撥款失敗');
        setSubmitting(false);
        return;
      }

      setPayoutSuccess(true);

      // 重新拉一次最新的金流資料（狀態、餘額都會變）
      await loadData();

      setTimeout(() => {
        setSelectedIds([]);
        setIsPayoutModalOpen(false);
        setPayoutSuccess(false);
        setSubmitting(false);
      }, 1200);
    } catch (err) {
      toast.error('申請撥款失敗，請稍後再試');
      setSubmitting(false);
    }
  };

  // 計算選中項目的總金額 (用於顯示在彈出視窗，以及實際送出撥款申請)
  const stats = useMemo(() => {
    const selectedPendingTxs = txData.filter(tx => selectedIds.includes(tx.id));
    const totalNetAmountRaw = selectedPendingTxs.reduce((sum, tx) => sum + tx.netAmountRaw, 0);

    return {
      count: selectedPendingTxs.length,
      totalNetAmount: totalNetAmountRaw, // 純數字，申請撥款 API 用
      totalNetAmountDisplay: fmt(totalNetAmountRaw), // 格式化字串，畫面顯示用
    };
  }, [selectedIds, txData]);

  if (!vendorId) {
    return (
      <div className="flex items-center gap-2 text-sm font-bold text-[#D93025] bg-[#FFF0F0] rounded-2xl p-5 border border-[#FFD7D2]">
        <AlertCircle size={18} />
        找不到廠商登入資訊，請重新登入後再試一次。
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      
      {/* 頂部操作區塊 */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-serif font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block"></span>
          金流明細
        </h2>
        <button 
          onClick={handleOpenPayout}
          className="bg-[#1A1A18] text-[#F5F0E8] px-8 py-3 rounded-full font-bold text-sm hover:bg-[#C8522A] transition-all active:scale-95 shadow-sm flex items-center gap-2"
        >
          <Coins size={16} />
          申請撥款 {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
        </button>
      </div>

      {/* 餘額總覽 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#E2DDD4] p-5">
          <p className="text-xs font-bold text-[#8C8880] mb-1">可提領餘額</p>
          <p className="text-2xl font-black text-[#C8522A]">{fmt(overview.withdrawable_amount)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2DDD4] p-5">
          <p className="text-xs font-bold text-[#8C8880] mb-1">鑑賞期凍結中</p>
          <p className="text-2xl font-black text-[#8C8880]">{fmt(overview.pending_amount)}</p>
        </div>
      </div>

      {!overview.hasBankAccount && (
        <div className="flex items-center gap-2 text-sm font-bold text-[#C8522A] bg-[#FDF0ED] rounded-2xl p-4 border border-[#F5D5C8] mb-6">
          <AlertCircle size={18} />
          尚未綁定撥款銀行帳戶，請至「設定」頁面完成綁定後才能申請撥款。
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#8C8880] py-20">
          <Loader2 size={18} className="animate-spin" />
          載入金流資料中...
        </div>
      ) : (
      <>
      {/* 明細列表卡片 */}
      <div className="bg-white rounded-[2rem] border border-[#E2DDD4] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                <th className="p-5 pl-8 w-12">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={selectedIds.length === txData.length && txData.length > 0}
                    className="w-4 h-4 rounded border-[#E2DDD4] text-[#C8522A] focus:ring-[#C8522A] cursor-pointer accent-[#C8522A]" 
                  />
                </th>
                <th className="p-5 text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">金流編號</th>
                <th className="p-5 text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">訂單編號</th>
                <th className="p-5 text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">訂單金額</th>
                <th className="p-5 text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">日期</th>
                <th className="p-5 text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">撥款狀態</th>
                <th className="p-5 text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap text-center">詳細資料</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-[#E2DDD4]">
              {txData.map((row) => (
                <tr 
                  key={row.id} 
                  className={`transition-colors group cursor-pointer ${selectedIds.includes(row.id) ? 'bg-[#FDF0ED]/50' : 'hover:bg-[#F8F9FA]'}`}
                  onClick={() => handleSelectRow(row.id)}
                >
                  <td className="p-5 pl-8" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(row.id)}
                      onChange={() => handleSelectRow(row.id)}
                      className="w-4 h-4 rounded border-[#E2DDD4] text-[#C8522A] focus:ring-[#C8522A] cursor-pointer accent-[#C8522A]" 
                    />
                  </td>
                  <td className="p-5 text-sm font-bold text-[#1A1A18] font-mono">{row.id}</td>
                  <td className="p-5 text-sm font-medium text-[#8C8880] font-mono">{row.orderId}</td>
                  <td className="p-5 text-sm font-black text-[#C8522A]">{row.amount}</td>
                  <td className="p-5 text-sm font-medium text-[#8C8880]">{row.date}</td>
                  <td className="p-5">
                    {getStatusBadge(row.statusText, row.statusType)}
                  </td>
                  <td className="p-5 text-center" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setSelectedTx(row)}
                      className="text-sm font-bold text-[#8C8880] hover:text-[#C8522A] bg-white border border-[#E2DDD4] hover:border-[#C8522A] px-4 py-1.5 rounded-full transition-all"
                    >
                      查看
                    </button>
                  </td>
                </tr>
              ))}
              {txData.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-sm font-bold text-[#8C8880]">
                    目前沒有任何金流紀錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* 🟢 單筆明細彈出視窗 (Modal) */}
      {selectedTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1A18]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-[#E2DDD4] animate-in zoom-in-95 duration-300 relative">
            <button onClick={() => setSelectedTx(null)} className="absolute top-6 right-6 p-2 text-[#8C8880] hover:text-[#1A1A18] bg-[#F8F9FA] hover:bg-[#E2DDD4] rounded-full transition-colors">
              <X size={20} />
            </button>
            <div className="mb-8">
              <h3 className="text-2xl font-serif font-bold text-[#1A1A18] mb-3">金流詳細資料</h3>
              {getStatusBadge(selectedTx.statusText, selectedTx.statusType)}
            </div>
            <div className="bg-[#F8F9FA] rounded-2xl p-6 mb-8 border border-[#E2DDD4]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-[#8C8880]">訂單總額</span>
                <span className="text-sm font-bold text-[#1A1A18]">{selectedTx.amount}</span>
              </div>
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#E2DDD4] dashed">
                <span className="text-sm font-bold text-[#8C8880]">平台手續費</span>
                <span className="text-sm font-bold text-[#D93025]">- {selectedTx.fee}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-[#1A1A18]">實收金額</span>
                <span className="text-3xl font-black text-[#C8522A]">{selectedTx.netAmount}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold tracking-widest text-[#8C8880] uppercase">金流編號</span>
                <span className="text-sm font-bold text-[#1A1A18] font-mono">{selectedTx.id}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold tracking-widest text-[#8C8880] uppercase">撥款帳戶</span>
                <span className="text-sm font-bold text-[#1A1A18]">{selectedTx.account}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 申請全額撥款確認彈出視窗 (Modal) */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1A18]/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-[#E2DDD4] animate-in zoom-in-95 duration-300 relative text-center">
            
            {!payoutSuccess ? (
              <>
                <button onClick={() => setIsPayoutModalOpen(false)} className="absolute top-6 right-6 p-2 text-[#8C8880] hover:text-[#1A1A18] rounded-full transition-colors">
                  <X size={20} />
                </button>

                <div className="w-16 h-16 bg-[#FDF0ED] text-[#C8522A] rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <Coins size={28} />
                </div>

                <h3 className="text-2xl font-serif font-bold text-[#1A1A18] mb-3">確認申請撥款？</h3>
                <p className="text-sm font-medium text-[#8C8880] mb-6 px-4">
                  即將為您申請所選的 <span className="text-[#1A1A18] font-bold">{stats.count}</span> 筆待撥款項目。
                </p>

                {/* 動態計算的數據小卡 */}
                <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-[#E2DDD4] text-left space-y-3 mb-6">
                  <div className="flex justify-between text-xs font-bold text-[#8C8880]">
                    <span>待撥款單數</span>
                    <span className="text-[#1A1A18] font-black">{stats.count} 筆</span>
                  </div>
                  <div className="flex justify-between items-end pt-3 border-t border-[#E2DDD4] border-dashed">
                    <span className="text-xs font-bold text-[#1A1A18]">預計撥款總額</span>
                    <span className="text-xl font-black text-[#C8522A]">{stats.totalNetAmountDisplay}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsPayoutModalOpen(false)}
                    disabled={submitting}
                    className="flex-1 bg-white border border-[#E2DDD4] text-[#8C8880] font-bold text-sm py-3 rounded-full hover:text-[#1A1A18] hover:border-[#1A1A18] transition-all disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleConfirmPayout}
                    disabled={submitting}
                    className="flex-1 bg-[#1A1A18] text-[#F5F0E8] font-bold text-sm py-3 rounded-full hover:bg-[#C8522A] transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    確認送出
                  </button>
                </div>
              </>
            ) : (
              /* 成功送出動畫畫面 */
              <div className="py-8 space-y-4 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-[#F5F0E8] text-[#1A1A18] rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-xl font-serif font-bold text-[#1A1A18]">撥款申請已提交</h3>
                <p className="text-xs font-bold text-[#8C8880]">狀態已更新，正在與第三方金流銀行連線中...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}