import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

function formatNotificationTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return '剛剛';
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小時前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} 天前`;
  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

const CATEGORY_LABEL = {
  order: '訂單通知',
  koc: '接案通知',
};

function NotificationList({ items, onOpenNotification, emptyText }) {
  return (
    <div className="rounded-[1.5rem] border border-[#E2DDD4] bg-white overflow-hidden shadow-sm">
      {items.length === 0 ? (
        <div className="py-12 text-center text-[#8C8880] font-bold">{emptyText}</div>
      ) : (
        <div className="divide-y divide-[#E2DDD4]">
          {items.map((notification) => (
            <button
              key={notification.notification_id}
              onClick={() => onOpenNotification?.(notification)}
              className={`w-full flex items-start gap-3 px-6 py-5 text-left transition-colors hover:bg-[#F5F0E8] ${
                notification.is_read ? '' : 'bg-[#FDF0ED]/40'
              }`}
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? 'bg-transparent' : 'bg-[#C8522A]'}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] text-[#8C8880] mb-1">{formatNotificationTime(notification.created_at)}</span>
                <span className="block text-sm font-bold text-[#1A1A18]">{notification.title}</span>
                {notification.body && (
                  <span className="block text-xs text-[#8C8880] mt-1 leading-relaxed">{notification.body}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage({
  category,
  notifications = { order: [], koc: [] },
  onRefresh,
  onOpenNotification,
  onBack,
}) {
  const [tab, setTab] = useState('unread');

  useEffect(() => {
    onRefresh?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryItems = useMemo(() => {
    return [...(notifications[category] || [])].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }, [notifications, category]);

  const unreadList = useMemo(() => categoryItems.filter((n) => !n.is_read), [categoryItems]);
  const readList = useMemo(() => categoryItems.filter((n) => n.is_read), [categoryItems]);

  const activeList = tab === 'unread' ? unreadList : readList;

  return (
    <div className="max-w-3xl animate-in fade-in duration-500">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回
      </button>

      <h2 className="text-[28px] font-serif font-bold mb-8 text-[#1A1A18]">{CATEGORY_LABEL[category] || '通知'}</h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('unread')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === 'unread'
              ? 'bg-[#1A1A18] text-[#F5F0E8] shadow-md'
              : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:text-[#1A1A18]'
          }`}
        >
          未讀（{unreadList.length}）
        </button>
        <button
          onClick={() => setTab('read')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === 'read'
              ? 'bg-[#1A1A18] text-[#F5F0E8] shadow-md'
              : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:text-[#1A1A18]'
          }`}
        >
          已讀（{readList.length}）
        </button>
      </div>

      <NotificationList
        items={activeList}
        onOpenNotification={onOpenNotification}
        emptyText={tab === 'unread' ? '目前沒有未讀通知' : '目前沒有已讀通知'}
      />
    </div>
  );
}
