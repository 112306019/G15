import React from 'react';

export default function EarningsPage({ onDetail, onTrack }) {
  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">我的收益</h2>

      <div className="max-w-3xl space-y-10">
        
        {/* 1. 待提領區塊 (套用溫暖拿鐵底色) */}
        <div className="bg-[#F5F0E8] rounded-[2.5rem] p-12 relative border border-[#E2DDD4] shadow-sm">
          <h3 className="text-xl font-bold mb-6 text-[#8C8880]">待提領:</h3>
          <p className="text-4xl font-bold mb-12 text-[#1A1A18] font-sans tracking-tight">NT$1000</p>
          
          <div className="flex gap-4">
            <button className="bg-[#1A1A18] text-[#F5F0E8] px-10 py-3.5 rounded-2xl text-sm font-bold hover:bg-[#C8522A] transition-all active:scale-95 shadow-md">
              轉帳到銀行帳戶
            </button>
            <button 
                onClick={onDetail} 
                className="bg-white border border-[#E2DDD4] text-[#8C8880] px-10 py-3.5 rounded-2xl text-sm font-bold hover:text-[#1A1A18] hover:bg-[#F8F9FA] transition-all shadow-sm"
                >
                查看明細
            </button>
          </div>
        </div>

        {/* 2. 待定收益區塊 (套用乾淨白底與焦糖橘點綴) */}
        <div className="bg-white rounded-[2.5rem] p-10 flex justify-between items-center relative overflow-hidden border border-[#E2DDD4] shadow-sm hover:border-[#B89B6A] transition-colors">
            <div>
                <h3 className="text-xl font-bold mb-4 text-[#8C8880]">待定收益:</h3>
                {/* 待定金額使用焦糖橘強調 */}
                <p className="text-3xl font-bold text-[#C8522A] font-sans tracking-tight">NT$170</p>
            </div>
            <button 
                onClick={onTrack} 
                className="bg-[#1A1A18] text-[#F5F0E8] px-14 py-3 rounded-2xl text-sm font-bold hover:bg-[#C8522A] transition-all active:scale-95 shadow-md"
            >
              追蹤
            </button>
          
          {/* 底部裝飾條 (套用品牌色系) */}
          <div className="absolute bottom-0 left-10 right-10 flex gap-2 h-1.5 mb-2">
            <div className="w-40 bg-[#C8522A] rounded-full"></div>
            <div className="flex-1 bg-[#F5F0E8] rounded-full"></div>
          </div>
        </div>

      </div>
    </div>
  );
}