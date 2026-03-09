import React, { useState } from 'react';

import Header from './koc/Header';
import HomePage from './koc/HomePage';
import AnalysisPage from './koc/AnalysisPage';
import TaskDetailPage from './koc/TaskDetailPage';
import EarningsPage from './koc/EarningsPage';
import EarningsDetailPage from './koc/EarningsDetailPage';
import PendingEarningsPage from './koc/PendingEarningsPage';

import ReviewPage from './shopping/Pages/ReviewPage';
import WelcomePage from './shopping/Pages/WelcomePage';
import ShopPage from './shopping/Pages/ShopPage';
import CartPage from './shopping/Pages/CartPage';
import CheckoutPage from './shopping/Pages/CheckoutPage';
import OrdersPage from './shopping/Pages/OrdersPage';
import OrderDetailPage from './shopping/Pages/OrderDetailPage';
import ProductDetailPage from './shopping/Pages/ProductDetailPage';
import ApplyKOCPage from './shopping/Pages/ApplyKOCPage';
import PointsPage from './shopping/Pages/PointsPage';

import LoginPage from './authentication/Pages/LoginPage';
import RegisterPage from './authentication/Pages/RegisterPage';
import ProfilePage from './authentication/Pages/ProfilePage';
import SecurityPage from './authentication/Pages/SecurityPage';

import { User, Lock, Ticket, Coins, FileText, Briefcase, TrendingUp } from 'lucide-react';

function Sidebar({ currentView, onNavigate }) {
  const menuItems = [
    { icon: <User size={18} />, label: '個人資訊', view: 'profile' },
    { icon: <Lock size={18} />, label: '登入與安全', view: 'security' },
    { icon: <Ticket size={18} />, label: '優惠卷', view: 'coupons' },
    { icon: <Coins size={18} />, label: '我的點數', view: 'points' },
    { icon: <FileText size={18} />, label: '我的訂單', view: 'orders' },
    { icon: <Briefcase size={18} />, label: '我的任務', view: 'home' },
    { icon: <TrendingUp size={18} />, label: '我的收益', view: 'earnings' },
  ];

  return (
    <aside className="w-64 bg-white rounded-3xl shadow-lg p-6 h-fit shrink-0">
      <nav className="space-y-4">
        {menuItems.map((item, index) => (
          <div
            key={index}
            onClick={() => onNavigate(item.view)}
            className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${
              currentView === item.view
                ? 'text-black font-bold bg-gray-50'
                : 'text-gray-400 hover:text-black'
            }`}
          >
            {item.icon}
            <span className="text-sm">{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default function App() {
  const [view, setView] = useState('welcome');

  const shellViews = [
    'home',
    'earnings',
    'earnings_detail',
    'pending_detail',
    'profile',
    'security',
    'coupons',
    'points',
    'orders',
    'order_detail',
  ];

  const showHeader = !['welcome', 'login', 'register'].includes(view);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      {showHeader && <Header />}

      {view === 'welcome' && (
        <WelcomePage
          onSelectSeller={() => setView('home')}
          onSelectKoc={() => setView('shop')}
        />
      )}

      {view === 'login' && (
        <LoginPage
          onLoginSuccess={() => setView('home')}
          onGoRegister={() => setView('register')}
        />
      )}

      {view === 'register' && (
        <RegisterPage
          onGoLogin={() => setView('login')}
          onRegisterSuccess={() => setView('home')}
        />
      )}

      {view === 'shop' && (
        <ShopPage
          onNavigate={setView}
        />
      )}

      {view === 'product_detail' && (
        <ProductDetailPage />
      )}

      {view === 'cart' && (
        <CartPage
          onContinueShopping={() => setView('shop')}
          onCheckout={() => setView('checkout')}
        />
      )}

      {view === 'checkout' && (
        <CheckoutPage
          onPaid={() => setView('orders')}
        />
      )}

      {view === 'review' && <ReviewPage onBack={() => setView('home')} />}
      {view === 'analysis' && <AnalysisPage onBack={() => setView('home')} />}
      {view === 'task_detail' && <TaskDetailPage onBack={() => setView('home')} />}

      {shellViews.includes(view) && (
        <div className="flex p-8 max-w-7xl mx-auto">
          <Sidebar
            currentView={['earnings_detail', 'pending_detail', 'order_detail'].includes(view)
              ? view === 'order_detail'
                ? 'orders'
                : 'earnings'
              : view}
            onNavigate={setView}
          />

          <main className="flex-1 ml-12">
            {view === 'home' && <HomePage onNavigate={setView} />}
            {view === 'profile' && <ProfilePage />}
            {view === 'security' && <SecurityPage />}

            {view === 'points' && (
              <PointsPage
                points={30}
                expiringPoints={5}
                onRedeemDetail={() => setView('redeem')}
              />
            )}

            {view === 'orders' && (
              <OrdersPage
                onTrackOrder={() => setView('order_detail')}
                onOpenOrderDetail={() => setView('order_detail')}
              />
            )}

            {view === 'order_detail' && (
              <OrderDetailPage onBack={() => setView('orders')} />
            )}

            {view === 'earnings' && (
              <EarningsPage
                onDetail={() => setView('earnings_detail')}
                onTrack={() => setView('pending_detail')}
              />
            )}

            {view === 'earnings_detail' && (
              <EarningsDetailPage onBack={() => setView('earnings')} />
            )}

            {view === 'pending_detail' && (
              <PendingEarningsPage onBack={() => setView('earnings')} />
            )}

            {view === 'coupons' && (
              <div className="p-6 text-slate-500">Coupons page（待補）</div>
            )}
          </main>
        </div>
      )}

      {view === 'applyKoc' && (
        <ApplyKOCPage
          onSubmit={() => {
            setView('profile');
          }}
        />
      )}
    </div>
  );
}