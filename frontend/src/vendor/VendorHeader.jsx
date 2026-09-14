import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, MessageCircle, Headset, Settings, LogOut, Menu, X } from 'lucide-react';

import { getVendorSupportUnreadCount } from '../api/vendor';
import LogoIcon from '../assets/logo.jpg';
import LogoText from '../assets/ShareBuy.png';

export default function VendorHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);

  useEffect(() => {
    const vendorId = localStorage.getItem('vendor_id');
    if (!vendorId) return;

    getVendorSupportUnreadCount(vendorId)
      .then(response => setSupportUnreadCount(response.data?.unread_count || 0))
      .catch(err => console.error('客服未讀數載入失敗：', err));
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('vendor_id');
    navigate('/vendor-login');
  };

  const handleNavigate = (path) => {
    setMobileMenuOpen(false); // 點擊後自動收起手機選單
    navigate(path);
  };

  const navItems = [
    { label: '主頁', path: '/vendor' },
    { label: '活動管理', path: '/vendor/campaigns' },
    { label: '商品管理', path: '/vendor/products' },
    { label: '訂單管理', path: '/vendor/orders' },
    { label: '金流管理', path: '/vendor/finance' },
    { label: 'KOC管理', path: '/vendor/koc' },
    { label: '審核管理', path: '/vendor/review' },
    { label: '成效分析', path: '/vendor/analytics' }
  ];

  return (
    <header className="bg-white border-b border-[#E2DDD4] px-4 md:px-8 lg:px-12 py-3 md:py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-4 lg:gap-8 xl:gap-12">
        
        <div
          className="bg-[#F5F0E8] px-3 md:px-4 py-1.5 rounded-full flex items-center gap-2 md:gap-2.5 cursor-pointer hover:bg-[#E2DDD4] transition-colors"
          onClick={() => handleNavigate('/vendor')}
        >
          <img 
            src={LogoIcon} 
            alt="ShareBuy Logo" 
            className="h-7 w-7 md:h-8 md:w-8 object-cover rounded-full shadow-sm" 
          />
          <img 
            src={LogoText} 
            alt="ShareBuy Text" 
            className="h-5 md:h-7 w-auto object-contain mix-blend-multiply translate-y-0.5" 
          />
        </div>
        
        <nav className="hidden lg:flex items-center gap-4 xl:gap-8">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                             (item.path !== '/vendor' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`text-[13px] xl:text-sm transition-all pb-1 -mb-[5px] whitespace-nowrap ${
                  isActive 
                    ? 'text-[#C8522A] font-bold border-b-2 border-[#C8522A]' 
                    : 'text-[#8C8880] font-bold hover:text-[#1A1A18]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* 右側功能區 */}
      <div className="flex items-center gap-2 md:gap-4">
        
        {/* 聊天室按鈕 */}
        <button
          onClick={() => handleNavigate('/vendor/chat')}
          className="relative p-2 md:p-2.5 rounded-full text-[#8C8880] hover:text-[#C8522A] hover:bg-[#FDF0ED] transition-colors"
          title="聊天室"
        >
          <MessageCircle size={20} className="md:w-[22px] md:h-[22px]" />
          <span className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-2 h-2 bg-[#C8522A] rounded-full border border-white shadow-sm" />
        </button>

        {/* 客服按鈕 */}
        <button
          onClick={() => handleNavigate('/vendor/support')}
          className="relative p-2 md:p-2.5 rounded-full text-[#8C8880] hover:text-[#C8522A] hover:bg-[#FDF0ED] transition-colors"
          title="客服諮詢"
        >
          <Headset size={20} className="md:w-[22px] md:h-[22px]" />
          {supportUnreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 md:top-1 md:right-1 bg-[#C8522A] text-white text-[9px] md:text-[10px] w-3.5 h-3.5 md:w-4 md:h-4 flex items-center justify-center rounded-full border-2 border-white font-bold">
              {supportUnreadCount}
            </span>
          )}
        </button>

        <div
          className="relative hidden lg:block"
          onMouseEnter={() => setProfileMenuOpen(true)}
          onMouseLeave={() => setProfileMenuOpen(false)}
        >
          <button
            onClick={() => handleNavigate('/vendor/settings')}
            className="cursor-pointer bg-[#F5F0E8] hover:bg-[#E2DDD4] p-2.5 rounded-full transition-colors text-[#1A1A18]"
            title="廠商資訊"
          >
            <User size={20} />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 top-full pt-2 w-44 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="bg-white border border-[#E2DDD4] rounded-2xl shadow-[0_8px_30px_rgba(26,26,24,0.08)] overflow-hidden py-2">
                <button
                  onClick={() => { setProfileMenuOpen(false); handleNavigate('/vendor/settings'); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors text-left"
                >
                  <Settings size={16} strokeWidth={2.5} />
                  廠商設定
                </button>
                <button
                  onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-[#C8522A] hover:bg-[#FEF5F3] transition-colors text-left"
                >
                  <LogOut size={16} strokeWidth={2.5} />
                  登出
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          className="lg:hidden cursor-pointer p-2 rounded-full text-[#8C8880] hover:bg-[#F5F0E8] transition-colors ml-1"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b border-[#E2DDD4]/60 shadow-[0_10px_20px_rgba(0,0,0,0.05)] lg:hidden flex flex-col z-50 animate-in slide-in-from-top-2 fade-in duration-200 max-h-[80vh] overflow-y-auto">
          
          {/* 導航連結區 */}
          <div className="p-4 flex flex-col gap-1 border-b border-[#E2DDD4]/30">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                               (item.path !== '/vendor' && location.pathname.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={`flex items-center p-3.5 rounded-xl transition-colors ${
                    isActive 
                      ? 'bg-[#FDF0ED] text-[#C8522A] font-black' 
                      : 'text-[#8C8880] font-bold hover:bg-[#F5F0E8] hover:text-[#1A1A18]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* 設定與登出區 */}
          <div className="p-4 flex flex-col gap-1">
            <button
              onClick={() => handleNavigate('/vendor/settings')}
              className={`flex items-center gap-3 p-3.5 rounded-xl font-bold transition-colors ${
                location.pathname.startsWith('/vendor/settings') 
                  ? 'bg-[#FDF0ED] text-[#C8522A]' 
                  : 'text-[#8C8880] hover:bg-[#F5F0E8]'
              }`}
            >
              <Settings size={20} strokeWidth={2.5} />
              廠商設定
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
              className="flex items-center gap-3 p-3.5 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} strokeWidth={2.5} />
              安全登出
            </button>
          </div>
        </div>
      )}
    </header>
  );
}