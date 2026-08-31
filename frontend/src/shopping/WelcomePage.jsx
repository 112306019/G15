import React from 'react';
import { Store, Sparkles, ArrowRight, Compass } from 'lucide-react';
import LogoIcon from '../assets/logo.jpg';
// 🌟 引入 ShareBuy 文字圖片
import LogoText from '../assets/ShareBuy.png';

export default function WelcomePage({ onSelectSeller, onSelectKoc, onSkipToShop }) {
  return (
    <div className="flex min-h-screen font-sans animate-in fade-in duration-700">
      
      {/* =========================================
          品牌形象區 (版面縮小至 1/3)
      ========================================== */}
      <div className="hidden md:flex md:w-1/3 bg-[#1A1A18] relative overflow-hidden flex-col justify-between p-8 lg:p-12">
        
        {/* 背景氛圍光暈 */}
        <div className="absolute top-[-10%] left-[-10%] w-[25rem] h-[25rem] bg-[#C8522A] rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[25rem] h-[25rem] bg-[#B89B6A] rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>

        <div className="relative z-10 flex items-center gap-3">
          <img 
            src={LogoIcon} 
            alt="ShareBuy Logo" 
            className="w-8 h-8 rounded-full object-cover shadow-[0_0_15px_rgba(200,82,42,0.5)]" 
          />
          {/* 🌟 1. 電腦版 (深色背景)：加大為 h-7、translate-y-1 往下移，加上增加對比與些微白光陰影讓其更跳脫 */}
          <img 
            src={LogoText} 
            alt="ShareBuy Text" 
            className="h-7 w-auto object-contain translate-y-1 contrast-125 brightness-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]" 
          />
          <span className="bg-white/10 backdrop-blur-md text-[#F5F0E8] border border-white/20 text-[9px] px-2 py-0.5 rounded-full tracking-widest font-bold mt-1">
            SOCIAL COMMERCE
          </span>
        </div>

        <div className="relative z-10 my-auto">
          {/* 標題因應版面變窄，微調為 4xl/5xl */}
          <h2 className="text-4xl lg:text-5xl font-serif text-[#F5F0E8] leading-[1.15] mb-6">
            Discover. <br/>
            Share. <br/>
            <span className="text-[#C8522A] italic">Earn.</span>
          </h2>
          <p className="text-[#8C8880] text-base leading-relaxed font-medium">
            無論您是尋求曝光的品牌商家、具備影響力的 KOC，還是熱愛探索好物的消費者，ShareBuy 都能為您創造全新價值。
          </p>
        </div>

        <div className="relative z-10 flex items-start gap-3 text-[#8C8880] text-xs font-bold border-t border-white/10 pt-6">
          <Compass size={16} className="text-[#B89B6A] shrink-0 mt-0.5"/>
          <span>Empowering brands, creators, and shoppers to thrive together.</span>
        </div>
      </div>

      {/* =========================================
          🟢 右側：身份選擇區 (版面擴大至 2/3)
      ========================================== */}
      <div className="w-full md:w-2/3 bg-[#F5F0E8] flex items-center justify-center p-8 sm:p-12 lg:p-20 relative">
        
        {/* 手機版小 Logo */}
        <div className="absolute top-8 left-8 flex md:hidden items-center gap-3">
          <img 
            src={LogoIcon} 
            alt="ShareBuy Logo" 
            className="w-8 h-8 rounded-full object-cover shadow-sm" 
          />
          {/* 🌟 2. 手機版 (淺色背景)：同樣加大 h-7、translate-y-1 往下移，並加深對比度 */}
          <img 
            src={LogoText} 
            alt="ShareBuy Text" 
            className="h-7 w-auto object-contain translate-y-1 mix-blend-multiply contrast-125" 
          />
        </div>

        {/* 稍微加寬 max-w-lg (從 448px 加寬到 512px)，讓兩張卡片更大氣 */}
        <div className="w-full max-w-lg">
          {/* 標題區 */}
          <div className="mb-10 text-center sm:text-left">
            <h2 className="text-3xl lg:text-4xl font-serif font-black text-[#1A1A18] mb-3">選擇您的身份</h2>
            <p className="text-[#8C8880] font-bold text-sm tracking-wide">加入平台生態圈，解鎖完整功能</p>
          </div>

          {/* 核心註冊區：並排大型卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6 mb-12">
            
            {/* 廠商大卡片 */}
            <button 
              onClick={onSelectSeller}
              className="group relative flex flex-col items-center justify-center rounded-3xl border border-[#E2DDD4] bg-white p-8 lg:p-10 text-center shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#C8522A] hover:shadow-[0_16px_40px_rgba(200,82,42,0.12)] focus:outline-none"
            >
              <div className="mb-5 flex h-16 w-16 lg:h-20 lg:w-20 items-center justify-center rounded-full bg-[#F5F0E8] text-[#1A1A18] transition-colors duration-300 group-hover:bg-[#1A1A18] group-hover:text-[#F5F0E8] group-hover:scale-110">
                <Store size={32} />
              </div>
              <h3 className="font-serif text-xl lg:text-2xl font-bold tracking-wide text-[#1A1A18]">我是廠商</h3>
              <p className="mt-2 text-xs lg:text-sm font-bold text-[#8C8880] leading-relaxed transition-colors group-hover:text-[#C8522A]">
                發布任務<br/>管理商品與金流
              </p>
            </button>

            {/* KOC 大卡片 */}
            <button 
              onClick={onSelectKoc}
              className="group relative flex flex-col items-center justify-center rounded-3xl border border-[#E2DDD4] bg-white p-8 lg:p-10 text-center shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#C8522A] hover:shadow-[0_16px_40px_rgba(200,82,42,0.12)] focus:outline-none"
            >
              <div className="mb-5 flex h-16 w-16 lg:h-20 lg:w-20 items-center justify-center rounded-full bg-[#F5F0E8] text-[#1A1A18] transition-colors duration-300 group-hover:bg-[#1A1A18] group-hover:text-[#F5F0E8] group-hover:scale-110">
                <Sparkles size={32} />
              </div>
              <h3 className="font-serif text-xl lg:text-2xl font-bold tracking-wide text-[#1A1A18]">我是 KOC</h3>
              <p className="mt-2 text-xs lg:text-sm font-bold text-[#8C8880] leading-relaxed transition-colors group-hover:text-[#C8522A]">
                接案推廣<br/>賺取專屬收益
              </p>
            </button>
            
          </div>

          {/* 視覺分隔線 */}
          <div className="flex items-center gap-4 w-2/3 mx-auto mb-8 opacity-60">
            <div className="h-px flex-1 bg-[#E2DDD4]"></div>
          </div>

          {/* 一般消費者區 */}
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-[#8C8880] mb-3">
              沒有要發案或接案？
            </span>
            <button 
              onClick={onSkipToShop}
              className="group flex items-center gap-2 text-sm font-bold text-[#1A1A18] transition-all hover:text-[#C8522A] focus:outline-none"
            >
              <span className="underline decoration-[#E2DDD4] underline-offset-4 group-hover:decoration-[#C8522A]">
                以一般消費者身份逛逛商城
              </span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}