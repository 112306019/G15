import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, MoreHorizontal, UserCheck, ChevronRight } from 'lucide-react';

export default function AdminInfluencers() {
  const navigate = useNavigate();

// 模擬從 API (GET /admin/influencers) 取得的 KOC 列表資料
  const [influencers] = useState([
    { id: 'KOC001', name: '王大寶', account: 'dabao.ig', email: 'dabao@example.com', phone: '0912-345-678', status: 'active', createdAt: '2026-07-01' },
    { id: 'KOC002', name: '林小美', account: 'mei_beauty', email: 'mei@example.com', phone: '0987-654-321', status: 'active', createdAt: '2026-07-10' },
    { id: 'KOC003', name: '陳阿神', account: 'ashin_chen', email: 'chen@example.com', phone: '0900-111-222', status: 'suspended', createdAt: '2026-06-15' },
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* 🟢 頂部標題與工具列 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-[#1A1A18] tracking-tight flex items-center gap-3">
            KOC 帳號管理
            <span className="text-xs font-bold bg-[#FDF0ED] text-[#C8522A] px-2.5 py-1 rounded-md tracking-wider font-sans border border-[#C8522A]/20">
              共 {influencers.length} 筆
            </span>
          </h1>
          <p className="text-[#8C8880] mt-2 font-medium">檢視平台所有註冊的 KOC 資料與社群狀態。</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* 搜尋框 */}
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8880]" />
            <input 
              type="text" 
              placeholder="搜尋姓名、Email 或 IG 帳號..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD4] rounded-xl text-sm outline-none focus:border-[#C8522A] focus:ring-2 focus:ring-[#C8522A]/10 transition-all shadow-sm"
            />
          </div>
          <button className="flex items-center justify-center w-10 h-10 bg-white border border-[#E2DDD4] rounded-xl text-[#1A1A18] hover:bg-[#F8F9FA] hover:border-[#1A1A18] transition-all shadow-sm">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* 🟢 列表卡片 (Table) */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">KOC 用戶</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">聯絡資訊</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">註冊時間</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">狀態</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4]">
              {influencers.map((koc) => (
                <tr key={koc.id} className="hover:bg-[#FDF0ED]/30 transition-colors group">
                  
                  {/* 姓名與帳號 */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1A1A18] text-[#F5F0E8] flex items-center justify-center font-serif font-black text-lg">
                        {koc.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-[#1A1A18]">{koc.name}</div>
                        <div className="text-xs font-medium text-[#8C8880]">@{koc.account}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* 聯絡資訊 */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-[#1A1A18]">{koc.email}</div>
                    <div className="text-xs font-medium text-[#8C8880] mt-0.5">{koc.phone}</div>
                  </td>

                  {/* 註冊時間 */}
                  <td className="px-6 py-4 text-sm font-medium text-[#8C8880]">
                    {koc.createdAt}
                  </td>

                  {/* 狀態 */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border ${
                      koc.status === 'active' 
                        ? 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/20' 
                        : 'bg-[#F8F9FA] text-[#8C8880] border-[#E2DDD4]'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${koc.status === 'active' ? 'bg-[#C8522A]' : 'bg-[#8C8880]'}`}></div>
                      {koc.status === 'active' ? '接案中' : '已停權'}
                    </span>
                  </td>

                  {/* 操作按鈕 (跳轉至詳細頁) */}
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => navigate(`/admin/influencers/${koc.id}`)}
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
        
        {/* 表格底部分頁 */}
        <div className="p-4 border-t border-[#E2DDD4] bg-[#F8F9FA] flex justify-between items-center text-sm font-medium text-[#8C8880]">
          <span>顯示 1 至 3 筆，共 3 筆資料</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-[#E2DDD4] rounded bg-white text-[#E2DDD4] cursor-not-allowed">上一頁</button>
            <button className="px-3 py-1 border border-[#E2DDD4] rounded bg-white hover:bg-[#FDF0ED] hover:text-[#C8522A] transition-colors cursor-not-allowed text-[#E2DDD4]">下一頁</button>
          </div>
        </div>
      </div>
    </div>
  );
}