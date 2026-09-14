import React, { useEffect, useState } from 'react';
import { ExternalLink, CheckCircle2, XCircle, Loader2, FileText, Calendar, DollarSign } from 'lucide-react';
import { getAdminTaxForms, reviewAdminTaxForm } from '../api/platform';

const STATUS_TABS = [
  { value: '', label: '全部' },
  { value: 'pending_review', label: '待審核' },
  { value: 'approved', label: '已通過' },
  { value: 'rejected', label: '已退回' },
];

const STATUS_BADGE = {
  pending_review: { label: '待審核', cls: 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/30' },
  approved: { label: '審核通過', cls: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: '已退回', cls: 'bg-red-50 text-red-600 border-red-200' },
};

const QUICK_REJECT_REASONS = [
  '無法開啟連結（權限未開）',
  '未親筆簽名',
  '個人資料/金額不符',
];

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminTaxForms() {
  const adminId = localStorage.getItem('admin_id');

  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [processingFormId, setProcessingFormId] = useState(null);
  const [rejectingForm, setRejectingForm] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  useEffect(() => {
    loadForms(statusFilter);
  }, [statusFilter]);

  async function loadForms(status) {
    try {
      setLoading(true);
      setError('');

      const res = await getAdminTaxForms(status || undefined);

      if (res.data?.success === false) {
        throw new Error(res.data.err || '勞報單列表載入失敗');
      }

      setForms(res.data?.forms || []);
    } catch (err) {
      const apiError = err.response?.data?.err;
      setError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : err.message || '勞報單列表載入失敗'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(form) {
    if (!window.confirm(`確定要核准「${form.koc_name}」的勞報單嗎？`)) return;

    try {
      setProcessingFormId(form.form_id);

      const res = await reviewAdminTaxForm({
        form_id: form.form_id,
        admin_id: adminId,
        action: 'approve',
      });

      if (res.data?.success === false) {
        throw new Error(res.data.err || '審核失敗');
      }

      loadForms(statusFilter);
    } catch (err) {
      const apiError = err.response?.data?.err;
      alert(typeof apiError === 'string' ? apiError : apiError ? JSON.stringify(apiError) : err.message || '審核失敗');
    } finally {
      setProcessingFormId(null);
    }
  }

  function openRejectModal(form) {
    setRejectingForm(form);
    setRejectReason('');
    setRejectError('');
  }

  async function handleReject() {
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError('請填寫退回原因');
      return;
    }

    try {
      setProcessingFormId(rejectingForm.form_id);
      setRejectError('');

      const res = await reviewAdminTaxForm({
        form_id: rejectingForm.form_id,
        admin_id: adminId,
        action: 'reject',
        reject_reason: reason,
      });

      if (res.data?.success === false) {
        throw new Error(res.data.err || '退回失敗');
      }

      setRejectingForm(null);
      loadForms(statusFilter);
    } catch (err) {
      const apiError = err.response?.data?.err;
      setRejectError(
        typeof apiError === 'string' ? apiError : apiError ? JSON.stringify(apiError) : err.message || '退回失敗'
      );
    } finally {
      setProcessingFormId(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-10">
      
      <div className="mb-4 md:mb-6">
        <h2 className="text-2xl md:text-3xl font-serif font-black text-[#1A1A18]">勞務報酬單審核</h2>
        <p className="text-[#8C8880] mt-1.5 md:mt-2 text-xs md:text-sm font-medium">檢視並審核 KOC 提交的勞務報酬單與相關附件。</p>
      </div>

      <div className="flex gap-2 sm:gap-3 mb-4 md:mb-6 overflow-x-auto custom-scrollbar pb-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              statusFilter === tab.value
                ? 'bg-[#1A1A18] text-[#F5F0E8] shadow-md'
                : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:text-[#1A1A18]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden">
        
        <div className="md:hidden flex flex-col divide-y divide-[#E2DDD4]">
          {loading && (
            <div className="p-10 text-center text-sm font-bold text-[#8C8880]">載入中...</div>
          )}

          {!loading && error && (
            <div className="p-10 text-center text-sm font-bold text-red-500">{error}</div>
          )}

          {!loading && !error && forms.length === 0 && (
            <div className="p-10 text-center text-sm font-bold text-[#8C8880] flex flex-col items-center gap-3">
              <FileText size={28} className="text-[#E2DDD4]" />
              <span>目前沒有符合條件的勞報單</span>
            </div>
          )}

          {!loading && !error && forms.map((form) => (
            <div key={form.form_id} className="p-5 sm:p-6 hover:bg-[#F8F9FA] transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#F8F9FA] text-[#1A1A18] border border-[#E2DDD4] flex items-center justify-center font-serif font-black text-lg shrink-0 shadow-sm">
                    {form.koc_name?.charAt(0) || '?'}
                  </div>
                  <div className="font-bold text-[#1A1A18] text-sm">{form.koc_name || '-'}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`inline-block px-2 sm:px-2.5 py-1 rounded-md text-[10px] font-bold border tracking-widest ${STATUS_BADGE[form.status]?.cls || ''}`}>
                    {STATUS_BADGE[form.status]?.label || form.status}
                  </span>
                </div>
              </div>

              {form.status === 'rejected' && form.reject_reason && (
                <div className="mb-4 bg-red-50 border border-red-100 rounded-lg p-2.5 text-[11px] text-red-600 font-medium">
                  <span className="font-bold">退回原因：</span>{form.reject_reason}
                </div>
              )}

              <div className="bg-[#F8F9FA] rounded-xl p-3.5 mb-4 flex flex-col gap-2.5 border border-[#E2DDD4]/50">
                <div>
                  <div className="text-xs font-bold text-[#1A1A18] leading-tight mb-1">{form.service_content}</div>
                </div>
                <div className="flex items-center justify-between border-t border-[#E2DDD4]/50 pt-2.5 mt-0.5">
                  <span className="text-[10px] font-bold text-[#8C8880] flex items-center gap-1"><DollarSign size={12}/> 金額</span>
                  <span className="font-black text-[#C8522A] text-sm">NT$ {(form.amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#8C8880] flex items-center gap-1"><Calendar size={12}/> 提交時間</span>
                  <span className="text-[10px] font-bold text-[#1A1A18]">{formatDateTime(form.submitted_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#8C8880]">雲端連結</span>
                  <a href={form.cloud_link_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C8522A] hover:underline bg-white border border-[#E2DDD4] px-2 py-1 rounded-md shadow-sm">
                    開啟檔案 <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {form.status === 'pending_review' && (
                <div className="flex gap-2.5">
                  <button
                    onClick={() => openRejectModal(form)}
                    disabled={processingFormId === form.form_id}
                    className="flex-1 inline-flex justify-center items-center gap-1.5 bg-white border border-red-200 text-red-600 py-2.5 rounded-xl text-xs font-bold hover:bg-red-50 transition-all shadow-sm disabled:opacity-50"
                  >
                    <XCircle size={14} /> 退回
                  </button>
                  <button
                    onClick={() => handleApprove(form)}
                    disabled={processingFormId === form.form_id}
                    className="flex-1 inline-flex justify-center items-center gap-1.5 bg-[#1A1A18] text-[#F5F0E8] py-2.5 rounded-xl text-xs font-bold hover:bg-green-700 transition-all shadow-sm disabled:opacity-50"
                  >
                    {processingFormId === form.form_id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    審核通過
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">網紅姓名</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">勞務內容</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">金額</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">提交時間</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">狀態</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">雲端連結</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4]">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-sm font-bold text-[#8C8880]">
                    載入中...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-sm font-bold text-red-500">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && forms.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-sm font-bold text-[#8C8880]">
                    目前沒有符合條件的勞報單
                  </td>
                </tr>
              )}

              {!loading && !error && forms.map((form) => (
                <tr key={form.form_id} className="hover:bg-[#F8F9FA] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#F8F9FA] text-[#1A1A18] border border-[#E2DDD4] flex items-center justify-center font-serif font-black text-xs shadow-sm">
                        {form.koc_name?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm font-bold text-[#1A1A18]">{form.koc_name || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-[#1A1A18]">{form.service_content}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-[#C8522A]">
                    NT$ {(form.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-[#8C8880]">
                    {formatDateTime(form.submitted_at)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border tracking-widest ${STATUS_BADGE[form.status]?.cls || ''}`}>
                      {STATUS_BADGE[form.status]?.label || form.status}
                    </span>
                    {form.status === 'rejected' && form.reject_reason && (
                      <div className="text-[10px] text-red-500 mt-1 max-w-[150px] truncate" title={form.reject_reason}>
                        {form.reject_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={form.cloud_link_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C8522A] hover:underline bg-white border border-[#E2DDD4] px-2 py-1 rounded-md shadow-sm transition-all hover:border-[#C8522A]/30"
                    >
                      開啟連結 <ExternalLink size={12} />
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    {form.status === 'pending_review' ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleApprove(form)}
                          disabled={processingFormId === form.form_id}
                          className="inline-flex items-center gap-1.5 bg-[#1A1A18] text-[#F5F0E8] px-3 py-2 rounded-lg text-[11px] font-bold hover:bg-green-700 transition-all shadow-sm disabled:opacity-50"
                        >
                          {processingFormId === form.form_id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          通過
                        </button>
                        <button
                          onClick={() => openRejectModal(form)}
                          disabled={processingFormId === form.form_id}
                          className="inline-flex items-center gap-1.5 bg-white border border-red-200 text-red-600 px-3 py-2 rounded-lg text-[11px] font-bold hover:bg-red-50 transition-all shadow-sm disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          退回
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#8C8880] block text-center">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 退回勞報單彈窗 */}
      {rejectingForm && (
        <div
          className="fixed inset-0 bg-[#1A1A18]/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4"
          onClick={() => setRejectingForm(null)}
        >
          <div
            className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#E2DDD4]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg sm:text-xl font-serif font-black text-[#1A1A18] mb-1">退回勞報單</h3>
            <p className="text-xs sm:text-sm font-bold text-[#8C8880] mb-4 sm:mb-5">
              {rejectingForm.koc_name}・NT$ {(rejectingForm.amount || 0).toLocaleString()}
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_REJECT_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectReason(reason)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold bg-[#F5F0E8] text-[#8C8880] hover:bg-[#E2DDD4] hover:text-[#1A1A18] transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="請輸入退回原因，系統將自動寄信通知該名 KOC..."
              className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none focus:ring-4 focus:ring-[#C8522A]/10 focus:border-[#C8522A] transition-all mb-2 resize-none shadow-sm"
            />
            {rejectError && (
              <p className="text-xs font-bold text-red-600 mb-3">{rejectError}</p>
            )}

            <div className="flex gap-2.5 sm:gap-3 mt-4">
              <button
                onClick={() => setRejectingForm(null)}
                className="flex-1 bg-white border border-[#E2DDD4] text-[#8C8880] py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={processingFormId === rejectingForm.form_id}
                className="flex-1 bg-[#C8522A] text-white py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm hover:bg-[#A64220] transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingFormId === rejectingForm.form_id ? '處理中...' : '確認退回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}