import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronRight, Mail, Phone, Clock, Users } from 'lucide-react';
import { API_BASE_URL } from '../config'; // 確保有引入 API 網址設定

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
  }, [token]);

  const filtered = consumers.filter(
    (c) =>
      c.name?.includes(search) ||
      c.email?.includes(search) ||
      c.id?.toString().includes(search)
  );

  const renderStatusBadge = (status) => {
    const isActive = status === 'active';
    return (
      <span className={`inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold px-2 md:px-2.5 py-1 rounded-md border ${
        isActive
          ? 'bg-white text-brand border-brand shadow-sm'
          : 'bg-mist text-muted border-edge'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-brand' : 'bg-muted'}`}></div>
        {isActive ? '正常' : '已停權'}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-10">

      {/* 頂部標題與工具列 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 md:mb-8 gap-4">
        <div>
          <p className="font-mono text-brand font-medium text-[10px] md:text-xs tracking-[0.25em] mb-2 md:mb-2.5 uppercase">MEMBERS</p>
          <h1 className="text-2xl md:text-[28px] font-display font-bold text-ink flex items-center gap-3">
            一般使用者管理
            <span className="text-[10px] md:text-xs font-bold bg-cream text-muted px-2.5 py-1 rounded-md tracking-wider font-sans border border-edge">
              共 {filtered.length} 筆
            </span>
          </h1>
          <p className="text-muted mt-1.5 md:mt-2 text-xs md:text-sm font-medium">檢視平台所有一般消費者的註冊與帳號狀態。</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋姓名、Email、ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-edge rounded-xl text-xs md:text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all shadow-sm"
            />
          </div>
          <button className="flex items-center justify-center w-10 h-10 shrink-0 bg-white border border-edge rounded-xl text-ink hover:bg-mist hover:border-brand transition-all shadow-sm">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* 列表內容區塊 */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-edge overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-muted">載入中...</div>
        ) : (
          <>
            <div className="md:hidden flex flex-col divide-y divide-edge">
              {filtered.length === 0 ? (
                <div className="p-10 text-center text-sm font-bold text-muted flex flex-col items-center gap-3">
                  <Users size={28} className="text-edge" />
                  <span>目前沒有符合條件的使用者</span>
                </div>
              ) : (
                filtered.map((consumer) => (
                  <div key={consumer.id} className="p-5 sm:p-6 hover:bg-cream/30 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-mist text-ink border border-edge flex items-center justify-center font-display font-black text-xl shrink-0 shadow-sm">
                          {consumer.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-ink text-sm truncate">{consumer.name}</div>
                          <div className="text-[11px] font-medium text-muted truncate mt-0.5">ID: {consumer.id}</div>
                        </div>
                      </div>
                      {renderStatusBadge(consumer.status)}
                    </div>

                    <div className="bg-mist rounded-xl p-3.5 mb-4 flex flex-col gap-2.5 border border-edge/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted flex items-center gap-1.5"><Mail size={13}/> 信箱</span>
                        <span className="font-bold text-ink truncate max-w-[150px]">{consumer.email}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted flex items-center gap-1.5"><Phone size={13}/> 電話</span>
                        <span className="font-bold text-ink">{consumer.phone || '未提供'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted flex items-center gap-1.5"><Clock size={13}/> 註冊時間</span>
                        <span className="font-bold text-ink">{consumer.createdAt}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/admin/consumers/${consumer.id}`)}
                      className="w-full flex justify-center items-center gap-1 bg-white border border-edge text-ink px-4 py-2.5 rounded-xl text-xs font-bold hover:border-brand hover:bg-cream transition-all shadow-sm"
                    >
                      查看明細 <ChevronRight size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-mist border-b border-edge">
                    <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">使用者</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">聯絡資訊</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">註冊時間</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">狀態</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-16 text-center text-sm font-bold text-muted">
                        目前沒有符合條件的一般使用者
                      </td>
                    </tr>
                  ) : (
                    filtered.map((consumer) => (
                      <tr key={consumer.id} className="hover:bg-cream/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-mist text-ink border border-edge flex items-center justify-center font-display font-black text-lg shadow-sm">
                              {consumer.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="font-bold text-ink">{consumer.name}</div>
                              <div className="text-xs font-medium text-muted">ID: {consumer.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-ink">{consumer.email}</div>
                          <div className="text-xs font-medium text-muted mt-0.5">{consumer.phone || '未提供電話'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-muted">
                          {consumer.createdAt}
                        </td>
                        <td className="px-6 py-4">
                          {renderStatusBadge(consumer.status)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => navigate(`/admin/consumers/${consumer.id}`)}
                            className="inline-flex items-center gap-1 bg-white border border-edge text-ink px-4 py-2 rounded-lg text-xs font-bold hover:border-brand hover:shadow-sm transition-all"
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

            {/* 表格底部分頁 */}
            <div className="p-4 sm:p-5 border-t border-edge bg-mist flex flex-col sm:flex-row justify-between items-center gap-3 text-xs sm:text-sm font-medium text-muted">
              <span>共 {filtered.length} 筆資料</span>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 border border-edge rounded-lg bg-white text-edge cursor-not-allowed">上一頁</button>
                <button className="px-3 py-1.5 border border-edge rounded-lg bg-white hover:bg-brand-soft hover:text-brand transition-colors cursor-not-allowed text-edge">下一頁</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}