import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import VendorHeader from './VendorHeader';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';

const titles = {
  '/vendor': { title: '總覽', sub: '歡迎回來，查看您的 KOC 行銷成效' },
  '/vendor/finance': { title: '金流管理', sub: '查看金流明細與申請撥款' },
  '/vendor/campaigns': { title: '合作活動管理', sub: '建立與管理 KOC 行銷活動' },
  '/vendor/products': { title: '商品管理', sub: '管理上架商品、設定 KOC 優惠及庫存' },
  '/vendor/koc': { title: 'KOC 合作管理', sub: '追蹤 KOC 推廣成效與優惠碼使用情況' },
  '/vendor/orders': { title: '訂單管理', sub: '透過優惠碼追蹤每筆 KOC 帶入訂單' },
  '/vendor/analytics': { title: '成效分析', sub: '查看活動、訂單、商品與優惠碼帶來的實際成效' },
  '/vendor/review': { title: '審核管理', sub: '審核 KOC 的合作申請及提交的貼文文案' },
  '/vendor/chat': { title: '聊天室', sub: '與 KOC 即時溝通' },
  '/vendor/settings': { title: '設定', sub: '管理帳號資訊與通知偏好' },
  '/vendor/support': { title: '客服諮詢', sub: '有任何問題都可以在這裡詢問客服' },
};

export default function VendorLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const key = Object.keys(titles).filter(k => k !== '/vendor').find(k => pathname.startsWith(k)) ?? '/vendor';
  const { title, sub } = titles[key] ?? titles['/vendor'];
  const isChat = pathname === '/vendor/chat';

  // 閒置 30 分鐘自動登出：偵測常見的使用者活動事件，
  // 只要有動作就重新計時，完全沒有活動達到門檻時間才觸發登出。
  useEffect(() => {
    const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 分鐘
    const vendorId = localStorage.getItem('vendor_id');
    if (!vendorId) return;

    let idleTimer = null;

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        localStorage.removeItem('vendor_id');
        navigate('/vendor-login');
      }, IDLE_LIMIT_MS);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetIdleTimer));

    resetIdleTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetIdleTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="flex flex-col h-screen bg-[#F8F9FA] font-sans text-[#1A1A18]">

          {/* 頂部導覽列 */}
          <VendorHeader />

          {/* 主要內容區 */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {!isChat && (
              <div className="px-4 md:px-8 lg:px-12 pt-6 md:pt-10 pb-4 md:pb-6 shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
                <h1 className="text-2xl md:text-[32px] font-serif font-bold text-[#1A1A18] tracking-wide mb-1.5 md:mb-2 flex items-center gap-2.5 md:gap-3">
                  <span className="w-1.5 md:w-2 h-6 md:h-8 bg-[#C8522A] rounded-full inline-block"></span>
                  {title}
                </h1>
                <p className="text-[11px] md:text-sm font-bold text-[#8C8880] tracking-wider ml-4 md:ml-5">
                  {sub}
                </p>
              </div>
            )}

            <main className={`flex-1 overflow-y-auto custom-scrollbar ${isChat ? '' : 'px-4 md:px-8 lg:px-12 pb-6 md:pb-12'}`}>
              <Outlet />
            </main>
          </div>

        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}