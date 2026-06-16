import React, { useState } from "react";
import { X } from "lucide-react";

// 自訂的輸入框元件 (套用高級品牌色與明確框線)
function Field({ label, value, onChange, disabled, type = "text", placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold tracking-wider text-[#8C8880] uppercase">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full rounded-2xl border px-5 py-3.5 text-sm outline-none transition-all ${
          disabled 
            ? "bg-[#F5F0E8] border-[#E2DDD4] text-[#8C8880] cursor-not-allowed opacity-80" 
            : "bg-white border-[#E2DDD4] text-[#1A1A18] focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 shadow-sm"
        }`}
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
    <div className="animate-in fade-in duration-500 max-w-4xl">
      
      {/* 標題與編輯按鈕 */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-[28px] font-serif font-bold text-[#1A1A18]">個人資訊</h2>
        <button
          onClick={() => setEditing(!editing)}
          className={`rounded-full px-8 py-3 text-sm font-bold transition-all shadow-sm ${
            editing
              ? "bg-[#C8522A] text-white"
              : "bg-white border border-[#E2DDD4] text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F5F0E8]"
          }`}
        >
          {editing ? "取消編輯" : "編輯資料"}
        </button>
      </div>

      {/* 🟢 加入白色底層卡片，讓表單更有包覆感與結構性 */}
      <div className="bg-white rounded-[2.5rem] p-10 border border-[#E2DDD4] shadow-sm">
        
        {/* =========================================
            帳戶資料區塊
        ========================================== */}
        <h3 className="mb-8 text-lg font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block"></span>
          帳戶資料
        </h3>
        
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
            placeholder="請輸入完整地址"
          />
        </div>

        <div className="my-10 h-px w-full bg-[#E2DDD4]" />

        {/* =========================================
            銀行帳戶區塊
        ========================================== */}
        <h3 className="mb-8 text-lg font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#1A1A18] rounded-full inline-block"></span>
          銀行帳戶
        </h3>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-8">
          {/* 銀行選擇下拉選單 */}
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-[#8C8880] uppercase">
              銀行帳戶
            </label>
            <select
              value={form.bankCode}
              onChange={(e) => setForm({ ...form, bankCode: e.target.value })}
              disabled={!editing}
              className={`w-full rounded-2xl border px-5 py-3.5 text-sm outline-none transition-all appearance-none ${
                !editing 
                  ? "bg-[#F5F0E8] border-[#E2DDD4] text-[#8C8880] cursor-not-allowed opacity-80" 
                  : "bg-white border-[#E2DDD4] text-[#1A1A18] focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 shadow-sm"
              }`}
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
            底部操作按鈕
        ========================================== */}
        {editing && (
          <div className="flex items-center justify-end gap-6 pt-6 mt-6 border-t border-[#E2DDD4]/50 animate-in slide-in-from-bottom-2 duration-300">
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-2 text-sm font-bold text-[#8C8880] transition-colors hover:text-[#C8522A]"
            >
              <X size={16} strokeWidth={3} />
              全部清空
            </button>
            
            <button
              onClick={handleUpdate}
              className="rounded-full bg-[#1A1A18] px-10 py-3.5 text-sm font-bold text-[#F5F0E8] transition-all hover:bg-[#C8522A] active:scale-95 shadow-md"
            >
              確認更新
            </button>
          </div>
        )}
      </div>

      {/* 🟢 彈出提示 (Toast) */}
      <div
        className={`fixed bottom-10 left-1/2 z-[999] -translate-x-1/2 rounded-full bg-[#1A1A18] px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 shadow-xl border border-[#E2DDD4]/20 ${
          toast.show ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}