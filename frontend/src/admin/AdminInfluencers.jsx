import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ClipboardCheck, ChevronRight } from 'lucide-react';
import { getKOCList } from '../api/platform';

export default function AdminInfluencers() {
  const navigate = useNavigate();

  const [influencers, setInfluencers] = useState([]);
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
          setInfluencers(res.data.koc_list || []);
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

  const filteredInfluencers = influencers.filter((koc) => {
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
    navigate(`/admin/influencers/${koc.koc_id}`, { state: { koc } });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* 頂部標題與工具列 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-[#1A1A18] tracking-tight flex items-center gap-3">
            KOC 帳號管理
            <span className="text-xs font-bold bg-[#F5F0E8] text-[#8C8880] px-2.5 py-1 rounded-md tracking-wider font-sans border border-[#E2DDD4]">
              共 {filteredInfluencers.length} 筆
            </span>
          </h1>
          <p className="text-[#8C8880] mt-2 font-medium">檢視平台所有已通過審核的 KOC 資料與社群狀態。</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* 搜尋框 */}
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8880]" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜尋姓名或社群帳號..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD4] rounded-xl text-sm outline-none focus:border-[#C8522A] focus:ring-2 focus:ring-[#C8522A]/10 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => navigate('/admin/influencers/pending')}
            className="flex items-center gap-2 bg-[#1A1A18] text-[#F5F0E8] px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#C8522A] transition-all shadow-sm"
          >
            <ClipboardCheck size={16} /> 待審核申請
          </button>
        </div>
      </div>

      {/* 列表卡片 (Table) */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
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
                  <td colSpan="4" className="px-6 py-16 text-center text-sm font-bold text-[#8C8880]">
                    載入中...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center text-sm font-bold text-red-500">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && filteredInfluencers.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center text-sm font-bold text-[#8C8880]">
                    目前沒有已通過審核的 KOC
                  </td>
                </tr>
              )}

              {!loading && !error && filteredInfluencers.map((koc) => (
                <tr key={koc.koc_id} className="hover:bg-[#FDF0ED]/30 transition-colors group">

                  {/* 姓名與帳號 */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1A1A18] text-[#F5F0E8] flex items-center justify-center font-serif font-black text-lg">
                        {koc.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-[#1A1A18]">{koc.name}</div>
                        <div className="text-xs font-medium text-[#8C8880]">{koc.koc_id}</div>
                      </div>
                    </div>
                  </td>

                  {/* 社群帳號 */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {koc.ig_account && (
                        <span className="text-xs font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md">IG @{koc.ig_account}</span>
                      )}
                      {koc.fb_account && (
                        <span className="text-xs font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md">FB {koc.fb_account}</span>
                      )}
                      {koc.threads_account && (
                        <span className="text-xs font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md">Threads @{koc.threads_account}</span>
                      )}
                      {!koc.ig_account && !koc.fb_account && !koc.threads_account && (
                        <span className="text-xs font-medium text-[#8C8880]">未綁定</span>
                      )}
                    </div>
                  </td>

                  {/* 狀態 */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border ${
                      koc.status === 0
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${koc.status === 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      {koc.status === 0 ? '已啟用' : '已停權'}
                    </span>
                  </td>

                  {/* 操作按鈕 (跳轉至詳細頁) */}
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