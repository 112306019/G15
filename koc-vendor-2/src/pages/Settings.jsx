import { useState } from 'react'
import { Card, Input, Button } from '@/components/ui'
import { Bell, Shield, Palette, Building2 } from 'lucide-react'

function Section({ icon: Icon, title, children }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-surface-100 rounded-lg text-ink-muted"><Icon size={16} /></div>
        <h2 className="font-display font-bold text-ink">{title}</h2>
      </div>
      {children}
    </Card>
  )
}

function Toggle({ label, description, defaultChecked = false }) {
  const [on, setOn] = useState(defaultChecked)
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-surface-200 last:border-0">
      <div>
        <div className="text-sm font-semibold text-ink">{label}</div>
        {description && <div className="text-xs text-ink-faint mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => setOn(p => !p)}
        className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 mt-0.5 ${on ? 'bg-brand' : 'bg-surface-300'}`}
        style={{ height: 22, width: 40 }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-[18px]' : ''}`}
          style={{ width: 18, height: 18, transform: on ? 'translateX(18px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

export default function Settings() {
  return (
    <div className="max-w-2xl space-y-6">
      <Section icon={Building2} title="廠商資訊">
        <div className="space-y-4">
          <Input label="公司名稱" defaultValue="廠商A" />
          <Input label="統一編號" defaultValue="12345678" />
          <Input label="聯絡 Email" type="email" defaultValue="contact@A.com" />
          <Input label="公司網址" type="url" defaultValue="https://A.com" />
          <div className="flex justify-end pt-2">
            <Button variant="brand" size="md">儲存變更</Button>
          </div>
        </div>
      </Section>

      <Section icon={Bell} title="通知設定">
        <Toggle label="新 KOC 申請通知" description="有新 KOC 申請加入活動時發送通知" defaultChecked />
        <Toggle label="訂單成立通知" description="每筆透過優惠碼成立的訂單" defaultChecked />
        <Toggle label="預算超過 80% 警示" description="活動預算使用超過 80% 時提醒" defaultChecked />
        <Toggle label="每週報表 Email" description="每週一自動發送上週績效摘要" />
        <Toggle label="KOC 貼文發布通知" description="KOC 發布新貼文時通知" />
      </Section>

      <Section icon={Shield} title="安全性">
        <div className="space-y-4">
          <Input label="目前密碼" type="password" placeholder="••••••••" />
          <Input label="新密碼" type="password" placeholder="••••••••" />
          <Input label="確認新密碼" type="password" placeholder="••••••••" />
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="md">更新密碼</Button>
          </div>
        </div>
      </Section>

      <Section icon={Palette} title="方案與帳單">
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-semibold text-ink">目前方案</div>
            <div className="text-xs text-ink-faint mt-0.5">Pro — 無限活動、50 位 KOC</div>
          </div>
          <span className="bg-brand/10 text-brand text-xs font-bold px-3 py-1 rounded-full">Pro</span>
        </div>
        <div className="flex items-center justify-between py-3 border-t border-surface-200">
          <div>
            <div className="text-sm font-semibold text-ink">下次續費日</div>
            <div className="text-xs text-ink-faint mt-0.5">2026-04-06</div>
          </div>
          <Button variant="ghost" size="sm">管理訂閱</Button>
        </div>
      </Section>
    </div>
  )
}
