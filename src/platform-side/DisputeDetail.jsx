import React, { useState } from 'react';

export default function DisputeDetail({ setCurrentPage, dispute }) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');

  if (!dispute) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-gray-500">找不到案件資料</p>
        <button onClick={() => setCurrentPage('dispute')} className="text-blue-500">返回列表</button>
      </div>
    );
  }

  const handleResolve = () => {
    setShowConfirmModal(false);
    setTimeout(() => {
      alert(`案件 ${dispute.id} 已成功結案！\n處理結果已發送通知給雙方。`);
      setCurrentPage('dispute');
    }, 500);
  };

  return (
    <div className="relative p-8 max-w-6xl mx-auto space-y-6">
      
      {/* 結案確認彈出視窗 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl mb-4 mx-auto">⚠️</div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">確認結案此爭議？</h3>
            <p className="text-gray-600 text-center text-sm mb-6">
              系統將根據您的裁決內容發送通知給雙方，並調整相關款項與信用分數。此操作無法復原。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold">取消</button>
              <button onClick={handleResolve} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">確認結案</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setCurrentPage('dispute')} className="text-gray-500 hover:text-black mb-4 flex items-center">⬅️ 返回爭議列表</button>
      
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-gray-800">案件詳情：{dispute.id}</h2>
        <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
          dispute.status === 'resolved' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-600'
        }`}>
          {dispute.status === 'resolved' ? '✅ 已結案' : '🚨 平台處理中'}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* 左側：爭議內容與證據 */}
        <div className="col-span-3 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          <h3 className="font-bold text-lg border-l-4 border-red-500 pl-3">申訴內容</h3>
          
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div>
              <p className="text-xs text-red-500 font-bold mb-1">申訴方</p>
              <p className="font-bold text-gray-800">{dispute.initiator}</p>
            </div>
            <div className="text-gray-400 font-bold text-xl">VS</div>
            <div className="text-right">
              <p className="text-xs text-gray-500 font-bold mb-1">被申訴方</p>
              <p className="font-bold text-gray-800">{dispute.respondent}</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">爭議類型</p>
              <span className="bg-red-50 text-red-600 px-3 py-1 rounded-md text-sm font-bold border border-red-100">{dispute.type}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">事件描述</p>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg text-sm leading-relaxed">{dispute.description}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">雙方對話紀錄 / 證據截圖</p>
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">圖片 1</div>
                <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">圖片 2</div>
              </div>
            </div>
          </div>
        </div>

        {/* 右側：平台介入與裁決面板 */}
        <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-red-200 p-8 flex flex-col">
          <h3 className="font-bold text-lg border-l-4 border-black pl-3 mb-6">平台介入處理</h3>
          
          <div className="flex-1 space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">初步判定結果</label>
              <select className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-red-500 bg-white">
                <option>請選擇判定方向...</option>
                <option>判定申訴方 (KOC/廠商) 成立</option>
                <option>判定被申訴方無違規</option>
                <option>雙方皆有疏失，協議和解</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">後續處置動作 (可複選)</label>
              <div className="space-y-2 text-sm text-gray-600">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="rounded" /> 全額退款給廠商</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="rounded" /> 扣除 KOC 信用分數 10 分</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="rounded" /> 終止該任務並解除合作</label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">內部處理備註 (雙方不可見)</label>
              <textarea 
                className="w-full border border-gray-300 rounded-lg p-3 text-sm h-32 focus:outline-none focus:border-red-500 resize-none"
                placeholder="請輸入平台最終裁決理由與處理細節..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              ></textarea>
            </div>
          </div>

          {dispute.status !== 'resolved' && (
            <button 
              onClick={() => setShowConfirmModal(true)}
              className="w-full mt-6 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors"
            >
              發布裁決並結案
            </button>
          )}
        </div>
      </div>
    </div>
  );
}