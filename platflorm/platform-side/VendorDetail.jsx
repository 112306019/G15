import React from 'react';

export default function VendorDetail({ setCurrentPage }) {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <button onClick={() => setCurrentPage('vendor')} className="text-gray-500 hover:text-black mb-4 flex items-center">⬅️ 返回列表</button>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">極速科技公司</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-xl text-center">
            <p className="text-gray-400 text-sm">累積發布任務</p>
            <p className="text-2xl font-bold text-gray-800">12</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl text-center">
            <p className="text-gray-400 text-sm">累積支付金額</p>
            <p className="text-2xl font-bold text-green-600">$185,000</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl text-center">
            <p className="text-gray-400 text-sm">目前的狀態</p>
            <p className="text-2xl font-bold text-blue-500">已啟用的合作商</p>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-bold text-lg border-l-4 border-black pl-3 mb-4">企業聯絡資訊</h3>
          <p className="text-gray-600">統一編號：12345678</p>
          <p className="text-gray-600">主要窗口：王大明 (經理)</p>
          <p className="text-gray-600">聯繫電話：02-2345-6789</p>
          <p className="text-gray-600">公司地址：台北市大安區信義路四段...</p>
        </div>
      </div>
    </div>
  );
}