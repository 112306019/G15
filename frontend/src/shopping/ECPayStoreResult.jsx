import React, { useEffect } from "react";

export default function ECPayStoreResult() {
  useEffect(() => {
    const params =
      new URLSearchParams(window.location.search);

    const storeData = {
      logistics_sub_type:
        params.get("logistics_sub_type") || "",

      store_id:
        params.get("store_id") || "",

      store_name:
        params.get("store_name") || "",

      store_address:
        params.get("store_address") || "",

      store_telephone:
        params.get("store_telephone") || "",

      store_outside:
        params.get("store_outside") || "",
    };

    if (storeData.store_id) {
      localStorage.setItem(
        "ecpaySelectedStore",
        JSON.stringify(storeData)
      );

      /*
       * storage event 只有其他視窗會收到，
       * 所以 CheckoutPage 可以收到。
       */
      localStorage.setItem(
        "ecpaySelectedStoreUpdatedAt",
        String(Date.now())
      );
    }

    const timer = setTimeout(() => {
      window.close();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">
          門市選擇完成
        </h2>

        <p className="text-sm text-[#8C8880]">
          正在返回結帳頁...
        </p>
      </div>
    </div>
  );
}