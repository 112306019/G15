import { API_BASE_URL } from './config';
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';

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
import KocIntroPage from './shopping/KocIntroPage';import ChatPage from './koc/ChatPage';

// === Shopping 相關頁面 ===
import ReviewPage from './shopping/ReviewPage';
import WelcomePage from './shopping/WelcomePage';
import ShopPage from './shopping/ShopPage';
import CartPage from './shopping/CartPage';
import CheckoutPage from './shopping/CheckoutPage';
import PaymentResultPage from './shopping/PaymentResultPage';
import ECPayStoreResult from './shopping/ECPayStoreResult';
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

// 路由對應表：view 名稱（沿用給子元件用的字串） <-> 實際網址
const VIEW_TO_PATH = {
  welcome: '/welcome',
  login: '/login',
  shop: '/shop',
  cart: '/cart',
  checkout: '/checkout',
  chat: '/chat',
  home: '/home',
  analysis: '/analysis',
  sales_data: '/analysis/product',
  task_detail: '/task',
  profile: '/profile',
  security: '/security',
  orders: '/orders',
  earnings: '/earnings',
  earnings_detail: '/earnings/detail',
  pending_detail: '/earnings/pending',
  favorites: '/favorites',
  applyKoc: '/apply-koc',
  kocIntro: '/koc-intro',  review: '/review',
};

// 根據目前網址反查對應的 view 名稱，給 Sidebar/Header 判斷 active 狀態用
function getViewKeyFromPath(pathname) {
  if (pathname.startsWith('/product/')) return 'product_detail';
  if (pathname.startsWith('/orders/') && pathname !== '/orders') return 'order_detail';
  for (const [key, path] of Object.entries(VIEW_TO_PATH)) {
    if (pathname === path) return key;
  }
  const trimmed = pathname.replace(/^\//, '');
  return trimmed || 'welcome';
}

function Sidebar({ currentView, onNavigate, userRole }) {
  const [expandedMenu, setExpandedMenu] = useState('home');

  const allMenuItems = [
    { icon: <User size={18} />, label: '個人資訊', view: 'profile' },
    { icon: <Briefcase size={18} />, label: '我的接案', view: 'home', role: 'koc' },
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

// 商品詳細頁：從網址拿 productId，優先用路由 state 帶來的完整商品資料（點擊進入時最快），
// 沒有的話（例如重新整理）就用 id 重新打 API 拿。
function ProductDetailRoute({ userRole, onAddToCart, onBuyNow, favorites, onToggleFavorite }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [product, setProduct] = useState(location.state?.product || null);

  useEffect(() => {
    if (location.state?.product) {
      setProduct(location.state.product);
      return;
    }
    let cancelled = false;
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/consumer/products`);
        const data = await res.json();
        const found = Array.isArray(data) ? data.find(p => String(p.Product_id) === String(id)) : null;
        if (!cancelled) {
          if (found) setProduct(found);
          else navigate('/shop', { replace: true });
        }
      } catch (err) {
        if (!cancelled) navigate('/shop', { replace: true });
      }
    };
    fetchProduct();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <p className="text-[#8C8880]">商品載入中...</p>
      </div>
    );
  }

  return (
    <ProductDetailPage
      onBack={() => navigate('/shop')}
      onGoCart={() => navigate('/cart')}
      onBuyNow={onBuyNow}
      onNavigate={(targetView, data) => {
        // 商品詳細頁裡「您可能也會喜歡」等推薦商品點擊，直接換到另一個商品網址
        if (targetView === 'product_detail' && data) {
          localStorage.setItem('lastProductId', data.Product_id);
          navigate(`/product/${data.Product_id}`, { state: { product: data } });
          return;
        }
        navigate(VIEW_TO_PATH[targetView] || '/shop');
      }}
      userRole={userRole}
      onAddToCart={onAddToCart}
      product={product}
    />
  );
}

// 訂單詳細頁：id 直接來自網址
function OrderDetailRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <OrderDetailPage onBack={() => navigate('/orders')} orderId={id} />;
}

// 需要「整包資料」才能顯示、且沒有簡單 fetch-by-id API 的頁面（任務詳情、業績分析），
// 一律靠路由 state 傳資料；重新整理後資料會遺失，此時導回上一層列表頁（跟原本行為一致）。
function TaskDetailRoute({ onJumpHome }) {
  const location = useLocation();
  const navigate = useNavigate();
  const task = location.state?.task;

  useEffect(() => {
    if (!task) navigate('/home', { replace: true });
  }, [task, navigate]);

  if (!task) return null;

  return (
    <TaskDetailPage
      task={task}
      onBack={(targetStage) => {
        onJumpHome(targetStage);
        navigate('/home');
      }}
    />
  );
}

function SalesDataRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const product = location.state?.product;

  useEffect(() => {
    if (!product) navigate('/analysis', { replace: true });
  }, [product, navigate]);

  if (!product) return null;

  return <SalesDataPage product={product} onBack={() => navigate('/analysis')} />;
}

function MainSystem() {
  const navigate = useNavigate();
  const location = useLocation();

  const [homeJumpStage, setHomeJumpStage] = useState(null);

  const [userRole, setUserRole] = useState(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) return Number(role) === 1 ? 'koc' : 'shopper';
    return 'guest';
  });
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
  const [appToast, setAppToast] = useState("");
  const [shopKey, setShopKey] = useState(0);
  const [roleSyncing, setRoleSyncing] = useState(true);

  // 頁面載入時，重新確認 KOC 審核狀態是否有變化（例如剛被 Admin 核准）
  useEffect(() => {
    const syncUserRole = async () => {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("token");
      if (!userId || !token) {
        setRoleSyncing(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/koc/profile/getProfile?user_id=${userId}`);
        const data = await res.json();
        if (data.success && data.koc_id && data.approval_status === 'approved') {
          if (userRole !== 'koc') {
            localStorage.setItem('role', '1');
            setUserRole('koc');
            // 如果剛好停留在申請頁，導向 KOC 首頁
            if (location.pathname === '/apply-koc') {
              navigate('/home', { replace: true });
            }
          }
        }
      } catch (err) {
        console.error("同步身分失敗", err);
      } finally {
        setRoleSyncing(false);
      }
    };
    syncUserRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 剛進站、還沒有指定路徑時（"/"），依登入狀態導去合理的預設頁
  useEffect(() => {
    if (roleSyncing) return;
    if (location.pathname === '/' || location.pathname === '') {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/welcome', { replace: true });
      } else {
        navigate(userRole === 'koc' ? '/home' : '/shop', { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleSyncing, location.pathname]);

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

    // 商品詳細頁：id 進網址，完整資料順便用路由 state 帶過去（避免多打一次 API）
    if (targetView === 'product_detail' && data) {
      localStorage.setItem('lastProductId', data.Product_id);
      navigate(`/product/${data.Product_id}`, { state: { product: data } });
      return;
    }

    // 訂單詳細頁：id 直接進網址
    if (targetView === 'order_detail') {
      navigate(`/orders/${data}`);
      return;
    }

    // 任務詳情 / 業績分析：資料整包用路由 state 帶過去
    if (targetView === 'task_detail' && data) {
      navigate('/task', { state: { task: data } });
      return;
    }
    if (targetView === 'sales_data' && data) {
      navigate('/analysis/product', { state: { product: data } });
      return;
    }

    navigate(VIEW_TO_PATH[targetView] || '/shop');
  };

  const view = getViewKeyFromPath(location.pathname);

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

  if (roleSyncing) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <p className="text-[#8C8880]">載入中...</p>
      </div>
    );
  }

  const showHeader = !['welcome', 'login'].includes(view);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('lastProductId');
    setUserRole('guest');
    setCartCount(0);
    navigate('/welcome', { replace: true });
  };

  // 閒置 30 分鐘自動登出：只在已登入狀態下才需要偵測，
  // 監聽常見的使用者活動事件，只要有動作就重新計時，
  // 完全沒有活動達到門檻時間才觸發登出。
  useEffect(() => {
    const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 分鐘
    const token = localStorage.getItem('token');
    if (!token) return;

    let idleTimer = null;

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        handleLogout();
        setAppToast("閒置時間過長，已自動登出，請重新登入。");
        setTimeout(() => setAppToast(""), 4000);
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
  }, [userRole]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-slate-800 relative">
      {showHeader && <Header activeTab={view} onNavigate={handleNavigate} userRole={userRole} cartCount={cartCount} onLogout={handleLogout} />}

      <Routes>
        <Route path="/" element={null} />

        <Route path="/welcome" element={
          <WelcomePage
            onSelectSeller={() => navigate('/vendor-login')}
            onSelectKoc={() => handleNavigate('login')}
            onSkipToShop={() => { setUserRole('guest'); handleNavigate('shop'); }}
          />
        } />

        <Route path="/login" element={
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
        } />

        <Route path="/shop" element={
          <ShopPage key={shopKey} onNavigate={handleNavigate} userRole={userRole} onAddToCart={() => syncCartCount()} />
        } />

        <Route path="/product/:id" element={
          <ProductDetailRoute
            userRole={userRole}
            onAddToCart={() => syncCartCount()}
            onBuyNow={(item) => {
              const price = Number(item.price) || 0;
              const qty = Number(item.qty) || 1;
              const subtotal = price * qty;

              const checkoutItem = {
                productId: item.productId,
                name: item.name,
                price,
                qty,
                imageUrl: item.imageUrl || "",
                buyNow: true,
              };

              const summary = {
                subtotal,
                couponDiscount: 0,
                pointsDiscount: 0,
                grandTotal: subtotal,
                items: [checkoutItem],
              };

              setCartItems([checkoutItem]);
              setCheckoutSummary(summary);
              navigate('/checkout');
            }}
          />
        } />

        <Route path="/cart" element={
          <CartPage
            onContinueShopping={() => handleNavigate('shop')}
            onCheckout={(data) => { setCartItems(data?.items || []); setCheckoutSummary(data); handleNavigate('checkout'); }}
          />
        } />

        <Route path="/checkout" element={
          <CheckoutPage
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
          />
        } />

        {/* 綠界付款結果頁：OrderResultURL 由後端驗證完再把瀏覽器導回這裡（帶 order_id），
            這是一個「從外部整頁導回來」的進入點，不透過 handleNavigate，所以沒有登入保護閘門，
            頁面本身只靠 order_id 呼叫後端查真正的付款狀態，不採信網址上其他任何參數 */}
        <Route path="/checkout/result" element={
          <PaymentResultPage onCartCleared={() => syncCartCount()} />
        } />

        <Route
          path="/ecpay-store-result"
          element={<ECPayStoreResult />}
        />

        <Route path="/chat" element={<ChatPage />} />

        {/* 下面這些頁面共用左側 Sidebar 的殼 */}
        <Route path="/home" element={
          <ShellLayout userRole={userRole} activeView={getSidebarActiveView()} onNavigate={handleNavigate}>
            <HomePage
              onNavigate={handleNavigate}
              jumpToStage={homeJumpStage}
              onJumpHandled={() => setHomeJumpStage(null)}
            />
          </ShellLayout>
        } />

        <Route path="/analysis" element={
          <ShellLayout userRole={userRole} activeView={getSidebarActiveView()} onNavigate={handleNavigate}>
            <AnalysisPage onBack={() => handleNavigate('home')} onViewData={(product) => handleNavigate('sales_data', product)} />
          </ShellLayout>
        } />

        <Route path="/analysis/product" element={
          <ShellLayout userRole={userRole} activeView={getSidebarActiveView()} onNavigate={handleNavigate}>
            <SalesDataRoute />
          </ShellLayout>
        } />

        <Route path="/task" element={
          <ShellLayout userRole={userRole} activeView={getSidebarActiveView()} onNavigate={handleNavigate}>
            <TaskDetailRoute onJumpHome={(stage) => { if (stage) setHomeJumpStage(stage); }} />
          </ShellLayout>
        } />

        <Route path="/profile" element={
          <ShellLayout userRole={userRole} activeView={getSidebarActiveView()} onNavigate={handleNavigate}>
            <ProfilePage isKOC={userRole === 'koc'} />
          </ShellLayout>
        } />

        <Route path="/security" element={
          <ShellLayout userRole={userRole} activeView={getSidebarActiveView()} onNavigate={handleNavigate}>
            <SecurityPage onLogout={handleLogout} />
          </ShellLayout>
        } />

        <Route path="/orders" element={
          <ShellLayout userRole={userRole} activeView={getSidebarActiveView()} onNavigate={handleNavigate}>
            <OrdersPage
              onTrackOrder={(id) => handleNavigate('order_detail', id)}
              onOpenOrderDetail={(id) => handleNavigate('order_detail', id)}
            />
          </ShellLayout>
        } />

        <Route path="/orders/:id" element={
          <ShellLayout userRole={userRole} activeView={getSidebarActiveView()} onNavigate={handleNavigate}>
            <OrderDetailRoute />
          </ShellLayout>
        } />

        <Route path="/earnings" element={
          <ShellLayout userRole={userRole} activeView={getSidebarActiveView()} onNavigate={handleNavigate}>
            <EarningsPage onDetail={() => handleNavigate('earnings_detail')} onTrack={() => handleNavigate('pending_detail')} />
          </ShellLayout>
        } />

        <Route path="/earnings/detail" element={
          <ShellLayout userRole={userRole} activeView={getSidebarActiveView()} onNavigate={handleNavigate}>
            <EarningsDetailPage onBack={() => handleNavigate('earnings')} />
          </ShellLayout>
        } />

        <Route path="/earnings/pending" element={
          <ShellLayout userRole={userRole} activeView={getSidebarActiveView()} onNavigate={handleNavigate}>
            <PendingEarningsPage onBack={() => handleNavigate('earnings')} />
          </ShellLayout>
        } />

        <Route path="/favorites" element={
          <ShellLayout userRole={userRole} activeView={getSidebarActiveView()} onNavigate={handleNavigate}>
            <FavoritesPage
              onAddToCart={() => setCartCount(c => c + 1)}
              onNavigate={handleNavigate}
            />
          </ShellLayout>
        } />

        <Route path="/koc-intro" element={
          <KocIntroPage
            onApply={() => handleNavigate('applyKoc')}
            onBack={() => handleNavigate('shop')}
          />
        } />

        <Route path="/apply-koc" element={
          <ShellLayout userRole={userRole} activeView={getSidebarActiveView()} onNavigate={handleNavigate}>
            <ApplyKOCPage
              onSubmit={() => {
                // 申請只是送出審核，還不是 KOC；要等平台審核通過、
                // 重新登入後 user.role 才會變成 koc，這裡先留在消費者身份
                handleNavigate('shop');
              }}
              onViewIntro={() => handleNavigate('kocIntro')}
            />
          </ShellLayout>
        } />

        <Route path="*" element={null} />
      </Routes>

      <div className={`fixed bottom-10 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-4 rounded-full bg-[#1A1A18] pl-6 pr-2 py-2 text-sm font-bold tracking-wide text-white shadow-xl transition-all duration-300 ${appToast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-10 opacity-0"}`}>
        <span>{appToast}</span>
        {appToast && <button onClick={() => { setAppToast(""); navigate('/login'); }} className="rounded-full bg-[#C8522A] px-5 py-2.5 text-xs transition-colors hover:bg-[#A64220]">前往登入</button>}
      </div>
    </div>
  );
}

// 左側 Sidebar + 內容區的共用外殼，取代原本用 shellViews.includes(view) 判斷再包一層的寫法
function ShellLayout({ userRole, activeView, onNavigate, children }) {
  return (
    <div className="flex p-8 max-w-7xl mx-auto">
      <Sidebar userRole={userRole} currentView={activeView} onNavigate={onNavigate} />
      <main className="flex-1 ml-12">
        {children}
      </main>
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