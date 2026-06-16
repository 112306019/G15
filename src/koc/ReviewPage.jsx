import React, { useState } from 'react';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react'; // 🟢 補上 ArrowLeft

export default function ReviewPage({ onBack }) { // 🟢 補上 onBack 屬性
  const [activeTab, setActiveTab] = useState('reviewing');

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
    <div className="max-w-5xl animate-in fade-in duration-500">
      
      {/* 🟢 加入帶有 Hover 動效的高質感返回按鍵 */}
      <button 
        onClick={onBack} 
        className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回任務管理
      </button>

      <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">任務審核狀態</h2>
      
      {/* 🟢 頂部切換標籤 (Tabs) - 套用焦糖橘品牌色 */}
      <div className="flex gap-4 mb-10">
        {[
          { key: 'reviewing', label: '審核中' },
          { key: 'approved', label: '審核通過' },
          { key: 'rejected', label: '退件' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-8 py-2.5 rounded-full font-bold transition-all shadow-sm ${
              activeTab === tab.key 
                ? 'bg-[#C8522A] text-white' 
                : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 🟢 列表區域 (套用無邊框高質感圓角卡片設計) */}
      <div className="w-full bg-white rounded-3xl border border-[#E2DDD4] shadow-sm overflow-hidden">
        
        {/* 表頭 */}
        <div className="flex justify-between items-center bg-[#F8F9FA] border-b border-[#E2DDD4] px-10 py-4 text-sm font-bold text-[#8C8880]">
          <span>任務</span>
          <span>{activeTab === 'approved' ? '優惠碼狀態' : '狀態'}</span>
        </div>

        {/* 列表內容 */}
        <div className="flex flex-col">
          {taskData[activeTab].map((task, i) => (
            <div 
              key={i} 
              className={`flex items-center justify-between px-10 py-6 hover:bg-[#F8F9FA] transition-colors ${
                i !== taskData[activeTab].length - 1 ? 'border-b border-[#E2DDD4]' : ''
              }`}
            >
              {/* 左側：圖片與名稱 */}
              <div className="flex items-center gap-6 flex-1 pr-8">
                <div className="w-[88px] h-[64px] bg-[#F5F0E8] rounded-xl flex-shrink-0 flex items-center justify-center border border-[#E2DDD4]">
                  <ImageIcon className="text-[#8C8880]/50" size={24} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-[#1A1A18] leading-snug">
                    {task.id}
                  </span>
                  {task.promo && (
                    <span className="text-[#C8522A] text-sm font-medium">
                      優惠碼 {task.promo}
                    </span>
                  )}
                </div>
              </div>

              {/* 右側：狀態標籤 */}
              <div className="flex items-center flex-shrink-0">
                <span className={`px-6 py-2 rounded-xl text-xs font-bold min-w-[100px] text-center whitespace-nowrap ${
                  task.isGreen 
                    ? 'bg-[#FDF0ED] text-[#C8522A]' 
                    : 'bg-[#F5F0E8] text-[#8C8880]'
                }`}>
                  {task.status}
                </span>
              </div>
            </div>
          ))}

          {taskData[activeTab].length === 0 && (
            <div className="px-10 py-16 text-center text-[#8C8880] font-bold">
              目前沒有相關紀錄
            </div>
          )}
        </div>
      </div>
    </div>
  );
}