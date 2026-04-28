import React from 'react';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';

// 🟢 加入 onViewData 這個 prop
export default function AnalysisPage({ onBack, onViewData }) {
  const products = [
    { id: '#WANGE001', name: 'SanDisk 128GB SDXC Extreme Pro', usage: '50' },
    { id: '#fun123', name: '樂扣樂扣嚼對FUN飲杯', usage: '32' },
    { id: '#WANGN000', name: '產品3', usage: '12' },
  ];

  return (
    <div className="p-12 max-w-7xl mx-auto animate-in fade-in duration-500">
      <button onClick={onBack} className="mb-8 hover:bg-gray-200 p-2 rounded-full transition-colors">
        <ArrowLeft size={32} className="text-gray-400" />
      </button>

      <h2 className="text-3xl font-bold mb-12 text-slate-800">成效分析</h2>

      <div className="grid grid-cols-3 gap-8">
        {products.map((product, i) => (
          <div key={i} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 flex flex-col transition-all hover:shadow-md">
            {/* 上半部：圖片區 */}
            <div className="bg-slate-100 h-64 flex items-center justify-center">
              <ImageIcon size={80} className="text-slate-300" />
            </div>
            
            {/* 下半部：資訊與按鈕 */}
            <div className="p-8 flex flex-col gap-4">
              <span className="text-xl font-bold text-slate-800">{product.id}</span>
              <span className="text-gray-500 font-medium text-sm">優惠碼使用次數：{product.usage}</span>
              
              {/* 🟢 綁定點擊事件，並將當前產品資料傳回 App.jsx */}
              <button 
                onClick={() => onViewData(product)}
                className="mt-4 bg-[#121212] text-white py-3.5 px-8 rounded-full font-bold text-sm w-fit hover:bg-gray-800 transition-all active:scale-95"
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