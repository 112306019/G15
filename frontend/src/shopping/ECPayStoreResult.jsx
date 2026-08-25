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

    console.log(
      "===== ECPay 選店結果 ====="
    );
    console.log(storeData);
    console.log("==========================");

    if (storeData.store_id) {
      // 1. 存到 localStorage 當備援
      localStorage.setItem(
        "ecpaySelectedStore",
        JSON.stringify(storeData)
      );

      localStorage.setItem(
        "ecpaySelectedStoreUpdatedAt",
        String(Date.now())
      );

      // 2. 直接通知原本 Checkout 視窗
      if (
        window.opener &&
        !window.opener.closed
      ) {
        try {
          window.opener.postMessage(
            {
              type: "ECPAY_STORE_SELECTED",
              store: storeData,
            },
            window.location.origin
          );
        } catch (error) {
          console.error(
            "通知 Checkout 失敗：",
            error
          );
        }
      }
    } else {
      console.error(
        "綠界回傳資料沒有 store_id",
        storeData
      );
    }

    const timer = setTimeout(() => {
      window.close();
    }, 800);

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