import React, { useEffect, useState } from 'react'
import { getVendorProfile, updateVendorProfile } from '../api/vendor'
import { useNavigate } from 'react-router-dom'
import {
  LogOut,
  Building,
  Shield,
  MapPin,
  Landmark,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { cn } from './lib/utils'
import {
  TAIWAN_CITIES,
  getDistrictsByCity,
  getPostalCode,
  normalizeCityName,
} from '../taiwanAddress'


function Card({ children, className = '' }) {
  return (
    <div
      className={cn(
        'bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-[#E2DDD4] shadow-sm p-5 sm:p-8 md:p-10',
        className
      )}
    >
      {children}
    </div>
  )
}


function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[11px] sm:text-xs font-bold text-[#8C8880] uppercase tracking-wider">
        {label}
      </label>

      <input
        className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-[13px] sm:text-sm font-medium text-[#1A1A18] outline-none focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 transition-all placeholder:text-[#8C8880]/50 hover:border-[#1A1A18]/30"
        {...props}
      />
    </div>
  )
}


function Select({ label, children, ...props }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[11px] sm:text-xs font-bold text-[#8C8880] uppercase tracking-wider">
        {label}
      </label>

      <select
        className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-[13px] sm:text-sm font-medium text-[#1A1A18] outline-none focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 transition-all hover:border-[#1A1A18]/30"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}


function Button({
  variant = 'default',
  className,
  children,
  ...props
}) {
  const variants = {
    brand:
      'bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A] hover:-translate-y-1 hover:shadow-md active:translate-y-0',
    danger:
      'border border-[#FFF0F0] bg-[#FFF0F0] text-[#D93025] hover:bg-[#D93025] hover:text-white hover:-translate-y-1 shadow-sm active:translate-y-0',
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-[13px] sm:text-sm font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 whitespace-nowrap',
        variants[variant],
        className
      )}
      {...props}
    >
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

    bank_code: '',
    bank_account: '',
    bank_account_name: '',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')


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

        const senderCity = normalizeCityName(
          vendor.sender_city || ''
        )

        const senderDistrict =
          vendor.sender_district || ''

        const autoPostalCode = getPostalCode(
          senderCity,
          senderDistrict
        )

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

          bank_code: vendor.bank_code || '',
          bank_account: vendor.bank_account || '',
          bank_account_name:
            vendor.bank_account_name || '',
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


  const handleLogout = () => {
    localStorage.removeItem('vendor_id')
    navigate('/vendor-login')
  }


  const handleProfileChange = event => {
    const { name, value } = event.target

    setProfile(previous => ({
      ...previous,
      [name]: value,
    }))
  }


  const senderDistrictOptions =
    getDistrictsByCity(profile.sender_city)


  const handleSenderCityChange = event => {
    const city = event.target.value

    setProfile(previous => ({
      ...previous,
      sender_city: city,
      sender_district: '',
      sender_postal_code: '',
    }))
  }


  const handleSenderDistrictChange = event => {
    const district = event.target.value

    setProfile(previous => ({
      ...previous,
      sender_district: district,
      sender_postal_code: getPostalCode(
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

      const senderPhone =
        profile.sender_phone.replace(/\D/g, '')

      if (
        senderPhone &&
        (
          senderPhone.length !== 10 ||
          !senderPhone.startsWith('09')
        )
      ) {
        setError(
          '寄件人手機需為 09 開頭的 10 碼手機號碼'
        )
        return
      }

      if (
        profile.bank_account &&
        !profile.bank_code
      ) {
        setError('請填寫銀行代碼')
        return
      }

      if (
        profile.bank_account &&
        !profile.bank_account_name.trim()
      ) {
        setError('請填寫銀行戶名')
        return
      }

      await updateVendorProfile({
        vendor_id: vendorId,

        company_name:
          profile.company_name.trim(),

        contact_name:
          profile.contact_name.trim(),

        email:
          profile.email.trim(),

        tax_id:
          profile.tax_id.trim(),

        sender_name:
          profile.sender_name.trim(),

        sender_phone:
          senderPhone,

        sender_postal_code:
          profile.sender_postal_code.trim(),

        sender_city:
          profile.sender_city.trim(),

        sender_district:
          profile.sender_district.trim(),

        sender_address:
          profile.sender_address.trim(),

        bank_code:
          profile.bank_code.trim(),

        bank_account:
          profile.bank_account.trim(),

        bank_account_name:
          profile.bank_account_name.trim(),
      })

      setMessage('資料更新成功')
    } catch (err) {
      const apiError =
        err.response?.data?.err

      setError(
        typeof apiError === 'string'
          ? apiError
          : apiError
          ? JSON.stringify(apiError)
          : err.message ||
            '公司資料更新失敗'
      )
    } finally {
      setSaving(false)
    }
  }


  if (!vendorId) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 rounded-2xl border border-[#FFD7D2] bg-[#FFF0F0] p-4 text-sm font-bold text-[#D93025]">
          <AlertCircle size={18} />
          找不到廠商登入資訊，請重新登入。
        </div>
      </div>
    )
  }


  return (
    <div className="mx-auto w-full max-w-4xl pb-12 font-sans animate-in fade-in duration-500 p-4 sm:p-0">

      {(message || error) && (
        <div className="mb-6">
          {message && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#DCE9DF] bg-[#F3F8F4] px-4 py-3 text-sm font-bold text-[#2F6F45]">
              <CheckCircle2 size={18} />
              {message}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#FFD7D2] bg-[#FFF0F0] px-4 py-3 text-sm font-bold text-[#D93025]">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
        </div>
      )}

      <div className="space-y-6 sm:space-y-8 mt-2">

        {/* ======================================================
            公司資訊
        ====================================================== */}

        <Card className="space-y-6 sm:space-y-8">
          <div className="flex flex-col gap-1 border-b border-[#E2DDD4]/60 pb-3 sm:pb-4">
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A18] flex items-center gap-2">
              <Building
                size={18}
                className="sm:w-5 sm:h-5 text-[#C8522A]"
              />
              基本公司資訊
            </h2>

            <p className="text-[10px] sm:text-xs font-bold text-[#8C8880] ml-6 sm:ml-7">
              維護平台顯示與聯絡所需的廠商資料
            </p>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-[#C8522A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

                <Input
                  label="公司名稱"
                  name="company_name"
                  value={profile.company_name}
                  onChange={handleProfileChange}
                  placeholder="請輸入公司名稱"
                />

                <Input
                  label="聯絡人姓名"
                  name="contact_name"
                  value={profile.contact_name}
                  onChange={handleProfileChange}
                  placeholder="請輸入聯絡人姓名"
                />

                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleProfileChange}
                  placeholder="example@email.com"
                />

                <Input
                  label="統一編號"
                  name="tax_id"
                  value={profile.tax_id}
                  onChange={event =>
                    setProfile(previous => ({
                      ...previous,
                      tax_id:
                        event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 8),
                    }))
                  }
                  inputMode="numeric"
                  placeholder="請輸入統一編號"
                />

              </div>

              <div className="pt-2 sm:pt-4 flex justify-end">
                <Button
                  variant="brand"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  {saving
                    ? '儲存中...'
                    : '儲存公司資訊'}
                </Button>
              </div>
            </>
          )}
        </Card>


        {/* ======================================================
            寄件資訊
        ====================================================== */}

        <Card className="space-y-6 sm:space-y-8">

          <div className="flex flex-col gap-1 border-b border-[#E2DDD4]/60 pb-3 sm:pb-4">
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A18] flex items-center gap-2">
              <MapPin
                size={18}
                className="sm:w-5 sm:h-5 text-[#B89B6A]"
              />
              物流寄件資訊
            </h2>

            <p className="text-[10px] sm:text-xs font-bold text-[#8C8880] ml-6 sm:ml-7">
              建立物流單時使用的寄件人與寄件地址
            </p>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-[#B89B6A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

                <Input
                  label="寄件人姓名"
                  name="sender_name"
                  value={profile.sender_name}
                  onChange={handleProfileChange}
                  placeholder="請輸入寄件人姓名"
                />

                <Input
                  label="寄件人手機"
                  name="sender_phone"
                  value={profile.sender_phone}
                  onChange={event =>
                    setProfile(previous => ({
                      ...previous,
                      sender_phone:
                        event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 10),
                    }))
                  }
                  inputMode="numeric"
                  placeholder="09xxxxxxxx"
                />

                <Select
                  label="縣市"
                  value={profile.sender_city}
                  onChange={handleSenderCityChange}
                >
                  <option value="">
                    請選擇縣市
                  </option>

                  {TAIWAN_CITIES.map(city => (
                    <option
                      key={city}
                      value={city}
                    >
                      {city}
                    </option>
                  ))}
                </Select>

                <Select
                  label="鄉鎮市區"
                  value={profile.sender_district}
                  onChange={handleSenderDistrictChange}
                  disabled={!profile.sender_city}
                >
                  <option value="">
                    請選擇鄉鎮市區
                  </option>

                  {senderDistrictOptions.map(item => (
                    <option
                      key={`${item.district}-${item.postalCode}`}
                      value={item.district}
                    >
                      {item.district}
                    </option>
                  ))}
                </Select>

                <Input
                  label="郵遞區號"
                  name="sender_postal_code"
                  value={profile.sender_postal_code}
                  readOnly
                  placeholder="選擇鄉鎮市區後自動帶入"
                />

                <div className="md:col-span-2">
                  <Input
                    label="寄件詳細地址"
                    name="sender_address"
                    value={profile.sender_address}
                    onChange={handleProfileChange}
                    placeholder="例如 光復路二段100號"
                  />
                </div>

              </div>

              <div className="rounded-xl sm:rounded-2xl bg-[#F5F0E8] px-4 sm:px-5 py-3 sm:py-4 text-[11px] sm:text-xs font-medium text-[#8C8880] flex items-start sm:items-center gap-2">

                <MapPin
                  size={16}
                  className="text-[#B89B6A] shrink-0 mt-0.5 sm:mt-0"
                />

                <span>
                  完整寄件地址：

                  <span className="font-bold text-[#1A1A18] ml-1">
                    {[
                      profile.sender_city,
                      profile.sender_district,
                      profile.sender_address,
                    ]
                      .filter(Boolean)
                      .join('') ||
                      '尚未設定完整地址'}
                  </span>
                </span>

              </div>

              <div className="pt-2 sm:pt-4 flex justify-end">
                <Button
                  variant="brand"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  {saving
                    ? '儲存中...'
                    : '儲存寄件資訊'}
                </Button>
              </div>

            </>
          )}

        </Card>


        {/* ======================================================
            商品款收款銀行帳戶
        ====================================================== */}

        <Card className="space-y-6 sm:space-y-8">

          <div className="flex flex-col gap-1 border-b border-[#E2DDD4]/60 pb-3 sm:pb-4">

            <h2 className="text-base sm:text-lg font-bold text-[#1A1A18] flex items-center gap-2">

              <Landmark
                size={18}
                className="sm:w-5 sm:h-5 text-[#2F8F4E]"
              />

              商品款收款帳戶

            </h2>

            <p className="text-[10px] sm:text-xs font-bold text-[#8C8880] ml-6 sm:ml-7">
              消費者付款由 ShareBuy 代收，符合撥款條件後，商品款將由平台匯入此帳戶
            </p>

          </div>


          <div className="rounded-2xl border border-[#E2DDD4] bg-[#F8F9FA] p-4 sm:p-5">

            <p className="text-xs sm:text-sm font-bold text-[#1A1A18]">
              商品款撥付方式
            </p>

            <p className="mt-2 text-[11px] sm:text-xs leading-relaxed text-[#8C8880]">
              平台會先代收消費者支付的商品款。訂單符合撥款條件後，
              ShareBuy 會將折扣後商品成交額全額撥付至您設定的銀行帳戶。
              平台 15% 服務費會另外產生結算單，不會直接從這筆商品款中扣除。
            </p>

          </div>


          {loading ? (
            <div className="py-8 flex justify-center text-[#8C8880] animate-pulse">
              <div className="w-6 h-6 border-2 border-[#2F8F4E] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

                <Input
                  label="銀行代碼"
                  name="bank_code"
                  value={profile.bank_code}
                  onChange={event =>
                    setProfile(previous => ({
                      ...previous,
                      bank_code:
                        event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 10),
                    }))
                  }
                  inputMode="numeric"
                  placeholder="例如 822"
                />


                <Input
                  label="銀行帳號"
                  name="bank_account"
                  value={profile.bank_account}
                  onChange={event =>
                    setProfile(previous => ({
                      ...previous,
                      bank_account:
                        event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 50),
                    }))
                  }
                  inputMode="numeric"
                  placeholder="請輸入完整銀行帳號"
                />


                <div className="md:col-span-2">

                  <Input
                    label="銀行戶名"
                    name="bank_account_name"
                    value={profile.bank_account_name}
                    onChange={handleProfileChange}
                    placeholder="需與銀行帳戶戶名完全一致"
                  />

                </div>

              </div>


              <div className="pt-2 sm:pt-4 flex justify-end">

                <Button
                  variant="brand"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  {saving
                    ? '儲存中...'
                    : '儲存收款帳戶'}
                </Button>

              </div>

            </>
          )}

        </Card>


        {/* ======================================================
            Security
        ====================================================== */}

        <Card className="space-y-6 sm:space-y-8">

          <div className="flex flex-col gap-1 border-b border-[#E2DDD4]/60 pb-3 sm:pb-4">

            <h2 className="text-base sm:text-lg font-bold text-[#1A1A18] flex items-center gap-2">

              <Shield
                size={18}
                className="sm:w-5 sm:h-5 text-[#8C8880]"
              />

              安全性設定

            </h2>

            <p className="text-[10px] sm:text-xs font-bold text-[#8C8880] ml-6 sm:ml-7">
              管理您的帳號登入狀態
            </p>

          </div>


          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl sm:rounded-2xl bg-[#F8F9FA] border border-[#E2DDD4] p-4 sm:p-5">

            <div>
              <p className="text-sm font-bold text-[#1A1A18]">
                登出帳號
              </p>

              <p className="text-[11px] sm:text-xs text-[#8C8880] mt-1">
                登出目前登入中的廠商帳號
              </p>
            </div>

            <Button
              variant="danger"
              onClick={handleLogout}
              className="w-full sm:w-auto gap-2"
            >
              <LogOut size={16} />
              登出
            </Button>

          </div>

        </Card>

      </div>
    </div>
  )
}