import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge'; // 🌟 引入標籤

export default function FinanceDetail({ setCurrentPage, finance }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  if (!finance) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-gray-500">找不到請款資料</p>
        <button onClick={() => setCurrentPage('finance')} className="text-blue-500">返回列表</button>
      </div>
    );
  }

  const handlePayout = () => {
    setShowConfirmModal(false);
    setIsProcessing(true);
    
    setTimeout(() => {
      alert(`✅ 已成功匯款 $${finance.amount.toLocaleString()} 至 ${finance.kocName} 的帳戶！`);
      setIsProcessing(false);
      setCurrentPage('finance');
    }, 1500);
  };

  return (
    <div className="relative p-8 max-w-5xl mx-auto space-y-6">
      
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl transform transition-all">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl mb-4 mx-auto">⚠️</div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">確認執行撥款？</h3>
            <p className="text-gray-600 text-center text-sm mb-6">
              即將匯款 <span className="text-red-500 font-bold text-base">${finance.amount.toLocaleString()}</span> 至 <span className="font-bold text-black">{finance.kocName}</span> 的指定帳戶。<br/>此操作無法復原，請確認資料無誤。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg font-bold transition-colors">取消</button>
              <button onClick={handlePayout} className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors">確認撥款</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setCurrentPage('finance')} className="text-gray-500 hover:text-black mb-4 flex items-center">⬅️ 返回金流列表</button>
      
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-gray-800">請款單明細：{finance.id}</h2>
        {/* 🌟 替換成 StatusBadge */}
        <StatusBadge type={finance.status === 'completed' ? 'success' : 'warning'}>
          {finance.status === 'completed' ? '✅ 已完成撥款' : '⏳ 待執行撥款'}
        </StatusBadge>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          <h3 className="font-bold text-lg border-l-4 border-blue-500 pl-3">請款任務資訊</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-gray-500 mb-1">申請 KOC</p><p className="font-bold text-gray-800">{finance.kocName}</p></div>
            <div><p className="text-sm text-gray-500 mb-1">申請日期</p><p className="font-bold text-gray-800">{finance.date}</p></div>
            <div className="col-span-2"><p className="text-sm text-gray-500 mb-1">任務名稱</p><p className="font-bold text-gray-800">{finance.taskName}</p></div>
            <div className="col-span-2 bg-gray-50 p-4 rounded-lg flex justify-between items-center mt-2 border border-gray-100">
              <span className="font-bold text-gray-600">本期應付總額</span>
              <span className="text-3xl font-black text-blue-600">${finance.amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-l-4 border-orange-500 pl-3">收款帳戶資訊</h3>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-3">
              <div><p className="text-xs text-orange-600/70 font-bold mb-1">銀行代碼 / 名稱</p><p className="font-bold text-gray-800">{finance.bank}</p></div>
              <div><p className="text-xs text-orange-600/70 font-bold mb-1">銀行帳號</p><p className="font-mono font-bold text-lg text-gray-800">{finance.account}</p></div>
              <div><p className="text-xs text-orange-600/70 font-bold mb-1">戶名</p><p className="font-bold text-gray-800">{finance.kocName}</p></div>
            </div>
          </div>

          {finance.status === 'pending' && (
            <div className="mt-8 space-y-3">
              <button onClick={() => setShowConfirmModal(true)} disabled={isProcessing} className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors flex justify-center items-center">
                {isProcessing ? '撥款處理中...' : '確認無誤，執行撥款'}
              </button>
              <button className="w-full bg-white text-red-500 border border-red-200 py-3 rounded-lg font-bold hover:bg-red-50 transition-colors">
                資料有誤，退回申請
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}