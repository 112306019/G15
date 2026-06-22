import React from 'react';

// 🟢 替換為與 ShopPage 一致的精緻線條版 Icon
function ImageIcon({ className = "w-10 h-10" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export default function WelcomePage({ onSelectSeller, onSelectKoc, onSkipToShop }) {
  return (
    // 🟢 背景改為與 ShopPage 相同的溫暖大地色 #F5F0E8
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F0E8] p-6 font-sans text-[#1A1A18] duration-500 animate-in fade-in">
      
      {/* =========================================
          頂部：歡迎標題
      ========================================== */}
      <div className="mb-14 text-center">
        <h1 className="relative inline-block font-serif text-3xl tracking-widest text-[#1A1A18] md:text-4xl">
          選擇您的身份
          <span className="absolute left-1/2 top-full mt-3 h-0.5 w-12 -translate-x-1/2 rounded bg-[#C8522A]" />
        </h1>
      </div>

      {/* =========================================
          上半部：兩大身份選擇卡片
      ========================================== */}
      <div className="mb-16 flex w-full max-w-4xl flex-col items-center justify-center gap-8 md:flex-row md:gap-16">
        
        {/* 🟢 左側：廠商登入註冊 */}
        <button 
          onClick={onSelectSeller}
          className="group flex h-[340px] w-full max-w-[320px] flex-col items-center justify-center rounded-3xl border border-[#E2DDD4] bg-[#FDFAF6] transition-all hover:-translate-y-2 hover:border-[#E8C4B4] hover:shadow-[0_16px_40px_rgba(26,26,24,0.06)]"
        >
          {/* 圖片佔位區塊 (加入 Hover 反轉色效果) */}
          <div className="mb-8 grid h-24 w-24 place-items-center rounded-full bg-[#F5F0E8] text-[#B89B6A] transition-transform duration-300 group-hover:scale-110 group-hover:bg-[#1A1A18] group-hover:text-[#F5F0E8]">
            <ImageIcon />
          </div>
          <h2 className="font-serif text-2xl tracking-widest text-[#1A1A18]">我是廠商</h2>
          <p className="mt-3 text-sm text-[#8C8880] transition-colors group-hover:text-[#C8522A]">發布任務、管理商品與金流</p>
        </button>

        {/* 中間分隔線 (改為淺淺的框線色) */}
        <div className="hidden h-64 w-px bg-[#E2DDD4] md:block"></div>

        {/* 🟢 右側：KOC登入註冊 */}
        <button 
          onClick={onSelectKoc}
          className="group flex h-[340px] w-full max-w-[320px] flex-col items-center justify-center rounded-3xl border border-[#E2DDD4] bg-[#FDFAF6] transition-all hover:-translate-y-2 hover:border-[#E8C4B4] hover:shadow-[0_16px_40px_rgba(26,26,24,0.06)]"
        >
          {/* 圖片佔位區塊 (加入 Hover 反轉色效果) */}
          <div className="mb-8 grid h-24 w-24 place-items-center rounded-full bg-[#F5F0E8] text-[#B89B6A] transition-transform duration-300 group-hover:scale-110 group-hover:bg-[#1A1A18] group-hover:text-[#F5F0E8]">
            <ImageIcon />
          </div>
          <h2 className="font-serif text-2xl tracking-widest text-[#1A1A18]">我是 KOC</h2>
          <p className="mt-3 text-sm text-[#8C8880] transition-colors group-hover:text-[#C8522A]">接案推廣、賺取專屬收益</p>
        </button>

      </div>

      {/* =========================================
          下半部：直接進入購物按鈕
      ========================================== */}
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <span className="text-sm font-bold text-[#8C8880]">只是一般消費者？</span>
        <button 
          onClick={onSkipToShop}
          className="w-full rounded-full bg-[#1A1A18] py-4 text-base tracking-[0.05em] text-[#F5F0E8] shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#C8522A] active:translate-y-0"
        >
          直接進入購物
        </button>
      </div>
      
    </div>
  );
}