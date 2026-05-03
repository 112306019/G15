import React, { useState } from 'react';

// === KOC 相關 ===
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
import ApplyKOCPage from './koc/ApplyKOCPage'; // 🟢 申請表單頁面

// === Shopping 相關 ===
import ReviewPage from './shopping/ReviewPage'; 
import WelcomePage from './shopping/WelcomePage';
import ShopPage from './shopping/ShopPage';
import CartPage from './shopping/CartPage';
import CheckoutPage from './shopping/CheckoutPage';
import OrdersPage from './shopping/OrdersPage';
import OrderDetailPage from './shopping/OrderDetailPage';

// === Authentication 相關 ===
import LoginPage from './authentication/LoginPage'; // 🟢 雙拼認證頁面
import ProfilePage from './authentication/ProfilePage';
import SecurityPage from './authentication/SecurityPage';
import PointsPage from './authentication/PointsPage'; 

import { User, Lock, Ticket, Coins, FileText, Briefcase, TrendingUp, Sparkles } from 'lucide-react';

function Sidebar({ currentView, onNavigate, userRole }) {
  const allMenuItems = [
    { icon: <User size={18} />, label: '個人資訊', view: 'profile' },
    { icon: <Lock size={18} />, label: '登入與安全', view: 'security' },
    { icon: <Ticket size={18} />, label: '優惠卷', view: 'coupons' },
    { icon: <Coins size={18} />, label: '我的點數', view: 'points' },
    { icon: <FileText size={18} />, label: '我的訂單', view: 'orders' },
    { icon: <Briefcase size={18} />, label: '我的任務', view: 'home', role: 'koc' },
    { icon: <TrendingUp size={18} />, label: '我的收益', view: 'earnings', role: 'koc' },
    { icon: <Sparkles size={18} />, label: '申請成為KOC', view: 'applyKoc', role: 'shopper' },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.role === 'koc' && userRole !== 'koc') return false;
    if (item.role === 'shopper' && userRole !== 'shopper') return false;
    return true; 
  });

  return (
    <aside className="w-64 bg-white rounded-3xl shadow-lg p-6 h-fit shrink-0">
      <nav className="space-y-2">
        {menuItems.map((item, index) => (
          <div
            key={index}
            onClick={() => onNavigate(item.view)}
            className={`flex items-center gap-4 p-3.5 rounded-2xl cursor-pointer transition-all font-bold ${
              currentView === item.view
                ? 'text-slate-800 bg-gray-50 shadow-sm'
                : 'text-gray-400 hover:text-slate-800 hover:bg-gray-50/50'
              }`}
          >
            <div className={currentView === item.view ? 'text-black' : 'text-gray-400'}>
              {item.icon}
            </div>
            <span className="text-sm tracking-wide">{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default function App() {
  const [view, setView] = useState('welcome');
  const [selectedProduct, setSelectedProduct] = useState(null); 
  const [userRole, setUserRole] = useState('guest'); // 'guest' | 'shopper' | 'koc' | 'seller'

  const handleNavigate = (targetView) => {
    const protectedViews = [
      'profile', 'security', 'coupons', 'points', 'orders', 'order_detail', 
      'home', 'earnings', 'earnings_detail', 'pending_detail', 'applyKoc', 'checkout', 'apply'
    ];

    if (userRole === 'guest' && protectedViews.includes(targetView)) {
      alert("請先登入或註冊帳號！"); 
      setView('login'); 
    } else {
      setView(targetView); 
    }
  };

  const shellViews = [
    'home', 'earnings', 'earnings_detail', 'pending_detail', 'profile',
    'security', 'coupons', 'points', 'orders', 'order_detail', 'applyKoc'
  ];

  const showHeader = !['welcome', 'login'].includes(view);

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-slate-800">
      
      {showHeader && <Header activeTab={view} onNavigate={handleNavigate} userRole={userRole} />}

      {view === 'welcome' && (
        <WelcomePage
         onSelectSeller={() => { 
           setUserRole('seller'); 
           handleNavigate('vendor_dashboard'); 
         }}
         onSelectKoc={() => { 
           handleNavigate('login'); 
         }}
         onSkipToShop={() => { 
           setUserRole('guest'); 
           handleNavigate('shop'); 
         }}
        />
      )}

      {view === 'login' && (
        <LoginPage
          onLoginSuccess={() => {
            setUserRole('koc'); 
            handleNavigate('home'); 
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

      {view === 'shop' && <ShopPage onNavigate={handleNavigate} />}

      {view === 'product_detail' && (
        <ProductDetailPage
          onBack={() => handleNavigate('shop')}
          onGoCart={() => handleNavigate('cart')}
          onBuyNow={() => handleNavigate('checkout')}
        />
      )}

      {view === 'cart' && (
        <CartPage
          onContinueShopping={() => handleNavigate('shop')}
          onCheckout={() => handleNavigate('checkout')}
        />
      )}

      {view === 'checkout' && <CheckoutPage onPaid={() => handleNavigate('orders')} />}
      {view === 'review' && <ReviewPage onBack={() => handleNavigate('home')} />}
      {view === 'apply' && <ApplyPage />}
      
      {view === 'analysis' && (
        <AnalysisPage 
          onBack={() => handleNavigate('home')} 
          onViewData={(product) => {
            setSelectedProduct(product);
            handleNavigate('sales_data');
          }}
        />
      )}

      {view === 'sales_data' && (
        <SalesDataPage 
          product={selectedProduct} 
          onBack={() => handleNavigate('analysis')} 
        />
      )}

      {view === 'task_detail' && <TaskDetailPage onBack={() => handleNavigate('home')} />}

      {/* 會員中心與側邊欄區塊 */}
      {shellViews.includes(view) && (
        <div className="flex p-8 max-w-7xl mx-auto">
          <Sidebar
            userRole={userRole}
            currentView={['earnings_detail', 'pending_detail', 'order_detail'].includes(view)
              ? view === 'order_detail' ? 'orders' : 'earnings'
              : view}
            onNavigate={handleNavigate}
          />

          <main className="flex-1 ml-12">
            {view === 'home' && <HomePage onNavigate={handleNavigate} />}
            {view === 'profile' && <ProfilePage />}
            {view === 'security' && <SecurityPage />}

            {view === 'points' && (
              <PointsPage
                points={30}
                expiringPoints={5}
                onRedeemDetail={() => console.log('redeem page not ready')}
              />
            )}

            {view === 'orders' && (
              <OrdersPage
                onTrackOrder={() => handleNavigate('order_detail')}
                onOpenOrderDetail={() => handleNavigate('order_detail')}
              />
            )}

            {view === 'order_detail' && <OrderDetailPage onBack={() => handleNavigate('orders')} />}

            {view === 'earnings' && (
              <EarningsPage
                onDetail={() => handleNavigate('earnings_detail')}
                onTrack={() => handleNavigate('pending_detail')}
              />
            )}

            {view === 'earnings_detail' && <EarningsDetailPage onBack={() => handleNavigate('earnings')} />}
            {view === 'pending_detail' && <PendingEarningsPage onBack={() => handleNavigate('earnings')} />}
            {view === 'coupons' && <div className="p-6 text-slate-500">Coupons page（待補）</div>}

            {view === 'applyKoc' && (
              <ApplyKOCPage onSubmit={() => {
                setTimeout(() => {
                  setUserRole('koc');     
                  handleNavigate('home'); 
                }, 1500);
              }} />
            )}
          </main>
        </div>
      )}
    </div>
  );
}