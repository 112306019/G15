import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Mail,
  Lock,
  User,
  Hash,
  CheckCircle2
} from 'lucide-react'

import {
  loginVendor,
  registerVendor,
  verifyVendorEmail,
  resendVendorVerification
} from '../api/vendor'

import LogoIcon from '../assets/logo.jpg'
import LogoText from '../assets/ShareBuy.png'

export default function VendorLogin() {
  const navigate = useNavigate()

  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    vendor_id: '',
    company_name: '',
    contact_name: '',
    email: '',
    password: '',
    tax_id: '',
  })

  // 註冊信箱驗證：驗證碼寄出後跳出，輸入驗證碼確認信箱真的存在
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifyEmail, setVerifyEmail] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [verifySubmitting, setVerifySubmitting] = useState(false)
  const [verifyDone, setVerifyDone] = useState(false)
  const [verifyResendMsg, setVerifyResendMsg] = useState('')

  const openVerifyModal = (email) => {
    setVerifyOpen(true)
    setVerifyEmail(email)
    setVerifyCode('')
    setVerifyError('')
    setVerifyDone(false)
    setVerifyResendMsg('')
  }

  const closeVerifyModal = () => {
    setVerifyOpen(false)
  }

  const handleVerifyCode = async () => {
    setVerifyError('')

    if (!verifyCode.trim()) {
      setVerifyError('請輸入驗證碼')
      return
    }

    setVerifySubmitting(true)

    try {
      await verifyVendorEmail({ email: verifyEmail, code: verifyCode.trim() })
      setVerifyDone(true)
    } catch (err) {
      const apiError = err.response?.data?.err
      setVerifyError(typeof apiError === 'string' ? apiError : '驗證失敗，請再試一次')
    } finally {
      setVerifySubmitting(false)
    }
  }

  const handleResendVerification = async () => {
    setVerifyError('')
    setVerifyResendMsg('')
    setVerifySubmitting(true)

    try {
      await resendVendorVerification({ email: verifyEmail })
      setVerifyResendMsg('驗證碼已重新寄出，請查收信箱。')
    } catch (err) {
      const apiError = err.response?.data?.err
      setVerifyError(typeof apiError === 'string' ? apiError : '驗證碼寄送失敗，請稍後再試')
    } finally {
      setVerifySubmitting(false)
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setLoading(true)
      setError('')

      if (isLogin) {
        const response = await loginVendor({
          vendor_id: form.vendor_id.trim(),
          password: form.password,
        })

        const vendorId = response.data.vendor_id

        localStorage.setItem('vendor_id', vendorId)

        navigate('/vendor')
      } else {
        const response = await registerVendor({
          company_name: form.company_name.trim(),
          contact_name: form.contact_name.trim(),
          email: form.email.trim(),
          password: form.password,
          tax_id: form.tax_id.trim(),
        })

        if (response.data.requiresVerification) {
          // 要先輸入驗證碼確認信箱真的存在，才算註冊完成，先不寫入 vendor_id、不導頁
          openVerifyModal(form.email.trim())
        } else {
          const vendorId = response.data.vendor_id
          localStorage.setItem('vendor_id', vendorId)
          navigate('/vendor')
        }
      }
    } catch (err) {
      console.error('廠商登入或註冊失敗：', err)

      const apiError = err.response?.data?.err

      if (err.response?.data?.needsVerification) {
        // 廠商登入表單只收 vendor_id，後端在這個錯誤裡多帶了 email，
        // 才有辦法直接開驗證彈窗（不用另外請使用者輸入一次信箱）
        setError(typeof apiError === 'string' ? apiError : '請先完成 Email 驗證')
        openVerifyModal(err.response.data.email || '')
      } else if (typeof apiError === 'string') {
        setError(apiError)
      } else if (apiError) {
        setError(JSON.stringify(apiError))
      } else {
        setError(err.message || '操作失敗，請稍後再試')
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setIsLogin((previous) => !previous)
    setError('')

    setForm({
      vendor_id: '',
      company_name: '',
      contact_name: '',
      email: '',
      password: '',
      tax_id: '',
    })
  }

  return (
    // [RWD 優化] 調整最外層 padding: 手機版 p-4 pt-16，平板以上 p-6
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col justify-center items-center p-4 pt-16 md:p-6 relative overflow-hidden font-sans">
      
      {/* 靜態光暈 */}
      <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-[#C8522A] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.12] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[40rem] h-[40rem] bg-[#B89B6A] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.15] pointer-events-none"></div>

      {/* 左上角返回按鈕 */}
      {/* [RWD 優化] 手機版按鈕縮小 (text-xs, py-1.5) */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 md:top-8 left-4 md:left-10 flex items-center gap-1.5 md:gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-xs md:text-sm group z-10 bg-white/60 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-white/80 shadow-sm"
      >
        <ArrowLeft
          size={14}
          strokeWidth={2.5}
          className="md:w-4 md:h-4 transition-transform group-hover:-translate-x-1"
        />
        返回身份選擇
      </button>

      {/* 核心：懸浮玻璃卡片 */}
      <div className="w-full max-w-[440px] relative z-10">
        
        <div className="flex flex-col justify-center items-center mb-6 md:mb-8 gap-2 md:gap-3">
          <img 
            src={LogoIcon} 
            alt="ShareBuy Logo" 
            className="h-12 w-12 md:h-14 md:w-14 object-cover rounded-full shadow-sm" 
          />
          <img 
            src={LogoText} 
            alt="ShareBuy Text" 
            className="h-6 md:h-7 w-auto object-contain translate-y-1 mix-blend-multiply contrast-125" 
          />
        </div>

        {/* [RWD 優化] 手機版卡片內距縮小 (p-6)，平板以上 p-10 */}
        <div className="bg-white/85 backdrop-blur-xl rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-[0_20px_60px_rgba(26,26,24,0.05)] border border-white">
          
          {/* 切換器 */}
          <div className="flex w-full rounded-full bg-[#E2DDD4]/40 p-1.5 mb-6 md:mb-8 shadow-inner">
            <button
              onClick={() => !isLogin && switchMode()}
              className={`flex-1 rounded-full py-2 md:py-2.5 text-xs md:text-sm font-bold transition-all duration-300 ${isLogin ? 'bg-white text-[#1A1A18] shadow-sm transform scale-[1.02]' : 'text-[#8C8880] hover:text-[#1A1A18]'}`}
            >
              廠商登入
            </button>
            <button
              onClick={() => isLogin && switchMode()}
              className={`flex-1 rounded-full py-2 md:py-2.5 text-xs md:text-sm font-bold transition-all duration-300 ${!isLogin ? 'bg-white text-[#1A1A18] shadow-sm transform scale-[1.02]' : 'text-[#8C8880] hover:text-[#1A1A18]'}`}
            >
              建立帳號
            </button>
          </div>

          <div className="text-center mb-5 md:mb-6">
            <h2 className="text-lg md:text-xl font-serif font-bold text-[#1A1A18] mb-1">
              {isLogin ? '歡迎回到後台' : '開啟您的行銷之旅'}
            </h2>
            <p className="text-[11px] md:text-xs font-bold text-[#8C8880]">
              {isLogin ? '請輸入廠商編號與密碼' : '填寫公司資訊加入我們'}
            </p>
          </div>

          {error && (
            <div className="mb-5 md:mb-6 rounded-xl md:rounded-2xl bg-[#FEF5F3]/90 backdrop-blur-sm px-4 md:px-5 py-3 md:py-4 text-xs md:text-sm font-bold text-[#C8522A] border border-[#C8522A]/20">
              {error}
            </div>
          )}

          <form className="flex flex-col gap-3 md:gap-4" onSubmit={handleSubmit}>
            
            {isLogin ? (
              <div className="animate-in slide-in-from-left-4 fade-in duration-300 flex flex-col gap-3 md:gap-4">
                {/* 登入表單：廠商編號 */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none text-[#8C8880] transition-colors duration-300 group-focus-within:text-[#C8522A]">
                    <Hash size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
                  </div>
                  <input
                    type="text"
                    name="vendor_id"
                    value={form.vendor_id}
                    onChange={handleChange}
                    placeholder="廠商編號 (例如: V00001)"
                    required
                    className="w-full bg-white/70 backdrop-blur-sm border border-[#E2DDD4] rounded-xl md:rounded-2xl py-3 md:py-3.5 pl-10 md:pl-11 pr-4 text-sm outline-none transition-all duration-300 placeholder:text-[#8C8880]/50 focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30 font-medium text-[#1A1A18]"
                  />
                </div>
              </div>
            ) : (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300 flex flex-col gap-3 md:gap-4">
                {/* 註冊表單：公司名稱 */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none text-[#8C8880] transition-colors duration-300 group-focus-within:text-[#C8522A]">
                    <Building2 size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
                  </div>
                  <input
                    type="text"
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
                    placeholder="公司名稱"
                    required
                    className="w-full bg-white/70 backdrop-blur-sm border border-[#E2DDD4] rounded-xl md:rounded-2xl py-3 md:py-3.5 pl-10 md:pl-11 pr-4 text-sm outline-none transition-all duration-300 placeholder:text-[#8C8880]/50 focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30 font-medium text-[#1A1A18]"
                  />
                </div>

                {/* 註冊表單：統編 與 聯絡人 (雙欄排列) */}
                {/* [RWD 優化] 手機版單欄疊加 (grid-cols-1)，平板以上雙欄並排 (md:grid-cols-2) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8C8880] transition-colors duration-300 group-focus-within:text-[#C8522A]">
                      <Hash size={16} strokeWidth={2.5} />
                    </div>
                    <input
                      type="text"
                      name="tax_id"
                      value={form.tax_id}
                      onChange={handleChange}
                      placeholder="統一編號"
                      required
                      className="w-full bg-white/70 backdrop-blur-sm border border-[#E2DDD4] rounded-xl md:rounded-2xl py-3 md:py-3.5 pl-9 pr-3 text-sm outline-none transition-all duration-300 placeholder:text-[#8C8880]/50 focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30 font-medium text-[#1A1A18]"
                    />
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8C8880] transition-colors duration-300 group-focus-within:text-[#C8522A]">
                      <User size={16} strokeWidth={2.5} />
                    </div>
                    <input
                      type="text"
                      name="contact_name"
                      value={form.contact_name}
                      onChange={handleChange}
                      placeholder="聯絡人姓名"
                      required
                      className="w-full bg-white/70 backdrop-blur-sm border border-[#E2DDD4] rounded-xl md:rounded-2xl py-3 md:py-3.5 pl-9 pr-3 text-sm outline-none transition-all duration-300 placeholder:text-[#8C8880]/50 focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30 font-medium text-[#1A1A18]"
                    />
                  </div>
                </div>

                {/* 註冊表單：信箱 */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none text-[#8C8880] transition-colors duration-300 group-focus-within:text-[#C8522A]">
                    <Mail size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="公司聯絡信箱"
                    required
                    className="w-full bg-white/70 backdrop-blur-sm border border-[#E2DDD4] rounded-xl md:rounded-2xl py-3 md:py-3.5 pl-10 md:pl-11 pr-4 text-sm outline-none transition-all duration-300 placeholder:text-[#8C8880]/50 focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30 font-medium text-[#1A1A18]"
                  />
                </div>
              </div>
            )}

            {/* 共用表單：密碼 */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none text-[#8C8880] transition-colors duration-300 group-focus-within:text-[#C8522A]">
                <Lock size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
              </div>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="密碼"
                required
                className="w-full bg-white/70 backdrop-blur-sm border border-[#E2DDD4] rounded-xl md:rounded-2xl py-3 md:py-3.5 pl-10 md:pl-11 pr-4 text-sm outline-none transition-all duration-300 placeholder:text-[#8C8880]/50 focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30 font-medium text-[#1A1A18]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[#1A1A18] text-[#F5F0E8] py-3.5 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold tracking-[0.1em] hover:bg-[#C8522A] hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(200,82,42,0.25)] transition-all active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading
                ? '處理中...'
                : isLogin
                  ? '進入廠商後台'
                  : '建立廠商帳號'}
            </button>
          </form>
        </div>
      </div>

      {/* 廠商註冊信箱驗證 */}
      {verifyOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeVerifyModal}
        >
          {/* [RWD 優化] 手機版彈窗內距縮小 (p-6)，圓角縮小 */}
          <div
            className="w-full max-w-md rounded-[2rem] md:rounded-[2.5rem] bg-white p-6 md:p-8 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {!verifyDone ? (
              <>
                <h3 className="text-lg md:text-xl font-serif font-bold text-[#1A1A18] mb-2">驗證您的 Email</h3>
                <p className="mb-1 text-xs md:text-sm font-bold text-[#8C8880]">
                  驗證碼已寄至 <span className="text-[#1A1A18] break-all">{verifyEmail}</span>，10 分鐘內有效。
                </p>
                <p className="mb-4 md:mb-5 text-[10px] md:text-xs text-[#8C8880]">若未收到，請檢查垃圾郵件匣。</p>

                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none text-[#8C8880]">
                    <Hash size={16} className="md:w-[18px] md:h-[18px]" />
                  </div>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(event) => setVerifyCode(event.target.value)}
                    placeholder="請輸入 6 位數驗證碼"
                    className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl md:rounded-2xl py-3 md:py-3.5 pl-10 md:pl-12 pr-4 text-sm outline-none focus:border-[#C8522A] font-medium"
                  />
                </div>

                {verifyResendMsg && (
                  <div className="mb-4 rounded-xl md:rounded-2xl bg-[#F5F0E8] px-4 py-3 text-xs md:text-sm font-bold text-[#1A1A18]">
                    {verifyResendMsg}
                  </div>
                )}

                {verifyError && (
                  <div className="mb-4 rounded-xl md:rounded-2xl border border-red-200 bg-red-50 p-3 md:p-4 text-xs md:text-sm font-bold text-red-700">
                    {verifyError}
                  </div>
                )}

                <div className="flex gap-2 md:gap-3">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={verifySubmitting}
                    className="flex-1 rounded-xl md:rounded-2xl border border-[#E2DDD4] py-3 text-xs md:text-sm font-bold text-[#8C8880] transition-colors hover:bg-[#F8F9FA] disabled:opacity-50"
                  >
                    重新寄送
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={verifySubmitting}
                    className="flex-1 rounded-xl md:rounded-2xl bg-[#1A1A18] py-3 text-xs md:text-sm font-bold text-[#F5F0E8] transition-colors hover:bg-[#C8522A] disabled:opacity-50"
                  >
                    {verifySubmitting ? '驗證中...' : '確認驗證'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex justify-center">
                  <CheckCircle2 size={32} className="text-[#6BBF6B] md:w-10 md:h-10" />
                </div>
                <h3 className="text-lg md:text-xl font-serif font-bold text-[#1A1A18] mb-2 text-center">驗證成功！</h3>
                <p className="mb-5 md:mb-6 text-xs md:text-sm font-bold text-[#8C8880] text-center">
                  您的廠商帳號已完成信箱驗證，請重新登入。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    closeVerifyModal()
                    setIsLogin(true)
                    setError('')
                    setForm((previous) => ({ ...previous, vendor_id: '', password: '' }))
                  }}
                  className="w-full rounded-xl md:rounded-2xl bg-[#1A1A18] py-3 text-xs md:text-sm font-bold text-[#F5F0E8] transition-colors hover:bg-[#C8522A]"
                >
                  返回登入
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}