import { useEffect, useRef, useState } from 'react'
import { X, MessageCircle, Loader2, Send, Package } from 'lucide-react'

import { getVendorOrderChatMessages, sendVendorOrderChatMessage } from '../api/vendor'
import { cn, formatCurrency } from './lib/utils'

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

  async function loadMessages() {
    if (!vendorId || !orderId) return

    try {
      setLoading(true)
      setLoadError('')

      const response = await getVendorOrderChatMessages(orderId, vendorId)

      if (response.data?.success === false) {
        throw new Error(response.data.err || '訊息載入失敗')
      }

      setMessages(response.data?.messages || [])
    } catch (error) {
      const apiError = error.response?.data?.err
      setLoadError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : error.message || '訊息載入失敗'
      )
    } finally {
      setLoading(false)
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
      const apiError = error.response?.data?.err
      setSendError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : error.message || '訊息送出失敗'
      )
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1A1A18]/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg flex flex-col h-[70vh] bg-white rounded-[2rem] shadow-2xl border border-[#E2DDD4] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 bg-[#F8F9FA] border-b border-[#E2DDD4] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#FDF0ED] flex items-center justify-center">
              <MessageCircle size={17} className="text-[#C8522A]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1A1A18]">聯絡買家</div>
              <div className="text-[11px] font-mono font-bold text-[#8C8880]">{orderId}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[#8C8880] hover:bg-[#E2DDD4] hover:text-[#1A1A18]"
          >
            <X size={18} />
          </button>
        </div>

        {items.length > 0 && (
          <div className="px-6 py-4 bg-white border-b border-[#E2DDD4] shrink-0">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#8C8880] tracking-wider mb-3">
              <Package size={13} />
              訂單商品
            </div>

            <div className="flex flex-col gap-2 max-h-28 overflow-y-auto">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <span className="flex-1 font-bold text-[#1A1A18] line-clamp-1">
                    {item.productName || item.product_name}
                  </span>
                  <span className="font-mono font-bold text-[#8C8880]">x{item.quantity}</span>
                  <span className="font-mono font-bold text-[#C8522A] w-16 text-right">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {totalAmount != null && (
              <div className="mt-3 flex items-center justify-between border-t border-[#E2DDD4] pt-3">
                <span className="text-xs font-bold text-[#8C8880]">訂單總金額</span>
                <span className="text-sm font-black text-[#C8522A]">{formatCurrency(totalAmount)}</span>
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
              <Loader2 size={20} className="animate-spin text-[#C8522A]" />
              <div className="text-xs font-bold text-[#8C8880] mt-3">訊息載入中...</div>
            </div>
          ) : messages.length > 0 ? (
            messages.map(message => {
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
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20 text-[#8C8880]">
              <MessageCircle size={28} className="mb-3 text-[#E2DDD4]" />
              <p className="text-sm font-bold">尚無對話紀錄</p>
              <p className="text-xs mt-2">買家針對這筆訂單的訊息會顯示在這裡</p>
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
              onChange={event => setInput(event.target.value)}
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
  )
}
