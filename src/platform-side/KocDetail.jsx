import React from 'react';
import StatusBadge from '../components/StatusBadge'; // 🌟 引入標籤

export default function KocDetail({ setCurrentPage, koc }) {
  if (!koc) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center space-y-4">
        <p className="text-gray-500">找不到 KOC 資料，請返回列表重新選擇。</p>
        <button onClick={() => setCurrentPage('koc')} className="text-blue-500 hover:underline">返回列表</button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <button onClick={() => setCurrentPage('koc')} className="text-gray-500 hover:text-black mb-4 flex items-center">⬅️ 返回列表</button>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-6 mb-8 pb-8 border-b border-gray-100">
          <div className="w-24 h-24 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-4xl text-white font-bold">
            {koc.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{koc.name}</h2>
            <p className="text-purple-500 font-medium mt-1">@ {koc.igHandle || '未綁定 IG'}</p>
            <div className="mt-3 flex gap-2">
              {/* 🌟 替換成 StatusBadge */}
              <StatusBadge type="purple">已認證 KOC</StatusBadge>
              <StatusBadge type={koc.status === 'active' ? 'success' : 'danger'}>
                {koc.status === 'active' ? '接案中' : '已停權'}
              </StatusBadge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-l-4 border-purple-500 pl-3">社群數據</h3>
            <p className="text-gray-600"><span className="font-medium text-gray-400">IG 粉絲數：</span> {koc.followers || '2.5W'}</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">平均互動率：</span> {koc.engagement || '4.2%'}</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">擅長領域：</span> 美妝、穿搭</p>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-l-4 border-purple-500 pl-3">接案紀錄</h3>
            <p className="text-gray-600"><span className="font-medium text-gray-400">已完成任務：</span> 15 件</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">進行中任務：</span> 2 件</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">合作違規次數：</span> 0 次</p>
          </div>
        </div>
      </div>
    </div>
  );
}