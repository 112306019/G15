import { API_BASE_URL } from '../config';
import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] text-[#1A1A18]" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

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
  onBack,
  onLoginSuccess,
  onRegisterSuccess,
  onSkipToShop,
}) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");
  const [regTerms, setRegTerms] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const handleLogin = async () => {
    setLoginError("");
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
        role: 2, // 消費者
      };

      const res = await fetch(`${API_BASE_URL}/api/user/signUp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRegSuccess(true);
        onRegisterSuccess?.({ name: regName.trim(), account: regEmail.trim() });
      } else {
        setRegError(data.err || "註冊失敗，請再試一次");
      }
    } catch (err) {
      setRegError("網路錯誤，請確認後端是否正常運作");
    } finally {
      setRegSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F0E8] font-sans text-[#1A1A18] duration-500 animate-in fade-in">

      {/* 頂部橫幅 */}
      <div className="relative flex w-full items-center justify-center border-b border-[#E2DDD4] bg-white py-16">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            返回
          </button>
        )}
        <h1 className="relative text-center font-serif text-3xl tracking-widest text-[#1A1A18] md:text-4xl">
          選擇登入或註冊
          <span className="absolute left-1/2 top-full mt-3 h-0.5 w-12 -translate-x-1/2 rounded bg-[#C8522A]" />
        </h1>
      </div>

      {/* 主要內容 */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">

          {/* 左側：登入 */}
          <div className="flex flex-col rounded-2xl border border-[#E2DDD4] bg-[#FDFAF6] p-8 transition-all hover:border-[#E8C4B4] hover:shadow-[0_16px_40px_rgba(26,26,24,0.05)] md:p-12">
            <h2 className="relative mb-10 inline-block font-serif text-2xl text-[#1A1A18]">
              歡迎回來！
              <span className="absolute left-0 top-full mt-2 h-0.5 w-8 rounded bg-[#B89B6A]" />
            </h2>

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
              <div className="-mt-3 mb-8 text-right">
                <button className="text-xs font-bold text-[#8C8880] transition-colors hover:text-[#C8522A]">忘記密碼？</button>
              </div>
            </div>

            {loginError && (
              <div className="mb-4 rounded-xl bg-[#FEF5F3] px-4 py-3 text-sm text-[#C8522A]">
                {loginError}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loginSubmitting}
              className="mt-auto w-full rounded-full bg-[#1A1A18] py-4 text-sm tracking-[0.05em] text-[#F5F0E8] shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#C8522A] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginSubmitting ? "登入中..." : "登入"}
            </button>
          </div>

          {/* 右側：註冊 */}
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

            <div className="mb-6 flex items-start gap-3">
              <input
                type="checkbox"
                checked={regTerms}
                onChange={(e) => setRegTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#E2DDD4] text-[#1A1A18] focus:ring-[#1A1A18]"
              />
              <span className="text-xs font-medium leading-relaxed text-[#8C8880]">
                建立帳戶即表示您同意我們的條款和條件以及隱私權政策。
              </span>
            </div>

            {regError && (
              <div className="mb-4 rounded-xl bg-[#FEF5F3] px-4 py-3 text-sm text-[#C8522A]">
                {regError}
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={regSubmitting || regSuccess}
              className="mt-auto w-full rounded-full bg-[#1A1A18] py-4 text-sm tracking-[0.05em] text-[#F5F0E8] shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#C8522A] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {regSuccess ? "✓ 註冊成功！" : regSubmitting ? "註冊中..." : "註冊"}
            </button>
          </div>

        </div>

        {/* 跳過直接購物 */}
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
