import React from 'react';
import { Star, ShoppingCart, User } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
      <div className="flex items-center gap-8">
        {/* LOGO 區塊 */}
        <div className="bg-gray-100 px-6 py-2 rounded-full flex items-center gap-2">
          <Star size={18} className="text-gray-500 fill-gray-500" />
          <span className="font-bold tracking-widest text-gray-700 uppercase">Logo</span>
        </div>
        {/* 頁面標題與分隔線 */}
        <div className="h-6 w-[1px] bg-gray-200"></div> 
        <span className="text-gray-500 font-medium">購物頁面</span>
      </div>
      
      {/* 右側功能圖示 */}
      <div className="flex items-center gap-6">
        <div className="relative cursor-pointer">
          <ShoppingCart size={24} className="text-gray-400" />
          <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white font-bold">2</span>
        </div>
        <div className="cursor-pointer"><User size={24} className="text-gray-400" /></div>
      </div>
    </header>
  );
}