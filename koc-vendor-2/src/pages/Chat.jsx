import { useState, useRef, useEffect } from 'react'
import { Send, Search, Paperclip, Smile, ChevronDown, Check, CheckCheck } from 'lucide-react'
import { kocs, chatConversations as initialConvos } from '@/data/mock'
import { Avatar } from '@/components/ui'
import { cn } from '@/lib/utils'

// ─── Quick-reply templates ───────────────────────────────────────────────────
const QUICK_REPLIES = [
  '感謝你提交文案！我們會盡快審核。',
  '你的文案已核准，可以發布了 🎉',
  '文案需要調整，請確認審核頁面的修改意見。',
  '商品已寄出，請留意物流通知。',
  '有任何問題都可以隨時告訴我！',
  '期待你的貼文，加油！💪',
]

const platformStyle = {
  Instagram: { dot: 'bg-pink-500' },
  TikTok:    { dot: 'bg-teal-500' },
  YouTube:   { dot: 'bg-red-500'  },
}

// ─── helpers ────────────────────────────────────────────────────────────────
function formatTime(timeStr) {
  // show only HH:MM if today, else MM/DD
  const d = new Date(timeStr)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return timeStr.slice(11, 16)
  }
  return timeStr.slice(5, 10).replace('-', '/')
}

function formatFullTime(timeStr) {
  return timeStr.replace('T', ' ')
}

// ─── Message bubble ──────────────────────────────────────────────────────────
function Bubble({ msg, koc }) {
  const isVendor = msg.sender === 'vendor'
  return (
    <div className={cn('flex gap-2.5 group', isVendor ? 'flex-row-reverse' : 'flex-row')}>
      {!isVendor && <Avatar name={koc.avatar} size="sm" />}

      <div className={cn('flex flex-col gap-1 max-w-[72%]', isVendor && 'items-end')}>
        <div className={cn(
          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
          isVendor
            ? 'bg-ink text-white rounded-tr-sm'
            : 'bg-white border border-surface-200 text-ink rounded-tl-sm shadow-card',
        )}>
          {msg.text}
        </div>
        <div className={cn(
          'flex items-center gap-1 text-[10px] text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity',
          isVendor && 'flex-row-reverse',
        )}>
          <span>{formatTime(msg.time)}</span>
          {isVendor && (
            msg.read
              ? <CheckCheck size={11} className="text-brand" />
              : <Check size={11} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Date divider ────────────────────────────────────────────────────────────
function DateDivider({ date }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-surface-200" />
      <span className="text-[10px] font-semibold text-ink-faint px-2">{date}</span>
      <div className="flex-1 h-px bg-surface-200" />
    </div>
  )
}

// ─── Contact row in sidebar ──────────────────────────────────────────────────
function ContactRow({ koc, convo, active, onClick }) {
  const lastMsg = convo.messages[convo.messages.length - 1]
  const pd = platformStyle[koc.platform] ?? {}

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-surface-100',
        active ? 'bg-brand/5 border-l-2 border-l-brand' : 'hover:bg-surface-50',
      )}
    >
      <div className="relative shrink-0">
        <Avatar name={koc.avatar} />
        <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white', pd.dot)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={cn('text-sm font-semibold truncate', active ? 'text-ink' : 'text-ink')}>{koc.name}</span>
          <span className="text-[10px] text-ink-faint shrink-0 ml-2">{formatTime(lastMsg.time)}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-ink-faint truncate">
            {lastMsg.sender === 'vendor' && <span className="text-ink-faint">我：</span>}
            {lastMsg.text}
          </p>
          {convo.unread > 0 && (
            <span className="ml-2 shrink-0 w-4.5 h-4.5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center" style={{ width: 18, height: 18 }}>
              {convo.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Main chat page ──────────────────────────────────────────────────────────
export default function Chat() {
  // build state from mock — merge kocs + convos
  const [convos, setConvos] = useState(() =>
    initialConvos.map(c => ({
      ...c,
      messages: c.messages.map(m => ({ ...m, read: m.sender === 'koc' })),
    }))
  )
  const [activeKocId, setActiveKocId] = useState(kocs[0].id)
  const [input, setInput]             = useState('')
  const [search, setSearch]           = useState('')
  const [showQuick, setShowQuick]     = useState(false)
  const messagesEndRef                = useRef(null)
  const inputRef                      = useRef(null)

  const activeConvo = convos.find(c => c.kocId === activeKocId)
  const activeKoc   = kocs.find(k => k.id === activeKocId)

  // mark as read when switching
  function selectKoc(id) {
    setActiveKocId(id)
    setConvos(prev => prev.map(c =>
      c.kocId === id ? { ...c, unread: 0 } : c
    ))
    setShowQuick(false)
  }

  // scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConvo?.messages.length])

  function sendMessage(text) {
    const trimmed = (text ?? input).trim()
    if (!trimmed) return

    const newMsg = {
      id: `m${Date.now()}`,
      sender: 'vendor',
      text: trimmed,
      time: new Date().toLocaleString('zh-TW', { hour12: false }).slice(0, 16).replace(/\//g, '-'),
      read: false,
    }

    setConvos(prev => prev.map(c =>
      c.kocId !== activeKocId ? c : { ...c, messages: [...c.messages, newMsg] }
    ))
    setInput('')
    setShowQuick(false)
    inputRef.current?.focus()
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // group messages by date
  function groupByDate(messages) {
    const groups = []
    let lastDate = null
    for (const msg of messages) {
      const date = msg.time.slice(0, 10)
      if (date !== lastDate) {
        groups.push({ type: 'date', date, label: date.slice(5).replace('-', '/') })
        lastDate = date
      }
      groups.push({ type: 'msg', msg })
    }
    return groups
  }

  // filtered contact list
  const filteredKocs = kocs.filter(k =>
    !search || k.name.includes(search) || k.handle.includes(search)
  )

  const totalUnread = convos.reduce((s, c) => s + c.unread, 0)

  return (
    <div className="flex h-[calc(100vh-73px)] -m-8 overflow-hidden rounded-none">

      {/* ── Contact list ─────────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-surface-200 bg-white">
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-surface-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-ink text-base">訊息</h2>
            {totalUnread > 0 && (
              <span className="text-[10px] font-bold bg-brand text-white px-2 py-0.5 rounded-full">
                {totalUnread} 未讀
              </span>
            )}
          </div>
          {/* Search */}
          <div className="flex items-center gap-2 bg-surface-100 rounded-lg px-3 py-2">
            <Search size={13} className="text-ink-faint shrink-0" />
            <input
              type="text"
              placeholder="搜尋 KOC..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none w-full"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filteredKocs.map(koc => {
            const convo = convos.find(c => c.kocId === koc.id)
            if (!convo) return null
            return (
              <ContactRow
                key={koc.id}
                koc={koc}
                convo={convo}
                active={koc.id === activeKocId}
                onClick={() => selectKoc(koc.id)}
              />
            )
          })}
        </div>
      </div>

      {/* ── Message thread ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-surface min-w-0">

        {/* Thread header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-surface-200 shadow-card">
          <div className="relative">
            <Avatar name={activeKoc.avatar} size="lg" />
            <span className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white',
              platformStyle[activeKoc.platform]?.dot ?? 'bg-surface-300',
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-ink">{activeKoc.name}</div>
            <div className="text-xs text-ink-faint">{activeKoc.handle} · {activeKoc.platform} · {(activeKoc.followers / 1000).toFixed(0)}K 粉絲</div>
          </div>
          {/* KOC quick stats */}
          <div className="hidden md:flex items-center gap-4 mr-2">
            {[
              { label: 'GMV',   val: activeKoc.gmv > 0 ? `NT$${(activeKoc.gmv/1000).toFixed(0)}K` : '—' },
              { label: '貼文',  val: activeKoc.posts },
              { label: '優惠碼', val: activeKoc.code },
            ].map(({ label, val }) => (
              <div key={label} className="text-center">
                <div className="text-xs font-mono font-semibold text-ink">{val}</div>
                <div className="text-[10px] text-ink-faint">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-3">
          {activeConvo ? groupByDate(activeConvo.messages).map((item, i) => (
            item.type === 'date'
              ? <DateDivider key={`d-${i}`} date={item.label} />
              : <Bubble key={item.msg.id} msg={item.msg} koc={activeKoc} />
          )) : (
            <div className="flex items-center justify-center h-full text-sm text-ink-faint">
              尚無對話紀錄
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick replies */}
        {showQuick && (
          <div className="px-6 pb-2">
            <div className="bg-white border border-surface-200 rounded-xl shadow-lift overflow-hidden">
              <div className="px-4 py-2.5 border-b border-surface-100 flex items-center justify-between">
                <span className="text-xs font-bold text-ink-muted uppercase tracking-widest">快速回覆</span>
                <button onClick={() => setShowQuick(false)} className="text-ink-faint hover:text-ink text-xs">✕</button>
              </div>
              <div className="divide-y divide-surface-100 max-h-52 overflow-y-auto">
                {QUICK_REPLIES.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(t)}
                    className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-surface-50 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="px-6 pb-5 pt-3 bg-white border-t border-surface-200">
          <div className="flex items-end gap-3 bg-surface-100 rounded-2xl px-4 py-3 border border-surface-200 focus-within:border-brand focus-within:bg-white transition-all">
            {/* Quick reply toggle */}
            <button
              onClick={() => setShowQuick(p => !p)}
              title="快速回覆"
              className={cn(
                'p-1 rounded-lg transition-colors shrink-0 mb-0.5',
                showQuick ? 'text-brand bg-brand/10' : 'text-ink-faint hover:text-ink',
              )}
            >
              <ChevronDown size={16} className={cn('transition-transform', showQuick && 'rotate-180')} />
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                // auto grow
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKey}
              placeholder="輸入訊息... (Enter 送出，Shift+Enter 換行)"
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none resize-none leading-relaxed overflow-hidden"
              style={{ minHeight: 22, maxHeight: 120 }}
            />

            <div className="flex items-center gap-1 shrink-0 mb-0.5">
              <button className="p-1.5 rounded-lg text-ink-faint hover:text-ink transition-colors" title="附件">
                <Paperclip size={15} />
              </button>
              <button className="p-1.5 rounded-lg text-ink-faint hover:text-ink transition-colors" title="表情符號">
                <Smile size={15} />
              </button>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                className={cn(
                  'ml-1 p-2 rounded-xl transition-all',
                  input.trim()
                    ? 'bg-ink text-white hover:bg-ink/80 shadow-card'
                    : 'bg-surface-200 text-ink-faint cursor-not-allowed',
                )}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-ink-faint mt-1.5 text-center">
            按 Enter 送出 · Shift+Enter 換行 · 點 ↑ 使用快速回覆
          </p>
        </div>
      </div>
    </div>
  )
}
