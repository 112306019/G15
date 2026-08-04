import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { Search, Filter, History, ShieldAlert, CheckCircle, Edit, FileText } from 'lucide-react';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("所有操作類型");

  const token = localStorage.getItem("admin_token");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/platform/audit/logs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setLogs(data.map((log) => ({
            logId: `LOG-${log.Log_id}`,
            adminId: `ADMIN-${log.Admin_id}`,
            actionType: log.Action_type,
            target: [
              log.Vendor_id ? `Vendor: ${log.Vendor_id}` : null,
              log.Influencer_id ? `KOC: ${log.Influencer_id}` : null,
              log.Submission_id ? `Submission: ${log.Submission_id}` : null,
              log.Tasks_id ? `Task: ${log.Tasks_id}` : null,
            ].filter(Boolean).join(" / ") || "-",
            actionReason: log.Action_reason || "-",
            createdAt: log.created_at
              ? new Date(log.created_at).toLocaleString("zh-TW")
              : "-",
          })));
        }
      } catch (err) {
        console.error("操作紀錄載入失敗", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const getActionBadge = (type) => {
    switch (type) {
      case 'approve_koc':
      case '核准入駐':
      case '手動撥款':
        return { icon: <CheckCircle size={14} />, color: 'text-[#B89B6A] bg-[#F5F0E8] border-[#B89B6A]/30' };
      case 'reject_koc':
      case '停權處分':
        return { icon: <ShieldAlert size={14} />, color: 'text-[#C8522A] bg-[#FDF0ED] border-[#C8522A]/20' };
      case 'review_vendor':
      case '狀態更新':
      default:
        return { icon: <Edit size={14} />, color: 'text-[#1A1A18] bg-white border-[#E2DDD4]' };
    }
  };

  const filtered = logs.filter((log) => {
    const matchSearch =
      !search.trim() ||
      log.adminId?.includes(search) ||
      log.actionType?.includes(search) ||
      log.target?.includes(search) ||
      log.logId?.includes(search);
    const matchType =
      filterType === "所有操作類型" || log.actionType === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* 頂部標題與工具列 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-[#1A1A18] tracking-tight flex items-center gap-3">
            系統操作紀錄
            <span className="text-xs font-bold bg-[#F8F9FA] text-[#8C8880] px-2.5 py-1 rounded-md tracking-wider font-sans border border-[#E2DDD4]">
              System Logs
            </span>
          </h1>
          <p className="text-[#8C8880] mt-2 font-medium">追蹤所有管理員的審核、停權與狀態變更紀錄，以確保系統安全。</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 bg-white border border-[#E2DDD4] rounded-xl text-sm font-bold text-[#8C8880] outline-none focus:border-[#C8522A] shadow-sm"
          >
            <option>所有操作類型</option>
            <option>approve_koc</option>
            <option>reject_koc</option>
            <option>review_vendor</option>
          </select>

          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8880]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋管理員 ID 或關聯目標..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD4] rounded-xl text-sm outline-none focus:border-[#C8522A] focus:ring-2 focus:ring-[#C8522A]/10 transition-all shadow-sm"
            />
          </div>
          <button className="flex items-center justify-center w-10 h-10 bg-[#1A1A18] text-[#F5F0E8] rounded-xl hover:bg-[#333] transition-all shadow-sm">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* 紀錄列表 */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-[#8C8880] font-bold">載入中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">時間 / 紀錄編號</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">操作管理員</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">操作類型</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">關聯目標</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider w-1/3">操作原因 / 備註</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#8C8880]">目前沒有操作紀錄</td>
                  </tr>
                ) : filtered.map((log) => {
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
                          <div className="w-6 h-6 rounded-full bg-[#1A1A18] text-[#F5F0E8] flex items-center justify-center font-bold text-[10px]">
                            A
                          </div>
                          <span className="text-sm font-bold text-[#1A1A18]">{log.adminId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-md border tracking-widest ${badge.color}`}>
                          {badge.icon}
                          {log.actionType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-[#C8522A] bg-[#FDF0ED] px-2 py-1 rounded-md">
                          {log.target}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2 text-sm text-[#8C8880] font-medium bg-[#F8F9FA] p-3 rounded-xl border border-[#E2DDD4]">
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
        )}

        {/* 表格底部分頁 */}
        <div className="p-4 border-t border-[#E2DDD4] bg-[#F8F9FA] flex justify-between items-center text-sm font-medium text-[#8C8880]">
          <span>共 {filtered.length} 筆紀錄</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-[#E2DDD4] rounded bg-white text-[#E2DDD4] cursor-not-allowed">上一頁</button>
            <button className="px-3 py-1 border border-[#E2DDD4] rounded bg-white hover:bg-[#FDF0ED] hover:text-[#C8522A] transition-colors cursor-not-allowed text-[#E2DDD4]">下一頁</button>
          </div>
        </div>
      </div>
    </div>
  );
}
