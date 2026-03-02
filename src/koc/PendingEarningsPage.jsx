import React from 'react';

export default function PendingEarningsPage({ onBack }) {
  const pendingData = [
    { id: '00000022', amount: '$50', task: 'XX產品', date: '2026-01-13' },
    { id: '00000020', amount: '$30', task: 'XX產品', date: '2026-01-10' },
    { id: '00000010', amount: '$20', task: 'XX產品', date: '2026-01-08' },
    { id: '00000002', amount: '$60', task: 'XX產品', date: '2026-01-03' },
    { id: '00000001', amount: '$10', task: 'XX產品', date: '2026-01-01' },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-10 text-slate-800">待定收益</h2>

      {/* 🟢 表格主體：使用 grid-cols-4 平均分配四個欄位 */}
      <div className="w-full space-y-4">
        
        {/* 表頭 */}
        <div className="grid grid-cols-4 px-10 py-2 text-gray-400 text-sm font-bold">
          <span>編號</span>
          <span>待收金額</span>
          <span>任務</span>
          <span>日期</span>
        </div>

        {/* 列表內容 */}
        <div className="space-y-3">
          {pendingData.map((item, index) => (
            <div 
              key={index} 
              className="grid grid-cols-4 px-10 py-6 bg-gray-200/50 rounded-2xl items-center text-sm text-slate-600 font-medium border border-white/50 shadow-sm"
            >
              <div className="text-gray-400 font-mono">{item.id}</div>
              <div className="font-bold text-slate-900">{item.amount}</div>
              <div className="text-slate-700">{item.task}</div>
              <div className="text-gray-500">{item.date}</div>
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