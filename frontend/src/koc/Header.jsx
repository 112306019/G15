import React, { useState } from 'react';
import { ShoppingCart, User, Heart, MessageCircle, Headset, Settings, LogOut } from 'lucide-react';

// 引入 Logo 圖片
import LogoIcon from '../assets/logo.jpg';
import LogoText from '../assets/ShareBuy.png';

// 🟢 接收 cartCount
export default function Header({ activeTab, onNavigate, userRole, cartCount = 0, supportUnreadCount = 0, onLogout }) {

  const allNavItems = [
    { label: '購物頁面', key: 'shop', isKocOnly: false },
    { label: '接案中心', key: 'home', isKocOnly: true },
  ];

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const navItems = allNavItems.filter(item => {
    if (item.isKocOnly && userRole !== 'koc') return false;
    return true;
  });

  const getActiveKey = (tab) => {
    if (['home', 'task_detail', 'review', 'analysis', 'sales_data'].includes(tab)) return 'home';
    if (['earnings', 'earnings_detail', 'pending_detail'].includes(tab)) return 'earnings';
    if (['shop', 'product_detail', 'cart', 'checkout'].includes(tab)) return 'shop';
    return '';
  };

  const currentActiveKey = getActiveKey(activeTab);

  return (
    <header className="bg-white border-b border-[#E2DDD4]/60 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-8">

        <div
          className="bg-[#F5F0E8] px-4 py-1.5 rounded-full flex items-center gap-2.5 cursor-pointer hover:bg-[#E2DDD4] transition-colors"
          onClick={() => onNavigate?.('shop')}
        >
          {/* 左側：圓形 Icon */}
          <img 
            src={LogoIcon} 
            alt="ShareBuy Icon" 
            className="h-8 w-8 object-cover rounded-full shadow-sm" 
          />
          
          {/* 右側：文字 Logo */}
          <img 
            src={LogoText} 
            alt="ShareBuy Text" 
            className="h-7 w-auto object-contain mix-blend-multiply" 
          />
        </div>

        <div className="h-6 w-px bg-[#E2DDD4]"></div>

        <nav className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = currentActiveKey === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate?.(item.key)}
                className={`relative text-sm transition-colors py-1 ${
                  isActive
                    ? 'text-[#1A1A18] font-black'
                    : 'text-[#8C8880] font-bold hover:text-[#1A1A18]'
                }`}
              >
                {item.label}
                
                {/* 🌟 橘色底線：只有在 active 時才會出現 */}
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 h-[3px] w-3/4 -translate-x-1/2 rounded-full bg-[#C8522A]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-5">
        <div
          className="cursor-pointer hover:bg-[#F5F0E8] p-2.5 rounded-full transition-colors"
          onClick={() => onNavigate?.('favorites')}
        >
          <Heart size={22} strokeWidth={2.5} className={activeTab === 'favorites' ? 'text-[#1A1A18]' : 'text-[#8C8880]'} />
        </div>
        
        <div
          className="relative cursor-pointer hover:bg-[#F5F0E8] p-2.5 rounded-full transition-colors"
          onClick={() => onNavigate?.('cart')}
        >
          <ShoppingCart size={22} strokeWidth={2.5} className={activeTab === 'cart' ? 'text-[#1A1A18]' : 'text-[#8C8880]'} />

          {/* 🟢 只有當 cartCount 大於 0 時，才顯示紅底白字的小圓點 */}
          {cartCount > 0 && (
            <span className="absolute top-1 right-1 bg-[#C8522A] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white font-bold">
              {cartCount}
            </span>
          )}
        </div>

        {userRole === 'koc' && (
          <div
            className="cursor-pointer hover:bg-[#F5F0E8] p-2.5 rounded-full transition-colors"
            onClick={() => onNavigate?.('chat')}
          >
            <MessageCircle size={22} strokeWidth={2.5} className={activeTab === 'chat' ? 'text-[#1A1A18]' : 'text-[#8C8880]'} />
          </div>
        )}

        <div
          className="relative cursor-pointer hover:bg-[#F5F0E8] p-2.5 rounded-full transition-colors"
          onClick={() => onNavigate?.('support')}
        >
          <Headset size={22} strokeWidth={2.5} className={activeTab === 'support' ? 'text-[#1A1A18]' : 'text-[#8C8880]'} />

          {supportUnreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-[#C8522A] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white font-bold">
              {supportUnreadCount}
            </span>
          )}
        </div>

        <div
          className="relative"
          onMouseEnter={() => setProfileMenuOpen(true)}
          onMouseLeave={() => setProfileMenuOpen(false)}
        >
          <div
            className="cursor-pointer hover:bg-[#F5F0E8] p-2.5 rounded-full transition-colors"
            onClick={() => onNavigate?.('profile')}
          >
            <User size={22} strokeWidth={2.5} className={['profile', 'security', 'points', 'orders', 'applyKoc'].includes(activeTab) ? 'text-[#1A1A18]' : 'text-[#8C8880]'} />
          </div>

          {/* 右上角個人選單 */}
          {profileMenuOpen && (
            <div className="absolute right-0 top-full pt-2 w-44 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="bg-white border border-[#E2DDD4] rounded-2xl shadow-[0_8px_30px_rgba(26,26,24,0.08)] overflow-hidden py-2">
                <button
                  onClick={() => { setProfileMenuOpen(false); onNavigate?.('profile'); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors text-left"
                >
                  <Settings size={16} strokeWidth={2.5} />
                  個人設定
                </button>
                <button
                  onClick={() => { setProfileMenuOpen(false); onLogout?.(); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-[#C8522A] hover:bg-[#FEF5F3] transition-colors text-left"
                >
                  <LogOut size={16} strokeWidth={2.5} />
                  登出系統
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}