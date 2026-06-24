import React, { useState } from 'react';
import { Image as ImageIcon, CheckCircle2 } from 'lucide-react';

export default function ApplyPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);

  // 🟢 使用 useState 來管理動態列表，這樣我們才能在申請後「刪除」或「移動」它們
  const [pendingProducts, setPendingProducts] = useState([
    { id: '#E001', name: 'SanDisk 128GB SDXC Extreme Pro 相機記憶卡', brand: 'SanDisk' },
    { id: '#E002', name: 'Transcend 創見 ESD260C 250GB 行動固態硬碟', brand: 'Transcend' },
    { id: '#P003', name: '產品3', brand: '' },
  ]);

  const [appliedProducts, setAppliedProducts] = useState([
    { id: '#E005', name: '樂扣樂扣嚼對FUN飲316不鏽鋼掀蓋吸管杯', status: '已結案' },
  ]);

  // 🟢 處理申請：將任務移到已申請清單的最上方
  const handleApply = (product) => {
    setCurrentTask(product);
    
    // 1. 從待申請清單移除
    setPendingProducts(prev => prev.filter(p => p.id !== product.id));
    
    // 2. 加入到已申請清單的「最前面」 (使用 [new, ...prev] 語法)
    setAppliedProducts(prev => [{ ...product, status: '已申請' }, ...prev]);
    
    setShowModal(true);
  };

  const currentList = activeTab === 'pending' ? pendingProducts : appliedProducts;

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto py-12">
      <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">代言申請區</h2>

      <div className="flex gap-4 mb-10">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-8 py-2.5 rounded-full font-bold transition-all shadow-sm ${
            activeTab === 'pending' ? 'bg-[#C8522A] text-white' : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
          }`}
        >
          待申請
        </button>
        <button 
          onClick={() => setActiveTab('applied')}
          className={`px-8 py-2.5 rounded-full font-bold transition-all shadow-sm ${
            activeTab === 'applied' ? 'bg-[#C8522A] text-white' : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
          }`}
        >
          已申請
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-[#E2DDD4] shadow-sm overflow-hidden">
        <div className="flex justify-between items-center bg-[#F8F9FA] border-b border-[#E2DDD4] px-10 py-4 text-sm font-bold text-[#8C8880]">
          <div>任務</div>
          <div>{activeTab === 'applied' ? '狀態' : '動作'}</div>
        </div>
        
        <div className="flex flex-col">
          {currentList.map((product, i) => (
            <div 
              key={product.id} 
              className={`flex items-center justify-between px-10 py-6 hover:bg-[#F8F9FA] transition-colors ${
                i !== currentList.length - 1 ? 'border-b border-[#E2DDD4]' : ''
              }`}
            >
              <div className="flex items-center gap-6 flex-1 pr-8">
                <div className="w-[88px] h-[64px] bg-[#F5F0E8] rounded-xl flex-shrink-0 flex items-center justify-center border border-[#E2DDD4]">
                  <ImageIcon className="text-[#8C8880]/50" size={24} />
                </div>
                <div className="font-bold text-[#1A1A18] leading-snug">
                  {product.name}
                </div>
              </div>

              <div className="flex-shrink-0 w-[120px] text-right">
                {activeTab === 'pending' ? (
                  <button 
                    onClick={() => handleApply(product)}
                    className="bg-[#1A1A18] text-[#F5F0E8] px-8 py-3 rounded-2xl text-sm font-bold hover:bg-[#C8522A] transition-all active:scale-95 shadow-sm"
                  >
                    申請任務
                  </button>
                ) : (
                  <span className="text-sm font-bold text-[#C8522A] bg-[#FDF0ED] px-6 py-2 rounded-xl">
                    {product.status}
                  </span>
                )}
              </div>
            </div>
          ))}

          {currentList.length === 0 && (
            <div className="px-10 py-16 text-center text-[#8C8880] font-bold">
              目前沒有相關紀錄
            </div>
          )}
        </div>
      </div>

      {showModal && currentTask && (
        <div className="fixed inset-0 bg-[#1A1A18]/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-12 max-w-md w-full shadow-2xl text-center animate-in zoom-in-95 duration-300 border border-[#E2DDD4]">
            <div className="mb-6 flex justify-center">
                <CheckCircle2 size={64} className="text-[#C8522A]" />
            </div>
            <h4 className="text-2xl font-black text-[#1A1A18] mb-8 leading-snug">
              {currentTask.id}<br/>已申請成功
            </h4>
            <button 
              onClick={() => setShowModal(false)}
              className="bg-[#1A1A18] text-[#F5F0E8] w-full py-4 rounded-2xl font-bold text-lg hover:bg-[#C8522A] transition-all active:scale-95 shadow-lg"
            >
              確認
            </button>
          </div>
        </div>
      )}
    </div>
  );
}