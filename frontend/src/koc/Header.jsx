import React, { useState } from 'react';
import { ShoppingCart, User, Heart, MessageCircle, Headset, Settings, LogOut, Bell, Package, Briefcase, Menu, X, TrendingUp, Sparkles, FileText, Lock } from 'lucide-react';

import LogoIcon from '../assets/logo.jpg';
import HeaderPreview from './HeaderPreview';
import HeaderMessages, { useMessageUnread } from './HeaderMessages';
import LogoText from '../assets/ShareBuy.png';

// 通知下拉最多列出幾則，更早的到完整的通知頁看
const NOTIFICATION_DROPDOWN_LIMIT = 20;

// 「剛剛」「5 分鐘前」「3 小時前」，超過一天顯示日期
function formatNotifTime(isoString) {
  const then = new Date(isoString);
  const diffMinutes = Math.floor((Date.now() - then.getTime()) / 60000);
  if (diffMinutes < 1) return '剛剛';
  if (diffMinutes < 60) return `${diffMinutes} 分鐘前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小時前`;
  return then.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
}

// 接收 cartCount
export default function Header({
  activeTab,
  onNavigate,
  userRole,
  cartCount = 0,
  supportUnreadCount = 0,
  onLogout,
  notifications = { unreadCount: 0, orderUnreadCount: 0, kocUnreadCount: 0 },
  onRefreshNotifications,
  onOpenNotification,
}) {

  const allNavItems = [
    { label: '購物頁面', key: 'shop', isKocOnly: false },
    { label: '接案中心', key: 'home', isKocOnly: true },
  ];

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 通知下拉要列出的通知：訂單通知與接案通知合在一起，新的在前面
  const allNotifications = [...(notifications.order || []), ...(notifications.koc || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  // 右上角聊天圖示（電腦版）與手機選單「我的訊息」共用的未讀數
  const messageUnread = useMessageUnread(userRole);

  const navItems = allNavItems.filter(item => {
    if (item.isKocOnly && userRole !== 'koc') return false;
    return true;
  });

  const getActiveKey = (tab) => {
    if (['home', 'task_detail', 'review'].includes(tab)) return 'home';
    if (['earnings', 'earnings_detail'].includes(tab)) return 'earnings';
    if (['shop', 'product_detail', 'cart', 'checkout'].includes(tab)) return 'shop';
    return '';
  };

  const currentActiveKey = getActiveKey(activeTab);

  const handleNavigate = (key, extra) => {
    setMobileMenuOpen(false);
    onNavigate?.(key, extra);
  };

  return (
    <header className="bg-white border-b border-[#E2DDD4]/60 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-4 md:gap-8">

        <div className="flex items-center gap-2 md:gap-3">
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

          {/* 新增的身份標籤 */}
          <span className={`px-2 py-0.5 md:py-1 rounded-md text-[10px] md:text-xs font-bold tracking-wider ${
            userRole === 'koc' 
              ? 'bg-[#FDF0ED] text-[#C8522A] border border-[#C8522A]/30' 
              : 'bg-[#F5F0E8] text-[#8C8880] border border-[#E2DDD4]'
          }`}>
            {userRole === 'koc' ? 'KOC' : '消費者'}
          </span>
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
          {/* 滑鼠移上去會顯示收藏預覽，點圖示一樣進收藏頁 */}
          <HeaderPreview kind="favorites" isGuest={userRole === 'guest'} onViewAll={() => handleNavigate('favorites')}>
            <div
              className="cursor-pointer hover:bg-[#F5F0E8] p-2.5 rounded-full transition-colors"
              onClick={() => handleNavigate('favorites')}
            >
              <Heart size={22} strokeWidth={2.5} className={activeTab === 'favorites' ? 'text-[#1A1A18]' : 'text-[#8C8880]'} />
            </div>
          </HeaderPreview>

          {/* 我的訊息：有未讀顯示數字，滑鼠移上去展開接案聊天／廠商訊息，分別進對應的分頁 */}
          <HeaderMessages userRole={userRole} active={['messages', 'chat'].includes(activeTab)} unread={messageUnread} />
        </div>

        {/* 購物車：手機版與電腦版都保留；電腦版滑鼠移上去會顯示購物車預覽 */}
        <HeaderPreview kind="cart" isGuest={userRole === 'guest'} onViewAll={() => handleNavigate('cart')} refreshKey={cartCount}>
          <div
            className="relative cursor-pointer hover:bg-[#F5F0E8] p-2 md:p-2.5 rounded-full transition-colors"
            onClick={() => handleNavigate('cart')}
          >
            <ShoppingCart size={22} strokeWidth={2.5} className={activeTab === 'cart' ? 'text-[#1A1A18]' : 'text-[#8C8880]'} />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 md:top-1 md:right-1 bg-[#C8522A] text-white text-[9px] md:text-[10px] min-w-3.5 h-3.5 md:min-w-4 md:h-4 px-0.5 flex items-center justify-center rounded-full border-2 border-white box-content font-bold">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>
        </HeaderPreview>

        {/* 通知鈴鐺：手機版與電腦版都保留 */}
        <div
          className="relative"
          onMouseEnter={() => { setNotifOpen(true); onRefreshNotifications?.(); }}
          onMouseLeave={() => setNotifOpen(false)}
        >
          <div 
            className="relative cursor-pointer hover:bg-[#F5F0E8] p-2.5 rounded-full transition-colors"
            onClick={() => {
              setNotifOpen(!notifOpen);
              if (!notifOpen) onRefreshNotifications?.();
            }}
          >
            <Bell size={22} strokeWidth={2.5} className={notifOpen ? 'text-[#1A1A18]' : 'text-[#8C8880]'} />

            {notifications.unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 md:top-1 md:right-1 bg-[#C8522A] text-white text-[9px] md:text-[10px] min-w-3.5 h-3.5 md:min-w-4 md:h-4 px-0.5 flex items-center justify-center rounded-full border-2 border-white box-content font-bold">
                {notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}
              </span>
            )}
          </div>

          {/* 通知下拉：直接列出最近的通知（做法比照廠商後台），點一則就標為已讀並跳到對應頁面 */}
          {/* 手機版鈴鐺不在最右邊，固定寬度往左展開會超出螢幕，改成貼齊螢幕左右兩側 */}
          {notifOpen && (
            <div className="fixed left-3 right-3 top-14 pt-2 md:absolute md:left-auto md:right-0 md:top-full md:w-80 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="bg-white border border-[#E2DDD4] rounded-2xl shadow-[0_8px_30px_rgba(26,26,24,0.08)] overflow-hidden">
                <div className="px-5 py-3 border-b border-[#E2DDD4] text-sm font-bold text-[#1A1A18]">
                  通知
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {allNotifications.length === 0 ? (
                    <div className="px-5 py-8 text-center text-xs font-bold text-[#8C8880]">
                      目前沒有通知
                    </div>
                  ) : (
                    allNotifications.slice(0, NOTIFICATION_DROPDOWN_LIMIT).map((n) => (
                      <button
                        key={n.notification_id}
                        onClick={() => { setNotifOpen(false); onOpenNotification?.(n); }}
                        className={`w-full text-left px-5 py-3 border-b border-[#F5F0E8] last:border-0 hover:bg-[#F8F9FA] transition-colors flex items-start gap-2 ${
                          !n.is_read ? 'bg-[#FDF0ED]/40' : ''
                        }`}
                      >
                        {!n.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C8522A] mt-1.5 shrink-0" />
                        )}
                        <div className={`min-w-0 ${n.is_read ? 'ml-3.5' : ''}`}>
                          <div className="text-xs font-bold text-[#1A1A18]">{n.title}</div>
                          {n.body && (
                            <div className="text-[11px] text-[#8C8880] mt-0.5 line-clamp-2">{n.body}</div>
                          )}
                          <div className="text-[10px] text-[#B8B4AC] mt-1">{formatNotifTime(n.created_at)}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {/* 完整的通知頁：訂單通知、接案通知（只有 KOC）分開兩頁 */}
                <div className="flex border-t border-[#E2DDD4] text-xs font-bold text-[#8C8880]">
                  <button
                    onClick={() => { setNotifOpen(false); handleNavigate('notifications', 'order'); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors"
                  >
                    <Package size={14} strokeWidth={2.5} />
                    全部訂單通知
                    {notifications.orderUnreadCount > 0 && (
                      <span className="bg-[#C8522A] text-white text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full">
                        {notifications.orderUnreadCount}
                      </span>
                    )}
                  </button>
                  {userRole === 'koc' && (
                    <button
                      onClick={() => { setNotifOpen(false); handleNavigate('notifications', 'koc'); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 border-l border-[#E2DDD4] hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors"
                    >
                      <Briefcase size={14} strokeWidth={2.5} />
                      全部接案通知
                      {notifications.kocUnreadCount > 0 && (
                        <span className="bg-[#C8522A] text-white text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full">
                          {notifications.kocUnreadCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 電腦版個人選單：手機版隱藏，改用下方的漢堡選單 */}
        <div
          className="relative hidden md:block"
          onMouseEnter={() => setProfileMenuOpen(true)}
          onMouseLeave={() => setProfileMenuOpen(false)}
        >
          {/* --- KOC 角色會加上外框特效 --- */}
          <div
            className={`relative cursor-pointer hover:bg-[#F5F0E8] p-2.5 rounded-full transition-all ${
              userRole === 'koc' ? 'ring-2 ring-[#C8522A] ring-offset-2 ring-offset-white' : ''
            }`}
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          >
            <User size={22} strokeWidth={2.5} className={['profile', 'security', 'points', 'orders', 'applyKoc'].includes(activeTab) ? 'text-[#1A1A18]' : 'text-[#8C8880]'} />

            {supportUnreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 md:top-1 md:right-1 bg-[#C8522A] text-white text-[9px] md:text-[10px] min-w-3.5 h-3.5 md:min-w-4 md:h-4 px-0.5 flex items-center justify-center rounded-full border-2 border-white box-content font-bold">
                {supportUnreadCount > 99 ? '99+' : supportUnreadCount}
              </span>
            )}
          </div>

          {/* 右上角個人選單 */}
          {profileMenuOpen && (
            <div className="absolute right-0 top-full pt-2 w-48 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="bg-white border border-[#E2DDD4] rounded-2xl shadow-[0_8px_30px_rgba(26,26,24,0.08)] overflow-hidden py-2">
                <button
                  onClick={() => { setProfileMenuOpen(false); handleNavigate('profile'); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors text-left"
                >
                  <Settings size={16} strokeWidth={2.5} />
                  個人設定
                </button>
                <button
                  onClick={() => { setProfileMenuOpen(false); handleNavigate('support'); }}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3 text-sm font-bold text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors text-left"
                >
                  <span className="flex items-center gap-3">
                    <Headset size={16} strokeWidth={2.5} />
                    客服諮詢
                  </span>
                  {supportUnreadCount > 0 && (
                    <span className="bg-[#C8522A] text-white text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full font-bold">
                      {supportUnreadCount > 99 ? '99+' : supportUnreadCount}
                    </span>
                  )}
                </button>
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

        {/* 手機版漢堡選單按鈕 */}
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
                    ['home', 'task_detail', 'review'].includes(activeTab) ? 'bg-[#F5F0E8] text-[#1A1A18]' : 'text-[#8C8880] hover:bg-[#F5F0E8]'
                  }`}
                >
                  <Briefcase size={20} strokeWidth={2.5} className={['home', 'task_detail', 'review'].includes(activeTab) ? 'text-[#C8522A]' : ''} />
                  我的接案
                </button>

                <button
                  onClick={() => handleNavigate('earnings')}
                  className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-colors ${
                    ['earnings', 'earnings_detail'].includes(activeTab) ? 'bg-[#F5F0E8] text-[#1A1A18]' : 'text-[#8C8880] hover:bg-[#F5F0E8]'
                  }`}
                >
                  <TrendingUp size={20} strokeWidth={2.5} className={['earnings', 'earnings_detail'].includes(activeTab) ? 'text-[#C8522A]' : ''} />
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

            <button
              onClick={() => handleNavigate('messages')}
              className="flex items-center gap-3 p-3 rounded-xl font-bold text-[#8C8880] hover:bg-[#F5F0E8] transition-colors"
            >
              <MessageCircle size={20} strokeWidth={2.5} className={activeTab === 'messages' ? 'text-[#C8522A]' : ''} />
              我的訊息
              {messageUnread.total > 0 && (
                <span className="ml-auto bg-[#C8522A] text-white text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full font-bold">
                  {messageUnread.total > 99 ? '99+' : messageUnread.total}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNavigate('support')}
              className="flex items-center justify-between p-3 rounded-xl font-bold text-[#8C8880] hover:bg-[#F5F0E8] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Headset size={20} strokeWidth={2.5} className={activeTab === 'support' ? 'text-[#C8522A]' : ''} />
                聯絡客服
              </div>
              {supportUnreadCount > 0 && (
                <span className="bg-[#C8522A] text-white text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full font-bold">
                  {supportUnreadCount > 99 ? '99+' : supportUnreadCount}
                </span>
              )}
            </button>
          </div>

          {/* 第四區：個人設定、登入與安全、登出 */}
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