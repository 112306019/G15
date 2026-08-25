import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Star,
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
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col justify-center items-center p-6 relative animate-in fade-in duration-500">

      <button
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group"
      >
        <ArrowLeft
          size={16}
          className="transition-transform group-hover:-translate-x-1"
        />
        返回身分選擇
      </button>

      <div className="w-full max-w-md">
        <div className="flex justify-center items-center gap-3 mb-10">
          <div className="w-12 h-12 bg-[#1A1A18] rounded-full flex items-center justify-center shadow-lg">
            <Star
              size={24}
              className="text-[#F5F0E8] fill-[#F5F0E8]"
            />
          </div>

          <span className="font-black tracking-widest text-[#1A1A18] uppercase text-3xl font-serif">
            LOGO
          </span>
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgba(26,26,24,0.04)] border border-[#E2DDD4]">
          <h2 className="text-2xl font-serif font-bold text-[#1A1A18] mb-2 text-center">
            {isLogin ? '廠商後台登入' : '註冊廠商帳號'}
          </h2>

          <p className="text-sm font-bold text-[#8C8880] text-center mb-8">
            {isLogin
              ? '請輸入廠商編號與密碼'
              : '加入我們，開啟您的 KOC 行銷之旅'}
          </p>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <form
            className="space-y-5"
            onSubmit={handleSubmit}
          >
            {isLogin ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880]">
                  <Hash size={18} />
                </div>

                <input
                  type="text"
                  name="vendor_id"
                  value={form.vendor_id}
                  onChange={handleChange}
                  placeholder="廠商編號，例如 V00001"
                  required
                  className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:border-[#C8522A] font-medium"
                />
              </div>
            ) : (
              <>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880]">
                    <Building2 size={18} />
                  </div>

                  <input
                    type="text"
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
                    placeholder="公司名稱"
                    required
                    className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:border-[#C8522A] font-medium"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880]">
                    <User size={18} />
                  </div>

                  <input
                    type="text"
                    name="contact_name"
                    value={form.contact_name}
                    onChange={handleChange}
                    placeholder="聯絡人姓名"
                    required
                    className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:border-[#C8522A] font-medium"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880]">
                    <Mail size={18} />
                  </div>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="公司聯絡信箱"
                    required
                    className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:border-[#C8522A] font-medium"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880]">
                    <Hash size={18} />
                  </div>

                  <input
                    type="text"
                    name="tax_id"
                    value={form.tax_id}
                    onChange={handleChange}
                    placeholder="統一編號"
                    required
                    className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:border-[#C8522A] font-medium"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880]">
                <Lock size={18} />
              </div>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="密碼"
                required
                className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:border-[#C8522A] font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1A1A18] text-[#F5F0E8] py-4 rounded-2xl font-bold tracking-wider hover:bg-[#C8522A] transition-colors shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? '處理中...'
                : isLogin
                  ? '登入'
                  : '註冊'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-bold text-[#8C8880]">
            {isLogin
              ? '還沒有廠商帳號嗎？'
              : '已經有帳號了？'}{' '}

            <button
              type="button"
              onClick={switchMode}
              className="text-[#1A1A18] hover:text-[#C8522A] transition-colors underline underline-offset-4"
            >
              {isLogin ? '立即註冊' : '登入後台'}
            </button>
          </div>
        </div>
      </div>

      {/* 廠商註冊信箱驗證 */}
      {verifyOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeVerifyModal}
        >
          <div
            className="w-full max-w-md rounded-[2.5rem] bg-white p-8 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {!verifyDone ? (
              <>
                <h3 className="text-lg font-serif font-bold text-[#1A1A18] mb-2">驗證您的 Email</h3>
                <p className="mb-5 text-sm font-bold text-[#8C8880]">
                  驗證碼已寄至 <span className="text-[#1A1A18]">{verifyEmail}</span>，10 分鐘內有效。
                </p>

                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880]">
                    <Hash size={18} />
                  </div>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(event) => setVerifyCode(event.target.value)}
                    placeholder="請輸入 6 位數驗證碼"
                    className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:border-[#C8522A] font-medium"
                  />
                </div>

                {verifyResendMsg && (
                  <div className="mb-4 rounded-2xl bg-[#F5F0E8] px-4 py-3 text-sm font-bold text-[#1A1A18]">
                    {verifyResendMsg}
                  </div>
                )}

                {verifyError && (
                  <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                    {verifyError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={verifySubmitting}
                    className="flex-1 rounded-2xl border border-[#E2DDD4] py-3 text-sm font-bold text-[#8C8880] transition-colors hover:bg-[#F8F9FA] disabled:opacity-50"
                  >
                    重新寄送
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={verifySubmitting}
                    className="flex-1 rounded-2xl bg-[#1A1A18] py-3 text-sm font-bold text-[#F5F0E8] transition-colors hover:bg-[#C8522A] disabled:opacity-50"
                  >
                    {verifySubmitting ? '驗證中...' : '確認驗證'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex justify-center">
                  <CheckCircle2 size={40} className="text-[#6BBF6B]" />
                </div>
                <h3 className="text-lg font-serif font-bold text-[#1A1A18] mb-2 text-center">驗證成功！</h3>
                <p className="mb-6 text-sm font-bold text-[#8C8880] text-center">
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
                  className="w-full rounded-2xl bg-[#1A1A18] py-3 text-sm font-bold text-[#F5F0E8] transition-colors hover:bg-[#C8522A]"
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