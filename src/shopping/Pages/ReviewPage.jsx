import React from 'react';
import { ArrowLeft, Image as ImageIcon, Heart, X } from 'lucide-react';

export default function ReviewPage({ onBack }) {
  const tasks = [
    { id: '產品1', promo: '優惠碼#kjh787854687', status: '已通過', btn: '確認' },
    { id: '產品2', promo: '', status: '退件', btn: '查看' },
    { id: '產品3', promo: '', status: '待審核', icons: true },
  ];

  return (
    <div className="p-12 max-w-6xl mx-auto">
      {/* 返回按鈕 */}
      <button onClick={onBack} className="mb-8 hover:bg-gray-200 p-2 rounded-full transition-colors">
        <ArrowLeft size={32} className="text-gray-400" />
      </button>

      <h2 className="text-2xl font-bold mb-8">任務申請審核</h2>
      
      {/* 🟢 審核列表：使用 h-24 並確保 items-center */}
      <div className="space-y-4 mb-16">
        {tasks.map((task, i) => (
            <div 
                key={i} 
                className="bg-white rounded-2xl px-6 flex items-center shadow-sm border border-gray-50 w-full h-24" 
            >
            {/* 1. 圖片與產品名稱 */}
            <div className="w-20 h-14 bg-slate-500 rounded-lg flex-shrink-0 flex items-center justify-center">
                <ImageIcon className="text-white/50" size={24} />
            </div>
            <div className="ml-6 w-32 flex-shrink-0 flex items-center h-full">
                <span className="font-bold text-lg text-slate-700 leading-none">{task.id}</span>
            </div>

            {/* 2. 中間推開空間 */}
            <div className="flex-1"></div>

            {/* 3. 優惠碼：往右靠攏 */}
            <div className="flex items-center h-full px-4">
                {task.promo && (
                <span className="text-gray-400 text-sm font-mono leading-none">{task.promo}</span>
                )}
            </div>

            {/* 4. 狀態標籤：縮小容器寬度讓它更靠近按鈕 */}
            <div className="w-40 flex justify-center items-center h-full">
                <span className="border border-gray-200 rounded-full px-8 py-2 text-sm text-gray-600 min-w-[110px] text-center leading-none">
                {task.status}
                </span>
            </div>

            {/* 5. 操作區域：增加寬度並靠左對齊，讓按鈕往左移 */}
            <div className="w-48 flex justify-start items-center h-full pl-10"> {/* 🟢 調整 pl 的數值 (10-14) 可以精確控制按鈕位置 */}
                {task.btn ? (
                <button className="bg-black text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-gray-700 active:scale-95">
                    {task.btn}
                </button>
                ) : (
                <div className="flex gap-4 items-center">
                    <Heart size={22} className="text-gray-300 cursor-pointer hover:text-red-400 transition-colors" />
                    <X size={26} className="text-gray-300 cursor-pointer hover:text-black transition-colors" />
                </div>
                )}
            </div>
        </div>
        ))}
    </div>

      <h2 className="text-2xl font-bold mb-8">審核通過</h2>
      
      {/* 🟢 移除外層灰色底，直接顯示白色長條 */}
      <div className="bg-white rounded-2xl px-6 flex items-center shadow-sm border border-gray-50 w-full h-24">
        {/* 1. 圖片區 - 保持寬度 w-20 */}
        <div className="w-20 h-14 bg-slate-500 rounded-lg flex-shrink-0 flex items-center justify-center">
          <ImageIcon className="text-white/50" size={24} />
        </div>

        {/* 2. 產品名稱 - 保持寬度 w-32 */}
        <div className="ml-6 w-32 flex-shrink-0 flex items-center h-full">
          <span className="font-bold text-lg text-slate-700 leading-none">產品0</span>
        </div>

        {/* 3. 中間留空區域 - 使用 flex-1 撐開空間 */}
        <div className="flex-1"></div>

        {/* 4. 優惠碼區 - 移至最右側，與上方按鈕位置對齊 */}
        <div className="w-80 flex justify-end items-center h-full pr-4">
          <span className="text-gray-400 text-sm font-mono leading-none">
            優惠碼#msil52654687
          </span>
        </div>
      </div>
    </div>
  );
}