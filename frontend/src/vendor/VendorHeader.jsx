import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Star, User, MessageCircle } from 'lucide-react';

export default function VendorHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  // 對應 PDF 的功能選單
  const navItems = [
    { label: '主頁', path: '/vendor' },
    { label: '活動管理', path: '/vendor/campaigns' },
    { label: '商品管理', path: '/vendor/products' },
    { label: '訂單管理', path: '/vendor/orders' },
    { label: '金流管理', path: '/vendor/finance' },
    { label: 'KOC管理', path: '/vendor/koc' },
    { label: '審核管理', path: '/vendor/review' },
    { label: '成效分析', path: '/vendor/analytics' }
  ];

  return (
    <header className="bg-white border-b border-[#E2DDD4] px-12 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-12">
        
        {/* LOGO (加入 Hover 動效) */}
        <div 
          className="flex items-center gap-2 cursor-pointer transition-colors group" 
          onClick={() => navigate('/vendor')}
        >
          <Star size={20} className="text-[#1A1A18] fill-[#1A1A18] group-hover:text-[#C8522A] group-hover:fill-[#C8522A] transition-colors" />
          <span className="font-black tracking-widest text-[#1A1A18] uppercase text-lg group-hover:text-[#C8522A] transition-colors">
            LOGO
          </span>
        </div>
        
        {/* 上方選單 (套用焦糖橘與拿鐵色系) */}
        <nav className="flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                             (item.path !== '/vendor' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`text-sm transition-all pb-1 -mb-[5px] ${
                  isActive 
                    ? 'text-[#C8522A] font-bold border-b-2 border-[#C8522A]' 
                    : 'text-[#8C8880] font-bold hover:text-[#1A1A18]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* 右側功能區 (聊天室、個人資料) */}
      <div className="flex items-center gap-4">
        
        {/* 聊天室按鈕 */}
        <button 
          onClick={() => navigate('/vendor/chat')}
          className="relative p-2.5 rounded-full text-[#8C8880] hover:text-[#C8522A] hover:bg-[#FDF0ED] transition-colors"
          title="聊天室"
        >
          <MessageCircle size={20} />
          {/* 小紅點提示 (套用焦糖橘色) */}
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#C8522A] rounded-full border border-white shadow-sm" />
        </button>

        {/* 頭像按鈕 (點擊前往設定/廠商資訊) */}
        <button 
          onClick={() => navigate('/vendor/settings')}
          className="cursor-pointer bg-[#F5F0E8] hover:bg-[#E2DDD4] p-2.5 rounded-full transition-colors text-[#1A1A18]"
          title="廠商資訊"
        >
          <User size={20} />
        </button>

      </div>
    </header>
  );
}