import React from 'react';

// 🌟 新增 user 作為接收的 prop
export default function UserDetail({ setCurrentPage, user }) {
  
  // 如果沒有選中用戶 (防呆機制)，顯示提示
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
          {/* 🌟 動態顯示姓名第一個字當作頭像 */}
          <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center text-4xl text-white font-bold">
            {user.name.charAt(0)}
          </div>
          <div>
            {/* 🌟 動態顯示姓名與 ID */}
            <h2 className="text-3xl font-bold text-gray-800">{user.name}</h2>
            <p className="text-blue-500 font-medium mt-1">用戶 ID: {user.id}</p>
            <div className="mt-3 flex gap-2">
              {/* 🌟 動態顯示狀態標籤 */}
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                user.status === 'active' ? 'bg-green-100 text-green-600' : 
                user.status === 'applying' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
              }`}>
                {user.status === 'active' ? '已啟用' : user.status === 'applying' ? '申請中' : '已停權'}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-l-4 border-black pl-3">基本資訊</h3>
            {/* 🌟 動態顯示各項基本資料 */}
            <p className="text-gray-600"><span className="font-medium text-gray-400">真實姓名：</span> {user.name}</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">電子信箱：</span> {user.email}</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">聯絡電話：</span> {user.phone}</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">註冊日期：</span> {user.date}</p>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-l-4 border-black pl-3">帳號數據</h3>
            {/* 這些數據列表裡沒有，先放預設值 */}
            <p className="text-gray-600"><span className="font-medium text-gray-400">IG 粉絲：</span> 尚未綁定</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">平均互動率：</span> --</p>
            <p className="text-gray-600"><span className="font-medium text-gray-400">累計收益：</span> $0</p>
          </div>
        </div>
      </div>
    </div>
  );
}