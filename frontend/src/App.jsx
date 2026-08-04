import { API_BASE_URL } from './config';
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';

// === KOC 相關頁面 ===
import Header from './koc/Header';
import HomePage from './koc/HomePage';
import AnalysisPage from './koc/AnalysisPage';
import TaskDetailPage from './koc/TaskDetailPage';
import EarningsPage from './koc/EarningsPage';
import EarningsDetailPage from './koc/EarningsDetailPage';
import PendingEarningsPage from './koc/PendingEarningsPage';
import SalesDataPage from './koc/SalesDataPage';
import ProductDetailPage from './koc/ProductDetailPage';
import ApplyKOCPage from './koc/ApplyKOCPage';
import ChatPage from './koc/ChatPage';

// === Shopping 相關頁面 ===
import ReviewPage from './shopping/ReviewPage';
import WelcomePage from './shopping/WelcomePage';
import ShopPage from './shopping/ShopPage';
import CartPage from './shopping/CartPage';
import CheckoutPage from './shopping/CheckoutPage';
import OrdersPage from './shopping/OrdersPage';
import OrderDetailPage from './shopping/OrderDetailPage';
import FavoritesPage from './shopping/FavoritesPage';

// === Authentication & Vendor ===
import LoginPage from './authentication/LoginPage';
import ProfilePage from './authentication/ProfilePage';
import SecurityPage from './authentication/SecurityPage';
import VendorApp from './VendorApp';
import VendorLogin from './authentication/VendorLogin';


// === 平台管理端 (Admin) 相關頁面 ===
import AdminLogin from './admin/AdminLogin';
import AdminApp from './AdminApp';


// 🌟 新增：引入 Heart icon
import { User, Lock, Ticket, Coins, FileText, Briefcase, TrendingUp, Sparkles, ChevronDown, Heart } from 'lucide-react';

function Sidebar({ currentView, onNavigate, userRole }) {
  const [expandedMenu, setExpandedMenu] = useState('home');

  const allMenuItems = [
    { icon: <User size={18} />, label: '個人資訊', view: 'profile' },
    { icon: <Briefcase size={18} />, label: '我的任務', view: 'home', role: 'koc' },
    { icon: <TrendingUp size={18} />, label: '我的收益', view: 'earnings', role: 'koc' },
    { icon: <Sparkles size={18} />, label: '申請成為KOC', view: 'applyKoc', role: 'shopper' },
    { icon: <Heart size={18} />, label: '我的收藏', view: 'favorites' },
    { icon: <FileText size={18} />, label: '我的訂單', view: 'orders' },
    { icon: <Lock size={18} />, label: '登入與安全', view: 'security' },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.role === 'koc' && userRole !== 'koc') return false;
    if (item.role === 'shopper' && userRole !== 'shopper') return false;
    return true;
  });

  return (
    <aside className="w-64 bg-white rounded-3xl border border-[#E2DDD4] shadow-sm p-6 h-fit shrink-0">
      <nav className="space-y-2">
        {menuItems.map((item, index) => {
          const isActive = currentView === item.view || (item.subItems && item.subItems.some(sub => sub.view === currentView));
          const isExpanded = expandedMenu === item.view;

          return (
            <div key={index} className="flex flex-col">
              <div
                onClick={() => {
                  if (item.subItems) {
                    setExpandedMenu(isExpanded ? null : item.view);
                    onNavigate(item.subItems[0].view);
                  } else {
                    setExpandedMenu(null);
                    onNavigate(item.view);
                  }
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all font-bold ${isActive ? 'text-[#1A1A18] bg-[#F5F0E8]' : 'text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F5F0E8]/50'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className={isActive ? 'text-[#C8522A]' : 'text-[#8C8880]'}>{item.icon}</div>
                  <span className="text-sm tracking-wide">{item.label}</span>
                </div>
                {item.subItems && <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />}
              </div>

              {item.subItems && isExpanded && (
                <div className="mt-1 ml-10 space-y-1 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                  {item.subItems.map((sub, subIdx) => (
                    <div
                      key={subIdx}
                      onClick={() => onNavigate(sub.view)}
                      className={`p-2.5 rounded-xl cursor-pointer text-sm font-bold transition-colors ${currentView === sub.view ? 'text-[#C8522A] bg-[#FDF0ED]' : 'text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F5F0E8]/50'
                        }`}
                    >
                      {sub.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

// 刷新後這些頁面需要的資料（selectedTask/selectedProduct）只存在記憶體、不會留下來，
// 還原時不能停在這些頁面，只能退回各自的清單頁
const VIEWS_NEEDING_TRANSIENT_DATA = ['task_detail', 'sales_data', 'product_detail'];

// 從 localStorage 恢復登入狀態與刷新前所在頁面；role 一律存字串，比對時需轉型
function getRestoredAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (token && role) {
    const mappedRole = Number(role) === 1 ? 'koc' : 'shopper';
    const defaultView = mappedRole === 'koc' ? 'home' : 'shop';
    const savedView = localStorage.getItem('view');
    const restoredView = savedView && !VIEWS_NEEDING_TRANSIENT_DATA.includes(savedView)
      ? savedView
      : defaultView;
    return { view: restoredView, userRole: mappedRole };
  }
  return { view: 'welcome', userRole: 'guest' };
}

function MainSystem() {
  const [view, setView] = useState(() => getRestoredAuth().view);
  const [selectedTask, setSelectedTask] = useState(null);
  const [homeJumpStage, setHomeJumpStage] = useState(null);

  const [userRole, setUserRole] = useState(() => getRestoredAuth().userRole);
  const [cartCount, setCartCount] = useState(0);
  // 從後端同步購物車數量
  const syncCartCount = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/consumer/cart/view?User_id=${userId}`);
      const data = await res.json();
      if (data.items) {
        const uniqueProducts = new Set(data.items.map(item => item.Product_id));
        setCartCount(uniqueProducts.size);
      }
    } catch (err) {
      console.error("購物車數量同步失敗", err);
    }
  };
  const [cartItems, setCartItems] = useState([]);
  const [checkoutSummary, setCheckoutSummary] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [appToast, setAppToast] = useState("");
  const [shopKey, setShopKey] = useState(0);

  const navigate = useNavigate();

  // 登入狀態下，記住每次切換的 view，刷新時才能還原到原本所在的頁面（而非固定跳回預設頁）
  useEffect(() => {
    if (localStorage.getItem('token')) {
      localStorage.setItem('view', view);
    }
  }, [view]);

  // roleOverride：登入/註冊成功當下 setUserRole 還沒 flush，導航判斷要用新角色而非舊的 state 閉包
  const handleNavigate = (targetView, data = null, roleOverride = null) => {
    const protectedViews = [
      'profile', 'security', 'coupons', 'points', 'orders', 'order_detail',
      'home', 'earnings', 'earnings_detail', 'pending_detail', 'applyKoc', 'checkout', 'cart', 'review', 'favorites', 'chat'
    ];
    const effectiveRole = roleOverride ?? userRole;

    if (targetView === 'shop') setShopKey(prev => prev + 1);

    if (effectiveRole === 'guest' && protectedViews.includes(targetView)) {
      setAppToast("需先登入或註冊才能使用此功能喔！");
      setTimeout(() => setAppToast(""), 3500);
      return;
    }

    if (data) {
      if (targetView === 'sales_data') setSelectedProduct(data);
      if (targetView === 'task_detail') setSelectedTask(data);
      if (targetView === 'product_detail') {
        setSelectedProduct(data);
        setTimeout(() => setView(targetView), 0);
        return;
      }
    }

    setView(targetView);
  };

  const shellViews = [
    'home', 'earnings', 'earnings_detail', 'pending_detail', 'profile',
    'security', 'orders', 'order_detail', 'applyKoc',
    'review', 'analysis', 'sales_data', 'task_detail', 'favorites'
  ];

  const getSidebarActiveView = () => {
    if (['home', 'review', 'analysis', 'sales_data', 'task_detail'].includes(view)) return 'home';
    if (['earnings', 'earnings_detail', 'pending_detail'].includes(view)) return 'earnings';
    if (['orders', 'order_detail'].includes(view)) return 'orders';
    return view;
  };

  const showHeader = !['welcome', 'login'].includes(view);

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-slate-800 relative">
      {showHeader && <Header activeTab={view} onNavigate={handleNavigate} userRole={userRole} cartCount={cartCount} />}

      {view === 'welcome' && <WelcomePage onSelectSeller={() => navigate('/vendor-login')} onSelectKoc={() => handleNavigate('login')} onSkipToShop={() => { setUserRole('guest'); handleNavigate('shop'); }} />}

      {view === 'login' && (
        <LoginPage
          onBack={() => handleNavigate('welcome')}
          onLoginSuccess={({ userId, role, token }) => {
            const mappedRole = role === 1 ? 'koc' : 'shopper';
            setUserRole(mappedRole);
            syncCartCount();
            handleNavigate(mappedRole === 'koc' ? 'home' : 'shop', null, mappedRole);
          }}
          onRegisterSuccess={() => {
            handleNavigate('login');
          }}
          onSkipToShop={() => {
            setUserRole('guest');
            handleNavigate('shop');
          }}
        />
      )}
      {view === 'shop' && <ShopPage key={shopKey} onNavigate={handleNavigate} userRole={userRole} onAddToCart={() => syncCartCount()} />}

      {view === 'product_detail' && (
        <ProductDetailPage
          onBack={() => handleNavigate('shop')}
          onGoCart={() => handleNavigate('cart')}
          onBuyNow={() => handleNavigate('checkout')}
          onNavigate={handleNavigate}
          userRole={userRole}
          onAddToCart={() => syncCartCount()}
          product={selectedProduct}
        />
      )}

      {view === 'cart' && <CartPage onContinueShopping={() => handleNavigate('shop')} onCheckout={(data) => { setCartItems(data?.items || []); setCheckoutSummary(data); handleNavigate('checkout'); }} />}
      {view === 'checkout' && <CheckoutPage
        cartItems={cartItems}
        onPaid={() => handleNavigate('orders')}
        onBack={() => handleNavigate('cart')}
        initialSummary={checkoutSummary ? {
          items: `$${checkoutSummary.subtotal} x ${checkoutSummary.items?.length}`,
          itemsAmount: checkoutSummary.subtotal,
          shippingAmount: 0,
          couponDiscount: checkoutSummary.couponDiscount || 0,
          pointsDiscount: 0,
          currency: "NTD",
          total: checkoutSummary.grandTotal,
        } : undefined}
      />}

      {view === 'chat' && <ChatPage />}

      {shellViews.includes(view) && (
        <div className="flex p-8 max-w-7xl mx-auto">
          <Sidebar userRole={userRole} currentView={getSidebarActiveView()} onNavigate={handleNavigate} />
          <main className="flex-1 ml-12">
            {view === 'home' && (
              <HomePage
                onNavigate={handleNavigate}
                jumpToStage={homeJumpStage}
                onJumpHandled={() => setHomeJumpStage(null)}
              />
            )}

            {view === 'analysis' && <AnalysisPage onBack={() => handleNavigate('home')} onViewData={(product) => handleNavigate('sales_data', product)} />}
            {view === 'sales_data' && <SalesDataPage product={selectedProduct} onBack={() => handleNavigate('analysis')} />}

            {view === 'task_detail' && (
              <TaskDetailPage
                task={selectedTask}
                onBack={(targetStage) => {
                  if (targetStage) setHomeJumpStage(targetStage);
                  handleNavigate('home');
                }}
              />
            )}

            {view === 'profile' && <ProfilePage isKOC={userRole === 'koc'} />}

            {view === 'security' && (
              <SecurityPage
                onLogout={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('userId');
                  localStorage.removeItem('role');
                  localStorage.removeItem('view');
                  setUserRole('guest');
                  setCartCount(0);
                  setView('welcome');
                }}
              />
            )}
            {view === 'orders' && <OrdersPage
              onTrackOrder={(id) => { setSelectedOrderId(id); setTimeout(() => handleNavigate('order_detail'), 0); }}
              onOpenOrderDetail={(id) => { setSelectedOrderId(id); setTimeout(() => handleNavigate('order_detail'), 0); }}
            />}
            {view === 'order_detail' && <OrderDetailPage onBack={() => handleNavigate('orders')} orderId={selectedOrderId} />}
            {view === 'earnings' && <EarningsPage onDetail={() => handleNavigate('earnings_detail')} onTrack={() => handleNavigate('pending_detail')} />}
            {view === 'earnings_detail' && <EarningsDetailPage onBack={() => handleNavigate('earnings')} />}
            {view === 'pending_detail' && <PendingEarningsPage onBack={() => handleNavigate('earnings')} />}

            {view === 'favorites' && (
              <FavoritesPage
                onAddToCart={() => setCartCount(c => c + 1)}
                onNavigate={handleNavigate}
              />
            )}

            {view === 'applyKoc' && (
              <ApplyKOCPage
                onSubmit={() => {
                  // 申請只是送出審核，還不是 KOC；要等平台審核通過、
                  // 重新登入後 user.role 才會變成 koc，這裡先留在消費者身份
                  handleNavigate('shop');
                }}
              />
            )}
          </main>
        </div>
      )}

      <div className={`fixed bottom-10 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-4 rounded-full bg-[#1A1A18] pl-6 pr-2 py-2 text-sm font-bold tracking-wide text-white shadow-xl transition-all duration-300 ${appToast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-10 opacity-0"}`}>
        <span>{appToast}</span>
        {appToast && <button onClick={() => { setAppToast(""); setView('login'); }} className="rounded-full bg-[#C8522A] px-5 py-2.5 text-xs transition-colors hover:bg-[#A64220]">前往登入</button>}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<MainSystem />} />
      <Route path="/vendor-login" element={<VendorLogin />} />
      <Route path="/vendor/*" element={<VendorApp />} />

      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin/*" element={<AdminApp />} />

    </Routes>
  );
}