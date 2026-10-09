import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Loader2, MessageCircle, RefreshCw, Search, Send } from 'lucide-react'
import { cn } from './lib/utils'
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

/**
 * 廠商統一聊天室的通用對話面板（「訂單訊息」「商品詢問」分頁共用）：
 * 左邊對話列表、右邊訊息與輸入框，跟其他聊天室一樣每 4 秒背景同步。
 *
 * fetchList()            → [{ key, title, subtitle, lastMessage, lastMessageAt, unreadCount }]
 * fetchMessages(conv)    → [{ message_id, sender_role, content, created_at }]（同時標記已讀）
 * sendMessage(conv, text)→ 新訊息物件
 * initialKey：從通知點進來時要直接打開的對話
 * mineRole：自己這一方的 sender_role（廠商端 'vendor'，前台消費者 'user'），決定訊息靠右顯示
 */
export default function ConversationPanel({
  fetchList,
  fetchMessages,
  sendMessage,
  initialKey = null,
  searchPlaceholder = '搜尋…',
  emptyListText = '目前沒有對話',
  emptyListHint = '',
  headerExtra = null,
  mineRole = 'vendor',
}) {
  const [conversations, setConversations] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [activeKey, setActiveKey] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageLoading, setMessageLoading] = useState(false)
  const [messageError, setMessageError] = useState('')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const bottomRef = useRef(null)

  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const activeKeyRef = useRef(activeKey)
  activeKeyRef.current = activeKey

  const active = conversations.find(c => c.key === activeKey) || null
  const totalUnread = conversations.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0)

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return conversations
    return conversations.filter(c =>
      [c.title, c.subtitle, c.lastMessage].some(v => v && String(v).toLowerCase().includes(keyword))
    )
  }, [conversations, search])

  async function loadList({ silent = false } = {}) {
    try {
      if (!silent) {
        setListLoading(true)
        setListError('')
      }
      const list = await fetchList()
      setConversations(list)
      if (!silent && initialKey && list.some(c => String(c.key) === String(initialKey))) {
        setActiveKey(list.find(c => String(c.key) === String(initialKey)).key)
      }
    } catch (error) {
      if (silent) return
      setListError(getErrorMessage(error, '對話列表載入失敗'))
    } finally {
      if (!silent) setListLoading(false)
    }
  }

  async function loadMessages(conv, { silent = false } = {}) {
    if (!conv) return
    try {
      if (!silent) {
        setMessageLoading(true)
        setMessageError('')
      }
      const next = await fetchMessages(conv)
      // 抓回來時已經切到別的對話，就丟掉這次結果
      if (activeKeyRef.current !== conv.key) return
      if (!silent || hasNewMessages(messagesRef.current, next)) {
        setMessages(next)
        // 打開對話會標記已讀，列表上的未讀數同步歸零
        setConversations(prev => prev.map(c => (c.key === conv.key ? { ...c, unreadCount: 0 } : c)))
      }
    } catch (error) {
      if (silent) return
      setMessageError(getErrorMessage(error, '訊息載入失敗'))
    } finally {
      if (!silent) setMessageLoading(false)
    }
  }

  useEffect(() => {
    loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey])

  useEffect(() => {
    setMessages([])
    if (active) loadMessages(active)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeKey])

  usePolling(async () => {
    if (active) await loadMessages(active, { silent: true })
    await loadList({ silent: true })
  }, CHAT_POLL_INTERVAL_MS)

  async function handleSend() {
    const content = input.trim()
    if (!content || !active || sending) return
    try {
      setSending(true)
      setMessageError('')
      const message = await sendMessage(active, content)
      setMessages(prev => [...prev, message])
      setConversations(prev => prev.map(c => (
        c.key === active.key
          ? { ...c, lastMessage: content, lastMessageAt: message.created_at }
          : c
      )))
      setInput('')
    } catch (error) {
      setMessageError(getErrorMessage(error, '訊息傳送失敗'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full bg-white relative overflow-hidden">
      {/* 左側：對話列表 */}
      <div
        className={cn(
          'w-full sm:w-80 border-r border-[#E2DDD4] flex flex-col bg-white shrink-0 absolute sm:relative inset-0 z-10 sm:z-0 transition-transform duration-300',
          activeKey ? '-translate-x-full sm:translate-x-0' : 'translate-x-0'
        )}
      >
        <div className="px-4 py-4 border-b border-[#E2DDD4]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#1A1A18] text-sm">對話</h2>
            <div className="flex items-center gap-2">
              {totalUnread > 0 && (
                <span className="bg-[#C8522A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{totalUnread}</span>
              )}
              <button
                type="button"
                onClick={() => loadList()}
                disabled={listLoading}
                className="p-1.5 rounded-full text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#C8522A] disabled:opacity-50"
                title="重新整理"
              >
                <RefreshCw size={14} className={cn(listLoading ? 'animate-spin' : '')} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-3 py-2">
            <Search size={13} className="text-[#8C8880]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="bg-transparent text-xs text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none w-full"
            />
          </div>
          {headerExtra}
        </div>

        <div className="flex-1 overflow-y-auto">
          {listLoading && conversations.length === 0 ? (
            <div className="py-12 flex items-center justify-center gap-2 text-xs font-bold text-[#8C8880]">
              <Loader2 size={14} className="animate-spin" /> 載入中...
            </div>
          ) : listError ? (
            <div className="py-12 px-4 text-center text-xs font-bold text-[#C8522A]">{listError}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <MessageCircle size={28} className="mx-auto mb-2 text-[#E2DDD4]" />
              <p className="text-xs font-bold text-[#8C8880]">{search.trim() ? '找不到符合的對話' : emptyListText}</p>
              {!search.trim() && emptyListHint && <p className="text-[11px] text-[#8C8880] mt-1">{emptyListHint}</p>}
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => setActiveKey(c.key)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-[#F5F0E8] transition-colors',
                  c.key === activeKey ? 'bg-[#FDF0ED]' : 'hover:bg-[#F8F9FA]'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#1A1A18] truncate">{c.title}</span>
                  <span className="text-[10px] text-[#8C8880] shrink-0">{formatTime(c.lastMessageAt)}</span>
                </div>
                {c.subtitle && <div className="text-[11px] text-[#8C8880] truncate mt-0.5">{c.subtitle}</div>}
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-xs text-[#8C8880] truncate">{c.lastMessage}</span>
                  {c.unreadCount > 0 && (
                    <span className="bg-[#C8522A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">{c.unreadCount}</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 右側：訊息 */}
      <div className="flex-1 flex flex-col min-w-0">
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8C8880] gap-2">
            <MessageCircle size={36} className="text-[#E2DDD4]" />
            <p className="text-sm font-bold">選擇左側的對話開始回覆</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-[#E2DDD4] flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveKey(null)}
                className="sm:hidden p-1.5 rounded-full text-[#8C8880] hover:bg-[#F5F0E8]"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#1A1A18] truncate">{active.title}</div>
                {active.subtitle && <div className="text-[11px] text-[#8C8880] truncate">{active.subtitle}</div>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#FAF8F4]">
              {messageLoading && messages.length === 0 ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs font-bold text-[#8C8880]">
                  <Loader2 size={14} className="animate-spin" /> 載入中...
                </div>
              ) : messages.length === 0 ? (
                <div className="py-12 text-center text-xs font-bold text-[#8C8880]">還沒有訊息</div>
              ) : (
                messages.map(m => {
                  const mine = m.sender_role === mineRole
                  return (
                    <div key={m.message_id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div className="max-w-[75%]">
                        <div
                          className={cn(
                            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
                            mine ? 'bg-[#1A1A18] text-white rounded-br-md' : 'bg-white border border-[#E2DDD4] text-[#1A1A18] rounded-bl-md'
                          )}
                        >
                          {m.content}
                        </div>
                        <div className={cn('text-[10px] text-[#8C8880] mt-1', mine ? 'text-right' : 'text-left')}>
                          {formatTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {messageError && (
              <div className="px-4 py-2 text-xs font-bold text-[#C8522A] bg-[#FDF0ED]">{messageError}</div>
            )}

            <div className="p-3 border-t border-[#E2DDD4] flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                rows={1}
                placeholder="輸入訊息，Enter 送出、Shift+Enter 換行"
                className="flex-1 resize-none bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C8522A] max-h-32"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="p-3 rounded-xl bg-[#1A1A18] text-white hover:bg-[#C8522A] transition-colors disabled:opacity-40"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
