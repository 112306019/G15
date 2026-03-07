import React, { useState, useEffect } from 'react';

export default function FinanceManagement({ setCurrentPage, setSelectedFinance }) {
  const [finances, setFinances] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // 模擬金流請款資料
  useEffect(() => {
    setTimeout(() => {
      setFinances([
        { id: 'F260301', kocName: '林心如', taskName: '春季粉底液 IG 推廣', amount: 8000, date: '2026/03/05', bank: '國泰世華 (013)', account: '****-****-1234', status: 'pending' },
        { id: 'F260302', kocName: '張偉', taskName: '美食探店打卡', amount: 3500, date: '2026/03/07', bank: '中國信託 (822)', account: '****-****-5678', status: 'pending' },
        { id: 'F260215', kocName: '李小美', taskName: '面膜開箱短影音', amount: 12000, date: '2026/02/28', bank: '玉山銀行 (808)', account: '****-****-9012', status: 'completed' },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const filteredFinances = finances.filter(f => statusFilter === 'all' || f.status === statusFilter);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">金流與撥款管理</h1>
      
      <div className="flex items-center justify-between bg-white p-4 rounded-t-xl border border-gray-200 border-b-0">
        <div className="flex gap-4">
          <select 
            className="border border-gray-300 px-4 py-2 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">所有提款申請</option>
            <option value="pending">待撥款 (審核中)</option>
            <option value="completed">已撥款完成</option>
          </select>
        </div>
        <div className="text-sm text-gray-500">
          待處理總金額：<span className="text-red-500 font-bold text-lg">$11,500</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-b-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 whitespace-nowrap">
            <tr>
              <th className="py-4 px-6 font-medium align-middle">申請單號 / 日期</th>
              <th className="py-4 px-6 font-medium align-middle">KOC / 任務名稱</th>
              <th className="py-4 px-6 font-medium align-middle">收款銀行</th>
              <th className="py-4 px-6 font-medium align-middle text-right">請款金額</th>
              <th className="py-4 px-6 font-medium align-middle text-center">狀態</th>
              <th className="py-4 px-6 font-medium align-middle text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan="6" className="py-8 text-center text-gray-500">載入中...</td></tr>
            ) : (
              filteredFinances.map(f => (
                <tr key={f.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="py-4 px-6 align-middle">
                    <p className="font-bold text-gray-700">{f.id}</p>
                    <p className="text-xs text-gray-400">{f.date}</p>
                  </td>
                  <td className="py-4 px-6 align-middle">
                    <p className="font-bold">{f.kocName}</p>
                    <p className="text-xs text-blue-500">{f.taskName}</p>
                  </td>
                  <td className="py-4 px-6 align-middle text-gray-600">{f.bank}</td>
                  <td className="py-4 px-6 align-middle text-right font-bold text-lg text-gray-800">
                    ${f.amount.toLocaleString()}
                  </td>
                  <td className="py-4 px-6 align-middle text-center">
                    <span className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap inline-block ${
                      f.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {f.status === 'completed' ? '已撥款' : '待撥款'}
                    </span>
                  </td>
                  <td className="py-4 px-6 align-middle text-center">
                    <button 
                      onClick={() => {
                        setSelectedFinance(f);
                        setCurrentPage('financeDetail');
                      }} 
                      className="border border-blue-200 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-600 hover:text-white text-xs font-bold transition-colors"
                    >
                      {f.status === 'pending' ? '審核與撥款' : '查看明細'}
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