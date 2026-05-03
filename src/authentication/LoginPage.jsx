import React, { useState } from "react";

// 自訂的 Apple Icon (保留你原本精美的 SVG)
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] text-slate-800" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

// 統一的輸入框元件
function InputField({ label, hint, ...props }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-end mb-2">
        <label className="block text-sm font-bold text-slate-700">{label}</label>
        {hint && <span className="text-xs text-gray-400 font-medium">{hint}</span>}
      </div>
      <input
        {...props}
        className="w-full rounded-2xl bg-[#F3F4F6] px-5 py-3.5 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-slate-800 shadow-sm"
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
    <div className="min-h-screen bg-white font-sans text-slate-800 flex flex-col animate-in fade-in duration-500">
      
      {/* =========================================
          頂部深色橫幅 (對應 Figma)
      ========================================== */}
      <div className="w-full bg-[#323333] py-16 flex justify-center items-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-widest">
          選擇登入或註冊！
        </h1>
      </div>

      {/* =========================================
          主要內容區：左右雙拼
      ========================================== */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
          
          {/* 🟢 左側：登入區塊 */}
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-slate-800 mb-8">歡迎回來！</h2>

            <InputField 
              label="電子郵件或手機號碼" 
              placeholder="請輸入電子郵件或手機號碼" 
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
              <div className="text-right -mt-3 mb-6">
                <button className="text-xs font-bold text-gray-400 hover:text-slate-800 transition-colors">忘記密碼？</button>
              </div>
            </div>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-bold text-gray-400">或 出其他管道登入</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* 社群登入按鈕 */}
            <div className="mb-8 flex justify-center gap-6">
              <button className="h-14 w-14 rounded-full border-2 border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors">
                <span className="font-bold text-xl bg-[linear-gradient(135deg,#4285F4,#EA4335,#FBBC05,#34A853)] bg-clip-text text-transparent">G</span>
              </button>
              <button className="h-14 w-14 rounded-full border-2 border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors">
                <AppleIcon />
              </button>
              <button className="h-14 w-14 rounded-full border-2 border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors">
                <span className="font-serif text-2xl font-bold text-[#1877F2]">f</span>
              </button>
            </div>

            <button 
              onClick={onLoginSuccess}
              className="mt-auto w-full rounded-full bg-black py-4 text-sm font-bold text-white transition-all hover:bg-gray-800 active:scale-95 shadow-md"
            >
              登入
            </button>
          </div>

          {/* 🟢 右側：註冊區塊 */}
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-slate-800 mb-8">註冊帳號</h2>

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

            {/* 社群帳號 */}
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-bold text-slate-700">社群帳號</label>
                <span className="text-xs font-bold text-red-400">*請至少填入一項</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-gray-400 font-bold mb-1.5 block ml-1">FB</span>
                  <input type="text" className="w-full rounded-xl bg-[#F3F4F6] px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-800" />
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-bold mb-1.5 block ml-1">IG</span>
                  <input type="text" className="w-full rounded-xl bg-[#F3F4F6] px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-800" />
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-bold mb-1.5 block ml-1">THREADS</span>
                  <input type="text" className="w-full rounded-xl bg-[#F3F4F6] px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-800" />
                </div>
              </div>
            </div>

            <div className="mb-8 flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-slate-800 focus:ring-slate-800" />
              <span className="text-xs leading-relaxed text-gray-500 font-medium">
                建立帳戶即表示您同意我們的條款和條件以及隱私權政策。
              </span>
            </div>

            <button 
              onClick={onRegisterSuccess}
              className="mt-auto w-full rounded-full bg-black py-4 text-sm font-bold text-white transition-all hover:bg-gray-800 active:scale-95 shadow-md"
            >
              註冊
            </button>
          </div>

        </div>

        {/* 🟢 底部：跳過註冊直接購物 */}
        <div className="mt-16 text-center">
          <span className="text-sm font-bold text-gray-500">想要先購物就好？ </span>
          <button 
            onClick={onSkipToShop}
            className="text-sm font-bold text-black hover:text-gray-600 transition-colors underline underline-offset-4"
          >
            直接進入購物
          </button>
        </div>

      </div>
    </div>
  );
}