import { API_BASE_URL } from '../config';
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";

// 綠界 OrderResultURL 只負責把瀏覽器導回這裡、帶上 order_id，不能相信網址上的任何付款結果欄位
// （OrderResultURL 跟真正決定狀態的 ReturnURL 到達順序沒有保證，且網址參數任何人都能竄改）。
// 這裡固定呼叫後端 /api/payments/status/ 才是唯一該信任的付款狀態來源。
//
// ReturnURL（Server-to-Server）跟這個頁面的載入是兩條獨立的路徑，沒有先後保證，
// 所以付款當下第一次查詢很可能還是 pending，這裡做短時間輪詢，
// 而不是查一次沒結果就直接判定失敗。
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 8; // 最長輪詢 ~16 秒

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18] font-serif flex items-center justify-center px-6">
      <div className="w-full max-w-[480px] rounded-[16px] border border-[#E2DDD4] bg-white p-10 text-center">
        {children}
      </div>
    </div>
  );
}

function ActionButton({ children, onClick, primary = true }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full px-7 py-[13px] text-[14px] tracking-[0.05em] transition-all hover:-translate-y-[1px] ${
        primary ? "bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A]" : "border-[1.5px] border-[#E2DDD4] text-[#1A1A18] hover:border-[#1A1A18]"
      }`}
    >
      {children}
    </button>
  );
}

export default function PaymentResultPage({ onCartCleared }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");

  // checking：輪詢中 / paid / failed / timeout（一直是 pending）/ error（缺 order_id、查無訂單等）
  const [state, setState] = useState(() => (orderId ? "checking" : "error"));
  const [errorMsg, setErrorMsg] = useState(() => (orderId ? "" : "網址缺少訂單編號"));
  const cartClearedRef = useRef(false);

  useEffect(() => {
    if (!orderId) return; // 初始 state 已經反映這個情況，這裡不用再 setState 一次

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/payments/status/?order_id=${orderId}`);
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok || !data.success) {
          setState("error");
          setErrorMsg(data.err || "查無此訂單的付款紀錄");
          return;
        }

        if (data.status === "paid") {
          setState("paid");
          return;
        }
        if (data.status === "failed") {
          setState("failed");
          return;
        }

        attempts += 1;
        if (attempts >= MAX_POLL_ATTEMPTS) {
          setState("timeout");
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) {
          setState("error");
          setErrorMsg("無法連線到伺服器，請稍後至「我的訂單」查看");
        }
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [orderId]);

  // 確認付款成功後才清購物車，且只清「這筆訂單買過的商品」，不是整個購物車清空——
  // 使用者結帳到付款完成這段時間，購物車裡完全可能被加了其他還沒結帳的商品。
  useEffect(() => {
    if (state !== "paid" || cartClearedRef.current) return;
    cartClearedRef.current = true;

    const clearPurchasedCartItems = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      try {
        const orderRes = await fetch(`${API_BASE_URL}/api/consumer/order/view?Order_id=${orderId}`);
        const orderList = await orderRes.json();
        const order = Array.isArray(orderList) ? orderList[0] : null;
        const purchasedProductIds = new Set((order?.items || []).map((i) => i.Product_id));
        if (purchasedProductIds.size === 0) return;

        const cartRes = await fetch(`${API_BASE_URL}/api/consumer/cart/view?User_id=${userId}`);
        const cartData = await cartRes.json();
        const matchedItems = (cartData.items || []).filter((item) => purchasedProductIds.has(item.Product_id));

        await Promise.all(
          matchedItems.map((item) =>
            fetch(`${API_BASE_URL}/api/consumer/cart/item/delete`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ Cart_item_id: item.Cart_item_id }),
            }).catch(() => {})
          )
        );

        onCartCleared?.();
      } catch (err) {
        console.error("清空已購商品失敗", err);
      }
    };

    clearPurchasedCartItems();
  }, [state, orderId, onCartCleared]);

  if (state === "checking") {
    return (
      <Shell>
        <Loader2 className="mx-auto mb-5 h-12 w-12 animate-spin text-[#8C8880]" />
        <h1 className="font-['DM_Serif_Display'] text-[26px] mb-2">確認付款結果中</h1>
        <p className="text-[14px] text-[#8C8880]">請稍候，正在跟綠界確認這筆訂單的付款狀態…</p>
      </Shell>
    );
  }

  if (state === "paid") {
    return (
      <Shell>
        <CheckCircle2 className="mx-auto mb-5 h-14 w-14 text-[#6BBF6B]" />
        <h1 className="font-['DM_Serif_Display'] text-[28px] mb-2">付款成功！</h1>
        <p className="mb-8 text-[14px] text-[#8C8880]">感謝您的訂購，我們已經收到您的付款。</p>
        <div className="flex items-center justify-center gap-3">
          <ActionButton onClick={() => navigate(`/orders/${orderId}`)}>查看訂單</ActionButton>
          <ActionButton primary={false} onClick={() => navigate("/shop")}>繼續購物</ActionButton>
        </div>
      </Shell>
    );
  }

  if (state === "failed") {
    return (
      <Shell>
        <XCircle className="mx-auto mb-5 h-14 w-14 text-[#C8522A]" />
        <h1 className="font-['DM_Serif_Display'] text-[28px] mb-2">付款失敗</h1>
        <p className="mb-8 text-[14px] text-[#8C8880]">這筆交易未能完成，尚未扣款成功，您可以回到購物車重新結帳。</p>
        <div className="flex items-center justify-center gap-3">
          <ActionButton onClick={() => navigate("/cart")}>回到購物車</ActionButton>
          <ActionButton primary={false} onClick={() => navigate("/shop")}>繼續購物</ActionButton>
        </div>
      </Shell>
    );
  }

  if (state === "timeout") {
    return (
      <Shell>
        <Clock className="mx-auto mb-5 h-14 w-14 text-[#8C8880]" />
        <h1 className="font-['DM_Serif_Display'] text-[26px] mb-2">付款結果確認中</h1>
        <p className="mb-8 text-[14px] text-[#8C8880]">
          綠界的付款通知還在路上，這不代表付款失敗。請稍後到「我的訂單」查看最新狀態。
        </p>
        <ActionButton onClick={() => navigate("/orders")}>前往我的訂單</ActionButton>
      </Shell>
    );
  }

  // state === "error"
  return (
    <Shell>
      <XCircle className="mx-auto mb-5 h-14 w-14 text-[#C8522A]" />
      <h1 className="font-['DM_Serif_Display'] text-[26px] mb-2">無法確認付款結果</h1>
      <p className="mb-8 text-[14px] text-[#8C8880]">{errorMsg || "發生未預期的錯誤"}</p>
      <div className="flex items-center justify-center gap-3">
        <ActionButton onClick={() => navigate("/orders")}>前往我的訂單</ActionButton>
        <ActionButton primary={false} onClick={() => navigate("/shop")}>繼續購物</ActionButton>
      </div>
    </Shell>
  );
}
