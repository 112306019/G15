import React, { useState, useEffect } from 'react';
// 🌟 1. 引入共用標籤
import StatusBadge from '../components/StatusBadge';

export default function VendorManagement({ setCurrentPage, setSelectedVendor }) {
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // 模擬後端抓取廠商資料
  useEffect(() => {
    setTimeout(() => {
      setVendors([
        { id: 'V001', brandName: '美妝品牌 A', contact: '陳經理', phone: '02-2345-6789', email: 'contact@brandA.com', date: '2026/01/10', status: 'active' },
        { id: 'V002', brandName: '美食餐廳 B', contact: '林老闆', phone: '0987-654-321', email: 'info@restaurantB.tw', date: '2026/02/15', status: 'applying' },
        { id: 'V003', brandName: '保養品 C', contact: '王專員', phone: '04-3333-4444', email: 'marketing@brandC.com', date: '2025/12/05', status: 'suspended' },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  // 快速搜尋與狀態過濾邏輯
  const filteredVendors = vendors.filter(v => {
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchSearch = v.brandName.includes(searchTerm) || v.contact.includes(searchTerm) || v.phone.includes(searchTerm);
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">廠商管理</h1>
      
      {/* 頂部搜尋與過濾區 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-t-xl border border-gray-200 border-b-0">
        <input 
          type="text" 
          placeholder="搜尋品牌名稱、聯絡人、電話..." 
          className="pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-80 focus:outline-none focus:border-blue-500"
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <select 
          className="border border-gray-300 px-4 py-2 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500" 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">所有狀態</option>
          <option value="applying">入駐審核中</option>
          <option value="active">已啟用</option>
          <option value="suspended">已停權</option>
        </select>
      </div>

      {/* 列表區塊 */}
      <div className="bg-white border border-gray-200 rounded-b-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 whitespace-nowrap">
            <tr>
              <th className="py-4 px-6 font-medium align-middle">品牌名稱</th>
              <th className="py-4 px-6 font-medium align-middle">聯絡人 / 電話</th>
              <th className="py-4 px-6 font-medium align-middle text-center">入駐日期</th>
              <th className="py-4 px-6 font-medium align-middle text-center">狀態</th>
              <th className="py-4 px-6 font-medium align-middle text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan="5" className="py-8 text-center text-gray-500">載入中...</td></tr>
            ) : (
              filteredVendors.map(v => (
                <tr key={v.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="py-4 px-6 align-middle font-bold text-gray-800">{v.brandName}</td>
                  <td className="py-4 px-6 align-middle">
                    <p className="font-bold text-gray-700">{v.contact}</p>
                    <p className="text-xs text-gray-500">{v.phone}</p>
                  </td>
                  <td className="py-4 px-6 align-middle text-center font-medium text-gray-600">{v.date}</td>
                  <td className="py-4 px-6 align-middle text-center">
                    
                    {/* 🌟 2. 替換成 StatusBadge */}
                    <StatusBadge 
                      type={v.status === 'active' ? 'success' : v.status === 'applying' ? 'warning' : 'danger'}
                    >
                      {v.status === 'active' ? '已啟用' : v.status === 'applying' ? '審核中' : '已停權'}
                    </StatusBadge>

                  </td>
                  <td className="py-4 px-6 align-middle text-center">
                    <button 
                      onClick={() => {
                        setSelectedVendor(v);
                        setCurrentPage('vendorDetail');
                      }} 
                      className="border border-blue-200 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-600 hover:text-white text-xs font-bold transition-colors"
                    >
                      查看詳情
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}