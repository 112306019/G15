import React, { useState } from 'react';
import { Image as ImageIcon, CheckCircle2 } from 'lucide-react';

export default function ApplyPage() {
  // 1. 定義狀態：切換分頁與彈出視窗
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' (待申請) 或 'applied' (已申請)
  const [showModal, setShowModal] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState('');

  // 2. 模擬資料
  const products = {
    pending: [
      { id: '#E001', name: 'SanDisk 128GB SDXC Extreme Pro 200MB/s 4K U3 V30 相機記憶卡', brand: 'SanDisk' },
      { id: '#E002', name: 'Transcend 創見 ESD260C 250GB USB3.1/Type C 雙介面外接SSD', brand: 'Transcend' },
      { id: '#P003', name: '產品3', brand: '' },
    ],
    applied: [
      { id: '#H001', name: '樂扣樂扣嚼對FUN飲316不鏽鋼掀蓋吸管杯/720ml/裸杏粉', status: '已申請' },
      { id: '#P005', name: '產品5', status: '已結案' },
    ]
  };

  // 3. 處理申請按鈕點擊
  const handleApply = (id) => {
    setCurrentTaskId(id);
    setShowModal(true);
    // 這裡未來可以加入 API 呼叫
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto p-12">
      <h2 className="text-2xl font-bold mb-8 text-slate-800">代言申請區</h2>

      {/* 分頁切換按鈕 */}
      <div className="flex gap-4 mb-10">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-10 py-2.5 rounded-full font-bold transition-all ${
            activeTab === 'pending' ? 'bg-[#67BCC7] text-white shadow-md' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
          }`}
        >
          待申請
        </button>
        <button 
          onClick={() => setActiveTab('applied')}
          className={`px-10 py-2.5 rounded-full font-bold transition-all ${
            activeTab === 'applied' ? 'bg-[#67BCC7] text-white shadow-md' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
          }`}
        >
          已申請
        </button>
      </div>

      <div className="space-y-6">
        <h3 className="text-gray-400 text-sm font-bold ml-2 mb-4">已購買商品</h3>
        
        {/* 商品列表 */}
        {products[activeTab].map((product, i) => (
          <div 
            key={i} 
            className="bg-white rounded-2xl px-8 py-6 flex items-center shadow-sm border border-gray-50 transition-hover hover:shadow-md"
          >
            {/* 商品圖片區 */}
            <div className="w-20 h-14 bg-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center">
              <ImageIcon className="text-slate-300" size={24} />
            </div>

            {/* 商品名稱 */}
            <div className="ml-8 flex-1">
              <p className="font-bold text-slate-700 leading-snug max-w-2xl">{product.name}</p>
            </div>

            {/* 操作按鈕 / 狀態 */}
            <div className="ml-4">
              {activeTab === 'pending' ? (
                <button 
                  onClick={() => handleApply(product.id)}
                  className="bg-black text-white px-10 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-sm"
                >
                  申請任務
                </button>
              ) : (
                <span className="bg-gray-100 text-gray-400 px-10 py-2.5 rounded-xl text-sm font-bold min-w-[120px] inline-block text-center cursor-not-allowed">
                  {product.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 🟢 彈出視窗 (Modal) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-12 max-w-md w-full shadow-2xl text-center animate-in zoom-in-95 duration-300">
            <div className="mb-6 flex justify-center">
                <CheckCircle2 size={80} className="text-slate-800" />
            </div>
            <h4 className="text-3xl font-black text-slate-800 mb-8">
              {currentTaskId} 已申請成功
            </h4>
            <button 
              onClick={() => setShowModal(false)}
              className="bg-black text-white w-full py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all active:scale-95 shadow-lg"
            >
              確認
            </button>
          </div>
        </div>
      )}
    </div>
  );
}