import React from "react";
import { Sparkles, Zap, Wallet, Users, ArrowRight, CheckCircle2, ChevronLeft } from "lucide-react";

import LogoIcon from '../assets/logo.jpg';
import LogoText from '../assets/ShareBuy.png';

function StepCard({ number, title, desc }) {
  return (
    <div className="flex flex-col gap-3 md:gap-4 rounded-2xl md:rounded-3xl border border-[#E2DDD4]/60 bg-white p-6 md:p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(26,26,24,0.06)] hover:border-[#E2DDD4]">
      <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl md:rounded-2xl bg-[#F5F0E8] font-serif text-base md:text-lg font-bold text-[#1A1A18] shadow-sm">
        {number}
      </div>
      <h3 className="text-base md:text-lg font-bold text-[#1A1A18]">{title}</h3>
      <p className="text-xs md:text-sm leading-relaxed text-[#8C8880]">{desc}</p>
    </div>
  );
}

function BenefitCard({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col gap-3 md:gap-4 rounded-2xl md:rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-[#E2DDD4]/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(200,82,42,0.08)] hover:border-[#FDF0ED]">
      <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl md:rounded-2xl bg-[#FDF0ED] text-[#C8522A]">
        <Icon size={24} className="md:w-[26px] md:h-[26px]" strokeWidth={2.5} />
      </div>
      <h3 className="text-base md:text-lg font-bold text-[#1A1A18]">{title}</h3>
      <p className="text-xs md:text-sm leading-relaxed text-[#8C8880]">{desc}</p>
    </div>
  );
}

function FaqItem({ q, a }) {
  return (
    <div className="group border-b border-[#E2DDD4] py-5 md:py-6 transition-colors hover:border-[#C8522A]/30">
      <h4 className="mb-2 text-sm md:text-base font-bold text-[#1A1A18] transition-colors group-hover:text-[#C8522A]">{q}</h4>
      <p className="text-xs md:text-sm leading-relaxed text-[#8C8880]">{a}</p>
    </div>
  );
}

export default function KocIntroPage({ onApply, onBack }) {
  return (
    <div className="min-h-screen bg-[#F5F0E8] font-sans text-[#1A1A18]">
      <div className="relative overflow-hidden bg-[#FAF8F5] rounded-b-[2rem] md:rounded-b-[3rem] shadow-sm border-b border-[#E2DDD4]/50">
        {/* 背景光暈效果 */}
        <div className="pointer-events-none absolute -right-16 -top-16 md:-right-32 md:-top-32 h-64 w-64 md:h-96 md:w-96 rounded-full bg-[#FDF0ED] opacity-80 blur-[60px] md:blur-[80px]" />
        
        <div className="relative mx-auto max-w-6xl px-4 md:px-6 pt-8 md:pt-12 pb-16 md:pb-32">
          
          <button
            onClick={onBack}
            className="mb-8 md:mb-12 flex w-max items-center gap-1.5 rounded-full border border-[#E2DDD4] bg-white md:bg-transparent px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-bold text-[#8C8880] transition-all hover:bg-white hover:text-[#1A1A18] shadow-sm md:shadow-none"
          >
            <ChevronLeft size={16} className="md:w-[18px] md:h-[18px]" />
            返回商品頁
          </button>

          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-8">
            
            {/* 左欄：文案 */}
            <div className="max-w-xl text-center md:text-left mx-auto md:mx-0">
              <div className="mb-4 md:mb-6 inline-flex items-center gap-1.5 md:gap-2 rounded-full bg-[#FDF0ED] px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-mono tracking-widest text-[#C8522A]">
                <Sparkles size={12} className="md:w-3.5 md:h-3.5" />
                KOC PARTNER PROGRAM
              </div>

              <h1 className="mb-4 md:mb-6 font-serif text-3xl font-bold leading-tight text-[#1A1A18] md:text-5xl lg:text-6xl">
                把你的影響力
                <br />
                變成穩定收入
              </h1>

              <p className="mb-8 md:mb-10 text-sm md:text-base leading-relaxed text-[#8C8880]">
                加入 KOC 行銷接案計畫，領取專屬優惠碼，推薦你喜歡的商品給粉絲。每一筆使用你優惠碼的訂單，都會為你帶來豐厚分潤——零成本、零庫存，接案時間完全彈性。
              </p>

              <button
                onClick={onApply}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl md:rounded-full bg-[#C8522A] px-6 py-3.5 md:px-8 md:py-4 text-xs md:text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-[#B64A25] hover:shadow-[0_8px_20px_rgba(200,82,42,0.3)]"
              >
                立即申請成為 KOC
                <ArrowRight size={16} />
              </button>
            </div>

            {/* 右欄：圖片 */}
            <div className="flex justify-center lg:justify-end mt-4 md:mt-0">
              <div className="relative flex aspect-square w-full max-w-[320px] md:max-w-md flex-col items-center justify-center gap-6 md:gap-8 rounded-[2rem] md:rounded-[3rem] bg-white border border-[#E2DDD4]/60 shadow-[0_20px_60px_rgba(26,26,24,0.04)]">
                <img 
                  src={LogoIcon} 
                  alt="ShareBuy Icon" 
                  className="h-40 w-40 md:h-60 md:w-60 object-cover rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-[#E2DDD4]/30" 
                />
                <img 
                  src={LogoText} 
                  alt="ShareBuy Text" 
                  className="h-10 md:h-16 w-auto object-contain mix-blend-multiply opacity-90" 
                />
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* WHY JOIN US 區塊 */}
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-16 md:py-24">
        <div className="mb-10 md:mb-16 text-center">
          <span className="text-[10px] md:text-xs font-mono tracking-widest text-[#C8522A] font-bold">WHY JOIN US</span>
          <h2 className="mt-2 md:mt-4 font-serif text-2xl font-bold text-[#1A1A18] md:text-4xl">為什麼選擇成為 KOC</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-3">
          <BenefitCard icon={Wallet} title="豐厚分潤" desc="每一筆使用你專屬優惠碼完成的訂單，都能為你帶來對應比例的分潤收益，收益明細即時透明可查。" />
          <BenefitCard icon={Zap} title="零成本零庫存" desc="不需要囤貨、不需要處理物流，你只需要專注在內容創作與推薦，其餘交易流程全由平台負責。" />
          <BenefitCard icon={Users} title="彈性接案" desc="自由選擇你想合作的品牌與活動，接案節奏完全由你掌控，不影響你原本的創作步調。" />
        </div>
      </div>

      {/* HOW IT WORKS 區塊 */}
      <div className="bg-white/60 py-16 md:py-24 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-10 md:mb-16 text-center">
            <span className="text-[10px] md:text-xs font-mono tracking-widest text-[#C8522A] font-bold">HOW IT WORKS</span>
            <h2 className="mt-2 md:mt-4 font-serif text-2xl font-bold text-[#1A1A18] md:text-4xl">合作流程很簡單</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-4">
            <StepCard number="01" title="送出申請" desc="填寫社群帳號資訊，提交 KOC 申請表單。" />
            <StepCard number="02" title="平台審核" desc="平台將人工審核你的社群帳號與資料，通常數個工作天內完成。" />
            <StepCard number="03" title="領取優惠碼" desc="審核通過後，選擇喜歡的品牌活動，領取專屬優惠碼。" />
            <StepCard number="04" title="開始賺分潤" desc="分享優惠碼給粉絲，每筆成交訂單自動累積你的分潤收益。" />
          </div>
        </div>
      </div>

      {/* FAQ 區塊 */}
      <div className="mx-auto max-w-3xl px-4 md:px-6 py-16 md:py-24">
        <div className="mb-10 md:mb-12 text-center">
          <span className="text-[10px] md:text-xs font-mono tracking-widest text-[#C8522A] font-bold">FAQ</span>
          <h2 className="mt-2 md:mt-4 font-serif text-2xl font-bold text-[#1A1A18] md:text-4xl">常見問題</h2>
        </div>

        <div className="rounded-2xl md:rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-[#E2DDD4]/60">
          <FaqItem q="申請成為 KOC 需要付費嗎？" a="不需要，申請與使用本平台的 KOC 功能完全免費，你只需要提供真實、公開的社群帳號資訊供審核。" />
          <FaqItem q="審核需要多久時間？" a="平台將由專人審核你提交的社群帳號與資料，一般會在數個工作天內完成，審核結果將透過系統通知你。" />
          <FaqItem q="分潤什麼時候可以領取？" a="每筆使用你優惠碼完成的訂單都會即時累積到你的收益總覽，實際撥款時間依平台結算週期公告為準。" />
          <FaqItem q="我可以同時經營多個品牌的合作嗎？" a="可以，你可以自由瀏覽並申請參與多個品牌發起的活動，接案數量沒有上限，完全由你決定合作步調。" />
        </div>
      </div>

      {/* 底部 Call To Action */}
      <div className="mx-auto max-w-6xl px-4 md:px-6 pb-16 md:pb-24">
        <div className="relative overflow-hidden flex flex-col items-center gap-4 md:gap-6 rounded-3xl md:rounded-[3rem] bg-white border border-[#E2DDD4] px-6 py-12 md:px-8 md:py-20 text-center shadow-sm">
          <div className="pointer-events-none absolute -right-10 -top-10 md:-right-20 md:-top-20 h-40 w-40 md:h-64 md:w-64 rounded-full bg-[#FDF0ED] opacity-60 blur-[40px] md:blur-[60px]" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 md:h-48 md:w-48 rounded-full bg-[#F5F0E8] opacity-80 blur-[30px] md:blur-[40px]" />
          
          <CheckCircle2 size={40} className="text-[#C8522A] relative z-10 md:w-12 md:h-12" strokeWidth={2} />
          <h2 className="max-w-md font-serif text-2xl font-bold text-[#1A1A18] md:text-4xl relative z-10 leading-snug md:leading-snug">
            準備好開始你的<br />KOC 之旅了嗎？
          </h2>
          <button
            onClick={onApply}
            className="w-full sm:w-auto relative z-10 mt-2 md:mt-4 inline-flex items-center justify-center gap-2 rounded-xl md:rounded-full bg-[#C8522A] px-8 py-4 md:px-10 md:py-5 text-sm md:text-base font-bold text-white shadow-[0_8px_20px_rgba(200,82,42,0.3)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#B64A25]"
          >
            立即申請成為 KOC
            <ArrowRight size={18} className="md:w-[18px] md:h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}