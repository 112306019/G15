import React, { useState } from 'react';
import { ShoppingCart, User, Heart, MessageCircle, Headset, Settings, LogOut, Menu, X, Briefcase, TrendingUp, Sparkles, FileText, Lock } from 'lucide-react'; // 🟢 引入 Lock icon

import LogoIcon from '../assets/logo.jpg';
import LogoText from '../assets/ShareBuy.png';

// 🟢 接收 cartCount
export default function Header({ activeTab, onNavigate, userRole, cartCount = 0, supportUnreadCount = 0, onLogout }) {

  const allNavItems = [
    { label: '購物頁面', key: 'shop', isKocOnly: false },
    { label: '接案中心', key: 'home', isKocOnly: true },
  ];

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleNavigate = (key) => {
    setMobileMenuOpen(false);
    onNavigate?.(key);
  };

  return (
    <header className="bg-white border-b border-[#E2DDD4]/60 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-4 md:gap-8">

        <div
          className="bg-[#F5F0E8] px-3 md:px-4 py-1.5 rounded-full flex items-center gap-2 md:gap-2.5 cursor-pointer hover:bg-[#E2DDD4] transition-colors"
          onClick={() => handleNavigate('shop')}
        >
          {/* 左側：圓形 Icon */}
          <img 
            src={LogoIcon} 
            alt="ShareBuy Icon" 
            className="h-7 w-7 md:h-8 md:w-8 object-cover rounded-full shadow-sm" 
          />
          
          {/* 右側：文字 Logo */}
          <img 
            src={LogoText} 
            alt="ShareBuy Text" 
            className="h-5 md:h-7 w-auto object-contain mix-blend-multiply translate-y-0.5"
          />
        </div>

        <div className="hidden md:block h-6 w-px bg-[#E2DDD4]"></div>

        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = currentActiveKey === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavigate(item.key)}
                className={`relative text-sm transition-colors py-1 ${
                  isActive
                    ? 'text-[#1A1A18] font-black'
                    : 'text-[#8C8880] font-bold hover:text-[#1A1A18]'
                }`}
              >
                {item.label}
                
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 h-[3px] w-3/4 -translate-x-1/2 rounded-full bg-[#C8522A]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2 md:gap-5">
        
        <div className="hidden md:flex items-center gap-2 md:gap-5">
          <div
            className="cursor-pointer hover:bg-[#F5F0E8] p-2.5 rounded-full transition-colors"
            onClick={() => handleNavigate('favorites')}
          >
            <Heart size={22} strokeWidth={2.5} className={activeTab === 'favorites' ? 'text-[#1A1A18]' : 'text-[#8C8880]'} />
          </div>

          {userRole === 'koc' && (
            <div
              className="cursor-pointer hover:bg-[#F5F0E8] p-2.5 rounded-full transition-colors"
              onClick={() => handleNavigate('chat')}
            >
              <MessageCircle size={22} strokeWidth={2.5} className={activeTab === 'chat' ? 'text-[#1A1A18]' : 'text-[#8C8880]'} />
            </div>
          )}

          <div
            className="relative cursor-pointer hover:bg-[#F5F0E8] p-2.5 rounded-full transition-colors"
            onClick={() => handleNavigate('support')}
          >
            <Headset size={22} strokeWidth={2.5} className={activeTab === 'support' ? 'text-[#1A1A18]' : 'text-[#8C8880]'} />

            {supportUnreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-[#C8522A] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white font-bold">
                {supportUnreadCount}
              </span>
            )}
          </div>
        </div>

        {/* 購物車：手機版與電腦版都保留 */}
        <div
          className="relative cursor-pointer hover:bg-[#F5F0E8] p-2 md:p-2.5 rounded-full transition-colors"
          onClick={() => handleNavigate('cart')}
        >
          <ShoppingCart size={22} strokeWidth={2.5} className={activeTab === 'cart' ? 'text-[#1A1A18]' : 'text-[#8C8880]'} />
          {cartCount > 0 && (
            <span className="absolute top-0 right-0 md:top-1 md:right-1 bg-[#C8522A] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white font-bold">
              {cartCount}
            </span>
          )}
        </div>

        {/* 電腦版個人選單：手機版隱藏 */}
        <div
          className="relative hidden md:block"
          onMouseEnter={() => setProfileMenuOpen(true)}
          onMouseLeave={() => setProfileMenuOpen(false)}
        >
          <div
            className="cursor-pointer hover:bg-[#F5F0E8] p-2.5 rounded-full transition-colors"
            onClick={() => handleNavigate('profile')}
          >
            <User size={22} strokeWidth={2.5} className={['profile', 'security', 'points', 'orders', 'applyKoc'].includes(activeTab) ? 'text-[#1A1A18]' : 'text-[#8C8880]'} />
          </div>

          {/* 右上角個人選單 */}
          {profileMenuOpen && (
            <div className="absolute right-0 top-full pt-2 w-44 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="bg-white border border-[#E2DDD4] rounded-2xl shadow-[0_8px_30px_rgba(26,26,24,0.08)] overflow-hidden py-2">
                <button
                  onClick={() => { setProfileMenuOpen(false); handleNavigate('profile'); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors text-left"
                >
                  <Settings size={16} strokeWidth={2.5} />
                  個人設定
                </button>
                {/* 🟢 電腦版的下拉選單也補上登入與安全 */}
                <button
                  onClick={() => { setProfileMenuOpen(false); handleNavigate('security'); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors text-left"
                >
                  <Lock size={16} strokeWidth={2.5} />
                  登入與安全
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

        <div
          className="md:hidden cursor-pointer hover:bg-[#F5F0E8] p-2 rounded-full transition-colors text-[#8C8880]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b border-[#E2DDD4]/60 shadow-[0_10px_20px_rgba(0,0,0,0.05)] md:hidden flex flex-col z-50 animate-in slide-in-from-top-2 fade-in duration-200 max-h-[80vh] overflow-y-auto">
          
          {/* 第一區：頂部主要導航 (購物頁面 / 接案中心) */}
          <div className="p-4 flex flex-col gap-2 border-b border-[#E2DDD4]/30">
            {navItems.map((item) => {
              const isActive = currentActiveKey === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavigate(item.key)}
                  className={`flex items-center p-3 rounded-xl transition-colors ${
                    isActive ? 'bg-[#F5F0E8] text-[#1A1A18] font-black' : 'text-[#8C8880] font-bold hover:bg-[#F5F0E8]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="p-4 flex flex-col gap-2 border-b border-[#E2DDD4]/30">
            
            {userRole === 'koc' && (
              <>
                <button
                  onClick={() => handleNavigate('home')}
                  className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-colors ${
                    ['home', 'task_detail', 'review', 'analysis', 'sales_data'].includes(activeTab) ? 'bg-[#F5F0E8] text-[#1A1A18]' : 'text-[#8C8880] hover:bg-[#F5F0E8]'
                  }`}
                >
                  <Briefcase size={20} strokeWidth={2.5} className={['home', 'task_detail', 'review', 'analysis', 'sales_data'].includes(activeTab) ? 'text-[#C8522A]' : ''} />
                  我的接案
                </button>

                <button
                  onClick={() => handleNavigate('earnings')}
                  className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-colors ${
                    ['earnings', 'earnings_detail', 'pending_detail'].includes(activeTab) ? 'bg-[#F5F0E8] text-[#1A1A18]' : 'text-[#8C8880] hover:bg-[#F5F0E8]'
                  }`}
                >
                  <TrendingUp size={20} strokeWidth={2.5} className={['earnings', 'earnings_detail', 'pending_detail'].includes(activeTab) ? 'text-[#C8522A]' : ''} />
                  我的收益
                </button>
              </>
            )}

            {userRole === 'shopper' && (
              <button
                onClick={() => handleNavigate('applyKoc')}
                className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-colors ${
                  activeTab === 'applyKoc' ? 'bg-[#F5F0E8] text-[#1A1A18]' : 'text-[#8C8880] hover:bg-[#F5F0E8]'
                }`}
              >
                <Sparkles size={20} strokeWidth={2.5} className={activeTab === 'applyKoc' ? 'text-[#C8522A]' : ''} />
                申請成為 KOC
              </button>
            )}

            <button
              onClick={() => handleNavigate('orders')}
              className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-colors ${
                ['orders', 'order_detail'].includes(activeTab) ? 'bg-[#F5F0E8] text-[#1A1A18]' : 'text-[#8C8880] hover:bg-[#F5F0E8]'
              }`}
            >
              <FileText size={20} strokeWidth={2.5} className={['orders', 'order_detail'].includes(activeTab) ? 'text-[#C8522A]' : ''} />
              我的訂單
            </button>
          </div>

          {/* 第三區：輔助功能 (收藏、訊息、客服) */}
          <div className="p-4 flex flex-col gap-2 border-b border-[#E2DDD4]/30">
            <button
              onClick={() => handleNavigate('favorites')}
              className="flex items-center gap-3 p-3 rounded-xl font-bold text-[#8C8880] hover:bg-[#F5F0E8] transition-colors"
            >
              <Heart size={20} strokeWidth={2.5} className={activeTab === 'favorites' ? 'text-[#C8522A]' : ''} />
              我的收藏
            </button>
            
            {userRole === 'koc' && (
              <button
                onClick={() => handleNavigate('chat')}
                className="flex items-center gap-3 p-3 rounded-xl font-bold text-[#8C8880] hover:bg-[#F5F0E8] transition-colors"
              >
                <MessageCircle size={20} strokeWidth={2.5} className={activeTab === 'chat' ? 'text-[#C8522A]' : ''} />
                訊息中心
              </button>
            )}

            <button
              onClick={() => handleNavigate('support')}
              className="flex items-center justify-between p-3 rounded-xl font-bold text-[#8C8880] hover:bg-[#F5F0E8] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Headset size={20} strokeWidth={2.5} className={activeTab === 'support' ? 'text-[#C8522A]' : ''} />
                聯絡客服
              </div>
              {supportUnreadCount > 0 && (
                <span className="bg-[#C8522A] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                  {supportUnreadCount}
                </span>
              )}
            </button>
          </div>

          {/* 第四區：個人設定與登出 */}
          <div className="p-4 flex flex-col gap-2">
            <button
              onClick={() => handleNavigate('profile')}
              className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-colors ${
                activeTab === 'profile' ? 'bg-[#F5F0E8] text-[#1A1A18]' : 'text-[#8C8880] hover:bg-[#F5F0E8]'
              }`}
            >
              <User size={20} strokeWidth={2.5} className={activeTab === 'profile' ? 'text-[#C8522A]' : ''} />
              個人資訊
            </button>

          {/* 第五區：登入與安全 */}
            <button
              onClick={() => handleNavigate('security')}
              className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-colors ${
                activeTab === 'security' ? 'bg-[#F5F0E8] text-[#1A1A18]' : 'text-[#8C8880] hover:bg-[#F5F0E8]'
              }`}
            >
              <Lock size={20} strokeWidth={2.5} className={activeTab === 'security' ? 'text-[#C8522A]' : ''} />
              登入與安全
            </button>

            <button
              onClick={() => { setMobileMenuOpen(false); onLogout?.(); }}
              className="flex items-center gap-3 p-3 rounded-xl font-bold text-[#C8522A] hover:bg-[#FEF5F3] transition-colors"
            >
              <LogOut size={20} strokeWidth={2.5} />
              登出系統
            </button>
          </div>

        </div>
      )}
    </header>
  );
}