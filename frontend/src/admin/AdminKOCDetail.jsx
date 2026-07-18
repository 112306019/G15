import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Instagram, Mail, Phone, Calendar,
  ClipboardList, CreditCard, AlertTriangle, UserCheck
} from 'lucide-react';

export default function AdminKocDetail({ koc }) {
  const navigate = useNavigate();

  // 如果沒有傳入 koc 資料，顯示找不到的狀態
  if (!koc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in">
        <div className="w-16 h-16 bg-[#F8F9FA] text-[#8C8880] rounded-full flex items-center justify-center mb-4 border border-[#E2DDD4]">
          <AlertTriangle size={24} />
        </div>
        <p className="text-[#1A1A18] font-bold text-lg mb-2">找不到 KOC 資料</p>
        <p className="text-[#8C8880] text-sm mb-6">這筆資料可能已被移除或存取路徑錯誤。</p>
        <button 
          onClick={() => navigate('/admin/influencers')} 
          className="flex items-center gap-2 bg-[#1A1A18] text-[#F5F0E8] px-6 py-3 rounded-full text-sm font-bold tracking-wider hover:bg-[#C8522A] transition-all shadow-md hover:-translate-y-0.5"
        >
          <ArrowLeft size={16} /> 返回 KOC 列表
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* 🟢 頂部：返回按鈕 */}
      <button 
        onClick={() => navigate('/admin/influencers')} 
        className="flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm mb-4"
      >
        <ArrowLeft size={16} /> 返回 KOC 列表
      </button>
      
      {/* 🟢 主要資訊卡片 */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] p-8 md:p-10 relative overflow-hidden">
        {/* 裝飾用背景光暈 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FDF0ED] rounded-full mix-blend-multiply filter blur-[80px] opacity-70"></div>

        {/* --- KOC 個人資料區塊 --- */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-10 pb-10 border-b border-[#E2DDD4] relative z-10">
          
          <div className="w-28 h-28 bg-[#1A1A18] rounded-[1.5rem] flex items-center justify-center text-5xl text-[#F5F0E8] font-serif font-black shadow-[0_8px_20px_rgba(26,26,24,0.15)] border-4 border-white">
            {koc.name.charAt(0)}
          </div>
          
          <div className="flex-1">
            <h2 className="text-3xl font-serif font-black text-[#1A1A18] flex items-center gap-3 mb-2">
              {koc.name}
              <span className="text-[10px] font-sans font-bold bg-[#B89B6A] text-[#1A1A18] px-2 py-1 rounded-md tracking-widest uppercase">
                平台認證
              </span>
            </h2>
            
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm font-bold text-[#8C8880]">
              <div className="flex items-center gap-1.5 hover:text-[#C8522A] transition-colors cursor-pointer text-[#1A1A18]">
                <Instagram size={16} className="text-[#C8522A]" /> 
                <span>@{koc.account || '未綁定'}</span>
              </div>
              <div className="flex items-center gap-1.5 border-l border-[#E2DDD4] pl-4">
                <Mail size={16} /> 
                <span>{koc.email}</span>
              </div>
              <div className="flex items-center gap-1.5 border-l border-[#E2DDD4] pl-4">
                <Phone size={16} /> 
                <span>{koc.phone}</span>
              </div>
            </div>

            <div className="mt-5 flex gap-3 items-center">
              <span className="text-[10px] font-sans font-bold bg-[#F8F9FA] text-[#8C8880] px-2 py-1.5 rounded-md tracking-widest border border-[#E2DDD4]">
                ID: {koc.id}
              </span>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-md border tracking-widest ${
                koc.status === 'active' 
                  ? 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/20' 
                  : 'bg-[#F8F9FA] text-[#8C8880] border-[#E2DDD4]'
              }`}>
                {koc.status === 'active' ? '🟢 正常接案中' : '⚫️ 帳號已停權'}
              </span>
              <span className="text-xs font-bold text-[#8C8880] ml-2 flex items-center gap-1">
                <Calendar size={14} /> 註冊於 {koc.createdAt}
              </span>
            </div>
          </div>
        </div>

        {/* --- 任務參與紀錄 (對應 Missions API) --- */}
        <div className="space-y-6 relative z-10 mb-10">
          <h3 className="font-serif font-bold text-xl text-[#1A1A18] flex items-center gap-2">
            <ClipboardList size={20} className="text-[#B89B6A]" />
            任務參與紀錄
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-[#F8F9FA] rounded-2xl overflow-hidden border border-[#E2DDD4]">
              <thead>
                <tr className="border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">任務編號 (Mission ID)</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">綁定推薦碼</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">目前階段 (Stage)</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">截止時間</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {koc.missions && koc.missions.length > 0 ? (
                  koc.missions.map((mission, idx) => (
                    <tr key={idx} className="hover:bg-white transition-colors">
                      <td className="px-6 py-4 font-bold text-[#1A1A18] text-sm">
                        {mission.missionId}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-[#C8522A]">
                        {mission.promotionCode || '無'}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-[#1A1A18]">
                        {mission.stage}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-[#8C8880]">
                        {mission.deadline}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md border tracking-widest uppercase ${
                          mission.status === '進行中' ? 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/20' : 'bg-[#E2DDD4] text-[#8C8880]'
                        }`}>
                          {mission.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm font-bold text-[#8C8880]">
                      目前尚無接案紀錄
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- 收益與撥款紀錄 (對應 Earnings API) --- */}
        <div className="space-y-6 relative z-10 pt-8 border-t border-[#E2DDD4]">
          <h3 className="font-serif font-bold text-xl text-[#1A1A18] flex items-center gap-2">
            <CreditCard size={20} className="text-[#C8522A]" />
            收益與撥款資料
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-[#F8F9FA] rounded-2xl overflow-hidden border border-[#E2DDD4]">
              <thead>
                <tr className="border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">收益來源 (KOC 任務)</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">收益金額</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">撥款日期</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">撥款狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {koc.earnings && koc.earnings.length > 0 ? (
                  koc.earnings.map((earning, idx) => (
                    <tr key={idx} className="hover:bg-white transition-colors">
                      <td className="px-6 py-4 font-bold text-[#8C8880] text-xs">
                        {earning.kocMissionId}
                      </td>
                      <td className="px-6 py-4 font-black text-[#1A1A18] text-sm">
                        NT$ {earning.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-[#1A1A18]">
                        {earning.payoutDate || '尚未撥款'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md border tracking-widest uppercase ${
                          earning.status === '已撥款' ? 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/20' : 'bg-white text-[#8C8880] border-[#E2DDD4]'
                        }`}>
                          {earning.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-sm font-bold text-[#8C8880]">
                      目前尚無收益紀錄
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}