import React from "react";
import { Sparkles, Zap, Wallet, Users, ArrowRight, CheckCircle2, ChevronLeft } from "lucide-react";

import LogoIcon from '../assets/logo.jpg';
import LogoText from '../assets/ShareBuy.png';

function StepCard({ number, title, desc }) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-[#E2DDD4]/60 bg-white p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(26,26,24,0.06)] hover:border-[#E2DDD4]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F0E8] font-serif text-lg font-bold text-[#1A1A18] shadow-sm">
        {number}
      </div>
      <h3 className="text-lg font-bold text-[#1A1A18]">{title}</h3>
      <p className="text-sm leading-relaxed text-[#8C8880]">{desc}</p>
    </div>
  );
}

function BenefitCard({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm border border-[#E2DDD4]/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(200,82,42,0.08)] hover:border-[#FDF0ED]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FDF0ED] text-[#C8522A]">
        <Icon size={26} strokeWidth={2.5} />
      </div>
      <h3 className="text-lg font-bold text-[#1A1A18]">{title}</h3>
      <p className="text-sm leading-relaxed text-[#8C8880]">{desc}</p>
    </div>
  );
}

function FaqItem({ q, a }) {
  return (
    <div className="group border-b border-[#E2DDD4] py-6 transition-colors hover:border-[#C8522A]/30">
      <h4 className="mb-2 font-bold text-[#1A1A18] transition-colors group-hover:text-[#C8522A]">{q}</h4>
      <p className="text-sm leading-relaxed text-[#8C8880]">{a}</p>
    </div>
  );
}

export default function KocIntroPage({ onApply, onBack }) {
  return (
    <div className="min-h-screen bg-[#F5F0E8] font-sans text-[#1A1A18]">
      <div className="relative overflow-hidden bg-[#FAF8F5] rounded-b-[3rem] shadow-sm border-b border-[#E2DDD4]/50">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#FDF0ED] opacity-80 blur-[80px]" />
        
        <div className="relative mx-auto max-w-6xl px-6 pt-12 pb-24 md:pb-32">
          
          <button
            onClick={onBack}
            className="mb-12 flex w-max items-center gap-1.5 rounded-full border border-[#E2DDD4] px-5 py-2.5 text-sm font-bold text-[#8C8880] transition-all hover:bg-white hover:text-[#1A1A18]"
          >
            <ChevronLeft size={18} />
            返回商品頁
          </button>

          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-8">
            
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#FDF0ED] px-4 py-2 text-xs font-mono tracking-widest text-[#C8522A]">
                <Sparkles size={14} />
                KOC PARTNER PROGRAM
              </div>

              <h1 className="mb-6 font-serif text-4xl font-bold leading-tight text-[#1A1A18] md:text-5xl lg:text-6xl">
                把你的影響力
                <br />
                變成穩定收入
              </h1>

              <p className="mb-10 text-base leading-relaxed text-[#8C8880]">
                加入 KOC 行銷接案計畫，領取專屬優惠碼，推薦你喜歡的商品給粉絲。每一筆使用你優惠碼的訂單，都會為你帶來豐厚分潤——零成本、零庫存，接案時間完全彈性。
              </p>

              <button
                onClick={onApply}
                className="inline-flex items-center gap-2 rounded-full bg-[#C8522A] px-8 py-4 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-[#B64A25] hover:shadow-[0_8px_20px_rgba(200,82,42,0.3)]"
              >
                立即申請成為 KOC
                <ArrowRight size={16} />
              </button>
            </div>

            {/* 🌟 右欄：放大圖片與文字，拉開間距 */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative flex aspect-square w-full max-w-md flex-col items-center justify-center gap-8 rounded-[3rem] bg-white border border-[#E2DDD4]/60 shadow-[0_20px_60px_rgba(26,26,24,0.04)]">
                <img 
                  src={LogoIcon} 
                  alt="ShareBuy Icon" 
                  className="h-60 w-60 object-cover rounded-[2.5rem] shadow-sm border border-[#E2DDD4]/30" 
                />
                <img 
                  src={LogoText} 
                  alt="ShareBuy Text" 
                  className="h-16 w-auto object-contain mix-blend-multiply opacity-90" 
                />
              </div>
            </div>
            
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <span className="text-xs font-mono tracking-widest text-[#C8522A] font-bold">WHY JOIN US</span>
          <h2 className="mt-4 font-serif text-3xl font-bold text-[#1A1A18] md:text-4xl">為什麼選擇成為 KOC</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <BenefitCard icon={Wallet} title="豐厚分潤" desc="每一筆使用你專屬優惠碼完成的訂單，都能為你帶來對應比例的分潤收益，收益明細即時透明可查。" />
          <BenefitCard icon={Zap} title="零成本零庫存" desc="不需要囤貨、不需要處理物流，你只需要專注在內容創作與推薦，其餘交易流程全由平台負責。" />
          <BenefitCard icon={Users} title="彈性接案" desc="自由選擇你想合作的品牌與活動，接案節奏完全由你掌控，不影響你原本的創作步調。" />
        </div>
      </div>

      <div className="bg-white/60 py-24 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <span className="text-xs font-mono tracking-widest text-[#C8522A] font-bold">HOW IT WORKS</span>
            <h2 className="mt-4 font-serif text-3xl font-bold text-[#1A1A18] md:text-4xl">合作流程很簡單</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <StepCard number="01" title="送出申請" desc="填寫社群帳號資訊，提交 KOC 申請表單。" />
            <StepCard number="02" title="平台審核" desc="平台將人工審核你的社群帳號與資料，通常數個工作天內完成。" />
            <StepCard number="03" title="領取優惠碼" desc="審核通過後，選擇喜歡的品牌活動，領取專屬優惠碼。" />
            <StepCard number="04" title="開始賺分潤" desc="分享優惠碼給粉絲，每筆成交訂單自動累積你的分潤收益。" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-24">
        <div className="mb-12 text-center">
          <span className="text-xs font-mono tracking-widest text-[#C8522A] font-bold">FAQ</span>
          <h2 className="mt-4 font-serif text-3xl font-bold text-[#1A1A18] md:text-4xl">常見問題</h2>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm border border-[#E2DDD4]/60">
          <FaqItem q="申請成為 KOC 需要付費嗎？" a="不需要，申請與使用本平台的 KOC 功能完全免費，你只需要提供真實、公開的社群帳號資訊供審核。" />
          <FaqItem q="審核需要多久時間？" a="平台將由專人審核你提交的社群帳號與資料，一般會在數個工作天內完成，審核結果將透過系統通知你。" />
          <FaqItem q="分潤什麼時候可以領取？" a="每筆使用你優惠碼完成的訂單都會即時累積到你的收益總覽，實際撥款時間依平台結算週期公告為準。" />
          <FaqItem q="我可以同時經營多個品牌的合作嗎？" a="可以，你可以自由瀏覽並申請參與多個品牌發起的活動，接案數量沒有上限，完全由你決定合作步調。" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden flex flex-col items-center gap-6 rounded-[3rem] bg-white border border-[#E2DDD4] px-8 py-20 text-center shadow-sm">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#FDF0ED] opacity-60 blur-[60px]" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-[#F5F0E8] opacity-80 blur-[40px]" />
          
          <CheckCircle2 size={48} className="text-[#C8522A] relative z-10" strokeWidth={2} />
          <h2 className="max-w-md font-serif text-3xl font-bold text-[#1A1A18] md:text-4xl relative z-10 leading-snug">
            準備好開始你的<br />KOC 之旅了嗎？
          </h2>
          <button
            onClick={onApply}
            className="relative z-10 mt-4 inline-flex items-center gap-2 rounded-full bg-[#C8522A] px-10 py-5 text-base font-bold text-white shadow-[0_8px_20px_rgba(200,82,42,0.3)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#B64A25]"
          >
            立即申請成為 KOC
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}