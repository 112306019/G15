import { API_BASE_URL } from '../config';
import React, { useState } from "react";
import { ArrowLeft, Mail, Lock, User, ShieldCheck } from "lucide-react";

function InputField({ label, hint, icon: Icon, ...props }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-end mb-2">
        <label className="block text-[11px] font-black text-[#1A1A18] tracking-widest uppercase">{label}</label>
        {hint && <span className="text-[10px] font-bold text-[#8C8880]">{hint}</span>}
      </div>
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8880] transition-colors duration-300 group-focus-within:text-[#C8522A]">
            <Icon size={18} strokeWidth={2.5} />
          </div>
        )}
        <input
          {...props}
          className={`w-full rounded-2xl border border-[#E2DDD4] bg-white/60 backdrop-blur-sm py-4 ${Icon ? 'pl-12' : 'px-5'} pr-5 text-sm font-medium text-[#1A1A18] outline-none transition-all duration-300 placeholder:text-[#8C8880]/50 focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30`}
        />
      </div>
    </div>
  );
}

export default function LoginPage({
  onBack,
  onLoginSuccess,
  onRegisterSuccess,
  onSkipToShop,
}) {
  const [isLogin, setIsLogin] = useState(true);
  const [justRegisteredMsg, setJustRegisteredMsg] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginNeedsVerification, setLoginNeedsVerification] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");
  const [regConfirmPw, setRegConfirmPw] = useState("");
  const [regTerms, setRegTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPw, setForgotNewPw] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyDone, setVerifyDone] = useState(false);
  const [verifyResendMsg, setVerifyResendMsg] = useState("");

  const switchToLoginAfterRegister = (account) => {
    setIsLogin(true);
    setJustRegisteredMsg("✓ 註冊成功！請使用剛剛設定的帳號密碼登入");
    setLoginEmail(account || "");
    setLoginPw("");
    setLoginError("");
    setRegName("");
    setRegEmail("");
    setRegPw("");
    setRegConfirmPw("");
    setRegTerms(false);
    setRegSuccess(false);
  };

  const handleLogin = async () => {
    setLoginError("");
    setLoginNeedsVerification(false);
    if (!loginEmail.trim() || !loginPw) {
      setLoginError("請輸入電子郵件和密碼");
      return;
    }
    setLoginSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPw }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("role", data.role);
        onLoginSuccess?.({ userId: data.userId, role: data.role, token: data.token });
      } else {
        setLoginError(data.err || "帳號或密碼錯誤");
        setLoginNeedsVerification(Boolean(data.needsVerification));
      }
    } catch (err) {
      setLoginError("網路錯誤，請確認後端是否正常運作");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleRegister = async () => {
    setRegError("");
    if (!regName.trim() || !regEmail.trim() || regPw.length < 8) {
      setRegError("請填寫所有欄位，密碼需至少 8 位");
      return;
    }
    if (regPw !== regConfirmPw) {
      setRegError("兩次輸入的密碼不相符");
      return;
    }
    if (!regTerms) {
      setRegError("請同意條款和條件");
      return;
    }
    setRegSubmitting(true);
    try {
      const isEmail = regEmail.trim().includes("@");
      const body = {
        name: regName.trim(),
        email: isEmail ? regEmail.trim() : `${regEmail.trim()}@phone.local`,
        password: regPw,
        phone: isEmail ? "" : regEmail.trim(),
        role: 2, 
      };
      const res = await fetch(`${API_BASE_URL}/api/user/signUp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.requiresVerification) {
          setVerifyOpen(true);
          setVerifyEmail(body.email);
          setVerifyCode("");
          setVerifyError("");
          setVerifyDone(false);
          setVerifyResendMsg("");
        } else {
          setRegSuccess(true);
          onRegisterSuccess?.({ name: regName.trim(), account: regEmail.trim() });
          switchToLoginAfterRegister(regEmail.trim());
        }
      } else {
        setRegError(data.err || "註冊失敗，請再試一次");
      }
    } catch (err) {
      setRegError("網路錯誤，請確認後端是否正常運作");
    } finally {
      setRegSubmitting(false);
    }
  };

  const closeVerifyModal = () => setVerifyOpen(false);

  const handleVerifyCode = async () => {
    setVerifyError("");
    if (!verifyCode.trim()) {
      setVerifyError("請輸入驗證碼");
      return;
    }
    setVerifySubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/verifyEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail, code: verifyCode.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyDone(true);
        setRegSuccess(true);
        onRegisterSuccess?.({ name: regName.trim(), account: regEmail.trim() });
      } else {
        setVerifyError(data.err || "驗證失敗，請再試一次");
      }
    } catch (err) {
      setVerifyError("網路錯誤，請確認後端是否正常運作");
    } finally {
      setVerifySubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setVerifyError("");
    setVerifyResendMsg("");
    setVerifySubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/resendVerification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyResendMsg("驗證碼已重新寄出，請查收信箱。");
      } else {
        setVerifyError(data.err || "驗證碼寄送失敗，請稍後再試");
      }
    } catch (err) {
      setVerifyError("網路錯誤，請確認後端是否正常運作");
    } finally {
      setVerifySubmitting(false);
    }
  };

  const openVerifyFromLogin = () => {
    setVerifyOpen(true);
    setVerifyEmail(loginEmail.trim());
    setVerifyCode("");
    setVerifyError("");
    setVerifyDone(false);
    setVerifyResendMsg("");
  };

  const openForgotModal = () => {
    setForgotOpen(true);
    setForgotStep("email");
    setForgotEmail(loginEmail.trim());
    setForgotCode("");
    setForgotNewPw("");
    setForgotError("");
  };

  const closeForgotModal = () => setForgotOpen(false);

  const handleSendResetCode = async () => {
    setForgotError("");
    if (!forgotEmail.trim()) {
      setForgotError("請輸入電子郵件");
      return;
    }
    setForgotSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForgotStep("reset");
      } else {
        setForgotError(data.err || "驗證碼寄送失敗，請稍後再試");
      }
    } catch (err) {
      setForgotError("網路錯誤，請確認後端是否正常運作");
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setForgotError("");
    if (!forgotCode.trim() || forgotNewPw.length < 8) {
      setForgotError("請輸入驗證碼，新密碼需至少 8 位");
      return;
    }
    setForgotSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          code: forgotCode.trim(),
          new_password: forgotNewPw,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForgotStep("done");
      } else {
        setForgotError(data.err || "重設密碼失敗，請稍後再試");
      }
    } catch (err) {
      setForgotError("網路錯誤，請確認後端是否正常運作");
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F0E8] font-sans text-[#1A1A18] duration-500 animate-in fade-in p-6 relative overflow-hidden">

      {/* 背景環境光暈 (Ambient Glow) - 移除 animate-pulse，改為靜態 */}
      <div className="absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] bg-[#C8522A] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.15] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-[#B89B6A] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.2] pointer-events-none"></div>

      {/* 左上角返回按鈕 */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute left-6 top-8 md:left-10 md:top-10 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group z-10 bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/60 shadow-sm"
        >
          <ArrowLeft size={16} strokeWidth={2.5} className="transition-transform group-hover:-translate-x-1" />
          <span>返回身份選擇</span>
        </button>
      )}

      {/* 懸浮玻璃卡片 (Glassmorphism) */}
      <div className="w-full max-w-[440px] relative z-10">
        
        {/* 頂部 Logo */}
        <div className="mb-8 flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-gradient-to-tr from-[#C8522A] to-[#B89B6A] rounded-[1rem] shadow-lg flex items-center justify-center mb-4 text-white transform rotate-3">
             <ShieldCheck size={24} strokeWidth={2.5} className="-rotate-3" />
          </div>
          <h1 className="text-2xl font-serif font-black tracking-[0.15em] uppercase text-[#1A1A18]">
            KOC Platform
          </h1>
        </div>

        <div className="rounded-[2.5rem] bg-white/80 backdrop-blur-xl p-8 md:p-10 shadow-[0_20px_60px_rgba(26,26,24,0.08)] border border-white">
          
          <div className="flex w-full rounded-full bg-[#E2DDD4]/40 p-1.5 mb-8 shadow-inner">
            <button
              onClick={() => { setIsLogin(true); setRegError(""); }}
              className={`flex-1 rounded-full py-2.5 text-sm font-bold transition-all duration-300 ${isLogin ? 'bg-white text-[#1A1A18] shadow-md transform scale-[1.02]' : 'text-[#8C8880] hover:text-[#1A1A18]'}`}
            >
              登入
            </button>
            <button
              onClick={() => { setIsLogin(false); setLoginError(""); setJustRegisteredMsg(""); }}
              className={`flex-1 rounded-full py-2.5 text-sm font-bold transition-all duration-300 ${!isLogin ? 'bg-white text-[#1A1A18] shadow-md transform scale-[1.02]' : 'text-[#8C8880] hover:text-[#1A1A18]'}`}
            >
              註冊
            </button>
          </div>

          <div className="min-h-[340px]">
            {isLogin ? (
              <div className="animate-in slide-in-from-left-4 fade-in duration-300">
                
                {justRegisteredMsg && (
                  <div className="mb-6 rounded-2xl bg-[#EAF6EC]/80 backdrop-blur-sm px-5 py-4 text-sm font-bold text-[#2F8F4E] border border-[#2F8F4E]/20">
                    {justRegisteredMsg}
                  </div>
                )}

                <InputField
                  label="帳號"
                  icon={User}
                  placeholder="電子郵件或手機號碼"
                  value={loginEmail}
                  onChange={(e) => { setLoginEmail(e.target.value); setJustRegisteredMsg(""); }}
                />

                <div className="mb-2 relative">
                  <InputField
                    label="密碼"
                    icon={Lock}
                    type="password"
                    placeholder="請輸入密碼"
                    value={loginPw}
                    onChange={(e) => { setLoginPw(e.target.value); setJustRegisteredMsg(""); }}
                  />
                  <button 
                    type="button" 
                    onClick={openForgotModal} 
                    className="absolute right-0 top-0 mt-0 text-[11px] font-bold text-[#8C8880] hover:text-[#C8522A] transition-colors uppercase tracking-wider"
                  >
                    忘記密碼？
                  </button>
                </div>

                {loginError && (
                  <div className="mb-6 rounded-2xl bg-[#FEF5F3]/80 backdrop-blur-sm px-5 py-4 text-sm font-bold text-[#C8522A] border border-[#C8522A]/20">
                    {loginError}
                    {loginNeedsVerification && (
                      <button type="button" onClick={openVerifyFromLogin} className="ml-2 underline underline-offset-2 hover:text-[#A64220]">
                        重新寄送
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  disabled={loginSubmitting}
                  className="mt-6 w-full rounded-2xl bg-[#1A1A18] py-4 text-sm font-bold tracking-[0.1em] text-[#F5F0E8] shadow-[0_8px_20px_rgba(26,26,24,0.15)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(200,82,42,0.25)] hover:bg-[#C8522A] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loginSubmitting ? "驗證中..." : "登入系統"}
                </button>
              </div>
            ) : (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="grid grid-cols-2 gap-x-4">
                  <div className="col-span-2">
                    <InputField label="全名" icon={User} placeholder="請輸入姓名" value={regName} onChange={(e) => setRegName(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <InputField label="聯絡方式" icon={Mail} placeholder="電子郵件或手機號碼" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <InputField label="設定密碼" icon={Lock} hint="至少8位" type="password" placeholder="輸入密碼" value={regPw} onChange={(e) => setRegPw(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <InputField label="確認密碼" icon={ShieldCheck} type="password" placeholder="再次確認" value={regConfirmPw} onChange={(e) => setRegConfirmPw(e.target.value)} />
                  </div>
                </div>

                <div className="mb-4 mt-1 flex items-start gap-3 bg-white/50 p-3.5 rounded-2xl border border-white">
                  <input
                    type="checkbox"
                    checked={regTerms}
                    onChange={(e) => setRegTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#E2DDD4] text-[#C8522A] focus:ring-[#C8522A] cursor-pointer"
                  />
                  <span className="text-xs font-bold leading-relaxed text-[#8C8880]">
                    我同意平台的
                    <button type="button" onClick={() => setShowTermsModal(true)} className="underline decoration-[#E2DDD4] underline-offset-4 text-[#1A1A18] mx-1 hover:text-[#C8522A] hover:decoration-[#C8522A]">服務條款</button>
                    與
                    <button type="button" onClick={() => setShowPrivacyModal(true)} className="underline decoration-[#E2DDD4] underline-offset-4 text-[#1A1A18] mx-1 hover:text-[#C8522A] hover:decoration-[#C8522A]">隱私權政策</button>
                  </span>
                </div>

                {regError && (
                  <div className="mb-6 rounded-2xl bg-[#FEF5F3]/80 backdrop-blur-sm px-5 py-4 text-sm font-bold text-[#C8522A] border border-[#C8522A]/20">
                    {regError}
                  </div>
                )}

                <button
                  onClick={handleRegister}
                  disabled={regSubmitting || regSuccess}
                  className="w-full rounded-2xl bg-[#1A1A18] py-4 text-sm font-bold tracking-[0.1em] text-[#F5F0E8] shadow-[0_8px_20px_rgba(26,26,24,0.15)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(200,82,42,0.25)] hover:bg-[#C8522A] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {regSuccess ? "✓ 註冊成功！" : regSubmitting ? "處理中..." : "建立帳號"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 底部跳過按鈕 */}
        <div className="mt-8 text-center relative z-10">
          <button
            onClick={onSkipToShop}
            className="group flex items-center justify-center gap-2 mx-auto text-sm font-bold text-[#8C8880] transition-colors hover:text-[#1A1A18]"
          >
            <span>不想註冊？</span>
            <span className="underline decoration-[#E2DDD4] group-hover:decoration-[#1A1A18] underline-offset-4 text-[#1A1A18]">直接逛逛商城</span>
            <ArrowLeft size={16} className="rotate-180 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* 忘記密碼 */}
      {forgotOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#1A1A18]/40 p-4 backdrop-blur-md" onClick={closeForgotModal}>
          <div className="w-full max-w-md rounded-[2.5rem] bg-white/95 backdrop-blur-xl p-8 md:p-10 shadow-2xl border border-white animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            {forgotStep === "email" && (
              <>
                <h3 className="mb-2 text-2xl font-serif font-bold text-[#1A1A18]">忘記密碼</h3>
                <p className="mb-8 text-sm text-[#8C8880] font-medium">請輸入您的電子郵件，我們會寄送驗證碼給您。</p>
                <InputField label="電子郵件" icon={Mail} placeholder="請輸入信箱" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                {forgotError && <div className="mb-4 rounded-xl bg-[#FEF5F3] px-4 py-3 text-sm text-[#C8522A] font-bold">{forgotError}</div>}
                <div className="flex gap-3 mt-4">
                  <button onClick={closeForgotModal} className="flex-1 rounded-2xl border border-[#E2DDD4] py-4 text-sm font-bold text-[#8C8880] transition-colors hover:bg-[#F5F0E8]">取消</button>
                  <button onClick={handleSendResetCode} disabled={forgotSubmitting} className="flex-1 rounded-2xl bg-[#1A1A18] py-4 text-sm font-bold text-[#F5F0E8] transition-all hover:bg-[#C8522A] disabled:opacity-50">
                    {forgotSubmitting ? "寄送中..." : "寄送驗證碼"}
                  </button>
                </div>
              </>
            )}

            {forgotStep === "reset" && (
              <>
                <h3 className="mb-2 text-2xl font-serif font-bold text-[#1A1A18]">輸入驗證碼</h3>
                <p className="mb-8 text-sm text-[#8C8880] font-medium">驗證碼已寄至 <span className="font-bold text-[#1A1A18]">{forgotEmail}</span>，10 分鐘內有效。</p>
                <InputField label="驗證碼" icon={ShieldCheck} placeholder="請輸入 6 位數" value={forgotCode} onChange={(e) => setForgotCode(e.target.value)} />
                <InputField label="新密碼" icon={Lock} hint="至少8位" type="password" placeholder="請輸入新密碼" value={forgotNewPw} onChange={(e) => setForgotNewPw(e.target.value)} />
                {forgotError && <div className="mb-4 rounded-xl bg-[#FEF5F3] px-4 py-3 text-sm text-[#C8522A] font-bold">{forgotError}</div>}
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setForgotStep("email")} className="flex-1 rounded-2xl border border-[#E2DDD4] py-4 text-sm font-bold text-[#8C8880] transition-colors hover:bg-[#F5F0E8]">上一步</button>
                  <button onClick={handleResetPassword} disabled={forgotSubmitting} className="flex-1 rounded-2xl bg-[#1A1A18] py-4 text-sm font-bold text-[#F5F0E8] transition-all hover:bg-[#C8522A] disabled:opacity-50">重設密碼</button>
                </div>
              </>
            )}

            {forgotStep === "done" && (
              <>
                <div className="w-16 h-16 bg-[#EAF6EC] text-[#2F8F4E] rounded-full flex items-center justify-center mb-6">
                  <ShieldCheck size={32} />
                </div>
                <h3 className="mb-2 text-2xl font-serif font-bold text-[#1A1A18]">密碼已重設！</h3>
                <p className="mb-8 text-sm text-[#8C8880] font-medium">請使用新密碼重新登入。</p>
                <button onClick={() => { setIsLogin(true); setLoginEmail(forgotEmail); setLoginPw(""); closeForgotModal(); }} className="w-full rounded-2xl bg-[#1A1A18] py-4 text-sm font-bold text-[#F5F0E8] transition-all hover:bg-[#C8522A]">返回登入</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 註冊信箱驗證 */}
      {verifyOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#1A1A18]/40 p-4 backdrop-blur-md" onClick={closeVerifyModal}>
          <div className="w-full max-w-md rounded-[2.5rem] bg-white/95 backdrop-blur-xl p-8 md:p-10 shadow-2xl border border-white animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            {!verifyDone ? (
              <>
                <h3 className="mb-2 text-2xl font-serif font-bold text-[#1A1A18]">驗證您的 Email</h3>
                <p className="mb-8 text-sm text-[#8C8880] font-medium">驗證碼已寄至 <span className="font-bold text-[#1A1A18]">{verifyEmail}</span>，10 分鐘內有效。</p>
                <InputField label="驗證碼" icon={ShieldCheck} placeholder="請輸入 6 位數" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} />
                {verifyResendMsg && <div className="mb-4 rounded-xl bg-[#F5F0E8] px-4 py-3 text-sm font-bold text-[#1A1A18]">{verifyResendMsg}</div>}
                {verifyError && <div className="mb-4 rounded-xl bg-[#FEF5F3] px-4 py-3 text-sm font-bold text-[#C8522A]">{verifyError}</div>}
                <div className="flex gap-3 mt-4">
                  <button onClick={handleResendVerification} disabled={verifySubmitting} className="flex-1 rounded-2xl border border-[#E2DDD4] py-4 text-sm font-bold text-[#8C8880] transition-colors hover:bg-[#F5F0E8] disabled:opacity-50">重新寄送</button>
                  <button onClick={handleVerifyCode} disabled={verifySubmitting} className="flex-1 rounded-2xl bg-[#1A1A18] py-4 text-sm font-bold text-[#F5F0E8] transition-all hover:bg-[#C8522A] disabled:opacity-50">確認驗證</button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-[#EAF6EC] text-[#2F8F4E] rounded-full flex items-center justify-center mb-6">
                  <ShieldCheck size={32} />
                </div>
                <h3 className="mb-2 text-2xl font-serif font-bold text-[#1A1A18]">驗證成功！</h3>
                <p className="mb-8 text-sm text-[#8C8880] font-medium">您的帳號已完成信箱驗證，請重新登入。</p>
                <button onClick={() => { setLoginError(""); setLoginNeedsVerification(false); closeVerifyModal(); switchToLoginAfterRegister(verifyEmail); }} className="w-full rounded-2xl bg-[#1A1A18] py-4 text-sm font-bold text-[#F5F0E8] transition-all hover:bg-[#C8522A]">返回登入</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 條款和條件彈窗 (完整文字) */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-[#1A1A18]/40 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-2xl font-serif font-bold text-[#1A1A18] mb-6">服務條款</h3>
            <div className="space-y-5 text-sm text-[#8C8880] leading-relaxed font-medium">
              <p><strong className="text-[#1A1A18]">第一條、總則</strong><br />
              歡迎使用本平台（以下稱「本服務」）。本服務條款（以下稱「本條款」）係規範使用者與本平台間之權利義務關係。使用者於完成註冊程序或開始使用本服務時，即視為已閱讀、瞭解並同意接受本條款之全部內容。若使用者不同意本條款之任一部分，應立即停止使用本服務。</p>

              <p><strong className="text-[#1A1A18]">第二條、名詞定義</strong><br />
              一、「本平台」：指提供消費者、關鍵意見消費者（KOC）與廠商間商品交易、內容合作及行銷推廣服務之網站及應用程式。<br />
              二、「使用者」：指以任何方式註冊、瀏覽或使用本服務之自然人或法人，包含消費者、KOC 及廠商。<br />
              三、「內容」：指使用者於本平台發布、上傳或提交之任何文字、圖片、影音或其他形式之資料。</p>

              <p><strong className="text-[#1A1A18]">第三條、服務內容</strong><br />
              本平台提供商品瀏覽、購買、金流處理、KOC 合作媒合、優惠碼核銷及成效分析等相關服務。本平台得依營運需求，隨時新增、修改或終止部分服務內容，並以系統公告方式通知使用者。</p>

              <p><strong className="text-[#1A1A18]">第四條、帳號註冊與管理</strong><br />
              一、使用者申請註冊時，應提供真實、正確、最新及完整之個人資料。<br />
              二、使用者應妥善保管帳號及密碼，不得轉讓、出借予第三人使用。<br />
              三、使用者對其帳號登入後所為之一切行為，應負完全之法律責任。<br />
              四、如發現帳號遭他人非法使用，應立即通知本平台採取應變措施。</p>

              <p><strong className="text-[#1A1A18]">第五條、使用者義務與禁止行為</strong><br />
              使用者不得利用本服務從事下列行為：<br />
              一、上傳、發布虛偽不實、誇大不實或誤導性之商品資訊或行銷內容。<br />
              二、侵害他人之智慧財產權、隱私權或其他合法權益。<br />
              三、以不正當方式干擾本平台系統之正常運作，包含但不限於植入惡意程式、進行未經授權之存取等。<br />
              四、從事詐欺、洗錢或其他違反法令之行為。</p>

              <p><strong className="text-[#1A1A18]">第六條、交易與付款</strong><br />
              一、平台上商品之價格、規格及庫存等資訊，以廠商刊登之內容為準，本平台不保證其正確性，惟將盡合理注意義務。<br />
              二、使用者於本平台完成訂購並付款後，本平台將依廠商出貨流程處理訂單。<br />
              三、退換貨、爭議處理事宜依平台公告之消費者保護相關規範辦理。</p>

              <p><strong className="text-[#1A1A18]">第七條、KOC 合作機制</strong><br />
              經核准之 KOC 得於本平台申請參與廠商發起之行銷活動，並使用平台核發之專屬優惠碼。因優惠碼使用所生之分潤，依各活動公告之比例計算並發放。KOC 資格得因違反本條款、提供不實資訊或社群帳號無法公開查證等情事而遭暫停或終止。</p>

              <p><strong className="text-[#1A1A18]">第八條、智慧財產權</strong><br />
              本平台之網站架構、系統程式及介面設計等相關權利，均屬本平台或其權利人所有。使用者於本平台發布之內容，仍保有其智慧財產權，惟同意授權本平台於服務範圍內合理使用、展示該內容。</p>

              <p><strong className="text-[#1A1A18]">第九條、免責聲明</strong><br />
              本平台已盡合理之注意義務維護系統穩定運作，惟因不可抗力、系統維護或其他非可歸責於本平台之事由，致服務中斷或資料遺失時，本平台不負損害賠償責任。</p>

              <p><strong className="text-[#1A1A18]">第十條、條款修訂</strong><br />
              本平台得因法令變更或營運需要修訂本條款，修訂後之條款將於系統公告，使用者於公告後繼續使用本服務，視為同意修訂後之條款內容。</p>

              <p><strong className="text-[#1A1A18]">第十一條、準據法與管轄法院</strong><br />
              本條款之解釋與適用，以中華民國法律為準據法。因本條款所生之爭議，雙方同意以台灣台北地方法院為第一審管轄法院。</p>
            </div>
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="mt-8 w-full rounded-2xl bg-[#1A1A18] py-4 text-sm font-bold text-white transition-all hover:bg-[#C8522A]"
            >
              我已閱讀
            </button>
          </div>
        </div>
      )}

      {/* 隱私權政策彈窗 (完整文字) */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-[#1A1A18]/40 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-2xl font-serif font-bold text-[#1A1A18] mb-6">隱私權政策</h3>
            <div className="space-y-5 text-sm text-[#8C8880] leading-relaxed font-medium">
              <p>本平台（以下稱「本平台」）非常重視使用者之個人資料保護，依據中華民國個人資料保護法及相關法令規定，制定本隱私權政策，說明本平台蒐集、處理及利用使用者個人資料之方式，請使用者詳閱下列內容。</p>

              <p><strong className="text-[#1A1A18]">一、適用範圍</strong><br />
              本政策適用於使用者於本平台網站及應用程式中所提供之個人資料，不適用於本平台以外之第三方網站或服務。</p>

              <p><strong className="text-[#1A1A18]">二、蒐集之個人資料類別</strong><br />
              本平台於使用者註冊、購物、申請成為 KOC 或廠商、聯繫客服等過程中，將蒐集下列類別之個人資料：<br />
              （一）識別類：姓名、帳號、電子郵件信箱、聯絡電話。<br />
              （二）交易類：收件地址、付款資訊、訂單紀錄。<br />
              （三）社群類：KOC 申請者提供之社群帳號名稱與連結。<br />
              （四）系統紀錄類：登入時間、IP 位址、使用裝置資訊。</p>

              <p><strong className="text-[#1A1A18]">三、個人資料蒐集之目的</strong><br />
              本平台蒐集個人資料之目的包括：會員註冊與身分驗證、訂單處理與物流配送、KOC 資格審核與分潤計算、客服聯繫與爭議處理、行銷活動通知及提升服務品質之統計分析。</p>

              <p><strong className="text-[#1A1A18]">四、個人資料利用之期間、地區、對象及方式</strong><br />
              （一）期間：自使用者提供資料起，至帳號終止或依法令規定之保存期限屆滿為止。<br />
              （二）地區：本平台及其委託處理之合作廠商所在地。<br />
              （三）對象：本平台及依業務需要委託之金流、物流等合作廠商。<br />
              （四）方式：以自動化及非自動化方式蒐集、處理及利用。</p>

              <p><strong className="text-[#1A1A18]">五、使用者權利</strong><br />
              使用者得依個人資料保護法規定，向本平台行使下列權利：查詢或請求閱覽、請求製給複製本、請求補充或更正、請求停止蒐集處理利用、請求刪除。使用者得透過客服管道提出請求，本平台將於合理期間內處理，惟涉及交易紀錄等依法應保存之資料不在此限。</p>

              <p><strong className="text-[#1A1A18]">六、Cookie 與追蹤技術之使用</strong><br />
              本平台為提供更佳之使用體驗，將使用 Cookie 及類似技術記錄使用者之瀏覽行為與偏好設定。使用者得透過瀏覽器設定拒絕 Cookie，惟可能影響部分服務功能之使用。</p>

              <p><strong className="text-[#1A1A18]">七、資料安全維護措施</strong><br />
              本平台採取合理之技術與管理措施保護個人資料，包括但不限於密碼加密儲存、存取權限控管及定期資安檢視，以避免個人資料遭未經授權之存取、洩漏、竄改或毀損。</p>

              <p><strong className="text-[#1A1A18]">八、政策修訂</strong><br />
              本政策將因應法令變更或業務需要適時修訂，修訂後之內容將公告於本平台，請使用者隨時留意最新版本。</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="mt-8 w-full rounded-2xl bg-[#1A1A18] py-4 text-sm font-bold text-white transition-all hover:bg-[#C8522A]"
            >
              我已閱讀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}