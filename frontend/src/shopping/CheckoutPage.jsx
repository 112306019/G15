import { API_BASE_URL } from '../config';
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

function formatNTD(amount) {
  const value = Number(amount);
  return `NT$${Number.isFinite(value) ? Math.round(value).toLocaleString("zh-TW") : "0"}`;
}

export default function CheckoutPage({
  onPaid,
  onBack,
  onGoToLogin,
  cartItems = [],
  initialSummary = {
    items: "NT$20 × 2",
    itemsAmount: 40,
    shippingAmount: 0,
    couponDiscount: 0,
    pointsDiscount: 0,
    currency: "TWD",
    total: 68.94,
  },
}) {
  const userId = localStorage.getItem("userId");
  const isLoggedIn = Boolean(userId);

  const [method, setMethod] = useState("card");

  const [cardNum, setCardNum] = useState("999999999999");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [saveInfo, setSaveInfo] = useState(true);

  const [submitState, setSubmitState] = useState("idle");
  const [payError, setPayError] = useState("");

  const [recipient, setRecipient] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  // 優惠碼：一張訂單只能套用一組優惠碼(對應後端 Order.promotion_code 是單一欄位)，
  // 折扣規則要看 appliedCoupon.productDiscounts 裡每個商品各自的 discount_type/discount_value
  // (來自 CampaignProduct)，不是優惠碼本身的欄位。
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // {code, couponId, campaignName, productDiscounts, matchedItemNames}
  const [couponMsg, setCouponMsg] = useState({ text: "", ok: false, show: false });
  const [couponLoading, setCouponLoading] = useState(false);

  const normalizedCartItems = useMemo(() => {
    return (cartItems || []).map((item) => ({
      ...item,
      productId:
        item.productId ??
        item.Product_id ??
        item.product_id ??
        item.id,
      name:
        item.name ??
        item.Product_name ??
        item.product_name ??
        "未命名商品",
      price: Number(
        item.price ??
        item.unit_price ??
        item.Unit_price ??
        0
      ),
      qty: Number(
        item.qty ??
        item.quantity ??
        item.Quantity ??
        1
      ),
    }));
  }, [cartItems]);

  // 跟後端 create_order 算法一致：整張商品小計(單價 x 數量)套用該商品自己的折扣規則，
  // 不是先折扣單價再乘數量
  const getItemDiscountedSubtotal = (item) => {
    const baseSubtotal = item.price * item.qty;
    const rule = appliedCoupon?.productDiscounts.find((pd) => pd.product_id === item.productId);
    if (!rule) return baseSubtotal;

    if (rule.discount_type === 'percentage') {
      return Math.max(0, baseSubtotal * (1 - rule.discount_value / 100));
    }
    return Math.max(0, baseSubtotal - rule.discount_value);
  };

  const rawItemsTotal = normalizedCartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemsTotal = normalizedCartItems.reduce((sum, item) => sum + getItemDiscountedSubtotal(item), 0);
  const couponDiscount = rawItemsTotal - itemsTotal;
  const grandTotal = itemsTotal + initialSummary.shippingAmount;

  const cardNumDigits = useMemo(() => digitsOnly(cardNum), [cardNum]);
  const expiryDigits = useMemo(() => digitsOnly(expiry), [expiry]);

  const cardNumValid = method === "card" ? cardNumDigits.length >= 16 : true;
  const cardNameValid = method === "card" ? cardName.trim().length >= 3 : true;
  const expiryValid = method === "card" ? expiryDigits.length >= 4 : true;
  const cvcValid = method === "card" ? cvc.trim().length >= 3 : true;

  const shippingValid = recipient.trim().length > 0 && recipientPhone.trim().length > 0 && recipientAddress.trim().length > 0;
  const canPay = isLoggedIn && shippingValid && (method !== "card" ? true : cardNumValid && cardNameValid && expiryValid && cvcValid);

  const inputBase =
    "w-full rounded-[10px] border-[1.5px] px-4 py-[13px] pr-11 outline-none transition-colors tracking-[0.05em] font-mono text-[14px]";
  const inputNormal = "bg-white border-[#E2DDD4] focus:border-[#1A1A18]";
  const inputValid = "bg-white border-[#6BBF6B]";
  const inputClass = (valid) => `${inputBase} ${valid ? inputValid : inputNormal}`;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (appliedCoupon) {
      setCouponMsg({ text: "請先移除目前的優惠碼再套用新的", ok: false, show: true });
      return;
    }
    setCouponLoading(true);
    setCouponMsg({ text: "", ok: false, show: false });

    try {
      const res = await fetch(`${API_BASE_URL}/api/consumer/coupon/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Promotion_code: couponCode.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        // 找出購物車裡符合這個優惠碼的商品
        const matchedItems = normalizedCartItems.filter(item =>
          data.applicable_product_ids.includes(item.productId)
        );

        if (matchedItems.length === 0) {
          setCouponMsg({ text: "此優惠碼不適用於購物車中的商品", ok: false, show: true });
          setCouponLoading(false);
          return;
        }

        setAppliedCoupon({
          code: data.Promotion_code,
          couponId: data.Coupon_id,
          campaignName: data.Campaign_name,
          productDiscounts: data.product_discounts,
          matchedItemNames: matchedItems.map(i => i.name),
        });
        setCouponCode("");
        setCouponMsg({ text: `✓ 已套用於：${matchedItems.map(i => i.name).join("、")}`, ok: true, show: true });
      } else {
        setCouponMsg({ text: data.err || "優惠碼無效或已過期", ok: false, show: true });
      }
    } catch (err) {
      setCouponMsg({ text: "驗證失敗，請稍後再試", ok: false, show: true });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponMsg({ text: "", ok: false, show: false });
  };

  const handlePay = async () => {
    if (!canPay) return;

    if (!isLoggedIn) {
      onGoToLogin?.();
      return;
    }

    setSubmitState("loading");
    setPayError("");

    const token = localStorage.getItem("token");

    // cartItems 來自 CartPage.jsx 的 items 狀態，欄位是 { id, cartItemId, productId, price, qty }
    const orderItems = normalizedCartItems.map((item) => ({
      Product_id: item.productId ?? item.Product_id ?? item.product_id ?? item.id,
      Quantity: item.qty ?? item.quantity ?? item.Quantity ?? 1,
    }));

    try {
      const orderRes = await fetch(`${API_BASE_URL}/api/consumer/order/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          User_id: userId,
          total_amount: grandTotal,
          Promotion_code: appliedCoupon ? appliedCoupon.code : null,
          recipient: recipient,
          recipient_phone: recipientPhone,
          recipient_address: recipientAddress,
          items: orderItems,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.err || "建立訂單失敗");
      const orderId = orderData.Order_id || orderData.orderId;

      const txRes = await fetch(`${API_BASE_URL}/api/consumer/transaction/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet_type: "koc",
          Wallets_id: 1,
          Type: "pay",
          Amount: Math.round(grandTotal),
          Reference_type: "order",
          Reference_id: orderId,
        }),
      });
      const txData = await txRes.json().catch(() => ({}));
      // 不管交易是否成功都繼續（不擋結帳流程）

      await fetch(`${API_BASE_URL}/api/consumer/payment/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Order_id: orderId,
          payment_method: method,
          payment_status: "paid",
          transaction_id: txData.Transaction_ID,
        }),
      });

      await fetch(`${API_BASE_URL}/api/consumer/payments/result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Order_id: orderId,
          payment_status: "paid",
        }),
      });

      for (const item of normalizedCartItems) {
        const cartItemId = item.cartItemId ?? item.id;
        if (!cartItemId || item.buyNow) continue;

        await fetch(`${API_BASE_URL}/api/consumer/cart/item/delete`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Cart_item_id: cartItemId }),
        }).catch(() => { });
      }

      setSubmitState("success");
      setTimeout(() => {
        setSubmitState("idle");
        onPaid?.({ orderId });
      }, 2000);
    } catch (err) {
      setSubmitState("error");
      setPayError(err.message || "付款失敗，請再試一次");
      setTimeout(() => setSubmitState("idle"), 3000);
    }
  };

  const badgeText = METHODS.find((m) => m.key === method)?.label ?? "信用卡";

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18] font-serif">
      <div className="mx-auto max-w-[1000px] px-6 pb-20 pt-12 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 lg:gap-14 items-start">
        {/* LEFT */}
        <div>
          <button
            type="button"
            onClick={() => onBack?.()}
            className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#1A1A18] transition-colors font-bold text-sm group w-fit"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <path d="M12 5l-7 7 7 7" />
            </svg>
            返回購物車
          </button>
          <h1 className="font-['DM_Serif_Display'] text-[40px] leading-none mb-7">結帳</h1>

          {!isLoggedIn && (
            <div className="mb-7 flex items-center justify-between gap-4 rounded-[14px] border-[1.5px] border-[#C8522A] bg-[#FBEAE3] px-5 py-4">
              <span className="text-[14px] text-[#1A1A18]">需要登入會員才能結帳，目前不提供訪客結帳。</span>
              <button
                type="button"
                onClick={() => onGoToLogin?.()}
                className="whitespace-nowrap rounded-full bg-[#1A1A18] px-5 py-2 text-[13px] font-bold text-[#F5F0E8] transition-colors hover:bg-[#C8522A]"
              >
                前往登入
              </button>
            </div>
          )}

          <div className="h-px bg-[#E2DDD4] mb-7" />

          <div className="mb-7">
            <div className="text-[18px] font-bold mb-5">配送資訊</div>
            <div className="mb-4">
              <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">收件人姓名</label>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="請輸入收件人姓名"
                className={`w-full rounded-[10px] border-[1.5px] px-4 py-[13px] text-sm outline-none transition-colors ${recipient.trim() ? "border-[#6BBF6B] bg-white" : "border-[#E2DDD4] bg-slate-100 focus:border-[#1A1A18] focus:bg-white"}`}
              />
            </div>
            <div className="mb-4">
              <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">收件人電話</label>
              <input
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="請輸入收件人電話"
                className={`w-full rounded-[10px] border-[1.5px] px-4 py-[13px] text-sm outline-none transition-colors ${recipientPhone.trim() ? "border-[#6BBF6B] bg-white" : "border-[#E2DDD4] bg-slate-100 focus:border-[#1A1A18] focus:bg-white"}`}
              />
            </div>
            <div className="mb-4">
              <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">配送地址</label>
              <input
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="請輸入配送地址"
                className={`w-full rounded-[10px] border-[1.5px] px-4 py-[13px] text-sm outline-none transition-colors ${recipientAddress.trim() ? "border-[#6BBF6B] bg-white" : "border-[#E2DDD4] bg-slate-100 focus:border-[#1A1A18] focus:bg-white"}`}
              />
            </div>
          </div>
          <div className="h-px bg-[#E2DDD4] mb-7" />

          <div className="flex items-center justify-between mb-5">
            <div className="text-[18px] font-bold">支付方式</div>
            <span className="rounded-full bg-[#1A1A18] px-3.5 py-1 text-[12px] tracking-[0.06em] text-[#F5F0E8] font-mono">
              {badgeText}
            </span>
          </div>

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

          <div className={`${method === "card" ? "" : "opacity-50 pointer-events-none select-none"}`}>
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

            <div className="mb-5">
              <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">持卡人姓名</label>
              <div className="relative">
                <input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="CARDHOLDER NAME"
                  className={`${inputClass(cardNameValid)} font-serif tracking-[0.02em]`}
                />
                {cardNameValid && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6BBF6B]">
                    <CheckIcon className="h-[18px] w-[18px]" />
                  </span>
                )}
              </div>
            </div>

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

            <button
              type="button"
              onClick={() => setSaveInfo((v) => !v)}
              className="mb-7 inline-flex items-center gap-3"
            >
              <span className={`h-5 w-5 rounded-[5px] border-[1.5px] flex items-center justify-center transition-colors ${saveInfo ? "bg-[#1A1A18] border-[#1A1A18]" : "bg-white border-[#E2DDD4]"}`}>
                {saveInfo && <CheckIcon className="h-3 w-3 text-white" />}
              </span>
              <span className="text-[14px]">儲存資訊</span>
            </button>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handlePay}
            disabled={!canPay || submitState === "success" || submitState === "loading"}
            className={`inline-flex items-center gap-2 rounded-full px-9 py-[15px] text-[16px] tracking-[0.05em] transition-all
              ${(!canPay || submitState === "success" || submitState === "loading") ? "opacity-80" : "hover:-translate-y-[1px]"}
              ${submitState === "success" ? "bg-[#6BBF6B] text-[#F5F0E8]"
                : submitState === "error" ? "bg-[#C8522A] text-[#F5F0E8]"
                  : "bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A]"}`}
          >
            {submitState === "success" ? (
              <><CheckIcon className="h-[18px] w-[18px]" />付款成功！</>
            ) : submitState === "loading" ? (
              <>處理中...</>
            ) : submitState === "error" ? (
              <>{payError || "付款失敗，請再試一次"}</>
            ) : (
              <>確認並支付<ArrowRightIcon className="h-[18px] w-[18px]" /></>
            )}
          </button>

          {!isLoggedIn ? (
            <p className="mt-3 text-[12px] text-[#C8522A] font-bold">
              請先登入會員才能結帳。
            </p>
          ) : !canPay && method === "card" && (
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
              {normalizedCartItems.map((item, idx) => {
                const baseSubtotal = item.price * item.qty;
                const discountedSubtotal = getItemDiscountedSubtotal(item);
                const hasDiscount = discountedSubtotal < baseSubtotal;
                return (
                  <div key={idx} className="flex items-center justify-between py-2.5">
                    <span>{item.name} × {item.qty}</span>
                    <span className="font-mono text-[#1A1A18]">
                      {hasDiscount && (
                        <span className="line-through text-[#8C8880] mr-2">
                          {formatNTD(baseSubtotal)}
                        </span>
                      )}
                      {formatNTD(discountedSubtotal)}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between border-b border-t border-[#E2DDD4] py-2.5">
                <span>運費</span>
                <span className="font-mono text-[#1A1A18]">{formatNTD(initialSummary.shippingAmount)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span>優惠碼折扣</span>
                <span className={`font-mono ${couponDiscount > 0 ? "text-[#6BBF6B]" : "text-[#8C8880]"}`}>
                  {couponDiscount > 0 ? `−${formatNTD(couponDiscount)}` : "NT$0"}
                </span>
              </div>
            </div>

            {/* 優惠碼輸入區 */}
            <div className="mt-4 border-t border-[#E2DDD4] pt-4">
              <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                輸入優惠碼
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-[10px] border border-[#6BBF6B] bg-[#F0FBF0] px-4 py-2.5">
                  <div>
                    <div className="font-mono text-[13px] font-bold text-[#6BBF6B]">{appliedCoupon.code}</div>
                    <div className="text-[11px] text-[#8C8880]">適用於：{appliedCoupon.matchedItemNames.join("、")}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-[11px] text-[#8C8880] underline hover:text-[#C8522A]"
                  >
                    移除
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="輸入優惠碼"
                    className="flex-1 rounded-[10px] border-[1.5px] border-[#E2DDD4] bg-white px-4 py-2.5 font-mono text-[13px] outline-none focus:border-[#1A1A18] tracking-[0.08em]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="rounded-[10px] bg-[#1A1A18] px-2.5 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-[#C8522A] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {couponLoading ? "驗證中" : "套用"}
                  </button>
                </div>
              )}
              {couponMsg.show && (
                <p className={`mt-2 text-[12px] font-bold ${couponMsg.ok ? "text-[#6BBF6B]" : "text-[#C8522A]"}`}>
                  {couponMsg.text}
                </p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-[10px] bg-[#F5F0E8] px-4 py-3.5">
              <div className="text-[13px] font-bold text-[#1A1A18]">
                總付款金額{" "}
                <span className="ml-1 text-[11px] font-normal text-[#8C8880]">(TWD)</span>
              </div>
              <div className="font-mono text-[18px] font-bold text-[#1A1A18]">
                {formatNTD(grandTotal)}
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