import React, { useState } from 'react';

// 匯入 8 個主要管理頁面
import Dashboard from './platform-side/Dashboard';
import UserManagement from './platform-side/UserManagement'; 
import KocManagement from './platform-side/KocManagement'; 
import VendorManagement from './platform-side/VendorManagement';
import TaskManagement from './platform-side/TaskManagement';
import FinanceManagement from './platform-side/FinanceManagement';
import CustomerService from './platform-side/CustomerService';
import DisputeManagement from './platform-side/DisputeManagement';

// 🌟 匯入 3 個詳情頁面
import UserDetail from './platform-side/UserDetail';
import VendorDetail from './platform-side/VendorDetail';
import TaskDetail from './platform-side/TaskDetail';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  // 判斷導覽列按鈕樣式的工具
  const getNavClass = (page) => {
    return `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      currentPage === page 
        ? 'bg-black text-white' 
        : 'text-gray-500 hover:text-black hover:bg-gray-100'
    }`;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 全域導覽列 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center space-x-8">
          <div className="text-2xl font-black tracking-wider cursor-pointer text-black" onClick={() => setCurrentPage('dashboard')}>
            KOC 平台
          </div>
          <nav className="flex space-x-1">
            <button onClick={() => setCurrentPage('dashboard')} className={getNavClass('dashboard')}>總覽</button>
            <button onClick={() => setCurrentPage('vendor')} className={getNavClass('vendor')}>廠商管理</button>
            <button onClick={() => setCurrentPage('user')} className={getNavClass('user')}>一般用戶</button>
            <button onClick={() => setCurrentPage('koc')} className={getNavClass('koc')}>KOC管理</button> 
            <button onClick={() => setCurrentPage('task')} className={getNavClass('task')}>任務管理</button>
            <button onClick={() => setCurrentPage('finance')} className={getNavClass('finance')}>金流管理</button>
            <button onClick={() => setCurrentPage('cs')} className={getNavClass('cs')}>客服系統</button>
            <button onClick={() => setCurrentPage('dispute')} className={`${getNavClass('dispute')} ${currentPage !== 'dispute' ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : ''}`}>
              ⚖️ 爭議管理
            </button>
          </nav>
        </div>
        <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
          <span className="text-sm font-bold text-gray-700">Admin</span>
          <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm">管</div>
        </div>
      </header>

      <main>
        {/* 渲染主要管理分頁 */}
        {currentPage === 'dashboard' && <Dashboard setCurrentPage={setCurrentPage} />}
        {currentPage === 'user' && <UserManagement setCurrentPage={setCurrentPage} />}
        {currentPage === 'koc' && <KocManagement setCurrentPage={setCurrentPage} />}
        {currentPage === 'vendor' && <VendorManagement setCurrentPage={setCurrentPage} />}
        {currentPage === 'task' && <TaskManagement setCurrentPage={setCurrentPage} />}
        {currentPage === 'finance' && <FinanceManagement setCurrentPage={setCurrentPage} />}
        {currentPage === 'cs' && <CustomerService setCurrentPage={setCurrentPage} />}
        {currentPage === 'dispute' && <DisputeManagement setCurrentPage={setCurrentPage} />}

        {/* 渲染詳情分頁 */}
        {currentPage === 'userDetail' && <UserDetail setCurrentPage={setCurrentPage} />}
        {currentPage === 'vendorDetail' && <VendorDetail setCurrentPage={setCurrentPage} />}
        {currentPage === 'taskDetail' && <TaskDetail setCurrentPage={setCurrentPage} />}
      </main>
    </div>
  );
}