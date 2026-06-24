import React from 'react';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react'; // 🟢 補上 ArrowLeft 的引入

export default function AnalysisPage({ onBack, onViewData }) { // 🟢 補上 onBack 屬性
  // 保留你原本完整的產品資料結構
  const products = [
    { id: '#WANGE001', name: 'SanDisk 128GB SDXC Extreme Pro', usage: '50' },
    { id: '#fun123', name: '樂扣樂扣嚼對FUN飲杯', usage: '32' },
    { id: '#WANGN000', name: '產品3', usage: '12' },
  ];

  return (
    <div className="max-w-5xl animate-in fade-in duration-500">
      
      {/* 🟢 加入帶有 Hover 動效的高質感返回按鍵 */}
      <button 
        onClick={onBack} 
        className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回任務管理
      </button>

      <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">成效分析</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {products.map((product, i) => (
          <div 
            key={i} 
            className="group bg-white rounded-[2rem] overflow-hidden shadow-sm border border-[#E2DDD4] flex flex-col transition-all hover:shadow-[0_16px_40px_rgba(26,26,24,0.06)] hover:border-[#B89B6A]"
          >
            {/* 上半部：圖片區 (套用拿鐵漸層色) */}
            <div className="bg-gradient-to-br from-[#F5F0E8] to-[#E2DDD4] h-64 flex items-center justify-center border-b border-[#E2DDD4]">
              <ImageIcon size={80} className="text-white/80 transition-transform duration-500 group-hover:scale-110" />
            </div>
            
            {/* 下半部：資訊與按鈕 */}
            <div className="p-8 flex flex-col gap-4">
              <span className="text-2xl font-bold text-[#1A1A18] group-hover:text-[#C8522A] transition-colors">
                {product.id}
              </span>
              <span className="text-[#8C8880] font-medium text-sm">
                優惠碼使用次數：<span className="font-bold text-[#1A1A18]">{product.usage}</span>
              </span>
              
              {/* 綁定點擊事件，並將當前產品資料傳回 App.jsx (按鈕套用焦糖橘 Hover 效果) */}
              <button 
                onClick={() => onViewData(product)}
                className="mt-4 bg-[#1A1A18] text-[#F5F0E8] py-3.5 px-8 rounded-full font-bold text-sm w-fit hover:bg-[#C8522A] transition-all active:scale-95 shadow-sm"
              >
                查看數據
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}