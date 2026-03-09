import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Megaphone, Users, ShoppingBag,
  BarChart3, Settings, ChevronLeft, ChevronRight,
  FileSearch, MessageCircle, Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { contentSubmissions, chatConversations } from '@/data/mock'

const navItems = [
  { to: '/', label: '總覽', icon: LayoutDashboard },
  { to: '/campaigns', label: '活動管理', icon: Megaphone },
  { to: '/products', label: '商品管理', icon: Package },
  { to: '/koc', label: 'KOC 管理', icon: Users },
  { to: '/orders', label: '訂單追蹤', icon: ShoppingBag },
  { to: '/analytics', label: '數據分析', icon: BarChart3 },
  { to: '/review', label: '文案審核', icon: FileSearch, badgeKey: 'review' },
  { to: '/chat', label: '聊天室', icon: MessageCircle, badgeKey: 'chat' },
  { to: '/settings', label: '設定', icon: Settings },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const pendingReviews = contentSubmissions.filter(s => s.status === 'pending' || s.status === 'revision').length
  const unreadMessages = chatConversations.reduce((s, c) => s + c.unread, 0)
  const badges = { review: pendingReviews, chat: unreadMessages }

  return (
    <aside className={cn(
      'sticky top-0 z-30 flex flex-col bg-ink h-screen transition-all duration-300 ease-in-out shrink-0',
      collapsed ? 'w-16' : 'w-56',
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-white/10',
        collapsed && 'justify-center px-0',
      )}>
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-display font-bold text-sm shrink-0">
          V
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-display font-bold text-white text-sm leading-tight">Vendor</div>
            <div className="text-white/40 text-[10px] tracking-wider">廠商後台</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-0.5">
        {navItems.map(({ to, label, icon: Icon, badgeKey }) => {
          const active = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to)
          const badgeCount = badgeKey ? badges[badgeKey] : 0

          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span className="flex-1">{label}</span>}
              {!collapsed && badgeCount > 0 && (
                <span className="text-[10px] font-bold bg-brand text-white px-1.5 py-0.5 rounded-full leading-none">
                  {badgeCount}
                </span>
              )}
              {collapsed && badgeCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand" />
              )}
              {active && !collapsed && badgeCount === 0 && (
                <span className="ml-auto w-1 h-4 rounded-full bg-brand" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Vendor info */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold shrink-0">
              A
            </div>
            <div className="overflow-hidden">
              <div className="text-white text-xs font-semibold truncate">廠商A</div>
              <div className="text-white/40 text-[10px]">Pro 方案</div>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(p => !p)}
        className={cn(
          'absolute -right-3 top-7 w-6 h-6 rounded-full bg-white border border-surface-200 shadow-card',
          'flex items-center justify-center text-ink-muted hover:text-ink transition-colors z-10',
        )}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
