import React, { useState } from 'react'
import { Check, X, UserCheck, FileText, Copy, AlertCircle, RotateCcw, Clock, CheckCircle2 } from 'lucide-react'
import { kocApplications as initial, kocs, campaigns, products } from './mock'
import { Avatar } from './components/ui'
import { cn } from './lib/utils'

// 🟢 內建品牌高質感 UI
function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-[1.5rem] border border-[#E2DDD4] shadow-sm overflow-hidden ${className}`}>{children}</div>
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <Card className="p-5 flex flex-col justify-between hover:border-[#B89B6A] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-[#8C8880] tracking-wide">{label}</span>
        <div className="text-[#8C8880]"><Icon size={20} strokeWidth={2.5} /></div>
      </div>
      <div className="text-2xl font-black text-[#1A1A18] font-sans">{value}</div>
    </Card>
  )
}

function Button({ variant = 'default', className, children, ...props }) {
  const variants = {
    brand: 'bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A] shadow-sm',
    outline: 'border border-[#E2DDD4] bg-white text-[#8C8880] hover:text-[#1A1A18] hover:border-[#1A1A18]',
    danger: 'border border-[#FFF0F0] bg-[#FFF0F0] text-[#D93025] hover:bg-[#D93025] hover:text-white',
    warning: 'border border-[#FDF0ED] bg-[#FDF0ED] text-[#C8522A] hover:bg-[#C8522A] hover:text-white',
  }
  return (
    <button className={cn('inline-flex items-center justify-center px-4 py-2.5 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed', variants[variant], className)} {...props}>
      {children}
    </button>
  )
}

// 🟢 品牌色系狀態標籤
const qualBadge = {
  pending_qualification: { label: '待審資格', cls: 'bg-[#F8F9FA] text-[#8C8880]', dot: 'bg-[#8C8880]' },
  approved:              { label: '資格通過', cls: 'bg-[#F5F0E8] text-[#1A1A18]', dot: 'bg-[#1A1A18]' },
  rejected:              { label: '資格拒絕', cls: 'bg-[#FFF0F0] text-[#D93025]', dot: 'bg-[#D93025]' },
}

const contentBadge = {
  pending_content:  { label: '待提交文案', cls: 'bg-white border border-[#E2DDD4] text-[#8C8880]', dot: 'bg-[#E2DDD4]' },
  submitted:        { label: '待審文案',   cls: 'bg-[#FDF0ED] text-[#C8522A]', dot: 'bg-[#C8522A]' },
  content_approved: { label: '文案核准',   cls: 'bg-[#F5F0E8] text-[#1A1A18]', dot: 'bg-[#1A1A18]' },
  content_revision: { label: '需修改',     cls: 'bg-[#FFF0F0] text-[#D93025]', dot: 'bg-[#D93025]' },
}

function Pill({ cfg }) {
  if (!cfg) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider', cfg.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />{cfg.label}
    </span>
  )
}

function compliance(app) {
  return [
    { label: '文案長度 ≥ 50 字',  ok: (app.caption?.length ?? 0) >= 50 },
    { label: '包含優惠碼',         ok: !!(app.couponCode && app.caption?.includes(app.couponCode)) },
    { label: '包含品牌 hashtag',   ok: app.hashtags?.some(h => ['保養','防曬','skincare','保濕'].includes(h)) ?? false },
    { label: '標記品牌帳號',       ok: app.mentions?.includes('@brand_official') ?? false },
    { label: '無違禁詞',           ok: !/(保證|最強|第一|治療)/.test(app.caption ?? '') },
  ]
}

function genCode(kocName, discount) {
  const prefix = (kocName ?? 'KOC').slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')
  return `${prefix}${discount ?? 10}`
}

export default function ContentReview() {
  const [apps, setApps]     = useState(initial)
  const [stage, setStage]   = useState('qualification')
  const [sel, setSel]       = useState(null)
  const [note, setNote]     = useState('')
  const [copied, setCopied] = useState(null)

  const qualCounts = {
    pending:  apps.filter(a => a.qualificationStatus === 'pending_qualification').length,
    approved: apps.filter(a => a.qualificationStatus === 'approved').length,
    rejected: apps.filter(a => a.qualificationStatus === 'rejected').length,
  }
  const contentCounts = {
    pending_content:  apps.filter(a => a.contentStatus === 'pending_content').length,
    submitted:        apps.filter(a => a.contentStatus === 'submitted').length,
    content_approved: apps.filter(a => a.contentStatus === 'content_approved').length,
    content_revision: apps.filter(a => a.contentStatus === 'content_revision').length,
  }

  function approveQual(id) {
    const app  = apps.find(a => a.id === id)
    const koc  = kocs.find(k => k.id === app.kocId)
    const camp = campaigns.find(c => c.id === app.campaignId)
    const code = genCode(koc?.name, camp?.discount)
    setApps(prev => prev.map(a => a.id !== id ? a : {
      ...a, qualificationStatus: 'approved',
      qualificationNote: note || '資格審核通過',
      couponCode: code, contentStatus: 'pending_content',
    }))
    setSel(null); setNote('')
  }

  function rejectQual(id) {
    setApps(prev => prev.map(a => a.id !== id ? a : {
      ...a, qualificationStatus: 'rejected', qualificationNote: note,
    }))
    setSel(null); setNote('')
  }

  function approveContent(id) {
    setApps(prev => prev.map(a => a.id !== id ? a : {
      ...a, contentStatus: 'content_approved', contentNote: note || '文案核准，可發布',
    }))
    setSel(null); setNote('')
  }

  function reviseContent(id) {
    setApps(prev => prev.map(a => a.id !== id ? a : {
      ...a, contentStatus: 'content_revision', contentNote: note,
    }))
    setSel(null); setNote('')
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code); setTimeout(() => setCopied(null), 1500)
  }

  const selApp  = sel ? apps.find(a => a.id === sel) : null
  const selKoc  = selApp ? kocs.find(k => k.id === selApp.kocId) : null
  const selCamp = selApp ? campaigns.find(c => c.id === selApp.campaignId) : null
  const selProd = selApp ? products.find(p => p.id === selApp.productId) : null

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* 🟢 階段切換卡片 */}
      <div className="flex bg-white rounded-2xl border border-[#E2DDD4] p-1 shadow-sm w-fit mx-auto lg:mx-0">
        {[
          { key: 'qualification', label: '1. 資格審核', sub: '決定是否發放推廣優惠碼' },
          { key: 'content',       label: '2. 文案審核', sub: '審核 KOC 提交的貼文內容' },
        ].map(s => (
          <button key={s.key} onClick={() => setStage(s.key)}
            className={cn(
              'px-8 py-3 text-left transition-all rounded-xl',
              stage === s.key ? 'bg-[#F5F0E8] shadow-sm' : 'hover:bg-[#F8F9FA]',
            )}>
            <div className={cn('font-bold text-sm mb-1', stage === s.key ? 'text-[#1A1A18]' : 'text-[#8C8880]')}>{s.label}</div>
            <div className={cn('text-[11px] font-medium tracking-wider', stage === s.key ? 'text-[#8C8880]' : 'text-[#E2DDD4]')}>{s.sub}</div>
          </button>
        ))}
      </div>

      {/* ── Stage 1: 資格審核 ─────────────────────────────────────────────────────────── */}
      {stage === 'qualification' && <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="待審資格" value={qualCounts.pending}  icon={Clock}        />
          <StatCard label="已通過"   value={qualCounts.approved} icon={CheckCircle2} />
          <StatCard label="已拒絕"   value={qualCounts.rejected} icon={X}            />
        </div>

        <Card>
          <table className="w-full">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                {['KOC 資訊','申請活動','申請商品','申請時間','資格狀態','優惠碼'].map(h => (
                  <th key={h} className="p-5 text-left text-xs font-bold text-[#8C8880] uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4]">
              {apps.map(app => {
                const koc  = kocs.find(k => k.id === app.kocId)
                const camp = campaigns.find(c => c.id === app.campaignId)
                const prod = products.find(p => p.id === app.productId)
                const isPending = app.qualificationStatus === 'pending_qualification'
                return (
                  <tr key={app.id}
                    onClick={() => { if (isPending) { setSel(app.id); setNote('') } }}
                    className={cn('transition-colors', isPending ? 'hover:bg-[#F8F9FA] cursor-pointer' : '')}>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={koc?.name ?? '?'} size="sm" />
                        <div>
                          <div className="text-sm font-bold text-[#1A1A18] mb-0.5">{koc?.name}</div>
                          <div className="text-[10px] font-bold text-[#8C8880] font-mono tracking-wider">{koc?.platform} · {koc?.followers?.toLocaleString()} 粉絲</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-xs font-bold text-[#8C8880]">{camp?.name}</td>
                    <td className="p-5 text-xs font-medium text-[#8C8880] truncate max-w-[120px]">{prod?.name}</td>
                    <td className="p-5 text-xs font-medium text-[#8C8880] whitespace-nowrap">{app.appliedAt}</td>
                    <td className="p-5"><Pill cfg={qualBadge[app.qualificationStatus]} /></td>
                    <td className="p-5">
                      {app.couponCode
                        ? <button onClick={e => { e.stopPropagation(); copyCode(app.couponCode) }}
                            className="flex items-center gap-2 bg-[#FDF0ED] px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#C8522A] hover:bg-[#C8522A] hover:text-white transition-colors group">
                            {app.couponCode}
                            {copied === app.couponCode ? <Check size={12} className="text-current"/> : <Copy size={12} className="text-current opacity-70 group-hover:opacity-100"/>}
                          </button>
                        : <span className="text-xs text-[#E2DDD4] font-bold">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>

        {/* 🟢 資格審核 Modal (高質感玻璃設計) */}
        {selApp?.qualificationStatus === 'pending_qualification' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1A18]/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] p-8 shadow-2xl border border-[#E2DDD4] animate-in zoom-in-95 duration-300">
              
              <div className="flex justify-between items-start mb-8">
                <h3 className="text-2xl font-serif font-bold text-[#1A1A18]">審核資格申請</h3>
                <button onClick={() => setSel(null)} className="p-2 text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F5F0E8] rounded-full transition-colors"><X size={20}/></button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-6 border-b border-[#E2DDD4]">
                  <Avatar name={selKoc?.name ?? '?'} size="lg" />
                  <div className="flex-1">
                    <div className="font-bold text-lg text-[#1A1A18] mb-1">{selKoc?.name}</div>
                    <div className="text-sm font-bold text-[#8C8880] mb-0.5">{selKoc?.handle} · {selKoc?.platform}</div>
                    <div className="text-xs font-medium text-[#8C8880]">{selKoc?.followers?.toLocaleString()} 粉絲 · 過去發文 {selKoc?.posts} 篇</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: '申請活動', value: selCamp?.name },
                    { label: '申請商品', value: selProd?.name },
                    { label: '申請時間', value: selApp.appliedAt },
                    { label: '預計折扣', value: `${selCamp?.discount ?? '—'}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#E2DDD4]">
                      <div className="text-[11px] font-bold tracking-widest text-[#8C8880] uppercase mb-1">{label}</div>
                      <div className="text-sm font-bold text-[#1A1A18]">{value ?? '—'}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#FDF0ED] rounded-xl px-5 py-4 text-xs font-bold text-[#C8522A] flex items-start gap-3">
                  <AlertCircle size={16} className="shrink-0"/>
                  審核通過後，系統將自動產生專屬優惠碼並發送給此 KOC。
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#8C8880] uppercase tracking-widest">審核備註</label>
                  <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
                    placeholder="輸入備註說明（拒絕時請說明原因）..."
                    className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl px-5 py-4 text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 resize-none transition-all" />
                </div>
              </div>

              <div className="flex gap-4 pt-8 mt-4 border-t border-[#E2DDD4]">
                <Button variant="outline" onClick={() => setSel(null)} className="flex-1 px-0">取消</Button>
                <Button variant="danger" onClick={() => rejectQual(selApp.id)} className="flex-1 px-0 gap-2" disabled={!note.trim()}>
                  <X size={16}/> 拒絕申請
                </Button>
                <Button variant="brand" onClick={() => approveQual(selApp.id)} className="flex-[2] px-0 gap-2">
                  <UserCheck size={16}/> 通過並發送優惠碼
                </Button>
              </div>
            </div>
          </div>
        )}
      </>}

      {/* ── Stage 2: 文案審核 ─────────────────────────────────────────────────────────── */}
      {stage === 'content' && <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard label="待提交文案" value={contentCounts.pending_content}  icon={Clock}        />
          <StatCard label="待審文案"   value={contentCounts.submitted}        icon={FileText}     />
          <StatCard label="文案核准"   value={contentCounts.content_approved} icon={CheckCircle2} />
          <StatCard label="需修改"     value={contentCounts.content_revision} icon={RotateCcw}    />
        </div>

        <Card>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                {['KOC','活動','商品','優惠碼','文案預覽','提交時間','狀態'].map(h => (
                  <th key={h} className="p-5 text-xs font-bold text-[#8C8880] uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4]">
              {apps.filter(a => a.qualificationStatus === 'approved').map(app => {
                const koc  = kocs.find(k => k.id === app.kocId)
                const camp = campaigns.find(c => c.id === app.campaignId)
                const prod = products.find(p => p.id === app.productId)
                const canReview = app.contentStatus === 'submitted' || app.contentStatus === 'content_revision'
                return (
                  <tr key={app.id}
                    onClick={() => { if (canReview) { setSel(app.id); setNote(app.contentNote ?? '') } }}
                    className={cn('transition-colors', canReview ? 'hover:bg-[#F8F9FA] cursor-pointer' : '')}>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={koc?.name ?? '?'} size="sm" />
                        <div className="text-sm font-bold text-[#1A1A18]">{koc?.name}</div>
                      </div>
                    </td>
                    <td className="p-5 text-xs font-bold text-[#8C8880]">{camp?.name}</td>
                    <td className="p-5 text-xs font-medium text-[#8C8880] truncate max-w-[120px]">{prod?.name}</td>
                    <td className="p-5 text-xs font-mono font-bold text-[#C8522A]">{app.couponCode}</td>
                    <td className="p-5 text-xs text-[#8C8880] max-w-[200px]">
                      {app.caption
                        ? <span className="line-clamp-2 font-medium">{app.caption}</span>
                        : <span className="text-[#E2DDD4] italic">尚未提交</span>}
                    </td>
                    <td className="p-5 text-xs font-medium text-[#8C8880] whitespace-nowrap">{app.submittedAt ?? '—'}</td>
                    <td className="p-5"><Pill cfg={contentBadge[app.contentStatus]} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>

        {/* 🟢 文案審核 Modal */}
        {selApp && (selApp.contentStatus === 'submitted' || selApp.contentStatus === 'content_revision') && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1A18]/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] p-10 shadow-2xl border border-[#E2DDD4] animate-in zoom-in-95 duration-300">
              
              <div className="flex justify-between items-start mb-8 pb-6 border-b border-[#E2DDD4]">
                <div className="flex items-center gap-5">
                  <Avatar name={selKoc?.name ?? '?'} size="lg" />
                  <div>
                    <div className="text-2xl font-serif font-bold text-[#1A1A18] mb-1">{selKoc?.name}</div>
                    <div className="text-sm font-bold text-[#8C8880]">{selKoc?.handle} · {selKoc?.platform}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Pill cfg={contentBadge[selApp.contentStatus]} />
                  <span className="text-xs text-[#C8522A] bg-[#FDF0ED] px-3 py-1 rounded-md font-mono font-bold">優惠碼: {selApp.couponCode}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* 左側：文案預覽 */}
                <div>
                  <div className="text-xs font-bold text-[#8C8880] uppercase tracking-widest mb-3">貼文預覽</div>
                  <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-3xl p-6 text-sm text-[#1A1A18] leading-relaxed min-h-[200px] whitespace-pre-wrap font-medium">
                    {selApp.caption}
                    
                    <div className="flex flex-wrap gap-2 mt-6">
                      {selApp.hashtags?.map(h => <span key={h} className="text-[11px] font-bold bg-white border border-[#E2DDD4] text-[#1A1A18] px-3 py-1 rounded-full">#{h}</span>)}
                      {selApp.mentions?.map(m => <span key={m} className="text-[11px] font-bold bg-[#E2DDD4]/50 text-[#1A1A18] px-3 py-1 rounded-full">{m}</span>)}
                    </div>
                  </div>
                </div>

                {/* 右側：合規檢查與操作 */}
                <div className="flex flex-col">
                  <div className="text-xs font-bold text-[#8C8880] uppercase tracking-widest mb-3">合規檢查</div>
                  <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-3xl p-5 space-y-3 mb-6">
                    {compliance(selApp).map(c => (
                      <div key={c.label} className={cn('flex items-center gap-3 text-xs font-bold px-4 py-3 rounded-xl border',
                        c.ok ? 'bg-[#F5F0E8] border-[#E2DDD4] text-[#1A1A18]' : 'bg-[#FFF0F0] border-[#FFF0F0] text-[#D93025]')}>
                        {c.ok ? <Check size={14}/> : <X size={14}/>} {c.label}
                      </div>
                    ))}
                  </div>

                  <div className="text-xs font-bold text-[#8C8880] uppercase tracking-widest mb-3">審核意見</div>
                  <textarea rows={4} value={note} onChange={e => setNote(e.target.value)}
                    placeholder="若需修改請輸入原因..."
                    className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl px-5 py-4 text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 resize-none transition-all flex-1" />
                </div>
              </div>

              <div className="flex gap-4 pt-8 mt-8 border-t border-[#E2DDD4]">
                <Button variant="outline" onClick={() => setSel(null)} className="px-10">取消</Button>
                <div className="flex-1" />
                <Button variant="warning" onClick={() => reviseContent(selApp.id)} className="px-8 gap-2" disabled={!note.trim()}>
                  <RotateCcw size={16}/> 退回修改
                </Button>
                <Button variant="brand" onClick={() => approveContent(selApp.id)} className="px-8 gap-2">
                  <Check size={16}/> 核准發布
                </Button>
              </div>
            </div>
          </div>
        )}
      </>}
    </div>
  )
}