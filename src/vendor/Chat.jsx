import { useState, useRef, useEffect } from 'react'
import { Send, Smile, Search, Tag } from 'lucide-react'
import { chatConversations as initial, kocs, kocApplications, products, campaigns } from './mock'
import { Avatar } from './components/ui'
import { cn } from './lib/utils'

// 依 kocId 分組，列出每個 KOC 有哪些 appId 的對話
function groupByKoc(convos) {
  const map = {}
  Object.entries(convos).forEach(([appId, convo]) => {
    const { kocId } = convo
    if (!map[kocId]) map[kocId] = []
    map[kocId].push(appId)
  })
  return map
}

export default function Chat() {
  const [convos, setConvos]     = useState(initial)
  const [activeKocId, setActiveKocId] = useState('k2')
  const [activeAppId, setActiveAppId] = useState('app-002')
  const [input, setInput]       = useState('')
  const bottomRef               = useRef(null)

  const kocMap    = groupByKoc(convos)
  const kocIdList = Object.keys(kocMap)

  const msgs = convos[activeAppId]?.messages ?? []

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, activeAppId])

  // 點選 KOC → 自動選第一個 tab
  function selectKoc(kocId) {
    setActiveKocId(kocId)
    const firstApp = kocMap[kocId]?.[0]
    if (firstApp) {
      setActiveAppId(firstApp)
      markRead(firstApp)
    }
  }

  // 點選 tab
  function selectTab(appId) {
    setActiveAppId(appId)
    markRead(appId)
  }

  function markRead(appId) {
    setConvos(prev => ({
      ...prev,
      [appId]: { ...prev[appId], unread: 0 },
    }))
  }

  function send() {
    if (!input.trim()) return
    const msg = {
      id: Date.now(),
      sender: 'vendor',
      text: input.trim(),
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
    }
    setConvos(prev => ({
      ...prev,
      [activeAppId]: { ...prev[activeAppId], messages: [...prev[activeAppId].messages, msg] },
    }))
    setInput('')
  }

  const totalUnread = Object.values(convos).reduce((s, c) => s + (c.unread || 0), 0)

  // 取得 KOC 的 tab 資料（對應 kocApplications）
  function getTabsForKoc(kocId) {
    const appIds = kocMap[kocId] ?? []
    return appIds.map(appId => {
      const app  = kocApplications.find(a => a.id === appId)
      const prod = app ? products.find(p => p.id === app.productId) : null
      const unread = convos[appId]?.unread ?? 0
      return { appId, app, prod, unread }
    })
  }

  const activeKoc  = kocs.find(k => k.id === activeKocId)
  const activeApp  = kocApplications.find(a => a.id === activeAppId)
  const activeProd = activeApp ? products.find(p => p.id === activeApp.productId) : null
  const activeCamp = activeApp ? campaigns.find(c => c.id === activeApp.campaignId) : null
  const tabs       = getTabsForKoc(activeKocId)

  return (
    <div className="flex h-[calc(100vh-65px)]">

      {/* ── 左側：KOC 列表 ──────────────────────────────────────────────── */}
      <div className="w-64 border-r border-gray-100 flex flex-col bg-white shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 text-sm">聊天室</h2>
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{totalUnread}</span>
            )}
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Search size={12} className="text-gray-300" />
            <input placeholder="搜尋…" className="bg-transparent text-xs text-slate-800 placeholder:text-gray-300 outline-none w-full" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {kocIdList.map(kocId => {
            const koc     = kocs.find(k => k.id === kocId)
            if (!koc) return null
            const appIds  = kocMap[kocId]
            const kocUnread = appIds.reduce((s, id) => s + (convos[id]?.unread ?? 0), 0)
            const lastMsg = appIds
              .flatMap(id => convos[id]?.messages ?? [])
              .sort((a, b) => b.id - a.id)[0]
            const isActive = kocId === activeKocId

            return (
              <div key={kocId} onClick={() => selectKoc(kocId)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors border-l-2',
                  isActive ? 'bg-amber-50 border-amber-400' : 'hover:bg-gray-50 border-transparent',
                )}>
                <div className="relative shrink-0">
                  <Avatar name={koc.name} size="md" />
                  <span className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                    koc.platform === 'Instagram' ? 'bg-pink-500' : koc.platform === 'TikTok' ? 'bg-black' : 'bg-red-500',
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate">{koc.name}</span>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-1">{lastMsg?.time}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {appIds.length} 個任務
                  </div>
                </div>
                {kocUnread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                    {kocUnread}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 右側：對話區 ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">

        {/* KOC 資訊列 */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 shrink-0">
          <div className="relative shrink-0">
            <Avatar name={activeKoc?.name ?? '?'} size="lg" />
            <span className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white',
              activeKoc?.platform === 'Instagram' ? 'bg-pink-500' : activeKoc?.platform === 'TikTok' ? 'bg-black' : 'bg-red-500',
            )} />
          </div>
          <div>
            <div className="font-bold text-slate-800">{activeKoc?.name}</div>
            <div className="text-xs text-gray-400">{activeKoc?.handle} · {activeKoc?.platform} · {activeKoc?.followers?.toLocaleString()} 粉絲</div>
          </div>
        </div>

        {/* 優惠碼 Tabs */}
        <div className="bg-white border-b border-gray-100 px-6 flex gap-1 shrink-0">
          {tabs.map(({ appId, app, prod, unread }) => (
            <button key={appId} onClick={() => selectTab(appId)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap',
                activeAppId === appId
                  ? 'border-amber-500 text-amber-700'
                  : 'border-transparent text-gray-400 hover:text-slate-700',
              )}>
              <Tag size={11} />
              <span className="font-mono font-bold">{app?.couponCode ?? appId}</span>
              <span className="text-gray-400 font-normal hidden sm:inline">
                · {prod?.name?.length > 8 ? prod.name.slice(0, 8) + '…' : prod?.name}
              </span>
              {unread > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 目前 tab 的任務資訊小條 */}
        {activeApp && (
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-2 flex items-center gap-4 text-xs text-amber-700 shrink-0">
            <span className="font-bold">{activeProd?.thumbnail} {activeProd?.name}</span>
            <span className="text-amber-400">·</span>
            <span>{activeCamp?.name}</span>
            <span className="text-amber-400">·</span>
            <span className="font-mono font-bold">優惠碼：{activeApp.couponCode}</span>
            <span className="text-amber-400">·</span>
            <span className={{
              pending_content:  '待提交文案',
              submitted:        '文案審核中',
              content_approved: '文案核准',
              content_revision: '文案需修改',
            }[activeApp.contentStatus] ?? '—'}></span>

          </div>
        )}

        {/* 訊息區 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {msgs.map(m => (
            <div key={m.id} className={cn('flex', m.sender === 'vendor' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                m.sender === 'vendor'
                  ? 'bg-slate-800 text-white rounded-br-sm'
                  : 'bg-white border border-gray-100 text-slate-700 shadow-sm rounded-bl-sm',
              )}>
                {m.text}
                <div className={cn('text-[10px] mt-1', m.sender === 'vendor' ? 'text-slate-400 text-right' : 'text-gray-400')}>
                  {m.time}
                </div>
              </div>
            </div>
          ))}
          {msgs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-20 text-gray-300">
              <Tag size={28} className="mb-3" />
              <p className="text-sm">尚無訊息，開始與 KOC 溝通吧</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 輸入區 */}
        <div className="bg-white border-t border-gray-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <Smile size={20} className="text-gray-300 cursor-pointer hover:text-amber-400 transition-colors shrink-0" />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="輸入訊息… (Enter 送出)"
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
