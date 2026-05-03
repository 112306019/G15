import React, { useState } from "react";
import { X } from "lucide-react";

// 自訂的輸入框元件
function Field({ label, value, onChange, disabled, type = "text", placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={[
          "w-full rounded-2xl border px-5 py-3.5 text-sm text-slate-800 outline-none transition-all",
          disabled 
            ? "bg-gray-50 border-transparent text-gray-500" 
            : "bg-white border-gray-200 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 shadow-sm",
        ].join(" ")}
      />
    </div>
  );
}

export default function ProfileInfo() {
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  const [form, setForm] = useState({
    displayName: "",
    realName: "",
    phone: "",
    email: "",
    address: "",
    bankCode: "",
    bankAccount: "",
  });

  const showToast = (message) => {
    setToast({ show: true, message });
    window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  };

  const handleUpdate = () => {
    showToast("✓ 資料已更新");
    setEditing(false);
  };

  const clearAll = () => {
    setForm({ displayName: "", realName: "", phone: "", email: "", address: "", bankCode: "", bankAccount: "" });
    showToast("已清空所有欄位");
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-3xl">
      
      {/* 標題與編輯按鈕 */}
      <div className="mb-10 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800">個人資訊</h2>
        <button
          onClick={() => setEditing(!editing)}
          className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
            editing
              ? "bg-black text-white shadow-md"
              : "bg-gray-100 text-slate-600 hover:bg-gray-200"
          }`}
        >
          {editing ? "取消編輯" : "編輯"}
        </button>
      </div>

      {/* =========================================
          帳戶資料區塊 (對應 PDF 第 2 頁) [cite: 669-677]
      ========================================== */}
      <h3 className="mb-6 text-lg font-bold text-slate-700">帳戶資料</h3>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-6">
        <Field
          label="顯示名稱"
          value={form.displayName}
          onChange={(v) => setForm({ ...form, displayName: v })}
          disabled={!editing}
          placeholder="顯示名稱"
        />
        <Field
          label="真實姓名"
          value={form.realName}
          onChange={(v) => setForm({ ...form, realName: v })}
          disabled={!editing}
          placeholder="真實姓名"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-6">
        <Field
          label="手機號碼"
          type="tel"
          value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })}
          disabled={!editing}
          placeholder="手機號碼"
        />
        <Field
          label="電子郵件"
          type="email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          disabled={!editing}
          placeholder="電子郵件"
        />
      </div>

      <div className="mb-10">
        <Field
          label="通訊地址"
          value={form.address}
          onChange={(v) => setForm({ ...form, address: v })}
          disabled={!editing}
          placeholder="地址"
        />
      </div>

      <div className="my-10 h-px w-full bg-gray-100" />

      {/* =========================================
          銀行帳戶區塊 (對應 PDF 第 2 頁) [cite: 678-683]
      ========================================== */}
      <h3 className="mb-6 text-lg font-bold text-slate-700">銀行帳戶</h3>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-12">
        {/* 銀行選擇下拉選單 */}
        <div>
          <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">銀行帳戶</label>
          <select
            value={form.bankCode}
            onChange={(e) => setForm({ ...form, bankCode: e.target.value })}
            disabled={!editing}
            className={[
              "w-full rounded-2xl border px-5 py-3.5 text-sm outline-none transition-all appearance-none",
              !editing 
                ? "bg-gray-50 border-transparent text-gray-500" 
                : "bg-white border-gray-200 text-slate-800 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 shadow-sm",
            ].join(" ")}
          >
            <option value="" disabled>選擇銀行帳戶</option>
            <option value="822">中國信託 (822)</option>
            <option value="013">國泰世華 (013)</option>
            <option value="012">台北富邦 (012)</option>
          </select>
        </div>

        <Field
          label="銀行帳戶號碼"
          value={form.bankAccount}
          onChange={(v) => setForm({ ...form, bankAccount: v })}
          disabled={!editing}
          placeholder="銀行帳戶號碼"
        />
      </div>

      {/* =========================================
          底部操作按鈕 [cite: 681, 682]
      ========================================== */}
      {editing && (
        <div className="flex items-center gap-6 animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={handleUpdate}
            className="rounded-full bg-black px-10 py-3.5 text-sm font-bold text-white transition-all hover:bg-gray-800 active:scale-95 shadow-lg"
          >
            確認更新
          </button>

          <button
            onClick={clearAll}
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition-colors hover:text-red-500"
          >
            <X size={16} strokeWidth={3} />
            全部清空
          </button>
        </div>
      )}

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