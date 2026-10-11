import { useEffect, useRef } from 'react';

// 聊天室等需要「準即時」更新的畫面用：每 intervalMs 毫秒呼叫一次 callback。
// - 瀏覽器分頁切到背景時暫停，切回來時立刻補呼叫一次，不讓後端白忙
// - callback 永遠用最新的版本（存在 ref 裡），呼叫端不用處理閉包過期的問題
// - 上一次還沒跑完就不重複呼叫，避免網路慢時請求越疊越多
export const CHAT_POLL_INTERVAL_MS = 4000;

export default function usePolling(callback, intervalMs, enabled = true) {
  const callbackRef = useRef(callback);
  const runningRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return undefined;

    const run = async () => {
      if (runningRef.current || document.visibilityState !== 'visible') return;
      runningRef.current = true;
      try {
        await callbackRef.current();
      } catch {
        // 背景更新失敗就等下一輪，不打斷使用者
      } finally {
        runningRef.current = false;
      }
    };

    const timer = setInterval(run, intervalMs);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [intervalMs, enabled]);
}

// 背景輪詢抓回來的訊息跟目前畫面上的比，有新訊息（或筆數改變）才需要更新畫面
export function hasNewMessages(current = [], next = [], idKey = 'message_id') {
  if (current.length !== next.length) return true;
  if (next.length === 0) return false;
  return current[current.length - 1]?.[idKey] !== next[next.length - 1]?.[idKey];
}
