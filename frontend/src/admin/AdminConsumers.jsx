import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronRight } from 'lucide-react';

export default function AdminConsumers() {
  const navigate = useNavigate();
  const [consumers, setConsumers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const token = localStorage.getItem("admin_token");

  useEffect(() => {
    const fetchConsumers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/platform/consumers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setConsumers(data.map((u) => ({
            id: u.User_id,
            name: u.Name,
            email: u.Email,
            phone: u.Phone,
            status: "active",
            createdAt: u.Created_At
              ? new Date(u.Created_At).toLocaleDateString("zh-TW")
              : "-",
          })));
        }
      } catch (err) {
        console.error("使用者列表載入失敗", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConsumers();
  }, []);

  const filtered = consumers.filter(
    (c) =>
      c.name?.includes(search) ||
      c.email?.includes(search) ||
      c.id?.includes(search)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* 頂部標題與工具列 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-[#1A1A18] tracking-tight flex items-center gap-3">
            一般使用者管理
            <span className="text-xs font-bold bg-[#F5F0E8] text-[#8C8880] px-2.5 py-1 rounded-md tracking-wider font-sans border border-[#E2DDD4]">
              共 {filtered.length} 筆
            </span>
          </h1>
          <p className="text-[#8C8880] mt-2 font-medium">檢視平台所有一般消費者的註冊與帳號狀態。</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8880]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋姓名、Email..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD4] rounded-xl text-sm outline-none focus:border-[#C8522A] focus:ring-2 focus:ring-[#C8522A]/10 transition-all shadow-sm"
            />
          </div>
          <button className="flex items-center justify-center w-10 h-10 bg-white border border-[#E2DDD4] rounded-xl text-[#1A1A18] hover:bg-[#F8F9FA] hover:border-[#1A1A18] transition-all shadow-sm">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* 列表卡片 */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-[#8C8880] font-bold">載入中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">使用者</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">聯絡資訊</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">註冊時間</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">狀態</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center text-sm font-bold text-[#8C8880]">
                      目前沒有符合條件的一般使用者
                    </td>
                  </tr>
                ) : (
                  filtered.map((consumer) => (
                    <tr key={consumer.id} className="hover:bg-[#F5F0E8]/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#F8F9FA] text-[#1A1A18] border border-[#E2DDD4] flex items-center justify-center font-serif font-black text-lg">
                            {consumer.name?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-[#1A1A18]">{consumer.name}</div>
                            <div className="text-xs font-medium text-[#8C8880]">ID: {consumer.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-[#1A1A18]">{consumer.email}</div>
                        <div className="text-xs font-medium text-[#8C8880] mt-0.5">{consumer.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[#8C8880]">
                        {consumer.createdAt}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border ${
                          consumer.status === 'active'
                            ? 'bg-white text-[#1A1A18] border-[#1A1A18]'
                            : 'bg-[#F8F9FA] text-[#8C8880] border-[#E2DDD4]'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${consumer.status === 'active' ? 'bg-[#1A1A18]' : 'bg-[#8C8880]'}`}></div>
                          {consumer.status === 'active' ? '正常' : '已停權'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => navigate(`/admin/consumers/${consumer.id}`)}
                          className="inline-flex items-center gap-1 bg-white border border-[#E2DDD4] text-[#1A1A18] px-4 py-2 rounded-lg text-xs font-bold hover:border-[#1A1A18] hover:shadow-sm transition-all"
                        >
                          查看明細 <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 表格底部分頁 */}
        <div className="p-4 border-t border-[#E2DDD4] bg-[#F8F9FA] flex justify-between items-center text-sm font-medium text-[#8C8880]">
          <span>共 {filtered.length} 筆資料</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-[#E2DDD4] rounded bg-white text-[#E2DDD4] cursor-not-allowed">上一頁</button>
            <button className="px-3 py-1 border border-[#E2DDD4] rounded bg-white hover:bg-[#FDF0ED] hover:text-[#C8522A] transition-colors cursor-not-allowed text-[#E2DDD4]">下一頁</button>
          </div>
        </div>
      </div>
    </div>
  );
}