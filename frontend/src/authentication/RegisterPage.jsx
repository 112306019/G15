import { API_BASE_URL } from '../config';
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
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

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

      const res = await fetch(`${API_BASE_URL}/api/user/signUp`, {
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
                placeholder="請輸入電子郵件"
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
            <div className="mb-7 flex w-full items-start gap-3 text-left">
              <button
                type="button"
                onClick={() => setTerms((v) => !v)}
                className="mt-0.5"
              >
                <span
                  className={classNames(
                    "grid h-5 w-5 place-items-center rounded-md border transition-all",
                    terms ? "border-slate-900 bg-slate-900" : "border-[#E2DDD4] bg-white"
                  )}
                >
                  {terms ? (
                    <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                </span>
              </button>

              <span className="text-[13px] leading-6 text-slate-500">
                建立帳戶即表示您同意我們的
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="mx-1 cursor-pointer underline text-slate-900"
                >
                  條款和條件
                </button>
                以及
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="mx-1 cursor-pointer underline text-slate-900"
                >
                  隱私權政策
                </button>
                。
                {!terms && touched.name && touched.account && touched.password ? (
                  <span className="ml-1 text-[#C8522A]">（需要勾選）</span>
                ) : null}
              </span>
            </div>

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

      {/* 條款和條件彈窗 */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-6">條款和條件</h3>
            <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
              <p><strong className="text-slate-800">一、服務說明</strong><br />
              本平台提供消費者、KOC 與廠商之間的商品交易、內容合作與行銷推廣服務，使用者註冊即表示同意遵守本條款。</p>

              <p><strong className="text-slate-800">二、帳號使用</strong><br />
              使用者須提供真實資訊註冊帳號，並妥善保管帳號密碼，對於帳號登入後的所有行為負完全責任。</p>

              <p><strong className="text-slate-800">三、交易規範</strong><br />
              平台上之商品交易、付款、退換貨等事宜，依平台公告之相關規範辦理，使用者應遵守誠信原則。</p>

              <p><strong className="text-slate-800">四、禁止行為</strong><br />
              使用者不得利用平台從事任何違法、詐欺、侵權或損害平台與他人權益之行為。</p>

              <p><strong className="text-slate-800">五、條款修訂</strong><br />
              平台得依營運需要修訂本條款內容，修訂後將於系統中公告。</p>
            </div>
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="mt-8 w-full rounded-full bg-black py-3.5 text-sm font-bold text-white transition-all hover:bg-gray-800"
            >
              我已閱讀
            </button>
          </div>
        </div>
      )}

      {/* 隱私權政策彈窗 */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-6">隱私權政策</h3>
            <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
              <p><strong className="text-slate-800">一、資料蒐集</strong><br />
              本平台於使用者註冊、購物、申請成為 KOC 或廠商時，將蒐集姓名、電子郵件、聯絡方式等必要資訊，以提供平台服務。</p>

              <p><strong className="text-slate-800">二、資料使用</strong><br />
              使用者提供之個人資料僅用於平台服務所需之範圍，包括訂單處理、身分驗證、客服聯繫及活動通知等。</p>

              <p><strong className="text-slate-800">三、資料保護</strong><br />
              平台採取合理之技術與管理措施保護使用者個人資料，密碼將以加密方式儲存，避免遭未經授權之存取。</p>

              <p><strong className="text-slate-800">四、第三方分享</strong><br />
              除法律規定或使用者同意外，平台不會將個人資料提供予第三方作商業使用。</p>

              <p><strong className="text-slate-800">五、使用者權利</strong><br />
              使用者得隨時查詢、更正或要求刪除其個人資料，惟涉及交易紀錄等法律規定應保存之資料不在此限。</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="mt-8 w-full rounded-full bg-black py-3.5 text-sm font-bold text-white transition-all hover:bg-gray-800"
            >
              我已閱讀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
