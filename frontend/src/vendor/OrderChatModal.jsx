import { useEffect, useRef, useState } from 'react'
import { X, MessageCircle, Loader2, Send, Package } from 'lucide-react'

import { getVendorOrderChatMessages, sendVendorOrderChatMessage } from '../api/vendor'
import { OrderTag, showsOrderTag } from '../chatTags'
import { cn, formatCurrency } from './lib/utils'
import { getErrorMessage } from '../errorMessage'
import usePolling, { CHAT_POLL_INTERVAL_MS, hasNewMessages } from '../usePolling'

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function OrderChatModal({ open, orderId, vendorId, items = [], totalAmount, onClose }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const bottomRef = useRef(null)

  useEffect(() => {
    if (open) loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 背景輪詢比對新舊訊息時要讀最新的 state
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  // 準即時同步：定時抓新訊息，分頁在背景時暫停
  usePolling(() => loadMessages({ silent: true }), CHAT_POLL_INTERVAL_MS, Boolean(open && orderId))

  async function loadMessages({ silent = false } = {}) {
    if (!vendorId || !orderId) return

    try {
      if (!silent) {
        setLoading(true)
        setLoadError('')
      }

      const response = await getVendorOrderChatMessages(orderId, vendorId)

      if (response.data?.success === false) {
        throw new Error(response.data.err || '訊息載入失敗')
      }

      const nextMessages = response.data?.messages || []
      if (!silent || hasNewMessages(messagesRef.current, nextMessages)) {
        setMessages(nextMessages)
      }
    } catch (error) {
      if (silent) return
      setLoadError(
        getErrorMessage(error, '訊息載入失敗')
      )
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function handleSend() {
    const content = input.trim()
    if (!content || sending || !vendorId || !orderId) return

    try {
      setSending(true)
      setSendError('')

      const response = await sendVendorOrderChatMessage({
        order_id: orderId,
        vendor_id: vendorId,
        content,
      })

      if (response.data?.success === false) {
        throw new Error(response.data.err || '訊息送出失敗')
      }

      setMessages(previous => [...previous, response.data.message])
      setInput('')
    } catch (error) {
      setSendError(
        getErrorMessage(error, '訊息送出失敗')
      )
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
      event.preventDefault()
      handleSend()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg flex flex-col h-[70vh] bg-white rounded-[2rem] shadow-2xl border border-edge overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 bg-mist border-b border-edge shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center">
              <MessageCircle size={17} className="text-brand" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">聯絡買家</div>
              <div className="text-[11px] font-mono font-bold text-muted">{orderId}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-muted hover:bg-edge hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {items.length > 0 && (
          <div className="px-6 py-4 bg-white border-b border-edge shrink-0">
            <div className="flex items-center gap-2 text-[11px] font-bold text-muted tracking-wider mb-3">
              <Package size={13} />
              訂單商品
            </div>

            <div className="flex flex-col gap-2 max-h-28 overflow-y-auto">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <span className="flex-1 font-bold text-ink line-clamp-1">
                    {item.productName || item.product_name}
                  </span>
                  <span className="font-mono font-bold text-muted">x{item.quantity}</span>
                  <span className="font-mono font-bold text-brand w-16 text-right">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {totalAmount != null && (
              <div className="mt-3 flex items-center justify-between border-t border-edge pt-3">
                <span className="text-xs font-bold text-muted">訂單總金額</span>
                <span className="text-sm font-black text-brand">{formatCurrency(totalAmount)}</span>
              </div>
            )}
          </div>
        )}

        {loadError && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold text-red-600">
            {loadError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <Loader2 size={20} className="animate-spin text-brand" />
              <div className="text-xs font-bold text-muted mt-3">訊息載入中...</div>
            </div>
          ) : messages.length > 0 ? (
            messages.map((message, index) => {
              const isMine = message.sender_role === 'vendor'

              return (
                <div
                  key={message.message_id}
                  className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
                      isMine
                        ? 'bg-brand text-white rounded-br-sm'
                        : 'bg-white border border-edge text-ink shadow-sm rounded-bl-sm'
                    )}
                  >
                    {/* 這裡是跟這位買家的完整對話，標出每段是在講哪張訂單、哪個商品 */}
                    {showsOrderTag(messages, index) && <OrderTag order={message.order} inverted={isMine} />}
                    {message.product && (
                      <div className={cn('mb-1 text-[11px] font-bold', isMine ? 'text-white/60' : 'text-muted')}>
                        詢問商品：{message.product.product_name}
                      </div>
                    )}
                    {message.content}
                    <div
                      className={cn(
                        'text-[10px] mt-1',
                        isMine ? 'text-white/50 text-right' : 'text-muted'
                      )}
                    >
                      {formatTime(message.created_at)}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20 text-muted">
              <MessageCircle size={28} className="mb-3 text-edge" />
              <p className="text-sm font-bold">尚無對話紀錄</p>
              <p className="text-xs mt-2">買家針對這筆訂單的訊息會顯示在這裡</p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="bg-white border-t border-edge px-6 py-4 shrink-0">
          {sendError && (
            <div className="mb-3 text-xs font-bold text-brand">{sendError}</div>
          )}

          <div className="flex items-center gap-3">
            <textarea
              rows={1}
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending || loading}
              placeholder="輸入訊息…（Enter 送出，Shift + Enter 換行）"
              className="flex-1 max-h-32 resize-none bg-mist border border-edge rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted/60 outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all disabled:opacity-60"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || sending || loading}
              className="bg-brand text-white p-3 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
