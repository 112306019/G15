import React, { useEffect, useState } from 'react'
import {getVendorProfile, updateVendorProfile} from '../api/vendor'
import { useNavigate } from 'react-router-dom'
import { LogOut, Building, Bell, Shield } from 'lucide-react'
import { cn } from './lib/utils'
import {
  TAIWAN_CITIES,
  getDistrictsByCity,
  getPostalCode,
  normalizeCityName,
} from '../taiwanAddress'

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

    sender_name: '',
    sender_phone: '',
    sender_postal_code: '',
    sender_city: '',
    sender_district: '',
    sender_address: '',
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

        const senderCity =
          normalizeCityName(vendor.sender_city || '')

        const senderDistrict =
          vendor.sender_district || ''

        const autoPostalCode =
          getPostalCode(senderCity, senderDistrict)

        setProfile({
          company_name: vendor.company_name || '',
          contact_name: vendor.contact_name || '',
          email: vendor.email || '',
          tax_id: vendor.tax_id || '',

          sender_name: vendor.sender_name || '',
          sender_phone: vendor.sender_phone || '',
          sender_postal_code:
            autoPostalCode ||
            vendor.sender_postal_code ||
            '',
          sender_city: senderCity,
          sender_district: senderDistrict,
          sender_address: vendor.sender_address || '',
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

  const senderDistrictOptions =
    getDistrictsByCity(profile.sender_city)

  const handleSenderCityChange = (event) => {
    const city = event.target.value

    setProfile(previous => ({
      ...previous,
      sender_city: city,
      sender_district: '',
      sender_postal_code: '',
    }))
  }

  const handleSenderDistrictChange = (event) => {
    const district = event.target.value

    setProfile(previous => ({
      ...previous,
      sender_district: district,
      sender_postal_code:
        getPostalCode(
          previous.sender_city,
          district
        ),
    }))
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      setError('')
      setMessage('')

      const senderPhone = profile.sender_phone.replace(/\D/g, '')

      if (
        senderPhone &&
        (
          senderPhone.length !== 10 ||
          !senderPhone.startsWith('09')
        )
      ) {
        setError('寄件人手機需為 09 開頭的 10 碼手機號碼')
        return
      }

      await updateVendorProfile({
        vendor_id: vendorId,
        company_name: profile.company_name.trim(),
        contact_name: profile.contact_name.trim(),
        email: profile.email.trim(),
        tax_id: profile.tax_id.trim(),

        sender_name: profile.sender_name.trim(),
        sender_phone: senderPhone,
        sender_postal_code: profile.sender_postal_code.trim(),
        sender_city: profile.sender_city.trim(),
        sender_district: profile.sender_district.trim(),
        sender_address: profile.sender_address.trim(),
      })

      setMessage('公司與寄件資料更新成功')
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

      {/* 🚚 寄件資訊 */}
      <Card className="space-y-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#1A1A18] flex items-center gap-3">
            <span className="w-1.5 h-6 bg-[#B89B6A] rounded-full inline-block"></span>
            寄件資訊
          </h2>

          <p className="mt-2 text-xs font-medium text-[#8C8880]">
            建立黑貓宅配物流單時，系統會使用這裡的寄件人與寄件地址。
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm font-bold text-[#8C8880]">
            寄件資料載入中...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="寄件人姓名"
                name="sender_name"
                value={profile.sender_name}
                onChange={handleProfileChange}
                placeholder="例如 王小明"
              />

              <Input
                label="寄件人手機"
                name="sender_phone"
                value={profile.sender_phone}
                onChange={(event) =>
                  setProfile(previous => ({
                    ...previous,
                    sender_phone: event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 10)
                  }))
                }
                inputMode="tel"
                maxLength={10}
                placeholder="09xxxxxxxx"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">
                  寄件縣市
                </label>

                <select
                  value={profile.sender_city}
                  onChange={handleSenderCityChange}
                  className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all"
                >
                  <option value="">請選擇縣市</option>

                  {TAIWAN_CITIES.map(city => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">
                  寄件鄉鎮市區
                </label>

                <select
                  value={profile.sender_district}
                  onChange={handleSenderDistrictChange}
                  disabled={!profile.sender_city}
                  className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {profile.sender_city
                      ? '請選擇鄉鎮市區'
                      : '請先選擇縣市'}
                  </option>

                  {senderDistrictOptions.map(item => (
                    <option
                      key={`${item.district}-${item.postalCode}`}
                      value={item.district}
                    >
                      {item.district}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="寄件郵遞區號"
                name="sender_postal_code"
                value={profile.sender_postal_code}
                readOnly
                placeholder="選擇鄉鎮市區後自動帶入"
              />

              <Input
                label="寄件詳細地址"
                name="sender_address"
                value={profile.sender_address}
                onChange={handleProfileChange}
                placeholder="例如 光復路二段100號"
              />
            </div>

            <div className="rounded-xl bg-[#F5F0E8] px-4 py-3 text-xs font-medium text-[#8C8880]">
              完整寄件地址：
              <span className="ml-1 font-bold text-[#1A1A18]">
                {[
                  profile.sender_city,
                  profile.sender_district,
                  profile.sender_address
                ].filter(Boolean).join('') || '尚未設定'}
              </span>
            </div>

            <div className="pt-2">
              <Button
                variant="brand"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? '儲存中...' : '儲存寄件資訊'}
              </Button>
            </div>
          </>
        )}
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