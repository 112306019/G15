import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';

export default function UserManagement({ setCurrentPage, setSelectedUser, setSelectedKoc }) {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kocFilter, setKocFilter] = useState('all'); // 新增：是否為 KOC 的過濾器
  const [isLoading, setIsLoading] = useState(true);

  // 模擬從後端抓取用戶資料，這裡我整合了原本 KOC 列表的一些假資料欄位
  useEffect(() => {
    setTimeout(() => {
      setUsers([
        { id: 'U001', name: '陳曉明', phone: '0912-345-678', date: '2026/01/05', email: 'xiaoming@gmail.com', status: 'applying', isKoc: false },
        { 
          id: 'K001', name: '林心如', phone: '0922-333-444', date: '2026/01/12', email: 'ruby_lin@yahoo.com.tw', status: 'active', isKoc: true,
          // KOC 專屬資料
          igHandle: 'ruby_lin_daily', followers: '5.2W', engagement: '4.8%', completedTasks: 15 
        },
        { 
          id: 'K002', name: '張偉', phone: '0988-777-666', date: '2026/02/10', email: 'wei_foodie@gmail.com', status: 'active', isKoc: true,
          // KOC 專屬資料
          igHandle: 'wei_foodie', followers: '1.2W', engagement: '6.5%', completedTasks: 3 
        },
        { id: 'U003', name: '張建國', phone: '0933-111-222', date: '2025/11/20', email: 'jk_zhang@hotmail.com', status: 'suspended', isKoc: false }
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  // 搜尋與過濾邏輯
  const filteredUsers = users.filter(user => {
    const matchStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchKoc = kocFilter === 'all' || (kocFilter === 'koc' ? user.isKoc : !user.isKoc);
    const matchSearch = user.name.includes(searchTerm) || 
                        user.email.includes(searchTerm) || 
                        user.phone.includes(searchTerm) ||
                        (user.igHandle && user.igHandle.includes(searchTerm)); // 也允許搜尋 IG 帳號
    return matchStatus && matchKoc && matchSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">用戶管理</h1>
      
      {/* 頂部搜尋與過濾區 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-t-xl border border-gray-200 border-b-0">
        <input 
          type="text" 
          placeholder="搜尋姓名、Email、電話或 IG 帳號..." 
          className="pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-80 focus:outline-none focus:border-black"
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <div className="flex gap-4">
          <select 
            className="border border-gray-300 px-4 py-2 rounded-lg text-sm bg-white focus:outline-none focus:border-black" 
            value={kocFilter} 
            onChange={(e) => setKocFilter(e.target.value)}
          >
            <option value="all">所有身份</option>
            <option value="user">一般用戶</option>
            <option value="koc">KOC</option>
          </select>
          <select 
            className="border border-gray-300 px-4 py-2 rounded-lg text-sm bg-white focus:outline-none focus:border-black" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">所有狀態</option>
            <option value="applying">KOC 申請中</option>
            <option value="active">已啟用 / 接案中</option>
            <option value="suspended">已停權</option>
          </select>
        </div>
      </div>

      {/* 列表區塊 */}
      <div className="bg-white border border-gray-200 rounded-b-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 whitespace-nowrap">
            <tr>
              <th className="py-4 px-6 font-medium align-middle">姓名</th>
              <th className="py-4 px-6 font-medium align-middle">電話 / Email</th>
              <th className="py-4 px-6 font-medium align-middle text-center">註冊日期</th>
              <th className="py-4 px-6 font-medium align-middle text-center">狀態</th>
              <th className="py-4 px-6 font-medium align-middle text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan="5" className="py-8 text-center text-gray-500">載入中...</td></tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6 align-middle font-bold flex items-center gap-2">
                    {u.name}
                    {u.isKoc && (
                      <StatusBadge type="purple" className="px-2 py-0.5">KOC</StatusBadge>
                    )}
                  </td>
                  <td className="py-4 px-6 align-middle">
                    <p>{u.phone}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                    {/* 如果是 KOC，順便顯示 IG 帳號 */}
                    {u.isKoc && <p className="text-xs text-purple-500 font-medium">@{u.igHandle}</p>}
                  </td>
                  <td className="py-4 px-6 align-middle text-center">{u.date}</td>
                  <td className="py-4 px-6 align-middle text-center">
                    <StatusBadge 
                      type={u.status === 'active' ? 'success' : u.status === 'applying' ? 'warning' : 'danger'}
                    >
                      {u.status === 'active' ? '已啟用' : u.status === 'applying' ? '申請中' : '已停權'}
                    </StatusBadge>
                  </td>
                  <td className="py-4 px-6 align-middle text-center">
                    <button 
                      onClick={() => {
                        // 根據是否為 KOC，決定要設定哪一個 State 並跳轉到哪一個頁面
                        if (u.isKoc) {
                          setSelectedKoc(u); // 傳遞包含 igHandle, followers 等額外資料的物件
                          setCurrentPage('kocDetail');
                        } else {
                          setSelectedUser(u);
                          setCurrentPage('userDetail');
                        }
                      }} 
                      className={`border px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                        u.isKoc 
                          ? 'border-purple-200 text-purple-700 hover:bg-purple-600 hover:text-white' 
                          : 'border-gray-300 text-gray-700 hover:bg-black hover:text-white'
                      }`}
                    >
                      {u.isKoc ? '查看 KOC 詳情' : '查看詳情'}
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