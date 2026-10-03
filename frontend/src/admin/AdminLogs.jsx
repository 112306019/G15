import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { formatApiError, getErrorMessage } from '../errorMessage';
import { Search, Filter, ShieldAlert, CheckCircle, Edit, FileText, History, AlertCircle } from 'lucide-react';

const ALL_TYPES = 'all';
const PAGE_SIZE = 20;

// 依 action_type 代碼判斷徽章樣式：成功類（核准、撥款完成、同意退款）、
// 負面類（退回、失敗、維持拒絕），其餘為一般狀態變更
const getActionTone = (type = '') => {
  if (type.startsWith('reject') || type.endsWith('_reject') || type.includes('failed')) {
    return 'negative';
  }
  if (
    type.startsWith('approve') ||
    type.endsWith('_approve') ||
    type.endsWith('_paid') ||
    type.endsWith('_completed') ||
    type === 'confirm_vendor_monthly_payout'
  ) {
    return 'positive';
  }
  return 'neutral';
};

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState(ALL_TYPES);

  const token = localStorage.getItem("admin_token");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/platform/audit/logs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !Array.isArray(data)) {
          throw new Error(formatApiError(data?.err) || "操作紀錄載入失敗");
        }

        // 💡 在這裡將資料依據 created_at 進行降冪排序（新到舊）
        const sortedData = data.sort((a, b) => {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          return timeB - timeA;
        });

        setLogs(sortedData.map((log) => ({
          logId: `LOG-${log.Log_id}`,
          adminId: `ADMIN-${log.Admin_id}`,
          adminName: log.Admin_name || "",
          actionType: log.Action_type,
          // 中文名稱由後端 AUDIT_ACTION_LABELS 提供，沒對應到的才顯示原始代碼
          actionLabel: log.Action_label || log.Action_type,
          target: [
            log.Vendor_id ? `廠商：${log.Vendor_id}` : null,
            log.Influencer_id ? `KOC：${log.Influencer_id}` : null,
            log.Submission_id ? `投稿：${log.Submission_id}` : null,
            log.Tasks_id ? `任務：${log.Tasks_id}` : null,
          ].filter(Boolean).join(" / ") || "-",
          actionReason: log.Action_reason || "-",
          createdAt: log.created_at
            ? new Date(log.created_at).toLocaleString("zh-TW", { hour12: false })
            : "-",
        })));
      } catch (err) {
        console.error("操作紀錄載入失敗", err);
        setError(getErrorMessage(err, "操作紀錄載入失敗，請稍後再試"));
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [token]);

  const getActionBadge = (type) => {
    switch (getActionTone(type)) {
      case 'positive':
        return { icon: <CheckCircle size={14} className="sm:w-4 sm:h-4" />, color: 'text-[#B89B6A] bg-[#F5F0E8] border-[#B89B6A]/30' };
      case 'negative':
        return { icon: <ShieldAlert size={14} className="sm:w-4 sm:h-4" />, color: 'text-[#C8522A] bg-[#FDF0ED] border-[#C8522A]/20' };
      default:
        return { icon: <Edit size={14} className="sm:w-4 sm:h-4" />, color: 'text-[#1A1A18] bg-white border-[#E2DDD4] shadow-sm' };
    }
  };

  // 篩選選單只列出實際出現過的操作類型，顯示中文、比對用代碼
  const typeOptions = Array.from(
    new Map(logs.map((log) => [log.actionType, log.actionLabel])).entries()
  );

  const filtered = logs.filter((log) => {
    const matchSearch =
      !search.trim() ||
      log.adminId?.includes(search) ||
      log.adminName?.includes(search) ||
      log.actionLabel?.includes(search) ||
      log.target?.includes(search) ||
      log.logId?.includes(search);
    const matchType =
      filterType === ALL_TYPES || log.actionType === filterType;
    return matchSearch && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // 篩選後筆數變少時，目前頁碼可能超出範圍
  const currentPage = Math.min(page, totalPages);
  const pageLogs = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // 換篩選條件或搜尋時回到第 1 頁
  useEffect(() => {
    setPage(1);
  }, [search, filterType]);

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-10">

      {/* 頂部標題與工具列 (自適應排列) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-black text-[#1A1A18] tracking-tight flex items-center gap-3">
            系統操作紀錄
            <span className="text-[10px] md:text-xs font-bold bg-[#F8F9FA] text-[#8C8880] px-2.5 py-1 rounded-md tracking-wider font-sans border border-[#E2DDD4]">
              System Logs
            </span>
          </h1>
          <p className="text-[#8C8880] mt-1.5 md:mt-2 text-xs md:text-sm font-medium">追蹤所有管理員的審核、停權與狀態變更紀錄，以確保系統安全。</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-[#E2DDD4] rounded-xl text-xs md:text-sm font-bold text-[#8C8880] outline-none focus:border-[#C8522A] shadow-sm appearance-none cursor-pointer"
          >
            <option value={ALL_TYPES}>所有操作類型</option>
            {typeOptions.map(([type, label]) => (
              <option key={type} value={type}>{label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none">
            <div className="relative flex-1 md:w-64">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8880]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜尋管理員、操作類型或目標..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD4] rounded-xl text-xs md:text-sm outline-none focus:border-[#C8522A] focus:ring-2 focus:ring-[#C8522A]/10 transition-all shadow-sm"
              />
            </div>
            <button className="flex items-center justify-center w-10 h-10 shrink-0 bg-[#1A1A18] text-[#F5F0E8] rounded-xl hover:bg-[#333] transition-all shadow-sm">
              <Filter size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 紀錄列表區塊 */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-[#8C8880]">載入中...</div>
        ) : error ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#C8522A]">
            <AlertCircle size={28} />
            <span className="text-sm font-bold">{error}</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-bold text-[#1A1A18] border border-[#E2DDD4] rounded-xl bg-white hover:bg-[#F8F9FA] transition-colors"
            >
              重新載入
            </button>
          </div>
        ) : (
          <>
            {/* === 手機版視圖 (卡片式) === */}
            <div className="md:hidden flex flex-col divide-y divide-[#E2DDD4]">
              {filtered.length === 0 ? (
                <div className="p-10 text-center text-sm font-bold text-[#8C8880] flex flex-col items-center gap-3">
                  <History size={28} className="text-[#E2DDD4]" />
                  <span>目前沒有符合條件的操作紀錄</span>
                </div>
              ) : (
                pageLogs.map((log) => {
                  const badge = getActionBadge(log.actionType);
                  const [datePart, timePart] = log.createdAt.split(" ");
                  return (
                    <div key={log.logId} className="p-5 sm:p-6 hover:bg-[#F5F0E8]/30 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-sm font-black text-[#1A1A18] leading-tight">{datePart}</div>
                          <div className="text-[11px] font-medium text-[#8C8880] mt-0.5">{timePart}</div>
                          <div className="text-[9px] text-[#8C8880] mt-1 tracking-wider">{log.logId}</div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md border tracking-widest ${badge.color}`}>
                          {badge.icon}
                          {log.actionLabel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#1A1A18] text-[#F5F0E8] flex items-center justify-center font-bold text-[10px] shadow-sm shrink-0">
                            A
                          </div>
                          <span className="text-xs font-bold text-[#1A1A18]">{log.adminName || log.adminId}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#C8522A] bg-[#FDF0ED] px-2 py-1 rounded-md border border-[#C8522A]/10 truncate max-w-[150px]">
                          {log.target}
                        </span>
                      </div>

                      <div className="flex items-start gap-2 text-[11px] sm:text-xs text-[#8C8880] font-medium bg-[#F8F9FA] p-3 sm:p-3.5 rounded-xl border border-[#E2DDD4]/50">
                        <FileText size={14} className="shrink-0 mt-0.5 text-[#1A1A18]" />
                        <p className="leading-relaxed break-words whitespace-pre-wrap">{log.actionReason}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* === 電腦版視圖 (表格) === */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                    <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">時間 / 紀錄編號</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">操作管理員</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">操作類型</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">關聯目標</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">操作原因 / 備註</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DDD4]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-sm font-bold text-[#8C8880]">目前沒有操作紀錄</td>
                    </tr>
                  ) : pageLogs.map((log) => {
                    const badge = getActionBadge(log.actionType);
                    const [datePart, timePart] = log.createdAt.split(" ");
                    return (
                      <tr key={log.logId} className="hover:bg-[#F5F0E8]/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="text-sm font-black text-[#1A1A18]">{datePart}</div>
                          <div className="text-xs font-medium text-[#8C8880] mt-0.5">{timePart}</div>
                          <div className="text-[10px] text-[#8C8880] mt-1 tracking-wider">{log.logId}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#1A1A18] text-[#F5F0E8] flex items-center justify-center font-bold text-[10px] shadow-sm">
                              A
                            </div>
                            <div>
                              <div className="text-sm font-bold text-[#1A1A18]">{log.adminName || log.adminId}</div>
                              {log.adminName && (
                                <div className="text-[10px] text-[#8C8880] tracking-wider">{log.adminId}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-md border tracking-widest ${badge.color}`}>
                            {badge.icon}
                            {log.actionLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-[#C8522A] bg-[#FDF0ED] px-2.5 py-1.5 rounded-md border border-[#C8522A]/10">
                            {log.target}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-sm">
                          <div className="flex items-start gap-2 text-xs text-[#8C8880] font-medium bg-[#F8F9FA] p-3 rounded-xl border border-[#E2DDD4] whitespace-normal break-words">
                            <FileText size={16} className="shrink-0 mt-0.5 text-[#1A1A18]" />
                            <p className="leading-relaxed">{log.actionReason}</p>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 表格底部分頁 */}
            <div className="p-4 sm:p-5 border-t border-[#E2DDD4] bg-[#F8F9FA] flex flex-col sm:flex-row justify-between items-center gap-3 text-xs sm:text-sm font-medium text-[#8C8880]">
              <span>共 {filtered.length} 筆紀錄・第 {currentPage} / {totalPages} 頁</span>
              <div className="flex gap-2">
                {[
                  { label: '上一頁', target: currentPage - 1, disabled: currentPage <= 1 },
                  { label: '下一頁', target: currentPage + 1, disabled: currentPage >= totalPages },
                ].map(({ label, target, disabled }) => (
                  <button
                    key={label}
                    type="button"
                    disabled={disabled}
                    onClick={() => setPage(target)}
                    className={`px-3 py-1.5 border border-[#E2DDD4] rounded-lg bg-white transition-colors ${
                      disabled
                        ? 'text-[#E2DDD4] cursor-not-allowed'
                        : 'text-[#1A1A18] hover:bg-[#FDF0ED] hover:text-[#C8522A]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}