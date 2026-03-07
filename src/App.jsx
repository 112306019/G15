import React, { useState } from 'react';
import Header from './koc/Header';
import HomePage from './koc/HomePage';
import ReviewPage from './shopping/Pages/ReviewPage';
import AnalysisPage from './koc/AnalysisPage';
import TaskDetailPage from './koc/TaskDetailPage';
import EarningsPage from './koc/EarningsPage';
import EarningsDetailPage from './koc/EarningsDetailPage';
import PendingEarningsPage from './koc/PendingEarningsPage';
import WelcomePage from './koc/WelcomePage';
import ShopPage from './koc/ShopPage';
import SecurityPage from './koc/SecurityPage';
import RegisterPage from './koc/RegisterPage';
import ProfilePage from './koc/ProfilePage';
import ProductDetailPage from './koc/ProductDetailPage';
import OrderDetailPage from './shopping/Pages/OrderDetailPage';
import OrdersPage from './shopping/Pages/OrdersPage';
import LoginPage from './authentication/Pages/LoginPage';
import CheckoutPage from "./shop/CheckoutPage";
import CartPage from "./shop/CartPage";
import ApplyKOCPage from "./shop/ApplyKOCPage";
import { User, Lock, Ticket, Coins, FileText, Briefcase, TrendingUp } from 'lucide-react';


function Sidebar({ currentView, onNavigate }) {
  const menuItems = [
    { icon: <User size={18} />, label: "個人資訊", view: 'profile' },
    { icon: <Lock size={18} />, label: "登入與安全", view: 'security' },
    { icon: <Ticket size={18} />, label: "優惠卷", view: 'coupons' },
    { icon: <Coins size={18} />, label: "我的點數", view: 'points' },
    { icon: <FileText size={18} />, label: "我的訂單", view: 'orders' },
    { icon: <Briefcase size={18} />, label: "我的任務", view: 'home' },
    { icon: <TrendingUp size={18} />, label: "我的收益", view: 'earnings' },
  ];

  return (
    <aside className="w-64 bg-white rounded-3xl shadow-lg p-6 h-fit shrink-0">
      <nav className="space-y-4">
        {menuItems.map((item, index) => (
          <div
            key={index}
            onClick={() => onNavigate(item.view)}
            className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${currentView === item.view ? 'text-black font-bold bg-gray-50' : 'text-gray-400 hover:text-black'
              }`}
          >
            {item.icon} <span className="text-sm">{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default function App() {
  const [view, setView] = useState('welcome');

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      {view !== 'welcome' && <Header />}
      {view === 'welcome' && (
        <WelcomePage
          onSelectSeller={() => setView('home')}
          onSelectKoc={() => setView('shop')}
        />
      )}
      {view === 'shop' && <ShopPage />}

      {view === 'register' && (
        <RegisterPage
          onGoLogin={() => setView('welcome')}   // 你之後有 login view 再換
          onRegisterSuccess={() => setView('home')}
        />
      )}

      {view === 'product_detail' && <ProductDetailPage />}

      {view === 'login' && (
        <LoginPage
          onLoginSuccess={() => setView('home')}
          onGoRegister={() => setView('register')}
        />
      )}

      {view === "checkout" && (
        <CheckoutPage
          onPaid={() => setView("orders")} // 或 setView("orderSuccess")
        />
      )}

      {view === "cart" && (
        <CartPage
          onContinueShopping={() => setView("home")}
          onCheckout={() => setView("checkout")}
        />
      )}

      {view === "applyKoc" && (
        <ApplyKOCPage
          onSubmit={(payload) => {
            console.log("KOC 신청 payload:", payload);
            // 你可以在這裡呼叫 API
            // await api.applyKoc(payload)
            // 成功後導回 profile / 顯示審核狀態
            setView("profile");
          }}
        />
      )}

      {[
        'home',
        'earnings',
        'earnings_detail',
        'pending_detail',
        'profile',
        'security',
        'coupons',
        'points',
        'orders',
      ].includes(view) && (
          <div className="flex p-8 max-w-7xl mx-auto">
            <Sidebar
              currentView={['earnings_detail', 'pending_detail'].includes(view) ? 'earnings' : view}
              onNavigate={setView}
            />

            <main className="flex-1 ml-12">
              {view === 'home' && <HomePage onNavigate={setView} />}
              {view === 'profile' && <ProfilePage />}
              {view === 'security' && <SecurityPage />}
              {view === 'order_detail' && <OrderDetailPage onBack={() => setView('orders')} />}
              {view === 'earnings' && (
                <EarningsPage
                  onDetail={() => setView('earnings_detail')}
                  onTrack={() => setView('pending_detail')}
                />
              )}
              {view === 'earnings_detail' && <EarningsDetailPage onBack={() => setView('earnings')} />}
              {view === 'pending_detail' && <PendingEarningsPage onBack={() => setView('earnings')} />}

              {/* 先留空頁也行，避免點了沒反應 */}
              {view === 'coupons' && <div className="p-6 text-slate-500">Coupons page（待補）</div>}
              import PointsPage from './koc/PointsPage';

              // ...
              {view === 'points' && (
                <PointsPage
                  points={30}
                  expiringPoints={5}
                  onRedeemDetail={() => setView('redeem')} // 你要不要做兌換頁都行
                />
              )}
              {view === 'orders' && (
                <OrdersPage
                  onTrackOrder={(orderId) => {
                    // 你想直接跳到訂單細節頁的 view
                    // 也可以把 orderId 存 state（例如 selectedOrderId）
                    setView('order_detail');
                  }}
                  onOpenOrderDetail={(orderId) => {
                    setView('order_detail');
                  }}
                />
              )}
            </main>
          </div>
        )}
    </div>
  );
}


