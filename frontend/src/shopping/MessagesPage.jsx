import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';
import ConversationPanel from '../vendor/ConversationPanel';
import { getKocChatrooms, getChatHistory, markKocChatroomRead, sendChatMessage } from '../api/koc';

// KOC 多一個「接案聊天」（跟廠商的任務對話），排在最前面
const KOC_TAB = { key: 'task', label: '接案聊天' };
const TABS = [
  { key: 'inquiry', label: '商品詢問' },
  { key: 'order', label: '訂單訊息' },
];

const throwIfFailed = (response, fallback) => {
  if (response.data?.success === false) throw new Error(response.data.err || fallback);
  return response.data;
};

async function getJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.success === false) {
    throw new Error(data?.err || '讀取失敗');
  }
  return data;
}

// 前台「我的訊息」：跟廠商的所有對話集中在這裡
// - 接案聊天（只有 KOC）：KOC 接案任務跟廠商的對話
// - 商品詢問：從廠商頁、商品頁按「傳訊息給廠商」發起，不用下單
// - 訂單訊息：每張訂單跟廠商的對話
// 網址參數 ?tab=task|inquiry|order，搭配 room（接案聊天）、vendor（商品詢問）或 order（訂單訊息）直接打開某個對話
export default function MessagesPage() {
  const userId = localStorage.getItem('userId');
  const isKoc = localStorage.getItem('role') === '1';
  const tabs = isKoc ? [KOC_TAB, ...TABS] : TABS;
  const defaultTab = tabs[0].key;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabs.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : defaultTab;

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5 md:mb-6">
        <div className="w-10 h-10 rounded-full bg-[#FDF0ED] flex items-center justify-center shrink-0">
          <MessageCircle size={20} className="text-[#C8522A]" />
        </div>
        <div>
          <h2 className="text-2xl md:text-[28px] font-serif font-bold text-[#1A1A18]">我的訊息</h2>
          <p className="text-xs text-[#8C8880]">
            {isKoc ? '接案聊天、商品詢問與訂單對話都在這裡' : '跟廠商的商品詢問與訂單對話都在這裡'}
          </p>
        </div>
      </div>

      <div className="flex gap-1 mb-3 border-b border-[#E2DDD4]">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSearchParams(t.key === defaultTab ? {} : { tab: t.key })}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              tab === t.key ? 'border-[#C8522A] text-[#C8522A]' : 'border-transparent text-[#8C8880] hover:text-[#1A1A18]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="h-[70vh] rounded-2xl md:rounded-[2rem] border border-[#E2DDD4] overflow-hidden shadow-sm bg-white">
        {tab === 'task' && isKoc && (
          <ConversationPanel
            key="task"
            mineRole="koc"
            initialKey={searchParams.get('room')}
            searchPlaceholder="搜尋廠商或活動…"
            emptyListText="還沒有接案聊天"
            emptyListHint="接案通過後，可以在這裡跟廠商溝通任務"
            fetchList={async () => {
              const data = throwIfFailed(await getKocChatrooms(userId), '接案聊天載入失敗');
              return (data.chatrooms || []).map((r) => ({
                key: String(r.room_id),
                title: r.vendor_name || '廠商',
                subtitle: r.campaign_name || '',
                lastMessage: r.last_message || '',
                lastMessageAt: r.last_message_time || r.created_at,
                unreadCount: Number(r.unread_count || 0),
              }));
            }}
            fetchMessages={async (conv) => {
              const data = throwIfFailed(await getChatHistory(conv.key), '訊息載入失敗');
              await markKocChatroomRead({ user_id: userId, room_id: conv.key }).catch(() => {});
              return data.messages || [];
            }}
            sendMessage={async (conv, content) => {
              const data = throwIfFailed(
                await sendChatMessage({ room_id: conv.key, sender_role: 'koc', sender_id: userId, content }),
                '訊息傳送失敗'
              );
              return data.message;
            }}
          />
        )}

        {tab === 'inquiry' && (
          <ConversationPanel
            key="inquiry"
            mineRole="user"
            initialKey={searchParams.get('vendor')}
            searchPlaceholder="搜尋廠商或訊息…"
            emptyListText="還沒有商品詢問"
            emptyListHint="在廠商頁或商品頁按「傳訊息給廠商」就能直接詢問"
            fetchList={async () => {
              const data = await getJson(`${API_BASE_URL}/api/consumer/inquiry/list?user_id=${encodeURIComponent(userId)}`);
              return (data.rooms || []).map((r) => ({
                key: r.vendor_id,
                title: r.vendor_name || '廠商',
                subtitle: '商品詢問',
                lastMessage: r.last_message,
                lastMessageAt: r.last_message_at,
                unreadCount: r.unread_count,
              }));
            }}
            fetchMessages={async (conv) => {
              const data = await getJson(
                `${API_BASE_URL}/api/consumer/inquiry/getMessages?user_id=${encodeURIComponent(userId)}&vendor_id=${encodeURIComponent(conv.key)}`
              );
              return data.messages || [];
            }}
            sendMessage={async (conv, content) => {
              const data = await getJson(`${API_BASE_URL}/api/consumer/inquiry/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, vendor_id: conv.key, content }),
              });
              return data.message;
            }}
          />
        )}

        {tab === 'order' && (
          <ConversationPanel
            key="order"
            mineRole="user"
            initialKey={searchParams.get('order')}
            searchPlaceholder="搜尋廠商或訂單編號…"
            emptyListText="還沒有訂單訊息"
            emptyListHint="在「我的訂單」點進訂單即可聯絡廠商"
            fetchList={async () => {
              const data = await getJson(`${API_BASE_URL}/api/user/orderChat/list?user_id=${encodeURIComponent(userId)}`);
              return (data.rooms || []).map((r) => ({
                key: r.order_id,
                title: r.vendor_name || '廠商',
                subtitle: `訂單 ${String(r.order_id).slice(0, 8).toUpperCase()}`,
                lastMessage: r.last_message,
                lastMessageAt: r.last_message_at,
                unreadCount: r.unread_count,
              }));
            }}
            fetchMessages={async (conv) => {
              const data = await getJson(
                `${API_BASE_URL}/api/user/orderChat/getMessages?order_id=${encodeURIComponent(conv.key)}&user_id=${encodeURIComponent(userId)}`
              );
              return data.messages || [];
            }}
            sendMessage={async (conv, content) => {
              const data = await getJson(`${API_BASE_URL}/api/user/orderChat/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: conv.key, user_id: userId, content }),
              });
              return data.message;
            }}
          />
        )}
      </div>
    </div>
  );
}
