import React from 'react';
import { ArrowLeft, User, Smile, Send, Upload } from 'lucide-react';

export default function TaskDetailPage({ onBack }) {
  const steps = [
    { title: '文案撰寫', inputs: [ { label: '輸入文字...', btn: 'finish' }, { label: '上傳檔案', btn: 'upload' } ] },
    { title: '廠商審核', status: '請等待審核結果' },
    { title: '作品上傳', inputs: [ { label: '貼文連結', btn: 'upload' } ] }
  ];

  return (
    <div className="flex h-[calc(100vh-80px)] p-12 gap-12 max-w-[1600px] mx-auto">
      {/* 左側：執行進度區 */}
      <div className="flex-1">
        <div className="flex items-center gap-6 mb-10"> 
            <button onClick={onBack} className="hover:bg-gray-200 p-2 rounded-full transition-colors">
            <ArrowLeft size={32} className="text-gray-400" />
            </button>
            
            {/* 標題會緊貼在箭頭旁邊 */}
            <h2 className="text-3xl font-bold text-slate-800">xx產品專案執行進度</h2>
        </div>
        
        <div className="grid grid-cols-3 gap-12">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col">
              {/* 灰色圖片區 */}
              <div className="bg-gray-100 rounded-2xl aspect-square flex items-center justify-center mb-8">
                <User size={48} className="text-gray-300" />
              </div>
              
              <h3 className="text-xl font-bold mb-8 text-slate-700">{step.title}</h3>

              {/* 輸入與狀態區 */}
              <div className="space-y-4">
                {step.inputs ? step.inputs.map((input, j) => (
                  <div key={j} className="flex items-center bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
                    <input type="text" placeholder={input.label} className="flex-1 bg-transparent outline-none text-sm text-gray-400" />
                    <button className="bg-white border border-gray-200 text-slate-700 p-2 rounded-full hover:bg-slate-50 transition-colors shadow-sm">
                      <Upload size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                )) : (
                  <div className="bg-gray-50 text-slate-800 text-center py-3 rounded-xl font-bold text-sm">
                    {step.status}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右側：聊天室 */}
      <div className="w-[400px] bg-gray-200 rounded-[2rem] p-4 flex flex-col relative">
        {/* 聊天室標題 */}
        <div className="bg-white rounded-t-2xl p-6 border-b flex items-center gap-4">
          
           <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
             <User size={20} className="text-gray-400" />
           </div>
           <span className="font-bold text-slate-700">廠商1</span>
        </div>

        {/* 聊天內容區（空白） */}
        <div className="flex-1 bg-white p-4 overflow-y-auto"></div>

        {/* 底部輸入框 */}
        <div className="bg-gray-200 p-4 rounded-b-2xl">
          <div className="bg-white rounded-full flex items-center px-4 py-2 gap-2 shadow-inner">
            <input type="text" placeholder="text..." className="flex-1 bg-transparent outline-none text-sm" />
            <Smile size={20} className="text-gray-400 cursor-pointer" />
            <button className="bg-black text-white p-2 rounded-full hover:bg-gray-800 transition-colors">
              <Send size={16} />
            </button>
          </div>
        </div>
        
        {/* 對話框小尖角裝飾 */}
        <div className="absolute -bottom-4 left-8 w-8 h-8 bg-gray-200 rotate-45 -z-10"></div>
      </div>
    </div>
  );
}