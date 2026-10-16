import React from 'react';
import { Store, Sparkles, ChevronRight, Heart, Ticket, Coins } from 'lucide-react';
import LogoIcon from '../assets/logo.jpg';

// 左側插圖周圍的小標籤
function FeatureTag({ icon: Icon, children, className = '', gold = false }) {
  const tone = gold ? 'bg-gold-soft text-gold-ink' : 'bg-brand text-white';
  return (
    <div className={`absolute flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold shadow-[0_8px_20px_rgba(63,56,112,0.18)] ${tone} ${className}`}>
      <Icon size={16} strokeWidth={2.4} />
      {children}
    </div>
  );
}

function RoleOption({ icon: Icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-4 rounded-[1.4rem] border-2 border-edge bg-white px-5 py-4 text-left transition-[transform,border-color,background-color,box-shadow] duration-[250ms] ease-out hover:-translate-y-1 hover:-rotate-1 hover:border-brand hover:bg-brand-softer hover:shadow-[4px_6px_0_var(--color-brand-pale)] focus:outline-none focus-visible:border-brand motion-reduce:transform-none"
    >
      <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand transition-[transform,background-color,color] duration-[250ms] ease-out group-hover:-rotate-[8deg] group-hover:scale-110 group-hover:bg-brand group-hover:text-white motion-reduce:transform-none">
        <Icon size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-bold text-ink">{title}</span>
        <span className="mt-0.5 block text-[13px] text-muted">{desc}</span>
      </span>
      <ChevronRight size={20} strokeWidth={2.4} className="shrink-0 text-edge transition-[transform,color] duration-[250ms] ease-out group-hover:translate-x-1 group-hover:text-brand" />
    </button>
  );
}

export default function WelcomePage({ onSelectSeller, onSelectKoc, onSkipToShop }) {
  return (
    <div className="min-h-screen bg-cream font-sans flex items-center justify-center p-0 sm:p-6 md:p-10 animate-in fade-in duration-700">
      <div className="w-full max-w-[1100px] min-h-screen sm:min-h-0 bg-white sm:rounded-[2rem] shadow-[0_30px_80px_rgba(80,71,133,0.18)] flex flex-col md:flex-row overflow-hidden">

        {/* 左側：品牌區（淡薰衣草底） */}
        <div className="md:w-[46%] shrink-0 bg-brand-pale text-brand-dark rounded-b-[2.5rem] md:rounded-b-none md:rounded-r-[6rem] px-7 py-8 md:px-12 md:py-11 flex flex-col gap-7">
          <div className="flex items-center gap-3">
            <img src={LogoIcon} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-brand/25" />
            <span className="font-wordmark text-[26px] leading-none">ShareBuy</span>
          </div>

          {/* 插圖：logo + 三個功能標籤（手機版省略） */}
          <div className="relative hidden md:block h-[210px]" aria-hidden="true">
            <div className="absolute left-[70px] top-[10px] h-[190px] w-[190px] rounded-full bg-white flex items-center justify-center">
              <img src={LogoIcon} alt="" className="h-[120px] w-[120px] rounded-full object-cover shadow-[0_12px_30px_rgba(63,56,112,0.2)]" />
            </div>
            <FeatureTag icon={Heart} className="left-0 top-[30px]">分享好物</FeatureTag>
            <FeatureTag icon={Ticket} className="left-[230px] top-0">專屬優惠碼</FeatureTag>
            <FeatureTag icon={Coins} gold className="left-[210px] top-[150px]">分潤回饋</FeatureTag>
          </div>

          <div>
            <h1 className="font-wordmark text-[44px] md:text-[54px] leading-[1.04]">
              Discover. Share.<br />
              <em className="text-gold">Earn.</em>
            </h1>
            <p className="mt-4 max-w-sm text-sm md:text-[15px] leading-relaxed text-brand-dark/80">
              無論您是尋求曝光的品牌商家、具備影響力的 KOC，還是熱愛探索好物的消費者，ShareBuy 都能為您創造全新價值。
            </p>
          </div>

          <p className="hidden md:block mt-auto font-mono text-xs text-brand-dark/60">© {new Date().getFullYear()} ShareBuy</p>
        </div>

        {/* 右側：選擇身份 */}
        <div className="flex-1 min-w-0 px-7 py-10 md:px-16 md:py-14 flex flex-col justify-center">
          <h2 className="font-display text-2xl md:text-[30px] font-bold text-ink">選擇您的身份</h2>
          <p className="mt-2 mb-7 text-sm text-muted">加入平台，解鎖完整功能</p>

          <div className="flex flex-col gap-3.5">
            <RoleOption icon={Store} title="我是廠商" desc="發布任務 / 管理商品金流" onClick={onSelectSeller} />
            <RoleOption icon={Sparkles} title="我是 KOC" desc="接案推廣 / 賺取專屬收益" onClick={onSelectKoc} />
          </div>

          <div className="my-7 flex items-center gap-3.5 text-xs text-muted">
            <span className="h-px flex-1 bg-edge" />或<span className="h-px flex-1 bg-edge" />
          </div>

          <p className="text-center text-sm text-muted">
            沒有要發案或接案？{' '}
            <button onClick={onSkipToShop} className="font-bold text-brand hover:text-brand-dark transition-colors">
              以一般消費者身份逛逛商城 →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
