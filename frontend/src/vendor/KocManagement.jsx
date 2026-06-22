import React, { useState } from 'react'
import { Search, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { kocs, kocApplications, products, campaigns } from './mock'
import { Avatar } from './components/ui' // 移除了預設 Badge, Card，改用內建高級版
import { formatCurrency, cn } from './lib/utils'

const platforms = ['全部', 'Instagram', 'TikTok', 'YouTube']

// 🟢 品牌專屬：文案狀態標籤設計
const contentStatusLabel = {
  pending_content:  { label: '待提交文案', cls: 'text-[#8C8880] bg-[#F5F0E8]' },
  submitted:        { label: '文案審核中', cls: 'text-[#C8522A] bg-[#FDF0ED]' },
  content_approved: { label: '文案核准',   cls: 'text-[#1A1A18] bg-[#E2DDD4]' },
  content_revision: { label: '需修改',     cls: 'text-[#D93025] bg-[#FFF0F0]' },
}

// 🟢 品牌專屬：KOC 帳號狀態標籤
function KocBadge({ status }) {
  const c = status === 'active' 
    ? { label: '運行中', cls: 'bg-[#FDF0ED] text-[#C8522A]', dot: 'bg-[#C8522A]' } 
    : { label: '未開通', cls: 'bg-white border border-[#E2DDD4] text-[#8C8880]', dot: 'bg-[#E2DDD4]' }
    
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider', c.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />{c.label}
    </span>
  )
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
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 🟢 頂部過濾與搜尋列 */}
      <div className="flex items-center gap-4 flex-wrap">
        
        {/* 過濾標籤 (膠囊設計) */}
        <div className="flex gap-2 p-1 bg-[#E2DDD4]/30 rounded-full">
          {platforms.map(p => (
            <button 
              key={p} 
              onClick={() => setPlatform(p)} 
              className={cn(
                'px-6 py-2 rounded-full text-sm font-bold transition-all',
                platform === p ? 'bg-[#1A1A18] text-white shadow-sm' : 'text-[#8C8880] hover:text-[#1A1A18]'
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {/* 搜尋框 */}
        <div className="flex items-center gap-3 bg-white border border-[#E2DDD4] rounded-full px-5 py-2.5 w-64 ml-auto focus-within:border-[#C8522A] transition-colors shadow-sm">
          <Search size={16} className="text-[#8C8880]" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="搜尋 KOC…"
            className="bg-transparent text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none w-full font-bold" 
          />
        </div>
      </div>

      {/* 🟢 KOC 列表 (無邊框圓角高級表格) */}
      <div className="bg-white rounded-[2rem] border border-[#E2DDD4] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                {['KOC', '平台', '粉絲數', '任務數', 'GMV', '狀態', ''].map(h => (
                  <th key={h} className="p-5 text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-[#E2DDD4]">
              {filtered.length > 0 ? filtered.map(k => {
                const apps = getApps(k.id)
                const isExpanded = expanded[k.id]
                
                return (
                  <React.Fragment key={k.id}>
                    {/* ── KOC 主列 ── */}
                    <tr 
                      onClick={() => apps.length > 0 && toggleExpand(k.id)}
                      className={cn(
                        'transition-colors',
                        apps.length > 0 ? 'cursor-pointer hover:bg-[#F8F9FA]' : '',
                        isExpanded ? 'bg-[#F5F0E8]/50' : '',
                      )}
                    >
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <Avatar name={k.name} size="sm" />
                          <div>
                            <div className="text-sm font-bold text-[#1A1A18] mb-0.5">{k.name}</div>
                            <div className="text-[10px] font-bold text-[#8C8880] font-mono tracking-wider">{k.handle}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-xs font-bold text-[#8C8880]">{k.platform}</td>
                      <td className="p-5 text-sm font-black text-[#1A1A18]">{k.followers.toLocaleString()}</td>
                      <td className="p-5 text-xs text-center">
                        <span className={cn(
                          'px-3 py-1.5 rounded-md font-bold tracking-wider',
                          apps.length > 0 ? 'bg-[#FDF0ED] text-[#C8522A]' : 'bg-[#F8F9FA] text-[#8C8880] border border-[#E2DDD4]',
                        )}>
                          {apps.length} 個任務
                        </span>
                      </td>
                      <td className="p-5 text-sm font-black text-[#1A1A18]">{formatCurrency(k.gmv)}</td>
                      <td className="p-5"><KocBadge status={k.status} /></td>
                      <td className="p-5 text-[#8C8880]">
                        {apps.length > 0 && (
                          <div className={cn("p-1.5 rounded-full transition-colors", isExpanded ? "bg-[#E2DDD4] text-[#1A1A18]" : "hover:bg-[#F5F0E8]")}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* ── 展開：每個任務的優惠碼與產品 ── */}
                    {isExpanded && apps.map(app => {
                      const prod = products.find(p => p.id === app.productId)
                      const camp = campaigns.find(c => c.id === app.campaignId)
                      const csCfg = contentStatusLabel[app.contentStatus]
                      
                      return (
                        <tr key={app.id} className="bg-[#F8F9FA]/80">
                          {/* 縮排對齊 KOC 欄 */}
                          <td className="p-4 pl-20">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white border border-[#E2DDD4] flex items-center justify-center text-sm shadow-sm">
                                {prod?.thumbnail}
                              </div>
                              <span className="text-xs font-bold text-[#1A1A18] truncate max-w-[150px]">{prod?.name}</span>
                            </div>
                          </td>
                          {/* 活動名 */}
                          <td className="p-4 text-xs font-bold text-[#8C8880] truncate max-w-[120px]" colSpan={2}>
                            {camp?.name}
                          </td>
                          {/* 文案狀態 */}
                          <td className="p-4 text-center">
                            {csCfg && (
                              <span className={cn('px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider', csCfg.cls)}>
                                {csCfg.label}
                              </span>
                            )}
                          </td>
                          <td />
                          {/* 優惠碼 */}
                          <td className="p-4">
                            <button 
                              onClick={() => copy(app.couponCode)}
                              className="flex items-center justify-between gap-3 bg-white border border-[#E2DDD4] hover:border-[#C8522A] rounded-xl px-4 py-2 text-xs font-mono font-bold text-[#1A1A18] transition-all shadow-sm w-fit group"
                            >
                              <span className="group-hover:text-[#C8522A] transition-colors">{app.couponCode}</span>
                              {copied === app.couponCode
                                ? <Check size={14} className="text-[#C8522A]" />
                                : <Copy size={14} className="text-[#8C8880] group-hover:text-[#C8522A]" />}
                            </button>
                          </td>
                          <td />
                        </tr>
                      )
                    })}
                  </React.Fragment>
                )
              }) : (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-sm font-bold text-[#8C8880]">
                    目前沒有符合條件的 KOC 記錄
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  )
}