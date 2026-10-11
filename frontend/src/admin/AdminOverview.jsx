import React, { useEffect, useState } from 'react';
import { 
  Users, Store, ClipboardList, Wallet, 
  TrendingUp, UserPlus, X, ShieldCheck, Loader2
} from 'lucide-react';
import {
  getAdminOverview,
  getAdminPerformance,
  createAdminAccount,
} from '../api/platform';
import { getErrorMessage } from '../errorMessage';
import SiteTrafficChart from './SiteTrafficChart';
import RecentActivity from './RecentActivity';
import { exportOverviewReport } from './overviewReport';

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
  
  // 平台數據狀態 (對應 API: GET /admin/overview)
  const [stats, setStats] = useState({
    users: 0,
    vendors: 0,
    kocMissions: 0,
    totalRevenue: 0,
    newUsers30d: 0,
    newVendors30d: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [exporting, setExporting] = useState(false);

  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const EMPTY_ADMIN = { name: '', email: '', password: '', role: 'reviewer' };
  const [newAdmin, setNewAdmin] = useState(EMPTY_ADMIN);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [addAdminError, setAddAdminError] = useState('');

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
          newUsers30d: Number(overview.New_user_count_30d || 0),
          newVendors30d: Number(overview.New_vendor_count_30d || 0),
        });
      } catch (err) {
        console.error('取得平台總覽失敗：', err);

        setError(
          getErrorMessage(err, '取得平台總覽失敗')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const canViewFinance = currentRole === 'super_admin' || currentRole === 'finance';

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportOverviewReport({ canViewFinance });
    } catch (err) {
      alert(getErrorMessage(err, '報表匯出失敗，請稍後再試'));
    } finally {
      setExporting(false);
    }
  };

  const openAddAdminModal = () => {
    setNewAdmin(EMPTY_ADMIN);
    setAddAdminError('');
    setShowAddAdminModal(true);
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setAddingAdmin(true);
    setAddAdminError('');
    try {
      const response = await createAdminAccount({
        // 後端用操作者的 Admin_id 確認是 super_admin 才放行
        Admin_id: localStorage.getItem('admin_id'),
        Name: newAdmin.name,
        Email: newAdmin.email,
        Password: newAdmin.password,
        Role: newAdmin.role,
      });
      alert(`已建立管理員帳號：${response.data.Name}（${response.data.Email}）`);
      setShowAddAdminModal(false);
      setNewAdmin(EMPTY_ADMIN);
    } catch (err) {
      setAddAdminError(getErrorMessage(err, '建立管理員帳號失敗，請稍後再試'));
    } finally {
      setAddingAdmin(false);
    }
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
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 bg-white border border-[#E2DDD4] px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#1A1A18] hover:bg-[#F8F9FA] hover:border-[#1A1A18] transition-all shadow-sm disabled:opacity-60 disabled:cursor-wait"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin sm:w-4 sm:h-4" />
            ) : (
              <TrendingUp size={16} className="sm:w-4 sm:h-4" />
            )}
            {exporting ? '匯出中...' : '匯出報表'}
          </button>
          
          {/* 權限控管：只有 Super Admin 能看到新增管理員按鈕 */}
          {currentRole === 'super_admin' && (
            <button 
              onClick={openAddAdminModal}
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
            <span className="text-[10px] font-bold text-[#C8522A] bg-[#FDF0ED] px-2 py-1 rounded-md border border-[#C8522A]/10">
              近 30 天 +{stats.newUsers30d.toLocaleString()} 人
            </span>
          </div>
          <p className="text-[#8C8880] text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-3 sm:mt-4">總註冊會員 / KOC</p>
          <h3 className="text-2xl sm:text-3xl font-black text-[#1A1A18] mt-1">{stats.users.toLocaleString()}</h3>
        </div>
        
        <div className="bg-white p-5 sm:p-6 rounded-[1.5rem] shadow-sm border border-[#E2DDD4] hover:border-[#B89B6A] transition-all group">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#F5F0E8] text-[#1A1A18] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Store size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <span className="text-[10px] font-bold text-[#C8522A] bg-[#FDF0ED] px-2 py-1 rounded-md border border-[#C8522A]/10">
              近 30 天 +{stats.newVendors30d.toLocaleString()} 家
            </span>
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
        {canViewFinance ? (
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
        
        {/* 左側：網站流量趨勢（GA4） */}
        <SiteTrafficChart />

        {/* 右側：最新操作紀錄 */}
        <RecentActivity currentRole={currentRole} />
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
                label="姓名"
                type="text"
                placeholder="例如: 王小明"
                value={newAdmin.name}
                onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                required
              />
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
                placeholder="至少 8 個字元"
                minLength={8}
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

              {addAdminError && (
                <div className="mb-4 bg-[#FDF0ED] border border-[#C8522A]/20 rounded-xl p-3 text-xs sm:text-sm font-bold text-[#C8522A]">
                  {addAdminError}
                </div>
              )}

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
                  disabled={addingAdmin}
                  className="w-full sm:w-auto flex-[2] bg-[#1A1A18] text-[#F5F0E8] py-3 sm:py-3.5 rounded-xl font-bold hover:bg-[#C8522A] transition-all shadow-lg text-xs sm:text-sm tracking-widest disabled:opacity-60 disabled:cursor-wait"
                >
                  {addingAdmin ? '建立中...' : '確認配發帳號'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}