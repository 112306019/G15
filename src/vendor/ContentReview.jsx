import { useState } from 'react'
import { Check, X, UserCheck, FileText, Copy, AlertCircle, RotateCcw, Clock, CheckCircle2 } from 'lucide-react'
import { kocApplications as initial, kocs, campaigns, products } from './mock'
import { Card, Button, Modal, Avatar, StatCard } from './components/ui'
import { cn } from './lib/utils'

const qualBadge = {
  pending_qualification: { label: '待審資格', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',       dot: 'bg-blue-500'    },
  approved:              { label: '資格通過', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  rejected:              { label: '資格拒絕', cls: 'bg-red-50 text-red-600 ring-1 ring-red-200',            dot: 'bg-red-400'     },
}
const contentBadge = {
  pending_content:  { label: '待提交文案', cls: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',          dot: 'bg-gray-400'    },
  submitted:        { label: '待審文案',   cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',        dot: 'bg-amber-500'   },
  content_approved: { label: '文案核准',   cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',  dot: 'bg-emerald-500' },
  content_revision: { label: '需修改',     cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',     dot: 'bg-orange-500'  },
}

function Pill({ cfg }) {
  if (!cfg) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold', cfg.cls)}>
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
    <div className="space-y-5">

      {/* 階段切換 */}
      <div className="flex rounded-2xl overflow-hidden border border-gray-100">
        {[
          { key: 'qualification', label: '① KOC 資格審核', sub: '審核申請資格，通過後自動發放優惠碼' },
          { key: 'content',       label: '② 文案審核',     sub: '審核 KOC 提交的推廣文案' },
        ].map(s => (
          <button key={s.key} onClick={() => setStage(s.key)}
            className={cn(
              'flex-1 px-6 py-4 text-left transition-all border-b-2',
              stage === s.key ? 'border-amber-500 bg-amber-50' : 'border-transparent hover:bg-gray-50',
            )}>
            <div className={cn('font-bold text-sm', stage === s.key ? 'text-amber-700' : 'text-slate-600')}>{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </button>
        ))}
      </div>

      {/* ── Stage 1 ─────────────────────────────────────────────────────────── */}
      {stage === 'qualification' && <>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="待審資格" value={qualCounts.pending}  icon={Clock}        />
          <StatCard label="已通過"   value={qualCounts.approved} icon={CheckCircle2} />
          <StatCard label="已拒絕"   value={qualCounts.rejected} icon={X}            />
        </div>

        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['KOC 資訊','申請活動','申請商品','申請時間','資格狀態','優惠碼'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apps.map(app => {
                const koc  = kocs.find(k => k.id === app.kocId)
                const camp = campaigns.find(c => c.id === app.campaignId)
                const prod = products.find(p => p.id === app.productId)
                const isPending = app.qualificationStatus === 'pending_qualification'
                return (
                  <tr key={app.id}
                    onClick={() => { if (isPending) { setSel(app.id); setNote('') } }}
                    className={cn('border-b border-gray-50 transition-colors', isPending && 'hover:bg-amber-50 cursor-pointer')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={koc?.name ?? '?'} size="sm" />
                        <div>
                          <div className="text-xs font-semibold text-slate-800">{koc?.name}</div>
                          <div className="text-[10px] text-gray-400">{koc?.platform} · {koc?.followers?.toLocaleString()} 粉絲</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{camp?.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[120px]">{prod?.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{app.appliedAt}</td>
                    <td className="px-4 py-3"><Pill cfg={qualBadge[app.qualificationStatus]} /></td>
                    <td className="px-4 py-3">
                      {app.couponCode
                        ? <button onClick={e => { e.stopPropagation(); copyCode(app.couponCode) }}
                            className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-700 hover:bg-amber-50 hover:border-amber-200 transition-colors">
                            {app.couponCode}
                            {copied === app.couponCode ? <Check size={11} className="text-emerald-500"/> : <Copy size={11} className="text-gray-300"/>}
                          </button>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>

        {/* 資格審核 Modal */}
        {selApp?.qualificationStatus === 'pending_qualification' && (
          <Modal open onClose={() => setSel(null)} title="審核 KOC 資格申請" size="lg">
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <Avatar name={selKoc?.name ?? '?'} size="lg" />
                <div className="flex-1">
                  <div className="font-bold text-slate-800">{selKoc?.name}</div>
                  <div className="text-xs text-gray-400">{selKoc?.handle} · {selKoc?.platform}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{selKoc?.followers?.toLocaleString()} 粉絲 · 過去發文 {selKoc?.posts} 篇</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: '申請活動', value: selCamp?.name },
                  { label: '申請商品', value: selProd?.name },
                  { label: '申請時間', value: selApp.appliedAt },
                  { label: '活動折扣', value: `${selCamp?.discount ?? '—'}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-[10px] text-gray-400 mb-0.5">{label}</div>
                    <div className="text-sm font-semibold text-slate-700">{value ?? '—'}</div>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5"/>
                審核通過後將自動產生優惠碼並發放給此 KOC，KOC 即可購買商品開始執行任務。
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">審核備註</label>
                <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
                  placeholder="輸入備註說明（拒絕時請說明原因）..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-amber-400/40 resize-none" />
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <Button variant="outline" onClick={() => setSel(null)} className="flex-1">取消</Button>
                <Button variant="outline" onClick={() => rejectQual(selApp.id)}
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50" disabled={!note.trim()}>
                  <X size={14}/> 拒絕申請
                </Button>
                <Button variant="brand" onClick={() => approveQual(selApp.id)} className="flex-[2]">
                  <UserCheck size={14}/> 通過並發放優惠碼
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </>}

      {/* ── Stage 2 ─────────────────────────────────────────────────────────── */}
      {stage === 'content' && <>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="待提交文案" value={contentCounts.pending_content}  icon={Clock}        />
          <StatCard label="待審文案"   value={contentCounts.submitted}        icon={FileText}     />
          <StatCard label="文案核准"   value={contentCounts.content_approved} icon={CheckCircle2} />
          <StatCard label="需修改"     value={contentCounts.content_revision} icon={RotateCcw}    />
        </div>

        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['KOC','活動','商品','優惠碼','文案預覽','提交時間','狀態'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apps.filter(a => a.qualificationStatus === 'approved').map(app => {
                const koc  = kocs.find(k => k.id === app.kocId)
                const camp = campaigns.find(c => c.id === app.campaignId)
                const prod = products.find(p => p.id === app.productId)
                const canReview = app.contentStatus === 'submitted' || app.contentStatus === 'content_revision'
                return (
                  <tr key={app.id}
                    onClick={() => { if (canReview) { setSel(app.id); setNote(app.contentNote ?? '') } }}
                    className={cn('border-b border-gray-50 transition-colors', canReview && 'hover:bg-amber-50 cursor-pointer')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={koc?.name ?? '?'} size="sm" />
                        <div className="text-xs font-semibold text-slate-800">{koc?.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{camp?.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[100px]">{prod?.name}</td>
                    <td className="px-4 py-3 text-xs font-mono font-semibold text-amber-600">{app.couponCode}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px]">
                      {app.caption
                        ? <span className="line-clamp-2">{app.caption}</span>
                        : <span className="text-gray-300 italic">尚未提交</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{app.submittedAt ?? '—'}</td>
                    <td className="px-4 py-3"><Pill cfg={contentBadge[app.contentStatus]} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>

        {/* 文案審核 Modal */}
        {selApp && (selApp.contentStatus === 'submitted' || selApp.contentStatus === 'content_revision') && (
          <Modal open onClose={() => setSel(null)} title="審核文案" size="xl">
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <Avatar name={selKoc?.name ?? '?'} size="lg" />
                <div>
                  <div className="font-bold text-slate-800">{selKoc?.name}</div>
                  <div className="text-xs text-gray-400">{selKoc?.handle} · {selKoc?.platform}</div>
                </div>
                <div className="ml-auto flex flex-col items-end gap-1">
                  <Pill cfg={contentBadge[selApp.contentStatus]} />
                  <span className="text-xs text-amber-600 font-mono font-bold">{selApp.couponCode}</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">文案內容</div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">{selApp.caption}</div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selApp.hashtags?.map(h => <span key={h} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">#{h}</span>)}
                  {selApp.mentions?.map(m => <span key={m} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{m}</span>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">合規檢查</div>
                  <div className="space-y-2">
                    {compliance(selApp).map(c => (
                      <div key={c.label} className={cn('flex items-center gap-2 text-xs px-3 py-2 rounded-lg',
                        c.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                        {c.ok ? <Check size={12}/> : <X size={12}/>} {c.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">審核備註</div>
                  <textarea rows={6} value={note} onChange={e => setNote(e.target.value)}
                    placeholder="輸入審核意見或修改說明..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-amber-400/40 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <Button variant="outline" onClick={() => setSel(null)} className="flex-1">取消</Button>
                <Button variant="outline" onClick={() => reviseContent(selApp.id)}
                  className="flex-1 border-orange-200 text-orange-600 hover:bg-orange-50" disabled={!note.trim()}>
                  <RotateCcw size={14}/> 要求修改
                </Button>
                <Button variant="brand" onClick={() => approveContent(selApp.id)} className="flex-[2]">
                  <Check size={14}/> 核准發布
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </>}
    </div>
  )
}
