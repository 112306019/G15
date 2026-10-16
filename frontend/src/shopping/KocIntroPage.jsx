import React from "react";
import { Sparkles, Zap, Wallet, Users, ArrowRight, ChevronLeft } from "lucide-react";

import KOCVideo from '../assets/KOC_ad.mp4';
import { SectionDivider } from './SiteFooter';

function SectionHeading({ label, title }) {
  return (
    <div className="mb-8 md:mb-12 text-center">
      <span className="font-mono text-[10px] md:text-xs tracking-[0.25em] text-brand font-medium">{label}</span>
      <h2 className="mt-2 md:mt-3 font-display text-[28px] md:text-[38px] font-bold text-ink">{title}</h2>
    </div>
  );
}

function StepCard({ number, title, desc }) {
  return (
    <div className="flex flex-col gap-3 md:gap-4 rounded-[1.5rem] md:rounded-[1.75rem] bg-white p-6 md:p-7 transition-transform duration-300 hover:-translate-y-1">
      <div className="font-wordmark text-[40px] md:text-[44px] leading-none text-gold-bright">{number}</div>
      <h3 className="text-base md:text-lg font-bold text-ink">{title}</h3>
      <p className="text-xs md:text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  );
}

function BenefitCard({ icon: Icon, title, desc, gold = false }) {
  return (
    <div className="flex flex-col gap-3 md:gap-4 rounded-[1.5rem] md:rounded-[2rem] bg-white p-6 md:p-8 transition-transform duration-300 hover:-translate-y-1">
      <div className={`flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl ${gold ? 'bg-gold-soft text-gold-ink' : 'bg-brand-soft text-brand'}`}>
        <Icon size={24} className="md:w-[26px] md:h-[26px]" strokeWidth={2.2} />
      </div>
      <h3 className="text-base md:text-lg font-bold text-ink">{title}</h3>
      <p className="text-xs md:text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  );
}

function FaqItem({ q, a }) {
  return (
    <div className="border-b border-edge last:border-b-0 py-5 md:py-6">
      <h4 className="mb-2 text-sm md:text-base font-bold text-ink">{q}</h4>
      <p className="text-xs md:text-sm leading-relaxed text-muted">{a}</p>
    </div>
  );
}

export default function KocIntroPage({ onApply, onBack, isKoc = false }) {
  // 已經是 KOC 的人不需要再申請，按鈕改成前往接案中心
  const applyLabel = isKoc ? '前往接案中心' : '立即申請成為 KOC';
  const scrollToSteps = () => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-cream font-sans text-ink overflow-x-clip">
      <div className="mx-auto max-w-6xl px-4 md:px-6 pt-6 md:pt-8">
        <button
          onClick={onBack}
          className="mb-5 md:mb-6 flex w-max items-center gap-1.5 rounded-full bg-white px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-bold text-muted transition-colors hover:text-brand"
        >
          <ChevronLeft size={16} className="md:w-[18px] md:h-[18px]" />
          返回商品頁
        </button>

        {/* 首屏：淡紫色塊 + 影片 */}
        <section className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem_7.5rem_2.5rem_2.5rem] bg-brand-soft px-6 py-10 md:px-14 md:py-16 grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-12">
          <div className="relative max-w-xl text-center lg:text-left mx-auto lg:mx-0">
            <div className="mb-5 md:mb-6 inline-flex items-center gap-1.5 md:gap-2 rounded-full bg-white px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-mono tracking-widest text-brand">
              <Sparkles size={12} className="md:w-3.5 md:h-3.5" />
              KOC PARTNER PROGRAM
            </div>

            <h1 className="mb-5 md:mb-6 font-display text-[34px] md:text-5xl lg:text-[54px] font-bold leading-[1.2] text-brand-dark">
              把你的影響力
              <br />
              變成穩定收入
            </h1>

            <p className="mb-8 md:mb-9 text-sm md:text-base leading-relaxed text-brand-dark/75">
              加入 KOC 行銷接案計畫，領取專屬優惠碼，推薦你喜歡的商品給粉絲。每一筆使用你優惠碼的訂單，都會為你帶來分潤——零成本、零庫存，接案時間完全彈性。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2 sm:gap-3">
              <button
                onClick={onApply}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-brand px-7 py-3.5 md:px-8 md:py-4 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
              >
                {applyLabel}
                <ArrowRight size={16} />
              </button>
              <button
                onClick={scrollToSteps}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-full px-6 py-3.5 md:py-4 text-sm font-bold text-brand hover:text-brand-dark transition-colors"
              >
                看合作流程
              </button>
            </div>
          </div>

          {/* 介紹影片：白框 + 微微傾斜，像放在色塊上的照片 */}
          <div className="relative w-full max-w-[480px] mx-auto lg:mx-0 lg:justify-self-end rounded-[1.6rem] md:rounded-[2rem] bg-white p-2.5 md:p-3 shadow-[0_20px_44px_rgba(63,56,112,0.16)]">
            <video src={KOCVideo} autoPlay loop muted playsInline className="block w-full aspect-video object-cover rounded-[1.1rem] md:rounded-[1.4rem]" />
          </div>
        </section>
      </div>

      {/* WHY JOIN US */}
      <section className="mx-auto max-w-6xl px-4 md:px-6 pt-16 md:pt-24">
        <SectionHeading label="WHY JOIN US" title="為什麼選擇成為 KOC" />
        <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-3">
          <BenefitCard gold icon={Wallet} title="分潤回饋" desc="每一筆使用你專屬優惠碼完成的訂單，都能為你帶來對應比例的分潤收益，收益明細即時透明可查。" />
          <BenefitCard icon={Zap} title="零成本零庫存" desc="不需要囤貨、不需要處理物流，你只需要專注在內容創作與推薦，其餘交易流程全由平台負責。" />
          <BenefitCard icon={Users} title="彈性接案" desc="自由選擇你想合作的品牌與活動，接案節奏完全由你掌控，不影響你原本的創作步調。" />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="scroll-mt-28 mx-auto max-w-6xl px-4 md:px-6 pt-16 md:pt-24">
        <SectionHeading label="HOW IT WORKS" title="合作流程很簡單" />
        <div className="grid grid-cols-1 gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StepCard number="01" title="送出申請" desc="填寫社群帳號資訊，提交 KOC 申請表單。" />
          <StepCard number="02" title="平台審核" desc="平台將人工審核你的社群帳號與資料，通常數個工作天內完成。" />
          <StepCard number="03" title="領取優惠碼" desc="審核通過後，選擇喜歡的品牌活動，領取專屬優惠碼。" />
          <StepCard number="04" title="開始賺分潤" desc="分享優惠碼給粉絲，每筆成交訂單自動累積你的分潤收益。" />
        </div>
      </section>

      <SectionDivider className="my-16 md:my-24" />

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 md:px-6">
        <SectionHeading label="FAQ" title="常見問題" />
        <div className="rounded-[1.5rem] md:rounded-[2rem] bg-white px-6 md:px-8 py-2">
          <FaqItem q="申請成為 KOC 需要付費嗎？" a="不需要，申請與使用本平台的 KOC 功能完全免費，你只需要提供真實、公開的社群帳號資訊供審核。" />
          <FaqItem q="審核需要多久時間？" a="平台將由專人審核你提交的社群帳號與資料，一般會在數個工作天內完成，審核結果將透過系統通知你。" />
          <FaqItem q="分潤什麼時候可以領取？" a="每筆使用你優惠碼完成的訂單都會即時累積到你的收益總覽，實際撥款時間依平台結算週期公告為準。" />
          <FaqItem q="我可以同時經營多個品牌的合作嗎？" a="可以，你可以自由瀏覽並申請參與多個品牌發起的活動，接案數量沒有上限，完全由你決定合作步調。" />
        </div>
      </section>

      {/* 底部 Call To Action */}
      <section className="mx-auto max-w-6xl px-4 md:px-6 pt-16 md:pt-24">
        <div className="rounded-[2rem] md:rounded-[7.5rem_2.5rem_2.5rem_2.5rem] bg-brand px-6 py-12 md:px-8 md:py-16 text-center text-white">
          <p className="mb-4 font-mono text-[10px] md:text-xs tracking-[0.25em] text-gold-soft">ZERO COST · ZERO STOCK</p>
          <h2 className="mx-auto max-w-md font-display text-[28px] md:text-[38px] font-bold leading-snug">
            {isKoc ? <>繼續你的<br />KOC 之旅吧！</> : <>準備好開始你的<br />KOC 之旅了嗎？</>}
          </h2>
          <button
            onClick={onApply}
            className="w-full sm:w-auto mt-7 md:mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 md:px-10 text-sm md:text-base font-bold text-brand transition-colors hover:bg-brand-soft"
          >
            {applyLabel}
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
