import React, { useState } from 'react';

// 🌟 引入統一大排版
import Layout from './components/Layout';

// 引入所有的分頁組件
import Dashboard from './platform-side/Dashboard';
import VendorManagement from './platform-side/VendorManagement';
import VendorDetail from './platform-side/VendorDetail';
import UserManagement from './platform-side/UserManagement';
import UserDetail from './platform-side/UserDetail';
// ⚠️ 注意：這裡把 KocManagement 刪除了，但保留了 KocDetail
import KocDetail from './platform-side/KocDetail'; 
import TaskManagement from './platform-side/TaskManagement';
import TaskDetail from './platform-side/TaskDetail';
import FinanceManagement from './platform-side/FinanceManagement';
import FinanceDetail from './platform-side/FinanceDetail';
import CustomerService from './platform-side/CustomerService';
import DisputeManagement from './platform-side/DisputeManagement';
import DisputeDetail from './platform-side/DisputeDetail';

export default function App() {
  // 頁面切換狀態
  const [currentPage, setCurrentPage] = useState('dashboard');

  // 記憶被選中的資料狀態
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedKoc, setSelectedKoc] = useState(null);
  const [selectedFinance, setSelectedFinance] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);

  return (
    // 🌟 用 Layout 把所有畫面包起來！
    <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      
      {/* 總覽頁 */}
      {currentPage === 'dashboard' && <Dashboard setCurrentPage={setCurrentPage} />}

      {/* 廠商管理與詳情 */}
      {currentPage === 'vendor' && <VendorManagement setCurrentPage={setCurrentPage} setSelectedVendor={setSelectedVendor} />}
      {currentPage === 'vendorDetail' && <VendorDetail setCurrentPage={setCurrentPage} vendor={selectedVendor} />}

      {/* 🟢 一般用戶與詳情 (把 setSelectedKoc 也傳進去，這樣點擊 KOC 時才有反應！) */}
      {currentPage === 'user' && (
        <UserManagement 
          setCurrentPage={setCurrentPage} 
          setSelectedUser={setSelectedUser} 
          setSelectedKoc={setSelectedKoc} 
        />
      )}
      {currentPage === 'userDetail' && <UserDetail setCurrentPage={setCurrentPage} user={selectedUser} />}

      {/* 🟢 移除原本的 koc 管理頁面，只保留 kocDetail */}
      {currentPage === 'kocDetail' && <KocDetail setCurrentPage={setCurrentPage} koc={selectedKoc} />}

      {/* 任務管理與詳情 */}
      {currentPage === 'task' && <TaskManagement setCurrentPage={setCurrentPage} setSelectedTask={setSelectedTask} />}
      {currentPage === 'taskDetail' && <TaskDetail setCurrentPage={setCurrentPage} task={selectedTask} />}

      {/* 金流管理與撥款詳情 */}
      {currentPage === 'finance' && <FinanceManagement setCurrentPage={setCurrentPage} setSelectedFinance={setSelectedFinance} />}
      {currentPage === 'financeDetail' && <FinanceDetail setCurrentPage={setCurrentPage} finance={selectedFinance} />}

      {/* 客服與爭議管理 */}
      {currentPage === 'customerService' && <CustomerService setCurrentPage={setCurrentPage} />}
      {currentPage === 'dispute' && <DisputeManagement setCurrentPage={setCurrentPage} setSelectedDispute={setSelectedDispute} />}
      {currentPage === 'disputeDetail' && <DisputeDetail setCurrentPage={setCurrentPage} dispute={selectedDispute} />}
      
    </Layout>
  );
}