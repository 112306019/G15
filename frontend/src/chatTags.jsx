import React from 'react';
import { Package } from 'lucide-react';

// 訂單編號太長，畫面上只顯示前 8 碼
export const shortOrderId = (orderId) => String(orderId || '').slice(0, 8).toUpperCase();

// 消費者跟同一家廠商只有一個對話，從訂單頁傳的訊息會標上訂單。
// 連續幾則都在講同一張訂單時只在第一則顯示，換了訂單（或中間插了一般訊息）才再顯示一次。
export function showsOrderTag(messages, index) {
  const orderId = messages[index]?.order?.order_id;
  if (!orderId) return false;
  return messages[index - 1]?.order?.order_id !== orderId;
}

// 訊息上方的訂單標籤：這則訊息是在講哪張訂單
// - inverted：深色訊息泡泡（自己發的）用反白配色
// - onClick：有給的話可以點（例如跳到那張訂單）
export function OrderTag({ order, inverted = false, onClick }) {
  if (!order?.order_id) return null;
  const className = `mb-2 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold ${
    inverted ? 'bg-white/10 border-white/15 text-white/80' : 'bg-[#F8F9FA] border-[#E2DDD4] text-[#8C8880]'
  } ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`;
  const content = (
    <>
      <Package size={12} /> 訂單 {shortOrderId(order.order_id)}
    </>
  );
  return (
    <div>
      {onClick ? (
        <button type="button" onClick={onClick} className={className}>{content}</button>
      ) : (
        <span className={className}>{content}</span>
      )}
    </div>
  );
}
