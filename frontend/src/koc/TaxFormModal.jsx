import React, { useState } from 'react';
import { AlertCircle, Download, Loader2, X } from 'lucide-react';
import api from '../api/index';

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function TaxFormModal({ task, userId, onClose, onSubmitted }) {
  const [url, setUrl] = useState(task?.taxFormUrl || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isResubmit = task?.taxFormStatus === 'rejected';

  const handleSubmit = async () => {
    const trimmed = url.trim();

    if (!trimmed) {
      setError('請貼上雲端分享連結');
      return;
    }
    if (!isValidUrl(trimmed)) {
      setError('連結格式不正確，請確認是完整的網址（需以 http:// 或 https:// 開頭）');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const res = await api.post('/koc/mission/submitTaxFormLink', {
        User_id: userId,
        kocmission_id: task.id,
        url: trimmed,
      });

      if (!res.data.success) {
        throw new Error(res.data.err || '送出失敗');
      }

      onSubmitted?.(res.data.tax_form_status, res.data.tax_form_url);
      onClose?.();
    } catch (err) {
      const apiError = err.response?.data?.err;
      setError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : err.message || '送出失敗，請稍後再試'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[#1A1A18]/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-[#E2DDD4] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-bold text-[#1A1A18]">
            {isResubmit ? '重新上傳勞報單連結' : '上傳勞務報酬單連結'}
          </h3>
          <button onClick={onClose} className="text-[#8C8880] hover:text-[#1A1A18] transition-colors">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs font-bold text-[#8C8880] mb-6">{task?.productName}</p>

        {isResubmit && task?.taxFormRejectReason && (
          <div className="bg-[#FDF0ED] border border-[#C8522A]/20 rounded-2xl p-4 mb-5 text-xs text-[#C8522A] leading-relaxed">
            <span className="font-bold">上次退回原因：</span>
            {task.taxFormRejectReason}
          </div>
        )}

        {/* 案件資訊 */}
        <div className="bg-[#F8F9FA] rounded-2xl p-5 mb-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#8C8880] font-bold">專案名稱</span>
            <span className="text-[#1A1A18] font-bold">{task?.productName || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8C8880] font-bold">廠商</span>
            <span className="text-[#1A1A18] font-bold">{task?.vendor || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8C8880] font-bold">分潤金額</span>
            <span className="text-[#C8522A] font-black">
              NT$ {(task?.earningsTotal || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* 開啟勞報單列印頁面：瀏覽器直接渲染表單，用「列印/儲存為 PDF」輸出 */}
        <a
          href={`/tax-form-print/${task?.id}`}
          target="_blank"
          rel="noreferrer"
          className="w-full mb-5 flex items-center justify-center gap-2 bg-[#1A1A18] text-[#F5F0E8] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#C8522A] transition-all active:scale-95 shadow-md"
        >
          <Download size={16} />
          開啟勞務報酬單（可列印/存 PDF）
        </a>

        {/* 連結輸入 */}
        <label className="block text-xs font-bold text-[#1A1A18] mb-2">
          請貼上您的雲端分享連結（Google Drive / Dropbox）
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://drive.google.com/..."
          className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none focus:ring-4 focus:ring-[#C8522A]/10 focus:border-[#C8522A] transition-all mb-2"
        />
        {error && (
          <p className="text-xs font-bold text-[#C8522A] mb-3">{error}</p>
        )}

        {/* 警示提示 */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-xs text-amber-800 leading-relaxed flex gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">注意事項：</span>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>請將簽署好的檔案（PDF 或清晰照片）上傳至您的雲端硬碟。</li>
              <li>
                請務必將權限開啟為「<span className="font-bold">知道連結的人皆可檢視</span>」，
                否則財務無法審核將被退回。
              </li>
            </ol>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 bg-white border border-[#E2DDD4] text-[#8C8880] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-[#1A1A18] text-[#F5F0E8] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#C8522A] transition-all active:scale-95 shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            送出審核
          </button>
        </div>
      </div>
    </div>
  );
}
