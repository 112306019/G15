import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Star,
  ArrowLeft,
  Building2,
  Mail,
  Lock,
  User,
  Hash
} from 'lucide-react'

import {
  loginVendor,
  registerVendor
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

        const vendorId = response.data.vendor_id

        localStorage.setItem('vendor_id', vendorId)

        navigate('/vendor')
      }
    } catch (err) {
      console.error('廠商登入或註冊失敗：', err)

      const apiError = err.response?.data?.err

      if (typeof apiError === 'string') {
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
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      
      {/* 靜態光暈 */}
      <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-[#C8522A] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.12] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[40rem] h-[40rem] bg-[#B89B6A] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.15] pointer-events-none"></div>

      {/* 左上角返回按鈕 */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-8 left-6 md:left-10 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group z-10 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/80 shadow-sm"
      >
        <ArrowLeft
          size={16}
          strokeWidth={2.5}
          className="transition-transform group-hover:-translate-x-1"
        />
        返回身份選擇
      </button>

      {/* 核心：懸浮玻璃卡片 */}
      <div className="w-full max-w-[440px] relative z-10">
        
        {/* 頂部 Logo */}
        <div className="flex flex-col justify-center items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-[#C8522A] to-[#B89B6A] rounded-[1.2rem] flex items-center justify-center shadow-lg mb-4 transform rotate-3">
            <Star size={26} className="text-[#F5F0E8] fill-[#F5F0E8] -rotate-3" />
          </div>
          <span className="font-black tracking-[0.15em] text-[#1A1A18] uppercase text-2xl font-serif">
            Vendor Portal
          </span>
        </div>

        <div className="bg-white/85 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_60px_rgba(26,26,24,0.05)] border border-white">
          
          {/* 切換器 */}
          <div className="flex w-full rounded-full bg-[#E2DDD4]/40 p-1.5 mb-8 shadow-inner">
            <button
              onClick={() => !isLogin && switchMode()}
              className={`flex-1 rounded-full py-2.5 text-sm font-bold transition-all duration-300 ${isLogin ? 'bg-white text-[#1A1A18] shadow-sm transform scale-[1.02]' : 'text-[#8C8880] hover:text-[#1A1A18]'}`}
            >
              廠商登入
            </button>
            <button
              onClick={() => isLogin && switchMode()}
              className={`flex-1 rounded-full py-2.5 text-sm font-bold transition-all duration-300 ${!isLogin ? 'bg-white text-[#1A1A18] shadow-sm transform scale-[1.02]' : 'text-[#8C8880] hover:text-[#1A1A18]'}`}
            >
              建立帳號
            </button>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-serif font-bold text-[#1A1A18] mb-1">
              {isLogin ? '歡迎回到後台' : '開啟您的行銷之旅'}
            </h2>
            <p className="text-xs font-bold text-[#8C8880]">
              {isLogin ? '請輸入廠商編號與密碼' : '填寫公司資訊加入我們'}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl bg-[#FEF5F3]/90 backdrop-blur-sm px-5 py-4 text-sm font-bold text-[#C8522A] border border-[#C8522A]/20">
              {error}
            </div>
          )}

          {/* 🌟 修復排版：拔除固定高度，改用 flex-col 與 gap-4 讓間距保持緊湊 */}
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            
            {isLogin ? (
              <div className="animate-in slide-in-from-left-4 fade-in duration-300 flex flex-col gap-4">
                {/* 登入表單：廠商編號 */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880] transition-colors duration-300 group-focus-within:text-[#C8522A]">
                    <Hash size={18} strokeWidth={2.5} />
                  </div>
                  <input
                    type="text"
                    name="vendor_id"
                    value={form.vendor_id}
                    onChange={handleChange}
                    placeholder="廠商編號 (例如: V00001)"
                    required
                    className="w-full bg-white/70 backdrop-blur-sm border border-[#E2DDD4] rounded-2xl py-3.5 pl-11 pr-4 text-sm outline-none transition-all duration-300 placeholder:text-[#8C8880]/50 focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30 font-medium text-[#1A1A18]"
                  />
                </div>
              </div>
            ) : (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300 flex flex-col gap-4">
                {/* 註冊表單：公司名稱 */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880] transition-colors duration-300 group-focus-within:text-[#C8522A]">
                    <Building2 size={18} strokeWidth={2.5} />
                  </div>
                  <input
                    type="text"
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
                    placeholder="公司名稱"
                    required
                    className="w-full bg-white/70 backdrop-blur-sm border border-[#E2DDD4] rounded-2xl py-3.5 pl-11 pr-4 text-sm outline-none transition-all duration-300 placeholder:text-[#8C8880]/50 focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30 font-medium text-[#1A1A18]"
                  />
                </div>

                {/* 註冊表單：統編 與 聯絡人 (雙欄排列) */}
                <div className="grid grid-cols-2 gap-4">
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
                      className="w-full bg-white/70 backdrop-blur-sm border border-[#E2DDD4] rounded-2xl py-3.5 pl-9 pr-3 text-sm outline-none transition-all duration-300 placeholder:text-[#8C8880]/50 focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30 font-medium text-[#1A1A18]"
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
                      className="w-full bg-white/70 backdrop-blur-sm border border-[#E2DDD4] rounded-2xl py-3.5 pl-9 pr-3 text-sm outline-none transition-all duration-300 placeholder:text-[#8C8880]/50 focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30 font-medium text-[#1A1A18]"
                    />
                  </div>
                </div>

                {/* 註冊表單：信箱 */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880] transition-colors duration-300 group-focus-within:text-[#C8522A]">
                    <Mail size={18} strokeWidth={2.5} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="公司聯絡信箱"
                    required
                    className="w-full bg-white/70 backdrop-blur-sm border border-[#E2DDD4] rounded-2xl py-3.5 pl-11 pr-4 text-sm outline-none transition-all duration-300 placeholder:text-[#8C8880]/50 focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30 font-medium text-[#1A1A18]"
                  />
                </div>
              </div>
            )}

            {/* 共用表單：密碼 */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880] transition-colors duration-300 group-focus-within:text-[#C8522A]">
                <Lock size={18} strokeWidth={2.5} />
              </div>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="密碼"
                required
                className="w-full bg-white/70 backdrop-blur-sm border border-[#E2DDD4] rounded-2xl py-3.5 pl-11 pr-4 text-sm outline-none transition-all duration-300 placeholder:text-[#8C8880]/50 focus:border-[#C8522A] focus:bg-white focus:ring-4 focus:ring-[#C8522A]/10 hover:border-[#1A1A18]/30 font-medium text-[#1A1A18]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[#1A1A18] text-[#F5F0E8] py-4 rounded-2xl text-sm font-bold tracking-[0.1em] hover:bg-[#C8522A] hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(200,82,42,0.25)] transition-all active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
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
    </div>
  )
}