import React from 'react';
import { ArrowLeft } from 'lucide-react'; // 🟢 補上 ArrowLeft 引入

export default function EarningsDetailPage({ onBack }) {
  const details = [
    { date: '-', amount: '$1000', id: '-', task: 'XX產品', status: '待轉帳' },
    { date: '2026-01-11', amount: '$500', id: '000001010', task: 'XX產品', status: '已轉帳' },
    { date: '2026-01-06', amount: '$800', id: '000001010', task: 'XX產品', status: '已轉帳' },
    { date: '2026-01-03', amount: '$600', id: '000001010', task: 'XX產品', status: '已轉帳' },
    { date: '2026-01-01', amount: '$1000', id: '000001010', task: 'XX產品', status: '已轉帳' },
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

      <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">收益明細</h2>

      {/* 🟢 表格主體：套用一體成型的高質感圓角卡片設計 */}
      <div className="w-full bg-white rounded-3xl border border-[#E2DDD4] shadow-sm overflow-hidden">
        
        {/* 表頭 (套用拿鐵底色) */}
        <div className="grid grid-cols-5 px-10 py-5 bg-[#F8F9FA] border-b border-[#E2DDD4] text-[#8C8880] text-sm font-bold">
          <span>匯款日期</span>
          <span>收款金額</span>
          <span>金流編號</span>
          <span>任務</span>
          <span>狀態</span>
        </div>

        {/* 列表內容 */}
        <div className="flex flex-col">
          {details.map((item, index) => (
            <div 
              key={index} 
              className={`grid grid-cols-5 px-10 py-6 items-center text-sm transition-colors hover:bg-[#F8F9FA] ${
                index !== details.length - 1 ? 'border-b border-[#E2DDD4]' : ''
              }`}
            >
              <div className="text-[#8C8880] font-medium">{item.date}</div>
              {/* 金額使用焦糖橘色強調 */}
              <div className="font-bold text-[#C8522A]">{item.amount}</div>
              <div className="text-[#8C8880] font-mono">{item.id}</div>
              <div className="font-bold text-[#1A1A18]">{item.task}</div>
              {/* 根據狀態變色 */}
              <div className={`font-bold ${item.status === '待轉帳' ? 'text-[#C8522A]' : 'text-[#1A1A18]'}`}>
                {item.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}