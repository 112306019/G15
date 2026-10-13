import React, { useState, useEffect, useCallback } from "react";
import { Lock, LogOut } from "lucide-react";
import { API_BASE_URL } from "../config";
import { formatApiError } from "../errorMessage";

const ROLE_LABELS = {
  super_admin: "超級管理員",
  finance: "財務管理",
  reviewer: "審核員",
};

function parseUserAgent(ua) {
  if (!ua) return "未知裝置";
  let browser = "瀏覽器";
  let os = "";

  if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";

  if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Windows")) os = "Windows";

  return os ? `${os} / ${browser}` : browser;
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Modal({ open, title, onClose, children }) {
  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-[#1A1A18]/40 backdrop-blur-sm p-4 transition-opacity duration-200 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-hidden={!open}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 md:p-8 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="text-xl font-serif font-bold text-[#1A1A18] mb-6">{title}</div>
        {children}
      </div>
    </div>
  );
}

function PwInput({ label, ...props }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-[#5C5850]">{label}</label>
      <input
        type="password"
        {...props}
        className="w-full rounded-xl border border-[#E2DDD4] bg-white px-4 py-3 text-sm text-[#1A1A18] outline-none transition-colors focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10"
      />
    </div>
  );
}

export default function AdminSecurity({ onLogout }) {
  const adminId = localStorage.getItem("admin_id");

  const [info, setInfo] = useState(null);
  const [infoError, setInfoError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState("");

  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  const showToast = (message) => {
    setToast({ show: true, message });
    window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  };

  const loadInfo = useCallback(async () => {
    if (!adminId) {
      setInfoError("找不到管理員身分，請重新登入");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/platform/security/info?admin_id=${encodeURIComponent(adminId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setInfoError(formatApiError(data.err) || "帳號資訊載入失敗");
        return;
      }
      setInfo(data);
    } catch (err) {
      console.error("帳號資訊載入失敗", err);
      setInfoError("連線失敗，帳號資訊無法載入");
    }
  }, [adminId]);

  const loadSessions = useCallback(async () => {
    if (!adminId) {
      setLoadingSessions(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/platform/security/loginHistory?admin_id=${encodeURIComponent(adminId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setSessionsError(formatApiError(data.err) || "登入紀錄載入失敗");
        return;
      }
      setSessions(
        data.logs.map((log, index) => ({
          id: log.log_id,
          name: parseUserAgent(log.user_agent),
          ip: log.ip_address,
          latest: index === 0,
          date: formatDateTime(log.login_at),
        }))
      );
    } catch (err) {
      console.error("登入紀錄載入失敗", err);
      setSessionsError("連線失敗，登入紀錄無法載入");
    } finally {
      setLoadingSessions(false);
    }
  }, [adminId]);

  useEffect(() => {
    loadInfo();
    loadSessions();
  }, [loadInfo, loadSessions]);

  const closePwModal = () => {
    setPwOpen(false);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setPwError("");
  };

  const handleSavePassword = async () => {
    setPwError("");
    if (!adminId) return setPwError("找不到管理員身分，請重新登入");
    if (!currentPw) return setPwError("請輸入目前密碼");
    if (newPw.length < 8) return setPwError("新密碼需至少 8 位");
    if (newPw !== confirmPw) return setPwError("兩次輸入的新密碼不相符");
    if (newPw === currentPw) return setPwError("新密碼不可與目前密碼相同");

    setSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/platform/security/changePassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_id: adminId,
          current_password: currentPw,
          new_password: newPw,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setPwError(formatApiError(data.err) || "密碼更新失敗");
        return;
      }
      closePwModal();
      setInfo((prev) => (prev ? { ...prev, password_updated_at: new Date().toISOString() } : prev));
      showToast("密碼已更新");
    } catch (err) {
      setPwError("連線失敗，請稍後再試");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    // 沒接 onLogout 時的保底：清掉管理員登入狀態並回登入頁
    ["admin_token", "admin_email", "admin_id", "admin_role"].forEach((k) => localStorage.removeItem(k));
    window.location.href = "/admin-login";
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-0 pb-12 text-[#1A1A18]">
      <h2 className="text-2xl md:text-[28px] font-serif font-bold mb-2">登入與安全性</h2>
      {info && (
        <p className="text-sm text-[#8C8880] mb-8 md:mb-10">
          {info.name || info.email}（{ROLE_LABELS[info.role] || info.role}）・{info.email}
        </p>
      )}
      {infoError && (
        <div className="mb-8 text-sm font-bold text-[#C8522A] bg-[#FDF0ED] border border-[#C8522A]/20 rounded-xl px-4 py-3">
          {infoError}
        </div>
      )}

      {/* 密碼 */}
      <section className="mb-10">
        <h3 className="mb-4 text-base md:text-lg font-bold flex items-center gap-2">
          <Lock size={18} className="text-[#8C8880]" />
          密碼
        </h3>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-[#E2DDD4] bg-white p-5 md:p-6">
          <div>
            <div className="text-sm md:text-base font-bold">管理員登入密碼</div>
            <div className="mt-1 text-xs md:text-sm text-[#8C8880]">
              {info?.password_updated_at
                ? `上次更新於 ${new Date(info.password_updated_at).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}`
                : "尚無更新紀錄"}
            </div>
          </div>
          <button
            onClick={() => setPwOpen(true)}
            className="w-full md:w-auto rounded-xl bg-[#1A1A18] px-6 py-2.5 text-sm font-bold text-[#F5F0E8] transition-colors hover:bg-[#C8522A] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C8522A]/30"
          >
            變更密碼
          </button>
        </div>
      </section>

      {/* 登入紀錄 */}
      <section className="mb-10">
        <h3 className="mb-1 text-base md:text-lg font-bold">最近登入紀錄</h3>
        <p className="mb-4 text-xs md:text-sm text-[#8C8880]">
          顯示最近 5 次登入。若有不是您本人的紀錄，請立即變更密碼並通知其他管理員。
        </p>
        <div className="rounded-2xl border border-[#E2DDD4] bg-white overflow-hidden">
          {loadingSessions ? (
            <div className="p-6 text-center text-sm font-bold text-[#8C8880]">載入中...</div>
          ) : sessionsError ? (
            <div className="p-6 text-center text-sm font-bold text-[#C8522A]">{sessionsError}</div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center text-sm font-bold text-[#8C8880]">
              還沒有登入紀錄，下次登入後就會出現在這裡。
            </div>
          ) : (
            sessions.map((s, index) => (
              <div
                key={s.id}
                className={`flex items-center justify-between gap-4 p-5 ${
                  index !== sessions.length - 1 ? "border-b border-[#EFEBE4]" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-sm md:text-base font-bold">
                    {s.name}
                    {s.latest && (
                      <span className="rounded-md bg-[#EEF4EC] px-2 py-0.5 text-[11px] font-bold text-[#3F6B3A]">
                        最近一次
                      </span>
                    )}
                  </div>
                  <div className="text-xs md:text-sm text-[#8C8880]">{s.date}</div>
                </div>
                {s.ip && <div className="shrink-0 text-xs md:text-sm text-[#8C8880] tabular-nums">{s.ip}</div>}
              </div>
            ))
          )}
        </div>
      </section>

      {/* 登出 */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-[#C8522A]/20 bg-[#FDF0ED] p-5 md:p-6">
          <div>
            <div className="text-sm md:text-base font-bold text-[#A8401E]">登出管理後台</div>
            <div className="mt-1 text-xs md:text-sm text-[#A8401E]/70">登出後需要重新輸入信箱與密碼才能進入。</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-white border border-[#C8522A]/30 px-6 py-2.5 text-sm font-bold text-[#A8401E] transition-colors hover:bg-[#C8522A] hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C8522A]/30"
          >
            <LogOut size={16} /> 登出
          </button>
        </div>
      </section>

      <Modal open={pwOpen} title="變更密碼" onClose={closePwModal}>
        <div className="space-y-4">
          <PwInput
            label="目前密碼"
            placeholder="輸入目前密碼"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            autoComplete="current-password"
          />
          <PwInput
            label="新密碼"
            placeholder="至少 8 個字元"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
          />
          <PwInput
            label="確認新密碼"
            placeholder="再次輸入新密碼"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            autoComplete="new-password"
          />

          {pwError && (
            <div className="text-sm font-bold text-[#C8522A] bg-[#FDF0ED] border border-[#C8522A]/20 rounded-xl px-4 py-3">
              {pwError}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={closePwModal}
              className="w-full sm:flex-1 rounded-xl border border-[#E2DDD4] bg-white px-4 py-3 text-sm font-bold text-[#5C5850] transition-colors hover:border-[#1A1A18] hover:text-[#1A1A18] order-2 sm:order-1"
            >
              取消
            </button>
            <button
              onClick={handleSavePassword}
              disabled={savingPassword}
              className="w-full sm:flex-1 rounded-xl bg-[#1A1A18] px-4 py-3 text-sm font-bold text-[#F5F0E8] transition-colors hover:bg-[#C8522A] disabled:opacity-50 order-1 sm:order-2"
            >
              {savingPassword ? "變更中..." : "變更密碼"}
            </button>
          </div>
        </div>
      </Modal>

      <div
        role="status"
        className={`fixed bottom-8 left-1/2 z-[999] -translate-x-1/2 rounded-full bg-[#1A1A18] px-6 py-3 text-sm font-bold text-[#F5F0E8] shadow-xl transition-all duration-300 ${
          toast.show ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}