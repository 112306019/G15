import { API_BASE_URL } from '../config';
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// 🌟 移除了 Fingerprint，保留需要的 Icon
import { ShieldCheck, ArrowRight } from 'lucide-react';
import LogoIcon from '../assets/logo.jpg';
import LogoText from '../assets/ShareBuy.png';

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/platform/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: email, Password: password }),
      });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        setLoginError(data.err || "帳號或密碼錯誤");
        setIsLoggingIn(false);
        return;
      }

      localStorage.setItem('admin_token', `admin-session-${data.Admin_id}`);
      localStorage.setItem('admin_email', data.Email);
      localStorage.setItem('admin_id', String(data.Admin_id));
      localStorage.setItem('admin_role', data.Role);

      navigate('/admin');
    } catch (err) {
      console.error("登入失敗", err);
      setLoginError("連線失敗，請稍後再試");
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen font-sans animate-in fade-in duration-700">
      
      {/* =========================================
          左側品牌形象區
      ========================================== */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] bg-[#1A1A18] relative overflow-hidden flex-col justify-between p-12 lg:p-20">
        
        {/* 背景光暈*/}
        <div className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-[#C8522A] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-[#B89B6A] rounded-full mix-blend-screen filter blur-[120px] opacity-20"></div>

        {/* 頂部 Logo 與徽章 */}
        <div className="relative z-10 flex items-center gap-3">
          <img 
            src={LogoIcon} 
            alt="ShareBuy Logo" 
            className="w-8 h-8 rounded-full object-cover shadow-[0_0_15px_rgba(200,82,42,0.5)]" 
          />
          <img 
            src={LogoText} 
            alt="ShareBuy Text" 
            className="h-7 w-auto object-contain translate-y-1 contrast-125 brightness-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]" 
          />
          <span className="bg-white/10 backdrop-blur-md text-[#F5F0E8] border border-white/20 text-[10px] px-3 py-1 rounded-full tracking-widest font-bold mt-1 ml-1">
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
          右側：登入操作區
      ========================================== */}
      <div className="w-full md:w-1/2 lg:w-[45%] bg-[#F5F0E8] flex items-center justify-center p-8 sm:p-12 lg:p-20 relative">
        
        {/* 手機版才會出現的小 Logo */}
        <div className="absolute top-8 left-8 flex md:hidden items-center gap-3">
          <img 
            src={LogoIcon} 
            alt="ShareBuy Logo" 
            className="w-8 h-8 rounded-lg object-cover shadow-sm" 
          />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-8">
              <img 
                src={LogoIcon} 
                alt="ShareBuy Logo" 
                className="h-14 w-14 object-cover rounded-2xl shadow-sm" 
              />
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
            />

            <InputField
              label="密碼"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {loginError && (
              <div className="text-sm font-bold text-[#C8522A] bg-[#FDF0ED] border border-[#C8522A]/20 rounded-xl px-4 py-3">
                {loginError}
              </div>
            )}

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