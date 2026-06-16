import React, { useState } from 'react';
import { ArrowLeft, User, Smile, Send } from 'lucide-react'; // 🟢 補上 ArrowLeft 引入

export default function TaskDetailPage({ onBack }) { // 🟢 補上 onBack 屬性
  // 狀態管理：控制任務目前的進度
  const [stepStatus, setStepStatus] = useState('initial'); 
  const [showModal, setShowModal] = useState(false);
  const [copyText, setCopyText] = useState('');

  // 模擬送出文案
  const handleSubmitCopy = () => {
    setShowModal(false);
    setStepStatus('reviewing'); 
  };

  return (
    <div className="flex h-[calc(100vh-80px)] max-w-[1600px] mx-auto animate-in fade-in duration-300">
      
      {/* =========================================
          左側：執行進度區 (佔據主要寬度)
      ========================================== */}
      <div className="flex-1 flex flex-col min-w-0 pr-12">
        
        {/* 🟢 加入帶有 Hover 動效的高質感返回按鍵 */}
        <button 
          onClick={onBack} 
          className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          返回任務管理
        </button>

        {/* 標題 + 測試區控制面板 */}
        <div className="flex items-center justify-between mb-12 shrink-0 w-full"> 
            <h2 className="text-[28px] font-serif font-bold text-[#1A1A18] tracking-tight">WANGE001專案執行進度</h2>
            
            {/* 測試用控制面板 (套用拿鐵與深邃黑) */}
            <div className="flex gap-2 bg-[#F5F0E8] p-1.5 rounded-xl border border-[#E2DDD4]">
              <span className="text-[10px] text-[#8C8880] font-black self-center mx-3 tracking-widest">UI 狀態測試</span>
              {['initial', 'reviewing', 'rejected', 'approved'].map((s) => (
                <button 
                  key={s} 
                  onClick={() => setStepStatus(s)}
                  className={`text-[10px] px-4 py-1.5 rounded-lg font-bold shadow-sm transition-all uppercase ${
                    stepStatus === s 
                      ? 'bg-[#1A1A18] text-[#F5F0E8] scale-105' 
                      : 'bg-white text-[#8C8880] hover:bg-[#F8F9FA]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
        </div>
        
        {/* 左側內容水平排列：商品卡 + 進度操作 */}
        <div className="flex gap-12 flex-1 overflow-y-auto pb-10 pr-4">
          
          {/* 1. 商品資訊卡片 (轉換為帶有溫暖高級感的深色卡片) */}
          <div className="w-[340px] shrink-0">
            <div className="bg-[#1A1A18] rounded-[2.5rem] p-10 shadow-xl border border-[#E2DDD4] text-white flex flex-col items-center justify-center relative overflow-hidden">
              <span className="text-[#B89B6A] font-bold text-xl italic tracking-wider mb-2">SanDisk</span>
              <span className="text-2xl font-black mb-2 text-[#F5F0E8]">Extreme PRO</span>
              <span className="text-sm font-bold text-[#8C8880] mb-6 font-mono">200 MB/s V30</span>
              {/* 記憶體數字使用焦糖橘強調 */}
              <span className="text-7xl font-black text-[#C8522A] mb-6 drop-shadow-md">
                128<span className="text-xl">GB</span>
              </span>
              <div className="w-full bg-[#F5F0E8] h-9 rounded-lg flex items-center justify-center">
                <span className="text-[#1A1A18] font-black tracking-widest text-sm">SanDisk</span>
              </div>
            </div>
          </div>

          {/* 2. 進度操作區塊 */}
          <div className="flex-1 flex flex-col gap-12">
            
            {/* 區塊 A: 文案撰寫 */}
            <div>
              <h3 className="text-xl font-bold text-[#1A1A18] mb-6 ml-2">文案撰寫</h3>
              
              {stepStatus === 'initial' && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4 bg-white border border-[#E2DDD4] rounded-full px-4 py-2 shadow-sm focus-within:border-[#1A1A18] transition-colors">
                        <button 
                            onClick={() => setShowModal(true)}
                            className="flex-1 text-left text-[#8C8880] text-sm outline-none px-2 py-1"
                        >
                            輸入文字...
                        </button>
                        <button className="bg-[#F5F0E8] text-[#1A1A18] px-7 py-2.5 rounded-full text-sm font-bold hover:bg-[#E2DDD4] transition-colors uppercase tracking-wider">
                          confirm
                        </button>
                    </div>
                    <div className="text-sm text-[#8C8880] font-medium ml-4 mt-2">截止日期 <span className="text-[#C8522A]">2026-05-18</span></div>
                </div>
              )}

              {stepStatus === 'reviewing' && (
                <div className="bg-[#F5F0E8] text-[#8C8880] font-bold text-sm px-6 py-5 rounded-2xl text-center w-full border border-[#E2DDD4]">
                    已完成請等待廠商審核
                </div>
              )}

              {stepStatus === 'rejected' && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-5">
                        <span className="text-[#C8522A] font-bold text-sm bg-[#FDF0ED] px-8 py-3 rounded-full border border-[#FDF0ED] shadow-sm">
                          不通過
                        </span>
                        <button onClick={() => setShowModal(true)} className="text-sm font-bold bg-[#1A1A18] text-[#F5F0E8] px-10 py-3.5 rounded-full hover:bg-[#C8522A] shadow-lg transition-all active:scale-95">
                          修改文案
                        </button>
                    </div>
                    <div className="text-sm text-[#8C8880] font-medium ml-4 mt-2">截止日期 <span className="text-[#C8522A]">2026-05-19</span></div>
                </div>
              )}

              {stepStatus === 'approved' && (
                <div className="flex flex-col gap-3">
                    <div className="text-[#1A1A18] font-bold text-sm px-8 py-3 rounded-full bg-[#F5F0E8] inline-block w-fit border border-[#E2DDD4] shadow-sm">
                      已審核通過
                    </div>
                </div>
              )}
            </div>

            {/* 區塊 B: 作品上傳 */}
            <div>
              <h3 className="text-xl font-bold text-[#1A1A18] mb-6 ml-2">作品上傳</h3>
              <div className="flex items-center bg-white border border-[#E2DDD4] rounded-full px-4 py-2 shadow-sm focus-within:border-[#1A1A18] transition-colors">
                <input 
                  type="text" 
                  placeholder="貼文連結" 
                  className="flex-1 bg-transparent outline-none text-sm px-2 text-[#1A1A18] placeholder:text-[#8C8880] disabled:opacity-50"
                  disabled={stepStatus !== 'approved'} 
                />
                <button 
                  className={`px-10 py-2.5 rounded-full font-bold text-sm transition-all uppercase tracking-widest ${
                    stepStatus === 'approved' 
                      ? 'bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A] shadow-md' 
                      : 'bg-[#F5F0E8] text-[#8C8880] cursor-not-allowed'
                  }`}
                >
                  upload
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          右側：聊天室 (套用拿鐵底色)
      ========================================== */}
      <div className="w-[400px] bg-[#F5F0E8] rounded-[2.5rem] p-4 flex flex-col relative shrink-0 shadow-sm border border-[#E2DDD4]">
        
        <div className="bg-white rounded-t-[2rem] p-6 border-b border-[#E2DDD4] flex items-center gap-4 shadow-sm z-10">
           <div className="w-11 h-11 bg-[#F5F0E8] rounded-full flex items-center justify-center border border-[#E2DDD4]">
             <User size={22} className="text-[#8C8880]" />
           </div>
           <span className="font-bold text-[#1A1A18] text-lg">廠商1</span>
        </div>

        <div className="flex-1 bg-white p-6 overflow-y-auto"></div>

        <div className="bg-[#F5F0E8] p-5 rounded-b-[2rem]">
          <div className="bg-white rounded-full flex items-center px-5 py-3 gap-3 shadow-sm border border-[#E2DDD4] focus-within:border-[#1A1A18] transition-colors">
            <input type="text" placeholder="text..." className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#8C8880]" />
            <Smile size={24} className="text-[#8C8880] cursor-pointer hover:text-[#1A1A18] transition-colors" />
            <button className="bg-[#1A1A18] text-[#F5F0E8] p-2.5 rounded-full hover:bg-[#C8522A] transition-all active:scale-90 shadow-md">
              <Send size={18} />
            </button>
          </div>
        </div>
        
        {/* 聊天室左下角的小角錐 */}
        <div className="absolute -bottom-3 left-10 w-8 h-8 bg-[#F5F0E8] rotate-45 -z-10 rounded-sm border-b border-r border-[#E2DDD4]"></div>
      </div>

      {/* =========================================
          文案撰寫彈出視窗 (Modal)
      ========================================== */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1A1A18]/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-12 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-[#E2DDD4]">
            
            {stepStatus === 'rejected' && (
              <div className="mb-8 bg-[#FDF0ED] text-[#C8522A] px-8 py-5 rounded-2xl text-sm font-bold border border-[#FDF0ED] leading-relaxed shadow-sm">
                <span className="text-xs uppercase tracking-tighter block mb-1 opacity-80">廠商意見：</span>
                最近入手SanDisk記憶卡真的有感升級! 拍照錄影都超順...
              </div>
            )}

            <textarea 
              value={copyText}
              onChange={(e) => setCopyText(e.target.value)}
              placeholder="請輸入文案...."
              className="w-full h-72 bg-[#F8F9FA] border border-[#E2DDD4] rounded-[1.5rem] p-8 outline-none focus:border-[#1A1A18] resize-none mb-8 text-[#1A1A18] leading-relaxed transition-colors placeholder:text-[#8C8880]"
            ></textarea>

            <div className="flex justify-between items-end mb-10">
              <div className="text-xs font-bold text-[#8C8880] space-y-2 ml-2">
                <p className="text-[#1A1A18]">請注意：</p>
                <p>• 文案長度需 ≥ 50 字</p>
                <p>• 需包含優惠碼</p>
              </div>
            </div>

            <div className="flex gap-5">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 bg-[#F5F0E8] text-[#8C8880] py-4 rounded-full font-bold hover:bg-[#E2DDD4] hover:text-[#1A1A18] transition-all active:scale-95 uppercase tracking-widest text-xs"
              >
                儲存草稿
              </button>
              <button 
                onClick={handleSubmitCopy}
                className="flex-1 bg-[#1A1A18] text-[#F5F0E8] py-4 rounded-full font-bold hover:bg-[#C8522A] transition-all active:scale-95 shadow-xl uppercase tracking-widest text-xs"
              >
                {stepStatus === 'rejected' ? '提交' : '確認'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}