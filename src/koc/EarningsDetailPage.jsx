import React from 'react';

export default function EarningsDetailPage({ onBack }) {
  const details = [
    { date: '-', amount: '$1000', id: '-', task: 'XX產品', status: '待轉帳' },
    { date: '2026-01-11', amount: '$500', id: '000001010', task: 'XX產品', status: '已轉帳' },
    { date: '2026-01-06', amount: '$800', id: '000001010', task: 'XX產品', status: '已轉帳' },
    { date: '2026-01-03', amount: '$600', id: '000001010', task: 'XX產品', status: '已轉帳' },
    { date: '2026-01-01', amount: '$1000', id: '000001010', task: 'XX產品', status: '已轉帳' },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-10 text-slate-800">收益明細</h2>

      {/* 🟢 表格主體：使用 grid-cols-5 確保五欄平均分配 */}
      <div className="w-full space-y-4">
        
        {/* 表頭：移除 text-right，讓所有標題齊頭並進 */}
        <div className="grid grid-cols-5 px-10 py-2 text-gray-400 text-sm font-bold">
          <span>匯款日期</span>
          <span>收款金額</span>
          <span>金流編號</span>
          <span>任務</span>
          <span>狀態</span>
        </div>

        {/* 列表內容 */}
        <div className="space-y-3">
          {details.map((item, index) => (
            <div 
              key={index} 
              className="grid grid-cols-5 px-10 py-6 bg-gray-200/50 rounded-2xl items-center text-sm text-slate-600 font-medium border border-white/50 shadow-sm"
            >
              {/* 每一個 div 會自動填滿 1/5 的寬度 */}
              <div className="text-gray-500">{item.date}</div>
              <div className="font-bold text-slate-900">{item.amount}</div>
              <div className="text-gray-400 font-mono">{item.id}</div>
              <div className="text-slate-700">{item.task}</div>
              <div className="font-bold text-slate-800">{item.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 返回按鈕 */}
      <div className="flex justify-end mt-12">
        <button 
          onClick={onBack}
          className="bg-[#1a1c1e] text-white px-12 py-3 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-95"
        >
          返回
        </button>
      </div>
    </div>
  );
}