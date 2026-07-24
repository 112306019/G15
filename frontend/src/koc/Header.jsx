import React from 'react';
import { Star, ShoppingCart, User } from 'lucide-react';

// 🟢 接收 cartCount
export default function Header({ activeTab, onNavigate, userRole, cartCount = 0 }) {
  
  const allNavItems = [
    { label: '購物頁面', key: 'shop', isKocOnly: false },
    { label: '任務中心', key: 'home', isKocOnly: true },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.isKocOnly && userRole !== 'koc') return false;
    return true;
  });

  const getActiveKey = (tab) => {
    if (['home', 'task_detail', 'review', 'analysis', 'sales_data'].includes(tab)) return 'home';
    if (['earnings', 'earnings_detail', 'pending_detail'].includes(tab)) return 'earnings';
    if (['shop', 'product_detail', 'cart', 'checkout'].includes(tab)) return 'shop';
    if (tab === 'apply') return 'apply';
    return '';
  };

  const currentActiveKey = getActiveKey(activeTab);

  return (
    <header className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-8">
        
        <div 
          className="bg-gray-100 px-6 py-2 rounded-full flex items-center gap-2 cursor-pointer hover:bg-gray-200 transition-colors" 
          onClick={() => onNavigate?.('shop')}
        >
          <Star size={18} className="text-gray-500 fill-gray-500" />
          <span className="font-bold tracking-widest text-gray-700 uppercase">Logo</span>
        </div>
        
        <div className="h-6 w-[1px] bg-gray-200"></div> 
        
        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate?.(item.key)}
              className={`text-sm transition-colors ${
                currentActiveKey === item.key 
                  ? 'text-slate-800 font-bold' 
                  : 'text-gray-400 font-medium hover:text-gray-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="flex items-center gap-6">
        <div 
            className="relative cursor-pointer hover:bg-gray-50 p-2 rounded-full transition-colors"
            onClick={() => onNavigate?.('cart')}
        >
          <ShoppingCart size={24} className={activeTab === 'cart' ? 'text-black' : 'text-gray-400'} />
          
          {/* 🟢 只有當 cartCount 大於 0 時，才顯示紅底白字的小圓點 */}
          {cartCount > 0 && (
            <span className="absolute top-0 right-0 bg-[#C8522A] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border border-white font-bold">
              {cartCount}
            </span>
          )}
        </div>
        
        <div 
            className="cursor-pointer hover:bg-gray-50 p-2 rounded-full transition-colors"
            onClick={() => onNavigate?.('profile')}
        >
          <User size={24} className={['profile', 'security', 'points', 'orders', 'applyKoc'].includes(activeTab) ? 'text-black' : 'text-gray-400'} />
        </div>
      </div>
    </header>
  );
}