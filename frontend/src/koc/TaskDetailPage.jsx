import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Smile, Send, CheckCircle2 } from 'lucide-react';

export default function TaskDetailPage({ onBack }) {
  // 🟢 從 localStorage 抓取剛才點擊的任務 (這樣就不會跑到預設的 SanDisk 畫面)
  const [currentTask, setCurrentTask] = useState(() => {
    const savedTask = localStorage.getItem('currentSelectedTask');
    return savedTask ? JSON.parse(savedTask) : null;
  });

  const [showModal, setShowModal] = useState(false);
  const [copyText, setCopyText] = useState('');
  const [linkText, setLinkText] = useState(''); // 存放貼文連結

  if (!currentTask) return null; // 防止沒有資料時報錯

  // 🟢 更新所有任務清單的輔助函式 (把更新寫入資料庫)
  const updateGlobalTasks = (updatedTask) => {
    const savedGlobal = JSON.parse(localStorage.getItem('koc_tasks')) || [];
    const newGlobalTasks = savedGlobal.map(t => t.id === updatedTask.id ? updatedTask : t);
    localStorage.setItem('koc_tasks', JSON.stringify(newGlobalTasks));
  };

  // 🟢 動作：送出文案
  const handleSubmitCopy = () => {
    setShowModal(false);
    // 更新當前畫面任務狀態 -> 階段3、審核中
    const updatedTask = { ...currentTask, stage: 3, status: 'reviewing', rejectReason: '' };
    setCurrentTask(updatedTask);
    // 同步更新到首頁的假資料庫
    updateGlobalTasks(updatedTask);
  };

  // 🟢 動作：送出貼文連結 (階段四)
  const handleSubmitLink = () => {
    if (!linkText.trim()) return alert('請輸入連結！');
    // 更新當前畫面任務狀態 -> 階段5已結案
    const updatedTask = { ...currentTask, stage: 5, status: '' };
    setCurrentTask(updatedTask);
    updateGlobalTasks(updatedTask);
    alert('已成功提交連結！返回任務中心即可在「已結案」看到任務。');
    onBack(); // 送出後自動返回
  };

  // ==========================================
  // 畫面邏輯判斷
  // ==========================================
  const isEditable = currentTask.stage === 2 || (currentTask.stage === 3 && currentTask.status === 'rejected');
  const isReviewing = currentTask.stage === 3 && currentTask.status === 'reviewing';
  const isWaitPublish = currentTask.stage === 4;

  return (
    <div className="flex h-[calc(100vh-80px)] max-w-[1600px] mx-auto animate-in fade-in duration-300">
      
      {/* 左側：執行進度區 */}
      <div className="flex-1 flex flex-col min-w-0 pr-12">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit">
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          返回任務中心
        </button>

        <div className="flex items-center justify-between mb-12 shrink-0 w-full"> 
            <h2 className="text-[28px] font-serif font-bold text-[#1A1A18] tracking-tight">
              專案執行進度
            </h2>
        </div>
        
        <div className="flex gap-12 flex-1 overflow-y-auto pb-10 pr-4">
          {/* 商品資訊卡片 */}
          <div className="w-[340px] shrink-0">
            <div className="bg-[#1A1A18] rounded-[2.5rem] p-10 shadow-xl border border-[#E2DDD4] text-white flex flex-col items-center justify-center relative overflow-hidden">
              <span className="text-2xl font-black mb-2 text-[#F5F0E8] text-center leading-snug">
                {currentTask.productName}
              </span>
              <span className="text-[#C8522A] font-bold mt-4 bg-[#FDF0ED] px-4 py-1 rounded-full text-sm">
                任務進行中
              </span>
            </div>
          </div>

          {/* 進度操作區塊 */}
          <div className="flex-1 flex flex-col gap-12">
            
            {/* 🟢 情境 1：可以填寫/修改文案 */}
            {isEditable && (
              <div className="animate-in fade-in duration-500">
                <h3 className="text-xl font-bold text-[#1A1A18] mb-6 ml-2">撰寫文案草稿</h3>
                {currentTask.status === 'rejected' && (
                  <div className="mb-4 bg-[#FDF0ED] border border-[#FDF0ED] rounded-2xl px-6 py-4 animate-in fade-in slide-in-from-top-2">
                    <span className="text-[#C8522A] font-black text-xs uppercase tracking-wider mb-1 block">廠商要求修改</span>
                    <span className="text-sm text-[#1A1A18] font-bold">{currentTask.rejectReason}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 bg-white border border-[#E2DDD4] rounded-full px-4 py-2 shadow-sm focus-within:border-[#1A1A18] transition-colors">
                    <button onClick={() => setShowModal(true)} className="flex-1 text-left text-[#8C8880] text-sm outline-none px-2 py-1 font-bold hover:text-[#1A1A18]">
                        {currentTask.status === 'rejected' ? '點此修改文案草稿...' : '點此輸入文案草稿...'}
                    </button>
                    <button onClick={() => setShowModal(true)} className="bg-[#1A1A18] text-[#F5F0E8] px-7 py-2.5 rounded-full text-sm font-bold hover:bg-[#C8522A] transition-colors tracking-wider">
                      {currentTask.status === 'rejected' ? '重新填寫' : '開始填寫'}
                    </button>
                </div>
              </div>
            )}

            {/* 🟢 情境 2：廠商審核中 (已刪除模擬面板) */}
            {isReviewing && (
              <div className="animate-in fade-in duration-500 flex flex-col gap-4">
                <h3 className="text-xl font-bold text-[#1A1A18] mb-6 ml-2">文案審核狀態</h3>
                <div className="bg-[#F5F0E8] text-[#8C8880] font-bold text-sm px-6 py-12 rounded-2xl text-center w-full border border-[#E2DDD4] flex flex-col items-center gap-3">
                    <CheckCircle2 size={40} className="text-[#C8522A] mb-2" />
                    <span className="text-[#1A1A18] text-lg">文案已送出，等待廠商審核中</span>
                    <span className="text-sm font-normal">廠商確認無誤後，任務將會自動移至「待發佈」階段。</span>
                </div>
              </div>
            )}

            {/* 🟢 情境 3：待發佈 (上傳連結功能補上) */}
            {isWaitPublish && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6 ml-2 flex items-center gap-3">
                  <h3 className="text-xl font-bold text-[#1A1A18]">作品上傳</h3>
                  <span className="text-xs font-bold bg-[#FDF0ED] text-[#C8522A] px-3 py-1 rounded-full border border-[#FDF0ED]">文案審核已通過</span>
                </div>
                <div className="flex items-center bg-white border border-[#E2DDD4] rounded-full px-4 py-2 shadow-sm focus-within:border-[#1A1A18] transition-colors">
                  <input 
                    type="text" 
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="請貼上 IG/FB 貼文連結..." 
                    className="flex-1 bg-transparent outline-none text-sm px-2 text-[#1A1A18] placeholder:text-[#8C8880] font-bold"
                  />
                  <button onClick={handleSubmitLink} className="px-8 py-2.5 rounded-full font-bold text-sm transition-all tracking-widest bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A] shadow-md">
                    提交連結
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右側：聊天室 */}
      <div className="w-[400px] bg-[#F5F0E8] rounded-[2.5rem] p-4 flex flex-col relative shrink-0 shadow-sm border border-[#E2DDD4]">
        <div className="bg-white rounded-t-[2rem] p-6 border-b border-[#E2DDD4] flex items-center gap-4 shadow-sm z-10">
           <div className="w-11 h-11 bg-[#F5F0E8] rounded-full flex items-center justify-center border border-[#E2DDD4]">
             <User size={22} className="text-[#8C8880]" />
           </div>
           <span className="font-bold text-[#1A1A18] text-lg">{currentTask.vendor || '廠商'}</span>
        </div>
        <div className="flex-1 bg-white p-6 overflow-y-auto"></div>
        <div className="bg-[#F5F0E8] p-5 rounded-b-[2rem]">
          <div className="bg-white rounded-full flex items-center px-5 py-3 gap-3 shadow-sm border border-[#E2DDD4] focus-within:border-[#1A1A18] transition-colors">
            <input type="text" placeholder="傳送訊息..." className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#8C8880]" />
            <Smile size={24} className="text-[#8C8880] cursor-pointer" />
            <button className="bg-[#1A1A18] text-[#F5F0E8] p-2.5 rounded-full hover:bg-[#C8522A] shadow-md">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 文案撰寫彈出視窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1A1A18]/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-12 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-[#E2DDD4]">
            
            {currentTask.status === 'rejected' && (
              <div className="mb-6 bg-[#FDF0ED] text-[#C8522A] px-6 py-4 rounded-2xl text-sm font-bold border border-[#FDF0ED] leading-relaxed shadow-sm">
                <span className="text-xs uppercase tracking-tighter block mb-1 opacity-80">廠商要求修改：</span>
                {currentTask.rejectReason}
              </div>
            )}

            <textarea 
              value={copyText}
              onChange={(e) => setCopyText(e.target.value)}
              placeholder="請輸入欲發佈的圖文內容草稿...."
              className="w-full h-72 bg-[#F8F9FA] border border-[#E2DDD4] rounded-[1.5rem] p-8 outline-none focus:border-[#1A1A18] resize-none mb-8 text-[#1A1A18] leading-relaxed transition-colors placeholder:text-[#8C8880] font-medium"
            ></textarea>

            <div className="flex gap-5">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-[#F5F0E8] text-[#8C8880] py-4 rounded-full font-bold hover:bg-[#E2DDD4] hover:text-[#1A1A18] transition-all active:scale-95 text-sm">
                取消
              </button>
              <button onClick={handleSubmitCopy} className="flex-1 bg-[#1A1A18] text-[#F5F0E8] py-4 rounded-full font-bold hover:bg-[#C8522A] transition-all active:scale-95 shadow-xl text-sm">
                確認送出審核
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}