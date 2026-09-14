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
    // [RWD 優化] 手機版 p-4，平板以上 p-0 mx-auto
    <div className="animate-in fade-in duration-500 max-w-4xl p-4 md:p-0 mx-auto w-full pb-12">
      
      {/* [RWD 優化] 手機版標題字體微調 */}
      <div className="mb-6 md:mb-8 flex items-center justify-between">
        <h2 className="text-2xl md:text-[28px] font-serif font-bold text-[#1A1A18]">客服諮詢</h2>
      </div>

      {/* [RWD 優化] 動態高度計算：手機版使用 dvh 避免鍵盤遮擋，並設定 min-h 確保對話區不會被擠壓到消失 */}
      <div className="flex flex-col h-[calc(100dvh-180px)] md:h-[65vh] min-h-[400px] rounded-2xl md:rounded-[2rem] border border-[#E2DDD4] bg-white shadow-sm overflow-hidden">
        
        {loadError && (
          <div className="mx-4 md:mx-6 mt-3 md:mt-4 bg-red-50 border border-red-200 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 text-xs font-bold text-red-600 shadow-sm shrink-0">
            {loadError}
          </div>
        )}

        {/* 訊息區 */}
        {/* [RWD 優化] 手機版 px-3 py-4 */}
        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-5 space-y-3 md:space-y-4 custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[#C8522A]" />
              <div className="text-xs md:text-sm font-bold text-[#8C8880] mt-3">訊息載入中...</div>
            </div>
          ) : messages.length > 0 ? (
            messages.map((message) => {
              const isMine = message.sender_role === 'user';

              return (
                <div
                  key={message.message_id}
                  className={cn('flex w-full', isMine ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] sm:max-w-md px-3.5 md:px-4 py-2.5 md:py-3 rounded-2xl text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm',
                      isMine
                        ? 'bg-[#1A1A18] text-white rounded-br-sm'
                        : 'bg-white border border-[#E2DDD4] text-[#1A1A18] rounded-bl-sm'
                    )}
                  >
                    {message.content}
                    <div
                      className={cn(
                        'text-[9px] md:text-[10px] mt-1 md:mt-1.5 font-medium',
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
            <div className="flex flex-col items-center justify-center h-full py-10 md:py-20 text-[#8C8880]">
              <Headset size={36} className="mb-3 text-[#E2DDD4]" />
              <p className="text-sm font-bold text-[#1A1A18]">尚無對話紀錄</p>
              <p className="text-xs mt-1.5 font-medium">有任何問題都可以在這裡詢問客服</p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* 輸入區 */}
        {/* [RWD 優化] 輸入區背景陰影與高度調整 */}
        <div className="bg-white border-t border-[#E2DDD4] px-3 md:px-6 py-2.5 md:py-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          {sendError && (
            <div className="mb-2.5 md:mb-3 text-[11px] md:text-xs font-bold text-[#C8522A] px-1">{sendError}</div>
          )}

          <div className="flex items-end gap-2 md:gap-3">
            <textarea
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending || loading}
              placeholder="輸入訊息…"
              className="flex-1 max-h-24 md:max-h-32 min-h-[40px] md:min-h-[48px] resize-none bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl px-4 py-2.5 md:py-3 text-[13px] md:text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none focus:ring-4 focus:ring-[#C8522A]/10 focus:border-[#C8522A] transition-all disabled:opacity-60 custom-scrollbar"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || sending || loading}
              className="bg-[#1A1A18] text-white h-[40px] w-[40px] md:h-[48px] md:w-[48px] rounded-full flex items-center justify-center hover:bg-[#C8522A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="-ml-0.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}