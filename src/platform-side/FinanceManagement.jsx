import React, { useState, useEffect } from 'react';

export default function FinanceManagement() {
  const [finances, setFinances] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setFinances([
        { id: 'TX260228001', date: '2026/02/28 10:15', target: '極速科技公司', task: '春季彩妝新品體驗', type: 'income', amount: 15000, status: 'completed' },
        { id: 'TX260228002', date: '2026/02/28 11:30', target: '王美美', task: '春季彩妝新品體驗', type: 'payout', amount: 3000, status: 'pending' },
        { id: 'TX260227005', date: '2026/02/27 15:00', target: '吃貨阿翔', task: '信義區新開幕拉麵', type: 'payout', amount: 1500, status: 'pending' },
        { id: 'TX260225010', date: '2026/02/25 09:00', target: '美味餐飲企業', task: '信義區新開幕拉麵', type: 'income', amount: 5000, status: 'completed' }
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const filteredFinances = finances.filter(tx => {
    const matchType = typeFilter === 'all' || tx.type === typeFilter;
    const matchStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchSearch = tx.id.toLowerCase().includes(searchTerm.toLowerCase()) || tx.target.includes(searchTerm);
    return matchType && matchStatus && matchSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold">金流管理</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
          <h3 className="text-gray-500 text-sm mb-2">本月平台入帳</h3>
          <p className="text-3xl font-semibold text-green-600 mb-2">$125,000</p>
        </div>
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm border-l-4 border-l-orange-500">
          <h3 className="text-gray-500 text-sm mb-2">待撥款總額</h3>
          <p className="text-3xl font-semibold text-orange-500 mb-2">$45,000</p>
        </div>
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
          <h3 className="text-gray-500 text-sm mb-2">本月已撥款</h3>
          <p className="text-3xl font-semibold text-gray-800 mb-2">$32,000</p>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-t-xl border border-gray-200 border-b-0">
        <div className="relative w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
          <input type="text" placeholder="搜尋交易單號、對象名稱" className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex space-x-3">
          <select className="border border-gray-300 px-4 py-2 rounded-lg text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">所有類型</option>
            <option value="income">入帳 (廠商付款)</option>
            <option value="payout">出帳 (KOC撥款)</option>
          </select>
          <select className="border border-gray-300 px-4 py-2 rounded-lg text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">所有狀態</option>
            <option value="pending">待處理/待撥款</option>
            <option value="completed">已完成</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-b-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
            <tr>
              <th className="py-4 px-6 font-medium">單號 / 時間</th>
              <th className="py-4 px-6 font-medium">交易對象</th>
              <th className="py-4 px-6 font-medium">類型</th>
              <th className="py-4 px-6 font-medium">金額</th>
              <th className="py-4 px-6 font-medium">狀態</th>
              <th className="py-4 px-6 font-medium text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {isLoading ? <tr><td colSpan="6" className="py-8 text-center text-gray-500">載入中...</td></tr> :
              filteredFinances.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6"><p className="font-medium">{tx.id}</p><p className="text-xs text-gray-400">{tx.date}</p></td>
                  <td className="py-4 px-6 font-medium">{tx.target}</td>
                  <td className="py-4 px-6">
                    {tx.type === 'income' ? <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">入帳</span> : <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded text-xs">出帳</span>}
                  </td>
                  <td className={`py-4 px-6 font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                  </td>
                  <td className={`py-4 px-6 font-semibold ${tx.status === 'pending' ? 'text-orange-500' : 'text-gray-500'}`}>
                    {tx.status === 'pending' ? '待處理' : '已完成'}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button className={`${tx.status === 'pending' && tx.type === 'payout' ? 'bg-black text-white' : 'border border-gray-300 text-gray-700'} px-4 py-1.5 rounded-md text-sm hover:bg-gray-800 hover:text-white transition-colors`}>
                      {tx.status === 'pending' && tx.type === 'payout' ? '執行撥款' : '查看明細'}
                    </button>
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