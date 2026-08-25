import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight, Fingerprint, ChevronDown } from 'lucide-react';

function InputField({ label, hint, ...props }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-end mb-2">
        <label className="block text-sm font-bold text-[#1A1A18] tracking-wide">{label}</label>
        {hint && <span className="text-xs font-medium text-[#8C8880]">{hint}</span>}
      </div>
      <input
        {...props}
        className="w-full rounded-2xl border border-[#E2DDD4] bg-white px-5 py-4 text-sm text-[#1A1A18] shadow-sm outline-none transition-all placeholder:text-[#8C8880]/60 focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30"
      />
    </div>
  );
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@koc.com");
  const [password, setPassword] = useState("password");
  const [role, setRole] = useState("super_admin"); // 🌟 新增權限狀態（跟後端 Admins.role 的 snake_case 慣例對齊）
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    // 模擬網路延遲，讓按鈕的互動更有感
    setTimeout(() => {
      // 測試環境放寬條件，或使用預設的 admin@koc.com / password
      if(email === 'admin@koc.com' && password === 'password') {
         localStorage.setItem('admin_token', 'super_secret_token_123');
         localStorage.setItem('admin_email', email);
         localStorage.setItem('admin_id', '1');
         localStorage.setItem('admin_role', role); // 🌟 將選擇的權限存入 localStorage
         navigate('/admin');
      } else {
         alert("帳號或密碼錯誤！請使用預設的 admin@koc.com / password 進行測試。");
         setIsLoggingIn(false);
      }
    }, 800);
  };

  return (
    <div className="flex min-h-screen font-sans animate-in fade-in duration-700">
      
      {/* =========================================
          🟢 左側：高級品牌形象區 (深色主題 + 光暈)
      ========================================== */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] bg-[#1A1A18] relative overflow-hidden flex-col justify-between p-12 lg:p-20">
        
        {/* 背景氛圍光暈 (Glassmorphism 裝飾) */}
        <div className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-[#C8522A] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-[#B89B6A] rounded-full mix-blend-screen filter blur-[120px] opacity-20"></div>

        {/* 頂部 Logo 與徽章 */}
        <div className="relative z-10 flex items-center gap-4">
          <span className="w-2 h-8 bg-[#C8522A] rounded-full inline-block shadow-[0_0_15px_rgba(200,82,42,0.5)]"></span>
          <h1 className="text-2xl font-black text-[#F5F0E8] tracking-[0.2em] uppercase">KOC Platform</h1>
          <span className="bg-white/10 backdrop-blur-md text-[#F5F0E8] border border-white/20 text-[10px] px-3 py-1 rounded-full tracking-widest font-bold">
            ADMIN PORTAL
          </span>
        </div>

        {/* 中間大標題文案 */}
        <div className="relative z-10 my-auto">
          <h2 className="text-5xl lg:text-6xl font-serif text-[#F5F0E8] leading-[1.15] mb-8">
            Behind every <br/>
            <span className="text-[#C8522A] italic">great campaign</span>.
          </h2>
          <div className="space-y-3">
            <p className="text-[#8C8880] text-lg max-w-md leading-relaxed font-medium">
              管理平台營運、審核 KOC 資格、追蹤專案成效。一切盡在掌握之中。
            </p>
          </div>
        </div>

        {/* 底部系統安全宣告 */}
        <div className="relative z-10 flex items-center gap-3 text-[#8C8880] text-sm font-bold border-t border-white/10 pt-6 max-w-md">
          <ShieldCheck size={20} className="text-[#B89B6A]"/>
          <span>Enterprise-grade Security. 內部授權人員專用。</span>
        </div>
      </div>

      {/* =========================================
          🟢 右側：登入操作區 (溫暖色系 #F5F0E8)
      ========================================== */}
      <div className="w-full md:w-1/2 lg:w-[45%] bg-[#F5F0E8] flex items-center justify-center p-8 sm:p-12 lg:p-20 relative">
        
        {/* 手機版才會出現的小 Logo */}
        <div className="absolute top-8 left-8 flex md:hidden items-center gap-3">
          <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block"></span>
          <h1 className="text-lg font-black text-[#1A1A18] tracking-widest uppercase">KOC</h1>
        </div>

        <div className="w-full max-w-md">
          {/* 登入區標題 */}
          <div className="mb-10">
            <div className="w-14 h-14 bg-white shadow-sm border border-[#E2DDD4] rounded-2xl flex items-center justify-center mb-8">
              <Fingerprint size={28} className="text-[#1A1A18]" />
            </div>
            <h2 className="text-3xl font-serif font-black text-[#1A1A18] mb-3">系統授權登入</h2>
            <p className="text-[#8C8880] font-bold text-sm tracking-wide">請輸入您的管理員專屬憑證以繼續</p>
          </div>

          {/* 登入表單 */}
          <form onSubmit={handleLogin} className="space-y-4">
            <InputField 
              label="管理員信箱" 
              type="email"
              placeholder="admin@koc.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              hint="預設：admin@koc.com"
            />
            
            <InputField 
              label="專屬密碼" 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              hint="預設：password"
            />

            {/* 🌟 測試用下拉選單 */}
            <div className="mb-5 relative">
              <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-bold text-[#1A1A18] tracking-wide">登入身分權限 (測試用)</label>
              </div>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-[#E2DDD4] bg-white px-5 py-4 text-sm font-bold text-[#1A1A18] shadow-sm outline-none transition-all focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30 cursor-pointer"
                >
                  <option value="super_admin">👑 Super Admin (最高權限)</option>
                  <option value="reviewer">📝 Reviewer (審核員，無財務權限)</option>
                  <option value="finance">💰 Finance (財務員，僅看帳與審核)</option>
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#8C8880] pointer-events-none" />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="mt-8 w-full rounded-2xl bg-[#1A1A18] py-4.5 text-sm font-bold tracking-[0.1em] text-[#F5F0E8] shadow-[0_8px_20px_rgba(26,26,24,0.15)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(200,82,42,0.25)] hover:bg-[#C8522A] active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0"
              style={{ paddingBottom: '18px', paddingTop: '18px' }}
            >
              {isLoggingIn ? '驗證憑證中...' : '進入後台系統'} 
              {!isLoggingIn && <ArrowRight size={16} />}
            </button>
          </form>

          {/* 底部提示語 */}
          <div className="mt-12 text-center">
            <span className="text-xs font-bold text-[#8C8880]">
              如遇登入異常，請透過內部 Slack 聯繫 IT 部門。
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}