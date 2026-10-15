import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, MessageCircle, Users } from 'lucide-react';
import { getVendorChatrooms, getVendorInquiryList } from '../api/vendor';
import usePolling from '../usePolling';
import { ICON_BADGE } from '../badgeStyle';

// 後台每一頁都會輪詢，間隔抓長一點，不要拖慢後端
const MESSAGE_UNREAD_POLL_MS = 20000;

const sumUnread = (rows) => (rows || []).reduce((total, row) => total + Number(row.unread_count || 0), 0);

// 未讀數字的小紅點。字級、大小由呼叫的地方決定
function CountBadge({ count, max = 99, className = '' }) {
  if (!count) return null;
  return (
    <span className={`bg-[#C8522A] text-white font-bold flex items-center justify-center rounded-full ${className}`}>
      {count > max ? `${max}+` : count}
    </span>
  );
}

// 廠商後台右上角的聊天圖示：有未讀時顯示數字，滑鼠移上去展開下拉選單，
// 分別進統一聊天室的「KOC 任務」／「顧客訊息」分頁（構造比照前台的 koc/HeaderMessages）。
export default function VendorHeaderMessages({ onNavigate }) {
  const navigate = useNavigate();
  const vendorId = localStorage.getItem('vendor_id');
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState({ koc: 0, inquiry: 0 });

  const refresh = async () => {
    if (!vendorId) return;
    const [koc, inquiry] = await Promise.all([
      getVendorChatrooms(vendorId).then((r) => sumUnread(r.data?.chatrooms)).catch(() => null),
      getVendorInquiryList(vendorId).then((r) => sumUnread(r.data?.rooms)).catch(() => null),
    ]);
    // 這次沒抓到（null）就沿用上一次的數字，不要讓數字閃一下消失
    setUnread((prev) => ({ koc: koc ?? prev.koc, inquiry: inquiry ?? prev.inquiry }));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);
  usePolling(refresh, MESSAGE_UNREAD_POLL_MS, Boolean(vendorId));

  const go = (path) => {
    setOpen(false);
    (onNavigate || navigate)(path);
  };

  const items = [
    { key: 'koc', label: 'KOC 任務', icon: Briefcase, count: unread.koc, path: '/vendor/chat' },
    { key: 'inquiry', label: '顧客訊息', icon: Users, count: unread.inquiry, path: '/vendor/chat?tab=inquiry' },
  ];
  const total = unread.koc + unread.inquiry;

  return (
    <div
      className="relative"
      onMouseEnter={() => { setOpen(true); refresh(); }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => go('/vendor/chat')}
        className="relative p-2 md:p-2.5 rounded-full text-[#8C8880] hover:text-[#C8522A] hover:bg-[#FDF0ED] transition-colors"
        title="聊天室"
      >
        <MessageCircle size={20} className="md:w-[22px] md:h-[22px]" />
        {/* 跟旁邊通知鈴鐺、客服共用同一個數字圈樣式 */}
        <CountBadge count={total} className={`${ICON_BADGE} top-0 right-0`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full pt-2 w-56 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-white border border-[#E2DDD4] rounded-2xl shadow-[0_8px_30px_rgba(26,26,24,0.08)] overflow-hidden py-2">
            {items.map(({ key, label, icon: Icon, count, path }) => (
              <button
                key={key}
                onClick={() => go(path)}
                className="w-full flex items-center justify-between gap-3 px-5 py-3 text-sm font-bold text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18] transition-colors text-left"
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