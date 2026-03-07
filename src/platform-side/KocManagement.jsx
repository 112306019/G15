import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge'; // 🌟 引入標籤

export default function KocManagement({ setCurrentPage, setSelectedKoc }) {
  const [kocs, setKocs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setKocs([
        { id: 'K001', name: '林心如', igHandle: 'ruby_lin_daily', followers: '5.2W', engagement: '4.8%', completedTasks: 15, status: 'active' },
        { id: 'K002', name: '張偉', igHandle: 'wei_foodie', followers: '1.2W', engagement: '6.5%', completedTasks: 3, status: 'active' },
        { id: 'K003', name: '李小美', igHandle: 'mei_makeup', followers: '8.9W', engagement: '2.1%', completedTasks: 42, status: 'suspended' }
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const filteredKocs = kocs.filter(koc => {
    const matchStatus = statusFilter === 'all' || koc.status === statusFilter;
    const matchSearch = koc.name.includes(searchTerm) || koc.igHandle.includes(searchTerm);
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">KOC 管理</h1>
      
      <div className="flex items-center justify-between bg-white p-4 rounded-t-xl border border-gray-200 border-b-0">
        <input 
          type="text" placeholder="搜尋姓名、IG 帳號..." 
          className="pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-80 focus:outline-none focus:border-purple-500"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <select 
          className="border border-gray-300 px-4 py-2 rounded-lg text-sm bg-white focus:outline-none focus:border-purple-500" 
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">所有狀態</option>
          <option value="active">接案中</option>
          <option value="suspended">已停權</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-b-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 whitespace-nowrap">
            <tr>
              <th className="py-4 px-6 font-medium align-middle">KOC 資訊</th>
              <th className="py-4 px-6 font-medium align-middle text-center">粉絲數</th>
              <th className="py-4 px-6 font-medium align-middle text-center">互動率</th>
              <th className="py-4 px-6 font-medium align-middle text-center">已完成任務</th>
              <th className="py-4 px-6 font-medium align-middle text-center">狀態</th>
              <th className="py-4 px-6 font-medium align-middle text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan="6" className="py-8 text-center text-gray-500">載入中...</td></tr>
            ) : (
              filteredKocs.map(koc => (
                <tr key={koc.id} className="hover:bg-purple-50/50 transition-colors">
                  <td className="py-4 px-6 align-middle">
                    <p className="font-bold text-gray-800">{koc.name}</p>
                    <p className="text-xs text-purple-500 font-medium">@{koc.igHandle}</p>
                  </td>
                  <td className="py-4 px-6 align-middle text-center font-medium text-gray-600">{koc.followers}</td>
                  <td className="py-4 px-6 align-middle text-center font-medium text-gray-600">{koc.engagement}</td>
                  <td className="py-4 px-6 align-middle text-center font-medium text-gray-600">{koc.completedTasks} 件</td>
                  <td className="py-4 px-6 align-middle text-center">
                    {/* 🌟 替換成 StatusBadge */}
                    <StatusBadge type={koc.status === 'active' ? 'success' : 'danger'}>
                      {koc.status === 'active' ? '接案中' : '已停權'}
                    </StatusBadge>
                  </td>
                  <td className="py-4 px-6 align-middle text-center">
                    <button 
                      onClick={() => { setSelectedKoc(koc); setCurrentPage('kocDetail'); }} 
                      className="border border-purple-200 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-600 hover:text-white text-xs font-bold transition-colors"
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