import React, { useState } from "react";
import { Lock } from "lucide-react";

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

export default function SecurityPage({ onLogout }) {
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [toast, setToast] = useState({ show: false, message: "" });

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

  const handleLogoutDevice = (id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    showToast("裝置已登出");
  };

  // 處理主要登出按鈕
  const handleMainLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      showToast("登出成功（需於 App.jsx 綁定 onLogout 屬性）");
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl">
      <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">登入與安全性</h2>

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
          2. 登入記錄區塊
      ========================================== */}
      <h3 className="mb-6 text-lg font-bold text-slate-700">登入記錄</h3>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden mb-10">
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

      <div className="my-10 h-px w-full bg-gray-100" />

      {/* =========================================
          3. 登出帳號區塊
      ========================================== */}
      <h3 className="mb-6 text-lg font-bold text-slate-700">帳號操作</h3>
      
      <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-6 shadow-sm mb-10">
        <div>
          <div className="text-base font-bold text-red-600">登出此帳號</div>
          <div className="mt-1 text-sm font-medium text-red-400">這將會登出您目前的帳號，並返回首頁。</div>
        </div>
        <button
          onClick={handleMainLogout}
          className="rounded-full bg-red-100 px-8 py-2.5 text-sm font-bold text-red-600 transition-all hover:bg-red-200 active:scale-95"
        >
          登出
        </button>
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