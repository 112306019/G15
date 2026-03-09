import { useState } from 'react'
import { Card, Input, Button } from './components/ui'

export default function Settings() {
  const [notifications, setNotifications] = useState({ newOrder: true, review: true, chat: false, weekly: true })
  const toggle = k => setNotifications(p => ({ ...p, [k]: !p[k] }))
  return (
    <div className="max-w-2xl space-y-6">
      <Card className="p-6 space-y-4">
        <h2 className="font-bold text-slate-800">公司資訊</h2>
        <Input label="公司名稱" defaultValue="廠商A" />
        <Input label="聯絡信箱" defaultValue="contact@brand.tw" />
        <Input label="官方網站" defaultValue="https://brand.tw" />
        <Button variant="brand" size="sm">儲存變更</Button>
      </Card>
      <Card className="p-6 space-y-4">
        <h2 className="font-bold text-slate-800">通知設定</h2>
        {[
          { key: 'newOrder', label: '新訂單通知' },
          { key: 'review', label: '文案審核待辦' },
          { key: 'chat', label: '新訊息通知' },
          { key: 'weekly', label: '每週成效報告' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-1">
            <span className="text-sm text-slate-700">{label}</span>
            <button onClick={() => toggle(key)} className={`w-10 h-6 rounded-full transition-colors relative ${notifications[key] ? 'bg-amber-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notifications[key] ? 'left-5' : 'left-1'}`} />
            </button>
          </div>
        ))}
      </Card>
      <Card className="p-6 space-y-4">
        <h2 className="font-bold text-slate-800">安全性</h2>
        <Input label="舊密碼" type="password" placeholder="••••••••" />
        <Input label="新密碼" type="password" placeholder="••••••••" />
        <Input label="確認密碼" type="password" placeholder="••••••••" />
        <Button variant="primary" size="sm">更新密碼</Button>
      </Card>
    </div>
  )
}
