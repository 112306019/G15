import React from 'react';
import { Star, ShoppingCart, User } from 'lucide-react';

export default function Header({ activeTab = '購物頁面', onNavigate }) {
  // 定義 KOC 專屬的四個主要導覽項目 
  const navItems = ['任務管理', '代言申請區', '收益管理', '購物頁面'];

  return (
    <header className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-8">
        {/* LOGO 區塊 */}
        <div className="bg-gray-100 px-6 py-2 rounded-full flex items-center gap-2 cursor-pointer" onClick={() => onNavigate?.('購物頁面')}>
          <Star size={18} className="text-gray-500 fill-gray-500" />
          <span className="font-bold tracking-widest text-gray-700 uppercase">Logo</span>
        </div>
        
        {/* 頁面標題與分隔線 */}
        <div className="h-6 w-[1px] bg-gray-200"></div> 
        
        {/* 動態導覽列區塊 */}
        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => onNavigate?.(item)}
              className={`text-sm transition-colors ${
                activeTab === item 
                  ? 'text-slate-800 font-bold' // 被選中時：深色、粗體
                  : 'text-gray-400 font-medium hover:text-gray-600' // 未選中時：淺色、懸停變色
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>
      
      {/* 右側功能圖示 */}
      <div className="flex items-center gap-6">
        <div 
            className="relative cursor-pointer hover:bg-gray-50 p-2 rounded-full transition-colors"
            onClick={() => onNavigate?.('購物車')} // 預留購物車點擊事件
        >
          <ShoppingCart size={24} className="text-gray-400" />
          <span className="absolute top-0 right-0 bg-black text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border border-white font-bold">2</span>
        </div>
        
        <div 
            className="cursor-pointer hover:bg-gray-50 p-2 rounded-full transition-colors"
            onClick={() => onNavigate?.('個人中心')} // 預留個人中心點擊事件
        >
          <User size={24} className="text-gray-400" />
        </div>
      </div>
    </header>
  );
}