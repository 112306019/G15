import React, { useState } from 'react';
import { ArrowLeft, User, Smile, Send } from 'lucide-react';

export default function TaskDetailPage({ onBack }) {
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
    <div className="flex h-[calc(100vh-80px)] p-12 gap-12 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      
      {/* =========================================
          左側：執行進度區 (佔據主要寬度)
      ========================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 標題與返回鍵 + 測試區控制面板 */}
        <div className="flex items-center gap-6 mb-12 shrink-0 w-full"> 
            <button onClick={onBack} className="hover:bg-gray-200 p-2 rounded-full transition-colors">
              <ArrowLeft size={32} className="text-gray-400" />
            </button>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">WANGE001專案執行進度</h2>
            
            {/* 測試用控制面板 */}
            <div className="ml-auto flex gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
              <span className="text-[10px] text-gray-400 font-black self-center mx-3 tracking-widest">UI 狀態測試</span>
              {['initial', 'reviewing', 'rejected', 'approved'].map((s) => (
                <button 
                  key={s} 
                  onClick={() => setStepStatus(s)}
                  className={`text-[10px] px-4 py-1.5 rounded-lg font-bold shadow-sm transition-all ${
                    stepStatus === s ? 'bg-black text-white scale-105' : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
        </div>
        
        {/* 左側內容水平排列：商品卡 + 進度操作 */}
        <div className="flex gap-12 flex-1 overflow-y-auto pb-10 pr-4">
          
          {/* 1. 商品資訊卡片 */}
          <div className="w-[340px] shrink-0">
            <div className="bg-[#2A2A2A] rounded-[2.5rem] p-10 shadow-xl border border-gray-800 text-white flex flex-col items-center justify-center relative overflow-hidden">
              <span className="text-yellow-500 font-bold text-xl italic tracking-wider mb-2">SanDisk</span>
              <span className="text-2xl font-black mb-2">Extreme PRO</span>
              <span className="text-sm font-bold text-gray-300 mb-6 font-mono">200 MB/s V30</span>
              <span className="text-7xl font-black text-red-500 mb-6 drop-shadow-md">128<span className="text-xl">GB</span></span>
              <div className="w-full bg-gray-200 h-9 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-black tracking-widest text-sm">SanDisk</span>
              </div>
            </div>
          </div>

          {/* 2. 進度操作區塊 */}
          <div className="flex-1 flex flex-col gap-12">
            
            {/* 區塊 A: 文案撰寫 */}
            <div>
              <h3 className="text-xl font-bold text-slate-700 mb-6 ml-2">文案撰寫</h3>
              
              {stepStatus === 'initial' && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
                        <button 
                            onClick={() => setShowModal(true)}
                            className="flex-1 text-left text-gray-400 text-sm outline-none px-2 py-1"
                        >
                            輸入文字...
                        </button>
                        <button className="bg-gray-100 text-gray-500 px-7 py-2.5 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors uppercase tracking-wider">confirm</button>
                    </div>
                    <div className="text-sm text-gray-400 font-medium ml-4 mt-2">截止日期 2026-05-18</div>
                </div>
              )}

              {stepStatus === 'reviewing' && (
                <div className="bg-gray-50 text-slate-600 font-bold text-sm px-6 py-5 rounded-2xl text-center w-full shadow-inner border border-gray-100">
                    已完成請等待廠商審核
                </div>
              )}

              {stepStatus === 'rejected' && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-5">
                        <span className="text-red-500 font-bold text-sm bg-red-50 px-8 py-3 rounded-full border border-red-100 shadow-sm">不通過</span>
                        <button onClick={() => setShowModal(true)} className="text-sm font-bold bg-black text-white px-10 py-3.5 rounded-full hover:bg-gray-800 shadow-lg transition-transform active:scale-95">修改文案</button>
                    </div>
                    <div className="text-sm text-gray-400 font-medium ml-4 mt-2">截止日期 2026-05-19</div>
                </div>
              )}

              {stepStatus === 'approved' && (
                <div className="flex flex-col gap-3">
                    <div className="text-green-600 font-bold text-sm px-8 py-3 rounded-full bg-green-50 inline-block w-fit border border-green-100 shadow-sm">已審核通過</div>
                    <div className="text-sm text-gray-400 font-medium ml-4 mt-2 text-green-700/50">截止日期 2026-05-20</div>
                </div>
              )}
            </div>

            {/* 區塊 B: 作品上傳 */}
            <div>
              <h3 className="text-xl font-bold text-slate-700 mb-6 ml-2">作品上傳</h3>
              <div className="flex items-center bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
                <input 
                  type="text" 
                  placeholder="貼文連結" 
                  className="flex-1 bg-transparent outline-none text-sm px-2 text-slate-600 disabled:opacity-50"
                  disabled={stepStatus !== 'approved'} 
                />
                <button 
                  className={`px-10 py-2.5 rounded-full font-bold text-sm transition-colors uppercase tracking-widest ${
                    stepStatus === 'approved' ? 'bg-black text-white hover:bg-gray-800 shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
          右側：聊天室
      ========================================== */}
      <div className="w-[400px] bg-gray-200 rounded-[2.5rem] p-4 flex flex-col relative shrink-0 shadow-sm">
        
        <div className="bg-white rounded-t-3xl p-6 border-b flex items-center gap-4 shadow-sm z-10">
           <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center border border-gray-100">
             <User size={22} className="text-gray-400" />
           </div>
           <span className="font-bold text-slate-700 text-lg">廠商1</span>
        </div>

        <div className="flex-1 bg-white p-6 overflow-y-auto"></div>

        <div className="bg-gray-200 p-5 rounded-b-3xl">
          <div className="bg-white rounded-full flex items-center px-5 py-3 gap-3 shadow-inner">
            <input type="text" placeholder="text..." className="flex-1 bg-transparent outline-none text-sm" />
            <Smile size={24} className="text-gray-400 cursor-pointer hover:text-slate-600 transition-colors" />
            <button className="bg-black text-white p-2.5 rounded-full hover:bg-gray-800 transition-all active:scale-90 shadow-md">
              <Send size={18} />
            </button>
          </div>
        </div>
        
        <div className="absolute -bottom-3 left-10 w-8 h-8 bg-gray-200 rotate-45 -z-10 rounded-sm"></div>
      </div>

      {/* =========================================
          文案撰寫彈出視窗 (Modal)
      ========================================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-12 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300">
            
            {stepStatus === 'rejected' && (
              <div className="mb-8 bg-red-50 text-red-600 px-8 py-5 rounded-2xl text-sm font-bold border border-red-100 leading-relaxed shadow-sm">
                <span className="text-xs uppercase tracking-tighter block mb-1 opacity-60">廠商意見：</span>
                最近入手SanDisk記憶卡真的有感升級! 拍照錄影都超順...
              </div>
            )}

            <textarea 
              value={copyText}
              onChange={(e) => setCopyText(e.target.value)}
              placeholder="請輸入文案...."
              className="w-full h-72 bg-gray-50 border border-gray-100 rounded-[1.5rem] p-8 outline-none focus:ring-2 focus:ring-slate-100 resize-none mb-8 text-slate-700 leading-relaxed shadow-inner"
            ></textarea>

            <div className="flex justify-between items-end mb-10">
              <div className="text-xs font-bold text-slate-400 space-y-2 ml-2">
                <p className="text-slate-600">請注意：</p>
                <p>• 文案長度需 ≥ 50 字</p>
                <p>• 需包含優惠碼</p>
              </div>
            </div>

            <div className="flex gap-5">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-100 text-slate-600 py-4 rounded-full font-bold hover:bg-gray-200 transition-all active:scale-95 uppercase tracking-widest text-xs"
              >
                儲存草稿
              </button>
              <button 
                onClick={handleSubmitCopy}
                className="flex-1 bg-black text-white py-4 rounded-full font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-xl uppercase tracking-widest text-xs"
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