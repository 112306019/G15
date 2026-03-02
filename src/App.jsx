import React, { useState } from 'react';
import Header from './koc/Header';
import HomePage from './koc/HomePage';
import ReviewPage from './koc/ReviewPage';
import AnalysisPage from './koc/AnalysisPage';
import TaskDetailPage from './koc/TaskDetailPage';
import EarningsPage from './koc/EarningsPage';
import EarningsDetailPage from './koc/EarningsDetailPage';
import PendingEarningsPage from './koc/PendingEarningsPage';
import { User, Lock, Ticket, Coins, FileText, Briefcase, TrendingUp } from 'lucide-react';

function Sidebar({ currentView, onNavigate }) {
  const menuItems = [
    { icon: <User size={18} />, label: "個人資訊", view: 'profile' },
    { icon: <Lock size={18} />, label: "登入與安全", view: 'security' },
    { icon: <Ticket size={18} />, label: "優惠卷", view: 'coupons' },
    { icon: <Coins size={18} />, label: "我的點數", view: 'points' },
    { icon: <FileText size={18} />, label: "我的訂單", view: 'orders' },
    { icon: <Briefcase size={18} />, label: "我的任務", view: 'home' },
    { icon: <TrendingUp size={18} />, label: "我的收益", view: 'earnings' },
  ];

  return (
    <aside className="w-64 bg-white rounded-3xl shadow-lg p-6 h-fit shrink-0">
      <nav className="space-y-4">
        {menuItems.map((item, index) => (
          <div 
            key={index} 
            onClick={() => onNavigate(item.view)}
            className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${
              currentView === item.view ? 'text-black font-bold bg-gray-50' : 'text-gray-400 hover:text-black'
            }`}
          >
            {item.icon} <span className="text-sm">{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default function App() {
  const [view, setView] = useState('home');

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      <Header />
      
      {/* 🟢 全螢幕頁面判斷 */}
      {view === 'review' && <ReviewPage onBack={() => setView('home')} />}
      {view === 'analysis' && <AnalysisPage onBack={() => setView('home')} />}
      {view === 'task_detail' && <TaskDetailPage onBack={() => setView('home')} />}

      {/* 🟢 帶側邊欄頁面判斷 (移除那行錯誤的註解文字) */}
      {(view === 'home' || view === 'earnings' || view === 'earnings_detail' || view === 'pending_detail') && (
      <div className="flex p-8 max-w-7xl mx-auto">
        <Sidebar 
          currentView={['earnings_detail', 'pending_detail'].includes(view) ? 'earnings' : view} 
          onNavigate={setView} 
        />
        
        <main className="flex-1 ml-12">
          {view === 'home' && <HomePage onNavigate={setView} />}
          {view === 'earnings' && (
            <EarningsPage 
              onDetail={() => setView('earnings_detail')} 
              onTrack={() => setView('pending_detail')} // 🟢 增加追蹤點擊事件
            />
          )}
          {view === 'earnings_detail' && <EarningsDetailPage onBack={() => setView('earnings')} />}
          {view === 'pending_detail' && <PendingEarningsPage onBack={() => setView('earnings')} />}
        </main>
      </div>
    )}
    </div>
  );
}


