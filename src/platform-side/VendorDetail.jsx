import React, { useState } from 'react';

export default function VendorDetail({ setCurrentPage, vendor }) {
  // 控制確認彈窗的開關與當前準備執行的動作 (核准、退回、停權等)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState(''); 

  if (!vendor) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center space-y-4">
        <p className="text-gray-500">找不到廠商資料，請返回列表重新選擇。</p>
        <button onClick={() => setCurrentPage('vendor')} className="text-blue-500 hover:underline">返回列表</button>
      </div>
    );
  }

  // 點擊操作按鈕時，打開彈窗並記錄動作類型
  const handleActionClick = (type) => {
    setActionType(type);
    setShowConfirmModal(true);
  };

  // 模擬執行動作
  const executeAction = () => {
    setShowConfirmModal(false);
    setTimeout(() => {
      let message = '';
      if (actionType === 'approve') message = `✅ 已成功核准【${vendor.brandName}】的入駐申請！`;
      if (actionType === 'reject') message = `❌ 已退回【${vendor.brandName}】的申請，並發送通知信。`;
      if (actionType === 'suspend') message = `⚠️ 已將【${vendor.brandName}】設為停權狀態。`;
      if (actionType === 'reactivate') message = `✅ 已恢復【${vendor.brandName}】的帳號權限。`;
      
      alert(message);
      setCurrentPage('vendor'); // 執行完畢後自動跳回列表
    }, 500);
  };

  return (
    <div className="relative p-8 max-w-5xl mx-auto space-y-6">
      
      {/* 🌟 動態操作確認彈窗 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl transform transition-all">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-4 mx-auto ${
              actionType === 'suspend' || actionType === 'reject' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {actionType === 'suspend' || actionType === 'reject' ? '⚠️' : '📝'}
            </div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
              {actionType === 'approve' && '確認核准入駐？'}
              {actionType === 'reject' && '確認退回申請？'}
              {actionType === 'suspend' && '確認停權此廠商？'}
              {actionType === 'reactivate' && '確認恢復權限？'}
            </h3>
            <p className="text-gray-600 text-center text-sm mb-6">
              即將對 <span className="font-bold text-black">{vendor.brandName}</span> 執行此操作，系統將會同步發送 Email 通知該廠商聯絡人。
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg font-bold transition-colors"
              >
                取消
              </button>
              <button 
                onClick={executeAction}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg font-bold transition-colors ${
                  actionType === 'suspend' || actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                確認執行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 頂部返回按鈕與標題區塊 */}
      <button onClick={() => setCurrentPage('vendor')} className="text-gray-500 hover:text-black mb-4 flex items-center">⬅️ 返回廠商列表</button>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        
        {/* 廠商頭像與狀態標籤 */}
        <div className="flex items-center justify-between mb-8 pb-8 border-b border-gray-100">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-blue-900 rounded-xl flex items-center justify-center text-4xl text-white font-bold shadow-inner">
              {vendor.brandName.charAt(0)}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-800">{vendor.brandName}</h2>
              <p className="text-gray-500 font-medium mt-1">廠商 ID: {vendor.id}</p>
              <div className="mt-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  vendor.status === 'active' ? 'bg-green-100 text-green-600' : 
                  vendor.status === 'applying' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                }`}>
                  {vendor.status === 'active' ? '✅ 已啟用' : vendor.status === 'applying' ? '⏳ 入駐審核中' : '🚫 已停權'}
                </span>
              </div>
            </div>
          </div>

          {/* 右上角：根據狀態顯示不同的操作按鈕 */}
          <div className="flex flex-col gap-2">
            {vendor.status === 'applying' && (
              <>
                <button onClick={() => handleActionClick('approve')} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm">核准入駐</button>
                <button onClick={() => handleActionClick('reject')} className="px-5 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50 transition-colors">退回申請</button>
              </>
            )}
            {vendor.status === 'active' && (
              <button onClick={() => handleActionClick('suspend')} className="px-5 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50 transition-colors">停權帳號</button>
            )}
            {vendor.status === 'suspended' && (
              <button onClick={() => handleActionClick('reactivate')} className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-100 transition-colors">恢復權限</button>
            )}
          </div>
        </div>

        {/* 下方資訊網格 */}
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-l-4 border-blue-600 pl-3">聯絡資訊</h3>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-3">
              <p className="text-gray-600 flex justify-between"><span className="font-bold text-gray-500">主要聯絡人</span> <span className="font-bold text-gray-800">{vendor.contact}</span></p>
              <p className="text-gray-600 flex justify-between"><span className="font-bold text-gray-500">聯絡電話</span> <span className="font-bold text-gray-800">{vendor.phone}</span></p>
              <p className="text-gray-600 flex justify-between"><span className="font-bold text-gray-500">電子信箱</span> <span className="font-bold text-gray-800">{vendor.email}</span></p>
              <p className="text-gray-600 flex justify-between"><span className="font-bold text-gray-500">申請日期</span> <span className="font-bold text-gray-800">{vendor.date}</span></p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-l-4 border-blue-600 pl-3">平台合作數據</h3>
            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 space-y-3">
              <p className="text-gray-600 flex justify-between"><span className="font-bold text-gray-500">發布任務總數</span> <span className="font-bold text-gray-800">{vendor.status === 'applying' ? '0' : '12'} 件</span></p>
              <p className="text-gray-600 flex justify-between"><span className="font-bold text-gray-500">進行中任務</span> <span className="font-bold text-gray-800">{vendor.status === 'applying' ? '0' : '2'} 件</span></p>
              <p className="text-gray-600 flex justify-between"><span className="font-bold text-gray-500">累計發放酬勞</span> <span className="font-bold text-gray-800">{vendor.status === 'applying' ? '$0' : '$145,000'}</span></p>
              <p className="text-gray-600 flex justify-between"><span className="font-bold text-gray-500">爭議紀錄</span> <span className="font-bold text-gray-800">{vendor.status === 'suspended' ? '2 次' : '0 次'}</span></p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}