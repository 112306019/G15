import React, { useState, useEffect } from 'react';

export default function DisputeManagement({ setCurrentPage, setSelectedDispute }) {
  const [disputes, setDisputes] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setDisputes([
        { id: 'D260301', type: '任務逾期', initiator: '廠商 - 美妝品牌 A', respondent: 'KOC - 林心如', date: '2026/03/05', status: 'processing', description: 'KOC 未於約定時間內上傳貼文，且無法聯繫。' },
        { id: 'D260302', type: '款項爭議', initiator: 'KOC - 張偉', respondent: '廠商 - 美食餐廳 B', date: '2026/03/06', status: 'pending', description: '任務已完成但廠商拒絕付款，稱影片品質不佳。' },
        { id: 'D260215', type: '內容違規', initiator: '廠商 - 保養品 C', respondent: 'KOC - 李小美', date: '2026/02/20', status: 'resolved', description: 'KOC 貼文包含競品資訊，違反合約規範。' },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const filteredDisputes = disputes.filter(d => statusFilter === 'all' || d.status === statusFilter);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">爭議案件管理</h1>
      
      <div className="flex items-center justify-between bg-white p-4 rounded-t-xl border border-gray-200 border-b-0">
        <select 
          className="border border-gray-300 px-4 py-2 rounded-lg text-sm bg-white focus:outline-none focus:border-red-500" 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">所有案件</option>
          <option value="pending">待處理 (新進案件)</option>
          <option value="processing">處理中 (平台介入)</option>
          <option value="resolved">已結案</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-b-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 whitespace-nowrap">
            <tr>
              <th className="py-4 px-6 font-medium align-middle">案件編號 / 日期</th>
              <th className="py-4 px-6 font-medium align-middle">爭議類型</th>
              <th className="py-4 px-6 font-medium align-middle">申訴方 vs 被申訴方</th>
              <th className="py-4 px-6 font-medium align-middle text-center">狀態</th>
              <th className="py-4 px-6 font-medium align-middle text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan="5" className="py-8 text-center text-gray-500">載入中...</td></tr>
            ) : (
              filteredDisputes.map(d => (
                <tr key={d.id} className="hover:bg-red-50/50 transition-colors">
                  <td className="py-4 px-6 align-middle">
                    <p className="font-bold text-gray-700">{d.id}</p>
                    <p className="text-xs text-gray-400">{d.date}</p>
                  </td>
                  <td className="py-4 px-6 align-middle font-bold text-gray-800">{d.type}</td>
                  <td className="py-4 px-6 align-middle">
                    <p className="text-red-500 font-bold mb-0.5">申訴：{d.initiator}</p>
                    <p className="text-gray-600">被申訴：{d.respondent}</p>
                  </td>
                  <td className="py-4 px-6 align-middle text-center">
                    <span className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap inline-block ${
                      d.status === 'resolved' ? 'bg-gray-100 text-gray-600' : 
                      d.status === 'processing' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {d.status === 'resolved' ? '已結案' : d.status === 'processing' ? '處理中' : '待處理'}
                    </span>
                  </td>
                  <td className="py-4 px-6 align-middle text-center">
                    <button 
                      onClick={() => {
                        setSelectedDispute(d);
                        setCurrentPage('disputeDetail');
                      }} 
                      className="border border-red-200 text-red-700 px-3 py-1.5 rounded-md hover:bg-red-600 hover:text-white text-xs font-bold transition-colors"
                    >
                      介入與詳情
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