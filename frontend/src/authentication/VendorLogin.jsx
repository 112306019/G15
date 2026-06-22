import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Building2, Mail, Lock, User } from 'lucide-react';

export default function VendorLogin() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  // 🟢 測試專用：直接秒進後台，不需要管有沒有填資料
  const handleQuickLogin = (e) => {
    e.preventDefault();
    navigate('/vendor');
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col justify-center items-center p-6 relative animate-in fade-in duration-500">
      
      {/* 左上角返回按鈕 */}
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-8 left-8 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回身分選擇
      </button>

      <div className="w-full max-w-md">
        {/* LOGO */}
        <div className="flex justify-center items-center gap-3 mb-10">
          <div className="w-12 h-12 bg-[#1A1A18] rounded-full flex items-center justify-center shadow-lg">
            <Star size={24} className="text-[#F5F0E8] fill-[#F5F0E8]" />
          </div>
          <span className="font-black tracking-widest text-[#1A1A18] uppercase text-3xl font-serif">LOGO</span>
        </div>

        {/* 登入 / 註冊卡片 */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgba(26,26,24,0.04)] border border-[#E2DDD4]">
          <h2 className="text-2xl font-serif font-bold text-[#1A1A18] mb-2 text-center">
            {isLogin ? '廠商後台登入' : '註冊廠商帳號'}
          </h2>
          <p className="text-sm font-bold text-[#8C8880] text-center mb-8">
            {isLogin ? '歡迎回來，請輸入您的專屬帳號密碼' : '加入我們，開啟您的 KOC 行銷之旅'}
          </p>

          {/* 表單 (測試階段可以隨便填或不填) */}
          <form className="space-y-5">
            {!isLogin && (
              <>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880]">
                    <Building2 size={18} />
                  </div>
                  <input type="text" placeholder="公司名稱" className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:border-[#C8522A] font-medium" />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880]">
                    <User size={18} />
                  </div>
                  <input type="text" placeholder="聯絡人姓名" className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:border-[#C8522A] font-medium" />
                </div>
              </>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880]">
                <Mail size={18} />
              </div>
              <input type="email" placeholder="公司聯絡信箱" className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:border-[#C8522A] font-medium" />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8C8880]">
                <Lock size={18} />
              </div>
              <input type="password" placeholder="密碼" className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:border-[#C8522A] font-medium" />
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <a href="#" className="text-xs font-bold text-[#8C8880] hover:text-[#C8522A] transition-colors">忘記密碼？</a>
              </div>
            )}

            {/* 🟢 把 type 改成 button，並綁定 handleQuickLogin */}
            <button 
              type="button"
              onClick={handleQuickLogin}
              className="w-full bg-[#1A1A18] text-[#F5F0E8] py-4 rounded-2xl font-bold tracking-wider hover:bg-[#C8522A] transition-colors shadow-md active:scale-95"
            >
              {isLogin ? '登入 (測試用)' : '註冊 (測試用)'}
            </button>
          </form>

          {/* 切換模式按鈕 */}
          <div className="mt-8 text-center text-sm font-bold text-[#8C8880]">
            {isLogin ? '還沒有廠商帳號嗎？' : '已經有帳號了？'}{' '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-[#1A1A18] hover:text-[#C8522A] transition-colors underline underline-offset-4">
              {isLogin ? '立即註冊' : '登入後台'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}