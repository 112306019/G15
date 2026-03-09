import { useState } from 'react'
import { Search, Copy, Check } from 'lucide-react'
import { kocs } from './mock'
import { Card, Badge, Avatar } from './components/ui'
import { formatCurrency, cn } from './lib/utils'

const platforms = ['全部', 'Instagram', 'TikTok', 'YouTube']

export default function KocManagement() {
  const [platform, setPlatform] = useState('全部')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(null)

  const filtered = kocs.filter(k =>
    (platform === '全部' || k.platform === platform) &&
    (!search || k.name.includes(search) || k.handle.includes(search))
  )

  function copy(code) {
    navigator.clipboard.writeText(code).catch(() => { })
    setCopied(code)
    setTimeout(() => setCopied(null), 1500)
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
                {['KOC', '平台', '粉絲數', '貼文', 'GMV', '優惠碼', '狀態'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(k => (
                <tr key={k.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
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
                  <td className="px-4 py-3 text-xs text-center text-slate-700">{k.posts}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-800">{formatCurrency(k.gmv)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => copy(k.code)} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-700 hover:bg-amber-50 hover:border-amber-200 transition-colors">
                      {k.code}
                      {copied === k.code ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} className="text-gray-300" />}
                    </button>
                  </td>
                  <td className="px-4 py-3"><Badge status={k.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
