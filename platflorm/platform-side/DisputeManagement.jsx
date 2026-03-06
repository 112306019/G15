import React, { useState } from 'react';

export default function DisputeManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 爭議案件假資料
  const disputes = [
    { 
      id: 'D26030101', 
      taskId: 'T003',
      taskName: '高級寵物推車開箱評測',
      complainant: '毛孩寶貝 (廠商)', 
      respondent: '陳曉明 (KOC)',
      reason: '惡意棄單 / 聯繫不上',
      date: '2026/03/01',
      amount: '$4,000',
      status: 'pending' // 待裁決
    },
    { 
      id: 'D26022805', 
      taskId: 'T005',
      taskName: '春季手搖飲試喝',
      complainant: '李阿惠 (KOC)', 
      respondent: '好喝茶飲 (廠商)',
      reason: '拖欠款項 / 拒絕撥款',
      date: '2026/02/28',
      amount: '$1,500',
      status: 'investigating' // 調查中
    },
    { 
      id: 'D26021502', 
      taskId: 'T012',
      taskName: '運動壓力褲實測',
      complainant: '極限運動服飾 (廠商)', 
      respondent: '王大寶 (KOC)',
      reason: '內容敷衍 / 不符要求',
      date: '2026/02/15',
      amount: '$6,000',
      status: 'resolved' // 已結案
    }
  ];

  const filteredDisputes = disputes.filter(d => {
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchSearch = d.taskName.includes(searchTerm) || d.complainant.includes(searchTerm) || d.respondent.includes(searchTerm);
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">爭議案件管理 ⚖️</h1>
          <p className="text-gray-500 mt-2">處理平台上的合作糾紛，凍結款項與違規記點。</p>
        </div>
      </div>
      
      {/* 篩選列 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-t-xl border border-gray-200 border-b-0">
        <div className="relative w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
          <input type="text" placeholder="搜尋案件、任務、申訴方..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="border border-gray-300 px-4 py-2 rounded-lg text-sm bg-white cursor-pointer"
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">案件狀態 (全部)</option>
          <option value="pending">🔴 待處理 (需優先介入)</option>
          <option value="investigating">🟡 調查/舉證中</option>
          <option value="resolved">🟢 已結案</option>
        </select>
      </div>

      {/* 案件列表 */}
      <div className="bg-white border border-gray-200 rounded-b-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          {/* 🌟 表頭也加上置中與不准換行 */}
          <thead className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 whitespace-nowrap">
            <tr>
              <th className="py-4 px-6 font-medium align-middle">案件編號 / 日期</th>
              <th className="py-4 px-6 font-medium align-middle">關聯任務</th>
              <th className="py-4 px-6 font-medium align-middle">申訴方 ➡️ 被申訴方</th>
              <th className="py-4 px-6 font-medium align-middle">爭議類型</th>
              <th className="py-4 px-6 font-medium align-middle text-center">爭議金額</th>
              <th className="py-4 px-6 font-medium align-middle text-center">狀態</th>
              <th className="py-4 px-6 font-medium align-middle text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {filteredDisputes.map(d => (
              <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                {/* 所有 td 都加上 align-middle 確保垂直置中 */}
                <td className="py-4 px-6 align-middle">
                  <p className="font-bold text-gray-800 whitespace-nowrap">{d.id}</p>
                  <p className="text-xs text-gray-500 mt-1 whitespace-nowrap">{d.date}</p>
                </td>
                <td className="py-4 px-6 align-middle">
                  <p className="font-medium text-blue-600 hover:underline cursor-pointer whitespace-nowrap">{d.taskId}</p>
                  <p className="text-xs text-gray-500 truncate w-32">{d.taskName}</p>
                </td>
                <td className="py-4 px-6 align-middle">
                  <p className="text-orange-600 font-medium whitespace-nowrap">申訴方：{d.complainant}</p>
                  <p className="text-gray-600 mt-1 whitespace-nowrap">被申訴：{d.respondent}</p>
                </td>
                <td className="py-4 px-6 font-medium text-gray-800 align-middle min-w-[120px]">
                  {d.reason}
                </td>
                {/* 以下三個欄位加上 text-center 水平置中 */}
                <td className="py-4 px-6 font-bold text-gray-800 align-middle text-center">
                  {d.amount}
                </td>
                <td className="py-4 px-6 align-middle text-center">
                  {/* 🌟 加上 whitespace-nowrap inline-block 確保標籤形狀完美不變形 */}
                  {d.status === 'pending' && <span className="bg-red-100 text-red-600 px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap inline-block">待處理</span>}
                  {d.status === 'investigating' && <span className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap inline-block">調查中</span>}
                  {d.status === 'resolved' && <span className="bg-green-100 text-green-600 px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap inline-block">已結案</span>}
                </td>
                <td className="py-4 px-6 align-middle text-center">
                  {/* 🌟 用 flex justify-center 讓兩顆按鈕乖乖並排對齊 */}
                  <div className="flex items-center justify-center gap-2">
                    <button className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-black hover:text-white transition-colors text-xs whitespace-nowrap">
                      案件詳情
                    </button>
                    {d.status !== 'resolved' && (
                      <button className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-600 hover:text-white transition-colors text-xs font-bold whitespace-nowrap">
                        介入處理
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}