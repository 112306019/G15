import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge'; // 🌟 1. 引入剛剛做好的共用標籤

export default function UserManagement({ setCurrentPage, setSelectedUser }) {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // 模擬從後端抓取用戶資料
  useEffect(() => {
    setTimeout(() => {
      setUsers([
        { id: 'U001', name: '陳曉明', phone: '0912-345-678', date: '2026/01/05', email: 'xiaoming@gmail.com', status: 'applying', isKoc: false },
        { id: 'U002', name: '林心如', phone: '0922-333-444', date: '2026/01/12', email: 'ruby_lin@yahoo.com.tw', status: 'active', isKoc: true },
        { id: 'U003', name: '張建國', phone: '0933-111-222', date: '2025/11/20', email: 'jk_zhang@hotmail.com', status: 'suspended', isKoc: false }
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  // 搜尋邏輯：比對姓名、Email 與電話
  const filteredUsers = users.filter(user => {
    const matchStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchSearch = user.name.includes(searchTerm) || 
                        user.email.includes(searchTerm) || 
                        user.phone.includes(searchTerm);
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">一般用戶管理</h1>
      
      {/* 頂部搜尋與過濾區 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-t-xl border border-gray-200 border-b-0">
        <input 
          type="text" 
          placeholder="搜尋姓名、Email、電話..." 
          className="pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-80 focus:outline-none focus:border-black"
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <select 
          className="border border-gray-300 px-4 py-2 rounded-lg text-sm bg-white focus:outline-none focus:border-black" 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">所有狀態</option>
          <option value="applying">KOC 申請中</option>
          <option value="active">已啟用</option>
          <option value="suspended">已停權</option>
        </select>
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
                    
                    {/* 🌟 2. 用 StatusBadge 取代原本落落長的 Tailwind 寫法 */}
                    {u.isKoc && (
                      <StatusBadge type="purple" className="px-2 py-0.5">KOC</StatusBadge>
                    )}
                  </td>
                  <td className="py-4 px-6 align-middle">
                    <p>{u.phone}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="py-4 px-6 align-middle text-center">{u.date}</td>
                  <td className="py-4 px-6 align-middle text-center">
                    
                    {/* 🌟 3. 動態傳入 type 來決定顏色 */}
                    <StatusBadge 
                      type={u.status === 'active' ? 'success' : u.status === 'applying' ? 'warning' : 'danger'}
                    >
                      {u.status === 'active' ? '已啟用' : u.status === 'applying' ? '申請中' : '已停權'}
                    </StatusBadge>
                    
                  </td>
                  <td className="py-4 px-6 align-middle text-center">
                    <button 
                      onClick={() => {
                        setSelectedUser(u);
                        setCurrentPage('userDetail');
                      }} 
                      className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-black hover:text-white text-xs font-bold transition-colors"
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