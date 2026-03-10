import React from 'react';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';

export default function AnalysisPage({ onBack }) {
  const products = [
    { id: '產品1', usage: '' },
    { id: '產品2', usage: '' },
    { id: '產品3', usage: '' },
  ];

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {/* 返回按鈕 */}
      <button onClick={onBack} className="mb-8 hover:bg-gray-200 p-2 rounded-full transition-colors">
        <ArrowLeft size={32} className="text-gray-400" />
      </button>

      <h2 className="text-3xl font-bold mb-12">成效分析</h2>

      {/* 產品卡片網格 */}
      <div className="grid grid-cols-3 gap-8">
        {products.map((product, i) => (
          <div key={i} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 flex flex-col">
            {/* 上半部：灰色圖片區 */}
            <div className="bg-slate-300 h-64 flex items-center justify-center">
              <ImageIcon size={80} className="text-white opacity-60" />
            </div>
            
            {/* 下半部：文字資訊區 */}
            <div className="p-8 flex flex-col gap-4">
              <span className="text-xl font-bold text-slate-800">{product.id}</span>
              <span className="text-gray-500 font-medium">優惠碼使用次數：{product.usage}</span>
              
              {/* 查看數據按鈕 */}
              <button className="mt-4 bg-[#121212] text-white py-3 px-8 rounded-full font-bold text-sm w-fit hover:bg-gray-800 transition-colors">
                查看數據
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}