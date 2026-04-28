import React from 'react';
import { Search, Calendar, Image as ImageIcon } from 'lucide-react';

export default function HomePage({ onNavigate }) {
  // 模擬執行中任務的資料 [cite: 2855, 2856, 2863, 2864, 2865, 2866]
  const ongoingTasks = [
    { id: '產品1', vendor: '廠商1', status: '文案審核中', imageText: 'Extreme PRO' },
    { id: '產品2', vendor: '廠商2', status: '撰寫中', deadline: 'xX/xX', imageText: '' },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-xl font-bold mb-8 text-slate-800">我的任務管理</h2>
      
      {/* 🟢 頂部卡片區：任務申請審核 & 成效分析 [cite: 2850, 2851, 2852, 2853] */}
      <div className="grid grid-cols-2 gap-8 mb-16">
        {/* 任務申請審核卡片 */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-50 flex flex-col justify-between h-48">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-slate-700">任務申請審核</span>
            <button 
              onClick={() => onNavigate('review')} 
              className="bg-black text-white px-8 py-2.5 rounded-2xl text-sm font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95"
            >
              查看
            </button>
          </div>
          {/* 底部裝飾條  */}
          <div className="flex gap-2 h-1.5 w-full">
            <div className="w-16 bg-slate-700 rounded-full"></div>
            <div className="flex-1 bg-gray-100 rounded-full"></div>
          </div>
        </div>

        {/* 成效分析卡片 */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-50 flex flex-col justify-between h-48">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-slate-700">成效分析</span>
            <button 
              onClick={() => onNavigate('analysis')} 
              className="bg-black text-white px-8 py-2.5 rounded-2xl text-sm font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95"
            >
              查看
            </button>
          </div>
          {/* 底部裝飾條  */}
          <div className="flex gap-2 h-1.5 w-full">
            <div className="w-16 bg-slate-700 rounded-full"></div>
            <div className="flex-1 bg-gray-100 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* 🟢 下方任務列表區 [cite: 2854, 2862] */}
      <section>
        <div className="flex justify-between items-center mb-8 px-2">
          <h3 className="text-lg font-bold text-slate-800">執行中任務</h3>
          
          {/* 搜尋欄 [cite: 2862] */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="搜尋..." 
              className="bg-white border border-gray-100 rounded-full py-2.5 pl-12 pr-6 text-sm w-80 shadow-sm outline-none focus:ring-2 focus:ring-slate-100" 
            />
          </div>
        </div>

        {/* 任務卡片網格 [cite: 2855-2861, 2867, 2869] */}
        <div className="grid grid-cols-2 gap-8">
          {ongoingTasks.map((task, i) => (
            <div key={i} className="bg-white rounded-[2.5rem] p-10 border border-gray-50 shadow-sm hover:shadow-md transition-all">
              {/* 卡片標題與狀態 [cite: 2855, 2863] */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h4 className="text-2xl font-bold text-slate-800 mb-2">{task.id}</h4>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar size={16} />
                    <span className="text-sm font-medium">{task.vendor} {task.deadline && `(截止日期: ${task.deadline})`}</span>
                  </div>
                </div>
                <span className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-xs font-bold whitespace-nowrap">
                  {task.status}
                </span>
              </div>

              {/* 商品圖片示意區 [cite: 2858-2861] */}
              <div className="bg-gray-100 rounded-[2rem] h-56 flex flex-col items-center justify-center mb-10 overflow-hidden relative border border-gray-50">
                <ImageIcon size={64} className="text-gray-300 mb-2" />
                {task.imageText && (
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{task.imageText}</span>
                )}
              </div>

              {/* 操作按鈕 [cite: 2857, 2867] */}
              <div className="flex gap-6">
                <button 
                  onClick={() => onNavigate('task_detail')} 
                  className="flex-1 bg-slate-800 text-white py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all active:scale-95 shadow-lg"
                >
                  查看
                </button>
                <button className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-bold text-sm cursor-not-allowed">
                  完成
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}