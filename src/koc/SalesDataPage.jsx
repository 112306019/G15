import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function SalesDataPage({ product, onBack }) {
  const chartValues = [7, 12, 8, 15, 10, 18, 22, 14, 20, 25];

  return (
    <div className="max-w-5xl animate-in fade-in zoom-in-95 duration-500">
      
      {/* 🟢 帶有 Hover 動效的高質感返回按鍵 (返回成效分析) */}
      <button 
        onClick={onBack} 
        className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回成效分析
      </button>

      <div className="mb-12">
        <p className="text-[#8C8880] font-bold mb-2 uppercase text-sm tracking-widest">
            {product?.id || '#WANGE001'}
        </p>
        <h2 className="text-[28px] font-serif font-bold text-[#1A1A18]">銷售數據</h2>
      </div>

      {/* 🟢 銷售圖表區塊 (套用拿鐵與焦糖橘色系) */}
      <div className="bg-white rounded-[2.5rem] p-12 border border-[#E2DDD4] shadow-sm mb-12">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-3.5 h-3.5 bg-[#C8522A] rounded-full shadow-[0_0_10px_rgba(200,82,42,0.4)]"></div>
          <span className="text-sm font-black text-[#1A1A18] tracking-wider uppercase">銷量</span>
        </div>
        
        {/* 圖表模擬 */}
        <div className="h-80 w-full flex items-end gap-6 border-l-2 border-b-2 border-[#E2DDD4] relative pt-10">
          {/* 左側數值 */}
          <div className="absolute -left-10 top-0 h-full flex flex-col justify-between py-1 text-[11px] text-[#8C8880] font-bold">
            <span>25</span><span>20</span><span>15</span><span>10</span><span>5</span><span className="translate-y-2">0</span>
          </div>

          {/* 生成銷量長條 (改成焦糖橘漸層與 Hover 狀態) */}
          {chartValues.map((val, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
              <div 
                className="w-3 bg-gradient-to-t from-[#D6714E] to-[#C8522A] rounded-t-full transition-all group-hover:from-[#A64220] group-hover:scale-x-125" 
                style={{ height: `${(val / 25) * 100}%` }}
              ></div>
              <span className="text-[10px] text-[#8C8880] mt-4 font-bold rotate-45 origin-left">7/{1 + idx * 2}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 🟢 數據統計 (替換為拿鐵色底與深邃黑裝飾) */}
      <div className="bg-[#F5F0E8] rounded-3xl p-8 inline-flex flex-col gap-4 border border-[#E2DDD4] shadow-sm">
        <p className="text-[#1A1A18] font-black text-xl flex items-center gap-4">
            <span className="w-2 h-8 bg-[#1A1A18] rounded-full"></span>
            目前累積總銷售數量：<span className="text-[#C8522A]">50</span>
        </p>
        <p className="text-[#1A1A18] font-black text-xl flex items-center gap-4">
            <span className="w-2 h-8 bg-[#1A1A18] rounded-full"></span>
            累積分潤：<span className="text-[#C8522A]">NT$ 735</span>
        </p>
      </div>
    </div>
  );
}