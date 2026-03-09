import { useState } from 'react'
import { Check, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { contentSubmissions as initial, kocs, campaigns } from './mock'
import { Card, Badge, Button, Modal, Avatar, StatCard } from './components/ui'
import { cn } from './lib/utils'
import { FileSearch, Clock, RotateCcw } from 'lucide-react'

const tabs = ['全部', 'pending', 'revision', 'approved', 'rejected']
const tabLabels = { 全部: '全部', pending: '待審核', revision: '需修改', approved: '已核准', rejected: '已拒絕' }

function compliance(sub) {
  return [
    { label: '文案長度 ≥ 50 字', ok: sub.caption.length >= 50 },
    { label: '包含優惠碼', ok: /[A-Z]{3}\d{2}/.test(sub.caption) },
    { label: '包含品牌 hashtag', ok: sub.hashtags.some(h => ['保養', '防曬', 'skincare', '保濕'].includes(h)) },
    { label: '標記品牌帳號', ok: sub.mentions.includes('@brand_official') },
    { label: '無違禁詞', ok: !/(保證|最強|第一|治療)/.test(sub.caption) },
  ]
}

export default function ContentReview() {
  const [subs, setSubs] = useState(initial)
  const [tab, setTab] = useState('全部')
  const [sel, setSel] = useState(null)
  const [notes, setNotes] = useState('')

  const filtered = tab === '全部' ? subs : subs.filter(s => s.status === tab)

  function updateStatus(id, status) {
    setSubs(prev => prev.map(s => s.id !== id ? s : { ...s, status, reviewNotes: status === 'revision' ? notes : s.reviewNotes }))
    setSel(null); setNotes('')
  }

  const counts = {
    pending: subs.filter(s => s.status === 'pending').length,
    revision: subs.filter(s => s.status === 'revision').length,
    approved: subs.filter(s => s.status === 'approved').length,
    rejected: subs.filter(s => s.status === 'rejected').length,
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="待審核" value={counts.pending} icon={Clock} />
        <StatCard label="需修改" value={counts.revision} icon={RotateCcw} />
        <StatCard label="已核准" value={counts.approved} icon={CheckCircle2} />
        <StatCard label="已拒絕" value={counts.rejected} icon={X} />
      </div>

      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn(
            'px-4 py-1.5 rounded-xl text-sm font-semibold transition-all',
            tab === t ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-slate-800',
          )}>{tabLabels[t]}</button>
        ))}
      </div>

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['KOC', '平台', '活動', '文案預覽', '提交時間', '類型', '狀態'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const koc = kocs.find(k => k.id === s.kocId)
              const camp = campaigns.find(c => c.id === s.campaignId)
              return (
                <tr key={s.id} onClick={() => { setSel(s); setNotes(s.reviewNotes) }}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={koc?.name ?? '?'} size="sm" />
                      <div>
                        <div className="text-xs font-semibold text-slate-800">{koc?.name}</div>
                        <div className="text-[10px] text-gray-400">{koc?.handle}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.platform}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[120px]">{camp?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]">
                    <span className="line-clamp-2">{s.caption}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{s.submittedAt}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.type === 'video' ? '影片' : '圖片'}</td>
                  <td className="px-4 py-3"><Badge status={s.status} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {/* Review modal */}
      {sel && (() => {
        const koc = kocs.find(k => k.id === sel.kocId)
        const camp = campaigns.find(c => c.id === sel.campaignId)
        const checks = compliance(sel)
        return (
          <Modal open onClose={() => setSel(null)} title="審核文案" size="xl">
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <Avatar name={koc?.name ?? '?'} size="lg" />
                <div>
                  <div className="font-bold text-slate-800">{koc?.name}</div>
                  <div className="text-xs text-gray-400">{koc?.handle} · {sel.platform} · {sel.type === 'video' ? '影片' : '圖片'}</div>
                </div>
                <div className="ml-auto"><Badge status={sel.status} /></div>
              </div>

              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">文案內容</div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">{sel.caption}</div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {sel.hashtags.map(h => <span key={h} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">#{h}</span>)}
                  {sel.mentions.map(m => <span key={m} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{m}</span>)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">合規檢查</div>
                  <div className="space-y-2">
                    {checks.map(c => (
                      <div key={c.label} className={cn('flex items-center gap-2 text-xs px-3 py-2 rounded-lg', c.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                        {c.ok ? <Check size={12} /> : <X size={12} />} {c.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">審核備註</div>
                  <textarea rows={6} value={notes} onChange={e => setNotes(e.target.value)} placeholder="輸入審核意見或修改說明..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all resize-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <Button variant="outline" onClick={() => setSel(null)} className="flex-1">取消</Button>
                <Button variant="outline" onClick={() => updateStatus(sel.id, 'revision')}
                  className="flex-1 border-orange-200 text-orange-600 hover:bg-orange-50"
                  disabled={!notes.trim()}>要求修改</Button>
                <Button variant="brand" onClick={() => updateStatus(sel.id, 'approved')} className="flex-[2]">
                  <Check size={14} /> 核准發布
                </Button>
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
