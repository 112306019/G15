import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, MessageCircle, Store } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { getKocChatrooms } from '../api/koc';
import usePolling from '../usePolling';
import { ICON_BADGE } from '../badgeStyle';

// 每個登入中的頁面都會輪詢，間隔抓長一點，不要拖慢後端
const MESSAGE_UNREAD_POLL_MS = 20000;

const sumUnread = (rows) => (rows || []).reduce((total, row) => total + Number(row.unread_count || 0), 0);

// 右上角聊天圖示用的未讀數：接案聊天（只有 KOC）＋廠商訊息
// 回傳 { task, inquiry, total, refresh }
export function useMessageUnread(userRole) {
  const [unread, setUnread] = useState({ task: 0, inquiry: 0 });
  const isGuest = userRole === 'guest';
  const isKoc = userRole === 'koc';

  const refresh = async () => {
    const userId = localStorage.getItem('userId');
    if (isGuest || !userId) return;
    const [task, inquiry] = await Promise.all([
      isKoc
        ? getKocChatrooms(userId).then((r) => sumUnread(r.data?.chatrooms)).catch(() => null)
        : Promise.resolve(0),
      fetch(`${API_BASE_URL}/api/consumer/inquiry/list?user_id=${encodeURIComponent(userId)}`)
        .then((res) => res.json())
        .then((data) => sumUnread(data?.rooms))
        .catch(() => null),
    ]);
    // 這次沒抓到（null）就沿用上一次的數字，不要讓紅點閃一下消失
    setUnread((prev) => ({ task: task ?? prev.task, inquiry: inquiry ?? prev.inquiry }));
  };

  useEffect(() => {
    if (isGuest) setUnread({ task: 0, inquiry: 0 });
    else refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  usePolling(refresh, MESSAGE_UNREAD_POLL_MS, !isGuest);

  return { ...unread, total: unread.task + unread.inquiry, refresh };
}

// 未讀數字的小紅點。字級、大小由呼叫的地方決定，
// 這裡不寫字級，避免跟 ICON_BADGE 的字級互相打架
function CountBadge({ count, max = 99, className = '' }) {
  if (!count) return null;
  return (
    <span className={`bg-brand text-white font-bold flex items-center justify-center rounded-full ${className}`}>
      {count > max ? `${max}+` : count}
    </span>
  );
}

// 右上角的聊天圖示（電腦版）：有未讀時顯示數字，滑鼠移上去展開下拉選單，
// 分別進「我的訊息」的接案聊天／廠商訊息分頁。做法比照旁邊的通知鈴鐺。
export default function HeaderMessages({ userRole, active = false, unread }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isKoc = userRole === 'koc';

  const items = [
    isKoc && { key: 'task', label: '接案聊天', icon: Briefcase, count: unread.task },
    { key: 'inquiry', label: '廠商訊息', icon: Store, count: unread.inquiry },
  ].filter(Boolean);

  const openTab = (key) => {
    setOpen(false);
    navigate(`/messages?tab=${key}`);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => { setOpen(true); unread.refresh?.(); }}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className="relative cursor-pointer hover:bg-cream p-2.5 rounded-full transition-colors"
        onClick={() => {
          setOpen(false);
          navigate('/messages');
        }}
        title="我的訊息"
      >
        <MessageCircle size={22} strokeWidth={2.5} className={active || open ? 'text-ink' : 'text-muted'} />
        {/* 跟旁邊通知鈴鐺、購物車共用同一個數字圈樣式 */}
        <CountBadge count={unread.total} className={`${ICON_BADGE} top-0 right-0`} />
      </div>

      {open && (
        <div className="absolute right-0 top-full pt-2 w-56 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-white border border-edge rounded-2xl shadow-[0_8px_30px_rgba(26,26,24,0.08)] overflow-hidden py-2">
            {items.map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => openTab(key)}
                className="w-full flex items-center justify-between gap-3 px-5 py-3 text-sm font-bold text-muted hover:bg-cream hover:text-ink transition-colors text-left"
              >
                <span className="flex items-center gap-3">
                  <Icon size={16} strokeWidth={2.5} />
                  {label}
                </span>
                <CountBadge count={count} className="text-[10px] min-w-[18px] h-[18px] px-1" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}