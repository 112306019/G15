import { API_BASE_URL } from '../config';
import React, { useEffect, useRef, useState } from 'react';
import { Headset, Loader2, Send } from 'lucide-react';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SupportChatPage({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const bottomRef = useRef(null);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    if (!userId) {
      setLoadError('尚未登入');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError('');

      const res = await fetch(
        `${API_BASE_URL}/api/user/support/getMessages?user_id=${userId}`
      );
      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.err || '客服訊息載入失敗');
      }

      setMessages(data.messages || []);
    } catch (err) {
      setLoadError(err.message || '客服訊息載入失敗');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || sending || !userId) return;

    try {
      setSending(true);
      setSendError('');

      const res = await fetch(`${API_BASE_URL}/api/user/support/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, content }),
      });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.err || '訊息送出失敗');
      }

      setMessages((prev) => [...prev, data.message]);
      setInput('');
    } catch (err) {
      setSendError(err.message || '訊息送出失敗');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    // 🟢 移除了 mx-auto 與 pt-2，並改為 max-w-4xl 對齊個人資訊頁
    <div className="animate-in fade-in duration-500 max-w-4xl">
      
      {/* 🟢 將 mb-6 改為 mb-8 讓標題與下方卡片的距離一致 */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-[28px] font-serif font-bold text-[#1A1A18]">客服諮詢</h2>
      </div>

      <div className="flex flex-col h-[65vh] rounded-[2rem] border border-[#E2DDD4] bg-white shadow-sm overflow-hidden">
        {loadError && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold text-red-600">
            {loadError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <Loader2 size={20} className="animate-spin text-[#C8522A]" />
              <div className="text-xs font-bold text-[#8C8880] mt-3">訊息載入中...</div>
            </div>
          ) : messages.length > 0 ? (
            messages.map((message) => {
              const isMine = message.sender_role === 'user';

              return (
                <div
                  key={message.message_id}
                  className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[75%] sm:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
                      isMine
                        ? 'bg-[#1A1A18] text-white rounded-br-sm'
                        : 'bg-white border border-[#E2DDD4] text-[#1A1A18] shadow-sm rounded-bl-sm'
                    )}
                  >
                    {message.content}
                    <div
                      className={cn(
                        'text-[10px] mt-1',
                        isMine ? 'text-white/50 text-right' : 'text-[#8C8880]'
                      )}
                    >
                      {formatTime(message.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20 text-[#8C8880]">
              <Headset size={28} className="mb-3 text-[#E2DDD4]" />
              <p className="text-sm font-bold">尚無對話紀錄</p>
              <p className="text-xs mt-2">有任何問題都可以在這裡詢問客服</p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="bg-white border-t border-[#E2DDD4] px-6 py-4 shrink-0">
          {sendError && (
            <div className="mb-3 text-xs font-bold text-[#C8522A]">{sendError}</div>
          )}

          <div className="flex items-center gap-3">
            <textarea
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending || loading}
              placeholder="輸入訊息…（Enter 送出，Shift + Enter 換行）"
              className="flex-1 max-h-32 resize-none bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none focus:ring-4 focus:ring-[#C8522A]/10 focus:border-[#C8522A] transition-all disabled:opacity-60"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || sending || loading}
              className="bg-[#1A1A18] text-white p-3 rounded-xl hover:bg-[#C8522A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}