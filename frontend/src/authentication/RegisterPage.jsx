import React, { useMemo, useState } from "react";

function ImageIcon() {
  return (
    <svg className="h-20 w-20 text-white/60" fill="none" stroke="currentColor" strokeWidth="1.3" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function RegisterPage({ onGoLogin, onRegisterSuccess }) {
  const [role, setRole] = useState(2); // 預設消費者
  const [name, setName] = useState("");
  const [account, setAccount] = useState(""); // email or phone
  const [password, setPassword] = useState("");
  const [pwVisible, setPwVisible] = useState(false);
  const [terms, setTerms] = useState(false);

  const [touched, setTouched] = useState({ name: false, account: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const validName = useMemo(() => name.trim().length >= 2, [name]);
  const validAccount = useMemo(() => {
    const v = account.trim();
    if (!v) return false;
    const isEmail = v.includes("@");
    const isPhone = /^[0-9]{8,}$/.test(v);
    return isEmail || isPhone;
  }, [account]);
  const validPassword = useMemo(() => password.length >= 8, [password]);

  const pwHint = useMemo(() => {
    if (password.length === 0) return { text: "密碼需有至少8位", tone: "muted" };
    if (password.length < 8) return { text: `還需 ${8 - password.length} 個字元`, tone: "error" };
    return { text: "✓ 密碼強度足夠", tone: "ok" };
  }, [password]);

  const canSubmit = validName && validAccount && validPassword && terms && !submitting && !success;

  const inputBase =
    "w-full rounded-xl border bg-slate-100 px-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:bg-white";
  const okRing = "border-emerald-500 bg-white";
  const errRing = "border-[#C8522A] bg-[#FEF5F3]";
  const neutralRing = "border-transparent focus:border-slate-900";

  const handleSubmit = async () => {
    setTouched({ name: true, account: true, password: true });
    if (!canSubmit) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const isEmail = account.trim().includes("@");
      const body = {
        name: name.trim(),
        email: isEmail ? account.trim() : `${account.trim()}@phone.local`,
        password: password,
        phone: isEmail ? "" : account.trim(),
        role: role,
      };

      const res = await fetch("http://127.0.0.1:8000/api/user/signUp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        onRegisterSuccess?.({ name: name.trim(), account: account.trim(), role });
      } else {
        setErrorMsg(data.err || "註冊失敗，請再試一次");
      }
    } catch (err) {
      setErrorMsg("網路錯誤，請確認後端是否正常運作");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* LEFT */}
        <div className="relative flex min-h-[360px] flex-col overflow-hidden bg-[#3A3A3A] px-8 py-10 lg:min-h-screen lg:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(255,255,255,0.04)_0%,transparent_60%)]" />

          <div className="relative mt-auto">
            <h1 className="font-serif text-4xl leading-tight text-white">歡迎註冊帳號!</h1>
            <p className="mt-4 text-sm tracking-wide text-white/50">KOC 平台名稱</p>

            <div className="mt-10 flex h-[200px] w-[240px] items-center justify-center rounded-xl bg-white/10">
              <ImageIcon />
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center justify-center px-6 py-12 lg:px-20">
          <div className="w-full max-w-[400px]">
            <h2 className="mb-9 font-serif text-3xl">註冊帳號</h2>

            {/* Role */}
            <div className="mb-5">
              <label className="mb-2 block text-[13px] text-slate-900">身分</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRole(2)}
                  className={classNames(
                    "flex-1 rounded-xl border py-3 text-sm transition-all",
                    role === 2 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-100 text-slate-500"
                  )}
                >
                  消費者
                </button>
                <button
                  type="button"
                  onClick={() => setRole(1)}
                  className={classNames(
                    "flex-1 rounded-xl border py-3 text-sm transition-all",
                    role === 1 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-100 text-slate-500"
                  )}
                >
                  KOC / 網紅
                </button>
              </div>
            </div>

            {/* Name */}
            <div className="mb-5">
              <label className="mb-2 block text-[13px] text-slate-900">全名</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                placeholder="請輸入姓名"
                className={classNames(
                  inputBase,
                  touched.name
                    ? validName
                      ? okRing
                      : errRing
                    : neutralRing
                )}
              />
            </div>

            {/* Email/Phone */}
            <div className="mb-5">
              <label className="mb-2 block text-[13px] text-slate-900">電子郵件 或 手機號碼</label>
              <input
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, account: true }))}
                placeholder="請輸入電子郵件 或 手機號碼"
                className={classNames(
                  inputBase,
                  touched.account
                    ? validAccount
                      ? okRing
                      : errRing
                    : neutralRing
                )}
              />
              <div className={classNames("mt-1.5 text-[11px] tracking-wide", touched.account && !validAccount ? "text-[#C8522A]" : "text-slate-500")}>
                {touched.account && !validAccount ? "請輸入正確 Email 或 8 碼以上手機號碼" : "可輸入 Email 或手機號碼（至少 8 碼）"}
              </div>
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="mb-2 block text-[13px] text-slate-900">密碼</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  type={pwVisible ? "text" : "password"}
                  placeholder="請輸入密碼"
                  className={classNames(
                    inputBase,
                    touched.password
                      ? validPassword
                        ? okRing
                        : errRing
                      : neutralRing,
                    "pr-11"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setPwVisible((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-900"
                  aria-label={pwVisible ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={pwVisible} />
                </button>
              </div>

              <p
                className={classNames(
                  "mt-1.5 text-[11px] tracking-wide",
                  pwHint.tone === "error" ? "text-[#C8522A]" : pwHint.tone === "ok" ? "text-emerald-600" : "text-slate-500"
                )}
              >
                {pwHint.text}
              </p>
            </div>

            {/* Terms */}
            <button
              type="button"
              onClick={() => setTerms((v) => !v)}
              className="mb-7 flex w-full items-start gap-3 text-left"
            >
              <span
                className={classNames(
                  "mt-0.5 grid h-5 w-5 place-items-center rounded-md border transition-all",
                  terms ? "border-slate-900 bg-slate-900" : "border-[#E2DDD4] bg-white"
                )}
              >
                {terms ? (
                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : null}
              </span>

              <span className="text-[13px] leading-6 text-slate-500">
                建立帳戶即表示您同意我們的
                <span className="mx-1 cursor-pointer underline text-slate-900">條款和條件</span>
                以及
                <span className="mx-1 cursor-pointer underline text-slate-900">隱私權政策</span>。
                {!terms && touched.name && touched.account && touched.password ? (
                  <span className="ml-1 text-[#C8522A]">（需要勾選）</span>
                ) : null}
              </span>
            </button>

            {/* Error message */}
            {errorMsg && (
              <div className="mb-4 rounded-xl bg-[#FEF5F3] px-4 py-3 text-sm text-[#C8522A]">
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={classNames(
                "mb-5 w-full rounded-full px-4 py-3.5 text-base tracking-[0.06em] text-white transition-all",
                success ? "bg-emerald-500" : canSubmit ? "bg-slate-900 hover:-translate-y-0.5 hover:bg-[#C8522A]" : "bg-slate-400 cursor-not-allowed",
                submitting ? "opacity-90" : ""
              )}
            >
              {success ? "✓ 註冊成功！請由左側重新登入" : submitting ? "註冊中..." : "註冊"}
            </button>

            {/* Login link */}
            <p className="text-center text-[13px] text-slate-500">
              已經有帳號了嗎？{" "}
              <button
                type="button"
                onClick={() => onGoLogin?.()}
                className="font-bold text-slate-900 hover:text-[#C8522A]"
              >
                登入
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
