import React, { useMemo, useState } from "react";

function LockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-800" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
      />
    </svg>
  );
}

function Toast({ message, show }) {
  return (
    <div
      className={[
        "fixed bottom-8 left-1/2 z-[999] -translate-x-1/2 rounded-full bg-slate-900 px-6 py-3 text-sm text-white transition-all",
        show ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none",
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

function Modal({ open, title, onClose, children }) {
  return (
    <div
      className={[
        "fixed inset-0 z-[200] flex items-center justify-center bg-black/30 px-4 transition-opacity",
        open ? "opacity-100" : "opacity-0 pointer-events-none",
      ].join(" ")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={[
          "w-[440px] max-w-[90vw] rounded-2xl bg-white p-8 shadow-xl transition-transform",
          open ? "translate-y-0" : "translate-y-4",
        ].join(" ")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="font-serif text-2xl">{title}</div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="mb-2 block text-[11px] tracking-[0.09em] text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-transparent bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition-all",
        "focus:border-slate-900 focus:bg-white",
      ].join(" ")}
    />
  );
}

function OutlineButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={[
        "rounded-full border border-[#E2DDD4] bg-white px-5 py-2 text-[13px] transition-all",
        "hover:border-slate-900 hover:bg-[#F5F0E8]",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ConnectedButton({ children, ...props }) {
  return (
    <button
      {...props}
      className={[
        "rounded-full border px-5 py-2 text-[13px] transition-all",
        "border-emerald-500 text-emerald-600 hover:bg-emerald-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function SecurityPage() {
  const [pwOpen, setPwOpen] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [toast, setToast] = useState({ show: false, message: "" });

  const [connecting, setConnecting] = useState({ fb: false, apple: false });
  const [connected, setConnected] = useState({ fb: false, apple: false });

  const [sessions, setSessions] = useState([
    { id: "session0", name: "Session", current: true, date: "May 14, 2021 at 08:36pm" },
    { id: "session1", name: "macOs Big Sur. Chrome", current: false, date: "May 14, 2021 at 08:36pm" },
    { id: "session2", name: "Session", current: false, date: "May 14, 2021 at 08:36pm" },
  ]);

  const showToast = (message) => {
    setToast({ show: true, message });
    window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  };

  const handleSavePassword = () => {
    if (newPw.length < 8) return showToast("新密碼需至少8位");
    if (newPw !== confirmPw) return showToast("兩次輸入的密碼不相符");
    setPwOpen(false);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    showToast("✓ 密碼已成功更新");
  };

  const handleConnect = (platform) => {
    if (connected[platform]) return;

    setConnecting((c) => ({ ...c, [platform]: true }));
    window.setTimeout(() => {
      setConnecting((c) => ({ ...c, [platform]: false }));
      setConnected((c) => ({ ...c, [platform]: true }));
      showToast(`✓ ${platform === "fb" ? "Facebook" : "Apple"} 帳號已連結`);
    }, 1200);
  };

  const handleLogoutDevice = (id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    showToast("裝置已登出");
  };

  const pageTitle = useMemo(() => "登入與安全性", []);

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="mb-10 font-serif text-4xl">{pageTitle}</h1>

        {/* 登入 */}
        <div className="rounded-2xl border border-[#E2DDD4] bg-white p-8">
          <div className="mb-5 flex items-center gap-2 text-lg font-bold">
            <LockIcon />
            登入
          </div>

          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="text-sm font-bold">密碼</div>
              <div className="mt-1 text-xs text-[#8C8880]">上次更新為一個月前</div>
            </div>

            <OutlineButton onClick={() => setPwOpen(true)}>更新密碼</OutlineButton>
          </div>

          <div className="my-8 h-px bg-[#E2DDD4]" />

          {/* 社群 */}
          <div className="mb-5 text-lg font-bold">社群網站帳號</div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* FB */}
            <div className="flex items-center justify-between gap-6 border-b border-[#E2DDD4] pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-8">
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                  <FacebookIcon />
                  Facebook
                </div>
                <div className={["text-xs", connected.fb ? "text-emerald-600" : "text-[#8C8880]"].join(" ")}>
                  {connected.fb ? "已連結" : "未連結"}
                </div>
              </div>

              {connected.fb ? (
                <ConnectedButton onClick={() => showToast("✓ Facebook 已連結")}>已連結</ConnectedButton>
              ) : (
                <OutlineButton
                  onClick={() => handleConnect("fb")}
                  disabled={connecting.fb}
                  className={connecting.fb ? "opacity-60 cursor-not-allowed" : ""}
                >
                  {connecting.fb ? "連結中..." : "Connect"}
                </OutlineButton>
              )}
            </div>

            {/* Apple */}
            <div className="flex items-center justify-between gap-6 md:pl-8">
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                  <AppleIcon />
                  Apple account
                </div>
                <div className={["text-xs", connected.apple ? "text-emerald-600" : "text-[#8C8880]"].join(" ")}>
                  {connected.apple ? "已連結" : "未連結"}
                </div>
              </div>

              {connected.apple ? (
                <ConnectedButton onClick={() => showToast("✓ Apple 已連結")}>已連結</ConnectedButton>
              ) : (
                <OutlineButton
                  onClick={() => handleConnect("apple")}
                  disabled={connecting.apple}
                  className={connecting.apple ? "opacity-60 cursor-not-allowed" : ""}
                >
                  {connecting.apple ? "連結中..." : "Connect"}
                </OutlineButton>
              )}
            </div>
          </div>

          <div className="my-8 h-px bg-[#E2DDD4]" />

          {/* 登入記錄 */}
          <div className="mb-5 text-lg font-bold">登入記錄</div>

          <div className="divide-y divide-[#E2DDD4]">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-6 py-5 transition-all hover:bg-[#FDFAF6] hover:px-3 hover:rounded-lg"
              >
                <div>
                  <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                    {s.name}
                    {s.current ? (
                      <span className="rounded-full border border-emerald-500 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-600">
                        目前裝置
                      </span>
                    ) : (
                      <span className="rounded-full border border-[#E2DDD4] bg-[#F5F0E8] px-2 py-0.5 font-mono text-[10px] text-[#8C8880]">
                        裝置
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#8C8880]">{s.date}</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLogoutDevice(s.id)}
                  className="rounded-full border border-[#E2DDD4] bg-white px-4 py-2 text-xs transition-all hover:border-[#C8522A] hover:text-[#C8522A]"
                >
                  Log out device
                </button>
              </div>
            ))}

            {sessions.length === 0 && (
              <div className="py-6 text-sm text-[#8C8880]">目前沒有可顯示的登入記錄。</div>
            )}
          </div>
        </div>
      </div>

      {/* Password Modal */}
      <Modal open={pwOpen} title="更新密碼" onClose={() => setPwOpen(false)}>
        <div className="mt-6">
          <Field label="目前密碼">
            <TextInput
              type="password"
              placeholder="輸入目前密碼"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
          </Field>

          <Field label="新密碼">
            <TextInput
              type="password"
              placeholder="輸入新密碼（至少8個）"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
          </Field>

          <Field label="確認新密碼">
            <TextInput
              type="password"
              placeholder="再次輸入新密碼"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
            />
          </Field>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setPwOpen(false)}
              className="flex-1 rounded-full border border-[#E2DDD4] bg-white px-4 py-3 text-sm text-[#8C8880] transition-all hover:border-slate-900 hover:text-slate-900"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSavePassword}
              className="flex-1 rounded-full bg-slate-900 px-4 py-3 text-sm text-white transition-colors hover:bg-[#C8522A]"
            >
              儲存
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toast.message} show={toast.show} />
    </div>
  );
}