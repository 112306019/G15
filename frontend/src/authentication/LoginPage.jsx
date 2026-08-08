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
  const [loginNeedsVerification, setLoginNeedsVerification] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");
  const [regTerms, setRegTerms] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  // 忘記密碼：email -> 寄送驗證碼 -> reset（輸入驗證碼+新密碼） -> done
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPw, setForgotNewPw] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  // 註冊信箱驗證：驗證碼寄出後跳出，輸入驗證碼確認信箱真的存在
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyDone, setVerifyDone] = useState(false);
  const [verifyResendMsg, setVerifyResendMsg] = useState("");

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
        if (data.requiresVerification) {
          // 用真的 Email 註冊：要先輸入驗證碼確認信箱存在，才算註冊完成
          setVerifyOpen(true);
          setVerifyEmail(body.email);
          setVerifyCode("");
          setVerifyError("");
          setVerifyDone(false);
          setVerifyResendMsg("");
        } else {
          // 用手機號碼註冊：沒有真正的信箱可以驗證，直接視為完成
          setRegSuccess(true);
          onRegisterSuccess?.({ name: regName.trim(), account: regEmail.trim() });
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

  const closeVerifyModal = () => {
    setVerifyOpen(false);
  };

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

  const closeForgotModal = () => {
    setForgotOpen(false);
  };

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
                <button type="button" onClick={openForgotModal} className="text-xs font-bold text-[#8C8880] transition-colors hover:text-[#C8522A]">忘記密碼？</button>
              </div>
            </div>

            {loginError && (
              <div className="mb-4 rounded-xl bg-[#FEF5F3] px-4 py-3 text-sm text-[#C8522A]">
                {loginError}
                {loginNeedsVerification && (
                  <button
                    type="button"
                    onClick={openVerifyFromLogin}
                    className="ml-2 font-bold underline underline-offset-2 hover:text-[#A64220]"
                  >
                    重新寄送驗證碼
                  </button>
                )}
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

      {/* 忘記密碼 */}
      {forgotOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeForgotModal}
        >
          <div
            className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {forgotStep === "email" && (
              <>
                <h3 className="mb-2 text-lg font-bold text-[#1A1A18]">忘記密碼</h3>
                <p className="mb-5 text-sm text-[#8C8880]">請輸入您的電子郵件，我們會寄送驗證碼給您。</p>
                <InputField
                  label="電子郵件"
                  placeholder="請輸入電子郵件"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
                {forgotError && (
                  <div className="mb-4 rounded-xl bg-[#FEF5F3] px-4 py-3 text-sm text-[#C8522A]">
                    {forgotError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={closeForgotModal}
                    className="flex-1 rounded-full border border-[#E2DDD4] py-3 text-sm font-bold text-[#8C8880] transition-colors hover:bg-[#F8F9FA]"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSendResetCode}
                    disabled={forgotSubmitting}
                    className="flex-1 rounded-full bg-[#1A1A18] py-3 text-sm font-bold text-[#F5F0E8] transition-all hover:bg-[#C8522A] disabled:opacity-50"
                  >
                    {forgotSubmitting ? "寄送中..." : "寄送驗證碼"}
                  </button>
                </div>
              </>
            )}

            {forgotStep === "reset" && (
              <>
                <h3 className="mb-2 text-lg font-bold text-[#1A1A18]">輸入驗證碼</h3>
                <p className="mb-5 text-sm text-[#8C8880]">
                  驗證碼已寄至 <span className="font-bold text-[#1A1A18]">{forgotEmail}</span>，10 分鐘內有效。
                </p>
                <InputField
                  label="驗證碼"
                  placeholder="請輸入 6 位數驗證碼"
                  value={forgotCode}
                  onChange={(e) => setForgotCode(e.target.value)}
                />
                <InputField
                  label="新密碼"
                  hint="密碼需有至少8位"
                  type="password"
                  placeholder="請輸入新密碼"
                  value={forgotNewPw}
                  onChange={(e) => setForgotNewPw(e.target.value)}
                />
                {forgotError && (
                  <div className="mb-4 rounded-xl bg-[#FEF5F3] px-4 py-3 text-sm text-[#C8522A]">
                    {forgotError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setForgotStep("email")}
                    className="flex-1 rounded-full border border-[#E2DDD4] py-3 text-sm font-bold text-[#8C8880] transition-colors hover:bg-[#F8F9FA]"
                  >
                    上一步
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={forgotSubmitting}
                    className="flex-1 rounded-full bg-[#1A1A18] py-3 text-sm font-bold text-[#F5F0E8] transition-all hover:bg-[#C8522A] disabled:opacity-50"
                  >
                    {forgotSubmitting ? "重設中..." : "重設密碼"}
                  </button>
                </div>
              </>
            )}

            {forgotStep === "done" && (
              <>
                <h3 className="mb-2 text-lg font-bold text-[#1A1A18]">密碼已重設！</h3>
                <p className="mb-6 text-sm text-[#8C8880]">請使用新密碼重新登入。</p>
                <button
                  onClick={() => {
                    setLoginEmail(forgotEmail);
                    setLoginPw("");
                    closeForgotModal();
                  }}
                  className="w-full rounded-full bg-[#1A1A18] py-3 text-sm font-bold text-[#F5F0E8] transition-all hover:bg-[#C8522A]"
                >
                  返回登入
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 註冊信箱驗證 */}
      {verifyOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeVerifyModal}
        >
          <div
            className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {!verifyDone ? (
              <>
                <h3 className="mb-2 text-lg font-bold text-[#1A1A18]">驗證您的 Email</h3>
                <p className="mb-5 text-sm text-[#8C8880]">
                  驗證碼已寄至 <span className="font-bold text-[#1A1A18]">{verifyEmail}</span>，10 分鐘內有效。
                </p>
                <InputField
                  label="驗證碼"
                  placeholder="請輸入 6 位數驗證碼"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                />
                {verifyResendMsg && (
                  <div className="mb-4 rounded-xl bg-[#F5F0E8] px-4 py-3 text-sm text-[#1A1A18]">
                    {verifyResendMsg}
                  </div>
                )}
                {verifyError && (
                  <div className="mb-4 rounded-xl bg-[#FEF5F3] px-4 py-3 text-sm text-[#C8522A]">
                    {verifyError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleResendVerification}
                    disabled={verifySubmitting}
                    className="flex-1 rounded-full border border-[#E2DDD4] py-3 text-sm font-bold text-[#8C8880] transition-colors hover:bg-[#F8F9FA] disabled:opacity-50"
                  >
                    重新寄送
                  </button>
                  <button
                    onClick={handleVerifyCode}
                    disabled={verifySubmitting}
                    className="flex-1 rounded-full bg-[#1A1A18] py-3 text-sm font-bold text-[#F5F0E8] transition-all hover:bg-[#C8522A] disabled:opacity-50"
                  >
                    {verifySubmitting ? "驗證中..." : "確認驗證"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="mb-2 text-lg font-bold text-[#1A1A18]">驗證成功！</h3>
                <p className="mb-6 text-sm text-[#8C8880]">您的帳號已完成信箱驗證，請重新登入。</p>
                <button
                  onClick={() => {
                    setLoginEmail(verifyEmail);
                    setLoginPw("");
                    setLoginError("");
                    setLoginNeedsVerification(false);
                    closeVerifyModal();
                  }}
                  className="w-full rounded-full bg-[#1A1A18] py-3 text-sm font-bold text-[#F5F0E8] transition-all hover:bg-[#C8522A]"
                >
                  返回登入
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
