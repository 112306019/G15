import React from 'react';

export default function EarningsPage({ onDetail, onTrack }) {
  // 🟢 移除最外層的 flex，因為 App.jsx 已經提供外層容器了
  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-10 text-slate-800">我的收益</h2>

      <div className="max-w-3xl space-y-10">
        {/* 1. 待提領區塊 */}
        <div className="bg-gray-200/60 rounded-[2.5rem] p-12 relative border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold mb-6 text-slate-700">待提領:</h3>
          <p className="text-4xl font-bold mb-12 text-slate-900 font-sans tracking-tight">NT$1000</p>
          
          <div className="flex gap-4">
            <button className="bg-[#333742] text-white px-10 py-3.5 rounded-2xl text-sm font-bold hover:bg-slate-700 transition-all active:scale-95 shadow-md">
              轉帳到銀行帳戶
            </button>
            <button 
                onClick={onDetail} // 🟢 綁定點擊事件
                className="bg-white/70 text-slate-500 px-10 py-3.5 rounded-2xl text-sm font-bold hover:bg-white transition-all"
                >
                查看明細
            </button>
          </div>
        </div>

        {/* 2. 待定收益區塊 */}
        <div className="bg-gray-200/60 rounded-[2.5rem] p-10 flex justify-between items-center relative overflow-hidden border border-gray-100 shadow-sm">
            <div>
                <h3 className="text-xl font-bold mb-4 text-slate-700">待定收益:</h3>
                <p className="text-3xl font-bold text-slate-900 font-sans tracking-tight">NT$170</p>
            </div>
            <button 
                onClick={onTrack} // 🟢 綁定追蹤按鈕
                className="bg-black text-white px-14 py-3 rounded-2xl text-sm font-bold hover:bg-gray-800 transition-all active:scale-95"
            >追蹤
            </button>
          {/* 底部裝飾條 */}
          <div className="absolute bottom-0 left-10 right-10 flex gap-2 h-1.5 mb-2">
            <div className="w-40 bg-[#333742] rounded-full"></div>
            <div className="flex-1 bg-gray-300 rounded-full"></div>
        </div>
        </div>
      </div>
    </div>
  );
}