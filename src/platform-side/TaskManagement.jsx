import React, { useState, useEffect } from 'react';

export default function TaskManagement({ setCurrentPage, setSelectedTask }) {
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // 模擬從後端抓取任務資料
  useEffect(() => {
    setTimeout(() => {
      setTasks([
        { id: 'T260301', title: '春季粉底液 IG 圖文推廣', vendor: '美妝品牌 A', platform: 'Instagram', budget: 8000, quota: 15, applicants: 42, status: 'recruiting', date: '2026/03/01' },
        { id: 'T260302', title: '雙人套餐探店打卡短影音', vendor: '美食餐廳 B', platform: 'TikTok', budget: 3500, quota: 5, applicants: 5, status: 'ongoing', date: '2026/03/05' },
        { id: 'T260215', title: '保濕精華液 14 天實測開箱', vendor: '保養品 C', platform: 'Instagram', budget: 12000, quota: 20, applicants: 50, status: 'completed', date: '2026/02/10' },
        { id: 'T260308', title: '未經核准之醫療器材宣傳', vendor: '某生技公司', platform: 'Instagram', budget: 50000, quota: 10, applicants: 12, status: 'cancelled', date: '2026/03/08' },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  // 搜尋與狀態過濾邏輯
  const filteredTasks = tasks.filter(t => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchSearch = t.title.includes(searchTerm) || t.vendor.includes(searchTerm);
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">任務管理</h1>
      
      {/* 頂部搜尋與過濾區 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-t-xl border border-gray-200 border-b-0">
        <input 
          type="text" 
          placeholder="搜尋任務名稱、發布廠商..." 
          className="pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-80 focus:outline-none focus:border-indigo-500"
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <select 
          className="border border-gray-300 px-4 py-2 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500" 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">所有任務狀態</option>
          <option value="recruiting">招募中</option>
          <option value="ongoing">進行中</option>
          <option value="completed">已結案</option>
          <option value="cancelled">已取消 / 強制下架</option>
        </select>
      </div>

      {/* 列表區塊 */}
      <div className="bg-white border border-gray-200 rounded-b-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 whitespace-nowrap">
            <tr>
              <th className="py-4 px-6 font-medium align-middle">任務名稱 / 發布日</th>
              <th className="py-4 px-6 font-medium align-middle">發布廠商</th>
              <th className="py-4 px-6 font-medium align-middle text-center">單人酬勞</th>
              <th className="py-4 px-6 font-medium align-middle text-center">招募進度</th>
              <th className="py-4 px-6 font-medium align-middle text-center">狀態</th>
              <th className="py-4 px-6 font-medium align-middle text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan="6" className="py-8 text-center text-gray-500">載入中...</td></tr>
            ) : (
              filteredTasks.map(t => (
                <tr key={t.id} className="hover:bg-indigo-50/50 transition-colors">
                  <td className="py-4 px-6 align-middle">
                    <p className="font-bold text-gray-800">{t.title}</p>
                    <p className="text-xs text-gray-400">ID: {t.id} | {t.date}</p>
                  </td>
                  <td className="py-4 px-6 align-middle font-bold text-gray-700">{t.vendor}</td>
                  <td className="py-4 px-6 align-middle text-center font-bold text-lg text-indigo-600">
                    ${t.budget.toLocaleString()}
                  </td>
                  <td className="py-4 px-6 align-middle text-center">
                    <p className="font-bold text-gray-800">{t.applicants} <span className="text-gray-400 font-normal">/ {t.quota} 人</span></p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      {/* 簡單的進度條視覺 */}
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min((t.applicants / t.quota) * 100, 100)}%` }}></div>
                    </div>
                  </td>
                  <td className="py-4 px-6 align-middle text-center">
                    <span className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap inline-block ${
                      t.status === 'recruiting' ? 'bg-blue-100 text-blue-600' : 
                      t.status === 'ongoing' ? 'bg-orange-100 text-orange-600' : 
                      t.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {t.status === 'recruiting' ? '📣 招募中' : t.status === 'ongoing' ? '🏃 進行中' : t.status === 'completed' ? '✅ 已結案' : '🚫 已取消'}
                    </span>
                  </td>
                  <td className="py-4 px-6 align-middle text-center">
                    <button 
                      onClick={() => {
                        setSelectedTask(t);
                        setCurrentPage('taskDetail');
                      }} 
                      className="border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-md hover:bg-indigo-600 hover:text-white text-xs font-bold transition-colors"
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