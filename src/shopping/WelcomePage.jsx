import React from 'react';

// 自訂的山與太陽 Icon (對應截圖中的佔位圖)
function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-20 h-20 text-gray-400">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3 8.5h9V19H5l5.5-7 3.5 4.5z" />
    </svg>
  );
}

export default function WelcomePage({ onSelectSeller, onSelectKoc, onSkipToShop }) {
  return (
    // 🟢 深色背景對應截圖
    <div className="min-h-screen bg-[#323333] flex flex-col items-center justify-center p-6 font-sans animate-in fade-in duration-500">
      
      {/* =========================================
          上半部：兩大身份選擇卡片
      ========================================== */}
      <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16 mb-16">
        
        {/* 左側：廠商登入註冊 */}
        <div 
          onClick={onSelectSeller}
          className="group cursor-pointer flex flex-col items-center justify-center w-72 h-80 md:w-[340px] md:h-[400px] bg-[#6F7070] rounded-3xl hover:bg-[#5C5D5D] transition-all hover:scale-105 shadow-lg"
        >
          {/* 白色圖片佔位區塊 */}
          <div className="bg-white p-6 rounded-2xl mb-10 group-hover:scale-110 transition-transform duration-300">
            <ImageIcon />
          </div>
          <h2 className="text-white text-3xl font-bold tracking-wider">廠商登入註冊</h2>
        </div>

        {/* 中間分隔線 (手機版時隱藏) */}
        <div className="hidden md:block w-px h-80 bg-gray-400 opacity-40"></div>

        {/* 右側：KOC登入註冊 */}
        <div 
          onClick={onSelectKoc}
          className="group cursor-pointer flex flex-col items-center justify-center w-72 h-80 md:w-[340px] md:h-[400px] bg-[#6F7070] rounded-3xl hover:bg-[#5C5D5D] transition-all hover:scale-105 shadow-lg"
        >
          {/* 白色圖片佔位區塊 */}
          <div className="bg-white p-6 rounded-2xl mb-10 group-hover:scale-110 transition-transform duration-300">
            <ImageIcon />
          </div>
          <h2 className="text-white text-3xl font-bold tracking-wider">KOC登入註冊</h2>
        </div>

      </div>

      {/* =========================================
          下半部：直接進入購物按鈕
      ========================================== */}
      <button 
        onClick={onSkipToShop}
        className="bg-white text-black font-black text-lg w-full max-w-xl py-4 rounded-full hover:bg-gray-200 transition-colors shadow-2xl active:scale-95"
      >
        直接進入購物
      </button>
      
    </div>
  );
}