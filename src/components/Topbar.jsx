import React from 'react';

export default function Topbar({ currentPage, setCurrentPage }) {
  // 導覽列的選單資料 (從 App.jsx 搬過來)
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
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-8">
        
        {/* LOGO 區塊 */}
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
                currentPage === item.id || 
                (currentPage === 'userDetail' && item.id === 'user') ||
                (currentPage === 'vendorDetail' && item.id === 'vendor') ||
                (currentPage === 'taskDetail' && item.id === 'task') ||
                (currentPage === 'kocDetail' && item.id === 'koc') ||
                (currentPage === 'financeDetail' && item.id === 'finance') ||
                (currentPage === 'disputeDetail' && item.id === 'dispute')
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
  );
}