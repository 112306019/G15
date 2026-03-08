import { useState } from 'react'
import {
  Check, X, RotateCcw, Eye, MessageSquare,
  Hash, AtSign, Video, Image, Clock,
  ChevronRight, AlertCircle, CheckCircle2, RefreshCw, Filter,
} from 'lucide-react'
import { contentSubmissions as initialData } from '@/data/mock'
import { Badge, Card, Avatar, Button, Modal, StatCard } from '@/components/ui'
import { cn } from '@/lib/utils'

// ─── platform colours ─────────────────────────────────────────────────────────
const platformStyle = {
  Instagram: { text: 'text-pink-600', bg: 'bg-pink-50' },
  TikTok: { text: 'text-teal-600', bg: 'bg-teal-50' },
  YouTube: { text: 'text-red-600', bg: 'bg-red-50' },
}

// ─── tiny icon chip ───────────────────────────────────────────────────────────
function TypeChip({ type }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
      {type === 'video' ? <Video size={11} /> : <Image size={11} />}
      {type === 'video' ? '影片' : '圖文'}
    </span>
  )
}

// ─── Review Detail Modal ──────────────────────────────────────────────────────
function ReviewModal({ sub, onClose, onAction }) {
  const [notes, setNotes] = useState(sub?.reviewNotes ?? '')
  const [busy, setBusy] = useState(false)

  if (!sub) return null

  const pc = platformStyle[sub.platform] ?? {}

  function act(action) {
    setBusy(true)
    setTimeout(() => {
      onAction(sub.id, action, notes)
      setBusy(false)
      onClose()
    }, 400)
  }

  return (
    <Modal open={!!sub} onClose={onClose} title="審核文案內容" size="lg">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-2">

        {/* KOC header */}
        <div className="flex items-center gap-3 pb-4 border-b border-surface-200">
          <Avatar name={sub.kocAvatar} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-ink">{sub.kocName}</div>
            <div className="text-xs text-ink-faint">{sub.kocHandle}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-md', pc.text, pc.bg)}>
              {sub.platform}
            </span>
            <TypeChip type={sub.type} />
            <Badge status={sub.status} />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-ink-faint">
          <span className="flex items-center gap-1"><Clock size={11} /> 提交時間：{sub.submittedAt}</span>
          <span>活動：<span className="text-ink font-semibold">{sub.campaignName}</span></span>
          {sub.revisionCount > 0 && (
            <span className="flex items-center gap-1 text-orange-600 font-semibold">
              <RefreshCw size={11} /> 已修改 {sub.revisionCount} 次
            </span>
          )}
        </div>

        {/* Caption content */}
        <div>
          <div className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">貼文文案</div>
          <div className="bg-surface-100 rounded-xl p-4 text-sm text-ink leading-relaxed whitespace-pre-wrap border border-surface-200">
            {sub.caption}
          </div>
        </div>

        {/* Tags & Mentions */}
        {(sub.hashtags.length > 0 || sub.mentions.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {sub.hashtags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 font-semibold px-2.5 py-1 rounded-full">
                <Hash size={10} />{tag.replace('#', '')}
              </span>
            ))}
            {sub.mentions.map(m => (
              <span key={m} className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-600 font-semibold px-2.5 py-1 rounded-full">
                <AtSign size={10} />{m.replace('@', '')}
              </span>
            ))}
          </div>
        )}

        {/* Checklist */}
        <ReviewChecklist caption={sub.caption} mentions={sub.mentions} hashtags={sub.hashtags} code={sub.kocId} />

        {/* Review notes */}
        <div>
          <label className="text-xs font-bold text-ink-muted uppercase tracking-widest block mb-2">
            審核備註 / 修改要求
          </label>
          <textarea
            rows={3}
            className="w-full bg-surface-100 border border-surface-200 rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all resize-none"
            placeholder="填寫審核意見或修改要求（選填）..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Action buttons */}
        {sub.status !== 'approved' && (
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
              onClick={() => act('revision')}
              disabled={busy || !notes.trim()}
            >
              <RotateCcw size={14} /> 要求修改
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => act('rejected')}
              disabled={busy}
            >
              <X size={14} /> 拒絕
            </Button>
            <Button
              variant="brand"
              className="flex-[2] gap-2"
              onClick={() => act('approved')}
              disabled={busy}
            >
              <Check size={14} /> 核准發布
            </Button>
          </div>
        )}

        {sub.status === 'approved' && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-semibold">
            <CheckCircle2 size={16} /> 此文案已於 {sub.approvedAt ?? '—'} 核准
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Inline checklist ────────────────────────────────────────────────────────
function ReviewChecklist({ caption, mentions, hashtags, code }) {
  const checks = [
    { label: '文案長度足夠（≥ 50 字）', pass: caption?.length >= 50 },
    { label: '包含優惠碼', pass: /[A-Z]{2,}[0-9]{2,}/i.test(caption) },
    { label: '包含品牌 hashtag', pass: /#美好肌膚|#beautyskin/i.test(caption) || hashtags.some(h => /美好肌膚|beautyskin/i.test(h)) },
    { label: '提及或標記品牌帳號', pass: mentions.some(m => /beautyskin/i.test(m)) },
    { label: '無不當或違規用語', pass: !/保證|最強|第一|治療/i.test(caption) },
  ]
  return (
    <div className="bg-surface-50 border border-surface-200 rounded-xl p-4">
      <div className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">合規檢查清單</div>
      <div className="space-y-2">
        {checks.map(c => (
          <div key={c.label} className="flex items-center gap-2.5 text-sm">
            {c.pass
              ? <CheckCircle2 size={15} className="text-success shrink-0" />
              : <AlertCircle size={15} className="text-amber-400 shrink-0" />
            }
            <span className={c.pass ? 'text-ink-muted' : 'text-ink font-medium'}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Submission row ───────────────────────────────────────────────────────────
function SubmissionRow({ sub, onOpen }) {
  const pc = platformStyle[sub.platform] ?? {}
  const preview = sub.caption.length > 80 ? sub.caption.slice(0, 80) + '…' : sub.caption

  return (
    <tr
      className="border-b border-surface-200 hover:bg-surface-50 transition-colors cursor-pointer group"
      onClick={() => onOpen(sub)}
    >
      {/* KOC */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={sub.kocAvatar} size="sm" />
          <div>
            <div className="text-sm font-semibold text-ink">{sub.kocName}</div>
            <div className="text-xs text-ink-faint">{sub.kocHandle}</div>
          </div>
        </div>
      </td>
      {/* Platform */}
      <td className="px-4 py-3.5">
        <span className={cn('text-xs font-semibold px-2 py-1 rounded-md', pc.text, pc.bg)}>
          {sub.platform}
        </span>
      </td>
      {/* Campaign */}
      <td className="px-4 py-3.5 text-xs text-ink-muted max-w-[120px] truncate">{sub.campaignName}</td>
      {/* Caption preview */}
      <td className="px-4 py-3.5 max-w-xs">
        <p className="text-xs text-ink-muted truncate">{preview}</p>
      </td>
      {/* Submitted */}
      <td className="px-4 py-3.5 font-mono text-xs text-ink-faint whitespace-nowrap">{sub.submittedAt}</td>
      {/* Type */}
      <td className="px-4 py-3.5"><TypeChip type={sub.type} /></td>
      {/* Status */}
      <td className="px-4 py-3.5"><Badge status={sub.status} /></td>
      {/* Arrow */}
      <td className="px-4 py-3.5">
        <ChevronRight size={14} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
      </td>
    </tr>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
const filterOptions = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待審核' },
  { value: 'revision', label: '需修改' },
  { value: 'approved', label: '已核准' },
  { value: 'rejected', label: '已拒絕' },
]

export default function ContentReview() {
  const [subs, setSubs] = useState(initialData)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  const counts = {
    pending: subs.filter(s => s.status === 'pending').length,
    revision: subs.filter(s => s.status === 'revision').length,
    approved: subs.filter(s => s.status === 'approved').length,
    rejected: subs.filter(s => s.status === 'rejected').length,
  }

  const filtered = filter === 'all' ? subs : subs.filter(s => s.status === filter)

  function handleAction(id, action, notes) {
    setSubs(prev => prev.map(s =>
      s.id !== id ? s : {
        ...s,
        status: action,
        reviewNotes: notes,
        ...(action === 'approved' ? { approvedAt: new Date().toLocaleString('zh-TW', { hour12: false }).slice(0, 16) } : {}),
        ...(action === 'revision' ? { revisionCount: (s.revisionCount ?? 0) + 1 } : {}),
      }
    ))
  }

  return (
    <div className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="待審核" value={counts.pending} icon={Eye} accent="text-blue-500" delay={0} />
        <StatCard label="需修改" value={counts.revision} icon={RotateCcw} accent="text-orange-500" delay={80} />
        <StatCard label="已核准" value={counts.approved} icon={CheckCircle2} accent="text-success" delay={160} />
        <StatCard label="已拒絕" value={counts.rejected} icon={X} accent="text-danger" delay={240} />
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {filterOptions.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
                filter === f.value
                  ? 'bg-ink text-white'
                  : 'bg-white border border-surface-200 text-ink-muted hover:text-ink',
              )}
            >
              {f.label}
              {f.value !== 'all' && counts[f.value] > 0 && (
                <span className={cn(
                  'ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  filter === f.value ? 'bg-white/20' : 'bg-surface-200 text-ink-muted',
                )}>
                  {counts[f.value]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-faint">
          <Filter size={12} />
          共 {filtered.length} 筆
        </div>
      </div>

      {/* Table */}
      <Card>
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <CheckCircle2 size={32} className="mx-auto text-ink-faint mb-3" />
            <div className="text-sm font-semibold text-ink">目前沒有符合條件的文案</div>
            <div className="text-xs text-ink-faint mt-1">所有提交均已完成審核 🎉</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 text-left">
                  {['KOC', '平台', '活動', '文案預覽', '提交時間', '類型', '狀態', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-ink-faint uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <SubmissionRow key={s.id} sub={s} onOpen={setSelected} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail modal */}
      <ReviewModal
        sub={selected}
        onClose={() => setSelected(null)}
        onAction={handleAction}
      />
    </div>
  )
}
