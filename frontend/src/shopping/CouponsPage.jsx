import React, { useState } from 'react';
import { Ticket, Copy, CheckCircle2 } from 'lucide-react';

export default function CouponsPage() {
  const [activeTab, setActiveTab] = useState('available');
  const [copiedId, setCopiedId] = useState(null);

  // 模擬優惠卷資料庫
  const coupons = {
    available: [
      { id: 1, title: '全站免運券', code: 'FREESHIP2026', discount: '免運費', desc: '結帳金額滿 NT$500 即可使用', expiry: '2026.12.31', typeLabel: '運費折抵' },
      { id: 2, title: '新客專屬特惠', code: 'WELCOME100', discount: '$100', desc: '無門檻折抵，全站商品適用', expiry: '2026.07.30', typeLabel: '現金折抵' },
      { id: 3, title: '3C家電 9折券', code: 'TECH90', discount: '9折', desc: '最高折抵 NT$500', expiry: '2026.08.15', typeLabel: '比例折扣' },
    ],
    used: [
      { id: 4, title: '品牌週限時特惠', code: 'BRAND50', discount: '$50', desc: '已於 2026.06.01 抵用', expiry: '-', typeLabel: '已使用' },
    ],
    expired: [
      { id: 5, title: '母親節快閃', code: 'MOM2026', discount: '85折', desc: '已逾期失效', expiry: '2026.05.15', typeLabel: '已失效' },
    ]
  };

  const handleCopy = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-5xl animate-in fade-in duration-500">
      
      <h2 className="text-[28px] font-serif font-bold text-[#1A1A18] mb-10">我的優惠卷</h2>

      {/* 頂部切換標籤 (Tabs) */}
      <div className="flex gap-4 mb-10">
        {[
          { key: 'available', label: `可使用 (${coupons.available.length})` },
          { key: 'used', label: '已使用' },
          { key: 'expired', label: '已失效' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-8 py-2.5 rounded-full font-bold transition-all shadow-sm ${
              activeTab === tab.key 
                ? 'bg-[#C8522A] text-white' 
                : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#1A1A18]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 優惠卷列表區塊 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {coupons[activeTab].map(coupon => {
          const isAvailable = activeTab === 'available';

          return (
            <div 
              key={coupon.id} 
              className={`flex h-40 bg-white rounded-3xl border ${isAvailable ? 'border-[#E2DDD4] hover:border-[#B89B6A] hover:shadow-[0_8px_30px_rgba(26,26,24,0.06)]' : 'border-[#E2DDD4]/50 opacity-60'} overflow-hidden shadow-sm transition-all relative group`}
            >
              {/* 左側：折扣數值區 (票根設計) */}
              <div className={`w-[140px] flex-shrink-0 flex flex-col justify-center items-center border-r-2 border-dashed ${isAvailable ? 'bg-[#F5F0E8] border-[#E2DDD4]' : 'bg-[#F8F9FA] border-[#E2DDD4]/50'} relative`}>
                
                {/* 票根上下半圓缺口 (背景色對應 App.jsx 的外層灰底 #F8F9FA) */}
                <div className={`absolute -top-3 -right-3 w-6 h-6 bg-[#F8F9FA] rounded-full border-b ${isAvailable ? 'border-[#E2DDD4]' : 'border-[#E2DDD4]/50'}`}></div>
                <div className={`absolute -bottom-3 -right-3 w-6 h-6 bg-[#F8F9FA] rounded-full border-t ${isAvailable ? 'border-[#E2DDD4]' : 'border-[#E2DDD4]/50'}`}></div>

                <span className={`text-3xl font-black ${isAvailable ? 'text-[#C8522A]' : 'text-[#8C8880]'}`}>
                  {coupon.discount}
                </span>
                <span className={`text-xs font-bold mt-2 px-3 py-1 rounded-full ${isAvailable ? 'bg-white text-[#8C8880]' : 'bg-[#E2DDD4]/30 text-[#8C8880]'}`}>
                  {coupon.typeLabel}
                </span>
              </div>

              {/* 右側：優惠卷詳細資訊 */}
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`text-lg font-bold ${isAvailable ? 'text-[#1A1A18]' : 'text-[#8C8880]'}`}>
                      {coupon.title}
                    </h3>
                    <Ticket size={20} className={isAvailable ? 'text-[#B89B6A]' : 'text-[#E2DDD4]'} />
                  </div>
                  <p className="text-sm font-medium text-[#8C8880] line-clamp-1">{coupon.desc}</p>
                </div>

                <div className="flex items-end justify-between mt-4">
                  <div className="text-xs font-bold text-[#8C8880] tracking-wider">
                    EXP: {coupon.expiry}
                  </div>
                  
                  {isAvailable && (
                    <button 
                      onClick={() => handleCopy(coupon.code, coupon.id)}
                      className="flex items-center gap-1.5 bg-[#F8F9FA] hover:bg-[#F5F0E8] text-[#1A1A18] px-4 py-2 rounded-xl text-xs font-bold transition-colors border border-[#E2DDD4]"
                    >
                      {copiedId === coupon.id ? (
                        <>
                          <CheckCircle2 size={14} className="text-[#C8522A]" />
                          <span className="text-[#C8522A]">已複製</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="text-[#8C8880]" />
                          複製折扣碼
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* 沒資料時的空狀態 */}
        {coupons[activeTab].length === 0 && (
          <div className="col-span-1 lg:col-span-2 py-20 flex flex-col items-center justify-center text-[#8C8880]">
            <Ticket size={48} className="opacity-20 mb-4" />
            <p className="font-bold">目前沒有相關的優惠卷</p>
          </div>
        )}
      </div>
    </div>
  );
}