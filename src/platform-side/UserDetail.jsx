import React from 'react';

export default function UserDetail({ setCurrentPage }) {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <button onClick={() => setCurrentPage('user')} className="text-gray-500 hover:text-black mb-4 flex items-center">⬅️ 返回列表</button>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-6 mb-8 pb-8 border-b border-gray-100">
          <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center text-4xl text-white font-bold">美</div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800">王美美</h2>
            <p className="text-blue-500 font-medium mt-1">@meimei_beauty</p>
            <div className="mt-3 flex gap-2">
              <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold">已認證 KOC</span>
              <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">美妝博主</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-l-4 border-black pl-3">基本資訊</h3>
            <p className="text-gray-600"><span className="font-medium text-gray-400">真實姓名：</span> 王美美</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">電子信箱：</span> meimei@gmail.com</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">聯絡電話：</span> 0912-345-678</p>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-l-4 border-black pl-3">帳號數據</h3>
            <p className="text-gray-600"><span className="font-medium text-gray-400">IG 粉絲：</span> 5.2W</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">平均互動率：</span> 4.8%</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">累計收益：</span> $45,800</p>
          </div>
        </div>
      </div>
    </div>
  );
}