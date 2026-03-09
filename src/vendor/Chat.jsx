import { useState, useRef, useEffect } from 'react'
import { Send, Smile, Search } from 'lucide-react'
import { chatConversations as initial, kocs } from './mock'
import { Avatar } from './components/ui'
import { formatCurrency, cn } from './lib/utils'

function cn2(...c) { return c.filter(Boolean).join(' ') }

export default function Chat() {
  const [convos, setConvos] = useState(initial)
  const [activeId, setActive] = useState('k1')
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  const kocList = kocs.filter(k => convos[k.id])
  const activeKoc = kocs.find(k => k.id === activeId)
  const msgs = convos[activeId]?.messages ?? []

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  function selectContact(id) {
    setActive(id)
    setConvos(prev => ({ ...prev, [id]: { ...prev[id], unread: 0 } }))
  }

  function send() {
    if (!input.trim()) return
    const msg = { id: Date.now(), sender: 'vendor', text: input.trim(), time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }
    setConvos(prev => ({ ...prev, [activeId]: { ...prev[activeId], messages: [...prev[activeId].messages, msg] } }))
    setInput('')
  }

  const totalUnread = Object.values(convos).reduce((s, c) => s + (c.unread || 0), 0)

  return (
    <div className="flex h-[calc(100vh-65px)]">
      {/* Contact list */}
      <div className="w-72 border-r border-gray-100 flex flex-col bg-white shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 text-sm">聊天室</h2>
            {totalUnread > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{totalUnread}</span>}
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Search size={12} className="text-gray-300" />
            <input placeholder="搜尋…" className="bg-transparent text-xs text-slate-800 placeholder:text-gray-300 outline-none w-full" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {kocList.map(k => {
            const c = convos[k.id]
            const last = c.messages.at(-1)
            const isActive = k.id === activeId
            return (
              <div key={k.id} onClick={() => selectContact(k.id)}
                className={cn2('flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors border-l-2',
                  isActive ? 'bg-amber-50 border-amber-400' : 'hover:bg-gray-50 border-transparent')}>
                <div className="relative shrink-0">
                  <Avatar name={k.name} size="md" />
                  <span className={cn2('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                    k.platform === 'Instagram' ? 'bg-pink-500' : k.platform === 'TikTok' ? 'bg-black' : 'bg-red-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate">{k.name}</span>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-1">{last?.time}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 truncate mt-0.5">
                    {last?.sender === 'vendor' ? '我：' : ''}{last?.text}
                  </div>
                </div>
                {c.unread > 0 && <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">{c.unread}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 shrink-0">
          <div className="relative shrink-0">
            <Avatar name={activeKoc?.name ?? '?'} size="lg" />
            <span className={cn2('absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white',
              activeKoc?.platform === 'Instagram' ? 'bg-pink-500' : activeKoc?.platform === 'TikTok' ? 'bg-black' : 'bg-red-500')} />
          </div>
          <div>
            <div className="font-bold text-slate-800">{activeKoc?.name}</div>
            <div className="text-xs text-gray-400">{activeKoc?.handle} · {activeKoc?.platform} · {activeKoc?.followers?.toLocaleString()} 粉絲</div>
          </div>
          <div className="ml-auto flex gap-4 text-right">
            {[
              { label: 'GMV', value: formatCurrency(activeKoc?.gmv ?? 0) },
              { label: '貼文數', value: activeKoc?.posts ?? 0 },
              { label: '優惠碼', value: activeKoc?.code ?? '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-[10px] text-gray-400">{label}</div>
                <div className="text-xs font-bold text-slate-800">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {msgs.map(m => (
            <div key={m.id} className={cn2('flex', m.sender === 'vendor' ? 'justify-end' : 'justify-start')}>
              <div className={cn2('max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                m.sender === 'vendor' ? 'bg-slate-800 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-slate-700 shadow-sm rounded-bl-sm')}>
                {m.text}
                <div className={cn2('text-[10px] mt-1', m.sender === 'vendor' ? 'text-slate-400 text-right' : 'text-gray-400')}>{m.time}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <Smile size={20} className="text-gray-300 cursor-pointer hover:text-amber-400 transition-colors shrink-0" />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="輸入訊息…"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
            />
            <button onClick={send} disabled={!input.trim()}
              className="bg-amber-500 text-white p-2.5 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
