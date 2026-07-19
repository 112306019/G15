import React, { useState } from "react";

// 自訂的 Apple Icon (保留你原本精美的 SVG)
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] text-[#1A1A18]" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

// 統一的輸入框元件 (套用 ShopPage 的溫暖色系與框線設計)
function InputField({ label, hint, ...props }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-end mb-2">
        <label className="block text-sm font-bold text-[#1A1A18]">{label}</label>
        {hint && <span className="text-xs font-medium text-[#8C8880]">{hint}</span>}
      </div>
      <input
        {...props}
        className="w-full rounded-xl border border-[#E2DDD4] bg-white px-5 py-3.5 text-sm text-[#1A1A18] shadow-sm outline-none transition-all placeholder:text-[#8C8880] focus:border-[#1A1A18] focus:ring-1 focus:ring-[#1A1A18]"
      />
    </div>
  );
}

export default function LoginPage({ 
  onLoginSuccess, 
  onRegisterSuccess, 
  onSkipToShop, 
}) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");
  
  return (
    // 大背景改為與 ShopPage 相同的 #F5F0E8
    <div className="flex min-h-screen flex-col bg-[#F5F0E8] font-sans text-[#1A1A18] duration-500 animate-in fade-in">
      
      {/* =========================================
          頂部橫幅 (移除原本的黑底，改為明亮優雅的風格)
      ========================================== */}
      <div className="flex w-full items-center justify-center border-b border-[#E2DDD4] bg-white py-16">
        <h1 className="relative text-center font-serif text-3xl tracking-widest text-[#1A1A18] md:text-4xl">
          選擇登入或註冊
          {/* 底部點綴的橘色底線，呼應 ShopPage 的 SectionHeader */}
          <span className="absolute left-1/2 top-full mt-3 h-0.5 w-12 -translate-x-1/2 rounded bg-[#C8522A]" />
        </h1>
      </div>

      {/* =========================================
          主要內容區：左右雙拼
      ========================================== */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
          
          {/* 🟢 左側：登入區塊 (加上卡片底色、框線與懸停效果) */}
          <div className="flex flex-col rounded-2xl border border-[#E2DDD4] bg-[#FDFAF6] p-8 transition-all hover:border-[#E8C4B4] hover:shadow-[0_16px_40px_rgba(26,26,24,0.05)] md:p-12">
            <h2 className="relative mb-10 inline-block font-serif text-2xl text-[#1A1A18]">
              歡迎回來！
              <span className="absolute left-0 top-full mt-2 h-0.5 w-8 rounded bg-[#B89B6A]" />
            </h2>

            <InputField 
              label="電子郵件或手機號碼" 
              placeholder="提示：輸入包含 'koc' 的電子郵件即可體驗 KOC 介面" 
              value={loginEmail} 
              onChange={(e) => setLoginEmail(e.target.value)} 
            />
            
            <div className="mb-2">
              <InputField 
                label="密碼" 
                type="password" 
                placeholder="請輸入密碼" 
                value={loginPw} 
                onChange={(e) => setLoginPw(e.target.value)} 
              />
              <div className="-mt-3 mb-8 text-right">
                <button className="text-xs font-bold text-[#8C8880] transition-colors hover:text-[#C8522A]">忘記密碼？</button>
              </div>
            </div>

            {/* 按鈕套用 ShopPage 的顏色 #1A1A18 與懸停橘色 #C8522A */}
            <button 
              onClick={() => {
                // 🟢 檢查輸入欄位中是否帶有 'koc' 字樣
                const isKocUser = loginEmail.toLowerCase().includes("koc");
                // 🟢 將身份傳遞給父組件的 handleLoginSuccess
                onLoginSuccess(isKocUser ? "koc" : "shopper");
              }}
              className="mt-auto w-full rounded-full bg-[#1A1A18] py-4 text-sm tracking-[0.05em] text-[#F5F0E8] shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#C8522A] active:translate-y-0"
            >
              登入
            </button>
          </div>

          {/* 🟢 右側：註冊區塊 (加上卡片底色、框線與懸停效果) */}
          <div className="flex flex-col rounded-2xl border border-[#E2DDD4] bg-[#FDFAF6] p-8 transition-all hover:border-[#E8C4B4] hover:shadow-[0_16px_40px_rgba(26,26,24,0.05)] md:p-12">
            <h2 className="relative mb-10 inline-block font-serif text-2xl text-[#1A1A18]">
              註冊帳號
              <span className="absolute left-0 top-full mt-2 h-0.5 w-8 rounded bg-[#B89B6A]" />
            </h2>

            <InputField 
              label="全名" 
              placeholder="請輸入姓名" 
              value={regName} 
              onChange={(e) => setRegName(e.target.value)} 
            />

            <InputField 
              label="電子郵件或手機號碼" 
              placeholder="請輸入電子郵件或手機號碼" 
              value={regEmail} 
              onChange={(e) => setRegEmail(e.target.value)} 
            />

            <InputField 
              label="密碼" 
              hint="密碼需有至少8位"
              type="password" 
              placeholder="請輸入密碼" 
              value={regPw} 
              onChange={(e) => setRegPw(e.target.value)} 
            />

            <div className="mb-10 flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-[#E2DDD4] text-[#1A1A18] focus:ring-[#1A1A18]" />
              <span className="text-xs font-medium leading-relaxed text-[#8C8880]">
                建立帳戶即表示您同意我們的條款和條件以及隱私權政策。
              </span>
            </div>

            <button 
              onClick={onRegisterSuccess}
              className="mt-auto w-full rounded-full bg-[#1A1A18] py-4 text-sm tracking-[0.05em] text-[#F5F0E8] shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#C8522A] active:translate-y-0"
            >
              註冊
            </button>
          </div>

        </div>

        {/* 🟢 底部：跳過註冊直接購物 */}
        <div className="mt-16 text-center">
          <span className="text-sm font-bold text-[#8C8880]">想要先購物就好？ </span>
          <button 
            onClick={onSkipToShop}
            className="text-sm font-bold text-[#1A1A18] underline underline-offset-4 transition-colors hover:text-[#C8522A]"
          >
            直接進入購物
          </button>
        </div>

      </div>
    </div>
  );
}