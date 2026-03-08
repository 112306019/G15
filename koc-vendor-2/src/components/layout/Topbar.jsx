import { Bell, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const titles = {
  '/':           { title: '總覽',     sub: '歡迎回來，查看您的 KOC 行銷成效' },
  '/campaigns':  { title: '活動管理', sub: '建立與管理 KOC 行銷活動' },
  '/products':   { title: '商品管理', sub: '管理上架商品、設定 KOC 優惠及庫存' },
  '/koc':        { title: 'KOC 管理', sub: '追蹤 KOC 推廣成效與優惠碼使用情況' },
  '/orders':     { title: '訂單追蹤', sub: '透過優惠碼追蹤每筆 KOC 帶入訂單' },
  '/analytics':  { title: '數據分析', sub: '深入了解行銷活動成效' },
  '/review':     { title: '文案審核', sub: '審核 KOC 提交的貼文文案，核准後才可發布' },
  '/chat':       { title: '聊天室',   sub: '與 KOC 即時溝通，傳送活動資訊與審核回饋' },
  '/settings':   { title: '設定',     sub: '管理帳號與通知偏好' },
}

export function Topbar() {
  const { pathname } = useLocation()
  const key = Object.keys(titles).find(k => k !== '/' && pathname.startsWith(k)) ?? '/'
  const { title, sub } = titles[key] ?? titles['/']

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-surface-200 bg-white/80 backdrop-blur sticky top-0 z-20">
      <div>
        <h1 className="font-display font-bold text-xl text-ink">{title}</h1>
        <p className="text-xs text-ink-faint mt-0.5">{sub}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 bg-surface-100 border border-surface-200 rounded-lg px-3 py-2 w-52 group focus-within:border-brand transition-colors">
          <Search size={14} className="text-ink-faint group-focus-within:text-brand transition-colors" />
          <input
            type="text"
            placeholder="搜尋..."
            className="bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none w-full"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-surface-100 transition-colors text-ink-muted hover:text-ink">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand border-2 border-white" />
        </button>

        {/* Date */}
        <div className="text-xs text-ink-faint font-mono hidden md:block">
          {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
    </header>
  )
}
