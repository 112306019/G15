import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Smile, Send, CheckCircle2, Edit3, AlertCircle, Info, Calendar, Ticket } from 'lucide-react';

export default function TaskDetailPage({ onBack }) {
  const [currentTask, setCurrentTask] = useState(() => {
    const savedTask = localStorage.getItem('currentSelectedTask');
    return savedTask ? JSON.parse(savedTask) : null;
  });

  const [showModal, setShowModal] = useState(false);
  const [copyText, setCopyText] = useState('');
  const [linkText, setLinkText] = useState('');

  if (!currentTask) return null; 

  const updateGlobalTasks = (updatedTask) => {
    const savedGlobal = JSON.parse(localStorage.getItem('koc_tasks')) || [];
    const newGlobalTasks = savedGlobal.map(t => t.id === updatedTask.id ? updatedTask : t);
    localStorage.setItem('koc_tasks', JSON.stringify(newGlobalTasks));
  };

  const handleSubmitCopy = () => {
    setShowModal(false);
    const updatedTask = { ...currentTask, stage: 3, status: 'reviewing', rejectReason: '' };
    setCurrentTask(updatedTask);
    updateGlobalTasks(updatedTask);
  };

  const handleSubmitLink = () => {
    if (!linkText.trim()) return alert('請輸入連結！');
    const updatedTask = { ...currentTask, stage: 5, status: '' };
    setCurrentTask(updatedTask);
    updateGlobalTasks(updatedTask);
    alert('已成功提交連結！返回任務中心即可在「已結案」看到任務。');
    onBack(); 
  };

  // 畫面邏輯判斷
  const isEditable = currentTask.stage === 2 || (currentTask.stage === 3 && currentTask.status === 'rejected');
  const isReviewing = currentTask.stage === 3 && currentTask.status === 'reviewing';
  const isWaitPublish = currentTask.stage === 4;

  return (
    <div className="flex h-[calc(100vh-80px)] max-w-[1400px] mx-auto animate-in fade-in duration-300 gap-8 pb-8">
      
      {/* =========================================
          左側：主要內容區
      ========================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 返回按鈕 */}
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit">
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          返回任務中心
        </button>

        {/* 標題與橫向資訊列 */}
        <div className="mb-6">
          <div className="flex justify-between items-end mb-4">
            <div>
              <span className="text-xs font-black text-[#8C8880] tracking-widest uppercase mb-2 block">{currentTask.vendor}</span>
              <h2 className="text-[32px] font-serif font-black text-[#1A1A18] tracking-tight leading-tight">
                {currentTask.productName}
              </h2>
            </div>
            {/* 任務狀態小標籤 */}
            <div className="bg-[#FDF0ED] text-[#C8522A] px-4 py-1.5 rounded-full text-sm font-bold border border-[#FDF0ED] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C8522A] animate-pulse"></span>
              執行中
            </div>
          </div>

          {/* 橫向黑色 Banner */}
          <div className="bg-[#1A1A18] rounded-3xl p-6 flex justify-between items-center shadow-lg border border-[#E2DDD4]/20">
            <div className="flex items-center gap-8 text-[#F5F0E8]">
              <div>
                <p className="text-[#8C8880] text-xs font-bold mb-1">任務截止日</p>
                <p className="font-mono font-bold flex items-center gap-2"><Calendar size={14}/> {currentTask.deadline || '2026-05-30'}</p>
              </div>
              <div className="w-px h-8 bg-[#8C8880]/30"></div>
              <div>
                <p className="text-[#8C8880] text-xs font-bold mb-1">專屬優惠碼</p>
                <p className="font-mono font-black text-[#C8522A] tracking-wider">{currentTask.promoCode || '無'}</p>
              </div>
              <div className="w-px h-8 bg-[#8C8880]/30"></div>
              <div>
                <p className="text-[#8C8880] text-xs font-bold mb-1">預估分潤收益</p>
                <p className="font-bold">NT$ {currentTask.reward || '依實際轉換計算'}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* 獨立的主視覺操作卡片 */}
        <div className="flex-1 bg-white rounded-[2rem] border border-[#E2DDD4] shadow-sm p-10 flex flex-col overflow-y-auto">
          
          {/* 🟢 情境 1：可以填寫/修改文案 */}
          {isEditable && (
            <div className="animate-in fade-in duration-500 max-w-2xl mx-auto w-full mt-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#F5F0E8] rounded-full flex items-center justify-center text-[#1A1A18]"><Edit3 size={18} /></div>
                <h3 className="text-2xl font-bold text-[#1A1A18]">撰寫文案草稿</h3>
              </div>

              {/* 🌟 修改：優惠碼配發提示區塊 (強調審核後才生效) */}
              {currentTask.promoCode && (
                <div className="mb-6 bg-[#FDF0ED]/40 border border-[#C8522A]/20 rounded-2xl p-5 flex items-center gap-5 shadow-sm">
                  <div className="bg-white text-[#C8522A] px-4 py-2.5 rounded-xl font-black text-lg tracking-wider border border-[#C8522A]/30 shadow-sm flex items-center gap-2">
                    <Ticket size={18} />
                    {currentTask.promoCode}
                  </div>
                  <div className="flex-1">
                    <p className="text-[#1A1A18] font-bold text-sm mb-1 flex items-center gap-1.5">
                      <Info size={16} className="text-[#C8522A]" /> 專屬優惠碼已配發
                    </p>
                    <p className="text-[#8C8880] text-xs font-medium leading-relaxed">
                      請務必將此優惠碼加入下方的文案草稿中。<strong>待廠商審核通過後，該優惠碼即會正式開通生效</strong>，用於追蹤並計算您的分潤收益。
                    </p>
                  </div>
                </div>
              )}
              
              {/* 被退件時的提示 */}
              {currentTask.status === 'rejected' && (
                <div className="mb-6 bg-[#FDF0ED] border border-[#FDF0ED] rounded-2xl px-6 py-5 flex gap-3 shadow-sm">
                  <AlertCircle size={20} className="text-[#C8522A] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#C8522A] font-black text-xs uppercase tracking-wider mb-1 block">廠商要求修改</span>
                    <span className="text-sm text-[#1A1A18] font-bold leading-relaxed">{currentTask.rejectReason}</span>
                  </div>
                </div>
              )}
              
              {/* 偽裝成輸入框的按鈕，引導使用者點擊 */}
              <div 
                onClick={() => setShowModal(true)} 
                className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-6 min-h-[160px] cursor-pointer hover:border-[#C8522A] hover:bg-white transition-all group flex flex-col justify-center items-center gap-3 shadow-sm"
              >
                <Edit3 size={24} className="text-[#8C8880] group-hover:text-[#C8522A] transition-colors" />
                <span className="text-[#8C8880] font-bold group-hover:text-[#1A1A18] transition-colors">
                  {currentTask.status === 'rejected' ? '點此修改您的文案草稿...' : '點擊開始撰寫您的文案草稿...'}
                </span>
              </div>
            </div>
          )}

          {/* 🟢 情境 2：廠商審核中 */}
          {isReviewing && (
            <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
              <div className="w-24 h-24 bg-[#FDF0ED] rounded-full flex items-center justify-center mb-6 shadow-inner border border-[#C8522A]/20">
                <CheckCircle2 size={48} className="text-[#C8522A]" />
              </div>
              <h3 className="text-2xl font-bold text-[#1A1A18] mb-3">文案已送出審核</h3>
              <p className="text-[#8C8880] font-medium leading-relaxed">
                廠商正在確認您的圖文內容。<br/>審核通過後，任務將會自動移至「待發佈」階段。
              </p>
            </div>
          )}

          {/* 🟢 情境 3：待發佈 (上傳連結) */}
          {isWaitPublish && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full mt-4">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-[#FDF0ED] rounded-full flex items-center justify-center text-[#C8522A]"><CheckCircle2 size={18} /></div>
                <h3 className="text-2xl font-bold text-[#1A1A18]">文案審核已通過！</h3>
              </div>
              
              <div className="bg-[#F8F9FA] rounded-2xl p-8 border border-[#E2DDD4]">
                <p className="text-[#1A1A18] font-bold mb-6 flex items-center gap-2">
                  <Info size={16} className="text-[#C8522A]" /> 優惠碼已生效！請將完成的貼文發佈至社群，並提交連結。
                </p>
                
                <div className="flex flex-col gap-4">
                  <input 
                    type="text" 
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="請貼上 IG/FB 貼文連結 (例如: https://instagram.com/...)" 
                    className="w-full bg-white border border-[#E2DDD4] rounded-xl px-5 py-4 text-sm text-[#1A1A18] placeholder:text-[#8C8880] font-medium outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all shadow-sm"
                  />
                  <button onClick={handleSubmitLink} className="w-full bg-[#1A1A18] text-[#F5F0E8] py-4 rounded-xl font-bold transition-all hover:bg-[#C8522A] shadow-md text-sm tracking-widest">
                    確認提交連結
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================
          右側：聊天室
      ========================================== */}
      <div className="w-[380px] bg-[#F5F0E8] rounded-[2rem] p-4 flex flex-col relative shrink-0 shadow-sm border border-[#E2DDD4]">
        <div className="bg-white rounded-t-[1.5rem] p-5 border-b border-[#E2DDD4] flex items-center gap-4 shadow-sm z-10">
           <div className="w-10 h-10 bg-[#F5F0E8] rounded-full flex items-center justify-center border border-[#E2DDD4]">
             <User size={20} className="text-[#8C8880]" />
           </div>
           <div>
             <span className="font-bold text-[#1A1A18] block">{currentTask.vendor || '廠商'}</span>
             <span className="text-[10px] text-[#8C8880] font-bold">線上客服</span>
           </div>
        </div>
        <div className="flex-1 bg-white p-6 overflow-y-auto">
          <div className="text-center text-xs text-[#8C8880] my-4 font-bold">您已加入聊天室，可隨時與廠商聯繫</div>
        </div>
        <div className="bg-[#F5F0E8] p-4 rounded-b-[1.5rem]">
          <div className="bg-white rounded-full flex items-center px-4 py-2 gap-3 shadow-sm border border-[#E2DDD4] focus-within:border-[#1A1A18] transition-colors">
            <input type="text" placeholder="傳送訊息..." className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#8C8880]" />
            <Smile size={20} className="text-[#8C8880] cursor-pointer hover:text-[#1A1A18]" />
            <button className="bg-[#1A1A18] text-[#F5F0E8] p-2 rounded-full hover:bg-[#C8522A] shadow-md">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================
          文案撰寫彈出視窗 (Modal)
      ========================================== */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1A1A18]/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-[#E2DDD4]">
            
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-[#1A1A18]">編輯文案草稿</h3>
            </div>

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
              className="w-full h-64 bg-[#F8F9FA] border border-[#E2DDD4] rounded-[1.5rem] p-6 outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 resize-none mb-6 text-[#1A1A18] leading-relaxed transition-all placeholder:text-[#8C8880] font-medium shadow-inner"
            ></textarea>

            <div className="flex justify-between items-end mb-8 bg-[#F5F0E8] p-4 rounded-xl border border-[#E2DDD4]">
              <div className="text-xs font-bold text-[#8C8880] space-y-1.5 ml-2">
                <p className="text-[#1A1A18] mb-1">發佈規範：</p>
                <p>• 文案長度建議大於 50 字</p>
                <p>• 請務必包含專屬優惠碼：<span className="text-[#C8522A] bg-white px-2 py-0.5 rounded-md border border-[#E2DDD4] ml-1">{currentTask.promoCode || '無'}</span></p>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-white border border-[#E2DDD4] text-[#8C8880] py-3.5 rounded-xl font-bold hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all text-sm">
                取消
              </button>
              <button onClick={handleSubmitCopy} className="flex-[2] bg-[#1A1A18] text-[#F5F0E8] py-3.5 rounded-xl font-bold hover:bg-[#C8522A] transition-all shadow-lg text-sm tracking-widest">
                確認送出審核
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}