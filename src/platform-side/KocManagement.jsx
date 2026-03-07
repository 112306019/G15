import React, { useState, useEffect } from 'react';

export default function KocManagement({ setCurrentPage }) {
  const [kocs, setKocs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setKocs([
        { id: 'K001', name: '王美美', handle: '@meimei_beauty', followers: '5.2W', platform: 'Instagram', tasks: 12, status: 'active' },
        { id: 'K002', name: '吃貨阿翔', handle: '@xiang_eats', followers: '8,500', platform: 'Instagram', tasks: 5, status: 'active' }
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">KOC 管理</h1>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 whitespace-nowrap">
            <tr>
              <th className="py-4 px-6 font-medium align-middle">KOC 姓名 / 帳號</th>
              <th className="py-4 px-6 font-medium align-middle text-center">平台與粉絲</th>
              <th className="py-4 px-6 font-medium align-middle text-center">合作次數</th>
              <th className="py-4 px-6 font-medium align-middle text-center">狀態</th>
              <th className="py-4 px-6 font-medium align-middle text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {isLoading ? <tr><td colSpan="5" className="py-8 text-center text-gray-500">載入中...</td></tr> :
              kocs.map(k => (
                <tr key={k.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6 align-middle font-bold"><p>{k.name}</p><p className="text-xs text-blue-500">{k.handle}</p></td>
                  <td className="py-4 px-6 align-middle text-center"><p>{k.platform}</p><p className="text-xs text-gray-400">{k.followers} 粉絲</p></td>
                  <td className="py-4 px-6 align-middle text-center">{k.tasks} 次</td>
                  <td className="py-4 px-6 align-middle text-center">
                    <span className="bg-green-100 text-green-600 px-3 py-1.5 rounded-full font-bold text-xs">合作中</span>
                  </td>
                  <td className="py-4 px-6 align-middle text-center">
                    <button onClick={() => setCurrentPage('userDetail')} className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-black hover:text-white text-xs font-bold transition-colors">查看詳情</button>
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