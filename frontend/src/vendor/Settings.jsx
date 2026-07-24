import React, { useEffect, useState } from 'react'
import {getVendorProfile, updateVendorProfile} from '../api/vendor'
import { useNavigate } from 'react-router-dom'
import { LogOut, Building, Bell, Shield } from 'lucide-react'
import { cn } from './lib/utils'

// 🟢 內建品牌高質感 UI (確保 100% 呈現品牌色)
function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-[1.5rem] border border-[#E2DDD4] shadow-sm p-8 ${className}`}>{children}</div>
}

function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">{label}</label>
      <input className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all placeholder:text-[#8C8880]/50" {...props} />
    </div>
  )
}

function Button({ variant = 'default', className, children, ...props }) {
  const variants = {
    brand: 'bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A] shadow-sm active:scale-95',
    danger: 'border border-[#FFF0F0] bg-[#FFF0F0] text-[#D93025] hover:bg-[#D93025] hover:text-white shadow-sm active:scale-95',
  }
  return (
    <button className={cn('inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-bold transition-all disabled:opacity-50', variants[variant], className)} {...props}>
      {children}
    </button>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const vendorId = localStorage.getItem('vendor_id')

  const [profile, setProfile] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    tax_id: '',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState({ newOrder: true, review: true, chat: false, weekly: true })
  
  useEffect(() => {
    async function loadProfile() {
      if (!vendorId) {
        setError('尚未登入廠商帳號')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const response = await getVendorProfile(vendorId)
        const vendor = response.data.vendor

        setProfile({
          company_name: vendor.company_name || '',
          contact_name: vendor.contact_name || '',
          email: vendor.email || '',
          tax_id: vendor.tax_id || '',
        })
      } catch (err) {
        setError(
          err.response?.data?.err ||
          err.message ||
          '廠商資料載入失敗'
        )
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [vendorId])

  const toggle = k => setNotifications(p => ({ ...p, [k]: !p[k] }))

  const handleLogout = () => {
    localStorage.removeItem('vendor_id')
    navigate('/vendor-login')
  }

  const handleProfileChange = (event) => {
    const { name, value } = event.target

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      setError('')
      setMessage('')

      await updateVendorProfile({
        vendor_id: vendorId,
        company_name: profile.company_name.trim(),
        contact_name: profile.contact_name.trim(),
        email: profile.email.trim(),
        tax_id: profile.tax_id.trim(),
      })

      setMessage('公司資料更新成功')
    } catch (err) {
      const apiError = err.response?.data?.err

      setError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : err.message || '公司資料更新失敗'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in duration-300">
      
      {/* 🟢 公司資訊 */}
      <Card className="space-y-6">
        <h2 className="text-xl font-serif font-bold text-[#1A1A18] flex items-center gap-3 mb-6">
          <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block"></span>
          公司資訊
        </h2>
        <div className="space-y-4">
          {loading ? (
            <div className="py-8 text-center text-sm font-bold text-[#8C8880]">
              公司資料載入中...
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
                  {message}
                </div>
              )}

              <div className="space-y-4">
                <Input
                  label="廠商編號"
                  value={vendorId || ''}
                  disabled
                />

                <Input
                  label="公司名稱"
                  name="company_name"
                  value={profile.company_name}
                  onChange={handleProfileChange}
                />

                <Input
                  label="聯絡人姓名"
                  name="contact_name"
                  value={profile.contact_name}
                  onChange={handleProfileChange}
                />

                <Input
                  label="聯絡信箱"
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleProfileChange}
                />

                <Input
                  label="統一編號"
                  name="tax_id"
                  value={profile.tax_id}
                  onChange={handleProfileChange}
                />
              </div>

              <div className="pt-2">
                <Button
                  variant="brand"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? '儲存中...' : '儲存變更'}
                </Button>
              </div>
            </>
          )}
        </div>
  
      </Card>

      {/* 🟢 通知設定 */}
      <Card className="space-y-6">
        <h2 className="text-xl font-serif font-bold text-[#1A1A18] flex items-center gap-3 mb-6">
          <span className="w-1.5 h-6 bg-[#1A1A18] rounded-full inline-block"></span>
          通知設定
        </h2>
        <div className="space-y-4">
          {[
            { key: 'newOrder', label: '新訂單通知', desc: '當有新的 KOC 帶入訂單時發送通知' },
            { key: 'review', label: '文案審核待辦', desc: '當 KOC 提交新文案時發送通知' },
            { key: 'chat', label: '新訊息通知', desc: '聊天室收到新訊息時發送通知' },
            { key: 'weekly', label: '每週成效報告', desc: '每週一發送上週的 KOC 行銷成效總結' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-[#E2DDD4] last:border-0 last:pb-0">
              <div>
                <div className="text-sm font-bold text-[#1A1A18]">{label}</div>
                <div className="text-xs font-medium text-[#8C8880] mt-0.5">{desc}</div>
              </div>
              <button 
                onClick={() => toggle(key)} 
                className={`w-12 h-6 rounded-full transition-colors relative ${notifications[key] ? 'bg-[#C8522A]' : 'bg-[#E2DDD4]'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notifications[key] ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* 🟢 安全性 */}
      <Card className="space-y-6">
        <h2 className="text-xl font-serif font-bold text-[#1A1A18] flex items-center gap-3 mb-6">
          <span className="w-1.5 h-6 bg-[#8C8880] rounded-full inline-block"></span>
          安全性
        </h2>
        <div className="space-y-4">
          <Input label="舊密碼" type="password" placeholder="••••••••" />
          <Input label="新密碼" type="password" placeholder="••••••••" />
          <Input label="確認密碼" type="password" placeholder="••••••••" />
        </div>
        <div className="pt-2">
          <Button variant="brand">更新密碼</Button>
        </div>
      </Card>

      {/* 🟢 登出區塊 */}
      <Card className="border-[#FFF0F0] bg-[#FFF0F0]/50 space-y-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-[#D93025] mb-1">登出帳號</h2>
          <p className="text-sm text-[#D93025]/70 font-medium">登出後，您將需要重新輸入帳號密碼才能再次存取後台。</p>
        </div>
        <Button variant="danger" onClick={handleLogout} className="gap-2 shrink-0 mt-4 sm:mt-0">
          <LogOut size={16} /> 安全登出
        </Button>
      </Card>

    </div>
  )
}