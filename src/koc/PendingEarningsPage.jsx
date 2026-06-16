import React from 'react';
import { ArrowLeft } from 'lucide-react'; // 🟢 引入 ArrowLeft 圖示

export default function PendingEarningsPage({ onBack }) {
  const pendingData = [
    { id: '00000022', amount: '$50', task: 'XX產品', date: '2026-01-13' },
    { id: '00000020', amount: '$30', task: 'XX產品', date: '2026-01-10' },
    { id: '00000010', amount: '$20', task: 'XX產品', date: '2026-01-08' },
    { id: '00000002', amount: '$60', task: 'XX產品', date: '2026-01-03' },
    { id: '00000001', amount: '$10', task: 'XX產品', date: '2026-01-01' },
  ];

  return (
    <div className="max-w-5xl animate-in fade-in duration-500">
      
      {/* 🟢 帶有 Hover 動效的高質感返回按鍵 */}
      <button 
        onClick={onBack} 
        className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回我的收益
      </button>

      <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">待定收益</h2>

      {/* 🟢 表格主體：套用一體成型的高質感圓角卡片設計 */}
      <div className="w-full bg-white rounded-3xl border border-[#E2DDD4] shadow-sm overflow-hidden">
        
        {/* 表頭 (套用拿鐵底色) */}
        <div className="grid grid-cols-4 px-10 py-5 bg-[#F8F9FA] border-b border-[#E2DDD4] text-[#8C8880] text-sm font-bold">
          <span>編號</span>
          <span>待收金額</span>
          <span>任務</span>
          <span>日期</span>
        </div>

        {/* 列表內容 */}
        <div className="flex flex-col">
          {pendingData.map((item, index) => (
            <div 
              key={index} 
              className={`grid grid-cols-4 px-10 py-6 items-center text-sm transition-colors hover:bg-[#F8F9FA] ${
                index !== pendingData.length - 1 ? 'border-b border-[#E2DDD4]' : ''
              }`}
            >
              <div className="text-[#8C8880] font-mono">{item.id}</div>
              {/* 金額使用焦糖橘色強調 */}
              <div className="font-bold text-[#C8522A]">{item.amount}</div>
              <div className="font-bold text-[#1A1A18]">{item.task}</div>
              <div className="text-[#8C8880] font-medium">{item.date}</div>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
}