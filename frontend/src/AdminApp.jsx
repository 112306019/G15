import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Store, UserCheck,
  ClipboardList, CreditCard, LogOut, History, 
  ShieldAlert, Headset, FileText, Menu, X
} from 'lucide-react';

import LogoIcon from './assets/logo.jpg';
import LogoText from './assets/ShareBuy.png';

// 引入切好的各個頁面元件
import AdminOverview from './admin/AdminOverview';
import AdminKOC from './admin/AdminKOC';
import AdminKocDetail from './admin/AdminKOCDetail';
import AdminKOCPending from './admin/AdminKOCPending';
import AdminConsumers from './admin/AdminConsumers';
import AdminConsumerDetail from './admin/AdminConsumerDetail';
import AdminVendors from './admin/AdminVendors';
import AdminVendorDetail from './admin/AdminVendorDetail';
import AdminMissions from './admin/AdminMissions';
import AdminFinance from './admin/AdminFinance';
import AdminLogs from './admin/AdminLogs';
import AdminSupport from './admin/AdminSupport';
import AdminTaxForms from './admin/AdminTaxForms';

export default function AdminApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  
  // 管理員身分狀態
  const [adminRole, setAdminRole] = useState('super_admin');
  
  // 控制手機版側邊選單與右上角個人選單開關的狀態
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const email = localStorage.getItem('admin_email');

    if (!token) {
      alert("請先登入平台管理端！");
      navigate('/admin-login');
    } else {
      setIsAuthenticated(true);
      setAdminEmail(email || 'Admin');
      const role = localStorage.getItem('admin_role');
      if (role) setAdminRole(role);
    }
  }, [navigate]);

  // 當路由改變時，自動收起手機版側邊欄與個人選單
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_role');
    navigate('/admin-login');
  };

  if (!isAuthenticated) return null;

  // 根據角色定義左側選單與允許的路由
  const allMenuItems = [
    { id: 'overview', label: '平台總覽', icon: <LayoutDashboard size={20} />, path: '/admin', roles: ['super_admin', 'finance', 'reviewer'] },
    { id: 'vendors', label: '廠商管理', icon: <Store size={20} />, path: '/admin/vendors', roles: ['super_admin', 'reviewer', 'finance'] },
    { id: 'koc', label: 'KOC 管理', icon: <UserCheck size={20} />, path: '/admin/koc', roles: ['super_admin', 'reviewer', 'finance'] },
    { id: 'consumers', label: '一般使用者', icon: <Users size={20} />, path: '/admin/consumers', roles: ['super_admin', 'reviewer'] },
    { id: 'missions', label: '任務與活動追蹤', icon: <ClipboardList size={20} />, path: '/admin/missions', roles: ['super_admin', 'reviewer'] },
    { id: 'finance', label: '訂單與財務', icon: <CreditCard size={20} />, path: '/admin/finance', roles: ['super_admin', 'finance'] },
    { id: 'taxForms', label: '勞報單審核', icon: <FileText size={20} />, path: '/admin/tax-forms', roles: ['super_admin', 'finance'] },
    { id: 'support', label: '客服聊天室', icon: <Headset size={20} />, path: '/admin/support', roles: ['super_admin', 'reviewer', 'finance'] },
    { id: 'logs', label: '操作紀錄', icon: <History size={20} />, path: '/admin/logs', roles: ['super_admin', 'reviewer', 'finance'] },
  ];

  const allowedMenuItems = allMenuItems.filter(item => item.roles.includes(adminRole));

  // 路由保護元件
  const ProtectedRoute = ({ allowedRoles, children }) => {
    if (!allowedRoles.includes(adminRole)) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-[1.5rem] border border-[#E2DDD4] shadow-sm animate-in fade-in px-4 text-center">
          <div className="w-20 h-20 bg-[#FDF0ED] text-[#C8522A] rounded-full flex items-center justify-center mb-6 border-4 border-[#C8522A]/10">
            <ShieldAlert size={36} />
          </div>
          <h3 className="text-2xl font-serif font-black text-[#1A1A18] mb-2">權限不足</h3>
          <p className="text-[#8C8880] font-medium">您的帳號角色 <span className="font-bold text-[#1A1A18]">{adminRole}</span> 無法存取此管理模組。</p>
          <button
            onClick={() => navigate('/admin')}
            className="mt-6 px-6 py-3 bg-[#1A1A18] text-[#F5F0E8] rounded-xl font-bold text-sm hover:bg-[#333] transition-all shadow-md"
          >
            返回平台總覽
          </button>
        </div>
      );
    }
    return children;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans text-slate-800 overflow-x-hidden">

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 側邊欄 (支援響應式滑動) */}
      <aside className={`w-64 bg-white border-r border-[#E2DDD4] flex flex-col fixed h-full z-30 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="h-16 md:h-20 flex items-center px-4 border-b border-[#E2DDD4] cursor-pointer" onClick={() => navigate('/admin')}>
          
          <div className="bg-[#F5F0E8] w-full px-2.5 py-2 rounded-xl flex items-center gap-2 hover:bg-[#E2DDD4] transition-colors shadow-sm">
            <img 
              src={LogoIcon} 
              alt="ShareBuy Logo" 
              className="h-7 w-7 md:h-8 md:w-8 object-cover rounded-lg shadow-sm flex-shrink-0" 
            />
            <img 
              src={LogoText} 
              alt="ShareBuy Text" 
              className="h-5 md:h-6 w-auto object-contain mix-blend-multiply"
            />
            <span className="text-[10px] bg-[#1A1A18] text-white px-2 py-0.5 rounded-md font-bold tracking-wider ml-auto flex-shrink-0">
              ADMIN
            </span>
          </div>

        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {allowedMenuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path) && (item.path !== '/admin' || location.pathname === '/admin' || location.pathname === '/admin/');

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 md:py-3.5 rounded-xl font-bold text-sm transition-all ${isActive
                    ? 'bg-[#1A1A18] text-[#F5F0E8] shadow-md'
                    : 'text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18]'
                  }`}
              >
                <span className={isActive ? 'text-[#C8522A]' : ''}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E2DDD4]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-[#8C8880] border border-[#E2DDD4] hover:bg-[#FDF0ED] hover:text-[#C8522A] hover:border-[#C8522A]/30 transition-all"
          >
            <LogOut size={16} /> 登出系統
          </button>
        </div>
      </aside>

      {/* 主要內容區 */}
      <main className="flex-1 w-full md:ml-64 flex flex-col min-h-screen transition-all duration-300">

        {/* 頂部 Header */}
        <header className="h-16 md:h-20 bg-white/80 backdrop-blur-md border-b border-[#E2DDD4] sticky top-0 z-10 flex items-center justify-between md:justify-end px-4 md:px-10">
          
          <button 
            className="md:hidden p-2 text-[#1A1A18] hover:bg-[#F5F0E8] rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-3 md:gap-5">
            <div className="hidden md:block text-sm font-bold text-[#8C8880] pr-5 border-r border-[#E2DDD4]">
              系統時間：{new Date().toLocaleDateString('zh-TW')}
            </div>
            
            <div 
              className="relative"
              onMouseEnter={() => setIsProfileMenuOpen(true)}
              onMouseLeave={() => setIsProfileMenuOpen(false)}
            >
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none py-2"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-black text-[#1A1A18]">{adminEmail.split('@')[0]}</div>
                  <div className="text-[10px] font-bold text-[#C8522A] tracking-wider uppercase">{adminRole}</div>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#1A1A18] text-white flex items-center justify-center font-bold uppercase text-sm md:text-base shadow-sm">
                  {adminEmail.charAt(0)}
                </div>
              </button>

              {/* 下拉選單內容 */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-full pt-1 z-50">
                  <div className="w-40 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#E2DDD4] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold text-[#C8522A] hover:bg-[#FDF0ED] rounded-lg transition-colors"
                      >
                        <LogOut size={16} />
                        登出系統
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 頁面內容區 */}
        <div className="p-4 sm:p-6 md:p-10 flex-1 overflow-x-hidden">
          <Routes>
            <Route path="/" element={
              <ProtectedRoute allowedRoles={['super_admin', 'finance', 'reviewer']}>
                <AdminOverview currentRole={adminRole} />
              </ProtectedRoute>
            } />

            <Route path="/vendors" element={
              <ProtectedRoute allowedRoles={['super_admin', 'reviewer', 'finance']}>
                <AdminVendors />
              </ProtectedRoute>
            } />
            <Route path="/vendors/:id" element={
              <ProtectedRoute allowedRoles={['super_admin', 'reviewer', 'finance']}>
                <AdminVendorDetail />
              </ProtectedRoute>
            } />     

            <Route path="/koc" element={
              <ProtectedRoute allowedRoles={['super_admin', 'reviewer', 'finance']}>
                <AdminKOC />
              </ProtectedRoute>
            } />
            <Route path="/koc/pending" element={
              <ProtectedRoute allowedRoles={['super_admin', 'reviewer', 'finance']}>
                <AdminKOCPending />
              </ProtectedRoute>
            } />
            
            <Route path="/koc/:id" element={
              <ProtectedRoute allowedRoles={['super_admin', 'reviewer', 'finance']}>
                <AdminKocDetail />
              </ProtectedRoute>
            } />

            <Route path="/consumers" element={
              <ProtectedRoute allowedRoles={['super_admin', 'reviewer']}>
                <AdminConsumers />
              </ProtectedRoute>
            } />
            <Route path="/consumers/:id" element={
              <ProtectedRoute allowedRoles={['super_admin', 'reviewer']}>
                <AdminConsumerDetail />
              </ProtectedRoute>
            } />

            <Route path="/missions" element={
              <ProtectedRoute allowedRoles={['super_admin', 'reviewer']}>
                <AdminMissions />
              </ProtectedRoute>
            } />

            <Route path="/finance" element={
              <ProtectedRoute allowedRoles={['super_admin', 'finance']}>
                <AdminFinance />
              </ProtectedRoute>
            } />

            <Route path="/tax-forms" element={
              <ProtectedRoute allowedRoles={['super_admin', 'finance']}>
                <AdminTaxForms />
              </ProtectedRoute>
            } />

            <Route path="/support" element={
              <ProtectedRoute allowedRoles={['super_admin', 'reviewer', 'finance']}>
                <AdminSupport />
              </ProtectedRoute>
            } />

            <Route path="/logs" element={
              <ProtectedRoute allowedRoles={['super_admin', 'reviewer', 'finance']}>
                <AdminLogs />
              </ProtectedRoute>
            } />
          </Routes>
        </div>

      </main>
    </div>
  );
}