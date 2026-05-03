import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function SalesDataPage({ product, onBack }) {

    const chartValues = [7, 12, 8, 15, 10, 18, 22, 14, 20, 25];

  return (
    <div className="p-12 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <button onClick={onBack} className="mb-8 hover:bg-gray-200 p-2 rounded-full transition-all">
        <ArrowLeft size={32} className="text-gray-400" />
      </button>

      <div className="mb-12">
        <p className="text-gray-400 font-bold mb-2 uppercase text-sm tracking-widest">
            {product?.id || '#WANGE001'}
        </p>
        <h2 className="text-4xl font-black text-slate-800">銷售數據</h2>
      </div>

      {/* 🟢 銷售折線圖區塊 */}
      <div className="bg-white rounded-[2.5rem] p-12 border border-gray-100 shadow-sm mb-12">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-3.5 h-3.5 bg-pink-500 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.4)]"></div>
          <span className="text-sm font-black text-slate-700 tracking-wider uppercase">銷量</span>
        </div>
        
        {/* 圖表模擬 */}
        <div className="h-80 w-full flex items-end gap-6 border-l-2 border-b-2 border-gray-50 relative pt-10">
          {/* 左側數值 */}
          <div className="absolute -left-10 top-0 h-full flex flex-col justify-between py-1 text-[11px] text-gray-300 font-bold">
            <span>25</span><span>20</span><span>15</span><span>10</span><span>5</span><span className="translate-y-2">0</span>
          </div>

          {/* 生成銷量長條 */}
          {chartValues.map((val, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
              <div 
                className="w-3 bg-gradient-to-t from-pink-400 to-pink-500 rounded-t-full transition-all group-hover:from-pink-500 group-hover:scale-x-125" 
                style={{ height: `${(val / 25) * 100}%` }}
              ></div>
              <span className="text-[10px] text-gray-400 mt-4 font-bold rotate-45 origin-left">7/{1 + idx * 2}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 數據統計 */}
      <div className="bg-slate-50 rounded-3xl p-8 inline-flex flex-col gap-4 border border-gray-100 ml-4 shadow-inner">
        <p className="text-slate-700 font-black text-xl flex items-center gap-4">
            <span className="w-2 h-8 bg-slate-800 rounded-full"></span>
            目前累積總銷售數量：<span className="text-pink-600">50</span>
        </p>
        <p className="text-slate-700 font-black text-xl flex items-center gap-4">
            <span className="w-2 h-8 bg-slate-800 rounded-full"></span>
            累積分潤：<span className="text-pink-600">NT$ 735</span>
        </p>
      </div>
    </div>
  );
}