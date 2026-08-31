import React, { useEffect, useState } from 'react';
import { FileText, ExternalLink, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
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
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-[#FDF0ED] flex items-center justify-center">
          <FileText size={20} className="text-[#C8522A]" />
        </div>
        <h2 className="text-2xl font-black text-[#1A1A18]">勞務報酬單審核</h2>
      </div>

      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              statusFilter === tab.value
                ? 'bg-[#1A1A18] text-[#F5F0E8] shadow-md'
                : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:text-[#1A1A18]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">網紅姓名</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">專案名稱</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">金額</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">提交時間</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">狀態</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">雲端連結</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase text-center">操作</th>
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
                <tr key={form.form_id} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-[#1A1A18]">{form.koc_name || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-[#1A1A18]">{form.campaign_name}</div>
                    <div className="text-xs text-[#8C8880] mt-0.5">{form.vendor_name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-[#C8522A]">
                    NT$ {(form.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-[#8C8880]">
                    {formatDateTime(form.submitted_at)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1.5 rounded-md text-xs font-bold border ${STATUS_BADGE[form.status]?.cls || ''}`}>
                      {STATUS_BADGE[form.status]?.label || form.status}
                    </span>
                    {form.status === 'rejected' && form.reject_reason && (
                      <div className="text-[10px] text-red-500 mt-1 max-w-[180px]">{form.reject_reason}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={form.cloud_link_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#C8522A] hover:underline"
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
                          className="inline-flex items-center gap-1.5 bg-[#1A1A18] text-[#F5F0E8] px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-all disabled:opacity-50"
                        >
                          {processingFormId === form.form_id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          審核通過
                        </button>
                        <button
                          onClick={() => openRejectModal(form)}
                          disabled={processingFormId === form.form_id}
                          className="inline-flex items-center gap-1.5 bg-white border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-all disabled:opacity-50"
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

      {rejectingForm && (
        <div
          className="fixed inset-0 bg-[#1A1A18]/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4"
          onClick={() => setRejectingForm(null)}
        >
          <div
            className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-[#E2DDD4]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#1A1A18] mb-1">退回勞報單</h3>
            <p className="text-xs font-bold text-[#8C8880] mb-5">
              {rejectingForm.koc_name}・{rejectingForm.campaign_name}
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_REJECT_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectReason(reason)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F5F0E8] text-[#8C8880] hover:bg-[#E2DDD4] hover:text-[#1A1A18] transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="請輸入退回原因，將會寄信通知網紅"
              className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none focus:ring-4 focus:ring-[#C8522A]/10 focus:border-[#C8522A] transition-all mb-2 resize-none"
            />
            {rejectError && (
              <p className="text-xs font-bold text-red-600 mb-3">{rejectError}</p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRejectingForm(null)}
                className="flex-1 bg-white border border-[#E2DDD4] text-[#8C8880] py-3 rounded-xl font-bold text-sm hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={processingFormId === rejectingForm.form_id}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingFormId === rejectingForm.form_id && <Loader2 size={16} className="animate-spin" />}
                確認退回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
