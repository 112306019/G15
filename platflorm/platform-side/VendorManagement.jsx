import React, { useState, useEffect } from 'react';

export default function VendorManagement({ setCurrentPage }) {
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setVendors([
        { id: 'V001', name: '極速科技公司', contact: '王大明', phone: '02-2345-6789', date: '2026/01/10', status: 'active' }
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">廠商管理</h1>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 whitespace-nowrap">
            <tr>
              <th className="py-4 px-6 font-medium align-middle">廠商名稱</th>
              <th className="py-4 px-6 font-medium align-middle text-center">主要窗口</th>
              <th className="py-4 px-6 font-medium align-middle text-center">註冊日期</th>
              <th className="py-4 px-6 font-medium align-middle text-center">狀態</th>
              <th className="py-4 px-6 font-medium align-middle text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {isLoading ? <tr><td colSpan="5" className="py-8 text-center text-gray-500">載入中...</td></tr> :
              vendors.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6 align-middle font-bold">{v.name}</td>
                  <td className="py-4 px-6 align-middle text-center"><p>{v.contact}</p><p className="text-xs text-gray-400">{v.phone}</p></td>
                  <td className="py-4 px-6 align-middle text-center">{v.date}</td>
                  <td className="py-4 px-6 align-middle text-center">
                    <span className="bg-green-100 text-green-600 px-3 py-1.5 rounded-full font-bold text-xs">已啟用</span>
                  </td>
                  <td className="py-4 px-6 align-middle text-center">
                    <button onClick={() => setCurrentPage('vendorDetail')} className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-black hover:text-white text-xs font-bold transition-colors">查看詳情</button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}