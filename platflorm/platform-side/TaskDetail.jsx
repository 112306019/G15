import React from 'react';

export default function TaskDetail({ setCurrentPage }) {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <button onClick={() => setCurrentPage('task')} className="text-gray-500 hover:text-black mb-4 flex items-center">⬅️ 返回列表</button>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-3xl font-bold text-gray-800">春季彩妝新品體驗大募集</h2>
          <span className="bg-green-100 text-green-600 px-4 py-1 rounded-full font-bold">進行中</span>
        </div>
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-3">
            <p className="text-gray-500"><span className="font-bold text-gray-800">發布廠商：</span>極速科技公司</p>
            <p className="text-gray-500"><span className="font-bold text-gray-800">單人酬勞：</span>$1,500</p>
            <p className="text-gray-500"><span className="font-bold text-gray-800">招募人數：</span>10 人 (已徵 4 人)</p>
          </div>
          <div className="space-y-3">
            <p className="text-gray-500"><span className="font-bold text-gray-800">發布日期：</span>2026/02/25</p>
            <p className="text-gray-500"><span className="font-bold text-gray-800">結案日期：</span>2026/03/30</p>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-bold text-lg border-l-4 border-black pl-3">任務說明與要求</h3>
          <div className="bg-gray-50 p-6 rounded-xl text-gray-600 leading-relaxed">
            1. 需擁有 Instagram 帳號且粉絲數達 10,000 以上。<br/>
            2. 需拍攝至少 3 張精美產品使用照（含人臉入鏡）。<br/>
            3. 發文需標記 #KOC平台 #春季彩妝 #新品體驗。<br/>
            4. 貼文需保留至少 30 天不得刪除。
          </div>
        </div>
      </div>
    </div>
  );
}