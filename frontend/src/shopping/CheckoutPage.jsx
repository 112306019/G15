import { API_BASE_URL } from '../config';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  TAIWAN_CITIES,
  getDistrictsByCity,
  getPostalCode,
} from "../taiwanAddress";

function CheckIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowRightIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      <path d="M7 10h10M7 14h6" />
    </svg>
  );
}

function CodIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[14px] w-[14px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
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

function formatNTD(amount) {
  const value = Number(amount);

  return `NT$${
    Number.isFinite(value)
      ? Math.round(value).toLocaleString("zh-TW")
      : "0"
  }`;
}

function isValidCVSReceiverName(name) {
  const value = String(name || "").trim();

  // 中文姓名：2～5 個中文字
  if (/^[\u4e00-\u9fff]{2,5}$/.test(value)) {
    return true;
  }

  // 英文姓名：4～10 個半形英文字母，可包含空白
  if (/^[A-Za-z ]{4,10}$/.test(value)) {
    return true;
  }

  return false;
}

// 綠界 AIO 金流：後端 /api/payments/create/ 回傳 {action, method, fields}，
// 這裡動態建立一個看不見的 <form>、把 fields 逐一塞成 hidden input，再自動 submit，
// 瀏覽器會離開 SPA、整頁導向綠界的刷卡頁（這不是 fetch/AJAX 能做到的，ECPay 要求真正的表單 POST）。
function submitEcpayForm({ action, method, fields }) {
  const form = document.createElement("form");
  form.method = method || "POST";
  form.action = action;
  form.style.display = "none";

  Object.entries(fields || {}).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
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

  // ============================
  // 支付方式
  // ============================
  const [method, setMethod] = useState("card");

  const [submitState, setSubmitState] = useState("idle");
  const [payError, setPayError] = useState("");

  // ============================
  // 收件資訊
  // ============================
  const [recipient, setRecipient] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  // 宅配完整地址
  const [recipientPostalCode, setRecipientPostalCode] = useState("");
  const [recipientCity, setRecipientCity] = useState("");
  const [recipientDistrict, setRecipientDistrict] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  const recipientDistrictOptions = useMemo(
    () => getDistrictsByCity(recipientCity),
    [recipientCity]
  );

  const handleRecipientCityChange = (event) => {
    const city = event.target.value;

    setRecipientCity(city);
    setRecipientDistrict("");
    setRecipientPostalCode("");
  };

  const handleRecipientDistrictChange = (event) => {
    const district = event.target.value;

    setRecipientDistrict(district);
    setRecipientPostalCode(
      getPostalCode(recipientCity, district)
    );
  };

  // ============================
  // 配送方式
  // home = 宅配
  // cvs = 超商取貨
  // ============================
  const [shippingMethod, setShippingMethod] = useState("home");

  // 綠界選店結果
  const [selectedStore, setSelectedStore] = useState(null);

  // 保存 popup
  const storeWindowRef = useRef(null);

  // ============================
  // 監聽 ECPayStoreResult.jsx
  // 寫入 localStorage 的結果
  // ============================
  useEffect(() => {
    const applyStore = (storeData) => {
      if (!storeData?.store_id) {
        return;
      }

      console.log(
        "取得綠界門市：",
        storeData
      );

      setSelectedStore(storeData);

      if (
        storeWindowRef.current &&
        !storeWindowRef.current.closed
      ) {
        try {
          storeWindowRef.current.close();
        } catch (error) {
          console.warn(
            "關閉綠界 popup 失敗：",
            error
          );
        }
      }

      storeWindowRef.current = null;
    };


    // =========================
    // localStorage 備援
    // =========================
    const readSelectedStore = () => {
      const raw = localStorage.getItem(
        "ecpaySelectedStore"
      );

      if (!raw) {
        return;
      }

      try {
        const storeData =
          JSON.parse(raw);

        applyStore(storeData);

      } catch (error) {
        console.error(
          "讀取綠界門市資料失敗：",
          error
        );
      }
    };


    // =========================
    // storage event
    // =========================
    const handleStorage = (event) => {
      if (
        event.key ===
        "ecpaySelectedStoreUpdatedAt"
      ) {
        readSelectedStore();
      }
    };


    // =========================
    // popup postMessage
    // =========================
    const handleMessage = (event) => {
      if (
        event.origin !==
        window.location.origin
      ) {
        return;
      }

      if (
        event.data?.type !==
        "ECPAY_STORE_SELECTED"
      ) {
        return;
      }

      applyStore(
        event.data.store
      );
    };


    // =========================
    // popup 關閉後重新 focus
    // 再讀一次 localStorage
    // =========================
    const handleFocus = () => {
      readSelectedStore();
    };


    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "message",
      handleMessage
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    // =========================
    // 輪詢備援
    // postMessage 可能因為綠界頁面
    // 設定 COOP 而讓 window.opener 失效，
    // storage 事件在部分瀏覽器/情境下
    // 也可能沒有即時觸發，
    // 所以只要 popup 還開著，
    // 就定期主動檢查一次 localStorage
    // =========================
    const pollTimer = setInterval(() => {
      if (
        storeWindowRef.current &&
        !storeWindowRef.current.closed
      ) {
        readSelectedStore();
      }
    }, 400);


    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "message",
        handleMessage
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );

      clearInterval(pollTimer);
    };
  }, []);

  // ============================
  // 優惠碼
  // ============================
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const [couponMsg, setCouponMsg] = useState({
    text: "",
    ok: false,
    show: false,
  });

  const [couponLoading, setCouponLoading] = useState(false);

  // ============================
  // 購物車資料整理
  // ============================
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

  // ============================
  // 商品折扣
  // ============================
  const getItemDiscountedSubtotal = (item) => {
    const baseSubtotal =
      item.price * item.qty;

    const rule =
      appliedCoupon?.productDiscounts.find(
        (pd) =>
          pd.product_id === item.productId
      );

    if (!rule) {
      return baseSubtotal;
    }

    if (rule.discount_type === "percentage") {
      return Math.max(
        0,
        baseSubtotal *
          (1 - rule.discount_value / 100)
      );
    }

    return Math.max(
      0,
      baseSubtotal - rule.discount_value
    );
  };

  const rawItemsTotal =
    normalizedCartItems.reduce(
      (sum, item) =>
        sum + item.price * item.qty,
      0
    );

  const itemsTotal =
    normalizedCartItems.reduce(
      (sum, item) =>
        sum + getItemDiscountedSubtotal(item),
      0
    );

  const couponDiscount =
    rawItemsTotal - itemsTotal;

  const grandTotal =
    itemsTotal +
    initialSummary.shippingAmount;

  // ============================
  // 配送資料驗證
  // ============================
  const phoneDigits = digitsOnly(recipientPhone);

  const recipientPhoneValid =
    phoneDigits.length === 10 &&
    phoneDigits.startsWith("09");

  const homeAddressValid =
    recipientPostalCode.trim().length >= 3 &&
    recipientCity.trim().length > 0 &&
    recipientDistrict.trim().length > 0 &&
    recipientAddress.trim().length > 0;

  const cvsReceiverNameValid =
    shippingMethod !== "cvs" ||
    isValidCVSReceiverName(recipient);

  const shippingValid =
    recipient.trim().length > 0 &&
    recipientPhoneValid &&
    cvsReceiverNameValid &&
    (
      shippingMethod === "home"
        ? homeAddressValid
        : Boolean(selectedStore?.store_id)
    );

  // 信用卡（method === "card"）走綠界 AIO：實際刷卡資訊是在綠界的頁面上輸入，
  // 這裡不再要求任何本地卡號/到期日/CVC 欄位，那些欄位從未被送到任何 API。
  const canPay = isLoggedIn && shippingValid;

  // ============================
  // 開啟綠界選店 popup
  // ============================
  const handleSelectStore = () => {
    // 清除上一筆選店資料
    localStorage.removeItem(
      "ecpaySelectedStore"
    );

    localStorage.removeItem(
      "ecpaySelectedStoreUpdatedAt"
    );

    const url =
      `${API_BASE_URL}/api/shipping/ecpay/map/`;

    

    const width = 700;
    const height = 700;

    const left =
      window.screenX +
      (window.outerWidth - width) / 2;

    const top =
      window.screenY +
      (window.outerHeight - height) / 2;

    const popup = window.open(
      url,
      "ecpayStoreMap",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      alert(
        "瀏覽器阻擋了彈出視窗，請允許彈出視窗後再試一次。"
      );
      return;
    }

    storeWindowRef.current = popup;

    try {
      popup.focus();
    } catch {
      // ignore
    }
  };

  // ============================
  // 套用優惠碼
  // ============================
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      return;
    }

    if (appliedCoupon) {
      setCouponMsg({
        text: "請先移除目前的優惠碼再套用新的",
        ok: false,
        show: true,
      });

      return;
    }

    setCouponLoading(true);

    setCouponMsg({
      text: "",
      ok: false,
      show: false,
    });

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/consumer/coupon/verify`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            Promotion_code:
              couponCode.trim(),
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        const matchedItems =
          normalizedCartItems.filter(
            (item) =>
              data.applicable_product_ids.includes(
                item.productId
              )
          );

        if (matchedItems.length === 0) {
          setCouponMsg({
            text:
              "此優惠碼不適用於購物車中的商品",
            ok: false,
            show: true,
          });

          return;
        }

        setAppliedCoupon({
          code: data.Promotion_code,
          couponId: data.Coupon_id,
          campaignName: data.Campaign_name,
          productDiscounts:
            data.product_discounts,
          matchedItemNames:
            matchedItems.map(
              (item) => item.name
            ),
        });

        setCouponCode("");

        setCouponMsg({
          text:
            `✓ 已套用於：${matchedItems
              .map((item) => item.name)
              .join("、")}`,
          ok: true,
          show: true,
        });

      } else {
        setCouponMsg({
          text:
            data.err ||
            "優惠碼無效或已過期",
          ok: false,
          show: true,
        });
      }

    } catch (err) {
      setCouponMsg({
        text:
          "驗證失敗，請稍後再試",
        ok: false,
        show: true,
      });

    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);

    setCouponMsg({
      text: "",
      ok: false,
      show: false,
    });
  };
  

  // ============================
  // 建立訂單 + 付款
  //
  // 目前先保留原流程。
  // ShipmentInfo 下一步再接。
  // ============================
  const handlePay = async () => {
    if (!canPay) {
      return;
    }

    if (!isLoggedIn) {
      onGoToLogin?.();
      return;
    }

    setSubmitState("loading");
    setPayError("");

    const token =
      localStorage.getItem("token");

    const orderItems =
      normalizedCartItems.map(
        (item) => ({
          Product_id:
            item.productId ??
            item.Product_id ??
            item.product_id ??
            item.id,

          Quantity:
            item.qty ??
            item.quantity ??
            item.Quantity ??
            1,
        })
      );

    console.log("===== 下單前物流資料 =====");
    console.log("shippingMethod:", shippingMethod);
    console.log("selectedStore:", selectedStore);
    console.log("=========================");

    try {
      // ============================
      // 建立訂單
      // ============================
      const orderRes = await fetch(
        `${API_BASE_URL}/api/consumer/order/create`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            User_id: userId,

            total_amount: grandTotal,

            Promotion_code:
              appliedCoupon
                ? appliedCoupon.code
                : null,

            recipient: recipient,

            recipient_phone:
              recipientPhone,

            recipient_address:
              shippingMethod === "home"
                ? recipientAddress
                : "",

            recipient_postal_code:
              shippingMethod === "home"
                ? recipientPostalCode.trim()
                : "",

            recipient_city:
              shippingMethod === "home"
                ? recipientCity.trim()
                : "",

            recipient_district:
              shippingMethod === "home"
                ? recipientDistrict.trim()
                : "",

            // =========================
            // 配送資料
            // =========================
            shipping_method:
              shippingMethod,

            logistics_type:
              shippingMethod === "cvs"
                ? "CVS"
                : "HOME",

            logistics_sub_type:
              shippingMethod === "cvs"
                ? (
                    selectedStore?.logistics_sub_type
                    || "UNIMARTC2C"
                  )
                : "TCAT",

            store_id:
              shippingMethod === "cvs"
                ? selectedStore?.store_id
                : null,

            store_name:
              shippingMethod === "cvs"
                ? selectedStore?.store_name
                : null,

            store_address:
              shippingMethod === "cvs"
                ? selectedStore?.store_address
                : null,

            items: orderItems,
          }),
        }
      );

      const orderData =
        await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(
          orderData.err ||
          "建立訂單失敗"
        );
      }

      const orderId =
        orderData.Order_id ||
        orderData.orderId;

      // 信用卡走真正的綠界 AIO 金流：後端 /api/payments/create/ 針對這筆 Order
      // 建立 PaymentTransaction、算好 CheckMacValue，回傳可直接 auto-submit 的表單資料。
      // 金額、商品名稱都是後端從 Order/OrderItem 組出來的，前端不會也不能自己帶金額。
      // 送出表單後瀏覽器會離開這個頁面，訂單狀態改成「已付款」是綠界打 ReturnURL 回後端才會發生，
      // 不是這裡能立即決定的，所以信用卡這條路徑先不跑下面清購物車/顯示成功動畫那段舊的模擬邏輯。
      if (method === "card") {
        const paymentRes = await fetch(`${API_BASE_URL}/api/payments/create/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ Order_id: orderId }),
        });
        const paymentData = await paymentRes.json();
        if (!paymentRes.ok || !paymentData.success) {
          throw new Error(paymentData.err || "建立綠界付款失敗");
        }

        submitEcpayForm(paymentData);
        return; // 頁面即將被導向綠界，不需要再更新任何 local state
      }

      // ============================
      // 建立 Transaction
      // ============================
      const txRes = await fetch(
        `${API_BASE_URL}/api/consumer/transaction/create`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            wallet_type: "koc",

            Wallets_id: 1,

            Type: "pay",

            Amount:
              Math.round(grandTotal),

            Reference_type:
              "order",

            Reference_id:
              orderId,
          }),
        }
      );

      const txData =
        await txRes
          .json()
          .catch(() => ({}));

      // ============================
      // 更新 Payment
      // ============================
      await fetch(
        `${API_BASE_URL}/api/consumer/payment/update`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            Order_id:
              orderId,

            payment_method:
              method,

            payment_status:
              "paid",

            transaction_id:
              txData.Transaction_ID,
          }),
        }
      );

      // ============================
      // 更新付款結果
      // ============================
      await fetch(
        `${API_BASE_URL}/api/consumer/payments/result`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            Order_id:
              orderId,

            payment_status:
              "paid",
          }),
        }
      );

      // ============================
      // 清除購物車
      // ============================
      for (
        const item
        of normalizedCartItems
      ) {
        const cartItemId =
          item.cartItemId ??
          item.id;

        if (
          !cartItemId ||
          item.buyNow
        ) {
          continue;
        }

        await fetch(
          `${API_BASE_URL}/api/consumer/cart/item/delete`,
          {
            method: "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              Cart_item_id:
                cartItemId,
            }),
          }
        ).catch(() => {});
      }

      setSubmitState("success");

      setTimeout(() => {
        setSubmitState("idle");

        onPaid?.({
          orderId,
        });
      }, 2000);

    } catch (err) {
      setSubmitState("error");

      setPayError(
        err.message ||
        "付款失敗，請再試一次"
      );

      setTimeout(() => {
        setSubmitState("idle");
      }, 3000);
    }
  };

  const badgeText =
    METHODS.find(
      (item) =>
        item.key === method
    )?.label ?? "信用卡";

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18] font-serif">

      <div className="mx-auto max-w-[1000px] px-6 pb-20 pt-12 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 lg:gap-14 items-start">

        {/* ================= LEFT ================= */}
        <div>

          {/* 返回購物車 */}
          <button
            type="button"
            onClick={() => onBack?.()}
            className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#1A1A18] transition-colors font-bold text-sm group w-fit"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 transition-transform group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5" />
              <path d="M12 5l-7 7 7 7" />
            </svg>

            返回購物車
          </button>

          <h1 className="font-['DM_Serif_Display'] text-[40px] leading-none mb-7">
            結帳
          </h1>

          {!isLoggedIn && (
            <div className="mb-7 flex items-center justify-between gap-4 rounded-[14px] border-[1.5px] border-[#C8522A] bg-[#FBEAE3] px-5 py-4">

              <span className="text-[14px] text-[#1A1A18]">
                需要登入會員才能結帳，目前不提供訪客結帳。
              </span>

              <button
                type="button"
                onClick={() =>
                  onGoToLogin?.()
                }
                className="whitespace-nowrap rounded-full bg-[#1A1A18] px-5 py-2 text-[13px] font-bold text-[#F5F0E8] transition-colors hover:bg-[#C8522A]"
              >
                前往登入
              </button>

            </div>
          )}

          <div className="h-px bg-[#E2DDD4] mb-7" />

          {/* ================= 配送資訊 ================= */}
          <div className="mb-7">

            <div className="text-[18px] font-bold mb-5">
              配送資訊
            </div>

            {/* 配送方式 */}
            <div className="mb-5">

              <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                配送方式
              </label>

              <div className="flex gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setShippingMethod(
                      "home"
                    )
                  }
                  className={`rounded-full border-[1.5px] px-5 py-2.5 text-[13px] transition-all ${
                    shippingMethod === "home"
                      ? "border-[#1A1A18] bg-[#1A1A18] text-white"
                      : "border-[#E2DDD4] bg-white text-[#8C8880] hover:border-[#1A1A18] hover:text-[#1A1A18]"
                  }`}
                >
                  宅配
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShippingMethod(
                      "cvs"
                    )
                  }
                  className={`rounded-full border-[1.5px] px-5 py-2.5 text-[13px] transition-all ${
                    shippingMethod === "cvs"
                      ? "border-[#1A1A18] bg-[#1A1A18] text-white"
                      : "border-[#E2DDD4] bg-white text-[#8C8880] hover:border-[#1A1A18] hover:text-[#1A1A18]"
                  }`}
                >
                  超商取貨
                </button>

              </div>

            </div>

            {/* 收件人姓名 */}
            <div className="mb-4">

              <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                收件人姓名
              </label>

              <input
                value={recipient}
                onChange={(e) =>
                  setRecipient(
                    e.target.value
                  )
                }
                placeholder="請輸入收件人姓名"
                className={`w-full rounded-[10px] border-[1.5px] px-4 py-[13px] text-sm outline-none transition-colors ${
                  recipient.trim() &&
                  (
                    shippingMethod !== "cvs" ||
                    isValidCVSReceiverName(recipient)
                  )
                    ? "border-[#6BBF6B] bg-white"
                    : recipient.trim() &&
                      shippingMethod === "cvs" &&
                      !isValidCVSReceiverName(recipient)
                    ? "border-[#C8522A] bg-white"
                    : "border-[#E2DDD4] bg-slate-100 focus:border-[#1A1A18] focus:bg-white"
                }`}
              />

              {shippingMethod === "cvs" && (
                <p
                  className={`mt-2 text-[11px] ${
                    recipient.trim() &&
                    !isValidCVSReceiverName(recipient)
                      ? "font-bold text-[#C8522A]"
                      : "text-[#8C8880]"
                  }`}
                >
                  7-ELEVEN 取貨姓名需為中文 2～5 個字，
                  或英文 4～10 個半形英文字母。
                </p>
              )}

            </div>

            {/* 收件人電話 */}
            <div className="mb-4">

              <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                收件人電話
              </label>

              <input
                value={
                  recipientPhone
                }
                onChange={(e) =>
                  setRecipientPhone(
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10)
                  )
                }
                inputMode="tel"
                maxLength={10}
                placeholder="請輸入 09 開頭的 10 碼手機號碼"
                className={`w-full rounded-[10px] border-[1.5px] px-4 py-[13px] text-sm outline-none transition-colors ${
                  recipientPhoneValid
                    ? "border-[#6BBF6B] bg-white"
                    : "border-[#E2DDD4] bg-slate-100 focus:border-[#1A1A18] focus:bg-white"
                }`}
              />

            </div>

            {/* ================= 宅配 ================= */}
            {shippingMethod === "home" ? (

              <div className="mb-4 space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div>
                    <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                      縣市
                    </label>

                    <select
                      value={recipientCity}
                      onChange={handleRecipientCityChange}
                      className={`w-full rounded-[10px] border-[1.5px] px-4 py-[13px] text-sm outline-none transition-colors ${
                        recipientCity
                          ? "border-[#6BBF6B] bg-white"
                          : "border-[#E2DDD4] bg-slate-100 focus:border-[#1A1A18] focus:bg-white"
                      }`}
                    >
                      <option value="">請選擇縣市</option>

                      {TAIWAN_CITIES.map(city => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                      鄉鎮市區
                    </label>

                    <select
                      value={recipientDistrict}
                      onChange={handleRecipientDistrictChange}
                      disabled={!recipientCity}
                      className={`w-full rounded-[10px] border-[1.5px] px-4 py-[13px] text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        recipientDistrict
                          ? "border-[#6BBF6B] bg-white"
                          : "border-[#E2DDD4] bg-slate-100 focus:border-[#1A1A18] focus:bg-white"
                      }`}
                    >
                      <option value="">
                        {recipientCity
                          ? "請選擇鄉鎮市區"
                          : "請先選擇縣市"}
                      </option>

                      {recipientDistrictOptions.map(item => (
                        <option
                          key={`${item.district}-${item.postalCode}`}
                          value={item.district}
                        >
                          {item.district}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>

                <div>
                  <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                    郵遞區號
                  </label>

                  <input
                    value={recipientPostalCode}
                    readOnly
                    placeholder="選擇鄉鎮市區後自動帶入"
                    className={`w-full rounded-[10px] border-[1.5px] px-4 py-[13px] text-sm outline-none ${
                      recipientPostalCode
                        ? "border-[#6BBF6B] bg-[#F8F9FA]"
                        : "border-[#E2DDD4] bg-slate-100"
                    }`}
                  />

                  <p className="mt-2 text-[11px] text-[#8C8880]">
                    郵遞區號會依縣市與鄉鎮市區自動填入。
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                    詳細地址
                  </label>

                  <input
                    value={recipientAddress}
                    onChange={(e) =>
                      setRecipientAddress(
                        e.target.value
                      )
                    }
                    placeholder="例如 光復路二段100號"
                    className={`w-full rounded-[10px] border-[1.5px] px-4 py-[13px] text-sm outline-none transition-colors ${
                      recipientAddress.trim()
                        ? "border-[#6BBF6B] bg-white"
                        : "border-[#E2DDD4] bg-slate-100 focus:border-[#1A1A18] focus:bg-white"
                    }`}
                  />
                </div>

              </div>

            ) : (

              /* ================= 超商取貨 ================= */
              <div className="mb-4">

                <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                  取貨門市
                </label>

                {!selectedStore ? (

                  <button
                    type="button"
                    onClick={
                      handleSelectStore
                    }
                    className="w-full rounded-[10px] border-[1.5px] border-[#E2DDD4] bg-white px-4 py-[13px] text-left text-sm transition-colors hover:border-[#1A1A18]"
                  >

                    <div className="font-bold text-[#1A1A18]">
                      選擇 7-ELEVEN 取貨門市
                    </div>

                    <div className="mt-1 text-[12px] text-[#8C8880]">
                      點擊後將開啟綠界超商選店
                    </div>

                  </button>

                ) : (

                  <div className="rounded-[12px] border-[1.5px] border-[#6BBF6B] bg-white p-4">

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <div className="mb-1 flex items-center gap-2 text-[14px] font-bold text-[#1A1A18]">

                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6BBF6B] text-white">
                            <CheckIcon className="h-3 w-3" />
                          </span>

                          7-ELEVEN{" "}
                          {selectedStore.store_name}

                        </div>

                        <div className="mt-2 text-[12px] text-[#8C8880]">
                          門市代號：
                          {selectedStore.store_id}
                        </div>

                        <div className="mt-1 text-[12px] leading-5 text-[#8C8880]">
                          {selectedStore.store_address}
                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={
                          handleSelectStore
                        }
                        className="whitespace-nowrap text-[12px] font-bold text-[#C8522A] hover:underline"
                      >
                        更換門市
                      </button>

                    </div>

                  </div>
                )}

              </div>
            )}

          </div>

          <div className="h-px bg-[#E2DDD4] mb-7" />

          {/* ================= 支付方式 ================= */}
          <div className="flex items-center justify-between mb-5">

            <div className="text-[18px] font-bold">
              支付方式
            </div>

            <span className="rounded-full bg-[#1A1A18] px-3.5 py-1 text-[12px] tracking-[0.06em] text-[#F5F0E8] font-mono">
              {badgeText}
            </span>

          </div>

          <div className="flex flex-wrap gap-2.5 mb-7">

            {METHODS.map(
              ({
                key,
                label,
                Icon,
              }) => {

                const active =
                  method === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setMethod(key)
                    }
                    className={`inline-flex items-center gap-2 rounded-full border-[1.5px] px-4 py-[9px] text-[13px] transition-all ${
                      active
                        ? "border-[#1A1A18] bg-[#F5F0E8] text-[#1A1A18]"
                        : "border-[#E2DDD4] bg-white text-[#8C8880] hover:text-[#1A1A18]"
                    }`}
                  >
                    <Icon />
                    {label}
                  </button>
                );
              }
            )}

          </div>

          <p className="text-[12px] tracking-[0.06em] uppercase text-[#8C8880] mb-3">
            已儲存資訊
          </p>

          <button
            type="button"
            className="mb-7 inline-flex items-center gap-2 rounded-full bg-[#8C8880] px-5 py-2.5 text-[13px] text-[#F5F0E8] transition-colors hover:bg-[#1A1A18]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[14px] w-[14px]"
              fill="currentColor"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>

            查看全部
          </button>

          <div className="h-px bg-[#E2DDD4] mb-7" />

          {method === "card" && (
            <div className="mb-7 flex items-start gap-3 rounded-[14px] border-[1.5px] border-[#E2DDD4] bg-[#F5F0E8] px-5 py-4">
              <span className="mt-0.5 shrink-0 text-[#6BBF6B]">
                <ShieldIcon />
              </span>
              <p className="text-[13px] text-[#8C8880]">
                按下「確認並支付」後會導向綠界金流的安全刷卡頁面填寫卡片資訊，本頁不會收集您的卡號。
              </p>
            </div>
          )}

          {/* ================= Submit ================= */}
          <button
            type="button"
            onClick={
              handlePay
            }
            disabled={
              !canPay ||
              submitState ===
                "success" ||
              submitState ===
                "loading"
            }
            className={`inline-flex items-center gap-2 rounded-full px-9 py-[15px] text-[16px] tracking-[0.05em] transition-all
              ${
                !canPay ||
                submitState ===
                  "success" ||
                submitState ===
                  "loading"
                  ? "opacity-80"
                  : "hover:-translate-y-[1px]"
              }
              ${
                submitState ===
                "success"
                  ? "bg-[#6BBF6B] text-[#F5F0E8]"
                  : submitState ===
                    "error"
                  ? "bg-[#C8522A] text-[#F5F0E8]"
                  : "bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A]"
              }`}
          >

            {submitState ===
            "success" ? (

              <>
                <CheckIcon className="h-[18px] w-[18px]" />
                付款成功！
              </>

            ) : submitState ===
              "loading" ? (

              <>
                處理中...
              </>

            ) : submitState ===
              "error" ? (

              <>
                {payError ||
                  "付款失敗，請再試一次"}
              </>

            ) : (

              <>
                確認並支付

                <ArrowRightIcon className="h-[18px] w-[18px]" />
              </>

            )}

          </button>

          {!isLoggedIn ? (

            <p className="mt-3 text-[12px] text-[#C8522A] font-bold">
              請先登入會員才能結帳。
            </p>

          ) : !shippingValid ? (

            <p className="mt-3 text-[12px] text-[#8C8880]">

              {shippingMethod === "home"
                ? "請填寫收件人姓名、09 開頭手機號碼，選擇縣市與鄉鎮市區，並填寫詳細地址。"
                : !cvsReceiverNameValid
                ? "7-ELEVEN 取貨姓名需為中文 2～5 個字，或英文 4～10 個半形英文字母。"
                : "請填寫收件人姓名、09 開頭手機號碼，並選擇取貨門市。"}

            </p>

          ) : null}

        </div>

        {/* ================= RIGHT ================= */}
        <aside className="sticky top-20">

          <div className="rounded-[16px] border border-[#E2DDD4] bg-white p-7">

            <div className="relative inline-block font-['DM_Serif_Display'] text-[22px] mb-6">

              付款詳情

              <span className="absolute left-0 -bottom-1 h-[2px] w-7 rounded bg-[#B89B6A]" />

            </div>

            <div className="text-[13px] text-[#8C8880]">

              {normalizedCartItems.map(
                (item, idx) => {

                  const baseSubtotal =
                    item.price *
                    item.qty;

                  const discountedSubtotal =
                    getItemDiscountedSubtotal(
                      item
                    );

                  const hasDiscount =
                    discountedSubtotal <
                    baseSubtotal;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2.5"
                    >

                      <span>
                        {item.name} ×{" "}
                        {item.qty}
                      </span>

                      <span className="font-mono text-[#1A1A18]">

                        {hasDiscount && (
                          <span className="line-through text-[#8C8880] mr-2">

                            {formatNTD(
                              baseSubtotal
                            )}

                          </span>
                        )}

                        {formatNTD(
                          discountedSubtotal
                        )}

                      </span>

                    </div>
                  );
                }
              )}

              <div className="flex items-center justify-between border-b border-t border-[#E2DDD4] py-2.5">

                <span>
                  運費
                </span>

                <span className="font-mono text-[#1A1A18]">

                  {formatNTD(
                    initialSummary.shippingAmount
                  )}

                </span>

              </div>

              <div className="flex items-center justify-between py-2.5">

                <span>
                  優惠碼折扣
                </span>

                <span
                  className={`font-mono ${
                    couponDiscount > 0
                      ? "text-[#6BBF6B]"
                      : "text-[#8C8880]"
                  }`}
                >

                  {couponDiscount > 0
                    ? `−${formatNTD(
                        couponDiscount
                      )}`
                    : "NT$0"}

                </span>

              </div>

            </div>

            {/* 優惠碼 */}
            <div className="mt-4 border-t border-[#E2DDD4] pt-4">

              <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                輸入優惠碼
              </label>

              {appliedCoupon ? (

                <div className="flex items-center justify-between rounded-[10px] border border-[#6BBF6B] bg-[#F0FBF0] px-4 py-2.5">

                  <div>

                    <div className="font-mono text-[13px] font-bold text-[#6BBF6B]">
                      {appliedCoupon.code}
                    </div>

                    <div className="text-[11px] text-[#8C8880]">

                      適用於：

                      {appliedCoupon.matchedItemNames.join(
                        "、"
                      )}

                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={
                      handleRemoveCoupon
                    }
                    className="text-[11px] text-[#8C8880] underline hover:text-[#C8522A]"
                  >
                    移除
                  </button>

                </div>

              ) : (

                <div className="flex gap-2">

                  <input
                    value={
                      couponCode
                    }
                    onChange={(e) =>
                      setCouponCode(
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="輸入優惠碼"
                    className="flex-1 rounded-[10px] border-[1.5px] border-[#E2DDD4] bg-white px-4 py-2.5 font-mono text-[13px] outline-none focus:border-[#1A1A18] tracking-[0.08em]"
                  />

                  <button
                    type="button"
                    onClick={
                      handleApplyCoupon
                    }
                    disabled={
                      couponLoading ||
                      !couponCode.trim()
                    }
                    className="rounded-[10px] bg-[#1A1A18] px-2.5 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-[#C8522A] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >

                    {couponLoading
                      ? "驗證中"
                      : "套用"}

                  </button>

                </div>
              )}

              {couponMsg.show && (

                <p
                  className={`mt-2 text-[12px] font-bold ${
                    couponMsg.ok
                      ? "text-[#6BBF6B]"
                      : "text-[#C8522A]"
                  }`}
                >

                  {couponMsg.text}

                </p>

              )}

            </div>

            {/* 總額 */}
            <div className="mt-4 flex items-center justify-between rounded-[10px] bg-[#F5F0E8] px-4 py-3.5">

              <div className="text-[13px] font-bold text-[#1A1A18]">

                總付款金額{" "}

                <span className="ml-1 text-[11px] font-normal text-[#8C8880]">
                  (TWD)
                </span>

              </div>

              <div className="font-mono text-[18px] font-bold text-[#1A1A18]">

                {formatNTD(
                  grandTotal
                )}

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