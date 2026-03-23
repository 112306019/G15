import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Megaphone, Package, Users, ShoppingBag,
  BarChart3, FileSearch, MessageCircle, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from './lib/utils'
import { kocApplications, chatConversations } from './mock'

const navItems = [
  { to: '/vendor', label: '總覽', icon: LayoutDashboard },
  { to: '/vendor/campaigns', label: '活動管理', icon: Megaphone },
  { to: '/vendor/products', label: '商品管理', icon: Package },
  { to: '/vendor/koc', label: 'KOC 管理', icon: Users },
  { to: '/vendor/orders', label: '訂單追蹤', icon: ShoppingBag },
  { to: '/vendor/analytics', label: '數據分析', icon: BarChart3 },
  { to: '/vendor/review', label: '任務審核', icon: FileSearch, badgeKey: 'review' },
  { to: '/vendor/chat', label: '聊天室', icon: MessageCircle, badgeKey: 'chat' },
  { to: '/vendor/settings', label: '設定', icon: Settings },
]

export default function VendorSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  const reviewBadge = kocApplications.filter(a =>
    a.qualificationStatus === 'pending_qualification' ||
    a.contentStatus === 'submitted' ||
    a.contentStatus === 'content_revision'
  ).length
  const chatBadge = Object.values(chatConversations).reduce((s, c) => s + (c.unread || 0), 0)
  const badges = { review: reviewBadge, chat: chatBadge }

  return (
    <aside className={cn(
      'h-screen sticky top-0 flex flex-col bg-slate-900 transition-all duration-200 shrink-0',
      collapsed ? 'w-16' : 'w-56',
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-700/60">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-white text-xs font-black">V</div>
            <span className="font-black text-white tracking-wide text-sm">Vendor</span>
          </div>
        )}
        {collapsed && <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-white text-xs font-black mx-auto">V</div>}
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <ChevronLeft size={15} />
          </button>
        )}
      </div>

      {collapsed && (
        <button onClick={() => setCollapsed(false)} className="mx-auto mt-2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <ChevronRight size={15} />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {navItems.map(({ to, label, icon: Icon, badgeKey }) => {
          const count = badgeKey ? badges[badgeKey] : 0
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/vendor'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative',
                isActive
                  ? 'bg-amber-500 text-white font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white',
              )}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{label}</span>}
              {!collapsed && count > 0 && (
                <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {count}
                </span>
              )}
              {collapsed && count > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Switch to KOC */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-slate-700/60">
          <button
            onClick={() => navigate('/')}
            className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors text-left py-1"
          >
            ← 切換至 KOC 端
          </button>
        </div>
      )}

      {/* Vendor label */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">A</div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">廠商A</div>
              <div className="text-[10px] text-slate-500 truncate">廠商後台</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}