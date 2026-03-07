import React, { useMemo, useState } from "react";

function CheckIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowRightIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      <path d="M7 10h10M7 14h6" />
    </svg>
  );
}

function CodIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const METHODS = [
  { key: "card", label: "信用卡", Icon: CardIcon },
  { key: "transfer", label: "轉帳", Icon: TransferIcon },
  { key: "cod", label: "貨到付款", Icon: CodIcon },
];

function digitsOnly(s) {
  return (s || "").replace(/\D/g, "");
}

function formatCardNumber(raw) {
  const v = digitsOnly(raw).slice(0, 16);
  return v.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw) {
  const v = digitsOnly(raw).slice(0, 4);
  if (v.length <= 2) return v;
  return `${v.slice(0, 2)} / ${v.slice(2)}`;
}

export default function CheckoutPage({
  onPaid, // () => navigate('/orders') 或 setView('orderSuccess')
  initialSummary = {
    items: "$20 x 2",
    itemsAmount: 40,
    shippingAmount: 0,
    couponDiscount: 3.4,
    pointsDiscount: 7.66,
    currency: "USD",
    total: 68.94,
  },
}) {
  const [method, setMethod] = useState("card");

  // Form states (credit card)
  const [cardNum, setCardNum] = useState("999999999999"); // 你原本有預填
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const [saveInfo, setSaveInfo] = useState(true);

  const [submitState, setSubmitState] = useState("idle"); // idle | success

  const cardNumDigits = useMemo(() => digitsOnly(cardNum), [cardNum]);
  const expiryDigits = useMemo(() => digitsOnly(expiry), [expiry]);

  const cardNumValid = method === "card" ? cardNumDigits.length >= 16 : true;
  const cardNameValid = method === "card" ? cardName.trim().length >= 3 : true;
  const expiryValid = method === "card" ? expiryDigits.length >= 4 : true;
  const cvcValid = method === "card" ? cvc.trim().length >= 3 : true;

  const canPay = method !== "card" ? true : cardNumValid && cardNameValid && expiryValid && cvcValid;

  const inputBase =
    "w-full rounded-[10px] border-[1.5px] px-4 py-[13px] pr-11 outline-none transition-colors tracking-[0.05em] font-mono text-[14px]";
  const inputNormal = "bg-white border-[#E2DDD4] focus:border-[#1A1A18]";
  const inputValid = "bg-white border-[#6BBF6B]";

  const inputClass = (valid) => `${inputBase} ${valid ? inputValid : inputNormal}`;

  const handlePay = () => {
    if (!canPay) return;
    setSubmitState("success");
    setTimeout(() => {
      setSubmitState("idle");
      onPaid?.();
    }, 2000);
  };

  const badgeText = METHODS.find((m) => m.key === method)?.label ?? "信用卡";

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18] font-serif">
      <div className="mx-auto max-w-[1000px] px-6 pb-20 pt-12 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 lg:gap-14 items-start">
        {/* LEFT */}
        <div>
          <h1 className="font-['DM_Serif_Display'] text-[40px] leading-none mb-7">結帳</h1>
          <div className="h-px bg-[#E2DDD4] mb-7" />

          {/* Section title + badge */}
          <div className="flex items-center justify-between mb-5">
            <div className="text-[18px] font-bold">支付方式</div>
            <span className="rounded-full bg-[#1A1A18] px-3.5 py-1 text-[12px] tracking-[0.06em] text-[#F5F0E8] font-mono">
              {badgeText}
            </span>
          </div>

          {/* Method tabs */}
          <div className="flex flex-wrap gap-2.5 mb-7">
            {METHODS.map(({ key, label, Icon }) => {
              const active = method === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  className={`inline-flex items-center gap-2 rounded-full border-[1.5px] px-4 py-[9px] text-[13px] transition-all
                    ${active ? "border-[#1A1A18] bg-[#F5F0E8] text-[#1A1A18]" : "border-[#E2DDD4] bg-white text-[#8C8880] hover:text-[#1A1A18]"}`}
                >
                  <Icon />
                  {label}
                </button>
              );
            })}
          </div>

          <p className="text-[12px] tracking-[0.06em] uppercase text-[#8C8880] mb-3">已儲存資訊</p>

          <button
            type="button"
            className="mb-7 inline-flex items-center gap-2 rounded-full bg-[#8C8880] px-5 py-2.5 text-[13px] text-[#F5F0E8] transition-colors hover:bg-[#1A1A18]"
          >
            <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            查看全部
          </button>

          <div className="h-px bg-[#E2DDD4] mb-7" />

          <p className="font-['DM_Serif_Display'] text-[16px] font-bold mb-6">Credit Card</p>

          {/* Credit card form (仍可顯示，但你也可以改成 method===card 才顯示) */}
          <div className={`${method === "card" ? "" : "opacity-50 pointer-events-none select-none"}`}>
            {/* Card Number */}
            <div className="mb-5">
              <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">信用卡號</label>
              <div className="relative">
                <input
                  value={formatCardNumber(cardNum)}
                  onChange={(e) => setCardNum(formatCardNumber(e.target.value))}
                  maxLength={19}
                  className={inputClass(cardNumValid)}
                />
                {cardNumValid && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6BBF6B]">
                    <CheckIcon className="h-[18px] w-[18px]" />
                  </span>
                )}
              </div>
            </div>

            {/* Cardholder */}
            <div className="mb-5">
              <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">持卡人姓名</label>
              <div className="relative">
                <input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="PHAM TRAN LAN CAM NGOC"
                  className={`${inputClass(cardNameValid)} font-serif tracking-[0.02em]`}
                />
                {cardNameValid && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6BBF6B]">
                    <CheckIcon className="h-[18px] w-[18px]" />
                  </span>
                )}
              </div>
            </div>

            {/* Expiry + CVC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">到期日</label>
                <div className="relative">
                  <input
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM / YY"
                    maxLength={7}
                    className={inputClass(expiryValid)}
                  />
                  {expiryValid && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6BBF6B]">
                      <CheckIcon className="h-[18px] w-[18px]" />
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">CVC</label>
                <div className="relative">
                  <input
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="•••"
                    maxLength={4}
                    type="password"
                    className={inputClass(cvcValid)}
                  />
                  {cvcValid && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6BBF6B]">
                      <CheckIcon className="h-[18px] w-[18px]" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Save info */}
            <button
              type="button"
              onClick={() => setSaveInfo((v) => !v)}
              className="mb-7 inline-flex items-center gap-3"
            >
              <span
                className={`h-5 w-5 rounded-[5px] border-[1.5px] flex items-center justify-center transition-colors
                  ${saveInfo ? "bg-[#1A1A18] border-[#1A1A18]" : "bg-white border-[#E2DDD4]"}`}
              >
                {saveInfo && <CheckIcon className="h-3 w-3 text-white" />}
              </span>
              <span className="text-[14px]">儲存資訊</span>
            </button>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handlePay}
            disabled={!canPay || submitState === "success"}
            className={`inline-flex items-center gap-2 rounded-full px-9 py-[15px] text-[16px] tracking-[0.05em] transition-all
              ${(!canPay || submitState === "success") ? "opacity-80" : "hover:-translate-y-[1px]"}
              ${submitState === "success" ? "bg-[#6BBF6B] text-[#F5F0E8]" : "bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A]"}`}
          >
            {submitState === "success" ? (
              <>
                <CheckIcon className="h-[18px] w-[18px]" />
                付款成功！
              </>
            ) : (
              <>
                確認並支付
                <ArrowRightIcon className="h-[18px] w-[18px]" />
              </>
            )}
          </button>

          {!canPay && method === "card" && (
            <p className="mt-3 text-[12px] text-[#8C8880]">
              請完成信用卡資訊後再付款（卡號 16 碼、姓名、到期日、CVC）。
            </p>
          )}
        </div>

        {/* RIGHT: SUMMARY */}
        <aside className="sticky top-20">
          <div className="rounded-[16px] border border-[#E2DDD4] bg-white p-7">
            <div className="relative inline-block font-['DM_Serif_Display'] text-[22px] mb-6">
              付款詳情
              <span className="absolute left-0 -bottom-1 h-[2px] w-7 rounded bg-[#B89B6A]" />
            </div>

            <div className="text-[13px] text-[#8C8880]">
              <div className="flex items-center justify-between border-b border-[#E2DDD4] py-2.5">
                <span>{initialSummary.items}</span>
                <span className="font-mono text-[#1A1A18]">${initialSummary.itemsAmount}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#E2DDD4] py-2.5">
                <span>運費</span>
                <span className="font-mono text-[#1A1A18]">${initialSummary.shippingAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#E2DDD4] py-2.5">
                <span>優惠碼折扣</span>
                <span className="font-mono text-[#6BBF6B]">−${initialSummary.couponDiscount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span>點數折抵</span>
                <span className="font-mono text-[#6BBF6B]">−${initialSummary.pointsDiscount.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-[10px] bg-[#F5F0E8] px-4 py-3.5">
              <div className="text-[13px] font-bold text-[#1A1A18]">
                總付款金額{" "}
                <span className="ml-1 text-[11px] font-normal text-[#8C8880]">({initialSummary.currency})</span>
              </div>
              <div className="font-mono text-[18px] font-bold text-[#1A1A18]">
                ${initialSummary.total.toFixed(2)}
              </div>
            </div>

            <div className="mt-5 border-t border-[#E2DDD4] pt-4 flex items-center gap-2 text-[11px] tracking-[0.05em] text-[#8C8880]">
              <span className="text-[#6BBF6B]">
                <ShieldIcon />
              </span>
              SSL 加密安全付款保障
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}