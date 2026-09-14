import { API_BASE_URL } from '../config';
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';
import LogoIcon from '../assets/logo.jpg';
import LogoText from '../assets/ShareBuy.png';

function InputField({ label, hint, icon: Icon, ...props }) {
  return (
    <div className="mb-4 sm:mb-5">
      <div className="flex justify-between items-end mb-1.5 sm:mb-2">
        <label className="block text-xs sm:text-sm font-bold text-[#1A1A18] tracking-wide">{label}</label>
        {hint && <span className="text-[10px] sm:text-xs font-medium text-[#8C8880]">{hint}</span>}
      </div>
      <div className="relative group">
        {Icon && (
          <div className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-[#8C8880] transition-colors duration-300 group-focus-within:text-[#C8522A]">
            <Icon size={18} strokeWidth={2.5} />
          </div>
        )}
        <input
          {...props}
          className={`w-full rounded-xl sm:rounded-2xl border border-[#E2DDD4] bg-white py-3.5 sm:py-4 ${Icon ? 'pl-10 sm:pl-11' : 'px-4 sm:px-5'} pr-4 sm:pr-5 text-sm text-[#1A1A18] shadow-sm outline-none transition-all duration-300 placeholder:text-[#8C8880]/60 focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30`}
        />
      </div>
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
    <div className="flex min-h-screen font-sans animate-in fade-in duration-700 bg-[#F5F0E8] md:bg-white">
      
      {/* =========================================
          左側品牌形象區
      ========================================== */}
      <div className="hidden md:flex md:w-1/3 bg-[#1A1A18] relative overflow-hidden flex-col justify-between p-8 lg:p-12">
        
        {/* 背景光暈 */}
        <div className="absolute top-[-10%] left-[-10%] w-[20rem] lg:w-[25rem] h-[20rem] lg:h-[25rem] bg-[#C8522A] rounded-full mix-blend-screen filter blur-[80px] lg:blur-[100px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[20rem] lg:w-[25rem] h-[20rem] lg:h-[25rem] bg-[#B89B6A] rounded-full mix-blend-screen filter blur-[80px] lg:blur-[100px] opacity-20"></div>

        {/* 頂部 Logo 與徽章 */}
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="flex items-center gap-3">
            <img 
              src={LogoIcon} 
              alt="ShareBuy Logo" 
              className="w-8 h-8 rounded-full object-cover shadow-[0_0_15px_rgba(200,82,42,0.5)]" 
            />
            <img 
              src={LogoText} 
              alt="ShareBuy Text" 
              className="h-5 lg:h-6 w-auto object-contain translate-y-0.5 contrast-125 brightness-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]" 
            />
          </div>
          <span className="bg-white/10 backdrop-blur-md text-[#F5F0E8] border border-white/20 text-[9px] px-3 py-1 rounded-full tracking-widest font-bold mt-1 w-fit">
            ADMIN PORTAL
          </span>
        </div>

        <div className="relative z-10 my-auto">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-serif text-[#F5F0E8] leading-[1.25] mb-5 lg:mb-6">
            Behind every <br/>
            <span className="text-[#C8522A] italic">great campaign</span>.
          </h2>
          <div className="space-y-3">
            <p className="text-[#8C8880] text-sm lg:text-base leading-relaxed font-medium">
              管理平台營運、審核 KOC 資格、追蹤專案成效。一切盡在掌握之中。
            </p>
          </div>
        </div>

        {/* 底部系統安全宣告 */}
        <div className="relative z-10 flex items-start xl:items-center gap-3 text-[#8C8880] text-[11px] lg:text-xs font-bold border-t border-white/10 pt-5">
          <ShieldCheck size={16} className="text-[#B89B6A] flex-shrink-0 mt-0.5 xl:mt-0"/>
          <span>Enterprise-grade Security. <br className="xl:hidden"/>內部授權人員專用。</span>
        </div>
      </div>

      {/* =========================================
          右側：登入操作區
      ========================================== */}
      <div className="w-full md:w-2/3 bg-[#F5F0E8] flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16 relative">
        
        <div className="w-full max-w-sm sm:max-w-md">
          {/* 表單頂部標題區 */}
          <div className="mb-8 sm:mb-10">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <img 
                src={LogoIcon} 
                alt="ShareBuy Logo" 
                className="h-12 w-12 sm:h-14 sm:w-14 object-cover rounded-xl sm:rounded-2xl shadow-sm" 
              />
              <img 
                src={LogoText} 
                alt="ShareBuy Text" 
                className="h-6 w-auto object-contain md:hidden mix-blend-multiply" 
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#1A1A18] mb-2 sm:mb-3">系統授權登入</h2>
            <p className="text-[#8C8880] font-bold text-xs sm:text-sm tracking-wide">請輸入您的管理員專屬憑證以繼續</p>
          </div>

          {/* 登入表單 */}
          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
            <InputField
              label="管理員信箱"
              icon={Mail}
              type="email"
              placeholder="admin@koc.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <InputField
              label="密碼"
              icon={Lock}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {loginError && (
              <div className="text-xs sm:text-sm font-bold text-[#C8522A] bg-[#FDF0ED] border border-[#C8522A]/20 rounded-xl px-4 py-3">
                {loginError}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="mt-6 sm:mt-8 w-full rounded-xl sm:rounded-2xl bg-[#1A1A18] py-4 sm:py-[18px] text-xs sm:text-sm font-bold tracking-[0.1em] text-[#F5F0E8] shadow-[0_8px_20px_rgba(26,26,24,0.15)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(200,82,42,0.25)] hover:bg-[#C8522A] active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isLoggingIn ? '驗證憑證中...' : '進入後台系統'} 
              {!isLoggingIn && <ArrowRight size={16} />}
            </button>
          </form>

          {/* 底部提示語 */}
          <div className="mt-10 sm:mt-12 text-center">
            <span className="text-[10px] sm:text-xs font-bold text-[#8C8880]">
              如遇登入異常，請透過內部 Slack 聯繫 IT 部門。
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}