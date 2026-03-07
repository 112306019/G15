import React from 'react';
import StatusBadge from '../components/StatusBadge'; // 🌟 引入標籤

export default function UserDetail({ setCurrentPage, user }) {
  if (!user) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center space-y-4">
        <p className="text-gray-500">找不到用戶資料，請返回列表重新選擇。</p>
        <button onClick={() => setCurrentPage('user')} className="text-blue-500 hover:underline">返回列表</button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <button onClick={() => setCurrentPage('user')} className="text-gray-500 hover:text-black mb-4 flex items-center">⬅️ 返回列表</button>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-6 mb-8 pb-8 border-b border-gray-100">
          <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center text-4xl text-white font-bold">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{user.name}</h2>
            <p className="text-blue-500 font-medium mt-1">用戶 ID: {user.id}</p>
            <div className="mt-3 flex gap-2">
              {/* 🌟 替換成 StatusBadge */}
              {user.isKoc && <StatusBadge type="purple">KOC</StatusBadge>}
              <StatusBadge type={user.status === 'active' ? 'success' : user.status === 'applying' ? 'warning' : 'danger'}>
                {user.status === 'active' ? '✅ 已啟用' : user.status === 'applying' ? '⏳ 申請中' : '🚫 已停權'}
              </StatusBadge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-l-4 border-black pl-3">基本資料</h3>
            <p className="text-gray-600"><span className="font-medium text-gray-400">註冊日期：</span> {user.date}</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">聯絡電話：</span> {user.phone}</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">電子信箱：</span> {user.email}</p>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-l-4 border-black pl-3">平台活動紀錄</h3>
            <p className="text-gray-600"><span className="font-medium text-gray-400">總登入次數：</span> 128 次</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">最後上線時間：</span> 2026/03/07 14:30</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">違規紀錄：</span> 0 次</p>
          </div>
        </div>
      </div>
    </div>
  );
}