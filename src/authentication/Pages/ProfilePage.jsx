import React, { useMemo, useState } from "react";

function ArrowRightIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Toast({ show, message }) {
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

function Field({ label, value, onChange, disabled, type = "text", placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] uppercase tracking-[0.09em] text-[#8C8880]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={[
          "w-full rounded-xl border border-transparent bg-[#F5F5F5] px-4 py-3 text-sm text-slate-900 outline-none transition-all",
          disabled ? "opacity-70" : "focus:border-slate-900 focus:bg-white",
        ].join(" ")}
      />
    </div>
  );
}

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  const [form, setForm] = useState({
    displayName: "",
    realName: "",
    phone: "",
    email: "",
    address: "",
  });

  const showToast = (message) => {
    setToast({ show: true, message });
    window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  };

  const title = useMemo(() => "個人資訊", []);

  const toggleEdit = () => setEditing((v) => !v);

  const handleUpdate = () => {
    showToast("✓ 資料已更新");
    if (editing) setEditing(false);
  };

  const clearAll = () => {
    setForm({ displayName: "", realName: "", phone: "", email: "", address: "" });
    showToast("已清空所有欄位");
  };

  const applyKOC = () => {
    showToast("✓ 已送出 KOC 申請，請等待審核");
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* header */}
        <div className="mb-9 flex items-center justify-between gap-6">
          <h1 className="font-serif text-4xl">{title}</h1>

          <button
            type="button"
            onClick={toggleEdit}
            className={[
              "rounded-full border px-5 py-2 text-[13px] transition-all",
              editing
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-[#E2DDD4] bg-white text-slate-900 hover:border-slate-900 hover:bg-[#F5F0E8]",
            ].join(" ")}
          >
            {editing ? "取消" : "修改"}
          </button>
        </div>

        <p className="mb-5 text-sm font-bold tracking-wide">帳戶資料</p>

        {/* form card */}
        <div className="rounded-2xl border border-[#E2DDD4] bg-white p-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="顯示名稱"
              value={form.displayName}
              onChange={(v) => setForm((f) => ({ ...f, displayName: v }))}
              disabled={!editing}
              placeholder="顯示名稱"
            />
            <Field
              label="真實姓名"
              value={form.realName}
              onChange={(v) => setForm((f) => ({ ...f, realName: v }))}
              disabled={!editing}
              placeholder="真實姓名"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="手機號碼"
              type="tel"
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              disabled={!editing}
              placeholder="手機號碼"
            />
            <Field
              label="電子郵件"
              type="email"
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              disabled={!editing}
              placeholder="電子郵件"
            />
          </div>

          <div className="mt-4">
            <Field
              label="通訊地址"
              value={form.address}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
              disabled={!editing}
              placeholder="地址"
            />
          </div>

          <div className="my-7 h-px bg-[#E2DDD4]" />

          {/* KOC apply */}
          <button
            type="button"
            onClick={applyKOC}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-7 py-3 text-[15px] text-white transition-all hover:-translate-y-0.5 hover:bg-[#C8522A]"
          >
            申請成為KOC <ArrowRightIcon />
          </button>

          <div className="my-7 h-px bg-[#E2DDD4]" />

          {/* bottom actions */}
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={handleUpdate}
              className="rounded-full bg-slate-900 px-7 py-3 text-[15px] text-white transition-all hover:-translate-y-0.5 hover:bg-[#C8522A]"
            >
              更新
            </button>

            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-2 text-sm text-[#8C8880] transition-colors hover:text-[#C8522A]"
            >
              <XIcon />
              全部清空
            </button>
          </div>
        </div>
      </div>

      <Toast show={toast.show} message={toast.message} />
    </div>
  );
}