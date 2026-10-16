// 區塊分隔線 + 滿版頁尾
// 頁尾只放目前真的有頁面的連結；之後有「關於我們」「隱私權政策」等頁面再加進來。

// 區塊之間的紫色細實線（寬度跟內容區對齊）
export function SectionDivider({ className = '' }) {
  return (
    <div className={`mx-auto max-w-6xl px-4 md:px-6 ${className}`} aria-hidden="true">
      <div className="h-[3px] rounded-full bg-brand" />
    </div>
  );
}

function FooterLink({ children, onClick }) {
  return (
    <button onClick={onClick} className="text-left text-sm font-medium text-brand-dark/80 hover:text-brand transition-colors">
      {children}
    </button>
  );
}

export default function SiteFooter({ onNavigate, userRole = 'guest' }) {
  const go = (view) => onNavigate?.(view);
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="mt-16 md:mt-24 bg-brand-soft text-brand-dark overflow-hidden">
      {/* 頁尾上緣：紫色粗實線 */}
      <div className="h-1.5 bg-brand mb-8 md:mb-10" aria-hidden="true" />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <nav className="flex flex-wrap gap-x-8 gap-y-3 md:gap-x-10">
          <FooterLink onClick={scrollTop}>所有商品</FooterLink>
          <FooterLink onClick={() => go('favorites')}>我的收藏</FooterLink>
          <FooterLink onClick={() => go('orders')}>我的訂單</FooterLink>
          {userRole !== 'koc' && <FooterLink onClick={() => go('kocIntro')}>了解 KOC 計畫</FooterLink>}
          {userRole === 'koc' && <FooterLink onClick={() => go('home')}>接案中心</FooterLink>}
          {userRole === 'shopper' && <FooterLink onClick={() => go('applyKoc')}>申請成為 KOC</FooterLink>}
          <FooterLink onClick={() => go('support')}>聯絡客服</FooterLink>
        </nav>

        <p className="mt-6 font-mono text-[11px] md:text-xs text-brand-dark/60">© {new Date().getFullYear()} ShareBuy</p>

        {/* 超大字 wordmark：寬度依畫面縮放，完整顯示不裁切（含 y 的下緣） */}
        <div
          className="font-wordmark text-brand leading-none tracking-[-0.02em] whitespace-nowrap select-none mt-6 md:mt-8 pb-6 md:pb-8 text-[length:calc((100vw_-_32px)/5)] md:text-[length:calc((100vw_-_48px)/5)] xl:text-[208px]"
          aria-hidden="true"
        >
          ShareBuy
        </div>
      </div>
    </footer>
  );
}
