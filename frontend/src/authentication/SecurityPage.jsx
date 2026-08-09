import React, { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { API_BASE_URL } from "../config";

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

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [passwordUpdatedAt, setPasswordUpdatedAt] = useState(null);

  useEffect(() => {
    const fetchLoginHistory = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setLoadingSessions(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/user/loginHistory?user_id=${userId}`);
        const data = await res.json();
        if (data.success) {
          const formatted = data.logs.map((log, index) => ({
            id: log.log_id,
            name: parseUserAgent(log.user_agent),
            current: index === 0,
            date: new Date(log.login_at).toLocaleString("zh-TW", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));
          setSessions(formatted);
        }
      } catch (err) {
        console.error("登入紀錄載入失敗", err);
      } finally {
        setLoadingSessions(false);
      }
    };
    fetchLoginHistory();
  }, []);

  useEffect(() => {
    const fetchPasswordInfo = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/koc/profile/getProfile?user_id=${userId}`);
        const data = await res.json();
        if (data.success) {
          setPasswordUpdatedAt(data.password_updated_at);
        }
      } catch (err) {
        console.error("密碼資訊載入失敗", err);
      }
    };
    fetchPasswordInfo();
  }, []);

  const parseUserAgent = (ua) => {
  if (!ua) return "未知裝置";
  let browser = "瀏覽器";
  let os = "";

  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";

  if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return os ? `${os} · ${browser}` : browser;
};

  const showToast = (message) => {
    setToast({ show: true, message });
    window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  };

  const [savingPassword, setSavingPassword] = useState(false);

  const handleSavePassword = async () => {
    if (!currentPw) return showToast("請輸入目前密碼");
    if (newPw.length < 8) return showToast("新密碼需至少 8 位");
    if (newPw !== confirmPw) return showToast("兩次輸入的密碼不相符");

    const userId = localStorage.getItem("userId");
    setSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/changePassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          current_password: currentPw,
          new_password: newPw,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPwOpen(false);
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
        setPasswordUpdatedAt(new Date().toISOString());
        showToast("✓ 密碼已成功更新");
      } else {
        showToast(data.err || "密碼更新失敗");
      }
    } catch (err) {
      showToast("網路錯誤，請稍後再試");
    } finally {
      setSavingPassword(false);
    }
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
          <div className="mt-1 text-sm font-medium text-gray-400">
            {passwordUpdatedAt
              ? `上次更新於 ${new Date(passwordUpdatedAt).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}`
              : "尚未更新過密碼"}
          </div>
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
        {loadingSessions ? (
          <div className="p-8 text-center text-sm font-bold text-gray-400">載入中...</div>
        ) : (
          <>
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
                        最近一次登入
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm font-medium text-gray-400">{s.date}</div>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="p-8 text-center text-sm font-bold text-gray-400">目前沒有可顯示的登入記錄。</div>
            )}
          </>
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
              disabled={savingPassword}
              className="flex-1 rounded-full bg-slate-800 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
            >
              {savingPassword ? "儲存中..." : "確認儲存"}
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