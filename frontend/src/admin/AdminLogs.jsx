import React, { useEffect, useState } from 'react';
import { Search, Filter, History, ShieldAlert, CheckCircle, Edit, FileText } from 'lucide-react';
import { getAdminAuditLogs } from '../api/platform';

export default function AdminLogs() {
  // 模擬從 API (GET /admin/audit/logs) 取得的操作紀錄資料
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 根據操作類型給予不同的視覺 Icon 與顏色
  const getActionBadge = (type) => {
    switch (type) {
      case '核准入駐':
      case '手動撥款':
        return { icon: <CheckCircle size={14} />, color: 'text-[#B89B6A] bg-[#F5F0E8] border-[#B89B6A]/30' };
      case '停權處分':
        return { icon: <ShieldAlert size={14} />, color: 'text-[#C8522A] bg-[#FDF0ED] border-[#C8522A]/20' };
      case '狀態更新':
      default:
        return { icon: <Edit size={14} />, color: 'text-[#1A1A18] bg-white border-[#E2DDD4]' };
    }
  };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await getAdminAuditLogs();

        const logData = response.data.map((log) => {
          let target = '-';

          if (log.Vendor_id) {
            target = `Vendor: ${log.Vendor_id}`;
          } else if (log.Influencer_id) {
            target = `KOC: ${log.Influencer_id}`;
          } else if (log.Submission_id) {
            target = `Submission: ${log.Submission_id}`;
          } else if (log.Tasks_id) {
            target = `Task: ${log.Tasks_id}`;
          }

          const actionLabels = {
            review_vendor: '廠商審核',
            approve_vendor: '核准廠商',
            reject_vendor: '拒絕廠商',
            approve_koc: '核准 KOC',
            reject_koc: '拒絕 KOC',
          };

          return {
            logId: `LOG-${log.Log_id}`,
            adminId: `ADMIN-${log.Admin_id}`,
            actionType:
              actionLabels[log.Action_type] ||
              log.Action_type,
            target,
            actionReason:
              log.Action_reason || '未填寫原因',
            createdAt: log.created_at
              ? new Date(log.created_at).toLocaleString('zh-TW')
              : '-',
          };
        });

        setLogs(logData);
      } catch (err) {
        console.error('取得操作紀錄失敗：', err);

        setError(
          err.response?.data?.err ||
          '取得操作紀錄失敗'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* 🟢 頂部標題與工具列 */}
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
          {/* 下拉選單：篩選操作類型 */}
          <select className="px-4 py-2.5 bg-white border border-[#E2DDD4] rounded-xl text-sm font-bold text-[#8C8880] outline-none focus:border-[#C8522A] shadow-sm">
            <option>所有操作類型</option>
            <option>核准入駐</option>
            <option>停權處分</option>
            <option>狀態更新</option>
            <option>手動撥款</option>
          </select>
          
          {/* 搜尋框 */}
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8880]" />
            <input 
              type="text" 
              placeholder="搜尋管理員 ID 或關聯目標..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD4] rounded-xl text-sm outline-none focus:border-[#C8522A] focus:ring-2 focus:ring-[#C8522A]/10 transition-all shadow-sm"
            />
          </div>
          <button className="flex items-center justify-center w-10 h-10 bg-[#1A1A18] text-[#F5F0E8] rounded-xl hover:bg-[#333] transition-all shadow-sm">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-[#E2DDD4] rounded-xl p-4 text-sm font-bold text-[#8C8880]">
          操作紀錄載入中...
        </div>
      )}

      {error && (
        <div className="bg-[#FDF0ED] border border-[#C8522A]/20 rounded-xl p-4 text-sm font-bold text-[#C8522A]">
          {error}
        </div>
      )}

      {/* 🟢 紀錄列表 (Table) */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">時間 / 紀錄編號</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">操作管理員</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">操作類型</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">關聯目標 (Target)</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider w-1/3">操作原因 / 備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4]">
              {logs.map((log) => {
                const badge = getActionBadge(log.actionType);
                return (
                  <tr key={log.logId} className="hover:bg-[#F5F0E8]/50 transition-colors group">
                    
                    {/* 時間與編號 */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-[#1A1A18]">{log.createdAt}</div>
                      <div className="text-[10px] text-[#8C8880] mt-1 tracking-wider">{log.logId}</div>
                    </td>
                    
                    {/* 操作管理員 */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#1A1A18] text-[#F5F0E8] flex items-center justify-center font-bold text-[10px]">
                          {log.adminId.charAt(6)}
                        </div>
                        <span className="text-sm font-bold text-[#1A1A18]">{log.adminId}</span>
                      </div>
                    </td>

                    {/* 操作類型 */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-md border tracking-widest ${badge.color}`}>
                        {badge.icon}
                        {log.actionType}
                      </span>
                    </td>

                    {/* 關聯目標 */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-[#C8522A] bg-[#FDF0ED] px-2 py-1 rounded-md">
                        {log.target}
                      </span>
                    </td>

                    {/* 操作原因 */}
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
        
        {/* 表格底部分頁 */}
        <div className="p-4 border-t border-[#E2DDD4] bg-[#F8F9FA] flex justify-between items-center text-sm font-medium text-[#8C8880]">
          <span>顯示 1 至 4 筆，共 1,024 筆紀錄</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-[#E2DDD4] rounded bg-white text-[#E2DDD4] cursor-not-allowed">上一頁</button>
            <button className="px-3 py-1 border border-[#E2DDD4] rounded bg-white hover:bg-[#FDF0ED] hover:text-[#C8522A] transition-colors text-[#1A1A18] font-bold shadow-sm">下一頁</button>
          </div>
        </div>
      </div>
    </div>
  );
}