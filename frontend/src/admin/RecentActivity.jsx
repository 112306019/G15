import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Loader2, AlertCircle } from 'lucide-react';
import { getAdminAuditLogs } from '../api/platform';
import { getErrorMessage } from '../errorMessage';
import { getAuditActionLabel } from './auditActionLabels';

const RECENT_LIMIT = 3;

// 2026-10-03T10:00:00 → 「10 分鐘前」；超過 7 天顯示日期
const fmtRelativeTime = value => {
  if (!value) return '';
  const diffMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (diffMinutes < 1) return '剛剛';
  if (diffMinutes < 60) return `${diffMinutes} 分鐘前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小時前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} 天前`;
  return new Date(value).toLocaleDateString('zh-TW');
};

// 操作對象：依紀錄有帶的欄位顯示廠商、KOC 或任務編號
const describeTarget = log => {
  if (log.Vendor_id) return `廠商 ${log.Vendor_id}`;
  if (log.Influencer_id) return `KOC ${log.Influencer_id}`;
  if (log.Tasks_id) return `任務 ${log.Tasks_id}`;
  return '';
};

export default function RecentActivity({ currentRole }) {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await getAdminAuditLogs({ limit: RECENT_LIMIT });
        if (cancelled) return;
        // 前端也自己排序、截取：舊版後端不支援 limit，會回傳全部且未排序的紀錄
        const data = Array.isArray(response.data) ? response.data : [];
        const latest = [...data]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, RECENT_LIMIT);
        setLogs(latest);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, '操作紀錄載入失敗'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-white p-5 sm:p-8 rounded-[1.5rem] shadow-sm border border-[#E2DDD4] flex flex-col">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1A1A18]">最新系統動態</h2>
        <span className="text-[10px] sm:text-xs font-bold text-[#8C8880] bg-[#F8F9FA] px-2 sm:px-3 py-1 rounded-full border border-[#E2DDD4]">
          最近 {RECENT_LIMIT} 筆
        </span>
      </div>

      <div className="space-y-3 sm:space-y-4 flex-1">
        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-[#8C8880]">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs sm:text-sm font-bold">讀取中...</span>
          </div>
        ) : error ? (
          <div className="py-10 flex items-center justify-center gap-2 text-[#C8522A]">
            <AlertCircle size={16} />
            <span className="text-xs sm:text-sm font-bold">{error}</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center text-xs sm:text-sm font-bold text-[#8C8880]">
            目前還沒有管理員操作紀錄
          </div>
        ) : (
          logs.map(log => {
            const target = describeTarget(log);
            return (
              <div key={log.Log_id} className="flex justify-between items-center gap-3 p-3 sm:p-4 hover:bg-[#F5F0E8] rounded-xl sm:rounded-2xl border border-[#E2DDD4] transition-colors">
                <div className="flex items-start gap-2.5 sm:gap-4 min-w-0">
                  <div className="mt-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#B89B6A] rounded-full shrink-0"></div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#1A1A18] truncate">
                      {getAuditActionLabel(log)}
                    </p>
                    <p className="text-[10px] sm:text-xs font-medium text-[#8C8880] mt-0.5 sm:mt-1 truncate">
                      {log.Admin_name || `管理員 ${log.Admin_id}`}
                      {target && ` ・ ${target}`}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] sm:text-[10px] text-[#8C8880] font-bold shrink-0">
                  {fmtRelativeTime(log.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* 只有特定權限可以進入完整 Log 頁面 */}
      {(currentRole === 'super_admin' || currentRole === 'reviewer') && (
        <button onClick={() => navigate('/admin/logs')} className="w-full mt-4 sm:mt-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-[#1A1A18] border border-[#E2DDD4] rounded-xl hover:bg-[#F8F9FA] transition-colors flex items-center justify-center gap-2">
          <History size={14} className="sm:w-4 sm:h-4" /> 查看完整操作紀錄
        </button>
      )}
    </div>
  );
}
