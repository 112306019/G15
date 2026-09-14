import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Store, ClipboardList, Wallet, 
  TrendingUp, UserPlus, X, ShieldCheck, History 
} from 'lucide-react';
import {
  getAdminOverview,
  getAdminPerformance,
} from '../api/platform';

function InputField({ label, ...props }) {
  return (
    <div className="mb-4 sm:mb-5">
      <label className="block text-xs sm:text-sm font-bold text-[#1A1A18] mb-1.5 sm:mb-2 tracking-wide">{label}</label>
      <input
        {...props}
        className="w-full rounded-xl border border-[#E2DDD4] bg-[#F8F9FA] px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-[#1A1A18] shadow-sm outline-none transition-all placeholder:text-[#8C8880]/60 focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10"
      />
    </div>
  );
}

// 接收從 AdminApp 傳來的 currentRole 屬性
export default function AdminOverview({ currentRole }) {
  const navigate = useNavigate();
  
  // 平台數據狀態 (對應 API: GET /admin/overview)
  const [stats, setStats] = useState({
    users: 0,
    vendors: 0,
    kocMissions: 0,
    totalRevenue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', role: 'reviewer' });

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        setError('');

        const [
          overviewResponse,
          performanceResponse,
        ] = await Promise.all([
          getAdminOverview(),
          getAdminPerformance(),
        ]);

        const overviewData = overviewResponse.data;
        const performanceData = performanceResponse.data;

        if (!overviewData.success) {
          throw new Error(
            overviewData.err || '取得平台總覽失敗'
          );
        }

        if (!performanceData.success) {
          throw new Error(
            performanceData.err || '取得成效統計失敗'
          );
        }

        const overview = overviewData.overview || {};
        const summary = performanceData.summary || {};

        setStats({
          users: Number(overview.User_count || 0),
          vendors: Number(overview.Vendor_count || 0),
          kocMissions: Number(
            overview.KOCMission_count || 0
          ),
          totalRevenue: Number(
            summary.Total_revenue || 0
          ),
        });
      } catch (err) {
        console.error('取得平台總覽失敗：', err);

        setError(
          err.response?.data?.err ||
            err.message ||
            '取得平台總覽失敗'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const handleAddAdmin = (e) => {
    e.preventDefault();
    alert(`已成功建立 ${newAdmin.role} 帳號：${newAdmin.email}`);
    setShowAddAdminModal(false);
    setNewAdmin({ email: '', password: '', role: 'reviewer' });
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto space-y-4 md:space-y-6 pb-10">
      
      {/* =========================================
          頂部歡迎區塊 & 超級管理員專屬按鈕
      ========================================== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-black text-[#1A1A18] tracking-tight flex items-center gap-2 sm:gap-3">
            平台營運總覽
            <span className="text-[10px] md:text-xs font-bold bg-[#FDF0ED] text-[#C8522A] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md tracking-wider font-sans border border-[#C8522A]/20">
              {currentRole || 'Admin'}
            </span>
          </h1>
          <p className="text-[#8C8880] mt-1.5 md:mt-2 text-xs md:text-sm font-medium">歡迎回來！以下是今日的系統數據與最新操作紀錄。</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto">
          <button className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 bg-white border border-[#E2DDD4] px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#1A1A18] hover:bg-[#F8F9FA] hover:border-[#1A1A18] transition-all shadow-sm">
            <TrendingUp size={16} className="sm:w-4 sm:h-4" /> 匯出報表
          </button>
          
          {/* 權限控管：只有 Super Admin 能看到新增管理員按鈕 */}
          {currentRole === 'super_admin' && (
            <button 
              onClick={() => setShowAddAdminModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 bg-[#1A1A18] text-[#F5F0E8] px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-[#C8522A] transition-all shadow-md hover:-translate-y-0.5"
            >
              <UserPlus size={16} className="sm:w-4 sm:h-4" /> 新增管理員
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-[#E2DDD4] rounded-xl p-4 text-xs sm:text-sm font-bold text-[#8C8880] text-center">
          平台總覽載入中...
        </div>
      )}

      {error && (
        <div className="bg-[#FDF0ED] border border-[#C8522A]/20 rounded-xl p-4 text-xs sm:text-sm font-bold text-[#C8522A] text-center">
          {error}
        </div>
      )}

      {/* =========================================
          數據卡片區 
      ========================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        <div className="bg-white p-5 sm:p-6 rounded-[1.5rem] shadow-sm border border-[#E2DDD4] hover:border-[#B89B6A] transition-all group">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#F5F0E8] text-[#1A1A18] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <span className="text-[10px] font-bold text-[#C8522A] bg-[#FDF0ED] px-2 py-1 rounded-md border border-[#C8522A]/10">+12%</span>
          </div>
          <p className="text-[#8C8880] text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-3 sm:mt-4">總註冊會員 / KOC</p>
          <h3 className="text-2xl sm:text-3xl font-black text-[#1A1A18] mt-1">{stats.users.toLocaleString()}</h3>
        </div>
        
        <div className="bg-white p-5 sm:p-6 rounded-[1.5rem] shadow-sm border border-[#E2DDD4] hover:border-[#B89B6A] transition-all group">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#F5F0E8] text-[#1A1A18] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Store size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <span className="text-[10px] font-bold text-[#C8522A] bg-[#FDF0ED] px-2 py-1 rounded-md border border-[#C8522A]/10">+3 家</span>
          </div>
          <p className="text-[#8C8880] text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-3 sm:mt-4">合作廠商總數</p>
          <h3 className="text-2xl sm:text-3xl font-black text-[#1A1A18] mt-1">{stats.vendors}</h3>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-[1.5rem] shadow-sm border border-[#E2DDD4] hover:border-[#B89B6A] transition-all group">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#F5F0E8] text-[#1A1A18] flex items-center justify-center group-hover:scale-110 transition-transform">
              <ClipboardList size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
          </div>
          <p className="text-[#8C8880] text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-3 sm:mt-4">
            KOC 任務總數
          </p>
          <h3 className="text-2xl sm:text-3xl font-black text-[#1A1A18] mt-1">
            {stats.kocMissions}
          </h3>
        </div>

        {/* 只有 Super Admin 或 Finance 能看到收益 */}
        {currentRole === 'super_admin' || currentRole === 'finance' ? (
          <div className="bg-[#1A1A18] p-5 sm:p-6 rounded-[1.5rem] shadow-md border border-[#1A1A18] relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#B89B6A] rounded-full filter blur-[50px] opacity-20 group-hover:opacity-40 transition-opacity" />

            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 text-[#F5F0E8] flex items-center justify-center">
                <Wallet size={20} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <span className="text-[10px] font-bold text-[#1A1A18] bg-[#B89B6A] px-2 py-1 rounded-md">
                本月結算
              </span>
            </div>

            <p className="text-[#8C8880] text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-3 sm:mt-4 relative z-10">
              本月平台總收益 (NT$)
            </p>

            <h3 className="text-2xl sm:text-3xl font-black text-[#F5F0E8] mt-1 relative z-10 truncate">
              NT$ {stats.totalRevenue.toLocaleString()}
            </h3>
          </div>
        ) : (
          <div className="bg-[#F8F9FA] p-5 sm:p-6 rounded-[1.5rem] border border-[#E2DDD4] border-dashed flex flex-col items-center justify-center opacity-60">
            <ShieldCheck size={28} className="text-[#8C8880] mb-2 sm:w-8 sm:h-8" />
            <p className="text-xs sm:text-sm font-bold text-[#8C8880]">無權限檢視財務數據</p>
          </div>
        )}
      </div>

      {/* =========================================
          下方佈局：圖表 (左) 與 系統動態 (右)
      ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 pt-4 sm:pt-6 md:pt-8">
        
        {/* 左側圖表區塊 */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-[1.5rem] shadow-sm border border-[#E2DDD4] flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1A1A18]">流量與活動趨勢</h2>
            <select className="w-full sm:w-auto text-xs sm:text-sm font-bold border-[#E2DDD4] rounded-xl border px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#C8522A]/20 cursor-pointer bg-[#F8F9FA] text-[#1A1A18] appearance-none">
              <option>近 7 天</option>
              <option>近 30 天</option>
              <option>今年度</option>
            </select>
          </div>
          <div className="flex-1 bg-[#F8F9FA] rounded-[1rem] border border-dashed border-[#E2DDD4] flex flex-col items-center justify-center min-h-[250px] sm:min-h-[350px]">
            <TrendingUp size={40} className="text-[#E2DDD4] mb-3 sm:mb-4 sm:w-12 sm:h-12" />
            <p className="text-[#8C8880] text-xs sm:text-sm font-bold tracking-widest">數據圖表載入區塊</p>
          </div>
        </div>

        {/* 右側：最新操作紀錄 */}
        <div className="bg-white p-5 sm:p-8 rounded-[1.5rem] shadow-sm border border-[#E2DDD4] flex flex-col">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1A1A18]">最新系統動態</h2>
            <span className="text-[10px] sm:text-xs font-bold text-[#8C8880] bg-[#F8F9FA] px-2 sm:px-3 py-1 rounded-full border border-[#E2DDD4]">
              即時更新
            </span>
          </div>
          
          <div className="space-y-3 sm:space-y-4 flex-1">
            {[
              { title: '新廠商註冊成功', sub: 'Vendor_ID: V092', time: '10 分鐘前' },
              { title: '管理員匯出財務報表', sub: 'Admin_01 執行操作', time: '1 小時前' },
              { title: 'KOC 任務獎金撥款', sub: '成功撥款給 12 位 KOC', time: '3 小時前' },
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 sm:p-4 hover:bg-[#F5F0E8] rounded-xl sm:rounded-2xl border border-[#E2DDD4] transition-colors group">
                <div className="flex items-start gap-2.5 sm:gap-4">
                  <div className="mt-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#B89B6A] rounded-full shrink-0"></div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#1A1A18] truncate">{item.title}</p>
                    <p className="text-[10px] sm:text-xs font-medium text-[#8C8880] mt-0.5 sm:mt-1 truncate">{item.sub}</p>
                  </div>
                </div>
                <span className="text-[9px] sm:text-[10px] text-[#8C8880] font-bold shrink-0">{item.time}</span>
              </div>
            ))}
          </div>

          {/* 只有特定權限可以進入完整 Log 頁面 */}
          {(currentRole === 'super_admin' || currentRole === 'reviewer') && (
            <button onClick={() => navigate('/admin/logs')} className="w-full mt-4 sm:mt-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-[#1A1A18] border border-[#E2DDD4] rounded-xl hover:bg-[#F8F9FA] transition-colors flex items-center justify-center gap-2">
              <History size={14} className="sm:w-4 sm:h-4" /> 查看完整操作紀錄
            </button>
          )}
        </div>
      </div>

      {/* =========================================
          Super Admin 專屬彈出視窗：新增管理員
      ========================================== */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-[#1A1A18]/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-[#E2DDD4] max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#FDF0ED] text-[#C8522A] rounded-full flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} className="sm:w-5 sm:h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-serif font-black text-[#1A1A18]">配發管理員帳號</h3>
              </div>
              <button onClick={() => setShowAddAdminModal(false)} className="text-[#8C8880] hover:text-[#1A1A18] transition-colors p-1">
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin}>
              <InputField 
                label="內部信箱 (Email)" 
                type="email" 
                placeholder="例如: admin_02@koc.com"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                required 
              />
              <InputField 
                label="初始密碼" 
                type="text" 
                placeholder="設定初始密碼"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                required 
              />
              
              <div className="mb-6 sm:mb-8">
                <label className="block text-xs sm:text-sm font-bold text-[#1A1A18] mb-1.5 sm:mb-2 tracking-wide">指派角色權限 (RBAC)</label>
                <select 
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({...newAdmin, role: e.target.value})}
                  className="w-full rounded-xl border border-[#E2DDD4] bg-[#F8F9FA] px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 appearance-none cursor-pointer"
                >
                  <option value="reviewer">審核員 (Reviewer) - 追蹤活動與操作紀錄</option>
                  <option value="finance">財務管理 (Finance) - 處理訂單與分潤撥款</option>
                  <option value="super_admin">超級管理員 (Super Admin) - 系統最高權限</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddAdminModal(false)}
                  className="w-full sm:w-auto flex-1 bg-white border border-[#E2DDD4] text-[#8C8880] py-3 sm:py-3.5 rounded-xl font-bold hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all text-xs sm:text-sm"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="w-full sm:w-auto flex-[2] bg-[#1A1A18] text-[#F5F0E8] py-3 sm:py-3.5 rounded-xl font-bold hover:bg-[#C8522A] transition-all shadow-lg text-xs sm:text-sm tracking-widest"
                >
                  確認配發帳號
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}