import React, { useState, useEffect } from 'react';
import { Search, Calendar, Image as ImageIcon, ChevronRight, CheckCircle2, Edit3, Clock, Upload, TrendingUp, XCircle, Trash2, AlertCircle, RotateCcw } from 'lucide-react';

const STAGES = [
  { id: 1, label: '資格審核', icon: Clock, desc: '等待廠商確認' },
  { id: 2, label: '撰寫文案', icon: Edit3, desc: '請提交草稿' },
  { id: 3, label: '文案審核', icon: Search, desc: '廠商審閱中' },
  { id: 4, label: '待發佈', icon: Upload, desc: '請上傳連結' },
  { id: 5, label: '已結案', icon: CheckCircle2, desc: '任務完成' },
];

// 預設的假資料
const defaultTasks = [
  { id: 'T001', productName: 'SanDisk 128GB Extreme PRO', vendor: 'SanDisk 官方', stage: 1, deadline: '2026-05-18' },
  { id: 'T006', productName: '夏季控油保濕化妝水', vendor: '某專櫃品牌', stage: 1, deadline: '2026-05-10', isRejected: true, rejectReason: '粉絲受眾類型較不符' },
  { id: 'T002', productName: '樂扣樂扣嚼對FUN飲吸管杯', vendor: 'LocknLock', stage: 2, deadline: '2026-05-20' },
  { id: 'T003', productName: '夏季控油防曬乳 SPF50+', vendor: '專科', stage: 3, status: 'reviewing', deadline: '2026-05-22' },
  { id: 'T007', productName: 'SAMSUNG 256GB 記憶卡', vendor: '三星', stage: 3, status: 'rejected', rejectReason: '未提及防水功能，請補充。', deadline: '2026-05-23' },
  { id: 'T004', productName: '極致保濕修護精華', vendor: '理膚寶水', stage: 4, deadline: '2026-05-25', promoCode: '#WATER2026' },
  { id: 'T005', productName: 'Transcend 行動固態硬碟', vendor: '創見', stage: 5, deadline: '2026-05-10', reward: 1500 },
];

export default function HomePage({ onNavigate }) {
  const [activeStage, setActiveStage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [allTasks, setAllTasks] = useState([]);

  // 🟢 進入頁面時，從 localStorage 讀取資料 (如果沒有才用預設資料)
  useEffect(() => {
    const savedTasks = localStorage.getItem('koc_tasks');
    if (savedTasks) {
      setAllTasks(JSON.parse(savedTasks));
    } else {
      setAllTasks(defaultTasks);
      localStorage.setItem('koc_tasks', JSON.stringify(defaultTasks));
    }
  }, []);

  // 輔助函式：跳轉前先把當前任務存進 localStorage
  const handleGoToDetail = (task) => {
    localStorage.setItem('currentSelectedTask', JSON.stringify(task));
    onNavigate('task_detail', task); // 依然傳遞，以防你的父元件有用到
  };

  // 重置假資料 (方便你無限次測試流程)
  const handleResetData = () => {
    localStorage.setItem('koc_tasks', JSON.stringify(defaultTasks));
    setAllTasks(defaultTasks);
  };

  const filteredTasks = allTasks.filter(task => task.stage === activeStage && task.productName.includes(searchQuery));

  const dismissTask = (taskId) => {
    const newTasks = allTasks.filter(t => t.id !== taskId);
    setAllTasks(newTasks);
    localStorage.setItem('koc_tasks', JSON.stringify(newTasks));
  };

  const renderCardAction = (task) => {
    switch(task.stage) {
      case 1:
        if (task.isRejected) {
          return (
            <div className="flex flex-col gap-2">
              <div className="bg-[#FDF0ED] text-[#C8522A] p-3 rounded-xl text-xs font-bold border border-[#FDF0ED] flex items-start gap-2">
                <XCircle size={14} className="shrink-0 mt-0.5" />
                <span>抱歉，資格未符。<br/><span className="text-[#8C8880] font-normal">{task.rejectReason}</span></span>
              </div>
              <button onClick={() => dismissTask(task.id)} className="w-full bg-white border border-[#E2DDD4] text-[#8C8880] py-2.5 rounded-xl font-bold text-sm hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all flex items-center justify-center gap-1.5">
                <Trash2 size={14}/> 移除紀錄
              </button>
            </div>
          );
        }
        return (
          <button disabled className="w-full bg-[#F5F0E8] text-[#8C8880] py-3.5 rounded-2xl font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2">
            <Clock size={16}/> 廠商審核中
          </button>
        );
      case 2:
        return (
          <button onClick={() => handleGoToDetail(task)} className="w-full bg-[#1A1A18] text-[#F5F0E8] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#C8522A] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2">
            <Edit3 size={16}/> 前往撰寫文案
          </button>
        );
      case 3:
        if (task.status === 'rejected') {
          return (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold text-[#C8522A] bg-[#FDF0ED] px-3 py-2 rounded-xl flex items-center gap-1.5 border border-[#C8522A]/20">
                <AlertCircle size={14} /> 需修改：{task.rejectReason}
              </div>
              <button onClick={() => handleGoToDetail(task)} className="w-full bg-[#C8522A] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#1A1A18] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2">
                <Edit3 size={16}/> 修改草稿並重新送出
              </button>
            </div>
          );
        }
        return (
          <button onClick={() => handleGoToDetail(task)} className="w-full bg-white border border-[#E2DDD4] text-[#8C8880] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all flex items-center justify-center gap-2">
            <Search size={16}/> 查看審核進度
          </button>
        );
      case 4:
        return (
          <div className="flex gap-3">
             <div className="flex-1 bg-[#FDF0ED] border border-[#FDF0ED] text-[#C8522A] py-3.5 rounded-2xl font-bold text-xs flex flex-col items-center justify-center leading-tight">
               <span>專屬優惠碼</span>
               <span className="text-sm font-black tracking-wider">{task.promoCode}</span>
             </div>
             <button onClick={() => handleGoToDetail(task)} className="flex-1 bg-[#C8522A] text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-[#1A1A18] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2">
               <Upload size={16}/> 提交貼文連結
             </button>
          </div>
        );
      case 5:
        return (
          <div className="flex items-center justify-between px-2">
             <span className="text-sm font-bold text-[#8C8880]">獲得分潤</span>
             <span className="text-xl font-black text-[#1A1A18]">NT$ {task.reward || 1500}</span>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto pb-20">
      
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-[28px] font-serif font-bold text-[#1A1A18] flex items-center gap-4">
          任務管理
          {/* 測試按鈕：讓你可以隨時還原假資料 */}
          <button onClick={handleResetData} className="text-[#8C8880] hover:text-[#C8522A] text-xs font-bold flex items-center gap-1 bg-[#F8F9FA] px-3 py-1.5 rounded-lg border border-[#E2DDD4] transition-colors">
            <RotateCcw size={12} /> 重新整理測試資料
          </button>
        </h2>
        <button onClick={() => onNavigate('analysis')} className="bg-white border border-[#E2DDD4] text-[#1A1A18] px-6 py-3 rounded-full font-bold text-sm hover:border-[#1A1A18] hover:shadow-md transition-all flex items-center gap-2 group">
          <div className="w-6 h-6 bg-[#FDF0ED] rounded-full flex items-center justify-center group-hover:bg-[#C8522A] transition-colors">
            <TrendingUp size={14} className="text-[#C8522A] group-hover:text-white transition-colors" />
          </div>
          進入成效分析看板
        </button>
      </div>

      {/* 🟢 新手指南 (Onboarding Banner) */}
      <div className="bg-[#1A1A18] rounded-[2rem] p-8 mb-10 flex items-center justify-between shadow-xl relative overflow-hidden border border-[#E2DDD4]">
         {/* 裝飾背景 */}
         <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-[#C8522A]/20 to-transparent"></div>
         
         <div className="relative z-10">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <span className="text-[#C8522A]">💡</span> 賺取分潤超簡單，跟著進度走！
            </h3>
            <div className="flex items-center gap-4 text-sm font-bold text-[#F5F0E8]/80">
               <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">1</span> 申請任務</span>
               <ChevronRight size={14} className="text-[#8C8880]" />
               <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">2</span> 撰寫文案</span>
               <ChevronRight size={14} className="text-[#8C8880]" />
               <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-full bg-[#C8522A] flex items-center justify-center text-white text-xs shadow-md">3</span> 發布貼文賺獎金</span>
            </div>
         </div>
         <button onClick={() => onNavigate('apply')} className="relative z-10 bg-white text-[#1A1A18] px-8 py-3.5 rounded-full font-bold text-sm hover:bg-[#F5F0E8] transition-all shadow-md active:scale-95">
           前往探索新任務
         </button>
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-sm border border-[#E2DDD4] mb-8 flex justify-between overflow-x-auto hide-scrollbar">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          const isActive = activeStage === stage.id;
          const taskCount = allTasks.filter(t => t.stage === stage.id).length;

          return (
            <button 
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              className={`flex-1 min-w-[140px] flex flex-col items-center justify-center py-4 rounded-xl transition-all relative ${isActive ? 'bg-[#F5F0E8]' : 'hover:bg-[#F8F9FA]'}`}
            >
              {taskCount > 0 && (
                <span className="absolute top-3 right-8 w-5 h-5 bg-[#C8522A] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
                  {taskCount}
                </span>
              )}
              <Icon size={20} className={`mb-2 ${isActive ? 'text-[#C8522A]' : 'text-[#8C8880]'}`} />
              <span className={`text-sm font-bold mb-0.5 ${isActive ? 'text-[#1A1A18]' : 'text-[#8C8880]'}`}>{stage.label}</span>
              <span className="text-[10px] font-bold text-[#8C8880] tracking-wider">{stage.desc}</span>
            </button>
          )
        })}
      </div>

      <div className="flex justify-between items-end mb-6 px-2">
        <h3 className="text-xl font-bold text-[#1A1A18] flex items-center gap-2">
           {STAGES.find(s => s.id === activeStage)?.label} 
           <span className="text-[#8C8880] text-sm">({filteredTasks.length})</span>
        </h3>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTasks.map((task) => (
          <div key={task.id} className={`bg-white rounded-[2rem] p-6 border ${task.isRejected || task.status === 'rejected' ? 'border-[#C8522A]/30 bg-[#FDF0ED]/20' : 'border-[#E2DDD4]'} shadow-sm hover:shadow-[0_16px_40px_rgba(26,26,24,0.06)] transition-all flex flex-col h-full`}>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black text-[#8C8880] tracking-widest uppercase bg-[#F8F9FA] px-2 py-1 rounded-md mb-2 inline-block">
                  {task.vendor}
                </span>
                <div className="flex items-center gap-1.5 text-[#C8522A] text-xs font-bold mt-1">
                  <Calendar size={12} />
                  <span>截止: {task.deadline}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
               <div className="w-16 h-16 bg-[#F5F0E8] rounded-2xl flex items-center justify-center shrink-0 border border-[#E2DDD4]">
                  <ImageIcon size={24} className="text-[#8C8880]/50" />
               </div>
               <h4 className={`text-[15px] font-bold leading-snug line-clamp-2 ${task.isRejected ? 'text-[#8C8880] line-through' : 'text-[#1A1A18]'}`}>
                 {task.productName}
               </h4>
            </div>

            <div className="mt-auto pt-4 border-t border-[#F8F9FA]">
               {renderCardAction(task)}
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-white rounded-[2rem] border border-[#E2DDD4] border-dashed">
            <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={24} className="text-[#8C8880]" />
            </div>
            <p className="text-[#1A1A18] font-bold">這個階段目前沒有任務喔！</p>
          </div>
        )}
      </div>
    </div>
  );
}