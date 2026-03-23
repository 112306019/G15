import { useState } from 'react'
import { Search, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { kocs, kocApplications, products, campaigns } from './mock'
import { Card, Badge, Avatar } from './components/ui'
import { formatCurrency, cn } from './lib/utils'

const platforms = ['全部', 'Instagram', 'TikTok', 'YouTube']

const contentStatusLabel = {
  pending_content:  { label: '待提交文案', cls: 'text-gray-400' },
  submitted:        { label: '文案審核中', cls: 'text-amber-600' },
  content_approved: { label: '文案核准',   cls: 'text-emerald-600' },
  content_revision: { label: '需修改',     cls: 'text-orange-600' },
}

export default function KocManagement() {
  const [platform, setPlatform] = useState('全部')
  const [search, setSearch]     = useState('')
  const [copied, setCopied]     = useState(null)
  const [expanded, setExpanded] = useState({})

  const filtered = kocs.filter(k =>
    (platform === '全部' || k.platform === platform) &&
    (!search || k.name.includes(search) || k.handle.includes(search))
  )

  // 取得某 KOC 所有已通過資格的任務
  function getApps(kocId) {
    return kocApplications.filter(a =>
      a.kocId === kocId && a.qualificationStatus === 'approved'
    )
  }

  function copy(code) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 1500)
  }

  function toggleExpand(kocId) {
    setExpanded(prev => ({ ...prev, [kocId]: !prev[kocId] }))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {platforms.map(p => (
            <button key={p} onClick={() => setPlatform(p)} className={cn(
              'px-4 py-1.5 rounded-xl text-sm font-semibold transition-all',
              platform === p ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-slate-800',
            )}>{p}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 w-52 ml-auto focus-within:border-amber-400 transition-colors">
          <Search size={13} className="text-gray-300" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋 KOC…"
            className="bg-transparent text-sm text-slate-800 placeholder:text-gray-300 outline-none w-full" />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['KOC', '平台', '粉絲數', '任務數', 'GMV', '狀態', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(k => {
                const apps = getApps(k.id)
                const isExpanded = expanded[k.id]
                return (
                  <>
                    {/* ── KOC 主列 ── */}
                    <tr key={k.id}
                      onClick={() => apps.length > 0 && toggleExpand(k.id)}
                      className={cn(
                        'border-b border-gray-100 transition-colors',
                        apps.length > 0 ? 'cursor-pointer hover:bg-gray-50' : '',
                        isExpanded ? 'bg-amber-50/60' : '',
                      )}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={k.name} size="sm" />
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{k.name}</div>
                            <div className="text-[10px] text-gray-400">{k.handle}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{k.platform}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 font-semibold">{k.followers.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-center">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full font-bold',
                          apps.length > 0 ? 'bg-amber-50 text-amber-700' : 'text-gray-300',
                        )}>
                          {apps.length} 個任務
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800">{formatCurrency(k.gmv)}</td>
                      <td className="px-4 py-3"><Badge status={k.status} /></td>
                      <td className="px-4 py-3 text-gray-300">
                        {apps.length > 0 && (
                          isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />
                        )}
                      </td>
                    </tr>

                    {/* ── 展開：每個任務的優惠碼與產品 ── */}
                    {isExpanded && apps.map(app => {
                      const prod = products.find(p => p.id === app.productId)
                      const camp = campaigns.find(c => c.id === app.campaignId)
                      const csCfg = contentStatusLabel[app.contentStatus]
                      return (
                        <tr key={app.id} className="border-b border-gray-50 bg-amber-50/30">
                          {/* 縮排對齊 KOC 欄 */}
                          <td className="px-4 py-2.5 pl-14">
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                              <span>{prod?.thumbnail}</span>
                              <span className="font-semibold text-slate-600 truncate max-w-[120px]">{prod?.name}</span>
                            </div>
                          </td>
                          {/* 活動名 */}
                          <td className="px-4 py-2.5 text-[10px] text-gray-400 truncate max-w-[100px]" colSpan={2}>
                            {camp?.name}
                          </td>
                          {/* 文案狀態 */}
                          <td className="px-4 py-2.5 text-center">
                            {csCfg && (
                              <span className={cn('text-[10px] font-semibold', csCfg.cls)}>
                                {csCfg.label}
                              </span>
                            )}
                          </td>
                          {/* 空白佔位 */}
                          <td />
                          {/* 優惠碼 */}
                          <td className="px-4 py-2.5">
                            <button onClick={() => copy(app.couponCode)}
                              className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-amber-700 hover:bg-amber-50 transition-colors">
                              {app.couponCode}
                              {copied === app.couponCode
                                ? <Check size={11} className="text-emerald-500" />
                                : <Copy size={11} className="text-amber-300" />}
                            </button>
                          </td>
                          <td />
                        </tr>
                      )
                    })}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
