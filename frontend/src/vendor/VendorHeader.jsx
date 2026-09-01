import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, MessageCircle, Headset, Settings, LogOut } from 'lucide-react';

import { getVendorSupportUnreadCount } from '../api/vendor';
import LogoIcon from '../assets/logo.jpg';
import LogoText from '../assets/ShareBuy.png';

export default function VendorHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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

  // 對應 PDF 的功能選單
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
    <header className="bg-white border-b border-[#E2DDD4] px-12 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-12">
        
        <div
          className="bg-[#F5F0E8] px-4 py-1.5 rounded-full flex items-center gap-2.5 cursor-pointer hover:bg-[#E2DDD4] transition-colors"
          onClick={() => navigate('/vendor')}
        >
          <img 
            src={LogoIcon} 
            alt="ShareBuy Logo" 
            className="h-8 w-8 object-cover rounded-full shadow-sm" 
          />
          <img 
            src={LogoText} 
            alt="ShareBuy Text" 
            className="h-7 w-auto object-contain mix-blend-multiply translate-y-0.5" 
          />
        </div>
        
        {/* 上方選單 */}
        <nav className="flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                             (item.path !== '/vendor' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`text-sm transition-all pb-1 -mb-[5px] ${
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
      
      {/* 右側功能區 (聊天室、個人資料) */}
      <div className="flex items-center gap-4">
        
        {/* 聊天室按鈕 */}
        <button
          onClick={() => navigate('/vendor/chat')}
          className="relative p-2.5 rounded-full text-[#8C8880] hover:text-[#C8522A] hover:bg-[#FDF0ED] transition-colors"
          title="聊天室"
        >
          <MessageCircle size={20} />
          {/* 小紅點提示 (套用焦糖橘色) */}
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#C8522A] rounded-full border border-white shadow-sm" />
        </button>

        {/* 客服按鈕 */}
        <button
          onClick={() => navigate('/vendor/support')}
          className="relative p-2.5 rounded-full text-[#8C8880] hover:text-[#C8522A] hover:bg-[#FDF0ED] transition-colors"
          title="客服諮詢"
        >
          <Headset size={20} />
          {supportUnreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-[#C8522A] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white font-bold">
              {supportUnreadCount}
            </span>
          )}
        </button>

        {/* 頭像按鈕 (hover 顯示設定/登出選單) */}
        <div
          className="relative"
          onMouseEnter={() => setProfileMenuOpen(true)}
          onMouseLeave={() => setProfileMenuOpen(false)}
        >
          <button
            onClick={() => navigate('/vendor/settings')}
            className="cursor-pointer bg-[#F5F0E8] hover:bg-[#E2DDD4] p-2.5 rounded-full transition-colors text-[#1A1A18]"
            title="廠商資訊"
          >
            <User size={20} />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 top-full pt-2 w-44 z-50">
              <div className="bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden py-2">
                <button
                  onClick={() => { setProfileMenuOpen(false); navigate('/vendor/settings'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-black transition-colors text-left"
                >
                  <Settings size={16} />
                  廠商設定
                </button>
                <button
                  onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut size={16} />
                  登出
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}