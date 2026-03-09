import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Header from './koc/Header';
import HomePage from './koc/HomePage';
import ReviewPage from './koc/ReviewPage';
import AnalysisPage from './koc/AnalysisPage';
import TaskDetailPage from './koc/TaskDetailPage';
import EarningsPage from './koc/EarningsPage';
import EarningsDetailPage from './koc/EarningsDetailPage';
import PendingEarningsPage from './koc/PendingEarningsPage';
import VendorApp from './VendorApp';
import { User, Lock, Ticket, Coins, FileText, Briefcase, TrendingUp, Store, UserCircle2, ArrowRight, Star } from 'lucide-react';

function KocSidebar({ currentView, onNavigate }) {
  const menuItems = [
    { icon: <User size={18} />, label: '個人資訊', view: 'profile' },
    { icon: <Lock size={18} />, label: '登入與安全', view: 'security' },
    { icon: <Ticket size={18} />, label: '優惠卷', view: 'coupons' },
    { icon: <Coins size={18} />, label: '我的點數', view: 'points' },
    { icon: <FileText size={18} />, label: '我的訂單', view: 'orders' },
    { icon: <Briefcase size={18} />, label: '我的任務', view: 'home' },
    { icon: <TrendingUp size={18} />, label: '我的收益', view: 'earnings' },
  ];
  return (
    <aside className="w-64 bg-white rounded-3xl shadow-lg p-6 h-fit shrink-0">
      <nav className="space-y-4">
        {menuItems.map((item, index) => (
          <div key={index} onClick={() => onNavigate(item.view)}
            className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${currentView === item.view ? 'text-black font-bold bg-gray-50' : 'text-gray-400 hover:text-black'
              }`}>
            {item.icon} <span className="text-sm">{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function KocApp() {
  const [view, setView] = useState('home');
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      <div className="relative">
        <Header onSwitchRole={() => navigate('/')} />
      </div>
      {view === 'review' && <ReviewPage onBack={() => setView('home')} />}
      {view === 'analysis' && <AnalysisPage onBack={() => setView('home')} />}
      {view === 'task_detail' && <TaskDetailPage onBack={() => setView('home')} />}
      {(view === 'home' || view === 'earnings' || view === 'earnings_detail' || view === 'pending_detail') && (
        <div className="flex p-8 max-w-7xl mx-auto">
          <KocSidebar
            currentView={['earnings_detail', 'pending_detail'].includes(view) ? 'earnings' : view}
            onNavigate={setView}
          />
          <main className="flex-1 ml-12">
            {view === 'home' && <HomePage onNavigate={setView} />}
            {view === 'earnings' && <EarningsPage onDetail={() => setView('earnings_detail')} onTrack={() => setView('pending_detail')} />}
            {view === 'earnings_detail' && <EarningsDetailPage onBack={() => setView('earnings')} />}
            {view === 'pending_detail' && <PendingEarningsPage onBack={() => setView('earnings')} />}
          </main>
        </div>
      )}
    </div>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center gap-3">
        <div className="bg-gray-100 px-5 py-2 rounded-full flex items-center gap-2">
          <Star size={16} className="text-gray-500 fill-gray-500" />
          <span className="font-bold tracking-widest text-gray-700 text-sm uppercase">Landing Page</span>
        </div>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500 text-sm">KOC 行銷接案平台</span>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center mb-14 max-w-md">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">歡迎來到 Landing Page</h1>
          <p className="text-gray-500 leading-relaxed">連結廠商與內容創作者的行銷接案平台。<br />請選擇您的身份以繼續。</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button onClick={() => navigate('/vendor')}
            className="group bg-white rounded-3xl p-10 border border-gray-100 shadow-sm hover:shadow-lg transition-all text-left hover:-translate-y-1 duration-200">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-100 transition-colors">
              <Store size={26} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">我是廠商</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-8">管理商品上架、活動規劃、審核 KOC 文案，並追蹤銷售成效。</p>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 group-hover:gap-3 transition-all">
              進入廠商後台 <ArrowRight size={16} />
            </div>
          </button>
          <button onClick={() => navigate('/koc')}
            className="group bg-white rounded-3xl p-10 border border-gray-100 shadow-sm hover:shadow-lg transition-all text-left hover:-translate-y-1 duration-200">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-teal-100 transition-colors">
              <UserCircle2 size={26} className="text-teal-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">我是 KOC</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-8">瀏覽任務、購買商品、撰寫推廣文案，並追蹤收益明細。</p>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 group-hover:gap-3 transition-all">
              進入 KOC 後台 <ArrowRight size={16} />
            </div>
          </button>
        </div>
      </div>
      <footer className="text-center py-6 text-xs text-gray-300">© 2026 Landing Page</footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/koc" element={<KocApp />} />
      <Route path="/vendor/*" element={<VendorApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
