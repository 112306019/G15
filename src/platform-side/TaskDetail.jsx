import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge'; // 🌟 引入標籤

export default function TaskDetail({ setCurrentPage, task }) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  if (!task) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center space-y-4">
        <p className="text-gray-500">找不到任務資料，請返回列表重新選擇。</p>
        <button onClick={() => setCurrentPage('task')} className="text-blue-500 hover:underline">返回列表</button>
      </div>
    );
  }

  const handleForceClose = () => {
    setShowConfirmModal(false);
    setTimeout(() => {
      alert(`🚫 已強制下架任務【${task.title}】，並發送警告信給廠商。`);
      setCurrentPage('task');
    }, 500);
  };

  return (
    <div className="relative p-8 max-w-6xl mx-auto space-y-6">
      
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl transform transition-all">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl mb-4 mx-auto">🚨</div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">確認強制下架此任務？</h3>
            <p className="text-gray-600 text-center text-sm mb-6">
              強制下架後，該任務將立即對所有 KOC 隱藏，且無法恢復。<br/>系統將記錄此違規操作並通知廠商。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg font-bold transition-colors">取消</button>
              <button onClick={handleForceClose} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors">確認下架</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setCurrentPage('task')} className="text-gray-500 hover:text-black mb-4 flex items-center">⬅️ 返回任務列表</button>
      
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">{task.title}</h2>
          <p className="text-indigo-500 font-medium mt-1">發布廠商：{task.vendor}</p>
        </div>
        {/* 🌟 替換成 StatusBadge */}
        <StatusBadge type={task.status === 'recruiting' ? 'info' : task.status === 'ongoing' ? 'warning' : task.status === 'completed' ? 'success' : 'danger'}>
          {task.status === 'recruiting' ? '📣 招募中' : task.status === 'ongoing' ? '🏃 進行中' : task.status === 'completed' ? '✅ 已結案' : '🚫 已取消 / 下架'}
        </StatusBadge>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          <h3 className="font-bold text-lg border-l-4 border-indigo-500 pl-3">任務設定與要求</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-bold mb-1">推廣平台</p>
              <p className="font-bold text-gray-800 flex items-center gap-2">
                {task.platform === 'Instagram' ? '📷' : '🎵'} {task.platform}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-bold mb-1">單人酬勞 (新台幣)</p>
              <p className="font-black text-xl text-indigo-600">${task.budget.toLocaleString()}</p>
            </div>
            <div className="col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-bold mb-2">任務詳細說明</p>
              <p className="text-gray-700 text-sm leading-relaxed">
                需於收到商品後 7 天內完成拍攝並上傳。<br/>
                貼文需包含至少 3 張圖片，並標記品牌官方帳號。<br/>
                Hashtag 規範：#春季新品 #實測推薦 #KOC平台體驗<br/>
                （此為測試用假文案，可由廠商自行輸入）
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-bold text-lg border-l-4 border-indigo-500 pl-3">招募與執行數據</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm mb-1"><span className="font-bold text-gray-600">目標招募人數</span><span className="font-bold text-gray-800">{task.quota} 人</span></div>
              <div className="flex justify-between text-sm mb-1"><span className="font-bold text-gray-600">已報名 KOC</span><span className="font-bold text-indigo-600">{task.applicants} 人</span></div>
              <div className="flex justify-between text-sm mb-1"><span className="font-bold text-gray-600">已完成並撥款</span><span className="font-bold text-green-600">{task.status === 'completed' ? task.quota : '0'} 人</span></div>
            </div>
          </div>
          {(task.status === 'recruiting' || task.status === 'ongoing') && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-bold mb-3">平台管理員選項</p>
              <button onClick={() => setShowConfirmModal(true)} className="w-full bg-white border border-red-200 text-red-600 py-3 rounded-lg font-bold hover:bg-red-50 transition-colors flex justify-center items-center gap-2">
                🚨 強制下架此任務
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}