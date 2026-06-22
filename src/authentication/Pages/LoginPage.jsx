import React, { useMemo, useState } from "react";

function EyeIcon({ off }) {
  // off=true => eye-off (帶斜線)
  return off ? (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

export default function LoginPage({
  onLoginSuccess, // () => setView('home') 或其他
  onGoRegister, // () => setView('register')
}) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pwVisible, setPwVisible] = useState(false);

  const [emailTouched, setEmailTouched] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);

  const [submitState, setSubmitState] = useState("idle"); // idle | loading | success

  const emailValid = useMemo(() => email.trim().length > 3, [email]);
  const pwValid = useMemo(() => pw.length >= 1, [pw]);

  const emailShowError = emailTouched && !emailValid;
  const pwShowError = pwTouched && !pwValid;

  const inputBase =
    "w-full rounded-[10px] border-[1.5px] px-4 py-[13px] pr-11 text-[14px] outline-none transition-colors font-serif";
  const inputBg = "bg-[#F0F2F5] placeholder:text-[#B0B4BA] placeholder:text-[13px]";

  const inputClass = (valid, error) => {
    if (error) return `${inputBase} ${inputBg} border-[#C8522A] bg-[#FEF5F3]`;
    if (valid) return `${inputBase} border-[#6BBF6B] bg-white`;
    return `${inputBase} ${inputBg} border-transparent focus:border-[#1A1A18] focus:bg-white`;
  };

  const handleSubmit = () => {
    setEmailTouched(true);
    setPwTouched(true);

    if (!emailValid || !pwValid) return;

    setSubmitState("loading");
    setTimeout(() => {
      setSubmitState("success");
      setTimeout(() => {
        onLoginSuccess?.();
      }, 500);
    }, 1200);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 font-serif">
      {/* LEFT */}
      <div className="relative min-h-screen overflow-hidden bg-[#3A3A3A] px-12 py-10 flex flex-col">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(255,255,255,0.04)_0%,transparent_60%)]" />
        <button
          type="button"
          className="relative z-10 mb-auto inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2 font-['DM_Serif_Display'] text-[16px] tracking-[0.08em] text-[#1A1A18] transition-colors hover:bg-[#F5F0E8]"
        >
          ★ LOGO
        </button>

        <div className="relative z-10 mb-12">
          <h1 className="font-['DM_Serif_Display'] text-[48px] text-white">歡迎!</h1>
          <p className="mt-5 text-[15px] tracking-[0.05em] text-white/50">KOC 平台名稱</p>
        </div>

        <div className="relative z-10 h-[200px] w-[240px] rounded-[12px] bg-white/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-20 w-20 text-white/60" fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      </div>

      {/* RIGHT */}
      <div className="bg-white flex items-center justify-center px-6 py-14 md:px-20">
        <div className="w-full max-w-[400px]">
          <h2 className="mb-9 font-['DM_Serif_Display'] text-[34px] text-[#1A1A18]">歡迎回來！</h2>

          {/* Email */}
          <div className="mb-5">
            <label className="mb-2 block text-[13px] tracking-[0.02em] text-[#1A1A18]">
              電子郵件 或 手機號碼
            </label>
            <input
              className={inputClass(emailValid && emailTouched, emailShowError)}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (!emailTouched) setEmailTouched(true);
              }}
              onBlur={() => setEmailTouched(true)}
              placeholder="請輸入電子郵件 或 手機號碼"
              type="text"
            />
          </div>

          {/* Password */}
          <div className="mb-5">
            <label className="mb-2 block text-[13px] tracking-[0.02em] text-[#1A1A18]">密碼</label>
            <div className="relative">
              <input
                className={inputClass(pwValid && pwTouched, pwShowError)}
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  if (!pwTouched) setPwTouched(true);
                }}
                onBlur={() => setPwTouched(true)}
                placeholder="請輸入密碼"
                type={pwVisible ? "text" : "password"}
              />
              <button
                type="button"
                onClick={() => setPwVisible((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8880] transition-colors hover:text-[#1A1A18]"
                aria-label={pwVisible ? "Hide password" : "Show password"}
              >
                <EyeIcon off={pwVisible} />
              </button>
            </div>
            <div className="mt-1.5 text-right">
              <button
                type="button"
                className="text-[12px] text-[#8C8880] transition-colors hover:text-[#1A1A18]"
              >
                忘記密碼？
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#E2DDD4]" />
            <span className="whitespace-nowrap text-[12px] text-[#8C8880]">或 由其他管道登入</span>
            <div className="h-px flex-1 bg-[#E2DDD4]" />
          </div>

          {/* Social */}
          <div className="mb-7 flex justify-center gap-4">
            <button
              type="button"
              title="Google"
              className="h-[52px] w-[52px] rounded-full border-[1.5px] border-[#E2DDD4] bg-white text-[20px] transition-all hover:-translate-y-0.5 hover:border-[#1A1A18] hover:bg-[#F5F0E8] hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)]"
            >
              <span className="font-mono text-[18px] font-bold bg-[linear-gradient(135deg,#4285F4,#EA4335,#FBBC05,#34A853)] bg-clip-text text-transparent">
                G
              </span>
            </button>

            <button
              type="button"
              title="Apple"
              className="h-[52px] w-[52px] rounded-full border-[1.5px] border-[#E2DDD4] bg-white transition-all hover:-translate-y-0.5 hover:border-[#1A1A18] hover:bg-[#F5F0E8] hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)]"
            >
              <span className="inline-flex items-center justify-center text-[#1A1A18]">
                <AppleIcon />
              </span>
            </button>

            <button
              type="button"
              title="Facebook"
              className="h-[52px] w-[52px] rounded-full border-[1.5px] border-[#E2DDD4] bg-white transition-all hover:-translate-y-0.5 hover:border-[#1A1A18] hover:bg-[#F5F0E8] hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)]"
            >
              <span className="font-['DM_Serif_Display'] text-[22px] font-black leading-none text-[#1877F2]">
                f
              </span>
            </button>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitState === "loading" || submitState === "success"}
            className={`mb-6 w-full rounded-full px-4 py-[15px] text-[16px] tracking-[0.06em] transition-all
              ${submitState === "success" ? "bg-[#6BBF6B] text-white" : "bg-[#1A1A18] text-white hover:bg-[#C8522A] hover:-translate-y-[1px]"}
              ${submitState === "loading" ? "opacity-70" : ""}`}
          >
            {submitState === "idle" && "登入"}
            {submitState === "loading" && "登入中..."}
            {submitState === "success" && "✓ 登入成功！"}
          </button>

          {/* Register */}
          <p className="text-center text-[13px] text-[#8C8880]">
            還沒有帳號?{" "}
            <button
              type="button"
              onClick={() => onGoRegister?.()}
              className="font-bold text-[#1A1A18] hover:text-[#C8522A]"
            >
              註冊帳號
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}