import React from 'react';
import { Search, Calendar, Image as ImageIcon } from 'lucide-react';

export default function HomePage({ onNavigate }) {
  // 模擬執行中任務的資料 (加入了 highlight 屬性來區分不同狀態的標籤顏色)
  const ongoingTasks = [
    { id: '產品1', vendor: '廠商1', status: '文案審核中', imageText: 'Extreme PRO', highlight: false },
    { id: '產品2', vendor: '廠商2', status: '撰寫中', deadline: 'xX/xX', imageText: '', highlight: true },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">我的任務管理</h2>

      {/* 🟢 頂部卡片區：任務申請審核 & 成效分析 */}
      <div className="grid grid-cols-2 gap-8 mb-16">
        {/* 任務申請審核卡片 */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-[#E2DDD4] flex flex-col justify-between h-48 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-[#1A1A18]">任務審核狀態</span>
            <button 
              onClick={() => onNavigate('review')} 
              className="bg-[#1A1A18] text-[#F5F0E8] px-8 py-2.5 rounded-2xl text-sm font-bold hover:bg-[#C8522A] transition-all shadow-md active:scale-95"
            >
              查看
            </button>
          </div>
          {/* 底部裝飾條  */}
          <div className="flex gap-2 h-1.5 w-full">
            <div className="w-16 bg-[#1A1A18] rounded-full"></div>
            <div className="flex-1 bg-[#F5F0E8] rounded-full"></div>
          </div>
        </div>

        {/* 成效分析卡片 */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-[#E2DDD4] flex flex-col justify-between h-48 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-[#1A1A18]">成效分析</span>
            <button 
              onClick={() => onNavigate('analysis')} 
              className="bg-[#1A1A18] text-[#F5F0E8] px-8 py-2.5 rounded-2xl text-sm font-bold hover:bg-[#C8522A] transition-all shadow-md active:scale-95"
            >
              查看
            </button>
          </div>
          {/* 底部裝飾條  */}
          <div className="flex gap-2 h-1.5 w-full">
            <div className="w-16 bg-[#1A1A18] rounded-full"></div>
            <div className="flex-1 bg-[#F5F0E8] rounded-full"></div>
          </div>
        </div>
      </div>

      {/* 🟢 下方任務列表區 */}
      <section>
        <div className="flex justify-between items-center mb-8 px-2">
          <h3 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">執行中任務</h3>
          
          {/* 搜尋欄 */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8880]" size={18} />
            <input 
              type="text" 
              placeholder="搜尋..." 
              className="bg-white border border-[#E2DDD4] rounded-full py-2.5 pl-12 pr-6 text-sm w-80 shadow-sm outline-none focus:border-[#1A1A18] transition-colors" 
            />
          </div>
        </div>

        {/* 任務卡片網格 */}
        <div className="grid grid-cols-2 gap-8">
          {ongoingTasks.map((task, i) => (
            <div key={i} className="group bg-white rounded-[2.5rem] p-10 border border-[#E2DDD4] shadow-sm hover:shadow-[0_16px_40px_rgba(26,26,24,0.06)] hover:border-[#B89B6A] transition-all">
              {/* 卡片標題與狀態 */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h4 className="text-2xl font-bold text-[#1A1A18] mb-2 group-hover:text-[#C8522A] transition-colors">{task.id}</h4>
                  <div className="flex items-center gap-2 text-[#8C8880]">
                    <Calendar size={16} />
                    <span className="text-sm font-medium">{task.vendor} {task.deadline && `(截止日期: ${task.deadline})`}</span>
                  </div>
                </div>
                {/* 🟢 狀態標籤：根據 highlight 屬性給予不同顏色 */}
                <span className={`px-6 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${task.highlight ? 'bg-[#FDF0ED] text-[#C8522A]' : 'bg-[#F5F0E8] text-[#8C8880]'}`}>
                  {task.status}
                </span>
              </div>

              {/* 商品圖片示意區 (替換為漸層底色) */}
              <div className="bg-gradient-to-br from-[#F5F0E8] to-[#E2DDD4] rounded-[2rem] h-56 flex flex-col items-center justify-center mb-10 overflow-hidden relative border border-[#E2DDD4]">
                <ImageIcon size={64} className="text-white/80 mb-2" />
                {task.imageText && (
                  <span className="text-[10px] text-[#8C8880] font-bold uppercase tracking-widest">{task.imageText}</span>
                )}
              </div>

              {/* 操作按鈕 */}
              <div className="flex gap-6">
                <button 
                  onClick={() => onNavigate('task_detail')} 
                  className="flex-1 bg-[#1A1A18] text-[#F5F0E8] py-4 rounded-2xl font-bold text-sm hover:bg-[#C8522A] transition-all active:scale-95 shadow-lg"
                >
                  查看
                </button>
                <button className="flex-1 bg-[#F5F0E8] text-[#8C8880] py-4 rounded-2xl font-bold text-sm cursor-not-allowed">
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