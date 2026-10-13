import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Lock, ArrowRight, KeyRound, ArrowLeft } from 'lucide-react';
import LogoIcon from '../assets/logo.jpg';
import LogoText from '../assets/ShareBuy.png';
import { formatApiError } from '../errorMessage';

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
  const [loginNotice, setLoginNotice] = useState("");

  // 'login' | 'forgot'（輸入信箱） | 'reset'（輸入驗證碼與新密碼）
  const [mode, setMode] = useState("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPw, setResetNewPw] = useState("");
  const [resetConfirmPw, setResetConfirmPw] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetInfo, setResetInfo] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const goToForgot = () => {
    setResetEmail(email);
    setResetError("");
    setResetInfo("");
    setLoginError("");
    setLoginNotice("");
    setMode("forgot");
  };

  const backToLogin = () => {
    setResetCode("");
    setResetNewPw("");
    setResetConfirmPw("");
    setResetError("");
    setResetInfo("");
    setMode("login");
  };

  const sendResetCode = async (e) => {
    if (e) e.preventDefault();
    if (!resetEmail) {
      setResetError("請輸入管理員信箱");
      return;
    }
    setResetBusy(true);
    setResetError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/platform/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        setResetError(formatApiError(data.err) || "驗證碼寄送失敗，請稍後再試");
        return;
      }
      setResetInfo(data.message || "驗證碼已寄出，請至信箱查看");
      setResendCooldown(60);
      setMode("reset");
    } catch (err) {
      console.error("寄送驗證碼失敗", err);
      setResetError("連線失敗，請稍後再試");
    } finally {
      setResetBusy(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setResetError("");
    if (!/^\d{6}$/.test(resetCode)) {
      setResetError("請輸入信中的 6 位數驗證碼");
      return;
    }
    if (resetNewPw.length < 8) {
      setResetError("新密碼需至少 8 位");
      return;
    }
    if (resetNewPw !== resetConfirmPw) {
      setResetError("兩次輸入的新密碼不相符");
      return;
    }
    setResetBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/platform/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, code: resetCode, new_password: resetNewPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        setResetError(formatApiError(data.err) || "密碼重設失敗");
        return;
      }
      setEmail(resetEmail);
      setPassword("");
      backToLogin();
      setLoginNotice("密碼已重設，請用新密碼登入");
    } catch (err) {
      console.error("重設密碼失敗", err);
      setResetError("連線失敗，請稍後再試");
    } finally {
      setResetBusy(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    setLoginNotice("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/platform/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: email, Password: password }),
      });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        setLoginError(formatApiError(data.err) || "帳號或密碼錯誤");
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
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#1A1A18] mb-2 sm:mb-3">
              {mode === "login" ? "系統授權登入" : "重設管理員密碼"}
            </h2>
            <p className="text-[#8C8880] font-bold text-xs sm:text-sm tracking-wide">
              {mode === "login" && "請輸入您的管理員專屬憑證以繼續"}
              {mode === "forgot" && "輸入管理員信箱，我們會寄送 6 位數驗證碼給您"}
              {mode === "reset" && "輸入信中的驗證碼並設定新密碼"}
            </p>
          </div>

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
              <InputField
                label="管理員信箱"
                icon={Mail}
                type="email"
                placeholder="admin@koc.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />

              <InputField
                label="密碼"
                icon={Lock}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={goToForgot}
                  className="text-xs sm:text-sm font-bold text-[#8C8880] hover:text-[#C8522A] transition-colors focus:outline-none focus-visible:underline"
                >
                  忘記密碼？
                </button>
              </div>

              {loginNotice && (
                <div className="text-xs sm:text-sm font-bold text-[#3F6B3A] bg-[#EEF4EC] border border-[#3F6B3A]/20 rounded-xl px-4 py-3">
                  {loginNotice}
                </div>
              )}

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
          )}

          {mode === "forgot" && (
            <form onSubmit={sendResetCode} className="space-y-3 sm:space-y-4">
              <InputField
                label="管理員信箱"
                icon={Mail}
                type="email"
                placeholder="admin@koc.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="username"
                required
              />

              {resetError && (
                <div className="text-xs sm:text-sm font-bold text-[#C8522A] bg-[#FDF0ED] border border-[#C8522A]/20 rounded-xl px-4 py-3">
                  {resetError}
                </div>
              )}

              <button
                type="submit"
                disabled={resetBusy}
                className="mt-6 sm:mt-8 w-full rounded-xl sm:rounded-2xl bg-[#1A1A18] py-4 sm:py-[18px] text-xs sm:text-sm font-bold tracking-[0.1em] text-[#F5F0E8] shadow-[0_8px_20px_rgba(26,26,24,0.15)] transition-all hover:bg-[#C8522A] flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {resetBusy ? '寄送中...' : '寄送驗證碼'}
              </button>

              <button
                type="button"
                onClick={backToLogin}
                className="w-full flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#8C8880] hover:text-[#1A1A18] transition-colors py-2"
              >
                <ArrowLeft size={14} /> 返回登入
              </button>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={submitReset} className="space-y-3 sm:space-y-4">
              {resetInfo && (
                <div className="text-xs sm:text-sm font-bold text-[#5C5850] bg-white border border-[#E2DDD4] rounded-xl px-4 py-3">
                  {resetInfo}
                </div>
              )}

              <InputField
                label="驗證碼"
                hint={
                  <button
                    type="button"
                    onClick={() => sendResetCode()}
                    disabled={resendCooldown > 0 || resetBusy}
                    className="font-bold text-[#C8522A] disabled:text-[#8C8880] disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0 ? `${resendCooldown} 秒後可重新寄送` : '重新寄送'}
                  </button>
                }
                icon={KeyRound}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6 位數字"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                autoComplete="one-time-code"
                required
              />

              <InputField
                label="新密碼"
                hint="至少 8 個字元"
                icon={Lock}
                type="password"
                placeholder="••••••••"
                value={resetNewPw}
                onChange={(e) => setResetNewPw(e.target.value)}
                autoComplete="new-password"
                required
              />

              <InputField
                label="確認新密碼"
                icon={Lock}
                type="password"
                placeholder="••••••••"
                value={resetConfirmPw}
                onChange={(e) => setResetConfirmPw(e.target.value)}
                autoComplete="new-password"
                required
              />

              {resetError && (
                <div className="text-xs sm:text-sm font-bold text-[#C8522A] bg-[#FDF0ED] border border-[#C8522A]/20 rounded-xl px-4 py-3">
                  {resetError}
                </div>
              )}

              <button
                type="submit"
                disabled={resetBusy}
                className="mt-6 sm:mt-8 w-full rounded-xl sm:rounded-2xl bg-[#1A1A18] py-4 sm:py-[18px] text-xs sm:text-sm font-bold tracking-[0.1em] text-[#F5F0E8] shadow-[0_8px_20px_rgba(26,26,24,0.15)] transition-all hover:bg-[#C8522A] flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {resetBusy ? '重設中...' : '重設密碼'}
              </button>

              <button
                type="button"
                onClick={backToLogin}
                className="w-full flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#8C8880] hover:text-[#1A1A18] transition-colors py-2"
              >
                <ArrowLeft size={14} /> 返回登入
              </button>
            </form>
          )}

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