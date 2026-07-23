import React, { useState } from 'react';
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
import ApplyPage from './koc/ApplyPage';
import ApplyKOCPage from './koc/ApplyKOCPage'; 

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
    { 
      icon: <Briefcase size={18} />, 
      label: '我的任務', 
      view: 'home', 
      role: 'koc',
      subItems: [
        { label: '代言申請區', view: 'apply' },
        { label: '任務管理', view: 'home' },
      ]
    },
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
                className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all font-bold ${
                  isActive ? 'text-[#1A1A18] bg-[#F5F0E8]' : 'text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F5F0E8]/50'
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
                      className={`p-2.5 rounded-xl cursor-pointer text-sm font-bold transition-colors ${
                        currentView === sub.view ? 'text-[#C8522A] bg-[#FDF0ED]' : 'text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F5F0E8]/50'
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

function MainSystem() {
  const [view, setView] = useState('welcome');
  const [selectedProduct, setSelectedProduct] = useState(null); 
  const [selectedTask, setSelectedTask] = useState(null); 

  const [userRole, setUserRole] = useState('guest'); 
  const [cartCount, setCartCount] = useState(0); 
  const [appToast, setAppToast] = useState("");
  const [shopKey, setShopKey] = useState(0);

  const [favorites, setFavorites] = useState([]);

  const navigate = useNavigate(); 

  const handleNavigate = (targetView, data = null) => {
    const protectedViews = [
      'profile', 'security', 'coupons', 'points', 'orders', 'order_detail', 
      'home', 'earnings', 'earnings_detail', 'pending_detail', 'applyKoc', 'checkout', 'apply', 'cart', 'review', 'favorites'
    ];

    if (targetView === 'shop') setShopKey(prev => prev + 1);

    if (userRole === 'guest' && protectedViews.includes(targetView)) {
      setAppToast("需先登入或註冊才能使用此功能喔！");
      setTimeout(() => setAppToast(""), 3500);
      return; 
    }

    if (data) {
      if (targetView === 'sales_data') setSelectedProduct(data);
      if (targetView === 'task_detail') setSelectedTask(data);
    }

    setView(targetView); 
  };

  const handleToggleFavorite = (product) => {
    setFavorites((prev) => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.filter(item => item.id !== product.id); // 已存在則移除
      } else {
        return [...prev, product]; // 不存在則加入
      }
    });
  };

  const handleRemoveFavorite = (productId) => {
    setFavorites((prev) => prev.filter(item => item.id !== productId));
  };

  const shellViews = [
    'home', 'earnings', 'earnings_detail', 'pending_detail', 'profile',
    'security', 'orders', 'order_detail', 'applyKoc', 'apply',
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
          onLoginSuccess={(role) => { 
            setUserRole(role); 
            handleNavigate(role === 'koc' ? 'home' : 'shop'); 
          }} 
          onRegisterSuccess={() => { 
            setUserRole('shopper'); 
            handleNavigate('profile'); 
          }} 
          onSkipToShop={() => { 
            setUserRole('guest'); 
            handleNavigate('shop'); 
          }} 
        />
      )}

      {view === 'shop' && <ShopPage key={shopKey} onNavigate={handleNavigate} userRole={userRole} onAddToCart={() => setCartCount(c => c + 1)} />}
      
      {/* 🌟 修改：傳遞 favorites 與 onToggleFavorite 給 ProductDetailPage */}
      {view === 'product_detail' && (
        <ProductDetailPage 
          onBack={() => handleNavigate('shop')} 
          onGoCart={() => handleNavigate('cart')} 
          onBuyNow={() => handleNavigate('checkout')} 
          onNavigate={handleNavigate} 
          userRole={userRole} 
          onAddToCart={() => setCartCount(c => c + 1)}
          favorites={favorites} 
          onToggleFavorite={handleToggleFavorite}
        />
      )}
      
      {view === 'cart' && <CartPage onContinueShopping={() => handleNavigate('shop')} onCheckout={() => handleNavigate('checkout')} />}
      {view === 'checkout' && <CheckoutPage onPaid={() => handleNavigate('orders')} />}

      {shellViews.includes(view) && (
        <div className="flex p-8 max-w-7xl mx-auto">
          <Sidebar userRole={userRole} currentView={getSidebarActiveView()} onNavigate={handleNavigate} />
          <main className="flex-1 ml-12">
            {view === 'home' && <HomePage onNavigate={handleNavigate} />}
            {view === 'apply' && <ApplyPage />} 
            
            {view === 'analysis' && <AnalysisPage onBack={() => handleNavigate('home')} onViewData={(product) => handleNavigate('sales_data', product)} />}
            {view === 'sales_data' && <SalesDataPage product={selectedProduct} onBack={() => handleNavigate('analysis')} />}
            
            {view === 'task_detail' && <TaskDetailPage task={selectedTask} onBack={() => handleNavigate('home')} />}
            
            {view === 'profile' && <ProfilePage isKOC={userRole === 'koc'} />}
            
            {view === 'security' && <SecurityPage onLogout={() => { setUserRole('guest'); setCartCount(0); setView('shop'); }} />}
            {view === 'orders' && <OrdersPage onTrackOrder={() => handleNavigate('order_detail')} onOpenOrderDetail={() => handleNavigate('order_detail')} />}
            {view === 'order_detail' && <OrderDetailPage onBack={() => handleNavigate('orders')} />}
            {view === 'earnings' && <EarningsPage onDetail={() => handleNavigate('earnings_detail')} onTrack={() => handleNavigate('pending_detail')} />}
            {view === 'earnings_detail' && <EarningsDetailPage onBack={() => handleNavigate('earnings')} />}
            {view === 'pending_detail' && <PendingEarningsPage onBack={() => handleNavigate('earnings')} />}
            
            {/* 🌟 新增：渲染 FavoritesPage */}
            {view === 'favorites' && (
              <FavoritesPage 
                favorites={favorites}
                onRemoveFavorite={handleRemoveFavorite}
                onAddToCart={() => setCartCount(c => c + 1)}
                onNavigate={handleNavigate}
              />
            )}

            {view === 'applyKoc' && (
              <ApplyKOCPage 
                onSubmit={() => { 
                  setTimeout(() => { 
                    setUserRole('koc'); 
                    handleNavigate('home'); 
                  }, 1500); 
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