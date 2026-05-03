import React, { useState } from "react";
import { Lock } from "lucide-react";

// 自訂 Facebook Icon (保留你的漂亮 SVG)
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

// 自訂 Apple Icon (保留你的漂亮 SVG)
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-800" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
      />
    </svg>
  );
}

// 高質感 Modal 彈窗
function Modal({ open, title, onClose, children }) {
  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 transition-all duration-300 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl transition-all duration-300 ${
          open ? "translate-y-0 scale-100" : "translate-y-8 scale-95"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="text-2xl font-bold text-slate-800 mb-6">{title}</div>
        {children}
      </div>
    </div>
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
    if (newPw.length < 8) return showToast("新密碼需至少 8 位");
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

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl">
      <h2 className="mb-10 text-3xl font-bold text-slate-800">登入與安全性</h2>

      {/* =========================================
          1. 密碼管理區塊
      ========================================== */}
      <h3 className="mb-6 text-lg font-bold text-slate-700 flex items-center gap-2">
        <Lock size={20} className="text-slate-500" />
        密碼登入
      </h3>
      
      <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-10">
        <div>
          <div className="text-base font-bold text-slate-800">密碼</div>
          <div className="mt-1 text-sm font-medium text-gray-400">上次更新為一個月前</div>
        </div>
        <button
          onClick={() => setPwOpen(true)}
          className="rounded-full bg-gray-100 px-6 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-gray-200"
        >
          更新密碼
        </button>
      </div>

      <div className="my-10 h-px w-full bg-gray-100" />

      {/* =========================================
          2. 社群網站帳號區塊
      ========================================== */}
      <h3 className="mb-6 text-lg font-bold text-slate-700">社群網站帳號</h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-10">
        {/* Facebook */}
        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <div className="mb-1 flex items-center gap-2 text-base font-bold text-slate-800">
              <FacebookIcon /> Facebook
            </div>
            <div className={`text-sm font-medium ${connected.fb ? "text-green-500" : "text-gray-400"}`}>
              {connected.fb ? "已連結" : "未連結"}
            </div>
          </div>
          <button
            onClick={() => !connected.fb && handleConnect("fb")}
            disabled={connecting.fb || connected.fb}
            className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
              connected.fb
                ? "bg-green-50 text-green-600 border border-green-200"
                : connecting.fb
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-100 text-slate-600 hover:bg-gray-200"
            }`}
          >
            {connected.fb ? "已連結" : connecting.fb ? "連結中..." : "Connect"}
          </button>
        </div>

        {/* Apple */}
        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <div className="mb-1 flex items-center gap-2 text-base font-bold text-slate-800">
              <AppleIcon /> Apple account
            </div>
            <div className={`text-sm font-medium ${connected.apple ? "text-green-500" : "text-gray-400"}`}>
              {connected.apple ? "已連結" : "未連結"}
            </div>
          </div>
          <button
            onClick={() => !connected.apple && handleConnect("apple")}
            disabled={connecting.apple || connected.apple}
            className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
              connected.apple
                ? "bg-green-50 text-green-600 border border-green-200"
                : connecting.apple
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-100 text-slate-600 hover:bg-gray-200"
            }`}
          >
            {connected.apple ? "已連結" : connecting.apple ? "連結中..." : "Connect"}
          </button>
        </div>
      </div>

      <div className="my-10 h-px w-full bg-gray-100" />

      {/* =========================================
          3. 登入記錄區塊
      ========================================== */}
      <h3 className="mb-6 text-lg font-bold text-slate-700">登入記錄</h3>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {sessions.map((s, index) => (
          <div
            key={s.id}
            className={`flex items-center justify-between p-6 transition-colors hover:bg-gray-50 ${
              index !== sessions.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            <div>
              <div className="mb-1 flex items-center gap-3 text-base font-bold text-slate-800">
                {s.name}
                {s.current ? (
                  <span className="rounded-md bg-green-50 px-2.5 py-1 text-[10px] font-bold tracking-wider text-green-600 uppercase">
                    目前裝置
                  </span>
                ) : (
                  <span className="rounded-md bg-gray-100 px-2.5 py-1 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                    裝置
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-gray-400">{s.date}</div>
            </div>

            <button
              onClick={() => handleLogoutDevice(s.id)}
              className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-400 transition-all hover:border-slate-800 hover:text-slate-800"
            >
              Log out device
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="p-8 text-center text-sm font-bold text-gray-400">目前沒有可顯示的登入記錄。</div>
        )}
      </div>

      {/* =========================================
          Modal: 更新密碼
      ========================================== */}
      <Modal open={pwOpen} title="更新密碼" onClose={() => setPwOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">目前密碼</label>
            <input
              type="password"
              placeholder="輸入目前密碼"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm outline-none transition-all focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">新密碼</label>
            <input
              type="password"
              placeholder="輸入新密碼（至少8個字元）"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm outline-none transition-all focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">確認新密碼</label>
            <input
              type="password"
              placeholder="再次輸入新密碼"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm outline-none transition-all focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => setPwOpen(false)}
              className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-3.5 text-sm font-bold text-gray-500 transition-all hover:border-slate-800 hover:text-slate-800"
            >
              取消
            </button>
            <button
              onClick={handleSavePassword}
              className="flex-1 rounded-full bg-slate-800 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-black"
            >
              確認儲存
            </button>
          </div>
        </div>
      </Modal>

      {/* 🟢 彈出提示 (Toast) */}
      <div
        className={`fixed bottom-10 left-1/2 z-[999] -translate-x-1/2 rounded-full bg-slate-800 px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 shadow-xl ${
          toast.show ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}