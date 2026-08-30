import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Store, UserCheck,
  ClipboardList, CreditCard, LogOut, History, ShieldAlert, Headset, FileText
} from 'lucide-react';

// 🌟 引入切好的各個頁面元件
import AdminOverview from './admin/AdminOverview';
import AdminInfluencers from './admin/AdminInfluencers';
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

  // 🌟 管理員身分狀態
  const [adminRole, setAdminRole] = useState('Super Admin');

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

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_role');
    navigate('/admin-login');
  };

  if (!isAuthenticated) return null;

  // 🌟 根據角色定義左側選單與允許的路由
  const allMenuItems = [
    { id: 'overview', label: '平台總覽', icon: <LayoutDashboard size={20} />, path: '/admin', roles: ['Super Admin', 'Finance', 'Reviewer'] },
    { id: 'vendors', label: '廠商管理', icon: <Store size={20} />, path: '/admin/vendors', roles: ['Super Admin', 'Reviewer', 'Finance'] },
    { id: 'influencers', label: 'KOC 管理', icon: <UserCheck size={20} />, path: '/admin/influencers', roles: ['Super Admin', 'Reviewer', 'Finance'] },
    { id: 'consumers', label: '一般使用者', icon: <Users size={20} />, path: '/admin/consumers', roles: ['Super Admin', 'Reviewer'] },
    { id: 'missions', label: '任務與活動追蹤', icon: <ClipboardList size={20} />, path: '/admin/missions', roles: ['Super Admin', 'Reviewer'] },
    { id: 'finance', label: '訂單與財務', icon: <CreditCard size={20} />, path: '/admin/finance', roles: ['Super Admin', 'Finance'] },
    { id: 'taxForms', label: '勞報單審核', icon: <FileText size={20} />, path: '/admin/tax-forms', roles: ['Super Admin', 'Finance'] },
    { id: 'support', label: '客服聊天室', icon: <Headset size={20} />, path: '/admin/support', roles: ['Super Admin', 'Reviewer', 'Finance'] },
    { id: 'logs', label: '操作紀錄', icon: <History size={20} />, path: '/admin/logs', roles: ['Super Admin', 'Reviewer', 'Finance'] },
  ];

  const allowedMenuItems = allMenuItems.filter(item => item.roles.includes(adminRole));

  // 🌟 新增路由保護元件 (Protected Route)
  const ProtectedRoute = ({ allowedRoles, children }) => {
    if (!allowedRoles.includes(adminRole)) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-[1.5rem] border border-[#E2DDD4] shadow-sm animate-in fade-in">
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
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans text-slate-800">

      
      <aside className="w-64 bg-white border-r border-[#E2DDD4] flex flex-col fixed h-full z-10">
        <div className="h-20 flex items-center px-8 border-b border-[#E2DDD4]">
          <h1 className="text-xl font-black text-[#1A1A18] tracking-tight flex items-center gap-2">
            <span className="w-2 h-6 bg-[#C8522A] rounded-full inline-block"></span>
            KOC Platform
            <span className="text-[10px] bg-[#1A1A18] text-white px-2 py-0.5 rounded-md ml-1 align-top">ADMIN</span>
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {allowedMenuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path) && (item.path !== '/admin' || location.pathname === '/admin' || location.pathname === '/admin/');

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all ${isActive
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

    
      <main className="flex-1 ml-64 flex flex-col min-h-screen">

        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-[#E2DDD4] sticky top-0 z-10 flex items-center justify-end px-10">
          <div className="flex items-center gap-5">
            <div className="text-sm font-bold text-[#8C8880] pr-5 border-r border-[#E2DDD4]">
              系統時間：{new Date().toLocaleDateString('zh-TW')}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-black text-[#1A1A18]">{adminEmail.split('@')[0]}</div>
                <div className="text-[10px] font-bold text-[#C8522A] tracking-wider uppercase">{adminRole}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#1A1A18] text-white flex items-center justify-center font-bold uppercase">
                {adminEmail.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <div className="p-10 flex-1">
          <Routes>
            <Route path="/" element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Finance', 'Reviewer']}>
                <AdminOverview currentRole={adminRole} />
              </ProtectedRoute>
            } />

            {/* 🌟 廠商管理模組 */}
            <Route path="/vendors" element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Reviewer', 'Finance']}>
                <AdminVendors />
              </ProtectedRoute>
            } />

            <Route
              path="/vendors/:id"
              element={
                <ProtectedRoute allowedRoles={['Super Admin', 'Reviewer', 'Finance']}>
                  <AdminVendorDetail />
                </ProtectedRoute>
              }
            />     


            {/* 🌟 KOC 管理模組 */}
            <Route path="/influencers" element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Reviewer', 'Finance']}>
                <AdminInfluencers />
              </ProtectedRoute>
            } />
            <Route path="/influencers/pending" element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Reviewer', 'Finance']}>
                <AdminKOCPending />
              </ProtectedRoute>
            } />
            <Route path="/influencers/:id" element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Reviewer', 'Finance']}>
                <AdminKocDetail koc={{
                  id: 'U0089',
                  name: '王大寶',
                  account: 'dabao.ig',
                  email: 'dabao@example.com',
                  phone: '0912-345-678',
                  status: 'active',
                  createdAt: '2026-01-15',
                  missions: [
                    { missionId: 'M-1029', promotionCode: 'DABAO50', stage: '圖文審核中', deadline: '2026-07-20', status: '進行中' },
                    { missionId: 'M-0988', promotionCode: 'DABAO-SUMMER', stage: '已上線', deadline: '2026-06-30', status: '已結案' }
                  ],
                  earnings: [
                    { kocMissionId: 'KM-0988', amount: 3500, payoutDate: '2026-07-05', status: '已撥款' },
                    { kocMissionId: 'KM-1029', amount: 5000, payoutDate: null, status: '待結算' }
                  ]
                }} />
              </ProtectedRoute>
            } />

            {/* 🌟 一般使用者模組 */}
            <Route path="/consumers" element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Reviewer']}>
                <AdminConsumers />
              </ProtectedRoute>
            } />
            <Route path="/consumers/:id" element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Reviewer']}>
                <AdminConsumerDetail />
              </ProtectedRoute>
            } />

            {/* 🌟 任務與活動追蹤模組 */}
            <Route path="/missions" element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Reviewer']}>
                <AdminMissions />
              </ProtectedRoute>
            } />

            {/* 🌟 訂單與財務金流模組 */}
            <Route path="/finance" element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Finance']}>
                <AdminFinance />
              </ProtectedRoute>
            } />

            {/* 🌟 勞報單審核模組 */}
            <Route path="/tax-forms" element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Finance']}>
                <AdminTaxForms />
              </ProtectedRoute>
            } />

            {/* 🌟 客服聊天室模組 */}
            <Route path="/support" element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Reviewer', 'Finance']}>
                <AdminSupport />
              </ProtectedRoute>
            } />

            {/* 🌟 系統操作紀錄模組 */}
            <Route path="/logs" element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Reviewer', 'Finance']}>
                <AdminLogs />
              </ProtectedRoute>
            } />
          </Routes>
        </div>

      </main>
    </div>
  );
}