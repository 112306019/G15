import React, { useState } from 'react'; // 🟢 引入 useState
import { Search, Calendar, Image as ImageIcon } from 'lucide-react';

export default function HomePage({ onNavigate }) {
  // 🟢 1. 定義分頁狀態：'active' (進行中) 或 'closed' (已結案)
  const [activeTab, setActiveTab] = useState('active');

  // 🟢 2. 模擬不同狀態的資料
  const tasks = {
    active: [
      { id: '產品1', vendor: '廠商1', status: '文案審核中', date: '' },
      { id: '產品2', vendor: '廠商2', status: '撰寫中', date: 'xx/xx' },
    ],
    closed: [
      { id: '產品3', vendor: '廠商3', status: '已結案', date: '2026/01/20' },
    ]
  };

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-xl font-bold mb-6 text-slate-800">我的任務管理</h2>
      
      {/* 頂部卡片區 (保持不變) */}
      <div className="grid grid-cols-2 gap-6 mb-12">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-bold">任務申請審核</span>
            <button onClick={() => onNavigate('review')} className="bg-black text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all">查看</button>
          </div>
          <div className="flex gap-2">
            <div className="h-1.5 w-12 bg-slate-800 rounded-full"></div>
            <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-bold">成效分析</span>
            <button onClick={() => onNavigate('analysis')} className="bg-black text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all">查看</button>
          </div>
          <div className="flex gap-2">
            <div className="h-1.5 w-12 bg-slate-800 rounded-full"></div>
            <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* 任務列表區 */}
      <section>
        <div className="flex justify-between items-center mb-8">
          {/* 🟢 3. 切換按鈕組 */}
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('active')}
              className={`px-8 py-2.5 rounded-full text-white font-bold transition-all ${
                activeTab === 'active' ? 'bg-[#67BCC7] shadow-md' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              }`}
            >
              進行中
            </button>
            <button 
              onClick={() => setActiveTab('closed')}
              className={`px-8 py-2.5 rounded-full font-bold transition-all ${
                activeTab === 'closed' ? 'bg-[#67BCC7] text-white shadow-md' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              }`}
            >
              已結案
            </button>
          </div>

          {/* 搜尋欄 (保持不變) */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="搜尋..." className="bg-white border border-gray-100 rounded-full py-2.5 pl-12 pr-6 text-sm w-72 shadow-sm outline-none focus:ring-2 focus:ring-slate-100" />
          </div>
        </div>

        {/* 🟢 4. 根據狀態顯示對應列表 */}
        <div className="grid grid-cols-2 gap-8">
          {tasks[activeTab].map((task, i) => (
            <div key={i} className="bg-white rounded-[2.5rem] p-8 border border-gray-50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{task.id}</h3>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar size={14} />
                    <span className="text-xs">{task.vendor}</span>
                  </div>
                </div>
                <span className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider">
                  {task.status}
                </span>
              </div>

              <div className="bg-slate-400 rounded-[2rem] h-48 flex items-center justify-center mb-6 overflow-hidden">
                <ImageIcon size={48} className="text-white/40" />
              </div>

              <div className="flex gap-4">
                <button onClick={() => onNavigate('task_detail')} className="flex-1 bg-slate-800 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-black transition-colors">查看</button>
                <button 
                  className={`flex-1 py-3.5 rounded-2xl font-bold text-sm transition-colors ${
                    activeTab === 'closed' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
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