import React, { useState } from 'react';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';

export default function ReviewPage({ onBack }) {
  // 1. 新增狀態來切換分頁 
  const [activeTab, setActiveTab] = useState('reviewing'); // 'reviewing', 'approved', 'rejected'

  // 2. 模擬符合設計稿的資料內容 [cite: 480, 498, 505]
  const taskData = {
    reviewing: [
      { id: '產品1', status: '廠商審核中' },
      { id: '產品2', status: '系統審核中' },
      { id: '產品3', status: '系統審核中' },
    ],
    approved: [
      { 
        id: 'SanDisk 128GB SDXC Extreme Pro 200MB/s 4K U3 V30 相機記憶卡', 
        promo: '#WANGE001', 
        status: '已啟用',
        isGreen: true 
      },
      { 
        id: '樂扣樂扣嚼對FUN飲316不鏽鋼掀蓋吸管杯/720ml/裸杏粉', 
        promo: '#fun123', 
        status: '已截止',
        isGreen: false 
      },
      { 
        id: '產品3', 
        promo: '#WANGN000', 
        status: '未開通',
        isGreen: false 
      },
    ],
    rejected: [
      { id: '產品4', status: '退件' },
    ]
  };

  return (
    <div className="p-12 max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* 返回按鈕 */}
      <button onClick={onBack} className="mb-8 hover:bg-gray-200 p-2 rounded-full transition-colors">
        <ArrowLeft size={32} className="text-gray-400" />
      </button>

      <h2 className="text-3xl font-bold mb-10 text-slate-800">任務申請審核</h2>
      
      {/* 🟢 頂部切換標籤 (Tabs)  */}
      <div className="flex gap-4 mb-10">
        {[
          { key: 'reviewing', label: '審核中' },
          { key: 'approved', label: '審核通過' },
          { key: 'rejected', label: '退件' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-10 py-2.5 rounded-full font-bold transition-all ${
              activeTab === tab.key 
                ? 'bg-[#67BCC7] text-white shadow-md' 
                : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 🟢 列表區域 */}
      <div className="w-full">
        {/* 表頭 [cite: 479, 482, 494] */}
        <div className="flex justify-between px-10 py-3 text-gray-400 text-sm font-bold border-b border-gray-100 mb-4">
          <span>任務</span>
          <span>{activeTab === 'approved' ? '優惠碼狀態' : '狀態'}</span>
        </div>

        {/* 列表內容 [cite: 480, 483, 498, 500] */}
        <div className="space-y-4">
          {taskData[activeTab].map((task, i) => (
            <div 
              key={i} 
              className="bg-white rounded-2xl px-8 py-6 flex items-center justify-between shadow-sm border border-gray-50 transition-hover hover:shadow-md" 
            >
              {/* 左側：圖片與名稱 */}
              <div className="flex items-center gap-8 flex-1">
                <div className="w-20 h-14 bg-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                  <ImageIcon className="text-slate-300" size={24} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-lg text-slate-700 leading-tight">
                    {task.id}
                  </span>
                  {/* 如果有優惠碼則顯示 [cite: 499] */}
                  {task.promo && (
                    <span className="text-gray-400 text-sm font-medium italic">
                      優惠碼 {task.promo}
                    </span>
                  )}
                </div>
              </div>

              {/* 右側：狀態標籤 [cite: 483, 500] */}
              <div className="flex items-center">
                <span className={`px-10 py-2.5 rounded-xl text-sm font-bold min-w-[140px] text-center border ${
                  task.isGreen 
                    ? 'bg-green-50 text-green-600 border-green-100' 
                    : 'bg-gray-50 text-gray-400 border-gray-100'
                }`}>
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}