import { Outlet, useLocation } from 'react-router-dom'
import VendorSidebar from './Sidebar.jsx'
import { Search, Bell } from 'lucide-react'

const titles = {
  '/vendor':           { title: '總覽',     sub: '歡迎回來，查看您的 KOC 行銷成效' },
  '/vendor/campaigns': { title: '活動管理', sub: '建立與管理 KOC 行銷活動' },
  '/vendor/products':  { title: '商品管理', sub: '管理上架商品、設定 KOC 優惠及庫存' },
  '/vendor/koc':       { title: 'KOC 管理', sub: '追蹤 KOC 推廣成效與優惠碼使用情況' },
  '/vendor/orders':    { title: '訂單追蹤', sub: '透過優惠碼追蹤每筆 KOC 帶入訂單' },
  '/vendor/analytics': { title: '數據分析', sub: '深入了解行銷活動成效' },
  '/vendor/review':    { title: '文案審核', sub: '審核 KOC 提交的貼文文案' },
  '/vendor/chat':      { title: '聊天室',   sub: '與 KOC 即時溝通' },
  '/vendor/settings':  { title: '設定',     sub: '管理帳號與通知偏好' },
}

export default function VendorLayout() {
  const { pathname } = useLocation()
  const key = Object.keys(titles).filter(k => k !== '/vendor').find(k => pathname.startsWith(k)) ?? '/vendor'
  const { title, sub } = titles[key] ?? titles['/vendor']
  const isChat = pathname === '/vendor/chat'

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <VendorSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-[65px] bg-white border-b border-gray-100 flex items-center px-8 gap-6 shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-slate-900 leading-tight text-base">{title}</h1>
            <p className="text-xs text-gray-400 truncate">{sub}</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-52 focus-within:border-amber-400 transition-colors">
            <Search size={13} className="text-gray-300" />
            <input type="text" placeholder="搜尋..." className="bg-transparent text-sm text-slate-800 placeholder:text-gray-300 outline-none w-full" />
          </div>
          <button className="relative p-2 rounded-xl text-gray-400 hover:text-slate-700 hover:bg-gray-100 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </header>

        {/* Page content */}
        <main className={cn('flex-1 overflow-auto', isChat ? '' : 'p-8')}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function cn(...c) { return c.filter(Boolean).join(' ') }
