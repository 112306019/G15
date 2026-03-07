import React from 'react';
import Topbar from './Topbar'; // 引入剛剛做好的導覽列

// children 代表被 Layout 包住的「子內容」(也就是各個分頁)
export default function Layout({ currentPage, setCurrentPage, children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 🌟 1. 頂部永遠顯示 Topbar */}
      <Topbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      {/* 🌟 2. 下方留給各個分頁自己發揮 */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}