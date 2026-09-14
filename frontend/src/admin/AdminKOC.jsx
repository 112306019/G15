import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ClipboardCheck, ChevronRight, Users } from 'lucide-react';
import { getKOCList } from '../api/platform';

export default function AdminKOC() {
  const navigate = useNavigate();

  const [kocs, setKocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getKOCList();
        if (res.data.success) {
          setKocs(res.data.koc_list || []);
        } else {
          setError(res.data.err || '載入失敗');
        }
      } catch (err) {
        console.error('載入 KOC 列表失敗', err);
        setError('載入失敗，請稍後再試');
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, []);

  const filteredKOCs = kocs.filter((koc) => {
    if (!keyword.trim()) return true;
    const kw = keyword.trim().toLowerCase();
    return (
      koc.name?.toLowerCase().includes(kw) ||
      koc.ig_account?.toLowerCase().includes(kw) ||
      koc.fb_account?.toLowerCase().includes(kw) ||
      koc.threads_account?.toLowerCase().includes(kw)
    );
  });

  const handleViewDetail = (koc) => {
    // 修正路徑以對應 AdminApp.jsx 中的設定
    navigate(`/admin/koc/${koc.koc_id}`, { state: { koc } });
  };

  // 狀態標籤組件
  const renderStatusBadge = (status) => {
    const isEnabled = status === 0;
    return (
      <span className={`inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold px-2 md:px-2.5 py-1 rounded-md border ${
        isEnabled
          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
          : 'bg-red-50 text-red-600 border-red-200'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
        {isEnabled ? '已啟用' : '已停權'}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-10">

      {/* 頂部標題與工具列 (自適應排列) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-black text-[#1A1A18] tracking-tight flex items-center gap-3">
            KOC 帳號管理
            <span className="text-[10px] md:text-xs font-bold bg-[#F5F0E8] text-[#8C8880] px-2.5 py-1 rounded-md tracking-wider font-sans border border-[#E2DDD4]">
              共 {filteredKOCs.length} 筆
            </span>
          </h1>
          <p className="text-[#8C8880] mt-1.5 md:mt-2 text-xs md:text-sm font-medium">檢視平台所有已通過審核的 KOC 資料與社群狀態。</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* 搜尋框 */}
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8880]" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜尋姓名或社群帳號..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD4] rounded-xl text-xs md:text-sm outline-none focus:border-[#C8522A] focus:ring-2 focus:ring-[#C8522A]/10 transition-all shadow-sm"
            />
          </div>
          <button
            // 修正路徑以對應 AdminApp.jsx 中的設定
            onClick={() => navigate('/admin/koc/pending')}
            className="flex items-center justify-center gap-2 bg-[#1A1A18] text-[#F5F0E8] px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold hover:bg-[#C8522A] transition-all shadow-sm shrink-0"
          >
            <ClipboardCheck size={16} /> 待審核申請
          </button>
        </div>
      </div>

      {/* 列表內容區塊 */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden">
        
        {/* === 手機版視圖 (卡片式) === */}
        <div className="md:hidden flex flex-col divide-y divide-[#E2DDD4]">
          {loading && <div className="p-10 text-center text-sm font-bold text-[#8C8880]">載入中...</div>}
          {!loading && error && <div className="p-10 text-center text-sm font-bold text-red-500">{error}</div>}
          {!loading && !error && filteredKOCs.length === 0 && (
            <div className="p-10 text-center text-sm font-bold text-[#8C8880] flex flex-col items-center gap-3">
              <Users size={28} className="text-[#E2DDD4]" />
              <span>目前沒有已通過審核的 KOC</span>
            </div>
          )}

          {!loading && !error && filteredKOCs.map((koc) => (
            <div key={koc.koc_id} className="p-5 sm:p-6 hover:bg-[#FDF0ED]/30 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#1A1A18] text-[#F5F0E8] flex items-center justify-center font-serif font-black text-xl shrink-0 shadow-sm">
                    {koc.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[#1A1A18] text-sm truncate">{koc.name}</div>
                    <div className="text-[11px] font-medium text-[#8C8880] truncate mt-0.5">ID: {koc.koc_id}</div>
                  </div>
                </div>
                {renderStatusBadge(koc.status)}
              </div>

              <div className="bg-[#F8F9FA] rounded-xl p-3.5 mb-4 flex flex-col gap-2 border border-[#E2DDD4]/50">
                <span className="text-[10px] font-bold text-[#8C8880]">綁定社群</span>
                <div className="flex flex-wrap gap-1.5">
                  {koc.ig_account && (
                    <span className="text-[11px] font-bold text-[#8C8880] bg-white border border-[#E2DDD4] px-2 py-1 rounded-md shadow-sm">IG @{koc.ig_account}</span>
                  )}
                  {koc.fb_account && (
                    <span className="text-[11px] font-bold text-[#8C8880] bg-white border border-[#E2DDD4] px-2 py-1 rounded-md shadow-sm">FB {koc.fb_account}</span>
                  )}
                  {koc.threads_account && (
                    <span className="text-[11px] font-bold text-[#8C8880] bg-white border border-[#E2DDD4] px-2 py-1 rounded-md shadow-sm">Threads @{koc.threads_account}</span>
                  )}
                  {!koc.ig_account && !koc.fb_account && !koc.threads_account && (
                    <span className="text-[11px] font-medium text-[#8C8880]">未綁定</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleViewDetail(koc)}
                className="w-full flex justify-center items-center gap-1 bg-white border border-[#E2DDD4] text-[#1A1A18] px-4 py-2.5 rounded-xl text-xs font-bold hover:border-[#1A1A18] hover:bg-[#F5F0E8] transition-all shadow-sm"
              >
                查看數據 <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* === 電腦版視圖 (表格) === */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">KOC 用戶</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">社群帳號</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">狀態</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4]">
              {loading && (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center text-sm font-bold text-[#8C8880]">載入中...</td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center text-sm font-bold text-red-500">{error}</td>
                </tr>
              )}

              {!loading && !error && filteredKOCs.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center text-sm font-bold text-[#8C8880]">目前沒有已通過審核的 KOC</td>
                </tr>
              )}

              {!loading && !error && filteredKOCs.map((koc) => (
                <tr key={koc.koc_id} className="hover:bg-[#FDF0ED]/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1A1A18] text-[#F5F0E8] flex items-center justify-center font-serif font-black text-lg shadow-sm">
                        {koc.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-[#1A1A18]">{koc.name}</div>
                        <div className="text-xs font-medium text-[#8C8880]">ID: {koc.koc_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                      {koc.ig_account && (
                        <span className="inline-block whitespace-nowrap text-xs font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md">IG @{koc.ig_account}</span>
                      )}
                      {koc.fb_account && (
                        <span className="inline-block whitespace-nowrap text-xs font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md">FB {koc.fb_account}</span>
                      )}
                      {koc.threads_account && (
                        <span className="inline-block whitespace-nowrap text-xs font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md">Threads @{koc.threads_account}</span>
                      )}
                      {!koc.ig_account && !koc.fb_account && !koc.threads_account && (
                        <span className="text-xs font-medium text-[#8C8880]">未綁定</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {renderStatusBadge(koc.status)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleViewDetail(koc)}
                      className="inline-flex items-center gap-1 bg-white border border-[#E2DDD4] text-[#1A1A18] px-4 py-2 rounded-lg text-xs font-bold hover:border-[#1A1A18] hover:shadow-sm transition-all"
                    >
                      查看數據 <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}