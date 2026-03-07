import React, { useState } from 'react';

// 🌟 1. 引入所有的分頁組件 (已經對應你資料夾裡的 11 個檔案)
import Dashboard from './platform-side/Dashboard';
import VendorManagement from './platform-side/VendorManagement';
import VendorDetail from './platform-side/VendorDetail';
import UserManagement from './platform-side/UserManagement';
import UserDetail from './platform-side/UserDetail';
import KocManagement from './platform-side/KocManagement';
import KocDetail from './platform-side/KocDetail';
import TaskManagement from './platform-side/TaskManagement';
import TaskDetail from './platform-side/TaskDetail';
import FinanceManagement from './platform-side/FinanceManagement';
import FinanceDetail from './platform-side/FinanceDetail';
import CustomerService from './platform-side/CustomerService';
import DisputeManagement from './platform-side/DisputeManagement';
import DisputeDetail from './platform-side/DisputeDetail';

export default function App() {
  // 頁面切換狀態 (預設停留在總覽頁面)
  const [currentPage, setCurrentPage] = useState('dashboard');

  // 🌟 2. 用來記憶目前被點擊「查看詳情」的資料 (預留了廠商跟任務的空間)
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedKoc, setSelectedKoc] = useState(null);
  const [selectedFinance, setSelectedFinance] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);

  // 導覽列的選單資料
  const navItems = [
    { id: 'dashboard', label: '總覽' },
    { id: 'vendor', label: '廠商管理' },
    { id: 'user', label: '一般用戶' },
    { id: 'koc', label: 'KOC管理' },
    { id: 'task', label: '任務管理' },
    { id: 'finance', label: '金流管理' },
    { id: 'customerService', label: '客服系統' },
    { id: 'dispute', label: '爭議管理' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 🌟 頂部導覽列 */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-8">
          
          {/* LOGO 區塊 (使用純文字，保證不會報錯) */}
          <div 
            className="cursor-pointer flex items-center"
            onClick={() => setCurrentPage('dashboard')} 
          >
            <span className="text-2xl font-bold tracking-tight">KOC 平台</span>
          </div>

          {/* 導覽列按鈕區 */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                  // 判斷按鈕是否該亮起 (包含在詳情頁時，主按鈕也要亮著)
                  currentPage === item.id || 
                  (currentPage === 'userDetail' && item.id === 'user') ||
                  (currentPage === 'vendorDetail' && item.id === 'vendor') ||
                  (currentPage === 'taskDetail' && item.id === 'task')
                    ? 'bg-black text-white'
                    : 'text-gray-500 hover:text-black hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 右側管理員頭像區 */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-700">Admin</span>
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs">
            管
          </div>
        </div>
      </header>

      {/* 🌟 主要內容區 (根據 currentPage 顯示對應的畫面) */}
      <main className="flex-1">
        
        {/* 總覽頁 */}
        {currentPage === 'dashboard' && <Dashboard setCurrentPage={setCurrentPage} />}

        {/* 廠商管理與詳情 */}
        {currentPage === 'vendor' && <VendorManagement setCurrentPage={setCurrentPage} setSelectedVendor={setSelectedVendor} />}
        {currentPage === 'vendorDetail' && <VendorDetail setCurrentPage={setCurrentPage} vendor={selectedVendor} />}

        {/* 一般用戶與詳情 */}
        {currentPage === 'user' && <UserManagement setCurrentPage={setCurrentPage} setSelectedUser={setSelectedUser} />}
        {currentPage === 'userDetail' && <UserDetail setCurrentPage={setCurrentPage} user={selectedUser} />}

        {/* KOC 管理與詳情 */}
        {currentPage === 'koc' && <KocManagement setCurrentPage={setCurrentPage} setSelectedKoc={setSelectedKoc} />}
        {currentPage === 'kocDetail' && <KocDetail setCurrentPage={setCurrentPage} koc={selectedKoc} />}
        
        {/* 任務管理與詳情 */}
        {currentPage === 'task' && <TaskManagement setCurrentPage={setCurrentPage} setSelectedTask={setSelectedTask} />}
        {currentPage === 'taskDetail' && <TaskDetail setCurrentPage={setCurrentPage} task={selectedTask} />}

        
        {/* 金流管理與撥款詳情 */}
        {currentPage === 'finance' && <FinanceManagement setCurrentPage={setCurrentPage} setSelectedFinance={setSelectedFinance} />}
        {currentPage === 'financeDetail' && <FinanceDetail setCurrentPage={setCurrentPage} finance={selectedFinance} />}
        
        {/* 客服、爭議管理 */}
        {currentPage === 'customerService' && <CustomerService setCurrentPage={setCurrentPage} />}

        {/* 爭議管理與詳情 */}
        {currentPage === 'dispute' && <DisputeManagement setCurrentPage={setCurrentPage} setSelectedDispute={setSelectedDispute} />}
        {currentPage === 'disputeDetail' && <DisputeDetail setCurrentPage={setCurrentPage} dispute={selectedDispute} />}

      </main>
    </div>
  );
}