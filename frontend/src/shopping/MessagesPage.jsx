import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';
import ConversationPanel from '../vendor/ConversationPanel';
import { getKocChatrooms, getChatHistory, markKocChatroomRead, sendChatMessage } from '../api/koc';

// KOC 多一個「接案聊天」（跟廠商的任務對話），排在最前面
const KOC_TAB = { key: 'task', label: '接案聊天' };
const TABS = [
  { key: 'inquiry', label: '廠商訊息' },
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
// - 廠商訊息：每家廠商一個對話，商品詢問（從廠商頁、商品頁發起）和訂單訊息（從訂單頁發起）
//   都在同一個對話裡，訊息上會標出是在講哪個商品、哪張訂單
// 網址參數 ?tab=task|inquiry，搭配 room（接案聊天）或 vendor（廠商訊息）直接打開某個對話
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
        <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center shrink-0">
          <MessageCircle size={20} className="text-brand" />
        </div>
        <div>
          <h2 className="text-2xl md:text-[28px] font-display font-bold text-ink">我的訊息</h2>
          <p className="text-xs text-muted">
            {isKoc ? '接案聊天、跟廠商的商品詢問與訂單對話都在這裡' : '跟每家廠商的對話都在這裡，商品詢問和訂單訊息不再分開'}
          </p>
        </div>
      </div>

      {/* 只有一種對話（非 KOC）時不用顯示分頁列 */}
      <div className={`flex gap-1 mb-3 border-b border-edge ${tabs.length < 2 ? 'hidden' : ''}`}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSearchParams(t.key === defaultTab ? {} : { tab: t.key })}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              tab === t.key ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="h-[70vh] rounded-2xl md:rounded-[2rem] border border-edge overflow-hidden shadow-sm bg-white">
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
            emptyListText="還沒有跟廠商的對話"
            emptyListHint="在廠商頁、商品頁或訂單頁聯絡廠商，對話就會出現在這裡"
            fetchList={async () => {
              const data = await getJson(`${API_BASE_URL}/api/consumer/inquiry/list?user_id=${encodeURIComponent(userId)}`);
              return (data.rooms || []).map((r) => ({
                key: r.vendor_id,
                title: r.vendor_name || '廠商',
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
      </div>
    </div>
  );
}
