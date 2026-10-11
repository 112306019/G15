import { API_BASE_URL } from '../config';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, MessageCircle, Send, Store, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../errorMessage';
import usePolling, { CHAT_POLL_INTERVAL_MS, hasNewMessages } from '../usePolling';

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 訊息附帶的商品卡（從商品頁發起的詢問）
export function InquiryProductCard({ product, inverted = false }) {
  if (!product) return null;
  return (
    <Link
      to={`/product/${product.product_id}`}
      className={`mb-2 flex items-center gap-2.5 rounded-xl p-2 pr-3 border transition-colors ${
        inverted ? 'bg-white/10 border-white/15 hover:bg-white/20' : 'bg-[#F8F9FA] border-[#E2DDD4] hover:border-[#C8522A]'
      }`}
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#F5F0E8]">
        {product.image_url && <img src={product.image_url} alt={product.product_name} className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0">
        <div className={`text-[10px] font-bold ${inverted ? 'text-white/60' : 'text-[#8C8880]'}`}>詢問商品</div>
        <div className="text-xs font-bold line-clamp-1">{product.product_name}</div>
      </div>
    </Link>
  );
}

// 商品詢問：消費者不用下單就能傳訊息給廠商（從廠商頁或商品頁進來）
// 從商品頁進來時網址會帶 ?product=，第一則訊息會附上這個商品
export default function InquiryChatPage({ vendorId, onBack }) {
  const userId = localStorage.getItem('userId');
  const [vendorName, setVendorName] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef(null);
  const [searchParams] = useSearchParams();
  // 這次要附上的商品；送出第一則訊息後就清掉，後面的訊息不再重複附
  const [pendingProduct, setPendingProduct] = useState(null);

  useEffect(() => {
    const productId = searchParams.get('product');
    if (!productId) {
      setPendingProduct(null);
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/consumer/product/detail?Product_id=${encodeURIComponent(productId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((p) => {
        // 只附上這家廠商的商品
        if (!cancelled && p?.Product_id && String(p.Vendor_id) === String(vendorId)) {
          setPendingProduct({
            product_id: p.Product_id,
            product_name: p.Product_name,
            image_url: p.image_url,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [searchParams, vendorId]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  async function loadMessages({ silent = false } = {}) {
    if (!userId || !vendorId) {
      if (!silent) {
        setLoadError('請先登入');
        setLoading(false);
      }
      return;
    }
    try {
      if (!silent) {
        setLoading(true);
        setLoadError('');
      }
      const res = await fetch(
        `${API_BASE_URL}/api/consumer/inquiry/getMessages?user_id=${encodeURIComponent(userId)}&vendor_id=${encodeURIComponent(vendorId)}`
      );
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.err || '訊息載入失敗');
      }
      setVendorName(data.vendor?.vendor_name || '');
      const next = data.messages || [];
      if (!silent || hasNewMessages(messagesRef.current, next)) {
        setMessages(next);
      }
    } catch (err) {
      if (silent) return;
      setLoadError(getErrorMessage(err, '訊息載入失敗'));
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 準即時同步：定時抓廠商的回覆，分頁在背景時暫停
  usePolling(() => loadMessages({ silent: true }), CHAT_POLL_INTERVAL_MS, Boolean(userId && vendorId));

  async function handleSend() {
    const content = input.trim();
    if (!content || sending || !userId || !vendorId) return;
    try {
      setSending(true);
      setSendError('');
      const res = await fetch(`${API_BASE_URL}/api/consumer/inquiry/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          vendor_id: vendorId,
          content,
          product_id: pendingProduct?.product_id,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.err || '訊息送出失敗');
      }
      setMessages((prev) => [...prev, data.message]);
      setInput('');
      setPendingProduct(null);
    } catch (err) {
      setSendError(getErrorMessage(err, '訊息送出失敗'));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event) {
    // 中文輸入法選字時按的 Enter 不送出
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="animate-in fade-in duration-500 max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#FDF0ED] flex items-center justify-center shrink-0">
          <MessageCircle size={20} className="text-[#C8522A]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl md:text-[28px] font-serif font-bold text-[#1A1A18]">詢問廠商</h2>
          {vendorName && (
            <Link to={`/store/${vendorId}`} className="inline-flex items-center gap-1 text-xs font-bold text-[#8C8880] hover:text-[#C8522A]">
              <Store size={12} /> {vendorName}
            </Link>
          )}
        </div>
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
                <div key={message.message_id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] sm:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isMine
                        ? 'bg-[#1A1A18] text-white rounded-br-sm'
                        : 'bg-white border border-[#E2DDD4] text-[#1A1A18] shadow-sm rounded-bl-sm'
                    }`}
                  >
                    <InquiryProductCard product={message.product} inverted={isMine} />
                    {message.content}
                    <div className={`text-[10px] mt-1 ${isMine ? 'text-white/50 text-right' : 'text-[#8C8880]'}`}>
                      {formatTime(message.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20 text-[#8C8880] text-center">
              <MessageCircle size={28} className="mb-3 text-[#E2DDD4]" />
              <p className="text-sm font-bold">還沒有對話紀錄</p>
              <p className="text-xs mt-2">對商品有任何問題，都可以直接問廠商，廠商回覆時會通知您</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="bg-white border-t border-[#E2DDD4] px-6 py-4 shrink-0">
          {pendingProduct && (
            <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-[#FDF0ED] border border-[#C8522A]/20 p-2 pr-2.5">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#F5F0E8]">
                {pendingProduct.image_url && (
                  <img src={pendingProduct.image_url} alt={pendingProduct.product_name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-[#C8522A]">正在詢問這個商品，會附在下一則訊息上</div>
                <div className="text-xs font-bold text-[#1A1A18] line-clamp-1">{pendingProduct.product_name}</div>
              </div>
              <button
                type="button"
                onClick={() => setPendingProduct(null)}
                title="不附上商品"
                className="p-1 rounded-full text-[#8C8880] hover:text-[#1A1A18] hover:bg-white"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {sendError && <div className="mb-3 text-xs font-bold text-[#C8522A]">{sendError}</div>}
          <div className="flex items-center gap-3">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="輸入想詢問的內容，Enter 送出、Shift+Enter 換行"
              className="flex-1 resize-none bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C8522A] max-h-32"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="p-3 rounded-xl bg-[#1A1A18] text-white hover:bg-[#C8522A] transition-colors disabled:opacity-40"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
